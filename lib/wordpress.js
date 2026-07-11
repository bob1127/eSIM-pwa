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
