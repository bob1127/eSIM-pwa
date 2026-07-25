/**
 * chatArticles.js
 * WordPress 動態知識庫 → J寶
 * 目標：最少 token、最高精準度（FAQ 優先 + 關鍵句摘錄，不丟全文）
 */

import {
  fetchAllWpPosts,
  searchWpPosts,
  normalizeWpAssetUrl,
} from "./wordpress";

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");

const CACHE_TTL_MS = Number(
  process.env.CHAT_WP_CACHE_TTL_MS || 3 * 60 * 1000,
);

/** 整段文章知識庫硬上限（字元，約略對應 token） */
const PROMPT_BUDGET = Number(process.env.CHAT_WP_PROMPT_BUDGET || 2000);
/** 最多引用幾篇文章 */
const MAX_ARTICLES = Number(process.env.CHAT_WP_MAX_ARTICLES || 2);

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

function slimPostForChat(post) {
  if (!post) return null;
  return {
    id: post.id,
    slug: post.slug,
    date: post.date,
    modified: post.modified,
    link: post.link,
    title: { rendered: post.title?.rendered || "" },
    excerpt: { rendered: post.excerpt?.rendered || "" },
    content: { rendered: post.content?.rendered || "" },
    meta: {
      jeko_description: post.meta?.jeko_description || "",
      jeko_keywords: post.meta?.jeko_keywords || "",
      jeko_qa: post.meta?.jeko_qa || "",
    },
  };
}

function parseJekoQaMeta(raw) {
  if (!raw || typeof raw !== "string") return [];
  const text = raw.trim().replace(/\r\n/g, "\n");
  if (!text) return [];

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => ({
            question: stripHtml(
              String(item?.question || item?.q || item?.name || "").trim(),
            ),
            answer: stripHtml(
              String(item?.answer || item?.a || item?.text || "").trim(),
            ),
          }))
          .filter((f) => f.question && f.answer)
          .slice(0, 20);
      }
    } catch {
      /* fall through */
    }
  }

  const faqs = [];
  const pairRe = /Q[:：]\s*([\s\S]*?)\s*A[:：]\s*([\s\S]*?)(?=\s*Q[:：]|$)/gi;
  let m;
  while ((m = pairRe.exec(text)) && faqs.length < 20) {
    const question = stripHtml(m[1].trim());
    const answer = stripHtml(m[2].trim());
    if (question && answer) faqs.push({ question, answer });
  }
  if (faqs.length) return faqs.slice(0, 20);

  const numbered = [
    ...text.matchAll(
      /Q\s*(\d+)\s*[:：]\s*([^\n]+)\n([\s\S]*?)(?=\nQ\s*\d+\s*[:：]|$)/gi,
    ),
  ];
  for (const match of numbered) {
    const question = stripHtml(match[2].trim());
    const answer = stripHtml(match[3].trim());
    if (question && answer) faqs.push({ question, answer });
  }
  return faqs.slice(0, 20);
}

function normalizePostLink(post) {
  if (post?.slug) return `${SITE}/blog/${post.slug}/`;
  if (post?.link) return normalizeWpAssetUrl(post.link);
  return `${SITE}/blog`;
}

function getPostPlainBody(post) {
  return stripHtml(post?.content?.rendered || "");
}

function getPostMeta(post) {
  const meta = post?.meta || {};
  return {
    description: String(meta.jeko_description || "").trim(),
    keywords: String(meta.jeko_keywords || "").trim(),
    qa: String(meta.jeko_qa || "").trim(),
  };
}

