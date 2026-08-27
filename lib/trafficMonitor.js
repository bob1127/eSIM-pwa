import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { queryEsimUsage } from "./esimUsageService";
import { pushLineMessage, isLineBotConfigured } from "./lineBot";
import {
  buildLowTrafficWebPayload,
  buildLowTrafficLineText,
  buildLowTrafficLineMessages,
} from "./trafficAlertCopy";
import { resolveTrafficPlanProfile } from "./trafficPlanProfile";
import { resolveTrafficUpsellOffers } from "./trafficUpsellLink";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getAlertThresholds() {
  return {
    pct: Number(process.env.TRAFFIC_ALERT_THRESHOLD_PCT || 20),
    mb: Number(process.env.TRAFFIC_ALERT_THRESHOLD_MB || 500),
    // 預設 12 小時：偏低狀態下同一張卡一天約提醒 2 次
    cooldownHours: Number(process.env.TRAFFIC_ALERT_COOLDOWN_HOURS || 12),
    /** 效期剩餘幾小時內發「使用期限」提醒（吃到飽／無剩餘數值時） */
    expiryHours: Number(process.env.TRAFFIC_ALERT_EXPIRY_HOURS || 24),
  };
}

/** 解析供應商效期字串（多為 Asia/Taipei 無時區） */
export function parseExpiryTimestamp(expiresAt) {
  const s = String(expiresAt || "").trim();
  if (!s) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  }
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const t = Date.parse(`${normalized}+08:00`);
  return Number.isFinite(t) ? t : null;
}

/** 是否應發送低流量提醒 */
export function shouldSendTrafficAlert({
  remainingMb,
  totalMb,
  lastAlertAt,
  lastRemainingMb,
}) {
  if (remainingMb == null || Number.isNaN(Number(remainingMb))) return false;

  const { pct, mb, cooldownHours } = getAlertThresholds();
  const remaining = Number(remainingMb);
  const total = totalMb != null ? Number(totalMb) : null;

  let isLow = false;
  if (total && total > 0) {
    isLow = (remaining / total) * 100 <= pct;
  } else {
    isLow = remaining <= mb;
  }
  if (!isLow) return false;

  if (lastAlertAt) {
    const hoursSince =
      (Date.now() - new Date(lastAlertAt).getTime()) / 3600000;
    if (hoursSince < cooldownHours) {
      const prev = lastRemainingMb != null ? Number(lastRemainingMb) : null;
      if (prev == null || remaining >= prev * 0.85) return false;
    }
  }
  return true;
}

/**
 * 吃到飽／無剩餘 MB：改提醒使用期限
 * @returns {boolean}
 */
export function shouldSendExpiryAlert({
  expiresAt,
  lastAlertAt,
  productName,
  remainingMb,
  totalMb,
}) {
  // 有明確剩餘／總量的固定流量方案，仍走偏低邏輯，不重複用效期取代
  if (
    remainingMb != null &&
    Number.isFinite(Number(remainingMb)) &&
    totalMb != null &&
    Number(totalMb) > 0
  ) {
    return false;
  }

  const endMs = parseExpiryTimestamp(expiresAt);
  if (endMs == null) return false;

  const hoursLeft = (endMs - Date.now()) / 3600000;
  if (hoursLeft < 0) return false; // 已過期不再推

  const { expiryHours, cooldownHours } = getAlertThresholds();
  const windowH =
    Number.isFinite(expiryHours) && expiryHours > 0 ? expiryHours : 24;
  if (hoursLeft > windowH) return false;

  // 名稱明顯為吃到飽／不限，或本來就沒有剩餘數值
  const name = String(productName || "");
  const looksUnlimited = /吃到飽|不限流量|unlimited|無限/i.test(name);
  if (
    !looksUnlimited &&
    remainingMb != null &&
    Number.isFinite(Number(remainingMb))
  ) {
    // 有剩餘但無總量：可能是異常資料，仍允許效期提醒
  }

  if (lastAlertAt) {
    const hoursSince =
      (Date.now() - new Date(lastAlertAt).getTime()) / 3600000;
    if (hoursSince < cooldownHours) return false;
  }
  return true;
}

export { buildLowTrafficWebPayload, buildLowTrafficLineText, buildLowTrafficLineMessages };

export async function sendTrafficWebPush(subscription, payload) {
  if (
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
  ) {
    return { ok: false, error: "VAPID 未設定" };
  }
  webpush.setVapidDetails(
    "mailto:bob112722761236tom@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      gone: err.statusCode === 410 || err.statusCode === 404,
    };
  }
}

