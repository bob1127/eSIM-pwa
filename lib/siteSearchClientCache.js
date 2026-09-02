import {
  compareSearchResults,
  searchInstantSite,
} from "./siteSearch";

let products = null;
let loadPromise = null;

/** 預載商品索引，Navbar mount 時呼叫 */
export function prefetchSiteSearchIndex() {
  if (products?.length) return Promise.resolve(products);
  if (loadPromise) return loadPromise;

  loadPromise = fetch("/api/site-search-index/")
    .then((r) => r.json())
    .then((data) => {
      products = Array.isArray(data.products) ? data.products : [];
      return products;
    })
    .catch(() => {
      products = products || [];
      return products;
    })
    .finally(() => {
      if (!products?.length) loadPromise = null;
    });

  return loadPromise;
}

export function hasSiteSearchIndex() {
  return Array.isArray(products) && products.length > 0;
}

/** 本機即時搜尋（商品 + 靜態頁，不含文章） */
export function searchInstantLocal(query, { limit = 20 } = {}) {
  const q = String(query || "").trim();
  if (!q) return [];
  return searchInstantSite(q, products || [], { limit });
}

/** 合併 API 結果與本機快取（以 id 去重，保留較高分） */
export function mergeSearchResults(apiResults, localResults, { limit = 20 } = {}) {
  const byId = new Map();
  for (const item of [...(apiResults || []), ...(localResults || [])]) {
    if (!item?.id) continue;
    const prev = byId.get(item.id);
    if (!prev || (item.score || 0) > (prev.score || 0)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort(compareSearchResults).slice(0, limit);
}