/** 只保留較有資訊量的關鍵詞（省比對噪音） */
function queryKeywords(text) {
  const q = String(text || "").toLowerCase().trim();
  const tokens = new Set();

  for (const m of q.matchAll(/[a-z0-9]{3,}/g)) tokens.add(m[0]);

  for (const m of q.matchAll(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g)) {
    const s = m[0];
    // 優先整詞與 3-gram；2-gram 只在短查詢時用
    if (s.length >= 2) tokens.add(s);
    for (let i = 0; i < s.length - 2; i++) tokens.add(s.slice(i, i + 3));
    if (s.length <= 6) {
      for (let i = 0; i < s.length - 1; i++) tokens.add(s.slice(i, i + 2));
    }
  }

  const boostMap = [
    [["行動電源", "電源", "充電寶", "行充", "powerbank"], ["行動電源", "3C"]],
    [["登機", "安檢", "託運"], ["登機", "託運"]],
    [["台胞證", "大陸證"], ["台胞證"]],
    [["飛中國", "中國大陸"], ["中國"]],
    [["液體", "100ml"], ["液體", "100ml"]],
    [["esim", "安裝", "啟用"], ["eSIM", "安裝"]],
  ];
  for (const [triggers, extras] of boostMap) {
    if (triggers.some((t) => q.includes(t.toLowerCase()))) {
      for (const e of extras) tokens.add(e.toLowerCase());
    }
  }

  return [...tokens]
    .filter((t) => t.length >= 2)
    .sort((a, b) => b.length - a.length)
    .slice(0, 24);
}

function scorePost(post, keywords) {
  if (!keywords.length) return 0;
  const title = stripHtml(post?.title?.rendered || "").toLowerCase();
  const excerpt = stripHtml(post?.excerpt?.rendered || "").toLowerCase();
  const meta = getPostMeta(post);
  const metaBlob = `${meta.description} ${meta.keywords} ${meta.qa}`.toLowerCase();
  const content = getPostPlainBody(post).toLowerCase();

  let score = 0;
  for (const kw of keywords) {
    const weight = kw.length >= 3 ? 2 : 1;
    if (title.includes(kw)) score += 8 * weight;
    if (metaBlob.includes(kw)) score += 5 * weight;
    if (excerpt.includes(kw)) score += 2 * weight;
    if (content.includes(kw)) score += 1 * weight;
  }
  // 有整理好的 QA → 加權（通常更準、更省 token）
  if (meta.qa) score += 6;
  return score;
}

function scoreFaqItem(faq, keywords) {
  const q = faq.question.toLowerCase();
  const a = faq.answer.toLowerCase();
  let s = 0;
  for (const kw of keywords) {
    if (kw.length < 2) continue;
    const w = kw.length >= 3 ? 3 : 1;
    if (q.includes(kw)) s += 4 * w;
    if (a.includes(kw)) s += 2 * w;
  }
  return s;
}