async function fetchPushTargets(supabaseAdmin) {
  const attempts = [
    {
      select:
        "id, endpoint, p256dh, auth, topup_id, iccid, line_user_id, line_alert_enabled, last_alert_at, last_remaining_mb",
      filterMonitor: true,
    },
    {
      select:
        "id, endpoint, p256dh, auth, topup_id, iccid, last_alert_at, last_remaining_mb",
      filterMonitor: true,
    },
    {
      select: "id, endpoint, p256dh, auth, topup_id, iccid",
      filterMonitor: true,
    },
    {
      select: "id, endpoint, p256dh, auth, topup_id, iccid",
      filterMonitor: false,
    },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    let query = supabaseAdmin.from("push_subscriptions").select(attempt.select);
    if (attempt.filterMonitor) {
      query = query.eq("monitor_enabled", true);
    }
    query = query.or("topup_id.not.is.null,iccid.not.is.null");
    const { data, error } = await query;
    if (!error) return { data, error: null };
    lastError = error;
    if (!error.message?.includes("does not exist")) break;
  }

  return { data: null, error: lastError };
}

async function fetchLineTargets(supabaseAdmin) {
  const { data, error } = await supabaseAdmin
    .from("line_traffic_alerts")
    .select(
      "id, line_user_id, topup_id, iccid, product_label, last_alert_at, last_remaining_mb",
    )
    .eq("monitor_enabled", true)
    .or("topup_id.not.is.null,iccid.not.is.null");

  if (
    error?.message?.includes("does not exist") ||
    error?.message?.includes("Could not find the table") ||
    error?.code === "42P01"
  ) {
    return { data: [], error: null };
  }
  return { data, error };
}

async function isLineFriend(supabaseAdmin, lineUserId) {
  if (!lineUserId) return false;
  const { data, error } = await supabaseAdmin
    .from("line_oa_friends")
    .select("line_user_id, unfollowed_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error?.message?.includes("does not exist")) return true;
  return !!(data && !data.unfollowed_at);
}

async function checkOneTarget(supabaseAdmin, target, table) {
  const topupId = target.topup_id;
  const iccid = target.iccid;
  if (!topupId && !iccid) {
    return { skipped: true, reason: "no_topup_or_iccid" };
  }

  const usage = await queryEsimUsage({ topupId, iccid });
  const now = new Date().toISOString();
  const updateBase = {
    last_checked_at: now,
    last_remaining_mb: usage.ok ? usage.data?.remainingMb : null,
  };

  const { error: checkUpdateErr } = await supabaseAdmin
    .from(table)
    .update(updateBase)
    .eq("id", target.id);
  if (checkUpdateErr?.message?.includes("does not exist")) {
    await supabaseAdmin
      .from(table)
      .update({ last_remaining_mb: updateBase.last_remaining_mb })
      .eq("id", target.id);
  }

  if (!usage.ok) {
    return { checked: true, alert: false, error: usage.error };
  }

  const usageData = usage.data || {};
  const productName = usageData.productName || target.product_label;
  const alertBase = {
    remainingMb: usageData.remainingMb,
    totalMb: usageData.totalMb,
    usedMb: usageData.usedMb,
    expiresAt: usageData.expiresAt || null,
    productName,
    sku: usageData.sku || null,
    planId: usageData.planId || null,
    ruleDesc: usageData.ruleDesc || null,
    specialDesc: usageData.specialDesc || null,
    speedDesc: usageData.speedDesc || null,
    lastAlertAt: target.last_alert_at,
    lastRemainingMb: target.last_remaining_mb,
  };

  let alertKind = null;
  if (shouldSendTrafficAlert(alertBase)) {
    alertKind = "traffic";
  } else if (shouldSendExpiryAlert(alertBase)) {
    alertKind = "expiry";
  }

  if (!alertKind) {
    return {
      checked: true,
      alert: false,
      remainingMb: usageData.remainingMb,
      usedMb: usageData.usedMb,
      expiresAt: usageData.expiresAt || null,
    };
  }

  const results = {
    checked: true,
    alert: true,
    alertKind,
    web: false,
    line: false,
  };
  const messageTarget = {
    ...alertBase,
    product_label: target.product_label,
    checkedAt: now,
    planKind: alertKind === "expiry" ? "expiry" : undefined,
    alertKind,
  };

  // 組文案前先解析方案類型，寫入 log 方便確認推對 FUP／固定流量／效期
  try {
    const profile =
      alertKind === "expiry"
        ? { kind: "expiry", highSpeedQuotaLabel: null, throttleSpeedLabel: null }
        : resolveTrafficPlanProfile(messageTarget);
    const upsellOffers = resolveTrafficUpsellOffers(messageTarget);
    results.planKind = profile.kind;
    results.highSpeedQuota = profile.highSpeedQuotaLabel;
    results.throttleSpeed = profile.throttleSpeedLabel;
    results.upsellOffers = upsellOffers;
    console.info("[trafficMonitor] alert profile", {
      id: target.id,
      productName: messageTarget.productName,
      sku: messageTarget.sku,
      kind: profile.kind,
      alertKind,
      highSpeedQuotaLabel: profile.highSpeedQuotaLabel,
      throttleSpeedLabel: profile.throttleSpeedLabel,
      remainingMb: messageTarget.remainingMb,
      totalMb: messageTarget.totalMb,
      usedMb: messageTarget.usedMb,
      expiresAt: messageTarget.expiresAt,
      upsellOffers: upsellOffers.map((o) => ({
        id: o.id,
        label: o.label,
        sameTelecom: o.sameTelecom,
        targetSku: o.targetSku,
      })),
    });
  } catch {
    /* ignore */
  }

  if (table === "push_subscriptions" && target.endpoint) {
    const payload = await buildLowTrafficWebPayload(messageTarget);
    const pushResult = await sendTrafficWebPush(target, payload);
    if (pushResult.ok) results.web = true;
    if (pushResult.gone) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", target.endpoint);
    }
  }

  const lineUserId = target.line_user_id;
  const wantLine =
    table === "line_traffic_alerts" ||
    (target.line_alert_enabled && lineUserId);

  if (wantLine && lineUserId && isLineBotConfigured()) {
    const friend = await isLineFriend(supabaseAdmin, lineUserId);
    if (friend) {
      try {
        await pushLineMessage(
          lineUserId,
          await buildLowTrafficLineMessages(messageTarget),
        );
        results.line = true;
      } catch (err) {
        results.lineError = err.message;
      }
    } else {
      results.lineSkipped = "not_friend";
    }
  }

  if (results.web || results.line) {
    await supabaseAdmin
      .from(table)
      .update({
        last_alert_at: now,
        last_remaining_mb: usageData.remainingMb,
      })
      .eq("id", target.id);
  }

  return results;
}

