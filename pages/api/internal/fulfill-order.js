// pages/api/internal/fulfill-order.js
//
// 受保護的內部 API：只給 esim-backend 的付款確認（LINE Pay / 藍新 notify）呼叫。
import axios from "axios";
import FormData from "form-data";
import { sendMail } from "../../../lib/mailTransporter";
import { buildEsimProfileFromTopupDetail } from "../../../lib/esimProfile";
import {
  buildEsimFulfillmentEmailHtml,
  buildEsimFulfillmentEmailText,
  getEsimFulfillmentInlineAttachments,
} from "../../../lib/esimFulfillmentEmail";
import { getPublicSiteUrl } from "../../../lib/siteUrl";
import {
  ESIM_ACCOUNT as ACCOUNT,
  ESIM_BASE_URL as BASE_URL,
  ESIM_TEST_PLAN_ID,
  signMicroesimHeaders as signHeaders,
  shouldForceTestPlan,
} from "../../../lib/esim/microesimClient";
import {
  planFamily,
  skuNameCandidates,
  validatePlanAvailability,
} from "../../../lib/esim/planAvailability";

/** MicroeSIM 發貨常超過 15s；與 catalog 其他呼叫對齊 */
const SUBSCRIBE_TIMEOUT_MS = 60_000;
const DETAIL_TIMEOUT_MS = 45_000;
const LIST_TIMEOUT_MS = 30_000;
const SUBSCRIBE_MAX_ATTEMPTS = 3;
/** topupDetail 常先回 Processing，需輪詢到有 QR／LPA */
const DETAIL_POLL_INTERVAL_MS = 2_500;
const DETAIL_POLL_MAX_MS = 90_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detailHasProfile(detailResult) {
  if (!detailResult || typeof detailResult !== "object") return false;
  const rows = Array.isArray(detailResult)
    ? detailResult
    : Array.isArray(detailResult.list)
      ? detailResult.list
      : [detailResult];
  return rows.some(
    (row) =>
      row &&
      (row.qrcode ||
        row.qr_code ||
        row.lpa ||
        row.LPA ||
        row.iccid ||
        row.ICCID ||
        row.smdp_address ||
        row.smdp),
  );
}

function isDetailStillProcessing(detail) {
  const msg = String(detail?.msg || "").toLowerCase();
  const status = String(detail?.result?.status || "").toLowerCase();
  if (msg.includes("processing") || status.includes("process")) return true;
  if (detail?.code === 1 && detail?.result && !detailHasProfile(detail.result)) {
    return true;
  }
  return false;
}

function isRetryableError(err) {
  const code = err?.code || err?.cause?.code;
  const msg = String(err?.message || "");
  if (
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN"
  ) {
    return true;
  }
  if (/timeout/i.test(msg) || /network/i.test(msg) || /socket hang up/i.test(msg)) {
    return true;
  }
  const status = err?.response?.status;
  return status === 408 || status === 429 || (typeof status === "number" && status >= 500);
}

async function sendEsimEmail(to, orderNumber, profiles, orderMeta = {}) {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const merchantNo = String(orderNumber || "").replace(/^order_/, "");
  const webOrderUrl = `${site}/thank-you?status=success&orderNo=${encodeURIComponent(merchantNo)}`;

  await sendMail({
    to,
    fromName: "Jeko eSIM",
    subject: `🎉 您的 eSIM 已準備就緒！（訂單 ${merchantNo}）`,
    html: buildEsimFulfillmentEmailHtml({
      orderNumber: merchantNo,
      profiles,
      webOrderUrl,
      siteName: "Jeko eSIM",
      useInlineCid: true,
      orderMeta: {
        merchantOrderNo: merchantNo,
        ...orderMeta,
      },
    }),
    text: buildEsimFulfillmentEmailText({
      orderNumber: merchantNo,
      profiles,
    }),
    attachments: getEsimFulfillmentInlineAttachments(),
  });
}

