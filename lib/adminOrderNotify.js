/**
 * Boss 新訂單通知（付款成功 → Email + LINE Push 給管理員）
 *
 * ORDER_NOTIFY_ADMIN_EMAILS=you@gmail.com,ops@jeko-esim.com.tw
 * ORDER_NOTIFY_ADMIN_LINE_USER_IDS=Uxxxxxxxx
 * ORDER_NOTIFY_ADMIN_ENABLED=false   # 設 false 關閉
 */
import { createClient } from "@supabase/supabase-js";
import { sendMail, getMailConfig } from "./mailTransporter";
import { pushLineMessage, isLineBotConfigured } from "./lineBot";
import { getPublicSiteUrl } from "./siteUrl";
import { resolveAccountingChannel, isTestPurchasePayload } from "./accountingSheet";

const EVENT_TYPE = "admin_paid";
const FEE_RATE = Number(process.env.ACCOUNTING_FEE_RATE || 0.028) || 0.028;
const PROFIT_FOOTNOTE = "※ 扣除手續費與發票";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseList(raw) {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdminOrderNotifyConfigured() {
  if (process.env.ORDER_NOTIFY_ADMIN_ENABLED === "false") return false;
  const emails = parseList(process.env.ORDER_NOTIFY_ADMIN_EMAILS);
  const lineIds = parseList(process.env.ORDER_NOTIFY_ADMIN_LINE_USER_IDS);
  return emails.length > 0 || lineIds.length > 0;
}

function fmt(n) {
  return `NT$${Math.round(Number(n) || 0).toLocaleString()}`;
}

function channelLabel(payload) {
  const ch = resolveAccountingChannel(payload);
  if (ch === "store") {
    const sid = payload.partnerStoreId || payload.partner_store_id;
    return sid ? `夥伴商店 #${sid}` : "夥伴商店";
  }
  if (ch === "referral") {
    const ref = payload.referralCode || payload.jeko_referral_code;
    return ref ? `優惠連結 ${ref}` : "優惠連結夥伴";
  }
  return "主站";
}

function paymentLabel(provider) {
  if (provider === "linepay") return "LINE Pay";
  if (provider === "newebpay") return "藍新";
  return String(provider || "—");
}

function summarizeItems(items = []) {
  return (items || [])
    .map((it) => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const name = String(it.name || it.title || "eSIM").trim();
      return q > 1 ? `${name}×${q}` : name;
    })
    .filter(Boolean)
    .join("、")
    .slice(0, 200);
}

function estimateCost(items = []) {
  let sum = 0;
  let hasCost = false;
  for (const it of items || []) {
    const q = Math.max(1, Number(it.quantity) || 1);
    const unit =
      Number(it.unitCost ?? it.cost_price ?? it.b2b_price ?? it.cost) || 0;
    if (unit > 0) {
      hasCost = true;
      sum += unit * q;
    }
  }
  return hasCost ? Math.round(sum) : null;
}

function estimatePricing(payload) {
  const sale = Math.round(Number(payload.amount) || 0);
  const cost = estimateCost(payload.items);
  const fee = sale > 0 ? Math.round(sale * FEE_RATE) : 0;
  const profit =
    cost != null && sale > 0 ? Math.round(sale - cost - fee) : null;

  return {
    sale,
    cost,
    fee,
    profit,
    saleLabel: sale > 0 ? fmt(sale) : "—",
    costLabel: cost != null ? fmt(cost) : "—",
    profitLabel: profit != null ? fmt(profit) : "—",
  };
}

function buildDetailLines(payload, pricing) {
  const orderId = String(payload.orderId || "");
  const pay = paymentLabel(payload.paymentProvider);
  const channel = channelLabel(payload);
  const items = summarizeItems(payload.items) || "—";
  const email = String(payload.customerEmail || "—").slice(0, 80);
  const bossUrl = `${getPublicSiteUrl().replace(/\/$/, "")}/admin-boss?tab=sales`;

  const lines = [
    "新訂單（已付款）",
    "",
    `訂單編號：${orderId}`,
    `售價：${pricing.saleLabel}`,
    `成本價：${pricing.costLabel}`,
    `利潤(估)：${pricing.profitLabel}`,
    PROFIT_FOOTNOTE,
    "",
    `渠道：${channel}`,
    `金流：${pay}`,
    `商品：${items}`,
    `客人：${email}`,
  ];
  if (payload.tradeNo) lines.push(`金流單號：${payload.tradeNo}`);
  lines.push("", bossUrl);
  return { lines, bossUrl, orderId };
}