/**
 * 有上限的並行池（避免一次打爆供應商 API）
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<R>} worker
 */
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

function getMonitorConcurrency() {
  const n = Number(process.env.TRAFFIC_MONITOR_CONCURRENCY || 5);
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(20, Math.floor(n));
}

/**
 * Cron 主流程：檢查所有 monitor_enabled 的訂閱並發推播
 *
 * 規模備註（勿刪）：監控人數變多時見 repo AGENTS.md「流量提醒 Cron 規模」。
 * - 並行度：TRAFFIC_MONITOR_CONCURRENCY（預設 5）
 * - 人數 ≥ ~300：考慮 cron 改 30 分鐘；≥ ~1000：改 1 小時 + 分頁掃描
 */
export async function runTrafficMonitor() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase 未設定" };
  }

  const concurrency = getMonitorConcurrency();
  const summary = {
    pushChecked: 0,
    lineChecked: 0,
    alertsSent: 0,
    concurrency,
    scaleHint: null,
    errors: [],
  };

  const { data: pushTargets, error: pushErr } =
    await fetchPushTargets(supabaseAdmin);

  if (pushErr) {
    summary.errors.push(`push_subscriptions: ${pushErr.message}`);
  } else {
    const targets = pushTargets || [];
    summary.pushChecked = targets.length;
    await mapPool(targets, concurrency, async (target) => {
      try {
        const r = await checkOneTarget(
          supabaseAdmin,
          target,
          "push_subscriptions",
        );
        if (r.alert && (r.web || r.line)) summary.alertsSent++;
      } catch (e) {
        summary.errors.push(`push:${target.id}: ${e.message}`);
      }
    });
  }

  const { data: lineTargets, error: lineErr } =
    await fetchLineTargets(supabaseAdmin);

  if (lineErr) {
    summary.errors.push(`line_traffic_alerts: ${lineErr.message}`);
  } else {
    const targets = lineTargets || [];
    summary.lineChecked = targets.length;
    await mapPool(targets, concurrency, async (target) => {
      try {
        const r = await checkOneTarget(
          supabaseAdmin,
          target,
          "line_traffic_alerts",
        );
        if (r.alert && r.line) summary.alertsSent++;
      } catch (e) {
        summary.errors.push(`line:${target.id}: ${e.message}`);
      }
    });
  }

  const monitored = summary.pushChecked + summary.lineChecked;
  if (monitored >= 1000) {
    summary.scaleHint =
      "monitored≥1000：建議 vercel.json check-traffic 改 0 * * * *（每小時）並做分頁掃描，避免單次 cron 逾時／打爆供應商";
  } else if (monitored >= 300) {
    summary.scaleHint =
      "monitored≥300：建議 vercel.json check-traffic 改 */30 * * * *，並視情況提高 TRAFFIC_MONITOR_CONCURRENCY（上限 20）";
  }

  if (summary.scaleHint) {
    console.warn("[trafficMonitor]", summary.scaleHint, {
      monitored,
      concurrency,
    });
  }

  return { ok: true, ...summary };
}
