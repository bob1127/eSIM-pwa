/**
 * 夥伴底價（B2B 成本）計算
 *
 * 優先順序：
 * 1. variant.metadata.b2b_price（變體固定底價）
 * 2. 零售價 × b2b_cost_rate（變體 → 商品 → 全域）
 *
 * Medusa 商品 metadata 可設：
 *   b2b_cost_rate: 0.85   （底價 = 零售價 × 85%）
 * 變體 metadata 可設：
 *   b2b_price: 350        （覆寫固定底價）
 *   b2b_cost_rate: 0.8    （覆寫該變體折扣率）
 *
 * 環境變數 PARTNER_B2B_COST_RATE（預設 1 = 與零售價相同）
 */

export function getGlobalB2BCostRate() {
  const raw = process.env.PARTNER_B2B_COST_RATE;
  if (raw == null || raw === "") return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseRetailPrice(variant) {
  if (
    variant?.calculated_price &&
    typeof variant.calculated_price.calculated_amount === "number"
  ) {
    return variant.calculated_price.calculated_amount;
  }
  if (typeof variant?.calculated_price === "number") {
    return variant.calculated_price;
  }
  const twd = variant?.prices?.find(
    (p) => p.currency_code?.toLowerCase() === "twd",
  );
  if (twd?.amount != null) return Number(twd.amount);
  if (variant?.prices?.[0]?.amount != null) {
    return Number(variant.prices[0].amount);
  }
  return 0;
}

export function resolveB2BPrice(variant, productMetadata = {}) {
  const meta = variant?.metadata || {};
  const prodMeta = productMetadata || {};

  if (meta.b2b_price != null && meta.b2b_price !== "") {
    const fixed = Number(meta.b2b_price);
    if (Number.isFinite(fixed) && fixed >= 0) return Math.round(fixed);
  }

  const retail = parseRetailPrice(variant);
  const rate =
    meta.b2b_cost_rate != null && meta.b2b_cost_rate !== ""
      ? Number(meta.b2b_cost_rate)
      : prodMeta.b2b_cost_rate != null && prodMeta.b2b_cost_rate !== ""
        ? Number(prodMeta.b2b_cost_rate)
        : getGlobalB2BCostRate();

  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  return Math.round(retail * safeRate);
}

export function resolveB2BPricingMeta(productMetadata = {}) {
  const globalRate = getGlobalB2BCostRate();
  const productRate = productMetadata?.b2b_cost_rate;
  return {
    globalB2BCostRate: globalRate,
    productB2BCostRate:
      productRate != null && productRate !== "" ? Number(productRate) : null,
    source:
      productRate != null
        ? "product_metadata"
        : globalRate !== 1
          ? "env"
          : "retail",
  };
}
