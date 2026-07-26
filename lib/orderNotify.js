/**
 * 訂單狀態多通道通知：Email + LINE + Web Push
 *
 * event_type:
 *   unpaid_created  — 剛建立待付款訂單
 *   unpaid_reminder — 尚未付款提醒（cron）
 *   paid            — 已付款
 *   fulfilled       — 已出貨／eSIM 已寄出
 *   cancelled       — 已取消
 *   refunded        — 已退款
 */

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { sendMail, getMailConfig } from "./mailTransporter";
import { pushLineMessage, isLineBotConfigured } from "./lineBot";
import { getPublicSiteUrl } from "./siteUrl";
import { paymentMethodLabel } from "./orderDisplay";

function fmt(n) {
  return `NT$${Math.round(Number(n) || 0).toLocaleString()}`;
}

/** 未付款提醒節奏（小時） */
export const UNPAID_REMIND_HOURS = [1, 12, 23];
export const UNPAID_REMIND_MAX = UNPAID_REMIND_HOURS.length;

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function ensureWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(
      "mailto:support@jeko-esim.com.tw",
      pub,
      priv,
    );
    return true;
  } catch {
    return false;
  }
}

function orderShortId(order) {
  return String(order?.id || "").slice(0, 8).toUpperCase();
}

function accountOrdersUrl() {
  return `${getPublicSiteUrl()}/account`;
}

function buildCopy(eventType, order) {
  const shortId = orderShortId(order);
  const amount = fmt(order.total_amount);
  const pay = paymentMethodLabel(order);
  const site = getPublicSiteUrl();

  const map = {
    unpaid_created: {
      title: "訂單待付款",
      subject: `【Jeko eSIM】訂單 #${shortId} 待付款 — ${amount}`,
      body: `您的訂單 #${shortId}（${amount}）已建立，請儘快完成付款。付款方式：${pay}`,
      lineText: [
        "⏳ 訂單待付款",
        "",
        `訂單：#${shortId}`,
        `金額：${amount}`,
        `付款方式：${pay}`,
        "",
        "請儘快完成付款，超商／ATM 代碼逾時將失效。",
        "",
        `查看訂單：${site}/account`,
      ].join("\n"),
    },
    unpaid_reminder: {
      title: "付款提醒",
      subject: `【Jeko eSIM】付款提醒：訂單 #${shortId} 尚未付款`,
      body: `提醒您：訂單 #${shortId}（${amount}）仍未付款。請儘速完成繳費，以免代碼過期。`,
      lineText: [
        "🔔 付款提醒",
        "",
        `訂單：#${shortId}`,
        `金額：${amount}`,
        `狀態：尚未付款`,
        "",
        "請儘速完成繳費，以免超商／ATM 代碼過期。",
        "",
        `查看訂單：${site}/account`,
      ].join("\n"),
    },
    paid: {
      title: "付款成功",
      subject: `【Jeko eSIM】訂單 #${shortId} 付款成功`,
      body: `感謝您！訂單 #${shortId}（${amount}）已付款成功，我們將盡快為您開通 eSIM。`,
      lineText: [
        "✅ 付款成功",
        "",
        `訂單：#${shortId}`,
        `金額：${amount}`,
        "",
        "我們將盡快為您開通並寄送 eSIM。",
        `查看訂單：${site}/account`,
      ].join("\n"),
    },
    fulfilled: {
      title: "eSIM 已寄出",
      subject: `【Jeko eSIM】訂單 #${shortId} eSIM 已準備就緒`,
      body: `您的訂單 #${shortId} eSIM 已開通，請至信箱或會員中心查看 QR Code。`,
      lineText: [
        "🎉 eSIM 已準備就緒",
        "",
        `訂單：#${shortId}`,
        "",
        "請至信箱或會員中心查看安裝資訊。",
        `會員中心：${site}/account`,
      ].join("\n"),
    },
    cancelled: {
      title: "訂單已取消",
      subject: `【Jeko eSIM】訂單 #${shortId} 已取消`,
      body: `訂單 #${shortId} 已取消。如有疑問請聯繫客服。`,
      lineText: [
        "訂單已取消",
        "",
        `訂單：#${shortId}`,
        `詳情：${site}/account`,
      ].join("\n"),
    },
    refunded: {
      title: "退款完成",
      subject: `【Jeko eSIM】訂單 #${shortId} 退款處理完成`,
      body: `訂單 #${shortId} 退款已處理完成。`,
      lineText: [
        "退款完成",
        "",
        `訂單：#${shortId}`,
        `詳情：${site}/account`,
      ].join("\n"),
    },
  };

  return map[eventType] || map.unpaid_reminder;
}