async function subscribeWithRetry({ finalPlanId, quantity, active_type, orderId }) {
  let lastErr;
  for (let attempt = 1; attempt <= SUBSCRIBE_MAX_ATTEMPTS; attempt++) {
    const { timestamp, nonce, signature } = signHeaders();
    const form = new FormData();
    form.append("number", quantity.toString());
    form.append("channel_dataplan_id", finalPlanId);

    if (active_type === "ACTIVEDBYORDER") {
      const now = new Date(Date.now() + 5 * 60 * 1000);
      const activationDate = now.toISOString().replace("T", " ").substring(0, 16);
      form.append("activation_date", activationDate);
    }

    const headers = {
      ...form.getHeaders(),
      "MICROESIM-ACCOUNT": ACCOUNT,
      "MICROESIM-NONCE": nonce,
      "MICROESIM-TIMESTAMP": timestamp,
      "MICROESIM-SIGN": signature,
    };

    try {
      const subscribeRes = await axios.post(`${BASE_URL}/allesim/v1/esimSubscribe`, form, {
        headers,
        timeout: SUBSCRIBE_TIMEOUT_MS,
      });
      return subscribeRes.data;
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableError(err);
      console.warn(
        `⚠️ [fulfill-order] esimSubscribe 失敗 attempt=${attempt}/${SUBSCRIBE_MAX_ATTEMPTS}` +
          ` order=${orderId} retryable=${retryable}: ${err?.message || err}`,
      );
      if (!retryable || attempt >= SUBSCRIBE_MAX_ATTEMPTS) break;
      await sleep(1000 * attempt);
    }
  }
  throw lastErr;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const secret = req.headers["x-fulfillment-secret"];
  const expected = process.env.FULFILLMENT_INTERNAL_SECRET;
  if (!expected || expected.length < 16) {
    return res.status(503).json({ success: false, message: "FULFILLMENT_INTERNAL_SECRET 未設定" });
  }
  if (!secret || secret !== expected) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { orderId, items, email } = req.body || {};
  if (!orderId) return res.status(400).json({ success: false, message: "缺少訂單 ID" });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "訂單內沒有商品" });
  }

  try {
    const qrcodes = [];
    /** @type {any[]} */
    let planList = [];

    try {
      const listSig = signHeaders();
      const listRes = await axios.get(`${BASE_URL}/allesim/v1/esimDataplanList`, {
        headers: {
          "Content-Type": "application/json",
          "MICROESIM-ACCOUNT": ACCOUNT,
          "MICROESIM-NONCE": listSig.nonce,
          "MICROESIM-TIMESTAMP": listSig.timestamp,
          "MICROESIM-SIGN": listSig.signature,
        },
        timeout: LIST_TIMEOUT_MS,
      });
      planList = Array.isArray(listRes.data?.result) ? listRes.data.result : [];
    } catch (e) {
      console.warn("⚠️ [fulfill-order] 方案清單取得失敗，APN 可能缺漏");
    }

    for (const item of items) {
      const availability = await validatePlanAvailability({
        sku: item.sku || "",
        planId: item.planId || "",
        name: item.name || "eSIM",
      });
      if (!availability.ok) {
        throw new Error(
          `[${availability.code || "PLAN_UNAVAILABLE"}] ${availability.message}`,
        );
      }

      // 只准用目錄核可後的 UUID；FORCE_TEST 時改打測試方案（驗證已通過才改寫）
      const finalPlanId = shouldForceTestPlan()
        ? ESIM_TEST_PLAN_ID
        : String(availability.channelDataplanId || "").trim();
      const quantity = item.quantity || 1;

      if (!finalPlanId) {
        throw new Error(
          `[PLAN_MISSING] 商品 ${item.name || item.sku} 通過檢查但缺少 channel_dataplan_id`,
        );
      }

      const planMeta =
        planList.find((p) => p.channel_dataplan_id === finalPlanId) || {};
      const active_type = planMeta.active_type || "ACTIVEDBYDEVICE";
      const liveName =
        availability.liveName ||
        planMeta.channel_dataplan_name ||
        planMeta.name ||
        "";

      // 雙重確認：發貨當下 live 名與 SKU 家族必須一致（防驗證快取與清單不同步）
      if (!shouldForceTestPlan() && liveName && item.sku) {
        const skuFam = planFamily(skuNameCandidates(item.sku)[0] || item.sku);
        const liveFam = planFamily(liveName);
        if (skuFam !== "other" && liveFam !== "other" && skuFam !== liveFam) {
          throw new Error(
            `[PLAN_SUBSTITUTED] 「${item.name || item.sku}」SKU 家族 ${skuFam}` +
              ` 與供應商現名「${liveName}」(${liveFam}) 不符，拒絕發貨`,
          );
        }
      }

      console.log(
        `📡 [fulfill-order] 使用帳號 ${ACCOUNT} 向供應商連線: ${BASE_URL}` +
          `（訂單 ${orderId}` +
          (shouldForceTestPlan()
            ? `，測試方案 ${finalPlanId}`
            : `，sku=${item.sku || "-"} → live=${liveName || "-"} id=${finalPlanId}`) +
          `，timeout ${SUBSCRIBE_TIMEOUT_MS}ms ×${SUBSCRIBE_MAX_ATTEMPTS}）`,
      );

      try {
        const result = await subscribeWithRetry({
          finalPlanId,
          quantity,
          active_type,
          orderId,
        });

        if (result.code === 1 && result.result?.topup_id) {
          const topup_id = result.result.topup_id;
          const pollStarted = Date.now();
          let detail = null;

          while (Date.now() - pollStarted < DETAIL_POLL_MAX_MS) {
            const detailSig = signHeaders();
            const detailForm = new FormData();
            detailForm.append("topup_id", topup_id);

            const detailRes = await axios.post(
              `${BASE_URL}/allesim/v1/topupDetail`,
              detailForm,
              {
                headers: {
                  ...detailForm.getHeaders(),
                  "MICROESIM-ACCOUNT": ACCOUNT,
                  "MICROESIM-NONCE": detailSig.nonce,
                  "MICROESIM-TIMESTAMP": detailSig.timestamp,
                  "MICROESIM-SIGN": detailSig.signature,
                },
                timeout: DETAIL_TIMEOUT_MS,
              },
            );

            detail = detailRes.data;
            if (detail?.code === 1 && detailHasProfile(detail.result)) {
              break;
            }
            if (detail?.code === 1 && isDetailStillProcessing(detail)) {
              console.log(
                `⏳ [fulfill-order] topupDetail Processing topup=${topup_id}` +
                  ` elapsed=${Date.now() - pollStarted}ms`,
              );
              await sleep(DETAIL_POLL_INTERVAL_MS);
              continue;
            }
            // 非 processing 的失敗
            throw new Error(`獲取 QR Code 失敗: ${JSON.stringify(detail)}`);
          }

          if (!detail || !detailHasProfile(detail.result)) {
            throw new Error(
              `獲取 QR Code 逾時（topup ${topup_id} 仍 Processing）: ${JSON.stringify(detail)}`,
            );
          }

          const detailRows = Array.isArray(detail.result)
            ? detail.result
            : Array.isArray(detail.result?.list)
              ? detail.result.list
              : [detail.result];

          for (const row of detailRows) {
            if (
              !row?.qrcode &&
              !row?.qr_code &&
              !row?.lpa &&
              !row?.iccid &&
              !detail.result?.qrcode
            ) {
              continue;
            }
            const rowWithQr =
              row.qrcode || row.qr_code || row.lpa || row.iccid
                ? row
                : detail.result;
            const profile = await buildEsimProfileFromTopupDetail({
              productName: item.name || "eSIM",
              detailResult: rowWithQr,
              planMeta,
              topupId: topup_id,
            });
            if (!profile.src && !profile.lpa) {
              throw new Error(`獲取 QR／LPA 失敗: ${JSON.stringify(detail)}`);
            }
            qrcodes.push(profile);
          }
        } else {
          throw new Error(`供應商拒絕訂單: ${result.msg}`);
        }
      } catch (axiosError) {
        const realMsg = axiosError.response?.data?.msg || axiosError.message;
        throw new Error(`連線失敗: ${JSON.stringify(realMsg)}`);
      }
    }

    if (qrcodes.length === 0) {
      throw new Error("發貨失敗，請檢查餘額或 Plan ID");
    }

    if (email) {
      try {
        await sendEsimEmail(email, orderId, qrcodes);
      } catch (mailErr) {
        console.error("⚠️ [fulfill-order] 寄信失敗:", mailErr?.message || mailErr);
      }
    }

    return res.status(200).json({ success: true, message: "發貨完成", qrcodes });
  } catch (error) {
    console.error("🔥 [fulfill-order] 錯誤:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
