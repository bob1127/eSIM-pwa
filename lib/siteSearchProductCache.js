import { fetchMedusaSearchProductIndex } from "./medusaStoreApi";

const CACHE_MS =
  Number(process.env.SITE_SEARCH_PRODUCT_CACHE_MS) || 5 * 60 * 1000;

let cache = { at: 0, items: null };
let inFlight = null;

/** 伺服器端：輕量商品索引（site-search + site-search-index 共用） */
export async function getSiteSearchProducts() {
  const now = Date.now();
  if (cache.items && now - cache.at < CACHE_MS) {
    return cache.items;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const items = await fetchMedusaSearchProductIndex();
      cache = { at: Date.now(), items: items || [] };
      return cache.items;
    } catch (err) {
      console.error("[site-search] products", err?.message || err);
      return cache.items || [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
