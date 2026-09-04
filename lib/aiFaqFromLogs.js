/**
 * 從 chat_logs 配對「用戶提問 → 下一則 AI 回覆」供 FAQ 匯入
 * 只收「手打完整問題」；略過快捷按鈕、型號關鍵字、模板答。
 */
import {
  isNoiseUserMessage,
  isQuickOrPresetProvider,
  isUsableAiAnswer,
} from "./chatLogFilter";

function normalizeQuestionKey(q) {
  return String(q || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\u4e00-\u9fff\w]/g, "")
    .slice(0, 80);
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
