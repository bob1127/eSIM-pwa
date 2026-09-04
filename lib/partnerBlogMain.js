/**
 * 主站部落格 ↔ 夥伴供稿（SEO 折衷）
 * - 正本 URL：/blog/{slug}
 * - 夥伴店可顯示全文，但 canonical 指向主站
 */
import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
  getPartnerStorefrontDb,
} from "@/lib/partnerStorefront";
import {
  fetchPartnerBlogPosts,
  normalizeStoreBlogRow,
  stripHtml,
  stripWpReadMore,
} from "@/lib/partnerBlog";
import {
  mergeBlogCms,
  resolveFeaturedProduct,
} from "@/lib/partnerBlogCms";

function toJson(value) {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value));
}

/**
 * 轉成主站 blog/[slug] 可用的 WP-like shape
 */
export function toMainBlogPostShape(row, store = null) {
  const storeMeta = store || row.stores || null;
  const normalized = normalizeStoreBlogRow(row, storeMeta);
  if (!normalized) return null;
  const storeName = store?.store_name || row.stores?.store_name || null;
  const domain = store?.domain || row.stores?.domain || null;
  const dateIso =
    row.published_at || row.created_at || normalized.dateIso || new Date().toISOString();
  const liveAuthor =
    storeName ||
    store?.footer_company_name ||
    row.stores?.footer_company_name ||
    normalized.authorName;

  return {
    id: normalized.id,
    slug: normalized.slug,
    date: dateIso,
    modified: row.updated_at || dateIso,
    title: { rendered: stripWpReadMore(normalized.title) },
    excerpt: { rendered: stripWpReadMore(normalized.excerpt || "") },
    content: { rendered: stripWpReadMore(normalized.contentHtml || "") },
    featured_media: 0,
    _embedded: normalized.image
      ? {
          "wp:featuredmedia": [{ source_url: normalized.image }],
        }
      : undefined,
    partnerContribution: true,
    partnerStoreName: storeName,
    partnerStoreDomain: domain,
    partnerAuthorName: liveAuthor,
    partnerStoreLogo: store?.logo_url || storeMeta?.logo_url || null,
    yoast_head_json: {
      title: normalized.ogTitle || undefined,
      description: normalized.metaDescription || undefined,
      og_image: normalized.ogImage ? [{ url: normalized.ogImage }] : undefined,
    },
    meta: {
      jeko_description: normalized.metaDescription || "",
      jeko_keywords: normalized.metaKeywords || "",
    },
  };
}

export async function fetchPublishedPartnerPostBySlugForMain(slug) {
  const key = String(slug || "").trim();
  if (!key) return null;
  const db = getPartnerStorefrontDb();
  if (!db) return null;

  const { data, error } = await db
    .from("store_blog_posts")
    .select("*, stores ( id, store_name, domain, logo_url, blog_custom_enabled, status )")
    .eq("slug", key)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5);

  if (error) {
    if (/store_blog_posts|schema cache/i.test(error.message || "")) return null;
    console.error("[fetchPublishedPartnerPostBySlugForMain]", error.message);
    return null;
  }

  const row = (data || []).find(
    (r) =>
      r.stores?.status === "active" &&
      r.stores?.blog_custom_enabled === true,
  );
  if (!row) return null;
  return toMainBlogPostShape(row, row.stores);
}

/**
 * 主站內頁：完整夥伴文章（區塊排版）+ 店舖／商品，與 /p/{domain}/blog 同一套畫面
 */
export async function fetchPublishedPartnerArticleBundleForMain(slug) {
  const key = String(slug || "").trim();
  if (!key) return null;
  const db = getPartnerStorefrontDb();
  if (!db) return null;

  const { data, error } = await db
    .from("store_blog_posts")
    .select("*, stores ( id, store_name, domain, logo_url, blog_custom_enabled, status )")
    .eq("slug", key)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5);

  if (error) {
    if (/store_blog_posts|schema cache/i.test(error.message || "")) return null;
    console.error("[fetchPublishedPartnerArticleBundleForMain]", error.message);
    return null;
  }

  const row = (data || []).find(
    (r) =>
      r.stores?.status === "active" &&
      r.stores?.blog_custom_enabled === true,
  );
  if (!row?.stores?.domain) return null;

  const store = await fetchActiveStoreByDomain(row.stores.domain);
  if (!store) return null;

  const post = normalizeStoreBlogRow(row, store);
  if (!post) return null;

  const [products, allPosts] = await Promise.all([
    fetchStoreProductsForStorefront(store),
    fetchPartnerBlogPosts({ store, perPage: 30, allowDemo: false }),
  ]);
  const latestPosts = (allPosts || []).filter((p) => p.slug !== post.slug);
  const relatedPosts = latestPosts.slice(0, 6);
  const blogCms = mergeBlogCms(store.blog_cms);
  const pickupProduct = resolveFeaturedProduct(products, blogCms);
  const wpPost = toMainBlogPostShape(row, store);

  return {
    wpPost,
    store: toJson(store),
    post: toJson(post),
    relatedPosts: toJson(relatedPosts) || [],
    latestPosts: toJson(latestPosts) || [],
    prevPost: relatedPosts[0] ? toJson(relatedPosts[0]) : null,
    products: toJson(products) || [],
    blogCms: toJson(blogCms),
    pickupProduct: pickupProduct ? toJson(pickupProduct) : null,
  };
}

