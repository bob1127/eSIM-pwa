/**
 * POST /api/internal/fulfill-from-topup
 * 用既有 topup_id 輪詢 QR／LPA、寄信（不再 esimSubscribe）
 *
 * body: { orderId, topupId, email?, productName? }
 */
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
  signMicroesimHeaders as signHeaders,
} from "../../../lib/esim/microesimClient";

export const config = {
  maxDuration: 300,
};

const DETAIL_TIMEOUT_MS = 45_000;
const DETAIL_POLL_INTERVAL_MS = 3_000;
const DETAIL_POLL_MAX_MS = 180_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function profileFieldNonEmpty(val) {
  if (val == null || val === "") return false;
  if (Array.isArray(val)) return val.some((x) => String(x || "").trim());
  return Boolean(String(val).trim());
}

function detailHasUsableActivation(detailResult) {
  if (!detailResult || typeof detailResult !== "object") return false;
  const rows = Array.isArray(detailResult)
    ? detailResult
    : Array.isArray(detailResult.list)
      ? detailResult.list
      : [detailResult];
  return rows.some(
    (row) =>
      row &&
      (profileFieldNonEmpty(row.qrcode) ||
        profileFieldNonEmpty(row.qr_code) ||
        profileFieldNonEmpty(row.lpa) ||
        profileFieldNonEmpty(row.lpa_str) ||
        profileFieldNonEmpty(row.LPA) ||
        profileFieldNonEmpty(row.smdp_address) ||
        profileFieldNonEmpty(row.smdp)),
  );
}

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
      useInlineCid: true,
      orderMeta: { merchantOrderNo: merchantNo },
    }),
    text: buildEsimFulfillmentEmailText({
      orderNumber: merchantNo,
      profiles,
    }),
    attachments: getEsimFulfillmentInlineAttachments(),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const secret = req.headers["x-fulfillment-secret"];
  const expected = process.env.FULFILLMENT_INTERNAL_SECRET;
  if (!expected || expected.length < 16) {
    return res
      .status(503)
      .json({ success: false, message: "FULFILLMENT_INTERNAL_SECRET 未設定" });
  }
  if (!secret || secret !== expected) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { orderId, topupId, email, productName } = req.body || {};
  if (!orderId || !topupId) {
    return res
      .status(400)
      .json({ success: false, message: "缺少 orderId 或 topupId" });
  }

  try {
    const pollStarted = Date.now();
    let detail = null;

    while (Date.now() - pollStarted < DETAIL_POLL_MAX_MS) {
      const detailSig = signHeaders();
      const detailForm = new FormData();
      detailForm.append("topup_id", String(topupId));

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
      if (detail?.code === 1 && detailHasUsableActivation(detail.result)) {
        break;
      }

      console.log(
        `⏳ [fulfill-from-topup] topup=${topupId}` +
          ` elapsed=${Date.now() - pollStarted}ms` +
          ` status=${detail?.result?.status || "-"}`,
      );
      await sleep(DETAIL_POLL_INTERVAL_MS);
    }

    if (!detail || !detailHasUsableActivation(detail.result)) {
      return res.status(504).json({
        success: false,
        message: `topup ${topupId} 逾時仍無 LPA／QR`,
        detail,
      });
    }

    const profile = await buildEsimProfileFromTopupDetail({
      productName: productName || "eSIM",
      detailResult: detail.result,
      planMeta: {},
      topupId,
    });

    if (!profile.src && !profile.lpa) {
      return res.status(500).json({
        success: false,
        message: "解析後仍無 QR／LPA",
        detail,
      });
    }

    const qrcodes = [profile];
    if (email) {
      try {
        await sendEsimEmail(email, orderId, qrcodes);
      } catch (mailErr) {
        console.error(
          "⚠️ [fulfill-from-topup] 寄信失敗:",
          mailErr?.message || mailErr,
        );
      }
    }

    return res.status(200).json({ success: true, qrcodes, topupId });
  } catch (error) {
    console.error("🔥 [fulfill-from-topup]", error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || String(error),
    });
  }
}
