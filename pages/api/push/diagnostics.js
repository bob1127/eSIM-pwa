/**
 * GET /api/push/diagnostics
 * 開發／維運：檢查推播 + LINE 流量提醒串接狀態
 * 正式環境需 Authorization: Bearer {ADMIN_SECRET|CRON_SECRET} 或 ?secret=
 */
import { createClient } from "@supabase/supabase-js";
import { assertDebugAccess } from "../../../lib/serverEnv";
import { isLineBotConfigured } from "../../../lib/lineBot";
import { getAlertThresholds } from "../../../lib/trafficMonitor";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function tableOk(runQuery) {
  try {
    const { error } = await runQuery();
    if (error) {
      return { ok: false, error: error.message, code: error.code };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  if (!assertDebugAccess(req, res)) return;

  const supabaseAdmin = getSupabaseAdmin();
  const checks = {};

  checks.env = {
    supabase: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    vapid: !!(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    ),
    esimApi: !!(process.env.ESIM_ACCOUNT && process.env.ESIM_SECRET),
    lineBot: isLineBotConfigured(),
    cronSecret: !!(
      process.env.CRON_SECRET || process.env.PUSH_INTERNAL_SECRET
    ),
  };

  checks.thresholds = getAlertThresholds();

  if (!supabaseAdmin) {
    return res.status(200).json({
      ok: false,
      message: "Supabase 未設定",
      checks,
    });
  }

  checks.push_subscriptions = await tableOk(() =>
    supabaseAdmin
      .from("push_subscriptions")
      .select("id, monitor_enabled, topup_id, line_alert_enabled", {
        count: "exact",
      })
      .limit(1),
  );

  const { count: monitorCount } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("monitor_enabled", true);

  checks.boundMonitors = monitorCount ?? 0;

  checks.line_traffic_alerts = await tableOk(() =>
    supabaseAdmin
      .from("line_traffic_alerts")
      .select("id", { count: "exact", head: true }),
  );

  checks.line_oa_friends = await tableOk(() =>
    supabaseAdmin
      .from("line_oa_friends")
      .select("line_user_id", { count: "exact", head: true }),
  );

  const allOk =
    checks.push_subscriptions.ok &&
    checks.line_traffic_alerts.ok &&
    checks.env.supabase &&
    checks.env.vapid;

  return res.status(200).json({
    ok: allOk,
    message: allOk
      ? "推播串接就緒（Cron 每 10 分鐘檢查已綁定 eSIM；偏低冷卻約 8 小時）"
      : "部分項目未就緒，請執行 migration 或設定 env",
    checks,
    migrations: [
      "supabase/migrations/20260608_push_esim_bind.sql",
      "supabase/migrations/20260621_traffic_monitor.sql",
    ],
    cron: "/api/cron/check-traffic",
    cronSchedule: "*/10 * * * *",
  });
}
