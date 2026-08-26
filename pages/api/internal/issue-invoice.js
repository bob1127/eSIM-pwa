/**
 * POST /api/internal/issue-invoice
 * 受保護：給 esim-backend /newebpay/notify 在付款成功後呼叫。
 *
 * body: {
 *   orderId, orderNo?, email, amount,
 *   buyerName?, buyerUBN?, items: [{ name, qty, price }]
 * }
 */
import {
  issueEzpayInvoice,
  isEzpayConfigured,
  getEzpayConfig,
} from "../../../lib/ezpay/invoice";

export const config = {
  maxDuration: 60,
};

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

  const cfg = getEzpayConfig();
  if (!cfg.enabled) {
    return res.status(200).json({
      success: true,
      skipped: true,
      message: "EZPAY_INVOICE_ENABLED 未開啟，略過開立",
    });
  }
  if (!isEzpayConfigured()) {
    return res.status(503).json({
      success: false,
      message: "ezPay 金鑰未設定（EZPAY_MERCHANT_ID / HASH_KEY / HASH_IV）",
    });
  }

  const {
    orderId,
    orderNo,
    email,
    amount,
    buyerName,
    buyerUBN,
    items,
    comment,
  } = req.body || {};

  // ezPay MerchantOrderNo：Varchar(20)，限英數字與 _
  const merchantOrderNo = String(orderNo || orderId || "")
    .replace(/^order_/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 20);

  if (!merchantOrderNo) {
    return res.status(400).json({ success: false, message: "缺少 orderId / orderNo" });
  }
  if (amount == null || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: "缺少有效 amount" });
  }

  try {
    const result = await issueEzpayInvoice({
      orderNo: merchantOrderNo,
      amount: Number(amount),
      email,
      buyerName,
      buyerUBN,
      items,
      comment: comment || `Jeko eSIM ${merchantOrderNo}`,
    });

    if (!result.ok) {
      console.error("[issue-invoice] fail:", result.status, result.message);
      return res.status(400).json({
        success: false,
        message: result.message || "開立失敗",
        status: result.status,
        detail: result.raw,
      });
    }

    console.log(
      `[issue-invoice] OK ${merchantOrderNo} → ${result.invoiceNumber}`,
    );
    return res.status(200).json({
      success: true,
      invoiceNumber: result.invoiceNumber,
      randomNum: result.randomNum,
      createTime: result.createTime,
    });
  } catch (err) {
    console.error("[issue-invoice] exception:", err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || "開立發票例外",
    });
  }
}
