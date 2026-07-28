/**
 * 專屬商店定價：
 * - 商店模式 percent：底價 × (1 + 加價%)
 * - 商店模式 fixed：底價 + 固定加價金額
 * - custom_prices 可覆寫整品或單一方案
 *
 * custom_prices 約定：
 * - [variantId]: 單一方案售價（絕對金額）
 * - _sell: 商品「自訂起價」（列表顯示；內頁各方案等比縮放）
 * - _markup: 單一商品覆寫為「比例加價」（%）
 * - _markup_fixed: 單一商品覆寫為「固定加價」（NT$）
 *
 * 安全邊界：所有寫入（markup_rate／markup_mode／markup_fixed／custom_prices）
 * 一律經伺服器 API 驗證。
 */

export const MARKUP_RATE_MIN = 0;
export const MARKUP_RATE_MAX = 500;
export const MARKUP_FIXED_MIN = 0;
export const MARKUP_FIXED_MAX = 10000;
export const MARKUP_MODE_PERCENT = "percent";
export const MARKUP_MODE_FIXED = "fixed";

/** 驗證加價率是否在允許範圍內 */
export function validateMarkupRateInput(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "加價率必須是數字" };
  }
  if (n < MARKUP_RATE_MIN || n > MARKUP_RATE_MAX) {
    return {
      ok: false,
      error: `加價率需介於 ${MARKUP_RATE_MIN}% ~ ${MARKUP_RATE_MAX}% 之間`,
    };
  }
  return { ok: true, value: Math.round(n * 10) / 10 };
}

/** 驗證固定加價金額 */
export function validateMarkupFixedInput(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "固定加價必須是數字" };
  }
  if (n < MARKUP_FIXED_MIN || n > MARKUP_FIXED_MAX) {
    return {
      ok: false,
      error: `固定加價需介於 NT$${MARKUP_FIXED_MIN} ~ NT$${MARKUP_FIXED_MAX} 之間`,
    };
  }
  return { ok: true, value: Math.round(n) };
}

export function normalizeMarkupMode(raw) {
  return String(raw || "").toLowerCase() === MARKUP_MODE_FIXED
    ? MARKUP_MODE_FIXED
    : MARKUP_MODE_PERCENT;
}

/**
 * 解析此商品實際使用的加價策略：
 * 商品覆寫優先於商店設定。
 * - 有 _markup_fixed → fixed
 * - 有 _markup → percent
 * - 否則跟商店 markup_mode
 */
export function resolveMarkupStrategy({
  storeMarkupRate = 0,
  storeMarkupMode = MARKUP_MODE_PERCENT,
  storeMarkupFixed = 0,
  customPrices = {},
} = {}) {
  if (customPrices?._markup_fixed != null && customPrices._markup_fixed !== "") {
    const n = Number(customPrices._markup_fixed);
    if (Number.isFinite(n) && n >= 0) {
      return { mode: MARKUP_MODE_FIXED, value: n };
    }
  }
  if (customPrices?._markup != null && customPrices._markup !== "") {
    const n = Number(customPrices._markup);
    if (Number.isFinite(n) && n >= 0) {
      return { mode: MARKUP_MODE_PERCENT, value: n };
    }
  }
  const mode = normalizeMarkupMode(storeMarkupMode);
  if (mode === MARKUP_MODE_FIXED) {
    return {
      mode: MARKUP_MODE_FIXED,
      value: Number(storeMarkupFixed) || 0,
    };
  }
  return {
    mode: MARKUP_MODE_PERCENT,
    value: Number(storeMarkupRate) || 0,
  };
}

