// 夥伴結帳「伺服器對伺服器」定價簽章。
//
// 目的：夥伴售價（加價後）只由「可信的 Next.js 伺服器端」用 Supabase 權威資料
// 計算（computeAuthoritativeStoreOrder），再把「要覆寫到 Medusa 購物車的單價」
// 用共享密鑰 HMAC 簽章後送給 Medusa 後端套用。密鑰只存在兩邊伺服器環境變數，
// 瀏覽器永遠拿不到，因此使用者無法在前端偽造／竄改夥伴售價或分潤。
//
// 對應後端驗證：esim-backend/src/lib/partnerCheckoutSignature.ts（演算法必須一致）。
import crypto from "crypto";

/** 簽章有效時間（毫秒）。超時即拒絕，避免重放。 */
export const PARTNER_CHECKOUT_SIG_TTL_MS = 5 * 60 * 1000;

export function getPartnerCheckoutSecret() {
  return (
    process.env.PARTNER_CHECKOUT_SECRET ||
    process.env.NEXT_PARTNER_CHECKOUT_SECRET ||
    ""
  );
}

/**
 * 產生「與後端逐字一致」的正規化字串。任何欄位順序／格式差異都會導致驗簽失敗，
 * 所以兩端都用同一套規則：數字取整數、lines 依 item_id 排序、固定分隔符。
 * @param {{
 *   cartId: string,
 *   storeId: string|number,
 *   partnerId: string|number|null,
 *   lines: Array<{ item_id: string, unit_price: number }>,
 *   total: number,
 *   b2bCost: number,
 *   partnerProfit: number,
 *   ts: number,
 * }} payload
 */
export function buildPartnerPricingCanonical(payload) {
  const lines = [...(payload.lines || [])]
    .map((l) => ({
      item_id: String(l.item_id),
      unit_price: Math.round(Number(l.unit_price) || 0),
    }))
    .sort((a, b) => (a.item_id < b.item_id ? -1 : a.item_id > b.item_id ? 1 : 0));

  const linesStr = lines.map((l) => `${l.item_id}:${l.unit_price}`).join(",");

  return [
    "v1",
    String(payload.cartId || ""),
    String(payload.storeId ?? ""),
    String(payload.partnerId ?? ""),
    Math.round(Number(payload.total) || 0),
    Math.round(Number(payload.b2bCost) || 0),
    Math.round(Number(payload.partnerProfit) || 0),
    Math.round(Number(payload.ts) || 0),
    linesStr,
  ].join("|");
}

export function signPartnerPricing(payload, secret = getPartnerCheckoutSecret()) {
  if (!secret) throw new Error("PARTNER_CHECKOUT_SECRET 未設定");
  const canonical = buildPartnerPricingCanonical(payload);
  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}
