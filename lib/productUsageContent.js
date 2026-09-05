/** Medusa metadata：依電信商儲存使用介紹 HTML */

import { soleCarrierFallback } from "./productCarrierMetaFallback";
import { findCarrierKeyedValue } from "./carrierKeyedLookup";

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

/** 依電信商取得使用介紹 HTML */
export function resolveUsageContent(product, carrierName) {
  const fromMeta = parseUsageContentByCarrier(
    product?.usage_content_by_carrier,
  );

  if (fromMeta && Object.keys(fromMeta).length > 0) {
    const matched = findCarrierKeyedValue(fromMeta, carrierName);
    if (matched) return matched;
    if (fromMeta.default) return fromMeta.default;
    if (fromMeta._default) return fromMeta._default;
    const sole = soleCarrierFallback(fromMeta, carrierName);
    if (sole) return sole;
  }

  return product?.usage_content || "";
}
