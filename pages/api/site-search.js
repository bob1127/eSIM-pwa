import { searchWpPosts } from "../../lib/wordpress";
import { getSiteSearchProducts } from "../../lib/siteSearchProductCache";
import {
  SEARCH_SOURCE,
  searchStaticEntries,
  stripHtml,
  scoreFields,
  scoreMatch,
  searchProductSummaries,
  compareSearchResults,
} from "../../lib/siteSearch";

export const config = {
  api: { externalResolver: true },
};

const WP_SEARCH_TIMEOUT_MS =
  Number(process.env.SITE_SEARCH_WP_TIMEOUT_MS) || 400;

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

function searchArticlesWithTimeout(query) {
  return Promise.race([
    searchWpPosts(query, { per_page: 6, embed: false })
      .then((posts) => mapArticles(posts, query, 6))
      .catch(() => []),
    new Promise((resolve) => {
      setTimeout(() => resolve([]), WP_SEARCH_TIMEOUT_MS);
    }),
  ]);
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
    const [productList, articles] = await Promise.all([
      getSiteSearchProducts(),
      searchArticlesWithTimeout(q),
    ]);

    const products = searchProductSummaries(productList, q, 8);
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
