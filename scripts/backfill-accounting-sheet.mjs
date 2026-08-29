/**
 * 從 Medusa 正式訂單補寫 Google Sheets 記帳 + 建立 KPI 總覽
 *
 * 用法：
 *   node scripts/backfill-accounting-sheet.mjs
 *   node scripts/backfill-accounting-sheet.mjs --channel=main --limit=10
 *   node scripts/backfill-accounting-sheet.mjs --dashboard-only
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const p = resolve(root, ".env.local");
  if (!existsSync(p)) throw new Error("缺少 .env.local");
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL =
  process.env.MEDUSA_SYNC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "https://esim-backend-eight.vercel.app";

const {
  loginMedusaAdmin,
  getMedusaBackendUrl,
} = await import("../lib/medusaAdminAuth.js");
const {
  isPartnerMedusaOrder,
  mapMainSiteOrderStatus,
  resolveMainSiteRevenue,
  resolveUnitCost,
} = await import("../lib/mainSiteAnalytics.js");
const {
  appendAccountingRow,
  setupAccountingDashboard,
  resolveAccountingChannel,
} = await import("../lib/accountingSheet.js");

const ORDER_FIELDS = [
  "id",
  "display_id",
  "status",
  "payment_status",
  "email",
  "total",
  "created_at",
  "metadata",
  "items.title",
  "items.product_title",
  "items.quantity",
  "items.unit_price",
  "items.metadata",
  "items.variant.metadata",
].join(",");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    channel: "all",
    limit: 30,
    dashboardOnly: false,
    force: false,
  };
  for (const a of args) {
    if (a === "--dashboard-only") out.dashboardOnly = true;
    else if (a === "--force") out.force = true;
    else if (a.startsWith("--channel=")) out.channel = a.split("=")[1];
    else if (a.startsWith("--limit=")) out.limit = Number(a.split("=")[1]) || 30;
  }
  return out;
}

async function fetchOrders(token, maxPages = 5) {
  const base = getMedusaBackendUrl();
  const all = [];
  let offset = 0;
  for (let p = 0; p < maxPages; p += 1) {
    const qs = new URLSearchParams({
      limit: "100",
      offset: String(offset),
      order: "-created_at",
      fields: ORDER_FIELDS,
    });
    const res = await fetch(`${base}/admin/orders?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Medusa ${res.status}`);
    const orders = data.orders || [];
    all.push(...orders);
    offset += 100;
    if (orders.length < 100) break;
  }
  return all;
}

function orderToPayload(order) {
  const meta = order.metadata || {};
  const isPartner = isPartnerMedusaOrder(order);
  const referralCode = meta.jeko_referral_code
    ? String(meta.jeko_referral_code)
    : undefined;

  const paymentProvider = meta.linepay_pay_time ? "linepay" : "newebpay";
  const payTime =
    meta.linepay_pay_time ||
    meta.newebpay_pay_time ||
    order.created_at;
  const tradeNo =
    meta.linepay_transaction_id ||
    meta.newebpay_trade_no ||
    meta.newebpay_merchant_order_no ||
    "";

  const items = (order.items || []).map((it) => ({
    name: it.product_title || it.title,
    quantity: it.quantity,
    unitCost: resolveUnitCost(it),
  }));

  return {
    orderId: order.id,
    amount: resolveMainSiteRevenue(order),
    paymentProvider,
    payTime: String(payTime),
    tradeNo: String(tradeNo),
    customerEmail: order.email,
    items,
    isPartnerOrder: isPartner,
    partnerStoreId: meta.partner_store_id
      ? String(meta.partner_store_id)
      : undefined,
    referralCode,
    note: "backfill",
  };
}

function isTestPurchaseOrder(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((it) =>
    String(it.product_title || it.title || it.name || "").includes("測試購買"),
  );
}

function matchesChannel(order, channel) {
  const payload = orderToPayload(order);
  const ch = resolveAccountingChannel(payload);
  if (channel === "all") return true;
  return ch === channel;
}

function isPaidOrder(order) {
  return mapMainSiteOrderStatus(order) === "completed";
}

async function main() {
  const opts = parseArgs();
  console.log("Medusa:", getMedusaBackendUrl());

  if (opts.dashboardOnly) {
    const dash = await setupAccountingDashboard();
    console.log("Dashboard:", dash);
    return;
  }

  const email = process.env.MEDUSA_ADMIN_EMAIL;
  const password = process.env.MEDUSA_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("缺少 MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD");
  }

  const token = await loginMedusaAdmin(email, password);
  const orders = await fetchOrders(token);
  const candidates = orders
    .filter(isPaidOrder)
    .filter((o) => !isTestPurchaseOrder(o))
    .filter((o) => matchesChannel(o, opts.channel))
    .slice(0, opts.limit);

  console.log(
    `找到 ${candidates.length} 筆已付款訂單（channel=${opts.channel}，limit=${opts.limit}）`,
  );

  let imported = 0;
  let skipped = 0;
  for (const order of candidates) {
    const payload = orderToPayload(order);
    const ch = resolveAccountingChannel(payload);
    const result = await appendAccountingRow(payload, { force: opts.force });
    const tag = result.skipped ? "skip" : "ok";
    if (result.skipped) skipped += 1;
    else imported += 1;
    console.log(
      `[${tag}] ${ch} ${order.id.slice(0, 20)}… $${payload.amount} → ${result.tab || result.reason}`,
    );
  }

  const dash = await setupAccountingDashboard();
  console.log("\n匯入完成:", { imported, skipped });
  console.log("KPI 總覽:", dash);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