function buildEmailHtml({ title, body, order, ctaUrl }) {
  const shortId = orderShortId(order);
  return `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 16px;background:#eef2f7;"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#1a56db,#1a3a6b);padding:22px 28px;">
<p style="margin:0;font-size:12px;color:rgba(255,255,255,.75);letter-spacing:.1em;">JEKO eSIM</p>
<h1 style="margin:6px 0 0;font-size:22px;color:#fff;">${title}</h1>
</td></tr>
<tr><td style="padding:28px;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">${body}</p>
<p style="margin:0 0 8px;font-size:13px;color:#64748b;">訂單編號：<strong style="color:#0f172a;">#${shortId}</strong></p>
<p style="margin:0 0 22px;font-size:13px;color:#64748b;">金額：<strong style="color:#1a56db;">${fmt(order.total_amount)}</strong></p>
<a href="${ctaUrl}" style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">查看訂單／完成付款</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function logNotification(admin, { orderId, eventType, channel, status, detail }) {
  if (!admin) return;
  try {
    await admin.from("order_notifications").insert([
      {
        order_id: orderId,
        event_type: eventType,
        channel,
        status,
        detail: detail ? String(detail).slice(0, 500) : null,
      },
    ]);
  } catch (err) {
    console.warn("[orderNotify] log failed:", err?.message || err);
  }
}

async function alreadySent(admin, orderId, eventType, channel) {
  if (!admin) return false;
  const { data } = await admin
    .from("order_notifications")
    .select("id")
    .eq("order_id", orderId)
    .eq("event_type", eventType)
    .eq("channel", channel)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * 依 Email 解析可推播對象
 */
export async function resolveCustomerNotifyTargets(admin, order) {
  const email = String(order?.customer_email || "").trim().toLowerCase();
  const result = {
    email: email || null,
    lineUserId: null,
    pushSubs: [],
    authUserId: null,
  };
  if (!admin || !email) return result;

  // push by guest_email
  const { data: byEmail } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id, line_user_id, guest_email")
    .eq("guest_email", email);
  if (byEmail?.length) {
    result.pushSubs.push(...byEmail);
    const withLine = byEmail.find((s) => s.line_user_id);
    if (withLine?.line_user_id) result.lineUserId = String(withLine.line_user_id);
    const withUser = byEmail.find((s) => s.user_id);
    if (withUser?.user_id) result.authUserId = withUser.user_id;
  }

  // auth user by email → push + line metadata
  try {
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = (listed?.users || []).find(
      (u) => String(u.email || "").toLowerCase() === email,
    );
    if (user) {
      result.authUserId = user.id;
      const lineId =
        user.user_metadata?.line_id ||
        user.app_metadata?.line_id ||
        null;
      if (lineId) result.lineUserId = String(lineId);

      const { data: byUser } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth, user_id, line_user_id")
        .eq("user_id", user.id);
      if (byUser?.length) {
        const seen = new Set(result.pushSubs.map((s) => s.endpoint));
        for (const s of byUser) {
          if (!seen.has(s.endpoint)) result.pushSubs.push(s);
          if (!result.lineUserId && s.line_user_id) {
            result.lineUserId = String(s.line_user_id);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[orderNotify] resolve auth user:", err?.message || err);
  }

  return result;
}

/**
 * 對單一訂單發送多通道通知
 * @param {object} order
 * @param {string} eventType
 * @param {{ force?: boolean, admin?: any }} opts
 */
export async function notifyOrderStatus(order, eventType, opts = {}) {
  const admin = opts.admin || getAdmin();
  const copy = buildCopy(eventType, order);
  const ctaUrl = accountOrdersUrl();
  const targets = await resolveCustomerNotifyTargets(admin, order);
  const summary = { email: null, line: null, push: null };

  // ── Email ──
  if (!targets.email) {
    summary.email = { status: "skipped", detail: "no_email" };
    await logNotification(admin, {
      orderId: order.id,
      eventType,
      channel: "email",
      status: "skipped",
      detail: "no_email",
    });
  } else if (!getMailConfig().configured) {
    summary.email = { status: "skipped", detail: "mail_not_configured" };
    await logNotification(admin, {
      orderId: order.id,
      eventType,
      channel: "email",
      status: "skipped",
      detail: "mail_not_configured",
    });
  } else if (!opts.force && (await alreadySent(admin, order.id, eventType, "email"))) {
    summary.email = { status: "skipped", detail: "already_sent" };
  } else {
    try {
      await sendMail({
        to: targets.email,
        subject: copy.subject,
        html: buildEmailHtml({
          title: copy.title,
          body: copy.body,
          order,
          ctaUrl,
        }),
        text: copy.body,
      });
      summary.email = { status: "sent" };
      await logNotification(admin, {
        orderId: order.id,
        eventType,
        channel: "email",
        status: "sent",
      });
    } catch (err) {
      summary.email = { status: "failed", detail: err?.message };
      await logNotification(admin, {
        orderId: order.id,
        eventType,
        channel: "email",
        status: "failed",
        detail: err?.message,
      });
    }
  }

  // ── LINE ──
  if (!targets.lineUserId) {
    summary.line = { status: "skipped", detail: "no_line_user" };
    await logNotification(admin, {
      orderId: order.id,
      eventType,
      channel: "line",
      status: "skipped",
      detail: "no_line_user",
    });
  } else if (!isLineBotConfigured()) {
    summary.line = { status: "skipped", detail: "line_not_configured" };
    await logNotification(admin, {
      orderId: order.id,
      eventType,
      channel: "line",
      status: "skipped",
      detail: "line_not_configured",
    });
  } else if (!opts.force && (await alreadySent(admin, order.id, eventType, "line"))) {
    summary.line = { status: "skipped", detail: "already_sent" };
  } else {
    try {
      await pushLineMessage(targets.lineUserId, {
        type: "text",
        text: copy.lineText,
      });
      summary.line = { status: "sent" };
      await logNotification(admin, {
        orderId: order.id,
        eventType,
        channel: "line",
        status: "sent",
      });
    } catch (err) {
      summary.line = { status: "failed", detail: err?.message };
      await logNotification(admin, {
        orderId: order.id,
        eventType,
        channel: "line",
        status: "failed",
        detail: err?.message,
      });
    }
  }

  // ── Web Push ──
  if (!targets.pushSubs.length) {
    summary.push = { status: "skipped", detail: "no_subscription" };
    await logNotification(admin, {
      orderId: order.id,
      eventType,
      channel: "push",
      status: "skipped",
      detail: "no_subscription",
    });
  } else if (!ensureWebPush()) {
    summary.push = { status: "skipped", detail: "vapid_not_configured" };
    await logNotification(admin, {
      orderId: order.id,
      eventType,
      channel: "push",
      status: "skipped",
      detail: "vapid_not_configured",
    });
  } else if (!opts.force && (await alreadySent(admin, order.id, eventType, "push"))) {
    summary.push = { status: "skipped", detail: "already_sent" };
  } else {
    const payload = JSON.stringify({
      title: `Jeko eSIM｜${copy.title}`,
      body: copy.body,
      url: "/account",
    });
    let sent = 0;
    const invalid = [];
    await Promise.allSettled(
      targets.pushSubs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sent += 1;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            invalid.push(sub.endpoint);
          }
        }
      }),
    );
    if (invalid.length && admin) {
      await admin.from("push_subscriptions").delete().in("endpoint", invalid);
    }
    summary.push = {
      status: sent > 0 ? "sent" : "failed",
      detail: `sent=${sent}`,
    };
    await logNotification(admin, {
      orderId: order.id,
      eventType,
      channel: "push",
      status: sent > 0 ? "sent" : "failed",
      detail: `sent=${sent};removed=${invalid.length}`,
    });
  }

  return { ok: true, eventType, orderId: order.id, channels: summary };
}

/**
 * Cron：掃描待付款訂單並依節奏發送 unpaid_reminder
 */
export async function runUnpaidOrderReminders(opts = {}) {
  const admin = opts.admin || getAdmin();
  if (!admin) return { ok: false, error: "no_admin" };

  const now = Date.now();
  const { data: orders, error } = await admin
    .from("orders")
    .select(
      "id, status, total_amount, customer_email, customer_name, payment_info, created_at, last_unpaid_remind_at, unpaid_remind_count",
    )
    .eq("status", "pending")
    .not("customer_email", "is", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return { ok: false, error: error.message };

  const results = [];
  for (const order of orders || []) {
    const remindCount = Number(order.unpaid_remind_count) || 0;
    if (remindCount >= UNPAID_REMIND_MAX) continue;

    const createdMs = new Date(order.created_at).getTime();
    const ageHours = (now - createdMs) / 3600000;
    const nextAt = UNPAID_REMIND_HOURS[remindCount];
    if (ageHours < nextAt) continue;

    // 距離上次提醒至少 50 分鐘，避免重複狂發
    if (order.last_unpaid_remind_at) {
      const sinceLast =
        (now - new Date(order.last_unpaid_remind_at).getTime()) / 60000;
      if (sinceLast < 50) continue;
    }

    // 對 cron：超過門檻後一律用 unpaid_reminder；建立當下由 create-order 觸發 unpaid_created
    const useEvent = "unpaid_reminder";

    try {
      const notifyResult = await notifyOrderStatus(order, useEvent, {
        admin,
        force: true,
      });

      await admin
        .from("orders")
        .update({
          last_unpaid_remind_at: new Date().toISOString(),
          unpaid_remind_count: remindCount + 1,
        })
        .eq("id", order.id);

      results.push({
        orderId: order.id,
        event: useEvent,
        remindCount: remindCount + 1,
        channels: notifyResult.channels,
      });
    } catch (err) {
      results.push({
        orderId: order.id,
        error: err?.message || String(err),
      });
    }
  }

  return {
    ok: true,
    scanned: (orders || []).length,
    reminded: results.filter((r) => !r.error).length,
    results,
  };
}

/**
 * 藍新／Medusa 串接後：狀態變更時呼叫此函式即可即時通知
 */
export async function notifyByOrderId(orderId, eventType, opts = {}) {
  const admin = opts.admin || getAdmin();
  if (!admin || !orderId) return { ok: false, error: "missing" };
  const { data: order, error } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, error: error?.message || "not_found" };
  return notifyOrderStatus(order, eventType, { ...opts, admin });
}
