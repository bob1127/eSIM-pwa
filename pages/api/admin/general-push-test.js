/**
 * GET/POST /api/admin/general-push-test
 * Boss：一般推播（general_push_enabled）實機測試
 * 對應「有開推播／流量提醒設定，但未綁 eSIM」這類訂閱。
 *
 * GET  → 列出 general_push_enabled 訂閱（優先未綁 eSIM）
 * POST → { subscriptionId?, sendAll?, title?, body?, url? }
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { sendTrafficWebPush } from "../../../lib/trafficMonitor";

const SEND_ALL_LIMIT = 40;
const SEND_ALL_CONCURRENCY = 5;
const SEND_PUSH_TIMEOUT_MS = 8000;

const DEFAULT_TITLE = "Jeko eSIM 通知測試";
const DEFAULT_BODY =
  "這是一般推播測試（無需綁定 eSIM）。若你看得到這則，日常優惠／公告推播已通。";
const DEFAULT_URL = "/";

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

/** 粗略判斷裝置／瀏覽器（方便 Boss 選手機訂閱） */
function deviceHint(endpoint) {
  const ep = String(endpoint || "").toLowerCase();
  if (ep.includes("web.push.apple.com")) return "Apple／iPhone";
  if (ep.includes("fcm.googleapis.com") || ep.includes("android.googleapis.com")) {
    return "FCM／Android・Chrome";
  }
  if (ep.includes("updates.push.services.mozilla.com")) return "Firefox";
  if (ep.includes("notify.windows.com")) return "Windows";
  return "其他";
}

function hasEsimBound(row) {
  return !!(row?.iccid || row?.topup_id);
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
  const bound = hasEsimBound(row);
  const hint = deviceHint(endpoint);
  return {
    id: row.id,
    label: subscriptionLabel(row),
    deviceHint: hint,
    generalPushEnabled: row.general_push_enabled !== false,
    monitorEnabled: !!row.monitor_enabled,
    hasEsimBound: bound,
    unbound: !bound,
    endpointShort: shortEndpoint(endpoint),
    endpointTail: endpoint.slice(-12),
    createdAt: row.created_at || null,
  };
}

function sortSubscriptions(rows) {
  return [...rows].sort((a, b) => {
    // 未綁 eSIM 優先（本頁要測的對象）
    if (a.unbound !== b.unbound) return Number(b.unbound) - Number(a.unbound);
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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
        error: "VAPID 未設定",
        vapidConfigured: false,
        subscriptions: [],
      });
    }

    try {
      const supabase = getSupabaseAdminServer();
      let { data, error } = await supabase
        .from("push_subscriptions")
        .select(
          "id, endpoint, product_label, guest_email, iccid, topup_id, monitor_enabled, general_push_enabled, created_at",
        )
        .eq("general_push_enabled", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error?.message?.includes("general_push_enabled")) {
        const legacy = await supabase
          .from("push_subscriptions")
          .select(
            "id, endpoint, product_label, guest_email, iccid, topup_id, monitor_enabled, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(30);
        data = (legacy.data || []).map((r) => ({
          ...r,
          general_push_enabled: true,
        }));
        error = legacy.error;
      }

      if (error) throw error;

      const mapped = sortSubscriptions((data || []).map(mapSubscription));
      return res.status(200).json({
        ok: true,
        vapidConfigured: true,
        unboundCount: mapped.filter((s) => s.unbound).length,
        subscriptions: mapped,
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
  const unboundOnly =
    body.unboundOnly === true || body.unboundOnly === "true";
  const subscriptionId = String(body.subscriptionId || "").trim();
  const title = String(body.title || "").trim() || DEFAULT_TITLE;
  const pushBody = String(body.body || "").trim() || DEFAULT_BODY;
  let url = String(body.url || DEFAULT_URL).trim() || DEFAULT_URL;
  if (!url.startsWith("http") && !url.startsWith("/")) url = `/${url}`;

  const payloadObj = {
    title,
    body: pushBody,
    url,
    icon: "/images/Logo/icon-192.png",
    badge: "/images/Logo/icon-192.png",
    tag: "jeko-general-push-test",
    renotify: true,
  };
  const payload = JSON.stringify(payloadObj);

  try {
    const supabase = getSupabaseAdminServer();

    if (sendAll) {
      let query = supabase
        .from("push_subscriptions")
        .select(
          "id, endpoint, p256dh, auth, iccid, topup_id, general_push_enabled, guest_email, product_label",
        )
        .eq("general_push_enabled", true)
        .order("created_at", { ascending: false })
        .limit(SEND_ALL_LIMIT);

      let { data: subs, error } = await query;

      if (error?.message?.includes("general_push_enabled")) {
        const legacy = await supabase
          .from("push_subscriptions")
          .select(
            "id, endpoint, p256dh, auth, iccid, topup_id, guest_email, product_label",
          )
          .order("created_at", { ascending: false })
          .limit(SEND_ALL_LIMIT);
        subs = legacy.data;
        error = legacy.error;
      }
      if (error) throw error;

      let list = subs || [];
      if (unboundOnly) {
        list = list.filter((s) => !hasEsimBound(s));
      }

      if (!list.length) {
        return res.status(200).json({
          ok: true,
          sendAll: true,
          unboundOnly,
          total: 0,
          sent: 0,
          failed: 0,
          removed: 0,
          timedOut: 0,
          webPush: payloadObj,
          message: unboundOnly
            ? "無「已開一般推播且未綁 eSIM」的訂閱"
            : "無已開啟一般推播的訂閱",
        });
      }

      const results = await mapPool(
        list,
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
      if (goneIds.length) {
        await supabase.from("push_subscriptions").delete().in("id", goneIds);
      }

      return res.status(200).json({
        ok: true,
        sendAll: true,
        unboundOnly,
        total: list.length,
        sent: results.filter((r) => r?.status === "sent").length,
        failed: results.filter((r) => r?.status === "failed").length,
        timedOut: results.filter((r) => r?.status === "timeout").length,
        removed: goneIds.length,
        limit: SEND_ALL_LIMIT,
        webPush: payloadObj,
      });
    }

    if (!subscriptionId) {
      return res.status(400).json({ error: "請選擇 subscriptionId" });
    }

    const { data: sub, error } = await supabase
      .from("push_subscriptions")
      .select(
        "id, endpoint, p256dh, auth, product_label, guest_email, iccid, topup_id, general_push_enabled",
      )
      .eq("id", subscriptionId)
      .maybeSingle();

    if (error) throw error;
    if (!sub?.endpoint) {
      return res.status(404).json({ error: "找不到此 Web Push 訂閱" });
    }

    if (sub.general_push_enabled === false) {
      return res.status(400).json({
        error: "此訂閱未開啟一般推播（general_push_enabled=false）",
        hint: "請在首頁開啟日常推播，或選其他訂閱",
      });
    }

    const pushResult = await sendTrafficWebPush(sub, payload);

    if (pushResult.gone) {
      await supabase.from("push_subscriptions").delete().eq("id", subscriptionId);
      return res.status(410).json({
        error: "此訂閱已失效，已從資料庫移除",
        gone: true,
      });
    }

    if (!pushResult.ok) {
      return res.status(502).json({
        error: pushResult.error || "Web Push 發送失敗",
      });
    }

    return res.status(200).json({
      ok: true,
      subscriptionId,
      label: subscriptionLabel(sub),
      unbound: !hasEsimBound(sub),
      webPush: payloadObj,
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "一般推播測試失敗",
    });
  }
}
