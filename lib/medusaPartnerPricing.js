/**
 * 夥伴底價（B2B）計算
 *
 * 兩層：
 * 1. API／批發成本（resolveApiWholesalePrice）
 *    - variant.metadata.b2b_price（供應商／API 底價）
 *    - 否則：零售價 ×（變體／商品 metadata.b2b_cost_rate，預設 1）
 * 2. 夥伴看到的底價（resolveB2BPrice）= API 底價 × PARTNER_B2B_COST_RATE
 *    - 例：PARTNER_B2B_COST_RATE=1.2 → 你抽 20%，夥伴底價 = API × 1.2
 *
 * Supabase product_variations.b2b_price 應存「API 原始底價」；
 * 給夥伴看／算售價時再乘 PARTNER_B2B_COST_RATE。
 */

// 合理範圍防呆：環境變數設定錯誤（例如多打一個 0）不該讓全店價格暴衝或歸零
const MIN_PLATFORM_RATE = 1; // 平台至少不倒貼（= 不含抽成）
const MAX_PLATFORM_RATE = 5; // 最高抽到 4 倍不合理，視為設定錯誤

export function getPartnerB2BMarkupMultiplier() {
  const raw = process.env.PARTNER_B2B_COST_RATE;
  if (raw == null || raw === "") return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  if (n < MIN_PLATFORM_RATE || n > MAX_PLATFORM_RATE) {
    console.error(
      `[medusaPartnerPricing] PARTNER_B2B_COST_RATE=${raw} 超出合理範圍（${MIN_PLATFORM_RATE}~${MAX_PLATFORM_RATE}），已忽略並改用預設值 1`,
    );
    return 1;
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

/**
 * API／供應商原始底價（不含平台抽成）——「即時」版本。
 * 優先打 MicroeSIM 目前報價（依 variant.sku 比對，見 lib/esim/livePlanCost.js），
 * 抓不到（方案已下架／供應商 API 暫時無回應）才退回舊的
 * metadata.b2b_price／估算比例邏輯，確保永遠有一個合理的底價可用。
 *
 * 刻意獨立成 async 版本、不影響既有同步版 resolveApiWholesalePrice：
 * 只在「商品上架同步」與「後台批次刷新」呼叫，不進入結帳熱路徑。
 */
export async function resolveApiWholesalePriceLive(variant, productMetadata = {}) {
  if (variant?.sku) {
    try {
      const { resolveLivePlanCostTWD } = await import("./esim/livePlanCost");
      const live = await resolveLivePlanCostTWD(variant.sku);
      if (live && live.costTWD > 0) {
        return { value: live.costTWD, source: "live_api", meta: live };
      }
    } catch (err) {
      console.error(
        `[medusaPartnerPricing] 即時底價查詢失敗（${variant.sku}），退回估算值：`,
        err?.message || err,
      );
    }
  }

  const fallbackValue = resolveApiWholesalePrice(variant, productMetadata);
  return { value: fallbackValue, source: "fallback_estimate", meta: null };
}

/** API／供應商原始底價（不含平台抽成） */
export function resolveApiWholesalePrice(variant, productMetadata = {}) {
  const meta = variant?.metadata || {};
  const prodMeta = productMetadata || {};

  if (meta.b2b_price != null && meta.b2b_price !== "") {
    const fixed = Number(meta.b2b_price);
    if (Number.isFinite(fixed) && fixed >= 0) return Math.round(fixed);
  }

  const retail = parseRetailPrice(variant);
  const estimateRate =
    meta.b2b_cost_rate != null && meta.b2b_cost_rate !== ""
      ? Number(meta.b2b_cost_rate)
      : prodMeta.b2b_cost_rate != null && prodMeta.b2b_cost_rate !== ""
        ? Number(prodMeta.b2b_cost_rate)
        : 1;

  const safeRate =
    Number.isFinite(estimateRate) && estimateRate > 0 ? estimateRate : 1;
  return Math.round(retail * safeRate);
}

/** 把 API 底價加成夥伴可見底價（× PARTNER_B2B_COST_RATE） */
export function applyPartnerB2BMarkup(apiCost) {
  const cost = Number(apiCost) || 0;
  if (cost <= 0) return 0;
  return Math.round(cost * getPartnerB2BMarkupMultiplier());
}

/** 夥伴看到／結算用的底價 = API 底價 × 平台倍率 */
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