function buildCopy(payload) {
  const orderId = String(payload.orderId || "");
  const shortId = orderId.slice(-8).toUpperCase() || orderId.slice(0, 8);
  const pricing = estimatePricing(payload);
  const pay = paymentLabel(payload.paymentProvider);
  const channel = channelLabel(payload);
  const { lines, bossUrl } = buildDetailLines(payload, pricing);

  const subject = `【Jeko 新訂單】${pricing.saleLabel} · ${channel} · #${shortId}`;
  const body = lines.join("\n");
  const lineText = body;

  return { subject, body, lineText, bossUrl, shortId };
}

async function logNotify(admin, { orderId, channel, status, detail }) {
  if (!admin) return;
  try {
    await admin.from("order_notifications").insert([
      {
        order_id: orderId,
        event_type: EVENT_TYPE,
        channel,
        status,
        detail: detail ? String(detail).slice(0, 500) : null,
      },
    ]);
  } catch (err) {
    console.warn("[adminOrderNotify] log failed:", err?.message || err);
  }
}

async function alreadySent(admin, orderId, channel) {
  if (!admin) return false;
  const { data } = await admin
    .from("order_notifications")
    .select("id")
    .eq("order_id", orderId)
    .eq("event_type", EVENT_TYPE)
    .eq("channel", channel)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * @param {object} payload — 與 appendAccountingRow 相同欄位
 */
export async function notifyAdminNewOrder(payload = {}) {
  const orderId = String(payload.orderId || "").trim();
  if (!orderId) return { ok: false, reason: "missing_order_id" };

  if (isTestPurchasePayload(payload)) {
    return { ok: true, skipped: true, reason: "test_purchase" };
  }

  if (!isAdminOrderNotifyConfigured()) {
    return { ok: true, skipped: true, reason: "not_configured" };
  }

  const admin = getAdmin();
  const copy = buildCopy(payload);
  const emails = parseList(process.env.ORDER_NOTIFY_ADMIN_EMAILS);
  const lineIds = parseList(process.env.ORDER_NOTIFY_ADMIN_LINE_USER_IDS);
  const summary = { email: null, line: null };

  if (!emails.length) {
    summary.email = { status: "skipped", detail: "no_admin_emails" };
  } else if (!getMailConfig().configured) {
    summary.email = { status: "skipped", detail: "mail_not_configured" };
  } else if (await alreadySent(admin, orderId, "admin_email")) {
    summary.email = { status: "skipped", detail: "already_sent" };
  } else {
    try {
      await sendMail({
        to: emails.join(","),
        subject: copy.subject,
        text: copy.body,
        html: `<pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${copy.body.replace(/</g, "&lt;")}</pre><p><a href="${copy.bossUrl}">開啟 Boss 後台</a></p>`,
      });
      summary.email = { status: "sent", to: emails.length };
      await logNotify(admin, {
        orderId,
        channel: "admin_email",
        status: "sent",
        detail: emails.join(","),
      });
    } catch (err) {
      summary.email = { status: "failed", detail: err?.message };
      await logNotify(admin, {
        orderId,
        channel: "admin_email",
        status: "failed",
        detail: err?.message,
      });
    }
  }

  if (!lineIds.length) {
    summary.line = { status: "skipped", detail: "no_admin_line_ids" };
  } else if (!isLineBotConfigured()) {
    summary.line = { status: "skipped", detail: "line_not_configured" };
  } else if (await alreadySent(admin, orderId, "admin_line")) {
    summary.line = { status: "skipped", detail: "already_sent" };
  } else {
    const lineResults = [];
    let anySent = false;
    for (const uid of lineIds) {
      try {
        await pushLineMessage(uid, [{ type: "text", text: copy.lineText }]);
        lineResults.push({ uid, status: "sent" });
        anySent = true;
      } catch (err) {
        lineResults.push({ uid, status: "failed", detail: err?.message });
      }
    }
    summary.line = { status: anySent ? "sent" : "failed", results: lineResults };
    await logNotify(admin, {
      orderId,
      channel: "admin_line",
      status: anySent ? "sent" : "failed",
      detail: JSON.stringify(lineResults).slice(0, 500),
    });
  }

  return { ok: true, orderId, summary };
}
