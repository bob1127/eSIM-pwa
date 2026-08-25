/**
 * J寶 FAQ 知識庫（人工審核）— 關鍵字檢索，風格對齊 chatArticles
 */
import { getSupabaseAdminServer } from "./supabaseAdminServer";

const CACHE_TTL_MS = 60_000;
let cache = { at: 0, rows: null };

function tokenizeQuery(q) {
  const raw = String(q || "")
    .toLowerCase()
    .replace(/[^\u4e00-\u9fff\w\s]/g, " ");
  const parts = raw.split(/\s+/).filter((t) => t.length >= 2);
  // 中文：再切 2～3 字元片段
  const chars = String(q || "").replace(/\s+/g, "");
  const grams = [];
  for (let i = 0; i < chars.length; i += 1) {
    if (i + 2 <= chars.length) grams.push(chars.slice(i, i + 2).toLowerCase());
    if (i + 3 <= chars.length) grams.push(chars.slice(i, i + 3).toLowerCase());
  }
  return [...new Set([...parts, ...grams])].slice(0, 40);
}

function splitKeywords(keywords) {
  return String(keywords || "")
    .split(/[,，\s]+/)
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 2);
}

function scoreFaq(row, tokens) {
  const q = String(row.question || "").toLowerCase();
  const a = String(row.answer || "").toLowerCase();
  const kw = splitKeywords(row.keywords);
  let s = 0;
  for (const t of tokens) {
    if (kw.some((k) => k.includes(t) || t.includes(k))) s += 6;
    if (q.includes(t)) s += 4;
    if (a.includes(t)) s += 1;
  }
  // 整句問題高度重疊
  const qRaw = String(row.question || "").trim();
  if (qRaw && String(tokens.join("")).includes(qRaw.slice(0, 8).toLowerCase())) {
    s += 3;
  }
  return s;
}

async function loadFaqRows({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.rows && now - cache.at < CACHE_TTL_MS) {
    return cache.rows;
  }
  try {
    const supabase = getSupabaseAdminServer();
    const { data, error } = await supabase
      .from("ai_faq_entries")
      .select("id, question, answer, keywords, sort_order, hit_count, enabled")
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .limit(500);
    if (error) throw error;
    cache = { at: now, rows: data || [] };
    return cache.rows;
  } catch (err) {
    console.warn("[chatFaqKnowledge] load failed:", err?.message || err);
    return cache.rows || [];
  }
}

export function invalidateFaqKnowledgeCache() {
  cache = { at: 0, rows: null };
}

/**
 * @returns {Promise<{ text: string, hits: Array<{id, question}>, strongCoverage: boolean }>}
 */
export async function fetchFaqKnowledgeByQuery(query, { max = 3 } = {}) {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) {
    return { text: "", hits: [], strongCoverage: false };
  }

  const rows = await loadFaqRows();
  if (!rows.length) {
    return { text: "", hits: [], strongCoverage: false };
  }

  const ranked = rows
    .map((row) => ({ row, s: scoreFaq(row, tokens) }))
    .filter((x) => x.s >= 4)
    .sort((a, b) => b.s - a.s || (a.row.sort_order || 0) - (b.row.sort_order || 0));

  const top = ranked.slice(0, max);
  if (!top.length) {
    return { text: "", hits: [], strongCoverage: false };
  }

  // 非同步累加 hit（不阻塞回覆）
  const ids = top.map((x) => x.row.id);
  Promise.resolve()
    .then(async () => {
      try {
        const supabase = getSupabaseAdminServer();
        for (const id of ids) {
          const row = rows.find((r) => r.id === id);
          await supabase
            .from("ai_faq_entries")
            .update({
              hit_count: (row?.hit_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        }
      } catch {
        /* ignore */
      }
    })
    .catch(() => {});

  const lines = [
    "【人工審核 FAQ 知識庫｜優先依此作答】",
    "以下 Q&A 經客服整理，若與使用者問題相關，請優先依答案說明；可改寫語氣但勿扭曲事實。",
  ];
  for (const { row, s } of top) {
    lines.push(`▸ Q：${row.question}`);
    lines.push(`  A：${row.answer}`);
    lines.push(`  （相關度 ${s}）`);
  }

  return {
    text: lines.join("\n"),
    hits: top.map((x) => ({ id: x.row.id, question: x.row.question })),
    strongCoverage: top[0].s >= 10,
  };
}
