/**
 * 主站銷售分析：從 Medusa Admin 訂單算出營收／成本／毛利。
 * 成本來源 = 變體 metadata.cost_price（或 b2b_price），與商品頁一致。
 */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** 是否為夥伴店／夥伴連結訂單（應從主站報表排除） */
export function isPartnerMedusaOrder(order) {
  const meta = order?.metadata || {};
  if (
    meta.is_partner_order === true ||
    meta.is_partner_order === "true" ||
    meta.is_partner_order === 1 ||
    meta.is_partner_order === "1"
  ) {
    return true;
  }
  const storeId = Number(meta.partner_store_id);
  if (Number.isFinite(storeId) && storeId > 0) return true;
  const partnerId = Number(meta.partner_id);
  if (Number.isFinite(partnerId) && partnerId > 0) return true;
  return false;
}

/**
 * 優惠連結訂單的夥伴分潤（付款成功時由 esim-backend referralOrderSync 寫入）。
 * 這種單是「官網同價」的主站訂單，營收算主站，但分潤已經付給夥伴，
 * 因此主站毛利要再扣掉這一段才是平台真實利潤。
 */
export function resolveReferralPartnerProfit(order) {
  const meta = order?.metadata || {};
  if (!meta.jeko_referral_code) return 0;
  const n = num(meta.referral_partner_profit);
  return n > 0 ? Math.round(n) : 0;
}

/** 付款狀態 → 報表用狀態詞彙 */
export function mapMainSiteOrderStatus(order) {
  const meta = order?.metadata || {};
  const orderStatus = String(order?.status || "").toLowerCase();
  const payStatus = String(order?.payment_status || "").toLowerCase();

  if (orderStatus === "canceled" || orderStatus === "cancelled") {
    return "cancelled";
  }
  if (payStatus.includes("refund")) return "refunded";

  const isPaid =
    payStatus === "captured" ||
    payStatus === "partially_captured" ||
    Boolean(meta.newebpay_pay_time) ||
    Boolean(meta.linepay_pay_time);

  return isPaid ? "completed" : "pending";
}

export function resolveMainSiteRevenue(order) {
  const meta = order?.metadata || {};
  const candidates = [
    meta.newebpay_amount,
    meta.linepay_amount,
    order?.total,
    order?.item_total,
    order?.subtotal,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  const items = Array.isArray(order?.items) ? order.items : [];
  const sum = items.reduce((acc, it) => {
    const qty = Math.max(1, num(it?.quantity) || 1);
    const line = num(it?.total) || num(it?.unit_price) * qty;
    return acc + line;
  }, 0);
  return Math.round(sum);
}

/** 單價成本：變體 metadata 優先，其次 line item metadata，再查 costByVariantId */
export function resolveUnitCost(item, costByVariantId = {}) {
  const vMeta = item?.variant?.metadata || {};
  const iMeta = item?.metadata || {};
  const fromMeta = num(
    vMeta.cost_price ??
      vMeta.b2b_price ??
      vMeta.cost ??
      iMeta.cost_price ??
      iMeta.b2b_price ??
      iMeta.cost,
  );
  if (fromMeta > 0) return Math.round(fromMeta);

  const vid = item?.variant_id || item?.variant?.id;
  if (vid && costByVariantId[vid] != null) {
    return Math.round(num(costByVariantId[vid]));
  }
  return 0;
}

export function sumOrderCost(order, costByVariantId = {}) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum, it) => {
    const qty = Math.max(1, num(it?.quantity) || 1);
    return sum + resolveUnitCost(it, costByVariantId) * qty;
  }, 0);
}

export function itemSummary(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return "—";
  const names = items
    .map((it) => it.product_title || it.title || it.variant_title || "")
    .filter(Boolean);
  if (!names.length) return "—";
  if (names.length === 1) return names[0];
  return `${names[0]} 等 ${names.length} 項`;
}

function withinDays(createdAt, days) {
  const n = Number(days);
  if (!n || n <= 0 || n >= 9999) return true;
  const cutoff = startOfDay(new Date());
  cutoff.setDate(cutoff.getDate() - n);
  return new Date(createdAt) >= cutoff;
}

/**
 * @param {object[]} medusaOrders - 已過濾為主站的 Medusa 訂單
 * @param {{ days?: number, status?: string, costByVariantId?: Record<string, number> }} opts
 */
