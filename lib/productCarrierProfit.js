/** Medusa metadata.carrier_profit_by_carrier — 各電信商建議售價利潤％ */

export function parseCarrierProfitByCarrier(raw) {
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
    if (!Number.isNaN(n) && n > 0) out[String(carrier).trim()] = n;
  });
  return out;
}

/** 「吃到飽 不限流量 (OPTUS)」→ OPTUS；供學生長天數等方案類型＋電信合併標籤 */
export function extractCarrierFromTelecomLabel(label) {
  const s = String(label || "").trim();
  if (!s) return "";
  const m = s.match(/\(([^)]+)\)\s*$/);
  return m ? String(m[1]).trim() : "";
}

export function resolveCarrierProfitPercent(map, carrierName) {
  if (!map || !carrierName) return null;
  const carrier = String(carrierName).trim();
  if (map[carrier] != null) return map[carrier];
  const key = Object.keys(map).find(
    (k) => k.trim().toLowerCase() === carrier.toLowerCase(),
  );
  if (key != null) return map[key];
  const nested = extractCarrierFromTelecomLabel(carrier);
  if (nested && nested !== carrier) {
    return resolveCarrierProfitPercent(map, nested);
  }
  return null;
}

/**
 * 變體利潤趴：variant.metadata.profit_percent（或 profit_margin）
 * → 後備 carrier_profit_by_carrier[telecom]
 */
export function resolveVariantProfitPercent(variant, productOrCarrierMap, telecom) {
  const meta = variant?.metadata || {};
  const raw = meta.profit_percent ?? meta.profit_margin;
  if (raw != null && raw !== "") {
    const n = Number(String(raw).replace("%", "").trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  const map =
    productOrCarrierMap && !Array.isArray(productOrCarrierMap)
      ? productOrCarrierMap.carrier_profit_by_carrier != null ||
        productOrCarrierMap.metadata != null
        ? parseCarrierProfitByCarrier(
            productOrCarrierMap.carrier_profit_by_carrier ??
              productOrCarrierMap.metadata?.carrier_profit_by_carrier,
          )
        : parseCarrierProfitByCarrier(productOrCarrierMap)
      : {};
  const carrier =
    telecom ||
    meta.carrier ||
    meta.attributes?.telecom ||
    "";
  return resolveCarrierProfitPercent(map, carrier);
}
