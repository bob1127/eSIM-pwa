/**
 * /api/admin/ai-faq
 * FAQ 知識庫 CRUD + 從 chat_logs 掃描／匯入
 * Auth: Medusa 管理員 Bearer token（與 /admin-boss 相同）
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { invalidateFaqKnowledgeCache } from "../../../lib/chatFaqKnowledge";
import {
  buildFaqCandidatesFromChatLogs,
  buildFaqCandidateFromUserLogId,
} from "../../../lib/aiFaqFromLogs";

function normalizeEntry(body = {}) {
  const question = String(body.question || "").trim();
  const answer = String(body.answer || "").trim();
  const keywords = String(body.keywords || "").trim() || null;
  const source_note = String(body.source_note || "").trim() || null;
  const enabled = body.enabled !== false && body.enabled !== "false";
  const sort_order = Number.isFinite(Number(body.sort_order))
    ? Number(body.sort_order)
    : 0;
  return { question, answer, keywords, source_note, enabled, sort_order };
}

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  let supabase;
  try {
    supabase = getSupabaseAdminServer();
  } catch (err) {
    return res.status(500).json({ error: err.message || "Supabase 未設定" });
  }

  if (req.method === "GET") {
    if (req.query.fromLogs === "1" || req.query.fromLogs === "true") {
      try {
        const result = await buildFaqCandidatesFromChatLogs(supabase, {
          days: req.query.days,
          limit: req.query.limit,
        });
        return res.status(200).json({ ok: true, ...result });
      } catch (err) {
        return res.status(500).json({
          error: err?.message || "掃描失敗",
          hint: err?.message?.includes("chat_logs")
            ? "請確認 chat_logs 資料表存在"
            : undefined,
        });
      }
    }

    if (req.query.userLogId) {
      try {
        const candidate = await buildFaqCandidateFromUserLogId(
          supabase,
          req.query.userLogId,
        );
        if (!candidate) {
          return res.status(404).json({
            error: "找不到可用的用戶提問／AI 回覆配對",
          });
        }
        return res.status(200).json({ ok: true, candidate });
      } catch (err) {
        return res.status(500).json({ error: err?.message || "讀取失敗" });
      }
    }

    const includeDisabled = req.query.all === "1" || req.query.all === "true";
    let query = supabase
      .from("ai_faq_entries")
      .select(
        "id, question, answer, keywords, enabled, sort_order, hit_count, source_note, created_at, updated_at",
      )
      .order("sort_order", { ascending: true })
      .order("id", { ascending: false })
      .limit(300);
    if (!includeDisabled) query = query.eq("enabled", true);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({
        error: error.message,
        hint:
          error.message?.includes("ai_faq_entries") || error.code === "42P01"
            ? "請先執行 migration：20260825_ai_faq_entries.sql"
            : undefined,
      });
    }
    return res.status(200).json({ ok: true, entries: data || [] });
  }

  if (req.method === "POST") {
    if (req.body?.action === "importFromLogs") {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (!items.length) {
        return res.status(400).json({ error: "請選擇至少一筆" });
      }
      const enableOnImport = req.body.enableOnImport === true;
      const rows = items
        .map((it) => {
          const question = String(it.question || "").trim();
          const answer = String(it.answer || "").trim();
          if (!question || !answer) return null;
          return {
            question: question.slice(0, 500),
            answer: answer.slice(0, 4000),
            keywords: String(it.keywords || "").trim() || null,
            source_note:
              String(it.source_note || "").trim() ||
              "自動匯入自 chat_logs",
            enabled: enableOnImport,
            sort_order: 0,
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (!rows.length) {
        return res.status(400).json({ error: "沒有有效的 Q&A" });
      }

      const { data, error } = await supabase
        .from("ai_faq_entries")
        .insert(rows)
        .select("id, question, enabled");
      if (error) return res.status(500).json({ error: error.message });
      invalidateFaqKnowledgeCache();
      return res.status(200).json({
        ok: true,
        imported: data?.length || 0,
        entries: data || [],
        asDraft: !enableOnImport,
      });
    }

    const entry = normalizeEntry(req.body || {});
    if (!entry.question || !entry.answer) {
      return res.status(400).json({ error: "請填 question 與 answer" });
    }
    const { data, error } = await supabase
      .from("ai_faq_entries")
      .insert({
        ...entry,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    invalidateFaqKnowledgeCache();
    return res.status(200).json({ ok: true, entry: data });
  }

  if (req.method === "PUT") {
    const id = Number(req.body?.id || req.query?.id);
    if (!id) return res.status(400).json({ error: "缺少 id" });
    const entry = normalizeEntry(req.body || {});
    if (!entry.question || !entry.answer) {
      return res.status(400).json({ error: "請填 question 與 answer" });
    }
    const { data, error } = await supabase
      .from("ai_faq_entries")
      .update({
        ...entry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    invalidateFaqKnowledgeCache();
    return res.status(200).json({ ok: true, entry: data });
  }

  if (req.method === "DELETE") {
    const id = Number(req.body?.id || req.query?.id);
    if (!id) return res.status(400).json({ error: "缺少 id" });
    const { error } = await supabase.from("ai_faq_entries").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    invalidateFaqKnowledgeCache();
    return res.status(200).json({ ok: true, deleted: id });
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).end("Method Not Allowed");
}
