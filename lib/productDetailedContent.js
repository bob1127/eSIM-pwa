/** Medusa metadata：依電信商儲存產品介紹 HTML */

import { stripEuPackCopy } from "./productKeyFeatures";
import { soleCarrierFallback } from "./productCarrierMetaFallback";
import { findCarrierKeyedValue } from "./carrierKeyedLookup";

export const DETAILED_CONTENT_METADATA_KEY = "detailed_content_by_carrier";

export function parseDetailedContentByCarrier(raw) {
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
    const content = stripEuPackCopy(String(html || "").trim());
    if (content) out[carrier] = content;
  }
  return out;
}

/** 依電信商取得產品介紹 HTML */
export function resolveDetailedContent(product, carrierName) {
  const fromMeta = parseDetailedContentByCarrier(
    product?.detailed_content_by_carrier,
  );

  if (fromMeta && Object.keys(fromMeta).length > 0) {
    const matched = findCarrierKeyedValue(fromMeta, carrierName);
    if (matched) return matched;
    if (fromMeta.default) return fromMeta.default;
    if (fromMeta._default) return fromMeta._default;
    const sole = soleCarrierFallback(fromMeta, carrierName);
    if (sole) return sole;
  }

  return product?.detailed_content || "";
}
