import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
  partnerProductPath,
} from "@/lib/partnerStorefront";
import { fetchPartnerBlogPosts } from "@/lib/partnerBlog";
import {
  SEARCH_SOURCE,
  stripHtml,
  scoreFields,
  scoreMatch,
  compareSearchResults,
} from "@/lib/siteSearch";

/**
 * GET /api/partner/site-search?domain=&q=
 * 只搜該夥伴賣場的方案、文章與站內頁，不含主站全站索引
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const domain = String(req.query.domain || "")
    .trim()
    .toLowerCase();
  const q = String(req.query.q || "").trim().slice(0, 80);
  if (!domain) {
    return res.status(400).json({ error: "domain required", results: [] });
  }
  if (q.length < 1) {
    return res.status(200).json({ q: "", results: [], groups: {} });
  }

  try {
    const store = await fetchActiveStoreByDomain(domain);
    if (!store) {
      return res.status(404).json({ error: "store not found", results: [] });
    }

    const base = `/p/${store.domain}`;
    const [products, posts] = await Promise.all([
      fetchStoreProductsForStorefront(store).catch(() => []),
      fetchPartnerBlogPosts({ store, perPage: 40, allowDemo: false }).catch(
        () => [],
      ),
    ]);

    const productHits = (products || [])
      .map((p) => {
        const title = p.name || p.handle || "";
        const handle = p.handle || "";
        const desc = stripHtml(p.description || "").slice(0, 160);
        const country = p.countryLabel || "";
        const score = Math.max(
          scoreFields(
            { title, keywords: `${handle} ${country}`, excerpt: desc },
            q,
          ),
          scoreMatch(`${title} ${handle} ${country} ${desc}`, q),
        );
        if (!score) return null;
        return {
          id: `p-product-${p.id || handle}`,
          title: title || handle,
          href: partnerProductPath(store.domain, p),
          excerpt: desc || (country ? `${country} eSIM` : ""),
          source: SEARCH_SOURCE.product.key,
          sourceLabel: "方案",
          image: p.image || null,
          score,
        };
      })
      .filter(Boolean);

    const articleHits = (posts || [])
      .map((p) => {
        const title = p.title || "";
        const excerpt = String(p.excerpt || "").slice(0, 120);
        const slug = p.slug || "";
        const tags = Array.isArray(p.tags) ? p.tags.join(" ") : "";
        const score = scoreFields(
          {
            title,
            keywords: `${slug} ${p.categoryLabel || ""} ${tags}`,
            excerpt,
          },
          q,
        );
        if (!score) return null;
        return {
          id: `p-article-${p.partnerId || slug}`,
          title,
          href: slug ? `${base}/blog/${encodeURIComponent(slug)}/` : `${base}/blog/`,
          excerpt,
          source: SEARCH_SOURCE.article.key,
          sourceLabel: "文章",
          image: p.image || null,
          score,
        };
      })
      .filter(Boolean);

    const pages = [
      {
        title: store.store_name || "賣場首頁",
        href: `${base}/`,
        excerpt: stripHtml(store.description || "本店首頁").slice(0, 120),
        keywords: "首頁 賣場 商店 關於",
      },
      {
        title: "選購方案",
        href: `${base}/#plans`,
        excerpt: "瀏覽本店 eSIM 方案",
        keywords: "方案 商品 eSIM 選購",
      },
      {
        title: "旅遊文章",
        href: `${base}/blog/`,
        excerpt: "本店旅遊與 eSIM 文章",
        keywords: "文章 部落格 blog",
      },
      {
        title: "安裝教學",
        href: `${base}/tutorial/`,
        excerpt: "eSIM 安裝與設定說明",
        keywords: "教學 安裝 設定 tutorial",
      },
      {
        title: "會員中心",
        href: `${base}/account/`,
        excerpt: "訂單與會員資料",
        keywords: "會員 訂單 帳號",
      },
    ]
      .map((page) => {
        const score = scoreFields(
          { title: page.title, keywords: page.keywords, excerpt: page.excerpt },
          q,
        );
        if (!score) return null;
        return {
          id: `p-page-${page.href}`,
          title: page.title,
          href: page.href,
          excerpt: page.excerpt,
          source: SEARCH_SOURCE.page.key,
          sourceLabel: "頁面",
          image: null,
          score,
        };
      })
      .filter(Boolean);

    const results = [...productHits, ...articleHits, ...pages]
      .sort(compareSearchResults)
      .slice(0, 20);

    const groups = {
      product: results.filter((r) => r.source === "product"),
      article: results.filter((r) => r.source === "article"),
      page: results.filter((r) => r.source === "page"),
    };

    res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=60");
    return res.status(200).json({ q, domain: store.domain, results, groups });
  } catch (err) {
    console.error("[partner/site-search]", err);
    return res.status(500).json({ error: err.message || "搜尋失敗", results: [] });
  }
}
