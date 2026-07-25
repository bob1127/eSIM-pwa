/** WordPress REST API（Bluehost 後台） */
export const WP_BASE_URL =
  process.env.NEXT_PUBLIC_WP_BASE_URL ||
  "https://inf.fjg.mybluehost.me/website_f9214e6b";

export const WP_REST_URL = `${WP_BASE_URL}/wp-json/wp/v2`;

const LEGACY_WP_HOSTS = [
  "https://dyx.wxv.mybluehost.me/website_a8bfc44c",
  "https://dyx.wxv.mybluehost.me/website_a8bfc44c/",
];

/** 將舊站圖片／連結網域改為目前 WordPress 站 */
export function normalizeWpAssetUrl(url) {
  if (!url || typeof url !== "string") return url;
  let next = url;
  for (const legacy of LEGACY_WP_HOSTS) {
    next = next.split(legacy).join(WP_BASE_URL);
  }
  return next;
}

const PHOTON_HOST_RE = /^i[0-3]\.wp\.com$/i;
const IMAGE_COMPRESS_PARAMS = [
  "resize",
  "fit",
  "w",
  "h",
  "quality",
  "q",
  "strip",
  "zoom",
  "crop",
  "ulb",
];

/**
 * 還原為未壓縮原圖 URL：
 * - 拆掉 Jetpack/Photon (i0.wp.com/…) 外殼
 * - 移除 resize / fit / w / quality 等壓縮參數
 */
export function upgradeWpImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  const cleaned = normalizeWpAssetUrl(
    url.replace(/&#038;/gi, "&").replace(/&amp;/gi, "&"),
  );
  try {
    const u = new URL(cleaned);

    // https://i0.wp.com/origin.example/path.jpg?… → https://origin.example/path.jpg
    if (PHOTON_HOST_RE.test(u.hostname)) {
      const path = u.pathname.replace(/^\/+/, "");
      const slash = path.indexOf("/");
      if (slash > 0) {
        const originHost = path.slice(0, slash);
        const originPath = path.slice(slash);
        return `https://${originHost}${originPath}`;
      }
    }

    for (const key of IMAGE_COMPRESS_PARAMS) {
      u.searchParams.delete(key);
    }
    // 僅保留無害參數（若還有）；精選圖直接用乾淨原圖
    if ([...u.searchParams.keys()].length === 0) {
      return `${u.origin}${u.pathname}`;
    }
    return u.toString();
  } catch {
    return cleaned.split("?")[0];
  }
}

/** 從 WP media 物件取出原圖 URL（只用 full / source_url，不用 large/medium 壓縮版） */
export function getWpMediaSourceUrl(media) {
  if (!media || typeof media !== "object") return null;
  const sizes = media.media_details?.sizes || {};
  const raw = media.source_url || sizes.full?.source_url || null;
  return raw ? upgradeWpImageUrl(raw) : null;
}

/** 同步解析文章 Banner：精選圖 → Jetpack featured → Yoast OG → 內文第一張 */
export function resolveWpBannerImage(post, fallback = "/images/placeholder.jpg") {
  if (!post) return fallback;

  const featured = getWpMediaSourceUrl(
    post._embedded?.["wp:featuredmedia"]?.[0],
  );
  if (featured) return featured;

  if (post.jetpack_featured_media_url) {
    return upgradeWpImageUrl(post.jetpack_featured_media_url);
  }

  const yoastUrl = post.yoast_head_json?.og_image?.[0]?.url;
  if (yoastUrl) return upgradeWpImageUrl(yoastUrl);

  const html = post.content?.rendered || "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match?.[1]) return upgradeWpImageUrl(match[1]);

  return fallback;
}

/** 依 media id 補抓精選圖（_embed 偶發缺漏時） */
export async function fetchWpMediaById(id) {
  if (!id) return null;
  const res = await fetch(`${WP_REST_URL}/media/${id}`);
  if (!res.ok) return null;
  return res.json();
}

