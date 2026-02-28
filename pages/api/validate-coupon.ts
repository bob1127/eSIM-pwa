// pages/api/validate-coupon.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const WC_API = "https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wc/v3/coupons";
const CONSUMER_KEY = "ck_ef9f4379124655ad946616864633bd37e3174bc2";
const CONSUMER_SECRET = "cs_3da596e08887d9c7ccbf8ee15213f83866c160d4";

const roundHalfUp = (n: number) => (n >= 0 ? Math.floor(n + 0.5) : -Math.floor(-n + 0.5));
const toCents = (amount: any) => roundHalfUp(parseFloat(String(amount ?? 0)) * 100);
const fromCents = (cents: number) => roundHalfUp(cents / 100);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const codeParam = req.query.code;
  const subtotalParam = req.query.subtotal;

  const code = Array.isArray(codeParam) ? codeParam[0] : String(codeParam ?? "").trim();
  const hasSubtotal = subtotalParam !== undefined;
  const subtotalRaw = Array.isArray(subtotalParam) ? subtotalParam[0] : subtotalParam;
  const subtotalCents = hasSubtotal ? toCents(subtotalRaw) : undefined;

  if (!code) return res.status(400).json({ valid: false, message: "請提供優惠碼" });
  if (hasSubtotal && (isNaN(Number(subtotalRaw)) || Number(subtotalRaw) < 0)) {
    return res.status(400).json({ valid: false, message: "subtotal 需為非負數字" });
  }

  try {
    const { data } = await axios.get(WC_API, {
      auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
      params: { code }, // 讓 axios 幫你序列化
    });

    const coupon = Array.isArray(data) ? data[0] : null;
    if (!coupon) return res.status(404).json({ valid: false, message: "優惠碼不存在" });

    if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) {
      return res.status(403).json({ valid: false, message: "優惠碼已使用完畢" });
    }

    const discountType: string = coupon.discount_type; // "fixed_cart" | "percent"
    const amountNum = parseFloat(coupon.amount || "0"); // fixed_cart: 元；percent: 百分比
    const amountCents = discountType === "fixed_cart" ? toCents(amountNum) : null;

    if (discountType !== "fixed_cart" && discountType !== "percent") {
      return res.status(400).json({ valid: false, message: `不支援的折扣類型：${discountType}` });
    }

    // 若帶 subtotal，計算實際折抵（使用「分」避免小數誤差）
    let discountCents: number | null = null;
    if (hasSubtotal && typeof subtotalCents === "number") {
      if (discountType === "fixed_cart") {
        discountCents = Math.max(0, Math.min(amountCents as number, subtotalCents));
      } else {
        const pct = Math.min(Math.max(amountNum, 0), 100);
        discountCents = roundHalfUp(subtotalCents * (pct / 100));
      }
    }

    return res.status(200).json({
      valid: true,
      code: coupon.code,                 // Woo 通常回小寫
      amount: amountNum,                 // percent: 百分比；fixed_cart: 元
      discount_type: discountType,
      usage_count: coupon.usage_count,
      usage_limit: coupon.usage_limit,
      type: discountType === "percent" ? "percent" : "fixed",
      discount: discountCents !== null ? fromCents(discountCents) : null, // 顯示用整數元
      amount_cents: amountCents,         // 精準用（分）
      discount_cents: discountCents,     // 精準用（分）
      subtotal_cents: hasSubtotal ? subtotalCents : null,
    });
  } catch (err: any) {
    console.error("❌ 優惠碼查詢失敗:", err?.response?.data || err.message);
    return res.status(500).json({ valid: false, message: "伺服器錯誤，請稍後再試" });
  }
}
