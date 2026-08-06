/**
 * Medusa metadata.subtitle_by_carrier 解析。
 * product-content API 以 JSON.stringify 寫入，故常為字串；
 * 若未解析就 ...spread，字元索引會變成 "0"→"{"，再被模糊比對誤中。
 */

export function parseSubtitleByCarrier(raw) {
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
  for (const [carrier, value] of Object.entries(parsed)) {
    const key = String(carrier || "").trim();
    const text = String(value ?? "").trim();
    if (!key || !text) continue;
    out[key] = text;
  }
  return out;
}
