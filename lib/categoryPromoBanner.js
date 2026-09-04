/**
 * Medusa product category metadata → 前台促銷卡
 *
 * metadata keys（Medusa 後台「分類促銷卡」widget 寫入）：
 * - promo_enabled
 * - promo_badge
 * - promo_title
 * - promo_description
 * - promo_discount_code
 * - promo_cta_label
 * - promo_cta_href
 */

/**
 * @typedef {Object} CategoryPromoBanner
 * @property {boolean} enabled
 * @property {string} badge
 * @property {string} title
 * @property {string} description
 * @property {string} discountCode
 * @property {string} ctaLabel
 * @property {string} ctaHref
 */

/**
 * @param {Record<string, unknown>|null|undefined} metadata
 * @param {{ handle?: string, name?: string }=} category
 * @returns {CategoryPromoBanner|null}
 */
export function parseCategoryPromoBanner(metadata, category = {}) {
  if (!metadata || typeof metadata !== "object") return null;

  const enabled = Boolean(metadata.promo_enabled);
  const title = String(metadata.promo_title || "").trim();
  const description = String(metadata.promo_description || "").trim();
  const discountCode = String(metadata.promo_discount_code || "")
    .trim()
    .toUpperCase();

  if (!enabled) return null;
  if (!title && !description && !discountCode) return null;

  const handle = String(category.handle || "")
    .replace(/^\/+|\/+$/g, "")
    .trim();
  const defaultHref = handle ? `/product/${handle}` : "/product";

  return {
    enabled: true,
    badge: String(metadata.promo_badge || "獨家優惠").trim() || "獨家優惠",
    title:
      title ||
      (category.name ? `${category.name} eSIM 方案` : "eSIM 優惠方案"),
    description,
    discountCode,
    ctaLabel:
      String(metadata.promo_cta_label || "").trim() || "立即前往購買",
    ctaHref: String(metadata.promo_cta_href || "").trim() || defaultHref,
  };
}

/**
 * 依國家中文名或 handle 從 Medusa 取促銷卡（SSR / getStaticProps）
 * @param {{ countryName?: string|null, handle?: string|null }} opts
 * @returns {Promise<CategoryPromoBanner|null>}
 */
export async function fetchCategoryPromoBanner({
  countryName = null,
  handle = null,
} = {}) {
  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  const headers = {
    "Content-Type": "application/json",
    ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
  };

  try {
    let category = null;

    if (handle) {
      const url = `${backendUrl}/store/product-categories?handle=${encodeURIComponent(handle)}&fields=%2Bmetadata`;
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = await res.json();
        category = data.product_categories?.[0] || null;
      }
    }

    if (!category && countryName) {
      const name = String(countryName).trim();
      const res = await fetch(
        `${backendUrl}/store/product-categories?limit=200&fields=%2Bmetadata`,
        { headers, signal: AbortSignal.timeout(12_000) },
      );
      if (res.ok) {
        const data = await res.json();
        const cats = data.product_categories || [];
        category =
          cats.find((c) => c.name === name) ||
          cats.find((c) => String(c.name || "").includes(name)) ||
          null;
      }
    }

    if (!category) return null;
    return parseCategoryPromoBanner(category.metadata, {
      handle: category.handle,
      name: category.name,
    });
  } catch {
    return null;
  }
}
