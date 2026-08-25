/**
 * GET/POST /api/admin/traffic-alert-web-push-test
 * Boss：送一則「流量偏低提醒」Web Push（不寫入 last_alert_at）
 *
 * Body: { subscriptionId?, sendAll?, sku?, remainingMb?, totalMb? }
 * sendAll: true → 發給最近 N 筆 push_subscriptions（並行＋單筆逾時，避免卡死）
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { enrichUsagePlanRules } from "../../../lib/trafficPlanCatalog";
import { buildLowTrafficWebPayload } from "../../../lib/trafficAlertCopy";
import { resolveTrafficUpsellOffers } from "../../../lib/trafficUpsellLink";
import { sendTrafficWebPush } from "../../../lib/trafficMonitor";

/** 全部發送：最多處理筆數（避免一次掃全表卡住） */
const SEND_ALL_LIMIT = 40;
/** 並行數 */
const SEND_ALL_CONCURRENCY = 5;
/** 單筆推播逾時（失效 endpoint 常會掛很久） */
const SEND_PUSH_TIMEOUT_MS = 8000;

function isVapidConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

async function mapPool(items, concurrency, worker) {
  const list = items || [];
  const limit = Math.max(1, Math.min(concurrency || 1, list.length || 1));
  const results = new Array(list.length);
  let next = 0;

  async function run() {
    while (next < list.length) {
      const i = next++;
      results[i] = await worker(list[i], i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => run()));
  return results;
}

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, error: `timeout ${ms}ms`, timeout: true });
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        resolve({ ok: false, error: err?.message || "push error" });
      });
  });
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
  const sendAll = body.sendAll === true || body.sendAll === "true";
  const subscriptionId = String(
    body.subscriptionId ||
      process.env.TRAFFIC_ALERT_WEB_PUSH_TEST_SUBSCRIPTION_ID ||
      "",
  ).trim();

  if (!sendAll && !subscriptionId) {
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
    const payload = await buildLowTrafficWebPayload(target);

    let webPush = null;
    try {
      webPush = JSON.parse(payload);
    } catch {
      webPush = null;
    }

    if (sendAll) {
      const { data: subs, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, product_label, guest_email")
        .order("created_at", { ascending: false })
        .limit(SEND_ALL_LIMIT);

      if (error) throw error;
      if (!subs?.length) {
        return res.status(200).json({
          ok: true,
          sendAll: true,
          total: 0,
          sent: 0,
          failed: 0,
          removed: 0,
          timedOut: 0,
          limit: SEND_ALL_LIMIT,
          upsellOffers,
          webPush,
          checkedAt,
          message: "無 Web Push 訂閱",
        });
      }

      const results = await mapPool(
        subs,
        SEND_ALL_CONCURRENCY,
        async (sub) => {
          if (!sub?.endpoint) return { status: "failed", id: sub?.id };
          const pushResult = await withTimeout(
            sendTrafficWebPush(sub, payload),
            SEND_PUSH_TIMEOUT_MS,
          );
          if (pushResult.ok) return { status: "sent", id: sub.id };
          if (pushResult.gone) return { status: "gone", id: sub.id };
          if (pushResult.timeout) return { status: "timeout", id: sub.id };
          return { status: "failed", id: sub.id };
        },
      );

      const goneIds = results
        .filter((r) => r?.status === "gone" && r.id)
        .map((r) => r.id);
      const sent = results.filter((r) => r?.status === "sent").length;
      const failed = results.filter((r) => r?.status === "failed").length;
      const timedOut = results.filter((r) => r?.status === "timeout").length;

      if (goneIds.length) {
        await supabase.from("push_subscriptions").delete().in("id", goneIds);
      }

      return res.status(200).json({
        ok: true,
        sendAll: true,
        total: subs.length,
        sent,
        failed,
        timedOut,
        removed: goneIds.length,
        limit: SEND_ALL_LIMIT,
        upsellOffers,
        webPush,
        checkedAt,
      });
    }

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
      subscriptionId: sendAll ? undefined : subscriptionId,
      sendAll: sendAll || undefined,
    });
  }
}
