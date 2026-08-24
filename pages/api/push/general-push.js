/**
 * GET/POST /api/push/general-push
 * 日常推播（優惠／公告）訂閱開關；與 monitor_enabled 流量提醒獨立。
 *
 * GET  ?endpoint=
 * POST { endpoint, enabled: boolean }
 */
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export default async function handler(req, res) {
  const endpoint = String(
    req.method === "GET"
      ? req.query.endpoint
      : req.body?.endpoint || "",
  ).trim();

  if (!endpoint) {
    return res.status(400).json({ error: "缺少 endpoint" });
  }

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, general_push_enabled")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (error?.message?.includes("general_push_enabled")) {
      return res.status(200).json({
        subscribed: true,
        generalPushEnabled: true,
        legacySchema: true,
      });
    }
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!data) {
      return res.status(200).json({ subscribed: false, generalPushEnabled: false });
    }
    return res.status(200).json({
      subscribed: true,
      generalPushEnabled: data.general_push_enabled !== false,
    });
  }

  if (req.method === "POST") {
    const enabled = Boolean(req.body?.enabled);
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (findErr) {
      return res.status(500).json({ error: findErr.message });
    }
    if (!existing) {
      return res.status(404).json({
        error: "尚未訂閱推播",
        hint: "請先允許瀏覽器通知完成訂閱",
      });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("push_subscriptions")
      .update({ general_push_enabled: enabled })
      .eq("endpoint", endpoint);

    if (updateErr?.message?.includes("general_push_enabled")) {
      return res.status(503).json({
        error: "資料庫尚未套用 general_push_enabled 欄位",
        hint: "請執行 supabase/migrations/20260824_general_push_enabled.sql",
      });
    }
    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    return res.status(200).json({
      ok: true,
      generalPushEnabled: enabled,
      message: enabled
        ? "已開啟日常推播（優惠、公告）"
        : "已關閉日常推播；流量提醒不受影響",
    });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end("Method Not Allowed");
}
