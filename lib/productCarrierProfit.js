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
    const n = Number(value);
    if (!Number.isNaN(n) && n > 0) out[String(carrier).trim()] = n;
  });
  return out;
}

export function resolveCarrierProfitPercent(map, carrierName) {
  if (!map || !carrierName) return null;
  const carrier = String(carrierName).trim();
  if (map[carrier] != null) return map[carrier];
  const key = Object.keys(map).find(
    (k) => k.trim().toLowerCase() === carrier.toLowerCase(),
  );
  return key != null ? map[key] : null;
}
