/**
 * GET /api/admin/traffic-alert-stats
 * Boss：目前開啟流量提醒人數（LINE／手機 PWA／網頁）
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";

function classifyWebEndpoint(endpoint) {
  const ep = String(endpoint || "").toLowerCase();
  // iOS Safari／加到主畫面的 PWA 走 Apple Push
  if (ep.includes("web.push.apple.com")) return "mobilePwa";
  // Chrome／Edge／Android（含桌機與手機，無 UA 時無法再細分）
  if (
    ep.includes("fcm.googleapis.com") ||
    ep.includes("android.googleapis.com") ||
    ep.includes("updates.push.services.mozilla.com") ||
    ep.includes("notify.windows.com")
  ) {
    return "web";
  }
  return "web";
}

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const supabase = getSupabaseAdminServer();

    // LINE：以 line_user_id 計「人」
    let linePeople = 0;
    let lineRows = 0;
    {
      const { data, error } = await supabase
        .from("line_traffic_alerts")
        .select("line_user_id")
        .eq("monitor_enabled", true)
        .or("topup_id.not.is.null,iccid.not.is.null");

      if (
        !error ||
        !(
          error.message?.includes("does not exist") ||
          error.code === "42P01"
        )
      ) {
        if (error) throw error;
        const ids = new Set(
          (data || [])
            .map((r) => String(r.line_user_id || "").trim())
            .filter(Boolean),
        );
        linePeople = ids.size;
        lineRows = (data || []).length;
      }
    }

    // Web Push：monitor_enabled + 已綁 eSIM（與 Cron 同一條件）
    let mobilePwa = 0;
    let webBrowser = 0;
    let webPushTotal = 0;
    let generalPushEnabled = 0;
    let webPushUnboundMonitor = 0;

    {
      let { data, error } = await supabase
        .from("push_subscriptions")
        .select(
          "endpoint, monitor_enabled, general_push_enabled, iccid, topup_id",
        );

      if (error?.message?.includes("general_push_enabled")) {
        const legacy = await supabase
          .from("push_subscriptions")
          .select("endpoint, monitor_enabled, iccid, topup_id");
        data = (legacy.data || []).map((r) => ({
          ...r,
          general_push_enabled: true,
        }));
        error = legacy.error;
      }
      if (error) throw error;

      for (const row of data || []) {
        if (row.general_push_enabled !== false) generalPushEnabled += 1;

        if (!row.monitor_enabled) continue;
        const bound = !!(row.iccid || row.topup_id);
        if (!bound) {
          webPushUnboundMonitor += 1;
          continue;
        }
        webPushTotal += 1;
        const kind = classifyWebEndpoint(row.endpoint);
        if (kind === "mobilePwa") mobilePwa += 1;
        else webBrowser += 1;
      }
    }

    return res.status(200).json({
      ok: true,
      checkedAt: new Date().toISOString(),
      line: {
        people: linePeople,
        rows: lineRows,
        label: "LINE",
      },
      webPush: {
        mobilePwa,
        webBrowser,
        total: webPushTotal,
        unboundMonitor: webPushUnboundMonitor,
        labels: {
          mobilePwa: "手機 PWA（Apple）",
          webBrowser: "網頁／Android Chrome",
        },
      },
      generalPushEnabled,
      totalAlertPeopleApprox: linePeople + webPushTotal,
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "統計失敗",
    });
  }
}
