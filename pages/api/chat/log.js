/**
 * POST /api/chat/log
 * 儲存對話訊息到 chat_logs。
 * body: { sessionId, userId?, guestId?, messages: [{role,content,provider?}] }
 */
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { checkOrigin } from "../../../lib/chatSecurity";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!checkOrigin(req)) return res.status(403).end();

  const { sessionId, userId, guestId, messages } = req.body || {};
  if (!sessionId || !Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "invalid payload" });
  }

  try {
    const supabase = getSupabaseAdminServer();
    const rows = messages
      .filter((m) => m?.role && m?.content)
      .map((m) => ({
        session_id: String(sessionId).slice(0, 64),
        user_id:    userId   || null,
        guest_id:   guestId  ? String(guestId).slice(0, 64) : null,
        role:       ["user", "ai", "agent"].includes(m.role) ? m.role : "user",
        content:    String(m.content).slice(0, 4000),
        provider:   m.provider ? String(m.provider).slice(0, 32) : null,
      }));

    const { error } = await supabase.from("chat_logs").insert(rows);
    if (error) {
      // 若 table 尚未建立，靜默失敗（不影響聊天功能）
      console.warn("[chat/log]", error.message);
    }
    return res.status(200).json({ ok: true, saved: rows.length });
  } catch (e) {
    console.error("[chat/log]", e.message);
    return res.status(500).json({ error: "log failed" });
  }
}
