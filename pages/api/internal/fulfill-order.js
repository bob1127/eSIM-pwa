// pages/api/internal/fulfill-order.js
//
// 受保護的內部 API：只給 esim-backend 的付款確認（LINE Pay / 藍新 notify）呼叫。
import axios from "axios";
import FormData from "form-data";
import PLAN_ID_MAP from "../../../lib/esim/planMap";
import { sendMail } from "../../../lib/mailTransporter";
import { buildEsimProfileFromTopupDetail } from "../../../lib/esimProfile";
import {
  buildEsimFulfillmentEmailHtml,
  buildEsimFulfillmentEmailText,
} from "../../../lib/esimFulfillmentEmail";
import { getPublicSiteUrl } from "../../../lib/siteUrl";
import {
  ESIM_ACCOUNT as ACCOUNT,
  ESIM_BASE_URL as BASE_URL,
  resolveChannelDataplanId,
  signMicroesimHeaders as signHeaders,
  shouldForceTestPlan,
} from "../../../lib/esim/microesimClient";

async function sendEsimEmail(to, orderNumber, profiles) {
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
    }),
    text: buildEsimFulfillmentEmailText({
      orderNumber: merchantNo,
      profiles,
    }),
  });
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
        timeout: 10000,
      });
      planList = Array.isArray(listRes.data?.result) ? listRes.data.result : [];
    } catch (e) {
      console.warn("⚠️ [fulfill-order] 方案清單取得失敗，APN 可能缺漏");
    }

    for (const item of items) {
      const rawPlanId = item.sku || item.planId;
      const finalPlanId = resolveChannelDataplanId(rawPlanId, PLAN_ID_MAP);
      const quantity = item.quantity || 1;

      if (!finalPlanId) {
        console.warn(`⚠️ 商品 ${item.name} 缺少 planId/sku`);
        continue;
      }

      const planMeta = planList.find((p) => p.channel_dataplan_id === finalPlanId) || {};
      let active_type = planMeta.active_type || "ACTIVEDBYDEVICE";

      console.log(
        `📡 [fulfill-order] 使用帳號 ${ACCOUNT} 向供應商連線: ${BASE_URL}` +
          `（訂單 ${orderId}` +
          (shouldForceTestPlan() ? `，測試方案 ${finalPlanId}` : `，plan ${finalPlanId}`) +
          `）`,
      );

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
          timeout: 15000,
        });
        const result = subscribeRes.data;

        if (result.code === 1 && result.result?.topup_id) {
          const topup_id = result.result.topup_id;
          const detailSig = signHeaders();
          const detailForm = new FormData();
          detailForm.append("topup_id", topup_id);

          const detailRes = await axios.post(`${BASE_URL}/allesim/v1/topupDetail`, detailForm, {
            headers: {
              ...detailForm.getHeaders(),
              "MICROESIM-ACCOUNT": ACCOUNT,
              "MICROESIM-NONCE": detailSig.nonce,
              "MICROESIM-TIMESTAMP": detailSig.timestamp,
              "MICROESIM-SIGN": detailSig.signature,
            },
            timeout: 15000,
          });

          const detail = detailRes.data;
          if (detail.code === 1 && detail.result) {
            // 一次訂閱可能回多張（quantity>1）時，部分供應商把多筆放在 list
            const detailRows = Array.isArray(detail.result)
              ? detail.result
              : Array.isArray(detail.result?.list)
                ? detail.result.list
                : [detail.result];

            for (const row of detailRows) {
              if (!row?.qrcode && !row?.qr_code && !detail.result?.qrcode) continue;
              const rowWithQr = row.qrcode || row.qr_code ? row : detail.result;
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
            throw new Error(`獲取 QR Code 失敗: ${JSON.stringify(detail)}`);
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
