/**
 * 夥伴部落格 CMS：IG 貼文嵌入、側欄精選商品
 */

const MAX_IG = 8;
const MAX_URL = 500;

export function defaultBlogCms() {
  return {
    /** @type {{ url: string }[]} */
    ig_posts: [],
    /** 自動輪播間隔 ms */
    ig_autoplay_ms: 6000,
    /** storefront product id（字串） */
    featured_product_id: "",
    /** 夥伴自建文章分類 */
    categories: [],
  };
}

function clip(str, max) {
  return String(str ?? "")
    .trim()
    .slice(0, max);
}

/**
 * 從 IG 貼文／Reels 網址抽出 shortcode，並回傳 embed 網址
 * @returns {{ url: string, shortcode: string, embedUrl: string } | null}
 */
export function parseInstagramPostUrl(raw) {
  const url = clip(raw, MAX_URL);
  if (!url) return null;

  let normalized = url;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized.replace(/^\/+/, "")}`;
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (
    host !== "instagram.com" &&
    host !== "instagr.am" &&
    host !== "www.instagram.com"
  ) {
    return null;
  }

  const m = parsed.pathname.match(
    /\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
  );
  if (!m) return null;

  const kind = m[1].toLowerCase() === "tv" ? "tv" : m[1].toLowerCase() === "p" ? "p" : "reel";
  const shortcode = m[2];
  const canonical = `https://www.instagram.com/${kind === "tv" ? "tv" : kind === "p" ? "p" : "reel"}/${shortcode}/`;
  const embedUrl = `${canonical}embed/`;

  return {
    url: canonical,
    shortcode,
    embedUrl,
  };
}

export function mergeBlogCms(raw) {
  const base = defaultBlogCms();
  const src = raw && typeof raw === "object" ? raw : {};
  const posts = Array.isArray(src.ig_posts) ? src.ig_posts : [];
  const ig_posts = posts
    .map((p) => {
      const url = typeof p === "string" ? p : p?.url;
      const parsed = parseInstagramPostUrl(url);
      return parsed ? { url: parsed.url } : null;
    })
    .filter(Boolean)
    .slice(0, MAX_IG);

  let ms = Number(src.ig_autoplay_ms);
  if (!Number.isFinite(ms) || ms < 3000) ms = base.ig_autoplay_ms;
  if (ms > 20000) ms = 20000;

  const categories = [
    ...new Set(
      (Array.isArray(src.categories) ? src.categories : [])
        .map((c) => clip(c, 40))
        .filter(Boolean),
    ),
  ].slice(0, 40);

  return {
    ig_posts,
    ig_autoplay_ms: Math.round(ms),
    featured_product_id: clip(src.featured_product_id, 80),
    categories,
  };
}

export function sanitizeBlogCmsInput(input) {
  return mergeBlogCms(input);
}

/**
 * 依 blog_cms 從商品列表挑精選；無設定則回第一件
 */
export function resolveFeaturedProduct(products = [], blogCms) {
  const cms = mergeBlogCms(blogCms);
  const list = Array.isArray(products) ? products : [];
  if (!list.length) return null;
  const id = String(cms.featured_product_id || "").trim();
  if (id) {
    const found = list.find((p) => String(p.id) === id);
    if (found) return found;
  }
  return list[0] || null;
}

export function resolveIgEmbedSlides(blogCms) {
  const cms = mergeBlogCms(blogCms);
  return cms.ig_posts
    .map((p) => parseInstagramPostUrl(p.url))
    .filter(Boolean);
}

export const BLOG_CMS_MAX_IG = MAX_IG;
