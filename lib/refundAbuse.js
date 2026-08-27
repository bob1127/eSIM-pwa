/**
 * 退款濫用防呆：次數上限、高風險標記
 */
import { isLineSyntheticEmail } from "@/lib/lineAuth";
import { orderItemSummary } from "@/lib/refundPolicy";

/** 可調門檻（環境變數） */
export function getRefundAbuseLimits() {
  const days = Math.max(
    1,
    Number(process.env.REFUND_APPROVED_LIMIT_DAYS || 30) || 30,
  );
  const maxApproved = Math.max(
    1,
    Number(process.env.REFUND_APPROVED_LIMIT_COUNT || 2) || 2,
  );
  return { days, maxApproved };
}

export const REFUND_ABUSE_CODE = "REFUND_ABUSE_LIMIT";

export function buildRefundAbuseMessage({ days, maxApproved, approvedCount }) {
  const used = Number(approvedCount) || maxApproved;
  return `近 ${days} 天內已有 ${used} 次（含）核准退款，線上申請已暫時關閉，以避免惡意重複下單退款。若有特殊情況，請透過官方 LINE 由客服人工審核協助。`;
}

/**
 * 查同一顧客（email 聯集）在窗口內已核准退款次數
 * @returns {Promise<{ blocked: boolean, approvedCount: number, days: number, maxApproved: number, code?: string, message?: string }>}
 */
export async function checkRefundAbuseLimit(supabaseAdmin, emails = []) {
  const { days, maxApproved } = getRefundAbuseLimits();
  const list = [...new Set((emails || []).map((e) => String(e).toLowerCase()).filter(Boolean))];
  if (!supabaseAdmin || !list.length) {
    return { blocked: false, approvedCount: 0, days, maxApproved };
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("refund_requests")
    .select("id, customer_email, status, created_at, reviewed_at")
    .in("customer_email", list)
    .eq("status", "approved");

  if (error) {
    console.warn("[refundAbuse] count failed:", error.message);
    return { blocked: false, approvedCount: 0, days, maxApproved, error: error.message };
  }

  const sinceMs = new Date(since).getTime();
  const approvedCount = (data || []).filter((row) => {
    const ts = new Date(row.reviewed_at || row.created_at).getTime();
    return !Number.isNaN(ts) && ts >= sinceMs;
  }).length;
  if (approvedCount >= maxApproved) {
    return {
      blocked: true,
      approvedCount,
      days,
      maxApproved,
      code: REFUND_ABUSE_CODE,
      message: buildRefundAbuseMessage({ days, maxApproved, approvedCount }),
    };
  }

  return { blocked: false, approvedCount, days, maxApproved };
}

/**
 * Boss 高風險標記（不寫 DB，即時計算）
 * @returns {{ riskScore: number, riskFlags: string[], isHighRisk: boolean }}
 */
export function scoreRefundRisk(request, ctx = {}) {
  const flags = [];
  let score = 0;

  const email = String(request?.customer_email || "").toLowerCase();
  const order = request?.order || {};
  const approvedRecent = Number(ctx.approvedRecentByEmail?.[email] || 0);
  const pendingSameEmail = Number(ctx.pendingByEmail?.[email] || 0);
  const productKey = normalizeProductKey(order);

  if (isLineSyntheticEmail(email) || isDisposableEmail(email)) {
    flags.push("virtual_email");
    score += 2;
  }

  if (approvedRecent >= 1) {
    flags.push("recent_approved");
    score += 3;
  }
  if (approvedRecent >= 2) {
    flags.push("frequent_refunder");
    score += 3;
  }

  if (pendingSameEmail >= 2) {
    flags.push("multi_pending");
    score += 2;
  }

  const productHits = Number(ctx.productHitsByEmail?.[`${email}::${productKey}`] || 0);
  if (productKey && productHits >= 2) {
    flags.push("repeat_product");
    score += 2;
  }

  const orderAgeHours = hoursSince(order.created_at);
  if (orderAgeHours != null && orderAgeHours < 6 && request.request_type === "full_refund") {
    flags.push("very_fresh_order");
    score += 1;
  }

  // 短時間連下多單（同 email 24h 內訂單數）
  const orders24h = Number(ctx.orders24hByEmail?.[email] || 0);
  if (orders24h >= 3) {
    flags.push("burst_orders");
    score += 2;
  }

  return {
    riskScore: score,
    riskFlags: flags,
    isHighRisk: score >= 3,
  };
}

export function riskFlagLabel(flag) {
  const map = {
    virtual_email: "虛擬／LINE 信箱",
    recent_approved: "近期曾核准退款",
    frequent_refunder: "頻繁退款客",
    multi_pending: "多筆待審",
    repeat_product: "重複方案退款",
    very_fresh_order: "下單後極短申請",
    burst_orders: "短時間多單",
  };
  return map[flag] || flag;
}

function normalizeProductKey(order) {
  const summary = orderItemSummary(order || {});
  return String(summary || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function hoursSince(dateString) {
  if (!dateString) return null;
  const ms = Date.now() - new Date(dateString).getTime();
  if (Number.isNaN(ms)) return null;
  return ms / (1000 * 60 * 60);
}

function isDisposableEmail(email) {
  const domain = String(email || "").split("@")[1] || "";
  return /^(mailinator\.com|guerrillamail\.com|tempmail\.|10minutemail\.|yopmail\.com|trashmail\.)/i.test(
    domain,
  );
}

/**
 * 批次建立風險上下文（給 Boss 列表）
 */
export async function buildRefundRiskContext(supabaseAdmin, requests = []) {
  const emails = [
    ...new Set(
      (requests || [])
        .map((r) => String(r.customer_email || "").toLowerCase())
        .filter(Boolean),
    ),
  ];
  const approvedRecentByEmail = {};
  const pendingByEmail = {};
  const productHitsByEmail = {};
  const orders24hByEmail = {};

  if (!supabaseAdmin || !emails.length) {
    return {
      approvedRecentByEmail,
      pendingByEmail,
      productHitsByEmail,
      orders24hByEmail,
    };
  }

  const { days } = getRefundAbuseLimits();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentReqs } = await supabaseAdmin
    .from("refund_requests")
    .select("customer_email, status, order_id, created_at")
    .in("customer_email", emails)
    .gte("created_at", since);

  for (const r of recentReqs || []) {
    const e = String(r.customer_email || "").toLowerCase();
    if (r.status === "approved") {
      approvedRecentByEmail[e] = (approvedRecentByEmail[e] || 0) + 1;
    }
    if (r.status === "pending") {
      pendingByEmail[e] = (pendingByEmail[e] || 0) + 1;
    }
  }

  for (const r of requests || []) {
    const e = String(r.customer_email || "").toLowerCase();
    const key = `${e}::${normalizeProductKey(r.order)}`;
    if (key.endsWith("::")) continue;
    productHitsByEmail[key] = (productHitsByEmail[key] || 0) + 1;
  }

  const { data: recentOrders } = await supabaseAdmin
    .from("orders")
    .select("customer_email, created_at")
    .in("customer_email", emails)
    .gte("created_at", since24h);

  for (const o of recentOrders || []) {
    const e = String(o.customer_email || "").toLowerCase();
    orders24hByEmail[e] = (orders24hByEmail[e] || 0) + 1;
  }

  return {
    approvedRecentByEmail,
    pendingByEmail,
    productHitsByEmail,
    orders24hByEmail,
  };
}
