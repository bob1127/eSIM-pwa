/**
 * 主站部落格 ↔ 夥伴供稿（SEO 折衷）
 * - 正本 URL：/blog/{slug}
 * - 夥伴店可顯示全文，但 canonical 指向主站
 */
import { getPartnerStorefrontDb } from "@/lib/partnerStorefront";
import { normalizeStoreBlogRow } from "@/lib/partnerBlog";

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

  return {
    id: normalized.id,
    slug: normalized.slug,
    date: dateIso,
    modified: row.updated_at || dateIso,
    title: { rendered: normalized.title },
    excerpt: { rendered: normalized.excerpt || "" },
    content: { rendered: normalized.contentHtml || "" },
    featured_media: 0,
    _embedded: normalized.image
      ? {
          "wp:featuredmedia": [{ source_url: normalized.image }],
        }
      : undefined,
    partnerContribution: true,
    partnerStoreName: storeName,
    partnerStoreDomain: domain,
    partnerAuthorName: normalized.authorName,
    yoast_head_json: {},
    meta: {},
  };
}

export async function fetchPublishedPartnerPostBySlugForMain(slug) {
  const key = String(slug || "").trim();
  if (!key) return null;
  const db = getPartnerStorefrontDb();
  if (!db) return null;

  const { data, error } = await db
    .from("store_blog_posts")
    .select("*, stores ( id, store_name, domain, blog_custom_enabled, status )")
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

export async function fetchAllPublishedPartnerPostsForMain({ limit = 100 } = {}) {
  const db = getPartnerStorefrontDb();
  if (!db) return [];

  const { data, error } = await db
    .from("store_blog_posts")
    .select("*, stores ( id, store_name, domain, blog_custom_enabled, status )")
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
  const plain = String(excerptHtml)
    .replace(/<[^>]*>?/gm, "")
    .replace(/&#\d+;/gm, "")
    .trim();

  return {
    id: String(shaped.id),
    date: postDate,
    title,
    excerptHTML: excerptHtml,
    plainExcerpt: plain.slice(0, 160),
    rawContent:
      typeof shaped.content === "string"
        ? shaped.content
        : shaped.content?.rendered || "",
    image,
    slug: shaped.slug,
    tags: ["合作夥伴供稿"],
    subCategories: ["合作夥伴供稿"],
    country: null,
    partnerContribution: true,
    partnerStoreName: shaped.partnerStoreName || null,
  };
}
