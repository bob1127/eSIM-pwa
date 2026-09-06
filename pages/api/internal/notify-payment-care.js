/**
 * POST /api/internal/notify-payment-care
 * 藍新／LINE Pay 未付款或付款失敗時，由 esim-backend 呼叫寄關懷信。
 *
 * Headers: X-Fulfillment-Secret
 * Body: { email, orderNo?, amount?, reason?, message?, payloadStatus?, method?, statusLabel? }
 */
import {
  sendPaymentCareEmail,
  paymentCareStatusLabel,
} from "../../../lib/paymentCareEmail";

export const config = { maxDuration: 30 };

/** 簡易去重：同 email+orderNo 在同一 serverless instance 短期內不重寄 */
const recent = new Map();
const DEDUPE_MS = 6 * 60 * 60 * 1000;

function dedupeKey(email, orderNo) {
  return `${String(email || "").toLowerCase()}|${String(orderNo || "")}`;
}

function alreadySent(key) {
  const at = recent.get(key);
  if (!at) return false;
  if (Date.now() - at > DEDUPE_MS) {
    recent.delete(key);
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const secret = req.headers["x-fulfillment-secret"];
  const expected = process.env.FULFILLMENT_INTERNAL_SECRET;
  if (!expected || expected.length < 16) {
    return res.status(503).json({
      success: false,
      message: "FULFILLMENT_INTERNAL_SECRET 未設定",
    });
  }
  if (!secret || secret !== expected) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const orderNo = String(body.orderNo || body.merchantOrderNo || "").trim();
  if (!email) {
    return res.status(400).json({ success: false, message: "缺少 email" });
  }

  const key = dedupeKey(email, orderNo || body.orderId || "");
  if (!body.force && alreadySent(key)) {
    return res.status(200).json({
      success: true,
      skipped: true,
      reason: "already_sent_recently",
    });
  }

  try {
    const statusLabel =
      body.statusLabel ||
      paymentCareStatusLabel({
        reason: body.reason,
        message: body.message,
        payloadStatus: body.payloadStatus,
      });

    const result = await sendPaymentCareEmail({
      to: email,
      orderNo: orderNo || body.orderId || "—",
      amount: body.amount,
      statusLabel,
      reason: body.reason,
      message: body.message,
      payloadStatus: body.payloadStatus,
      method: body.method,
    });

    if (result.ok) {
      recent.set(key, Date.now());
    }

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[notify-payment-care]", err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || "寄信失敗",
    });
  }
}
