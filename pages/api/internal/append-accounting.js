/**
 * POST /api/internal/append-accounting
 * 付款成功後由 esim-backend 呼叫，寫入 Google Sheet（order_id 冪等）
 *
 * Headers: X-Fulfillment-Secret
 * Body: { orderId, amount, paymentProvider, payTime, tradeNo, customerEmail, items,
 *         isPartnerOrder, partnerStoreId, referralCode, note }
 */
import { appendAccountingRow } from "../../../lib/accountingSheet";

export const config = {
  maxDuration: 30,
};

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
  if (!body.orderId) {
    return res.status(400).json({ success: false, message: "缺少 orderId" });
  }

  try {
    const result = await appendAccountingRow(body);
    if (!result.ok) {
      return res.status(400).json({ success: false, ...result });
    }
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[append-accounting]", err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || "append failed",
    });
  }
}