/** 只挑與問題相關的 FAQ（命中才帶；避免整包 Q1–Q7） */
function pickRelevantFaqs(faqs, keywords, max = 3) {
  if (!faqs?.length) return [];
  const ranked = faqs
    .map((f) => ({ f, s: scoreFaqItem(f, keywords) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return ranked.slice(0, max).map((x) => x.f);
}

/**
 * 從內文抽出「關鍵詞附近」短句，不丟全文。
 * 重疊區間去重，控制總長度。
 */
function extractRelevantSnippets(body, keywords, opts = {}) {
  const maxSnippets = opts.maxSnippets ?? 2;
  const window = opts.window ?? 150;
  const maxTotal = opts.maxTotal ?? 500;
  if (!body) return [];

  const lower = body.toLowerCase();
  const rankedKw = [...keywords].filter((k) => k.length >= 2);
  const hits = [];

  for (const kw of rankedKw) {
    let from = 0;
    let found = 0;
    while (from < lower.length && found < 2) {
      const idx = lower.indexOf(kw, from);
      if (idx < 0) break;
      hits.push({ idx, len: kw.length });
      from = idx + Math.max(kw.length, 1);
      found += 1;
    }
  }

  hits.sort((a, b) => b.len - a.len || a.idx - b.idx);

  const ranges = [];
  for (const hit of hits) {
    if (ranges.length >= maxSnippets) break;
    const start = Math.max(0, hit.idx - Math.floor(window / 3));
    const end = Math.min(body.length, hit.idx + hit.len + Math.floor((window * 2) / 3));
    if (ranges.some(([s, e]) => !(end <= s || start >= e))) continue;
    ranges.push([start, end]);
  }

  // 依文章順序輸出，閱讀較順
  ranges.sort((a, b) => a[0] - b[0]);

  const out = [];
  let total = 0;
  for (const [start, end] of ranges) {
    let snip = body.slice(start, end).trim();
    if (!snip) continue;
    if (start > 0) snip = `…${snip}`;
    if (end < body.length) snip = `${snip}…`;
    if (total + snip.length > maxTotal) break;
    out.push(snip);
    total += snip.length;
  }
  return out;
}

function mergePostsById(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const post of list || []) {
      if (!post?.id) continue;
      map.set(post.id, slimPostForChat(post));
    }
  }
  return [...map.values()];
}

async function getWpPostsCached() {
  const now = Date.now();
  if (_postsCache && now - _postsCacheAt < CACHE_TTL_MS) return _postsCache;

  try {
    const posts = await fetchAllWpPosts({ embed: false, fresh: true });
    _postsCache = mergePostsById(posts);
    _postsCacheAt = now;
    return _postsCache;
  } catch (error) {
    console.error("[chatArticles] fetchAll error:", error?.message);
    if (Array.isArray(_postsCache) && _postsCache.length) return _postsCache;
    return [];
  }
}

async function getPostsForQuery(queryText) {
  const [cached, liveHits] = await Promise.all([
    getWpPostsCached(),
    searchWpPosts(queryText, { per_page: 10, embed: false }),
  ]);
  return mergePostsById(cached, liveHits);
}

/**
 * 單篇壓縮知識卡：
 * 1) 相關 FAQ（精準、省 token）
 * 2) 再用 1～2 句內文摘錄補廣度（避免只靠 FAQ 範圍太窄）
 * 3) 都沒有才用短 description
 */
function formatCompactPost(post, { keywords, budget, isPrimary }) {
  const title = stripHtml(post?.title?.rendered || "未命名");
  const link = normalizePostLink(post);
  const meta = getPostMeta(post);
  const faqs = parseJekoQaMeta(meta.qa);
  const relevantFaqs = pickRelevantFaqs(faqs, keywords, isPrimary ? 3 : 2);

  const lines = [`#${title}`, link];
  let used = lines.join("\n").length;

  const push = (text) => {
    if (!text) return false;
    if (used + text.length + 1 > budget) return false;
    lines.push(text);
    used += text.length + 1;
    return true;
  };

  let faqChars = 0;
  for (const f of relevantFaqs) {
    const block = `Q:${f.question}\nA:${f.answer}`;
    if (!push(block)) break;
    faqChars += block.length;
  }

  // 廣度：即使已有 FAQ，仍保留一部分預算給內文關鍵句
  // FAQ 越完整 → 內文預算越少；完全沒 FAQ → 內文拿較多
  const remain = Math.max(0, budget - used);
  const bodyShare =
    relevantFaqs.length === 0
      ? 1
      : relevantFaqs.length >= 2 && faqChars >= 160
        ? 0.35
        : 0.5;
  const bodyBudget = Math.floor(remain * bodyShare);

  if (bodyBudget >= 80) {
    const snippets = extractRelevantSnippets(getPostPlainBody(post), keywords, {
      maxSnippets: isPrimary ? (relevantFaqs.length ? 2 : 3) : 1,
      window: isPrimary ? 150 : 110,
      maxTotal: Math.min(bodyBudget, isPrimary ? 560 : 240),
    });
    for (const s of snippets) {
      if (!push(`•${s}`)) break;
    }
  }

  // 都沒摘到內容時，才用短描述兜底
  if (lines.length <= 2) {
    const fallback =
      meta.description.slice(0, 140) ||
      stripHtml(post?.excerpt?.rendered || "").slice(0, 120);
    push(fallback);
  }

  return { text: lines.join("\n"), used, faqHits: relevantFaqs.length };
}

function pickArticles(sorted, limit) {
  const relevant = sorted.filter((x) => x.score > 0);
  if (!relevant.length) {
    return { items: sorted.slice(0, 1), hasRelevant: false };
  }

  const top = relevant[0];
  const items = [top];
  // 第二篇只有分數夠接近才帶（避免稀釋＋浪費 token）
  if (
    limit >= 2 &&
    relevant[1] &&
    relevant[1].score >= Math.max(8, top.score * 0.45)
  ) {
    items.push(relevant[1]);
  }
  return { items: items.slice(0, limit), hasRelevant: true };
}

/**
 * 判斷官網內容是否「夠強」可單獨作答。
 * 避免只因地名（如「大阪」）命中就誤判為已涵蓋「泳池飯店」這類細節。
 */
function hasStrongSiteCoverage(items, keywords, cards) {
  if (!items?.length) return false;
  const top = items[0];
  if (!top || top.score < 14) return false;

  const card = cards?.[0];
  if (card?.faqHits >= 1) return true;

  const strongKws = (keywords || []).filter((k) => k.length >= 3);
  if (!strongKws.length) return top.score >= 28;

  const post = top.post;
  const title = stripHtml(post?.title?.rendered || "").toLowerCase();
  const meta = getPostMeta(post);
  const metaBlob = `${meta.description} ${meta.keywords} ${meta.qa}`.toLowerCase();
  const bodyHead = getPostPlainBody(post).slice(0, 1200).toLowerCase();

  let strongHits = 0;
  for (const kw of strongKws) {
    if (
      title.includes(kw) ||
      metaBlob.includes(kw) ||
      bodyHead.includes(kw)
    ) {
      strongHits += 1;
    }
  }

  // 至少 2 個有意義關鍵詞命中，或總分很高
  return strongHits >= 2 || top.score >= 30;
}

/**
 * 產出精簡文章知識區塊（動態 WP，省 token）
 * @returns {Promise<{ text: string, hasRelevant: boolean, topScore: number, strongCoverage: boolean }>}
 */
export async function fetchArticleKnowledgeByQuery(
  queryText,
  limit = MAX_ARTICLES,
) {
  const posts = await getPostsForQuery(queryText);
  if (!posts.length) {
    return {
      text: "【WP知識】暫無文章資料",
      hasRelevant: false,
      topScore: 0,
      strongCoverage: false,
    };
  }

  const keywords = queryKeywords(queryText);
  const sorted = posts
    .map((p) => ({ post: p, score: scorePost(p, keywords) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.post?.date || 0) - Date.parse(a.post?.date || 0);
    });

  const { items, hasRelevant } = pickArticles(sorted, limit);

  const header = hasRelevant
    ? `【Jeko官網WP知識｜精準摘錄 n=${posts.length}】優先依此作答並附官網連結；不可臆測未寫內容。`
    : `【Jeko官網WP知識｜無強相關 n=${posts.length}】下列頂多參考；細節請改依【網路資料】或明說官網尚未整理。`;

  const blocks = [];
  const cards = [];
  let remain = PROMPT_BUDGET - header.length;

  items.forEach((item, index) => {
    if (remain < 120) return;
    const share =
      items.length === 1
        ? remain
        : index === 0
          ? Math.floor(remain * 0.72)
          : Math.floor(remain * 0.28);

    const card = formatCompactPost(item.post, {
      keywords,
      budget: Math.max(120, share),
      isPrimary: index === 0,
    });
    cards.push(card);
    blocks.push(card.text);
    remain -= card.text.length + 2;
  });

  const strongCoverage = hasStrongSiteCoverage(items, keywords, cards);
  const topScore = items[0]?.score || 0;

  return {
    text: [header, ...blocks].join("\n\n"),
    hasRelevant: Boolean(hasRelevant),
    topScore,
    strongCoverage,
  };
}

export function clearArticleKnowledgeCache() {
  _postsCache = null;
  _postsCacheAt = 0;
}

export function getArticleKnowledgeCacheInfo() {
  return {
    count: Array.isArray(_postsCache) ? _postsCache.length : 0,
    cachedAt: _postsCacheAt || null,
    ttlMs: CACHE_TTL_MS,
    promptBudget: PROMPT_BUDGET,
    maxArticles: MAX_ARTICLES,
  };
}
