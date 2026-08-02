/**
 * 夥伴底價（B2B）計算
 *
 * 正確優先順序（API 原始底價，不含平台抽成）：
 * 1. MicroeSIM 即時報價（resolveApiWholesalePriceLive）
 * 2. Medusa variant.metadata.b2b_price（上架／匯入時寫入的真實成本）
 * 3. 僅在「明確設定」b2b_cost_rate（且 < 1）時：零售價 × 該比例（估算，需標示）
 * 4. 不可用 → 0（禁止再用「零售價 × 1」冒充成本）
 *
 * 夥伴可見底價 = API 底價 × PARTNER_B2B_COST_RATE（預設 1.2＝平台抽兩成）
 * Supabase product_variations.b2b_price 只存 API 原始底價；顯示／結帳再乘倍率。
 */

const MIN_PLATFORM_RATE = 1;
const MAX_PLATFORM_RATE = 5;
/** 明確設定的成本佔零售價比例才允許當估算（預設 1 = 等於零售價，禁止） */
const MAX_EXPLICIT_COST_RATE = 0.95;
const MIN_EXPLICIT_COST_RATE = 0.2;

/** 平台對夥伴底價預設抽成：API 成本 × 1.2（兩成）。可用 PARTNER_B2B_COST_RATE 覆寫。 */
export const DEFAULT_PARTNER_B2B_COST_RATE = 1.2;

export function getPartnerB2BMarkupMultiplier() {
  const raw = process.env.PARTNER_B2B_COST_RATE;
  if (raw == null || raw === "") return DEFAULT_PARTNER_B2B_COST_RATE;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PARTNER_B2B_COST_RATE;
  if (n < MIN_PLATFORM_RATE || n > MAX_PLATFORM_RATE) {
    console.error(
      `[medusaPartnerPricing] PARTNER_B2B_COST_RATE=${raw} 超出合理範圍（${MIN_PLATFORM_RATE}~${MAX_PLATFORM_RATE}），已忽略並改用預設 ${DEFAULT_PARTNER_B2B_COST_RATE}`,
    );
    return DEFAULT_PARTNER_B2B_COST_RATE;
  }
  return n;
}

/** @deprecated 請用 getPartnerB2BMarkupMultiplier */
export function getGlobalB2BCostRate() {
  return getPartnerB2BMarkupMultiplier();
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

function readExplicitCostRate(meta, prodMeta) {
  const raw =
    meta?.b2b_cost_rate != null && meta.b2b_cost_rate !== ""
      ? Number(meta.b2b_cost_rate)
      : prodMeta?.b2b_cost_rate != null && prodMeta.b2b_cost_rate !== ""
        ? Number(prodMeta.b2b_cost_rate)
        : null;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  // 禁止預設／誤設成 1（等於把零售價當成本）
  if (raw > MAX_EXPLICIT_COST_RATE || raw < MIN_EXPLICIT_COST_RATE) return null;
  return raw;
}

/**
 * @returns {{ value: number, source: 'metadata'|'explicit_rate'|'unavailable', retail?: number }}
 */
export function resolveApiWholesalePriceDetailed(
  variant,
  productMetadata = {},
) {
  const meta = variant?.metadata || {};
  const prodMeta = productMetadata || {};

  if (meta.b2b_price != null && meta.b2b_price !== "") {
    const fixed = Number(meta.b2b_price);
    if (Number.isFinite(fixed) && fixed > 0) {
      return { value: Math.round(fixed), source: "metadata" };
    }
  }

  const retail = parseRetailPrice(variant);
  const explicitRate = readExplicitCostRate(meta, prodMeta);
  if (retail > 0 && explicitRate != null) {
    return {
      value: Math.round(retail * explicitRate),
      source: "explicit_rate",
      retail,
    };
  }

  return { value: 0, source: "unavailable", retail };
}

/** API／供應商原始底價（不含平台抽成）；抓不到可靠來源時回 0 */
export function resolveApiWholesalePrice(variant, productMetadata = {}) {
  return resolveApiWholesalePriceDetailed(variant, productMetadata).value;
}

/**
 * 即時版本：Live API → metadata → 明確估算比例；永不退回零售價×1。
 */
export async function resolveApiWholesalePriceLive(
  variant,
  productMetadata = {},
) {
  if (variant?.sku) {
    try {
      const { resolveLivePlanCostTWD } = await import("./esim/livePlanCost");
      const live = await resolveLivePlanCostTWD(variant.sku);
      if (live && live.costTWD > 0) {
        return { value: live.costTWD, source: "live_api", meta: live };
      }
    } catch (err) {
      console.error(
        `[medusaPartnerPricing] 即時底價查詢失敗（${variant.sku}）：`,
        err?.message || err,
      );
    }
  }

  const fallback = resolveApiWholesalePriceDetailed(variant, productMetadata);
  return {
    value: fallback.value,
    source: fallback.source,
    meta: null,
    retail: fallback.retail,
  };
}

export function applyPartnerB2BMarkup(apiCost) {
  const cost = Number(apiCost) || 0;
  if (cost <= 0) return 0;
  return Math.round(cost * getPartnerB2BMarkupMultiplier());
}

export function resolveB2BPrice(variant, productMetadata = {}) {
  return applyPartnerB2BMarkup(
    resolveApiWholesalePrice(variant, productMetadata),
  );
}

export function resolveB2BPricingMeta(productMetadata = {}) {
  const globalRate = getPartnerB2BMarkupMultiplier();
  const productRate = productMetadata?.b2b_cost_rate;
  return {
    globalB2BCostRate: globalRate,
    partnerB2BMarkupMultiplier: globalRate,
    productB2BCostRate:
      productRate != null && productRate !== "" ? Number(productRate) : null,
    source:
      productRate != null
        ? "product_metadata"
        : globalRate !== 1
          ? "env"
          : "api",
  };
}

/** 是否為可靠、可寫入 DB 的 API 底價 */
export function isReliableApiWholesaleCost(value, source) {
  if (!(Number(value) > 0)) return false;
  if (source === "unavailable" || source === "fallback_estimate") return false;
  return true;
}
