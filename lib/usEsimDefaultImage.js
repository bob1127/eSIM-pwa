/** 美國／美加／北美 eSIM 預設首圖 */
export const US_ESIM_DEFAULT_IMAGE = "/images/美國esim.png";

const US_CATEGORY_HANDLES = new Set([
  "usa",
  "us-canada",
  "us-ca",
  "north-america",
  "america",
]);

export function isUsEsimCategory(handle) {
  const h = String(handle || "")
    .trim()
    .toLowerCase();
  return Boolean(h) && US_CATEGORY_HANDLES.has(h);
}

export function isUsEsimProduct({ categorySlug, handle } = {}) {
  if (isUsEsimCategory(categorySlug)) return true;
  const h = String(handle || "")
    .trim()
    .toLowerCase();
  if (!h) return false;
  return (
    /^(usa|us-canada|north-america)(-|$)/i.test(h) ||
    /usa-mainland|us-canada|north-america/i.test(h)
  );
}

/** 美國相關商品一律先用預設首圖 */
export function withUsEsimDefaultImage(imageUrl, ctx = {}) {
  if (isUsEsimProduct(ctx)) return US_ESIM_DEFAULT_IMAGE;
  return imageUrl || null;
}
