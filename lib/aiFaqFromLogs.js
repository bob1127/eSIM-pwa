/**
 * 從 chat_logs 配對「用戶提問 → 下一則 AI 回覆」供 FAQ 匯入
 * 只收「手打完整問題」；略過快捷按鈕、型號關鍵字、模板答。
 */
import { isAiChatQuickButtonQuestion } from "./aiChatPresets";

function normalizeQuestionKey(q) {
  return String(q || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\u4e00-\u9fff\w]/g, "")
    .slice(0, 80);
}

/** 純裝置型號／型號關鍵字（例：iPhone 15pro），非完整問題 */
function isDeviceModelOnlyQuestion(content) {
  const t = String(content || "").trim();
  if (!t || t.length > 40) return false;
  if (
    /^(iphone|ipad|ipod|pixel|galaxy|samsung|xiaomi|redmi|oppo|vivo|huawei|sony|asus|rog|nothing)\b[\w\s.+-]{0,28}$/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/^(小米|紅米|華為|三星|索尼|蘋果)[\w\s\d.+-]{0,20}$/u.test(t)) return true;
  return false;
}

/** 過短、像點選／關鍵字碎片（無問句結構） */
function isKeywordFragmentQuestion(content) {
  const t = String(content || "").trim();
  const hasCue =
    /[?？]|嗎|呢|怎麼|如何|什麼|為何|為什麼|能不能|可不可以|是否|哪[裡裏個天]|有沒有|多久|幾天|怎辦|怎麼辦|失敗|錯誤|沒訊號|連不上|打不開|收不到|要怎|裝不了|開不了|用不了/.test(
      t,
    );
  // 有問句／狀況語氣 → 視為手打問題
  if (hasCue) return false;
  // 無語氣：短關鍵字／半句略過（例：iPhone 15pro；長句仍可能是陳述句，≥18 字保留）
  return t.length < 18;
}

function isQuickOrPresetProvider(provider) {
  const p = String(provider || "")
    .trim()
    .toLowerCase();
  return p === "preset" || p === "quick";
}

function isNoiseUserMessage(content, provider) {
  const t = String(content || "").trim();
  if (t.length < 4) return true;
  if (t.length > 500) return true;
  if (isQuickOrPresetProvider(provider)) return true;
  // 純問候／無意義
  if (/^(嗨|你好|您好|hi|hello|hey|在嗎|哈囉)[!！.。\s]*$/i.test(t)) return true;
  // 看起來像整段系統歡迎語被誤標
  if (t.includes("先選你想了解的服務") || t.includes("嗨！我是 J寶")) return true;
  // 「幫你規劃」點選表單產生的結構化提問（不適合當 FAQ；商品庫已動態推薦）
  if (
    t.includes("請幫我推薦適合的 eSIM") ||
    t.includes("【eSIM專推】") ||
    (t.includes("旅遊地點：") && t.includes("使用習慣："))
  ) {
    return true;
  }
  // J寶 聊天室小按鈕／快捷關鍵字（點選，非手打）
  if (isAiChatQuickButtonQuestion(t)) return true;
  if (isDeviceModelOnlyQuestion(t)) return true;
  if (isKeywordFragmentQuestion(t)) return true;
  return false;
}

function isUsableAiAnswer(content) {
  const t = String(content || "").trim();
  if (t.length < 12) return false;
  if (t.includes("超出我的服務範圍")) return false;
  if (t.includes("服務暫時不可用")) return false;
  // 舊模板／機器人開頭（常伴隨點選題或型號關鍵字）
  if (/^🤖/.test(t)) return false;
  if (/^您使用的是\s/.test(t)) return false;
  if (/^安裝 eSIM 時遇到問題嗎/.test(t)) return false;
  return true;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ days?: number, limit?: number }} opts
 */
export async function buildFaqCandidatesFromChatLogs(supabase, opts = {}) {
  const days = Math.min(90, Math.max(1, Number(opts.days) || 14));
  const limit = Math.min(80, Math.max(5, Number(opts.limit) || 40));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: existingFaq, error: faqErr } = await supabase
    .from("ai_faq_entries")
    .select("question")
    .limit(500);
  if (faqErr && !String(faqErr.message || "").includes("ai_faq_entries")) {
    throw faqErr;
  }
  const existingKeys = new Set(
    (existingFaq || []).map((r) => normalizeQuestionKey(r.question)),
  );

  const { data: userLogs, error: userErr } = await supabase
    .from("chat_logs")
    .select("id, session_id, content, created_at, provider")
    .eq("role", "user")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(300);

  if (userErr) throw userErr;

  const candidates = [];
  const seenQ = new Set();

  for (const user of userLogs || []) {
    if (candidates.length >= limit) break;
    if (isNoiseUserMessage(user.content, user.provider)) continue;

    const qKey = normalizeQuestionKey(user.content);
    if (!qKey || seenQ.has(qKey) || existingKeys.has(qKey)) continue;

    const { data: aiRows, error: aiErr } = await supabase
      .from("chat_logs")
      .select("id, content, created_at, provider")
      .eq("session_id", user.session_id)
      .eq("role", "ai")
      .gte("created_at", user.created_at)
      .order("created_at", { ascending: true })
      .limit(1);

    if (aiErr) throw aiErr;
    const ai = aiRows?.[0];
    if (!ai || !isUsableAiAnswer(ai.content)) continue;
    // preset／quick＝小按鈕點選，略過
    if (isQuickOrPresetProvider(ai.provider)) continue;

    seenQ.add(qKey);
    candidates.push({
      question: String(user.content).trim().slice(0, 500),
      answer: String(ai.content).trim().slice(0, 4000),
      userLogId: user.id,
      aiLogId: ai.id,
      sessionId: user.session_id,
      createdAt: user.created_at,
      provider: ai.provider || null,
      source_note: `自動匯入自 chat_logs #${user.id} → AI #${ai.id}`,
    });
  }

  return {
    days,
    scannedUsers: (userLogs || []).length,
    candidates,
  };
}

/**
 * 單筆：依 user log id 找下一則 AI 回覆
 */
export async function buildFaqCandidateFromUserLogId(supabase, userLogId) {
  const id = Number(userLogId);
  if (!id) return null;

  const { data: user, error } = await supabase
    .from("chat_logs")
    .select("id, session_id, content, created_at, role, provider")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!user || user.role !== "user") return null;
  if (isNoiseUserMessage(user.content, user.provider)) return null;

  const { data: aiRows, error: aiErr } = await supabase
    .from("chat_logs")
    .select("id, content, created_at, provider")
    .eq("session_id", user.session_id)
    .eq("role", "ai")
    .gte("created_at", user.created_at)
    .order("created_at", { ascending: true })
    .limit(1);
  if (aiErr) throw aiErr;
  const ai = aiRows?.[0];
  if (!ai || !isUsableAiAnswer(ai.content)) return null;
  if (isQuickOrPresetProvider(ai.provider)) return null;

  return {
    question: String(user.content).trim().slice(0, 500),
    answer: String(ai.content).trim().slice(0, 4000),
    userLogId: user.id,
    aiLogId: ai.id,
    sessionId: user.session_id,
    createdAt: user.created_at,
    provider: ai.provider || null,
    source_note: `自動匯入自 chat_logs #${user.id} → AI #${ai.id}`,
  };
}
