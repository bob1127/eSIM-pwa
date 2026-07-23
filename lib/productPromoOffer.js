/** Medusa metadata：依電信商儲存商品優惠碼顯示資訊 */

export const PROMO_OFFER_METADATA_KEY = "promo_offer_by_carrier";

/**
 * @typedef {Object} PromoOffer
 * @property {boolean} enabled
 * @property {string} code
 * @property {'percent'|'fixed'} discount_type
 * @property {number} discount_value
 * @property {string} [message]
 */

export function normalizePromoOffer(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      enabled: false,
      code: "",
      discount_type: "percent",
      discount_value: 0,
      message: "",
    };
  }

  const discountType =
    value.discount_type === "fixed" || value.discountType === "fixed"
      ? "fixed"
      : "percent";

  const rawValue = Number(
    value.discount_value ?? value.discountValue ?? value.amount ?? 0,
  );

  return {
    enabled: Boolean(value.enabled ?? value.active ?? false),
    code: String(value.code || "").trim().toUpperCase(),
    discount_type: discountType,
    discount_value: Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0,
    message: String(value.message || "").trim(),
  };
}

export function parsePromoOfferByCarrier(raw) {
  if (!raw) return {};
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};

  const out = {};
  for (const [carrier, value] of Object.entries(data)) {
    const offer = normalizePromoOffer(value);
    if (offer.code || offer.message || offer.enabled) {
      out[carrier] = offer;
    }
  }
  return out;
}

function findCarrierEntry(map, carrierName) {
  if (!map || !carrierName || carrierName === "default") return null;
  const carrier = String(carrierName).trim();
  if (map[carrier]) return map[carrier];
  const key = Object.keys(map).find(
    (k) => k.trim().toLowerCase() === carrier.toLowerCase(),
  );
  return key ? map[key] : null;
}

/** 產生顯示文案（有自訂 message 優先） */
export function formatPromoOfferText(offer) {
  if (!offer) return "";
  if (offer.message) return offer.message;
  if (!offer.code || !offer.enabled) return "";

  if (offer.discount_type === "fixed" && offer.discount_value > 0) {
    return `這款 eSIM 加碼 NT$${Math.round(offer.discount_value)} 折扣！使用折扣碼：${offer.code}`;
  }
  if (offer.discount_type === "percent" && offer.discount_value > 0) {
    return `這款 eSIM 加碼 ${offer.discount_value}% 折扣！使用折扣碼：${offer.code}`;
  }
  return `使用折扣碼：${offer.code}`;
}

/**
 * 解析目前電信商應顯示的優惠（enabled + 有 code 才回傳）
 * @returns {PromoOffer|null}
 */
export function resolvePromoOffer(product, carrierName) {
  const fromMeta = parsePromoOfferByCarrier(
    product?.promo_offer_by_carrier ?? product?.metadata?.promo_offer_by_carrier,
  );

  if (!fromMeta || Object.keys(fromMeta).length === 0) return null;

  const matched =
    findCarrierEntry(fromMeta, carrierName) || fromMeta.default || null;
  if (!matched) return null;
  if (!matched.enabled || !matched.code) return null;
  return matched;
}

export function serializePromoOffer(offer) {
  const normalized = normalizePromoOffer(offer);
  if (!normalized.code && !normalized.message) {
    return null;
  }
  return {
    enabled: normalized.enabled,
    code: normalized.code,
    discount_type: normalized.discount_type,
    discount_value: normalized.discount_value,
    ...(normalized.message ? { message: normalized.message } : {}),
  };
}