/** 確保 post 帶有 _embedded wp:featuredmedia（有設定精選圖時） */
export async function ensureWpPostFeaturedMedia(post) {
  if (!post) return post;
  const existing = getWpMediaSourceUrl(
    post._embedded?.["wp:featuredmedia"]?.[0],
  );
  if (existing) return post;

  const mediaId = post.featured_media;
  if (!mediaId) return post;

  const media = await fetchWpMediaById(mediaId);
  const sourceUrl = getWpMediaSourceUrl(media);
  if (!sourceUrl) return post;

  return {
    ...post,
    _embedded: {
      ...(post._embedded || {}),
      "wp:featuredmedia": [
        {
          ...(media || {}),
          source_url: sourceUrl,
        },
      ],
    },
  };
}

function buildPostsUrl(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    // WordPress _embed 需有值；空字串會被略過導致分類/特色圖抓不到
    if (value === "" && key !== "_embed") return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${WP_REST_URL}/posts?${qs}` : `${WP_REST_URL}/posts`;
}

export async function fetchWpPosts(query = {}) {
  const { per_page = 100, embed = true, fresh = false, ...rest } = query;
  const url = buildPostsUrl({
    per_page,
    ...(embed ? { _embed: "1" } : {}),
    ...(fresh ? { nocache: Date.now() } : {}),
    ...rest,
  });
  const res = await fetch(url, fresh ? { cache: "no-store" } : undefined);
  if (!res.ok) {
    throw new Error(`WordPress API error: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid WordPress API response");
  }
  return data;
}

/**
 * 分頁抓取「全部」已發布文章（含之後新增的）。
 * WP REST 單次最多 100 篇，用 X-WP-TotalPages 翻頁。
 */
export async function fetchAllWpPosts(options = {}) {
  const {
    embed = false,
    fresh = true,
    per_page = 100,
    maxPages = Number(process.env.CHAT_WP_MAX_PAGES || 30),
  } = options;

  const all = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const url = buildPostsUrl({
      per_page,
      page,
      status: "publish",
      orderby: "date",
      order: "desc",
      ...(embed ? { _embed: "1" } : {}),
      ...(fresh ? { nocache: Date.now() } : {}),
    });
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`WordPress API error: ${res.status}`);
    }

    const headerPages = Number(res.headers.get("X-WP-TotalPages") || 0);
    if (headerPages > 0) totalPages = headerPages;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);

    if (data.length < per_page) break;
    page += 1;
  }

  return all;
}

/** 即時搜尋（給聊天用：剛發布的文章也能命中） */
export async function searchWpPosts(search, options = {}) {
  const q = String(search || "").trim().slice(0, 100);
  if (!q) return [];
  const { per_page = 15, embed = false } = options;
  try {
    return await fetchWpPosts({
      search: q,
      per_page,
      embed,
      fresh: true,
      status: "publish",
      orderby: "date",
      order: "desc",
    });
  } catch (error) {
    console.error("[searchWpPosts]", error?.message);
    return [];
  }
}

export async function fetchWpPostBySlug(slug) {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug);
  const posts = await fetchWpPosts({ slug: decoded, per_page: 1 });
  return posts[0] ?? null;
}

/** 同分類的其他文章（排除本篇） */
export async function fetchRelatedWpPosts(post, limit = 4) {
  if (!post?.categories?.length) {
    const all = await fetchWpPosts({ per_page: limit + 1 });
    return all.filter((p) => p.id !== post.id).slice(0, limit);
  }
  const categoryId = post.categories[0];
  const related = await fetchWpPosts({
    categories: categoryId,
    per_page: limit + 1,
    exclude: post.id,
  });
  return related.slice(0, limit);
}

/**
 * 擴充相關文章：同分類 →「文章」樹 → 全站補足
 * 供文章版型分頁使用（預設每頁 6 則）
 */
