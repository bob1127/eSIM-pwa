/**
 * chatArticles.js
 * 從 WordPress 拉文章資料，依使用者問題挑選最相關內容，並做 in-memory cache。
 */

import { fetchWpPosts, normalizeWpAssetUrl } from "./wordpress";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw").replace(/\/$/, "");
const CACHE_TTL_MS = Number(process.env.CHAT_WP_CACHE_TTL_MS || 10 * 60 * 1000); // 預設 10 分鐘
const MAX_POSTS = Number(process.env.CHAT_WP_POSTS_LIMIT || 80);

let _postsCache = null;
let _postsCacheAt = 0;

function stripHtml(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePostLink(post) {
  // 優先用本站 /blog/{slug} 路徑，不暴露 WordPress 後台 URL
  if (post?.slug) return `${SITE}/blog/${post.slug}/`;
  if (post?.link) return normalizeWpAssetUrl(post.link);
  return `${SITE}/blog`;
}

/**
 * 從查詢文字提取關鍵詞。
 * 中文：拆 2-gram 和 3-gram（因為沒有空格分隔）。
 * 英文／數字：取 3 字元以上的連續詞。
 */
function queryKeywords(text) {
  const q = String(text || "").toLowerCase().trim();
  const tokens = new Set();

  // 英文 / 數字：3 字元以上
  for (const m of q.matchAll(/[a-z0-9]{3,}/g)) tokens.add(m[0]);

  // 中文：提取連續中文串，再切 bigram + trigram
  for (const m of q.matchAll(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g)) {
    const s = m[0];
    // bigram（2字）
    for (let i = 0; i < s.length - 1; i++) tokens.add(s.slice(i, i + 2));
    // trigram（3字，更精確）
    for (let i = 0; i < s.length - 2; i++) tokens.add(s.slice(i, i + 3));
    // 整個連續串也加入（短的如「福岡」本身就是 2 字，已被 bigram 覆蓋）
    if (s.length >= 2) tokens.add(s);
  }

  return [...tokens].slice(0, 30);
}

function scorePost(post, keywords) {
  if (!keywords.length) return 0;
  const title   = stripHtml(post?.title?.rendered   || "").toLowerCase();
  const excerpt = stripHtml(post?.excerpt?.rendered || "").toLowerCase();
  // content 很長，只用前 800 字節省比對時間
  const contentRaw = stripHtml(post?.content?.rendered || "").toLowerCase();
  const content = contentRaw.slice(0, 800);

  let score = 0;
  for (const kw of keywords) {
    const inTitle   = title.includes(kw);
    const inExcerpt = excerpt.includes(kw);
    const inContent = content.includes(kw);
    // 長詞加更多分（比 bigram 更精確）
    const weight = kw.length >= 3 ? 2 : 1;
    if (inTitle)   score += 5 * weight;
    if (inExcerpt) score += 3 * weight;
    if (inContent) score += 1 * weight;
  }
  return score;
}

async function getWpPostsCached() {
  const now = Date.now();
  if (_postsCache && now - _postsCacheAt < CACHE_TTL_MS) return _postsCache;

  try {
    const posts = await fetchWpPosts({
      per_page: MAX_POSTS,
      embed: false,
    });
    _postsCache = Array.isArray(posts) ? posts : [];
    _postsCacheAt = now;
    return _postsCache;
  } catch (error) {
    console.error("[chatArticles] fetch error:", error?.message);
    // 若快取有舊資料，失敗時退回舊資料
    if (Array.isArray(_postsCache) && _postsCache.length) return _postsCache;
    return [];
  }
}

/**
 * 依使用者問題挑最相關文章，回傳給 system prompt 的文字區塊。
 */
export async function fetchArticleKnowledgeByQuery(queryText, limit = 3) {
  const posts = await getWpPostsCached();
  if (!posts.length) {
    return "【最新文章知識庫（WordPress）】\n（目前暫時無法取得文章資料）";
  }

  const keywords = queryKeywords(queryText);
  const sorted = posts
    .map((p) => ({ post: p, score: scorePost(p, keywords) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = Date.parse(a.post?.date || 0);
      const db = Date.parse(b.post?.date || 0);
      return db - da;
    });

  // 有相關文章取前 limit 篇；無相關文章也提供最新 2 篇作備用
  const relevant = sorted.filter((x) => x.score > 0).slice(0, limit);
  const fallback = relevant.length
    ? relevant.map((x) => x.post)
    : sorted.slice(0, Math.min(2, sorted.length)).map((x) => x.post);

  const hasRelevant = relevant.length > 0;

  const lines = [
    hasRelevant
      ? "【相關旅遊文章（WordPress，與問題相關）】"
      : "【最新旅遊文章（WordPress，無直接相關，僅供參考）】",
  ];

  for (const post of fallback) {
    const title   = stripHtml(post?.title?.rendered   || "未命名文章");
    const excerpt = stripHtml(post?.excerpt?.rendered || "").slice(0, 200);
    lines.push(`\n▸ ${title}`);
    if (excerpt) lines.push(`  摘要：${excerpt}`);
    lines.push(`  閱讀連結：${normalizePostLink(post)}`);
  }

  lines.push(
    `\n【文章使用規則】\n` +
    `1. 若問題與上方文章相關（旅遊地點、行程、景點、住宿等），請引用標題和連結回答。\n` +
    `2. 若問題是「有沒有 XX 的文章」，直接列出相關文章標題和連結。\n` +
    `3. 若確實沒有相關文章，誠實說明並推薦官網部落格：${SITE}/blog 。`
  );
  return lines.join("\n");
}

export function clearArticleKnowledgeCache() {
  _postsCache = null;
  _postsCacheAt = 0;
}
