/**
 * POST /api/chat/log
 * 儲存對話訊息到 chat_logs（寫入前過濾無效／快捷／preset／規劃表單題）。
 * body: { sessionId, userId?, guestId?, messages: [{role,content,provider?}] }
 */
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { checkOrigin } from "../../../lib/chatSecurity";
import { filterChatLogMessagesForPersist } from "../../../lib/chatLogFilter";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!checkOrigin(req)) return res.status(403).end();

  const { sessionId, userId, guestId, messages } = req.body || {};
  if (!sessionId || !Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "invalid payload" });
  }

  try {
    const filtered = filterChatLogMessagesForPersist(messages);
    if (!filtered.length) {
      return res.status(200).json({ ok: true, saved: 0, skipped: messages.length });
    }

    const supabase = getSupabaseAdminServer();
    const rows = filtered.map((m) => ({
      session_id: String(sessionId).slice(0, 64),
      user_id: userId || null,
      guest_id: guestId ? String(guestId).slice(0, 64) : null,
      role: ["user", "ai", "agent"].includes(m.role) ? m.role : "user",
      content: String(m.content).slice(0, 4000),
      provider: m.provider ? String(m.provider).slice(0, 32) : null,
    }));

    const { error } = await supabase.from("chat_logs").insert(rows);
    if (error) {
      console.warn("[chat/log]", error.message);
    }
    return res.status(200).json({
      ok: true,
      saved: rows.length,
      skipped: Math.max(0, messages.length - rows.length),
    });
  } catch (e) {
    console.error("[chat/log]", e.message);
    return res.status(500).json({ error: "log failed" });
  }
}
