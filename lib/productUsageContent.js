/** Medusa metadata：依電信商儲存使用介紹 HTML */

import { soleCarrierFallback } from "./productCarrierMetaFallback";

export const USAGE_CONTENT_METADATA_KEY = "usage_content_by_carrier";

export function parseUsageContentByCarrier(raw) {
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
  for (const [carrier, html] of Object.entries(data)) {
    const content = String(html || "").trim();
    if (content) out[carrier] = content;
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

/** 依電信商取得使用介紹 HTML */
export function resolveUsageContent(product, carrierName) {
  const fromMeta = parseUsageContentByCarrier(
    product?.usage_content_by_carrier,
  );

  if (fromMeta && Object.keys(fromMeta).length > 0) {
    const matched = findCarrierEntry(fromMeta, carrierName);
    if (matched) return matched;
    if (fromMeta.default) return fromMeta.default;
    if (fromMeta._default) return fromMeta._default;
    const sole = soleCarrierFallback(fromMeta, carrierName);
    if (sole) return sole;
  }

  return product?.usage_content || "";
}
