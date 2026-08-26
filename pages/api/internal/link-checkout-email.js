/**
 * POST /api/internal/link-checkout-email
 * 付款成功後由 Medusa backend 呼叫：把結帳 Email 自動綁到 LINE／Supabase 身分。
 *
 * body: { email, lineUserId?, supabaseUserId? }
 */
import { linkCheckoutEmailToMember } from "../../../lib/linkCheckoutEmail";

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
    return res
      .status(503)
      .json({ success: false, message: "FULFILLMENT_INTERNAL_SECRET 未設定" });
  }
  if (!secret || secret !== expected) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    const result = await linkCheckoutEmailToMember({
      email: req.body?.email,
      lineUserId: req.body?.lineUserId,
      supabaseUserId: req.body?.supabaseUserId,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[link-checkout-email]", err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || "綁定失敗",
    });
  }
}