export async function fetchRelatedWpPostsForArticle(post, maps, limit = 24) {
  const seen = new Set([post.id]);
  const results = [];

  const pushUnique = (list = []) => {
    for (const p of list) {
      if (!p?.id || seen.has(p.id)) continue;
      seen.add(p.id);
      results.push(p);
      if (results.length >= limit) return true;
    }
    return false;
  };

  // 1) 本篇所有分類
  for (const catId of post.categories || []) {
    if (results.length >= limit) break;
    try {
      const batch = await fetchWpPosts({
        categories: catId,
        per_page: Math.min(limit + 2, 100),
        exclude: post.id,
      });
      if (pushUnique(batch)) break;
    } catch {
      /* ignore */
    }
  }

  // 2) 「文章」父分類整棵樹
  if (results.length < limit && maps?.articleRootId) {
    const treeIds = new Set([maps.articleRootId]);
    (maps.articleChildIds || []).forEach((id) => treeIds.add(id));
    Object.values(maps.articleDescendantIds || {}).forEach((ids) => {
      (ids || []).forEach((id) => treeIds.add(id));
    });
    const joined = [...treeIds].slice(0, 30).join(",");
    try {
      const batch = await fetchWpPosts({
        categories: joined,
        per_page: Math.min(limit + 5, 100),
        exclude: post.id,
      });
      pushUnique(batch);
    } catch {
      /* ignore */
    }
  }

  // 3) 全站補足
  if (results.length < limit) {
    try {
      const all = await fetchWpPosts({
        per_page: Math.min(limit + 5, 100),
        exclude: post.id,
      });
      pushUnique(all);
    } catch {
      /* ignore */
    }
  }

  return results.slice(0, limit);
}

