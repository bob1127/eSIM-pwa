import { SITE_URL, PAGE_SEO } from "../lib/seo.config";
import { filterLeafCategoriesForNav } from "../lib/categoryNavFilter";

const getMedusaHeaders = () => {
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  return {
    "Content-Type": "application/json",
    ...(publishableKey && { "x-publishable-api-key": publishableKey }),
  };
};

const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

function urlEntry(loc, { changefreq = "weekly", priority = "0.7", lastmod } = {}) {
  const lastmodTag = lastmod
    ? `\n    <lastmod>${lastmod}</lastmod>`
    : "";
  return `  <url>
    <loc>${loc}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export default function Sitemap() {}

export async function getServerSideProps({ res }) {
  const staticPaths = Object.keys(PAGE_SEO).filter(
    (p) => !PAGE_SEO[p]?.robots?.includes("noindex"),
  );

  const urls = [
    urlEntry(SITE_URL, { changefreq: "daily", priority: "1.0" }),
    ...staticPaths.map((path) => {
      const priority =
        path === "/" ? "1.0" : path.startsWith("/product") ? "0.9" : "0.8";
      return urlEntry(`${SITE_URL}${path}`, { priority });
    }),
  ];

  // Medusa 分類與商品
  try {
    const headers = getMedusaHeaders();
    const catRes = await fetch(`${backendUrl}/store/product-categories`, {
      headers,
    });
    if (catRes.ok) {
      const { product_categories = [] } = await catRes.json();
      for (const cat of filterLeafCategoriesForNav(product_categories)) {
        if (!cat?.handle) continue;
        urls.push(
          urlEntry(`${SITE_URL}/product/${cat.handle}`, {
            changefreq: "daily",
            priority: "0.85",
          }),
        );

        const prodRes = await fetch(
          `${backendUrl}/store/products?category_id[]=${cat.id}&limit=100`,
          { headers },
        );
        if (prodRes.ok) {
          const { products = [] } = await prodRes.json();
          for (const p of products) {
            if (!p?.handle) continue;
            urls.push(
              urlEntry(`${SITE_URL}/product/${cat.handle}/${p.handle}`, {
                changefreq: "weekly",
                priority: "0.8",
              }),
            );
          }
        }
      }
    }
  } catch {
    // sitemap 仍輸出靜態路徑
  }

  // 商城實體商品（/shop 已在 PAGE_SEO；補 /shop/product/{handle}）
  try {
    const { listShopProductHandles } = await import("../lib/shopSelections");
    const handles = await listShopProductHandles({ limit: 100 });
    for (const handle of handles) {
      if (!handle) continue;
      urls.push(
        urlEntry(`${SITE_URL}/shop/product/${handle}`, {
          changefreq: "weekly",
          priority: "0.75",
        }),
      );
    }
  } catch {
    // 略過
  }

  // WordPress 部落格文章
  try {
    const wpRes = await fetch(
      `${SITE_URL}/api/wordpress/posts?per_page=100`,
    ).catch(() => null);
    if (wpRes?.ok) {
      const posts = await wpRes.json();
      const list = Array.isArray(posts) ? posts : posts?.posts || [];
      for (const post of list) {
        if (!post?.slug) continue;
        urls.push(
          urlEntry(`${SITE_URL}/blog/${post.slug}`, {
            changefreq: "monthly",
            priority: "0.75",
            lastmod: post.modified || post.date,
          }),
        );
      }
    }
  } catch {
    // 略過
  }

  // 夥伴供稿（正本在主站 /blog/{slug}；已存在於 WP 的 slug 不重複）
  try {
    const existingBlogLocs = new Set(
      urls
        .map((u) => {
          const m = String(u).match(/<loc>([^<]+)<\/loc>/);
          return m?.[1];
        })
        .filter(Boolean),
    );
    const {
      fetchAllPublishedPartnerPostsForMain,
      fetchPublishedPartnerArticlePaths,
    } = await import("../lib/partnerBlogMain");
    const partnerPosts = await fetchAllPublishedPartnerPostsForMain({
      limit: 100,
    });
    for (const post of partnerPosts) {
      if (!post?.slug) continue;
      const loc = `${SITE_URL}/blog/${post.slug}`;
      if (existingBlogLocs.has(loc)) continue;
      urls.push(
        urlEntry(loc, {
          changefreq: "monthly",
          priority: "0.72",
          lastmod: post.modified || post.date,
        }),
      );
    }
    const partnerPaths = await fetchPublishedPartnerArticlePaths({ limit: 200 });
    for (const p of partnerPaths) {
      urls.push(
        urlEntry(`${SITE_URL}/p/${p.partnerSlug}/blog/${p.slug}/`, {
          changefreq: "monthly",
          priority: "0.55",
        }),
      );
    }
  } catch {
    // 略過
  }

  // 官方授權夥伴賣場（與主站 SEO 互聯：可索引公開頁）
  try {
    const { getPartnerStorefrontDb } = await import("../lib/partnerStorefront");
    const db = getPartnerStorefrontDb();
    if (db) {
      const { data: stores } = await db
        .from("stores")
        .select("domain, updated_at, store_name")
        .eq("status", "active")
        .not("domain", "is", null)
        .limit(200);
      for (const s of stores || []) {
        const d = String(s.domain || "")
          .trim()
          .toLowerCase();
        if (!d) continue;
        const lastmod = s.updated_at || undefined;
        urls.push(
          urlEntry(`${SITE_URL}/p/${d}/`, {
            changefreq: "daily",
            priority: "0.8",
            lastmod,
          }),
        );
        urls.push(
          urlEntry(`${SITE_URL}/p/${d}/blog/`, {
            changefreq: "weekly",
            priority: "0.65",
            lastmod,
          }),
        );
        urls.push(
          urlEntry(`${SITE_URL}/p/${d}/tutorial/`, {
            changefreq: "monthly",
            priority: "0.55",
            lastmod,
          }),
        );
      }
    }
  } catch {
    // 略過
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "text/xml");
  res.write(xml);
  res.end();

  return { props: {} };
}
