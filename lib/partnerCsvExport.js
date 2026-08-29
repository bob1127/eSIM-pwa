/**
 * 夥伴後台 CSV 匯出
 * 支援：總覽 KPI、月次彙總、商品明細、訂單明細、完整多段報表
 */

import {
  paymentMethodLabel,
  buyerDisplayName,
  formatOrderFullId,
} from "@/lib/orderDisplay";
import { isSettledOrderStatus } from "@/lib/refundPolicy";

function taipeiYmd(iso) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return String(iso || "").slice(0, 10);
  }
}

function taipeiYm(iso) {
  const ymd = taipeiYmd(iso);
  return ymd.slice(0, 7).replace("-", "/");
}

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "已付款";
  if (s === "pending") return "待付款";
  if (s === "cancelled" || s === "canceled") return "已取消";
  if (s === "refunded") return "已退款";
  return s || "—";
}

function parseItems(order) {
  try {
    const items = Array.isArray(order?.item_details)
      ? order.item_details
      : JSON.parse(order?.item_details || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function itemSummary(order) {
  const items = parseItems(order);
  if (!items.length) return { name: "—", qty: 1, sku: "", days: "", data: "" };
  const first = items[0] || {};
  const qty = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
  return {
    name: first.name || first.title || "其他方案",
    qty,
    sku: first.sku || first.variant_sku || first.medusa_variant_id || "",
    days: first.days || first.duration || first.valid_days || "",
    data: first.data || first.data_amount || first.quota || "",
  };
}

/** RFC4180 CSV 欄位跳脫 */
export function csvCell(value) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadCsv(filename, rowsOrText) {
  const text =
    typeof rowsOrText === "string" ? rowsOrText : rowsToCsv(rowsOrText);
  const blob = new Blob(["\uFEFF" + text], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function validOrders(orders = []) {
  return orders.filter((o) => isSettledOrderStatus(o.status));
}

function roundN(n) {
  return Math.round(Number(n) || 0);
}

export function buildMonthlyRows(orders = []) {
  const map = {};
  for (const o of validOrders(orders)) {
    const k = taipeiYm(o.created_at);
    if (!map[k]) {
      map[k] = {
        month: k,
        revenue: 0,
        cost: 0,
        profit: 0,
        count: 0,
        completed: 0,
        pending: 0,
      };
    }
    map[k].revenue += Number(o.total_amount) || 0;
    map[k].cost += Number(o.b2b_cost) || 0;
    map[k].profit += Number(o.partner_profit) || 0;
    map[k].count += 1;
    if (String(o.status).toLowerCase() === "completed") map[k].completed += 1;
    else map[k].pending += 1;
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

export function buildProductRows(orders = []) {
  const map = {};
  for (const o of validOrders(orders)) {
    const items = parseItems(o);
    const list = items.length ? items : [{ name: "其他方案", quantity: 1 }];
    const profit = Number(o.partner_profit) || 0;
    const revenue = Number(o.total_amount) || 0;
    const cost = Number(o.b2b_cost) || 0;
    const share = list.length || 1;

    for (const it of list) {
      const name = it.name || it.title || "其他方案";
      const qty = Number(it.quantity) || 1;
      if (!map[name]) {
        map[name] = {
          name,
          sku: it.sku || it.variant_sku || "",
          qty: 0,
          orders: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }
      map[name].qty += qty;
      map[name].orders += 1;
      // 單筆訂單多分項時均分金額（夥伴訂單多為單一方案）
      map[name].revenue += revenue / share;
      map[name].cost += cost / share;
      map[name].profit += profit / share;
      if (!map[name].sku && (it.sku || it.variant_sku)) {
        map[name].sku = it.sku || it.variant_sku;
      }
    }
  }
  return Object.values(map)
    .map((r) => ({
      ...r,
      revenue: roundN(r.revenue),
      cost: roundN(r.cost),
      profit: roundN(r.profit),
      avgProfit: r.orders ? roundN(r.profit / r.orders) : 0,
      margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.profit - a.profit);
}

export function buildOrderDetailRows(orders = []) {
  return validOrders(orders)
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((o) => {
      const item = itemSummary(o);
      const rev = roundN(o.total_amount);
      const cost = roundN(o.b2b_cost);
      const profit = roundN(o.partner_profit);
      return {
        date: taipeiYmd(o.created_at),
        month: taipeiYm(o.created_at),
        orderId: formatOrderFullId(o),
        status: statusLabel(o.status),
        buyer: buyerDisplayName(o),
        email: o.customer_email || "",
        product: item.name,
        sku: item.sku,
        qty: item.qty,
        revenue: rev,
        cost,
        profit,
        margin: rev > 0 ? Math.round((profit / rev) * 1000) / 10 : 0,
        payment: paymentMethodLabel(o),
      };
    });
}

function metaBlock({ store, partner, exportType }) {
  const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  return [
    ["報表類型", exportType],
    ["店鋪名稱", store?.name || "—"],
    ["夥伴", partner?.name || partner?.email || "—"],
    ["匯出時間（台北）", now],
    ["說明", "金額單位：新台幣（NT$）；僅含已付款／待付款有效訂單"],
    [],
  ];
}

function kpiBlock(orders = []) {
  const list = validOrders(orders);
  const revenue = list.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const cost = list.reduce((s, o) => s + (Number(o.b2b_cost) || 0), 0);
  const profit = list.reduce((s, o) => s + (Number(o.partner_profit) || 0), 0);
  const completed = list.filter(
    (o) => String(o.status).toLowerCase() === "completed",
  ).length;
  const pending = list.length - completed;
  return [
    ["【總覽 KPI】"],
    ["指標", "數值"],
    ["有效訂單數", list.length],
    ["已付款訂單", completed],
    ["待付款訂單", pending],
    ["累計營收", roundN(revenue)],
    ["底價成本合計", roundN(cost)],
    ["累計分潤", roundN(profit)],
    ["可結算分潤（已付款）", roundN(
      list
        .filter((o) => String(o.status).toLowerCase() === "completed")
        .reduce((s, o) => s + (Number(o.partner_profit) || 0), 0),
    )],
    ["分潤占營收 %", revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0],
    ["說明：分潤占營收", "客人每付100元約有多少元是您的分潤；≠商店加價%"],
    ["平均每單分潤", list.length ? roundN(profit / list.length) : 0],
    [],
  ];
}

function monthlySection(orders) {
  const rows = buildMonthlyRows(orders);
  const body = [
    ["【月次彙總】"],
    [
      "月份",
      "店鋪營收",
      "底價成本",
      "我的分潤",
      "分潤占營收%",
      "訂單數",
      "已付款",
      "待付款",
      "平均每單分潤",
    ],
    ...rows.map((r) => [
      r.month,
      roundN(r.revenue),
      roundN(r.cost),
      roundN(r.profit),
      r.revenue > 0 ? Math.round((r.profit / r.revenue) * 1000) / 10 : 0,
      r.count,
      r.completed,
      r.pending,
      r.count ? roundN(r.profit / r.count) : 0,
    ]),
  ];
  if (rows.length) {
    const tot = rows.reduce(
      (a, r) => ({
        revenue: a.revenue + r.revenue,
        cost: a.cost + r.cost,
        profit: a.profit + r.profit,
        count: a.count + r.count,
        completed: a.completed + r.completed,
        pending: a.pending + r.pending,
      }),
      { revenue: 0, cost: 0, profit: 0, count: 0, completed: 0, pending: 0 },
    );
    body.push([
      "合計",
      roundN(tot.revenue),
      roundN(tot.cost),
      roundN(tot.profit),
      tot.revenue > 0 ? Math.round((tot.profit / tot.revenue) * 1000) / 10 : 0,
      tot.count,
      tot.completed,
      tot.pending,
      tot.count ? roundN(tot.profit / tot.count) : 0,
    ]);
  }
  body.push([]);
  return body;
}

function productSection(orders) {
  const rows = buildProductRows(orders);
  return [
    ["【商品明細彙總】"],
    [
      "商品名稱",
      "SKU",
      "銷售張數",
      "訂單筆數",
      "營收",
      "底價成本",
      "分潤",
      "平均每單分潤",
      "分潤占營收%",
      "占比%（依分潤）",
    ],
    ...(() => {
      const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
      return rows.map((r) => [
        r.name,
        r.sku,
        r.qty,
        r.orders,
        r.revenue,
        r.cost,
        r.profit,
        r.avgProfit,
        r.margin,
        totalProfit > 0 ? Math.round((r.profit / totalProfit) * 1000) / 10 : 0,
      ]);
    })(),
    [],
  ];
}

function orderSection(orders) {
  const rows = buildOrderDetailRows(orders);
  return [
    ["【訂單明細】"],
    [
      "日期",
      "月份",
      "訂單編號",
      "狀態",
      "買家",
      "Email",
      "商品名稱",
      "SKU",
      "數量",
      "營收",
      "底價成本",
      "分潤",
      "分潤占營收%",
      "付款方式",
    ],
    ...rows.map((r) => [
      r.date,
      r.month,
      r.orderId,
      r.status,
      r.buyer,
      r.email,
      r.product,
      r.sku,
      r.qty,
      r.revenue,
      r.cost,
      r.profit,
      r.margin,
      r.payment,
    ]),
    [],
  ];
}

export const CSV_EXPORT_OPTIONS = [
  {
    id: "full",
    label: "完整報表",
    sub: "KPI＋月彙總＋商品＋訂單明細",
    icon: "description",
  },
  {
    id: "monthly",
    label: "月次彙總",
    sub: "各月營收／成本／分潤／訂單數",
    icon: "calendar_month",
  },
  {
    id: "products",
    label: "商品明細",
    sub: "各方案銷量、分潤占比",
    icon: "inventory_2",
  },
  {
    id: "orders",
    label: "訂單明細",
    sub: "逐筆訂單與商品資料",
    icon: "receipt_long",
  },
];

/**
 * @param {"full"|"monthly"|"products"|"orders"} type
 */
export function exportPartnerCsv({
  type = "full",
  orders = [],
  store,
  partner,
} = {}) {
  const dateTag = taipeiYmd(new Date().toISOString());
  const storeSlug = String(store?.slug || store?.name || "partner")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "_")
    .slice(0, 32);

  let rows = [];
  let filename = "";
  const opt = CSV_EXPORT_OPTIONS.find((o) => o.id === type) || CSV_EXPORT_OPTIONS[0];

  if (type === "monthly") {
    rows = [
      ...metaBlock({ store, partner, exportType: opt.label }),
      ...monthlySection(orders),
    ];
    filename = `jeko-月次彙總-${storeSlug}-${dateTag}.csv`;
  } else if (type === "products") {
    rows = [
      ...metaBlock({ store, partner, exportType: opt.label }),
      ...kpiBlock(orders),
      ...productSection(orders),
    ];
    filename = `jeko-商品明細-${storeSlug}-${dateTag}.csv`;
  } else if (type === "orders") {
    rows = [
      ...metaBlock({ store, partner, exportType: opt.label }),
      ...orderSection(orders),
    ];
    filename = `jeko-訂單明細-${storeSlug}-${dateTag}.csv`;
  } else {
    rows = [
      ...metaBlock({ store, partner, exportType: opt.label }),
      ...kpiBlock(orders),
      ...monthlySection(orders),
      ...productSection(orders),
      ...orderSection(orders),
    ];
    filename = `jeko-完整報表-${storeSlug}-${dateTag}.csv`;
  }

  downloadCsv(filename, rows);
  return { filename, rowCount: rows.length };
}
