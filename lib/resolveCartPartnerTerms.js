import {
  parsePercentMap,
  resolvePartnerRatePercent,
  resolveReferralDiscountPercent,
  resolveTelecomFromVariant,
  PARTNER_RATE_METADATA_KEY,
  REFERRAL_DISCOUNT_METADATA_KEY,
} from "./productPartnerTerms";
import {
  clampReferralDiscountPercent,
  DEFAULT_REFERRAL_DISCOUNT_PERCENT,
} from "./partnerReferralDiscount";

/**
 * 從已含 product / variant 的 cart items 解析「專屬折扣％」
 * 多件不同趴數時取購物車中出現最多次的趴數；平手取較高者。
 */
export function resolveReferralDiscountPercentFromCartItems(items) {
  const votes = new Map();
  for (const item of items || []) {
    const product = item.product || item.variant?.product || null;
    const variant = item.variant || null;
    const telecom = resolveTelecomFromVariant(variant);
    let pct = resolveReferralDiscountPercent(product, telecom);
    if (pct == null && product) {
      // 無電信商或對不到時：若商品只設一個趴數就用它
      const map = parsePercentMap(
        product[REFERRAL_DISCOUNT_METADATA_KEY] ??
          product.metadata?.[REFERRAL_DISCOUNT_METADATA_KEY],
      );
      const vals = Object.values(map);
      if (vals.length === 1) pct = vals[0];
    }
    if (pct == null || pct <= 0) continue;
    const n = clampReferralDiscountPercent(pct);
    if (!n) continue;
    votes.set(n, (votes.get(n) || 0) + (item.quantity || 1));
  }
  if (!votes.size) return null;
  let best = null;
  let bestCount = -1;
  for (const [pct, count] of votes.entries()) {
    if (count > bestCount || (count === bestCount && pct > (best || 0))) {
      best = pct;
      bestCount = count;
    }
  }
  return best;
}

export function resolvePartnerRatePercentFromCartItems(items) {
  const rates = [];
  for (const item of items || []) {
    const product = item.product || item.variant?.product || null;
    const variant = item.variant || null;
    const telecom = resolveTelecomFromVariant(variant);
    let pct = resolvePartnerRatePercent(product, telecom);
    if (pct == null && product) {
      const map = parsePercentMap(
        product[PARTNER_RATE_METADATA_KEY] ??
          product.metadata?.[PARTNER_RATE_METADATA_KEY],
      );
      const vals = Object.values(map);
      if (vals.length === 1) pct = vals[0];
    }
    if (pct != null && pct > 0) rates.push(pct);
  }
  if (!rates.length) return null;
  // 多件時以加權平均（簡化：算術平均）
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
}

export function fallbackReferralDiscountPercent(partnerPercent) {
  return (
    clampReferralDiscountPercent(partnerPercent) ||
    DEFAULT_REFERRAL_DISCOUNT_PERCENT
  );
}
