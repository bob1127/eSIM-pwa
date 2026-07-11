/**
 * /api/admin/chat-logs
 *
 * GET  ?secret=&page=1&limit=50&q=   → 查詢紀錄（含統計）
 * DELETE ?secret=&before=YYYY-MM-DD  → 刪除某日期前的舊紀錄
 * GET  ?secret=&export=csv            → 匯出 CSV（最多 5000 筆）
 */
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";

function getSecret() {
  return process.env.ADMIN_SECRET || process.env.CRON_SECRET;
}

export default async function handler(req, res) {
  const secret = getSecret();
  if (!secret || req.query.secret !== secret) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const supabase = getSupabaseAdminServer();

  // ── DELETE：刪除指定日期前的舊資料 ───────────────────────────────────────
  if (req.method === "DELETE") {
    const { before } = req.query;
    if (!before) return res.status(400).json({ error: "before date required" });

    const { error, count } = await supabase
      .from("chat_logs")
      .delete({ count: "exact" })
      .lt("created_at", new Date(before).toISOString());

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, deleted: count });
  }

  if (req.method !== "GET") return res.status(405).end();

  const { export: exportFmt, page = "1", limit: limitStr = "50", q = "" } = req.query;

  // ── GET export=csv ────────────────────────────────────────────────────────
  if (exportFmt === "csv") {
    let query = supabase
      .from("chat_logs")
      .select("id,session_id,user_id,guest_id,role,content,provider,created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (q) query = query.ilike("content", `%${q}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = "id,session_id,user_id,guest_id,role,content,provider,created_at";
    const rows = (data || []).map((r) =>
      [
        r.id,
        escape(r.session_id),
        escape(r.user_id),
        escape(r.guest_id),
        escape(r.role),
        escape(r.content),
        escape(r.provider),
        escape(r.created_at),
      ].join(",")
    );
    const csv = [header, ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="chat_logs_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.send("\uFEFF" + csv); // BOM for Excel
  }

  // ── GET 列表 + 統計 ───────────────────────────────────────────────────────
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, parseInt(limitStr, 10) || 50);
  const from = (pageNum - 1) * limitNum;

  let query = supabase
    .from("chat_logs")
    .select("id,session_id,user_id,guest_id,role,content,provider,created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + limitNum - 1);

  if (q) query = query.ilike("content", `%${q}%`);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // 統計：最舊一筆時間 + 行數（給前端顯示備份提醒）
  const { data: oldest } = await supabase
    .from("chat_logs")
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const totalRows = count ?? 0;
  const shouldBackup = totalRows >= 500; // 超過 500 筆提示備份

  return res.status(200).json({
    logs: data || [],
    total: totalRows,
    page: pageNum,
    limit: limitNum,
    oldest: oldest?.created_at || null,
    shouldBackup,
    backupNote: shouldBackup
      ? `目前已有 ${totalRows} 筆紀錄（最早：${oldest?.created_at?.slice(0, 10) || "-"}），建議先匯出 CSV 備份後刪除 3 個月前的舊資料。`
      : null,
  });
}