export async function fetchAllPublishedPartnerPostsForMain({ limit = 100 } = {}) {
  const db = getPartnerStorefrontDb();
  if (!db) return [];

  const { data, error } = await db
    .from("store_blog_posts")
    .select("*, stores ( id, store_name, domain, logo_url, blog_custom_enabled, status )")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(Math.min(Number(limit) || 100, 200));

  if (error) {
    if (/store_blog_posts|schema cache/i.test(error.message || "")) return [];
    console.error("[fetchAllPublishedPartnerPostsForMain]", error.message);
    return [];
  }

  const bySlug = new Map();
  for (const row of data || []) {
    if (row.stores?.status !== "active" || !row.stores?.blog_custom_enabled) {
      continue;
    }
    if (!row.slug || bySlug.has(row.slug)) continue;
    const shaped = toMainBlogPostShape(row, row.stores);
    if (shaped) bySlug.set(row.slug, shaped);
  }
  return Array.from(bySlug.values());
}

export async function fetchPublishedPartnerArticlePaths({ limit = 200 } = {}) {
  const db = getPartnerStorefrontDb();
  if (!db) return [];

  const { data, error } = await db
    .from("store_blog_posts")
    .select("slug, stores ( domain, blog_custom_enabled, status )")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(Math.min(Number(limit) || 200, 400));

  if (error) {
    if (/store_blog_posts|schema cache/i.test(error.message || "")) return [];
    console.error("[fetchPublishedPartnerArticlePaths]", error.message);
    return [];
  }

  const out = [];
  const seen = new Set();
  for (const row of data || []) {
    if (row.stores?.status !== "active" || !row.stores?.blog_custom_enabled) {
      continue;
    }
    const domain = String(row.stores.domain || "")
      .trim()
      .toLowerCase();
    const slug = String(row.slug || "").trim();
    if (!domain || !slug) continue;
    const key = `${domain}/${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ partnerSlug: domain, slug });
  }
  return out;
}

/** 主站列表卡用 */
export function toMainBlogListCard(shaped) {
  if (!shaped) return null;
  const dateObj = new Date(shaped.date);
  const postDate = Number.isNaN(dateObj.getTime())
    ? ""
    : `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, "0")}.${String(dateObj.getDate()).padStart(2, "0")}`;
  const image =
    shaped._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
    "/images/blog/TAIWAN__thumb-_20250304.webp";
  const title =
    typeof shaped.title === "string"
      ? shaped.title
      : shaped.title?.rendered || "";
  const excerptHtml =
    typeof shaped.excerpt === "string"
      ? shaped.excerpt
      : shaped.excerpt?.rendered || "";
  const plain = stripHtml(excerptHtml);

  const rawTags = Array.isArray(shaped.tags)
    ? shaped.tags.map((t) => String(t || "").trim()).filter(Boolean)
    : [];
  const categoryLabel = String(shaped.categoryLabel || "").trim() || null;
  const genericLoc = new Set([
    "旅遊",
    "TRAVEL",
    "Travel",
    "travel",
    "eSIM",
    "攻略",
    "最新消息",
    "合作夥伴供稿",
  ]);
  const location =
    rawTags.find((t) => !genericLoc.has(t)) ||
    (categoryLabel && !genericLoc.has(categoryLabel) ? categoryLabel : null) ||
    null;

  return {
    id: String(shaped.id),
    date: postDate,
    title,
    excerptHTML: stripWpReadMore(excerptHtml),
    plainExcerpt: plain.slice(0, 160),
    rawContent:
      typeof shaped.content === "string"
        ? shaped.content
        : shaped.content?.rendered || "",
    image,
    slug: shaped.slug,
    tags: rawTags.length ? rawTags : ["合作夥伴供稿"],
    subCategories: ["合作夥伴供稿"],
    categoryLabel,
    location,
    country: location,
    partnerContribution: true,
    partnerStoreName: shaped.partnerStoreName || null,
    partnerAuthorName: shaped.partnerAuthorName || null,
    authorName:
      shaped.partnerStoreName ||
      shaped.partnerAuthorName ||
      "合作夥伴",
    authorAvatar: shaped.partnerStoreLogo || "/images/Logo/icon-192.png",
  };
}
