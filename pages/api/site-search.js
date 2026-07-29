import { searchWpPosts } from "../../lib/wordpress";
import { fetchMedusaStoreProductSummaries } from "../../lib/medusaStoreApi";
import {
  SEARCH_SOURCE,
  searchStaticEntries,
  stripHtml,
  scoreFields,
  scoreMatch,
  buildProductHref,
  compareSearchResults,
} from "../../lib/siteSearch";

export const config = {
  api: { externalResolver: true },
};

const PRODUCT_CACHE_MS =
  Number(process.env.SITE_SEARCH_PRODUCT_CACHE_MS) || 5 * 60 * 1000;
let productCache = { at: 0, items: null };
let productInFlight = null;

async function getProductSummaries() {
  const now = Date.now();
  if (productCache.items && now - productCache.at < PRODUCT_CACHE_MS) {
    return productCache.items;
  }
  if (productInFlight) return productInFlight;

  productInFlight = (async () => {
    try {
      const items = await fetchMedusaStoreProductSummaries();
      productCache = { at: Date.now(), items: items || [] };
      return productCache.items;
    } catch (err) {
      console.error("[site-search] products", err?.message || err);
      return productCache.items || [];
    } finally {
      productInFlight = null;
    }
  })();

  return productInFlight;
}

function searchProducts(products, query, limit = 8) {
  const q = String(query || "").trim();
  if (!q) return [];

  return (products || [])
    .map((p) => {
      const title = p.title || p.name || "";
      const handle = p.handle || "";
      const desc = stripHtml(p.description || "").slice(0, 160);
      const score = Math.max(
        scoreFields({ title, keywords: handle, excerpt: desc }, q),
        scoreMatch(`${title} ${handle} ${desc}`, q),
      );
      if (!score) return null;
      return {
        id: `product-${p.id || p.medusa_product_id || handle}`,
        title: title || handle,
        href: buildProductHref(p),
        excerpt: desc,
        source: SEARCH_SOURCE.product.key,
        sourceLabel: SEARCH_SOURCE.product.label,
        image: p.thumbnail || p.image_url || null,
        score,
      };
    })
    .filter(Boolean)
    .sort(compareSearchResults)
    .slice(0, limit);
}

function mapArticles(posts, query, limit = 6) {
  const q = String(query || "").trim();
  return (posts || [])
    .map((p) => {
      const title = stripHtml(p.title?.rendered || p.title || "未命名文章");
      const excerpt = stripHtml(p.excerpt?.rendered || p.excerpt || "").slice(
        0,
        120,
      );
      const slug = p.slug || "";
      const score =
        scoreFields({ title, keywords: slug, excerpt }, q) ||
        (q ? 35 : 0);
      if (!score) return null;
      return {
        id: `article-${p.id || slug}`,
        title,
        href: slug ? `/blog/${encodeURIComponent(slug)}` : "/blog",
        excerpt,
        source: SEARCH_SOURCE.article.key,
        sourceLabel: SEARCH_SOURCE.article.label,
        image: null,
        score,
      };
    })
    .filter(Boolean)
    .sort(compareSearchResults)
    .slice(0, limit);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const q = String(req.query.q || "").trim().slice(0, 80);
  if (q.length < 1) {
    return res.status(200).json({ q: "", results: [], groups: {} });
  }

  try {
    const [products, articles] = await Promise.all([
      getProductSummaries().then((list) => searchProducts(list, q, 8)),
      searchWpPosts(q, { per_page: 6, embed: false })
        .then((posts) => mapArticles(posts, q, 6))
        .catch(() => []),
    ]);

    const staticHits = searchStaticEntries(q, { limit: 10 });

    const results = [...products, ...articles, ...staticHits]
      .sort(compareSearchResults)
      .slice(0, 20);

    const groups = {
      product: results.filter((r) => r.source === "product"),
      article: results.filter((r) => r.source === "article"),
      legal: results.filter((r) =>
        ["terms", "privacy", "refund"].includes(r.source),
      ),
      page: results.filter((r) => r.source === "page"),
    };

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=120",
    );
    return res.status(200).json({ q, results, groups });
  } catch (err) {
    console.error("[site-search]", err);
    return res.status(500).json({ error: err.message || "搜尋失敗" });
  }
}