/** @deprecated 相容舊呼叫；請改用 resolveMarkupStrategy */
export function resolveListingMarkupRate(storeMarkupRate, customPrices = {}) {
  if (customPrices?._markup != null && customPrices._markup !== "") {
    const n = Number(customPrices._markup);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return Number(storeMarkupRate) || 0;
}

/** 依策略把底價換成售價 */
export function applyMarkupStrategy(cost, strategy) {
  const c = Number(cost) || 0;
  if (!(c > 0) || !strategy) return 0;
  if (strategy.mode === MARKUP_MODE_FIXED) {
    return Math.round(c + (Number(strategy.value) || 0));
  }
  return Math.round(c * (1 + (Number(strategy.value) || 0) / 100));
}

function lookupCustomVariantPrice(customPrices, variantId, altIds = []) {
  const keys = [variantId, ...altIds]
    .filter((k) => k != null && k !== "")
    .map(String);
  for (const k of keys) {
    const raw = customPrices?.[k];
    if (raw === undefined || raw === null || raw === "") continue;
    const n = Math.round(Number(raw));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/** 單一方案售價（未套用 _sell 縮放） */
export function resolvePartnerVariantBasePrice({
  b2bCost = 0,
  retailPrice = 0,
  markupRate = 0,
  markupMode = MARKUP_MODE_PERCENT,
  markupFixed = 0,
  customPrices = {},
  variantId,
  altVariantIds = [],
} = {}) {
  const byId = lookupCustomVariantPrice(customPrices, variantId, altVariantIds);
  if (byId != null) return byId;

  const strategy = resolveMarkupStrategy({
    storeMarkupRate: markupRate,
    storeMarkupMode: markupMode,
    storeMarkupFixed: markupFixed,
    customPrices,
  });

  const cost = Number(b2bCost) || 0;
  if (cost > 0) return applyMarkupStrategy(cost, strategy);

  const retail = Number(retailPrice) || 0;
  if (retail > 0) return applyMarkupStrategy(retail, strategy);
  return 0;
}

/**
 * 套用夥伴加價到 variations[]（Medusa 內頁格式）。
 * 變體需有 price（主站零售）與可選 b2b_price（底價）。
 */
export function applyPartnerMarkupToVariations(
  variations,
  {
    markupRate = 0,
    markupMode = MARKUP_MODE_PERCENT,
    markupFixed = 0,
    customPrices = {},
  } = {},
) {
  const customs = customPrices || {};

  let next = (variations || []).map((v) => {
    const retail = Number(v.retail_price ?? v.price) || 0;
    const b2b = Number(v.b2b_price) || 0;
    const partnerPrice = resolvePartnerVariantBasePrice({
      b2bCost: b2b,
      retailPrice: retail,
      markupRate,
      markupMode,
      markupFixed,
      customPrices: customs,
      variantId: v.id,
      altVariantIds: [v.medusa_variant_id, v.local_id, v.sku].filter(Boolean),
    });
    return {
      ...v,
      price: partnerPrice,
      original_price: retail > 0 ? retail : v.original_price || retail,
      retail_price: retail,
      b2b_price: b2b || v.b2b_price || 0,
    };
  });

  // 商品級自訂起價：等比縮放，讓最低方案 = _sell
  const sellFloor = Number(customs._sell);
  if (Number.isFinite(sellFloor) && sellFloor > 0 && next.length) {
    const positives = next.map((v) => Number(v.price) || 0).filter((n) => n > 0);
    const minPrice = positives.length ? Math.min(...positives) : 0;
    if (minPrice > 0 && minPrice !== sellFloor) {
      const ratio = sellFloor / minPrice;
      next = next.map((v) => {
        const base = Number(v.price) || 0;
        if (base <= 0) return v;
        return { ...v, price: Math.round(base * ratio) };
      });
    }
  }

  return next;
}

/** 列表卡「起價」 */
export function resolvePartnerListingDisplayPrice({
  variantSellPrices = [],
  customPrices = {},
} = {}) {
  const sell = Number(customPrices?._sell);
  if (Number.isFinite(sell) && sell > 0) return Math.round(sell);

  const positives = (variantSellPrices || [])
    .map((n) => Number(n) || 0)
    .filter((n) => n > 0);
  return positives.length ? Math.min(...positives) : 0;
}

/**
 * 驗證夥伴送出的 custom_prices，只允許已知鍵值並套用邊界。
 *
 * @param {object} rawCustomPrices
 * @param {{ id: number|string, cost: number, medusa_variant_id?: string, sku?: string }[]} variantCosts
 */
export function validateCustomPricesInput(rawCustomPrices, variantCosts = []) {
  if (rawCustomPrices == null || typeof rawCustomPrices !== "object") {
    return { ok: false, error: "custom_prices 格式錯誤" };
  }

  // 每個方案可能有多個別名鍵（本地 id / medusa_variant_id / sku）
  // 對到任一鍵就接受，並展開寫入所有別名，避免後台存本地 id、前台用 Medusa id 對不到
  const costByKey = new Map();
  const aliasesByKey = new Map();
  for (const v of variantCosts) {
    const cost = Number(v.cost) || 0;
    const aliases = [
      v.id,
      v.medusa_variant_id,
      v.sku,
    ]
      .filter((k) => k != null && String(k).trim() !== "")
      .map(String);
    if (!aliases.length) continue;
    for (const a of aliases) {
      costByKey.set(a, cost);
      aliasesByKey.set(a, aliases);
    }
  }
  const minCost = variantCosts.length
    ? Math.min(
        ...variantCosts.map((v) => Number(v.cost) || 0).filter((n) => n > 0),
      )
    : 0;

  const clean = {};
  const unknownKeys = [];

  for (const [key, rawVal] of Object.entries(rawCustomPrices)) {
    if (rawVal === "" || rawVal === null || rawVal === undefined) continue;

    if (key === "_markup") {
      const check = validateMarkupRateInput(rawVal);
      if (!check.ok) return { ok: false, error: `商品加價率：${check.error}` };
      clean._markup = check.value;
      continue;
    }

    if (key === "_markup_fixed") {
      const check = validateMarkupFixedInput(rawVal);
      if (!check.ok) {
        return { ok: false, error: `商品固定加價：${check.error}` };
      }
      clean._markup_fixed = check.value;
      continue;
    }

    if (key === "_sell") {
      const n = Number(rawVal);
      if (!Number.isFinite(n) || n <= 0) {
        return { ok: false, error: "自訂售價需為正數" };
      }
      if (minCost > 0 && n < minCost) {
        return {
          ok: false,
          error: `自訂售價不可低於底價 NT$${Math.round(minCost)}`,
        };
      }
      clean._sell = Math.round(n);
      continue;
    }

    // 單一方案覆寫價（本地 id / medusa_variant_id / sku）
    if (costByKey.has(String(key))) {
      const n = Number(rawVal);
      const cost = costByKey.get(String(key));
      if (!Number.isFinite(n) || n <= 0) {
        return { ok: false, error: `方案售價需為正數（${key}）` };
      }
      if (cost > 0 && n < cost) {
        return {
          ok: false,
          error: `方案售價不可低於底價 NT$${Math.round(cost)}（${key}）`,
        };
      }
      const price = Math.round(n);
      const aliases = aliasesByKey.get(String(key)) || [String(key)];
      for (const a of aliases) clean[a] = price;
      continue;
    }

    // 看起來像方案覆寫卻對不到 → 記下來，避免默默存成空物件
    if (!String(key).startsWith("_")) unknownKeys.push(key);
  }

  if (unknownKeys.length) {
    if (!variantCosts.length) {
      return {
        ok: false,
        error: "此商品尚無方案資料，無法儲存個別售價。請重新整理或重新上架後再試。",
      };
    }
    return {
      ok: false,
      error: `方案售價鍵無法對應到商品方案（${unknownKeys
        .slice(0, 3)
        .join(", ")}${unknownKeys.length > 3 ? "…" : ""}）。請重新整理定價頁再儲存。`,
    };
  }

  return { ok: true, value: clean };
}
