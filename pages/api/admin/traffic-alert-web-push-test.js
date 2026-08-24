/**
 * GET/POST /api/admin/traffic-alert-web-push-test
 * Boss：送一則「流量偏低提醒」Web Push 到指定訂閱（不寫入 last_alert_at）
 *
 * Body: { subscriptionId?, sku?, remainingMb?, totalMb? }
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { enrichUsagePlanRules } from "../../../lib/trafficPlanCatalog";
import { buildLowTrafficWebPayload } from "../../../lib/trafficAlertCopy";
import { resolveTrafficUpsellOffers } from "../../../lib/trafficUpsellLink";
import { sendTrafficWebPush } from "../../../lib/trafficMonitor";

function isVapidConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

function shortEndpoint(endpoint) {
  const ep = String(endpoint || "");
  if (!ep) return "—";
  try {
    const u = new URL(ep);
    return `${u.hostname}…${ep.slice(-10)}`;
  } catch {
    return ep.length > 28 ? `${ep.slice(0, 20)}…` : ep;
  }
}

function subscriptionLabel(row) {
  if (row?.product_label) return row.product_label;
  if (row?.guest_email) return row.guest_email;
  if (row?.iccid) return `ICCID …${String(row.iccid).slice(-6)}`;
  if (row?.topup_id) return `Topup ${String(row.topup_id).slice(0, 8)}…`;
  return shortEndpoint(row?.endpoint);
}

function mapSubscription(row) {
  const endpoint = String(row?.endpoint || "");
  return {
    id: row.id,
    label: subscriptionLabel(row),
    productLabel: row.product_label || null,
    guestEmail: row.guest_email || null,
    monitorEnabled: !!row.monitor_enabled,
    endpointShort: shortEndpoint(endpoint),
    endpointTail: endpoint.slice(-12),
    boundAt: row.iccid_bound_at || row.created_at || null,
  };
}

function sortSubscriptions(rows) {
  return [...rows].sort((a, b) => {
    if (a.monitorEnabled !== b.monitorEnabled) {
      return Number(b.monitorEnabled) - Number(a.monitorEnabled);
    }
    const ta = a.boundAt ? new Date(a.boundAt).getTime() : 0;
    const tb = b.boundAt ? new Date(b.boundAt).getTime() : 0;
    return tb - ta;
  });
}

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  if (req.method === "GET") {
    if (!isVapidConfigured()) {
      return res.status(503).json({
        error: "VAPID 未設定（NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY）",
        vapidConfigured: false,
        subscriptions: [],
      });
    }

    try {
      const supabase = getSupabaseAdminServer();
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select(
          "id, endpoint, product_label, guest_email, iccid, topup_id, monitor_enabled, iccid_bound_at, created_at",
        )
        .order("iccid_bound_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        vapidConfigured: true,
        defaultSubscriptionId:
          process.env.TRAFFIC_ALERT_WEB_PUSH_TEST_SUBSCRIPTION_ID || null,
        subscriptions: sortSubscriptions((data || []).map(mapSubscription)),
      });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "讀取失敗" });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  if (!isVapidConfigured()) {
    return res.status(503).json({ error: "VAPID 未設定" });
  }

  const body = req.body || {};
  const subscriptionId = String(
    body.subscriptionId ||
      process.env.TRAFFIC_ALERT_WEB_PUSH_TEST_SUBSCRIPTION_ID ||
      "",
  ).trim();

  if (!subscriptionId) {
    try {
      const supabase = getSupabaseAdminServer();
      const { data } = await supabase
        .from("push_subscriptions")
        .select(
          "id, endpoint, product_label, guest_email, iccid, topup_id, monitor_enabled, iccid_bound_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(8);
      return res.status(400).json({
        error: "請選擇 subscriptionId，或設定 TRAFFIC_ALERT_WEB_PUSH_TEST_SUBSCRIPTION_ID",
        recentSubscriptions: sortSubscriptions((data || []).map(mapSubscription)),
      });
    } catch {
      return res.status(400).json({
        error: "請選擇 subscriptionId",
      });
    }
  }

  const remainingMb =
    body.remainingMb != null ? Number(body.remainingMb) : 180;
  const totalMb = body.totalMb != null ? Number(body.totalMb) : 1024;
  const checkedAt = new Date().toISOString();

  const enriched = enrichUsagePlanRules({
    productName:
      body.productName ||
      body.sku ||
      "South Korea-Promo-unlimited-5-A0",
    sku: body.sku || "South Korea-Promo-unlimited-5-A0",
    planId: body.planId || null,
    remainingMb,
    totalMb: Number.isFinite(totalMb) ? totalMb : null,
    ruleDesc: body.ruleDesc || null,
    specialDesc: body.specialDesc || null,
    speedDesc: body.speedDesc || null,
  });

  const target = {
    ...enriched,
    product_label: enriched.productName,
    checkedAt,
    isTestPush: true,
  };

  const upsellOffers = resolveTrafficUpsellOffers(enriched);

  try {
    const supabase = getSupabaseAdminServer();
    const { data: sub, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, product_label, guest_email")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (error) throw error;
    if (!sub?.endpoint) {
      return res.status(404).json({
        error: "找不到此 Web Push 訂閱",
        subscriptionId,
      });
    }

    const payload = await buildLowTrafficWebPayload(target);
    const pushResult = await sendTrafficWebPush(sub, payload);

    if (pushResult.gone) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", subscriptionId);
      return res.status(410).json({
        error: "此訂閱已失效（瀏覽器可能已取消通知），已從資料庫移除",
        subscriptionId,
        gone: true,
      });
    }

    if (!pushResult.ok) {
      return res.status(502).json({
        error: pushResult.error || "Web Push 發送失敗",
        subscriptionId,
      });
    }

    let webPush = null;
    try {
      webPush = JSON.parse(payload);
    } catch {
      webPush = null;
    }

    return res.status(200).json({
      ok: true,
      subscriptionId,
      label: subscriptionLabel(sub),
      upsellOffers,
      webPush,
      checkedAt,
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "Web Push 推播失敗",
      subscriptionId,
    });
  }
}
