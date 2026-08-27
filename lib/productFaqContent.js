/** Medusa metadata：依電信商儲存常見問題 HTML */

import { soleCarrierFallback } from "./productCarrierMetaFallback";

export const FAQ_CONTENT_METADATA_KEY = "faq_content_by_carrier";

export function parseFaqContentByCarrier(raw) {
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

export function resolveFaqContent(product, carrierName) {
  const fromMeta = parseFaqContentByCarrier(product?.faq_content_by_carrier);

  if (fromMeta && Object.keys(fromMeta).length > 0) {
    const matched = findCarrierEntry(fromMeta, carrierName);
    if (matched) return matched;
    if (fromMeta.default) return fromMeta.default;
    if (fromMeta._default) return fromMeta._default;
    const sole = soleCarrierFallback(fromMeta, carrierName);
    if (sole) return sole;
  }

  return product?.faq_content || "";
}

function stripFaqText(html) {
  if (!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 從 jeko FAQ accordion HTML 抽出 Q&A（供 FAQPage JSON-LD / GEO）
 * 結構：.jeko-faq-trigger + .jeko-faq-panel
 */
export function extractFaqsFromJekoHtml(html, { limit = 12 } = {}) {
  if (!html) return [];
  const faqs = [];
  const itemRe =
    /<div[^>]*class="[^"]*jeko-faq-item[^"]*"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*jeko-faq-trigger[^"]*"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h3>[\s\S]*?<div[^>]*class="[^"]*jeko-faq-panel[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;

  let m;
  while ((m = itemRe.exec(html)) && faqs.length < limit) {
    const question = stripFaqText(m[1]);
    const answer = stripFaqText(m[2]);
    if (question && answer && answer.length > 8) {
      faqs.push({
        question,
        answer: answer.slice(0, 600),
      });
    }
  }
  return faqs;
}

/**
 * 彙整商品所有電信商 FAQ HTML → 去重 Q&A（優先真實 accordion 內容）
 */
export function collectProductFaqItems(product, { limit = 12 } = {}) {
  const map = parseFaqContentByCarrier(product?.faq_content_by_carrier);
  const htmlChunks = [
    ...Object.values(map),
    product?.faq_content ? String(product.faq_content) : "",
  ].filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const html of htmlChunks) {
    for (const faq of extractFaqsFromJekoHtml(html, { limit })) {
      const key = faq.question.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(faq);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
