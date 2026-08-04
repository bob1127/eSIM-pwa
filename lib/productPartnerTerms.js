/** Medusa metadata：各電信商「專屬連結夥伴」分潤％／旅客折扣％ */

export const PARTNER_RATE_METADATA_KEY = "carrier_partner_rate_by_carrier";
export const REFERRAL_DISCOUNT_METADATA_KEY =
  "carrier_referral_discount_by_carrier";

export function parsePercentMap(raw) {
  if (!raw) return {};
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const out = {};
  Object.entries(parsed).forEach(([carrier, value]) => {
    const n = Number(String(value).replace("%", "").trim());
    if (Number.isFinite(n) && n >= 0) out[String(carrier).trim()] = n;
  });
  return out;
}

function findCarrierEntry(map, carrierName) {
  if (!map || !carrierName) return null;
  const carrier = String(carrierName).trim();
  if (map[carrier] != null) return map[carrier];
  const key = Object.keys(map).find(
    (k) => k.trim().toLowerCase() === carrier.toLowerCase(),
  );
  return key != null ? map[key] : null;
}

export function resolvePartnerRatePercent(productOrMeta, carrierName) {
  const map = parsePercentMap(
    productOrMeta?.carrier_partner_rate_by_carrier ??
      productOrMeta?.metadata?.carrier_partner_rate_by_carrier ??
      productOrMeta,
  );
  const n = findCarrierEntry(map, carrierName);
  return n != null && n > 0 ? n : null;
}

export function resolveReferralDiscountPercent(productOrMeta, carrierName) {
  const map = parsePercentMap(
    productOrMeta?.carrier_referral_discount_by_carrier ??
      productOrMeta?.metadata?.carrier_referral_discount_by_carrier ??
      productOrMeta,
  );
  const n = findCarrierEntry(map, carrierName);
  return n != null && n > 0 ? n : null;
}

/** 從變體 options／metadata 取出電信商名稱 */
export function resolveTelecomFromVariant(variant) {
  if (!variant) return "";
  const fromMeta =
    variant.metadata?.carrier ||
    variant.metadata?.attributes?.telecom ||
    "";
  if (fromMeta) return String(fromMeta).trim();

  const opts = variant.options || [];
  for (const o of opts) {
    const title = String(
      o.option?.title || o.title || o.option_id || "",
    ).toLowerCase();
    if (title.includes("電信") || title.includes("telecom") || title.includes("carrier")) {
      return String(o.value || o.option_value || "").trim();
    }
  }

  // Medusa v2：options 可能是 { 電信商: "AIS" } 物件
  if (variant.options && !Array.isArray(variant.options)) {
    for (const [k, v] of Object.entries(variant.options)) {
      if (/電信|telecom|carrier/i.test(k)) return String(v || "").trim();
    }
  }
  return "";
}
