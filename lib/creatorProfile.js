import { createClient } from "@supabase/supabase-js";
import { fetchWpPosts, resolveWpBannerImage } from "@/lib/wordpress";
import { fetchActiveStoreByDomain } from "@/lib/partnerStorefront";
import { fetchPartnerBlogPosts, stripHtml } from "@/lib/partnerBlog";
import { parseCreatorKey, postKeyFromPost } from "@/lib/blogCreator";
import { SOCIAL_LINKS } from "@/lib/seo.config";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}


async function followerCount(creatorKey) {
  const db = admin();
  if (!db) return 0;
  const { count } = await db
    .from("creator_follows")
    .select("*", { count: "exact", head: true })
    .eq("creator_key", creatorKey);
  return count ?? 0;
}

async function aggregateStats(prefix) {
  const db = admin();
  if (!db) return { views: 0, likes: 0 };
  const { data } = await db
    .from("blog_post_stats")
    .select("view_count, like_count")
    .like("post_key", `${prefix}%`);
  return (data || []).reduce(
    (acc, row) => ({
      views: acc.views + (Number(row.view_count) || 0),
      likes: acc.likes + (Number(row.like_count) || 0),
    }),
    { views: 0, likes: 0 },
  );
}

function wpCategoryName(post) {
  const terms = (post?._embedded?.["wp:term"] || [])
    .flat()
    .filter((t) => t?.taxonomy === "category" && t?.name);
  const skip = new Set(["文章", "未分類", "Uncategorized", "article"]);
  const picked = terms.find((t) => !skip.has(t.name) && !skip.has(t.slug));
  return picked?.name || terms[0]?.name || "旅遊";
}

function mapWpPost(post) {
  const slug = post.slug;
  return {
    slug,
    title: stripHtml(post.title?.rendered),
    excerpt: stripHtml(post.excerpt?.rendered).slice(0, 120),
    image: resolveWpBannerImage(post, "/images/Logo/icon-192.png"),
    date: post.date,
    href: `/blog/${slug}/`,
    category: wpCategoryName(post),
  };
}

function mapPartnerPost(post, domain) {
  return {
    slug: post.slug,
    title: stripHtml(post.title),
    excerpt: stripHtml(post.excerpt || "").slice(0, 120),
    image: post.image || "/images/placeholder.jpg",
    date: post.dateIso || post.date,
    href: `/p/${domain}/blog/${post.slug}/`,
    category: post.categoryLabel || post.categories?.[0] || "旅遊",
  };
}

/** 無真實統計時的穩定假資料，同一篇文章每次相同 */
function demoCount(slug, salt, min, max) {
  let h = 2166136261;
  const s = `${slug}:${salt}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return min + (h >>> 0) % (max - min + 1);
}

async function attachPostStats(posts, { partnerDomain } = {}) {
  const list = Array.isArray(posts) ? posts : [];
  if (!list.length) return [];
  const keys = list.map((p) =>
    postKeyFromPost({ slug: p.slug }, { partnerDomain }),
  );
  const db = admin();
  const map = {};
  if (db) {
    try {
      const { data } = await db
        .from("blog_post_stats")
        .select("post_key, view_count, like_count")
        .in("post_key", keys);
      (data || []).forEach((row) => {
        map[row.post_key] = row;
      });
    } catch {
      /* 表格尚未建立時改用假資料 */
    }
  }
  return list.map((post, i) => {
    const postKey = keys[i];
    const row = map[postKey];
    const live = Boolean(row);
    const views = Number(row?.view_count) || 0;
    const likes = Number(row?.like_count) || 0;
    return {
      ...post,
      postKey,
      viewCount: live ? views : demoCount(post.slug, "views", 186, 2480),
      likeCount: live ? likes : demoCount(post.slug, "likes", 6, 168),
      statsLive: live,
    };
  });
}

export async function loadCreatorProfile(creatorKey, { postLimit = 12 } = {}) {
  const parsed = parseCreatorKey(creatorKey);
  const followers = await followerCount(parsed.key);

  if (parsed.type === "partner") {
    const store = await fetchActiveStoreByDomain(parsed.domain);
    if (!store) return null;
    const posts = await attachPostStats(
      (
        await fetchPartnerBlogPosts({ store, perPage: postLimit, allowDemo: false })
      ).map((p) => mapPartnerPost(p, parsed.domain)),
      { partnerDomain: parsed.domain },
    );
    const stats = await aggregateStats(`partner:${parsed.domain}:`);
    const name = store.store_name || parsed.domain;
    return {
      key: parsed.key,
      type: "partner",
      domain: parsed.domain,
      name,
      avatar: store.logo_url || "/images/Logo/icon-192.png",
      cover: posts[0]?.image || store.logo_url || "/images/Logo/icon-192.png",
      bio:
        store.description ||
        `${name} 分享出國旅遊與 eSIM 實用攻略。`,
      subtitle: "夥伴創作者",
      location: "台灣",
      memberSince: store.created_at
        ? String(new Date(store.created_at).getFullYear())
        : "2026",
      instagram: SOCIAL_LINKS.instagram,
      facebook: SOCIAL_LINKS.facebook,
      shopHref: `/p/${parsed.domain}/`,
      blogHref: `/p/${parsed.domain}/blog/`,
      followerCount: followers,
      postCount: posts.length,
      viewCount: stats.views || posts.reduce((n, p) => n + (p.viewCount || 0), 0),
      likeCount: stats.likes || posts.reduce((n, p) => n + (p.likeCount || 0), 0),
      posts,
    };
  }

  let wp = [];
  try {
    wp = await fetchWpPosts({ per_page: postLimit, embed: true });
  } catch {
    wp = [];
  }
  const posts = await attachPostStats((wp || []).map(mapWpPost));
  const stats = await aggregateStats("wp:");
  return {
    key: "jeko",
    type: "jeko",
    domain: null,
    name: "Jeko eSIM",
    avatar: "/images/Logo/icon-192.png",
    cover: posts[0]?.image || "/images/Logo/icon-192.png",
    bio: "Jeko eSIM 站在你J編，整理各國上網方案、交通票券與旅遊攻略。",
    subtitle: "官方創作者",
    location: "台灣",
    memberSince: "2024",
    instagram: SOCIAL_LINKS.instagram,
    facebook: SOCIAL_LINKS.facebook,
    shopHref: "/product",
    blogHref: "/blog/",
    followerCount: followers,
    postCount: posts.length,
    viewCount: stats.views || posts.reduce((n, p) => n + (p.viewCount || 0), 0),
    likeCount: stats.likes || posts.reduce((n, p) => n + (p.likeCount || 0), 0),
    posts,
  };
}

export async function loadCreatorTeasers(keys = []) {
  const unique = [...new Set(keys.filter(Boolean))];
  const out = [];
  for (const key of unique) {
    try {
      const profile = await loadCreatorProfile(key, { postLimit: 16 });
      if (profile) out.push(profile);
    } catch {
      /* skip */
    }
  }
  return out;
}
