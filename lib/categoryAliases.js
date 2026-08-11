/**
 * 分類 handle 別名（歷史拼字／短碼 → 正規 handle）
 * 泰國曾誤建為 "tailand"，商品與導航需雙向相容。
 */
const ALIAS_TO_CANONICAL = {
  th: "thailand",
  thai: "thailand",
  tailand: "thailand",
  jp: "japan",
  kr: "korea",
  cn: "china",
  hk: "hongkong",
  "hong-kong": "hongkong",
  tw: "taiwan",
  sg: "singapore",
  my: "malaysia",
  vn: "vietnam",
};

/** 同一目的地可能同時存在的 Medusa handles（查商品時合併） */
const PRODUCT_FETCH_HANDLES = {
  thailand: ["thailand", "tailand"],
  tailand: ["thailand", "tailand"],
};

export function canonicalCategoryHandle(handle) {
  const h = String(handle || "")
    .trim()
    .toLowerCase();
  if (!h) return h;
  return ALIAS_TO_CANONICAL[h] || h;
}

/** 查分類商品時應一併查詢的 handles（含歷史 typo） */
export function categoryHandlesForProductFetch(handle) {
  const h = String(handle || "")
    .trim()
    .toLowerCase();
  return PRODUCT_FETCH_HANDLES[h] || [h];
}

/**
 * 下拉／導航去重：同名或別名只保留正規 handle
 *（例如 泰國：優先 thailand，隱藏 tailand）
 */
export function dedupeCategoriesForNav(categories = []) {
  const byCanonical = new Map();
  for (const cat of categories) {
    const slug = String(cat.slug || cat.handle || "").toLowerCase();
    const canonical = canonicalCategoryHandle(slug);
    const existing = byCanonical.get(canonical);
    if (!existing) {
      byCanonical.set(canonical, {
        ...cat,
        slug: canonical,
        handle: canonical,
      });
      continue;
    }
    // 已有別名條目時，若當前是正規 handle 則覆蓋
    if (slug === canonical) {
      byCanonical.set(canonical, {
        ...cat,
        slug: canonical,
        handle: canonical,
      });
    }
  }
  return [...byCanonical.values()];
}
