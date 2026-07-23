/**
 * 夥伴賣場 Blog
 * - 預設：主站 WordPress
 * - 加值（stores.blog_custom_enabled）：合併該賣場 store_blog_posts
 */
import {
  fetchWpPostBySlug,
  fetchWpPosts,
  normalizeWpAssetUrl,
} from "@/lib/wordpress";
import { getPartnerStorefrontDb } from "@/lib/partnerStorefront";

export function formatPartnerBlogDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]*>?/gm, "")
    .replace(/&#\d+;/gm, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

export function extractFeatureImage(post) {
  const embedded =
    post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
  if (embedded) return normalizeWpAssetUrl(embedded);
  const content = post?.content?.rendered || "";
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? normalizeWpAssetUrl(match[1]) : null;
}

export function extractCategoryNames(post) {
  const terms = post?._embedded?.["wp:term"] || [];
  const cats = terms.flat().filter((t) => t?.taxonomy === "category");
  return cats.map((c) => c.name).filter(Boolean);
}

export function extractTagNames(post) {
  const terms = post?._embedded?.["wp:term"] || [];
  const tags = terms.flat().filter((t) => t?.taxonomy === "post_tag");
  return tags.map((t) => t.name).filter(Boolean);
}

function slugifyTitle(title = "") {
  const base = String(title)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `post-${Date.now()}`;
}

export { slugifyTitle };

/**
 * 統一前台文章 shape
 * source: 'wordpress' | 'partner'
 */
export function normalizePartnerBlogPost(post) {
  if (!post) return null;
  const title = stripHtml(post.title?.rendered || post.title || "");
  const excerpt = stripHtml(post.excerpt?.rendered || post.excerpt || "");
  const categories = extractCategoryNames(post);
  const tags = extractTagNames(post);
  return {
    id: `wp-${post.id}`,
    wpId: post.id,
    slug: post.slug,
    title,
    excerpt: excerpt.slice(0, 200),
    date: formatPartnerBlogDate(post.date),
    dateIso: post.date || null,
    categories,
    categoryLabel: categories[0] || "TRAVEL",
    tags,
    image: extractFeatureImage(post),
    contentHtml: post.content?.rendered
      ? normalizeWpAssetUrl(post.content.rendered)
      : "",
    authorName: post._embedded?.author?.[0]?.name || null,
    authorBio: stripHtml(post._embedded?.author?.[0]?.description || "") || null,
    source: "wordpress",
  };
}

export function normalizeStoreBlogRow(row) {
  if (!row) return null;
  return {
    id: `partner-${row.id}`,
    partnerId: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: (row.excerpt || "").slice(0, 200),
    date: formatPartnerBlogDate(row.published_at || row.created_at),
    dateIso: row.published_at || row.created_at || null,
    categories: row.category_label ? [row.category_label] : ["TRAVEL"],
    categoryLabel: row.category_label || "TRAVEL",
    tags: Array.isArray(row.tags) ? row.tags : [],
    image: row.cover_image_url || null,
    contentHtml: row.content_html || "",
    authorName: row.author_name || null,
    authorBio: row.author_bio || null,
    source: "partner",
    status: row.status,
  };
}

async function fetchStoreCustomPosts(storeId) {
  if (!storeId) return [];
  const db = getPartnerStorefrontDb();
  if (!db) return [];
  const { data, error } = await db
    .from("store_blog_posts")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) {
    if (/store_blog_posts|schema cache/i.test(error.message || "")) return [];
    console.error("[fetchStoreCustomPosts]", error.message);
    return [];
  }
  return (data || []).map(normalizeStoreBlogRow).filter(Boolean);
}

async function fetchStoreCustomPostBySlug(storeId, slug) {
  if (!storeId || !slug) return null;
  const db = getPartnerStorefrontDb();
  if (!db) return null;
  const { data, error } = await db
    .from("store_blog_posts")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    if (/store_blog_posts|schema cache/i.test(error.message || "")) return null;
    console.error("[fetchStoreCustomPostBySlug]", error.message);
    return null;
  }
  return normalizeStoreBlogRow(data);
}

function sortByDateDesc(a, b) {
  const ta = a.dateIso ? new Date(a.dateIso).getTime() : 0;
  const tb = b.dateIso ? new Date(b.dateIso).getTime() : 0;
  return tb - ta;
}

/**
 * 列表：WP（永遠）＋ 夥伴自建（僅 blog_custom_enabled）
 * 夥伴自建同 slug 時蓋過 WP（讓加值內容優先）
 */
export async function fetchPartnerBlogPosts({
  store = null,
  perPage = 24,
} = {}) {
  let wpPosts = [];
  try {
    const raw = await fetchWpPosts({ per_page: perPage, embed: true });
    wpPosts = raw.map(normalizePartnerBlogPost).filter(Boolean);
  } catch (err) {
    console.error("[fetchPartnerBlogPosts WP]", err.message);
  }

  const customEnabled = !!store?.blog_custom_enabled;
  let partnerPosts = [];
  if (customEnabled && store?.id) {
    partnerPosts = await fetchStoreCustomPosts(store.id);
  }

  if (!partnerPosts.length) return wpPosts.slice(0, perPage);

  const bySlug = new Map();
  for (const p of wpPosts) bySlug.set(p.slug, p);
  for (const p of partnerPosts) bySlug.set(p.slug, p); // partner wins
  return Array.from(bySlug.values()).sort(sortByDateDesc).slice(0, perPage);
}

/**
 * 單篇：先查夥伴自建（若開通），再 fallback WP
 */
export async function fetchPartnerBlogPostBySlug(slug, store = null) {
  if (!slug) return null;

  if (store?.blog_custom_enabled && store?.id) {
    const custom = await fetchStoreCustomPostBySlug(store.id, slug);
    if (custom) return custom;
  }

  try {
    const post = await fetchWpPostBySlug(slug);
    return normalizePartnerBlogPost(post);
  } catch (err) {
    console.error("[fetchPartnerBlogPostBySlug]", err.message);
    return null;
  }
}