export function buildMainSiteSalesReport(medusaOrders = [], opts = {}) {
  const days = Number(opts.days) || 9999;
  const statusFilter = String(opts.status || "all").toLowerCase();
  const costByVariantId = opts.costByVariantId || {};

  let rows = (medusaOrders || [])
    .filter((o) => !isPartnerMedusaOrder(o))
    .filter((o) => withinDays(o.created_at, days))
    .map((o) => {
      const status = mapMainSiteOrderStatus(o);
      const revenue = resolveMainSiteRevenue(o);
      const cost = sumOrderCost(o, costByVariantId);
      const referralProfit = resolveReferralPartnerProfit(o);
      const profit = revenue - cost - referralProfit;
      const missingCost = (Array.isArray(o.items) ? o.items : []).some((it) => {
        const qty = Math.max(1, num(it?.quantity) || 1);
        return qty > 0 && resolveUnitCost(it, costByVariantId) <= 0;
      });
      return {
        id: o.id,
        displayId: o.display_id ?? null,
        email: o.email || o.metadata?.checkout_email || "",
        status,
        paymentStatus: o.payment_status || "",
        revenue,
        cost,
        referralProfit,
        referralCode: o.metadata?.jeko_referral_code
          ? String(o.metadata.jeko_referral_code)
          : "",
        profit,
        missingCost,
        itemSummary: itemSummary(o),
        createdAt: o.created_at || null,
        payTime:
          o.metadata?.newebpay_pay_time ||
          o.metadata?.linepay_pay_time ||
          null,
        provider: o.metadata?.newebpay_pay_time
          ? "newebpay"
          : o.metadata?.linepay_pay_time
            ? "linepay"
            : "",
      };
    });

  if (statusFilter && statusFilter !== "all") {
    rows = rows.filter((r) => r.status === statusFilter);
  }

  rows.sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );

  const settled = rows.filter((r) => r.status === "completed");
  const pending = rows.filter((r) => r.status === "pending");
  const refunded = rows.filter((r) => r.status === "refunded");

  const sum = (list, key) =>
    list.reduce((s, r) => s + (Number(r[key]) || 0), 0);

  const now = startOfDay(new Date());
  const todayKey = dayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayOrders = settled.filter((r) => dayKey(r.createdAt) === todayKey);
  const yesterdayOrders = settled.filter(
    (r) => dayKey(r.createdAt) === yesterdayKey,
  );
  const weekOrders = settled.filter((r) => new Date(r.createdAt) >= weekAgo);

  const chartDays = Math.min(Math.max(Number(days) || 30, 7), 90);
  const labels = [];
  const revenueSeries = [];
  const orderSeries = [];
  const profitSeries = [];
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    const dayList = settled.filter((r) => dayKey(r.createdAt) === k);
    revenueSeries.push(sum(dayList, "revenue"));
    profitSeries.push(sum(dayList, "profit"));
    orderSeries.push(dayList.length);
  }

  const productMap = {};
  for (const o of medusaOrders || []) {
    if (isPartnerMedusaOrder(o)) continue;
    if (!withinDays(o.created_at, days)) continue;
    if (mapMainSiteOrderStatus(o) !== "completed") continue;
    if (statusFilter !== "all" && statusFilter !== "completed") continue;
    for (const it of o.items || []) {
      const name =
        it.product_title || it.title || it.variant_title || "未命名方案";
      const qty = Math.max(1, num(it.quantity) || 1);
      const lineRev = num(it.total) || num(it.unit_price) * qty;
      const lineCost = resolveUnitCost(it, costByVariantId) * qty;
      if (!productMap[name]) {
        productMap[name] = { name, qty: 0, revenue: 0, cost: 0, profit: 0 };
      }
      productMap[name].qty += qty;
      productMap[name].revenue += lineRev;
      productMap[name].cost += lineCost;
      productMap[name].profit += lineRev - lineCost;
    }
  }
  const productRank = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  return {
    kpis: {
      revenue: sum(settled, "revenue"),
      cost: sum(settled, "cost"),
      profit: sum(settled, "profit"),
      // 已從 profit 扣除；單獨列出方便對帳「主站營收裡有多少付給優惠連結夥伴」
      referralProfit: sum(settled, "referralProfit"),
      referralOrderCount: settled.filter((r) => r.referralProfit > 0).length,
      orderCount: settled.length,
      pendingCount: pending.length,
      refundCount: refunded.length,
      todayRevenue: sum(todayOrders, "revenue"),
      todayOrders: todayOrders.length,
      yesterdayRevenue: sum(yesterdayOrders, "revenue"),
      weekRevenue: sum(weekOrders, "revenue"),
      missingCostCount: settled.filter((r) => r.missingCost).length,
    },
    lineChart: { labels, revenueSeries, profitSeries, orderSeries },
    productRank,
    orders: rows,
  };
}