export async function fetchWpCategories() {
  const res = await fetch(`${WP_REST_URL}/categories?per_page=100&orderby=name&order=asc`);
  if (!res.ok) {
    throw new Error(`WordPress categories API error: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid WordPress categories response");
  }
  return data;
}

function buildChildrenByParent(categories) {
  const childrenByParentId = {};
  categories.forEach((cat) => {
    const parentKey = cat.parent ?? 0;
    if (!childrenByParentId[parentKey]) childrenByParentId[parentKey] = [];
    childrenByParentId[parentKey].push(cat);
  });
  return childrenByParentId;
}

/** 收集某分類底下所有後代 ID */
function collectDescendantIds(rootId, childrenByParentId) {
  const ids = new Set([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const pid = queue.shift();
    (childrenByParentId[pid] || []).forEach((child) => {
      ids.add(child.id);
      queue.push(child.id);
    });
  }
  return ids;
}

function isUnderRoot(catId, rootId, categoriesById) {
  let current = categoriesById[catId];
  while (current) {
    if (current.id === rootId) return true;
    if (!current.parent) return false;
    current = categoriesById[current.parent];
  }
  return false;
}

/** 依後台父子分類建立「文章 / 知識」對照表（含國家下的子分類） */
export function buildBlogCategoryMaps(categories) {
  const articleRoot = categories.find((c) => c.slug === "article");
  const knowledgeRoot = categories.find((c) => c.slug === "knowlage");

  const articleChildIds = new Set();
  const knowledgeChildIds = new Set();
  const articleTabs = [];
  const knowledgeTabs = [];
  const articleSubTabsByParent = {};
  const knowledgeSubTabsByParent = {};
  const articleDescendantIds = {};
  const knowledgeDescendantIds = {};

  const categoriesById = Object.fromEntries(
    categories.map((cat) => [cat.id, cat]),
  );
  const childrenByParentId = buildChildrenByParent(categories);

  const registerBranch = (root, childIds, tabs, subTabsByParent, descendantIds) => {
    if (!root) return;
    const directChildren = childrenByParentId[root.id] || [];
    directChildren.forEach((countryCat) => {
      childIds.add(countryCat.id);
      tabs.push(countryCat.name);
      const descendants = collectDescendantIds(
        countryCat.id,
        childrenByParentId,
      );
      descendantIds[countryCat.name] = descendants;
      const subNames = (childrenByParentId[countryCat.id] || []).map(
        (c) => c.name,
      );
      if (subNames.length > 0) {
        subTabsByParent[countryCat.name] = subNames;
      }
    });
  };

  registerBranch(
    articleRoot,
    articleChildIds,
    articleTabs,
    articleSubTabsByParent,
    articleDescendantIds,
  );
  registerBranch(
    knowledgeRoot,
    knowledgeChildIds,
    knowledgeTabs,
    knowledgeSubTabsByParent,
    knowledgeDescendantIds,
  );

  return {
    articleRootId: articleRoot?.id ?? null,
    knowledgeRootId: knowledgeRoot?.id ?? null,
    articleChildIds,
    knowledgeChildIds,
    articleTabs,
    knowledgeTabs,
    articleSubTabsByParent,
    knowledgeSubTabsByParent,
    articleDescendantIds,
    knowledgeDescendantIds,
    categoriesById,
    childrenByParentId,
    isUnderArticleRoot: (catId) =>
      articleRoot?.id ? isUnderRoot(catId, articleRoot.id, categoriesById) : false,
    isUnderKnowledgeRoot: (catId) =>
      knowledgeRoot?.id
        ? isUnderRoot(catId, knowledgeRoot.id, categoriesById)
        : false,
  };
}

function getPostCategoryTerms(post) {
  if (!post._embedded?.["wp:term"]) return [];
  return post._embedded["wp:term"]
    .flat()
    .filter((term) => term.taxonomy === "category");
}

/** 取得文章在某一區塊下的所有分類名稱（含國家底下的子分類） */
function resolveBranchCategoryNames(
  categoryIds,
  terms,
  categoriesById,
  isUnderRootFn,
) {
  const names = new Set();

  const addFromId = (id) => {
    const cat = categoriesById[id];
    if (!cat || !isUnderRootFn(id)) return;
    if (cat.name) names.add(cat.name);
  };

  categoryIds.forEach(addFromId);
  terms.forEach((t) => addFromId(t.id));

  return Array.from(names);
}

/** 取得「國家層」分類名稱（article / knowlage 的直接子分類） */
function resolvePrimaryCountryName(categoryIds, terms, rootId, categoriesById) {
  const ids = [...categoryIds, ...terms.map((t) => t.id)];
  for (const id of ids) {
    let cat = categoriesById[id];
    while (cat) {
      if (cat.parent === rootId) return cat.name;
      if (!cat.parent) break;
      cat = categoriesById[cat.parent];
    }
  }
  return null;
}

/** 判斷文章屬於「文章精選」或「知識小幫手」 */
export function classifyBlogPost(post, maps) {
  const categoryIds = post.categories || [];
  const terms = getPostCategoryTerms(post);
  const { categoriesById } = maps;

  const isArticle =
    (maps.articleRootId && categoryIds.includes(maps.articleRootId)) ||
    categoryIds.some((id) => maps.isUnderArticleRoot(id));

  const isKnowledge =
    (maps.knowledgeRootId && categoryIds.includes(maps.knowledgeRootId)) ||
    categoryIds.some((id) => maps.isUnderKnowledgeRoot(id));

  const articleSubCats = resolveBranchCategoryNames(
    categoryIds,
    terms,
    categoriesById,
    maps.isUnderArticleRoot,
  );

  const knowledgeSubCats = resolveBranchCategoryNames(
    categoryIds,
    terms,
    categoriesById,
    maps.isUnderKnowledgeRoot,
  );

  const articleCountry = resolvePrimaryCountryName(
    categoryIds,
    terms,
    maps.articleRootId,
    categoriesById,
  );

  const knowledgeCountry = resolvePrimaryCountryName(
    categoryIds,
    terms,
    maps.knowledgeRootId,
    categoriesById,
  );

  if (isArticle && articleSubCats.length === 0) {
    articleSubCats.push("綜合文章");
  }
  if (isKnowledge && knowledgeSubCats.length === 0) {
    knowledgeSubCats.push("綜合知識");
  }

  return {
    isArticle,
    isKnowledge,
    articleSubCats,
    knowledgeSubCats,
    articleCountry,
    knowledgeCountry,
  };
}

/** 相關文章卡片：去掉全文 HTML，避免 page data 破百 KB～MB */
export function slimWpPostCard(post) {
  if (!post) return null;
  const mediaUrl = getWpMediaSourceUrl(
    post._embedded?.["wp:featuredmedia"]?.[0],
  );
  const terms = (post._embedded?.["wp:term"] || [])
    .flat()
    .filter((t) => t?.taxonomy === "category")
    .map((t) => ({
      id: t.id,
      name: t.name,
      taxonomy: t.taxonomy,
      parent: t.parent ?? 0,
    }));

  return {
    id: post.id,
    slug: post.slug,
    date: post.date,
    title: { rendered: post.title?.rendered || "" },
    featured_media: post.featured_media || 0,
    _embedded: {
      ...(mediaUrl
        ? {
            "wp:featuredmedia": [{ source_url: mediaUrl }],
          }
        : {}),
      ...(terms.length ? { "wp:term": [terms] } : {}),
    },
  };
}

/** 單篇文章頁：保留內文，去掉 yoast_head / 多餘 embed */
export function slimWpPostForPage(post) {
  if (!post) return null;
  const mediaUrl = getWpMediaSourceUrl(
    post._embedded?.["wp:featuredmedia"]?.[0],
  );
  const terms = (post._embedded?.["wp:term"] || [])
    .flat()
    .filter(Boolean)
    .map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      taxonomy: t.taxonomy,
      parent: t.parent ?? 0,
    }));

  const yoast = post.yoast_head_json
    ? {
        title: post.yoast_head_json.title || null,
        description: post.yoast_head_json.description || null,
        canonical: post.yoast_head_json.canonical || null,
        // 必須可 JSON 序列化：不可用 undefined（getStaticProps 會炸）
        og_image: Array.isArray(post.yoast_head_json.og_image)
          ? post.yoast_head_json.og_image
              .slice(0, 1)
              .map((img) => ({
                url: img?.url ? upgradeWpImageUrl(img.url) : null,
              }))
              .filter((img) => img.url)
          : null,
      }
    : null;

  return {
    id: post.id,
    slug: post.slug,
    date: post.date,
    modified: post.modified || null,
    categories: post.categories || [],
    featured_media: post.featured_media || 0,
    jetpack_featured_media_url: post.jetpack_featured_media_url
      ? upgradeWpImageUrl(post.jetpack_featured_media_url)
      : null,
    title: { rendered: post.title?.rendered || "" },
    excerpt: { rendered: post.excerpt?.rendered || "" },
    content: { rendered: post.content?.rendered || "" },
    // Code Snippets：jeko_description / jeko_keywords / jeko_qa
    meta: {
      jeko_description: post.meta?.jeko_description || "",
      jeko_keywords: post.meta?.jeko_keywords || "",
      jeko_qa: post.meta?.jeko_qa || "",
    },
    ...(yoast ? { yoast_head_json: yoast } : {}),
    _embedded: {
      ...(mediaUrl
        ? {
            "wp:featuredmedia": [{ source_url: mediaUrl }],
          }
        : {}),
      ...(terms.length ? { "wp:term": [terms] } : {}),
    },
  };
}

/** 瀏覽器端透過 Next API 代理抓取（避免 CORS / 快取問題） */
export async function fetchWpPostsFromApi(options = {}) {
  const { per_page = 100 } = options;
  const res = await fetch(`/api/wordpress/posts?per_page=${per_page}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Posts API error: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid posts API response");
  }
  return data;
}

export async function fetchWpCategoriesFromApi() {
  const res = await fetch("/api/wordpress/categories", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Categories API error: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid categories API response");
  }
  return data;
}
