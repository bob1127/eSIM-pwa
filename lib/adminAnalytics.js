import { isSettledOrderStatus, orderItemSummary } from "@/lib/refundPolicy";

function dayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function buildAdminAnalytics(orders = [], days = 30) {
  const all = orders || [];
  const settled = all.filter((o) => isSettledOrderStatus(o.status));
  const completed = all.filter((o) => String(o.status).toLowerCase() === "completed");
  const refunded = all.filter((o) => String(o.status).toLowerCase() === "refunded");
  const pending = all.filter((o) => String(o.status).toLowerCase() === "pending");

  const now = startOfDay(new Date());
  const todayKey = dayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const sumAmount = (list) =>
    list.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  const todayOrders = settled.filter((o) => dayKey(o.created_at) === todayKey);
  const yesterdayOrders = settled.filter((o) => dayKey(o.created_at) === yesterdayKey);
  const weekOrders = settled.filter((o) => new Date(o.created_at) >= weekAgo);

  const todayRevenue = sumAmount(todayOrders);
  const yesterdayRevenue = sumAmount(yesterdayOrders);
  const weekRevenue = sumAmount(weekOrders);

  const pctChange = (curr, prev) => {
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };

  const labels = [];
  const revenueSeries = [];
  const orderSeries = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    const dayList = settled.filter((o) => dayKey(o.created_at) === k);
    revenueSeries.push(sumAmount(dayList));
    orderSeries.push(dayList.length);
  }

  const storeMap = {};
  settled.forEach((o) => {
    const name = o.stores?.store_name || "官方主站";
    if (!storeMap[name]) storeMap[name] = { revenue: 0, orders: 0, profit: 0 };
    storeMap[name].revenue += Number(o.total_amount) || 0;
    storeMap[name].orders += 1;
    storeMap[name].profit += Number(o.partner_profit) || 0;
  });
  const storeShare = Object.entries(storeMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const productMap = {};
  completed.forEach((o) => {
    const name = orderItemSummary(o);
    if (!productMap[name]) productMap[name] = { qty: 0, revenue: 0 };
    productMap[name].qty += 1;
    productMap[name].revenue += Number(o.total_amount) || 0;
  });
  const productRank = Object.entries(productMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const refundAmount = refunded.reduce(
    (s, o) => s + (Number(o.total_amount) || 0),
    0,
  );

  return {
    kpis: {
      revenue: sumAmount(settled),
      todayRevenue,
      revenueVsYesterday: pctChange(todayRevenue, yesterdayRevenue),
      orderCount: settled.length,
      todayOrders: todayOrders.length,
      ordersVsYesterday: pctChange(todayOrders.length, yesterdayOrders.length),
      completedCount: completed.length,
      pendingCount: pending.length,
      refundPendingCount: all.filter(
        (o) => String(o.status).toLowerCase() === "refund_pending",
      ).length,
      refundCount: refunded.length,
      refundAmount,
      weekRevenue,
      partnerProfit: settled.reduce((s, o) => s + (Number(o.partner_profit) || 0), 0),
      b2bCost: settled.reduce((s, o) => s + (Number(o.b2b_cost) || 0), 0),
      // 平台利潤 = 營收 − 底價成本 − 夥伴分潤
      platformProfit: settled.reduce((s, o) => {
        const revenue = Number(o.total_amount) || 0;
        const cost = Number(o.b2b_cost) || 0;
        const share = Number(o.partner_profit) || 0;
        return s + (revenue - cost - share);
      }, 0),
    },
    lineChart: { labels, revenueSeries, orderSeries },
    storeShare,
    productRank,
    recentActivity: all.slice(0, 12).map((o) => ({
      id: o.id,
      label: `訂單 #${o.id} · ${orderItemSummary(o)}`,
      status: o.status,
      amount: o.total_amount,
      at: o.created_at,
    })),
  };
}

const STATUS_LABELS = {
  completed: "已完成",
  refunded: "已退款",
  pending: "尚未付款",
  refund_pending: "退款審核中",
  cancelled: "已取消",
  failed: "付款失敗",
};

export function normalizeOrderStatus(status) {
  return String(status || "").toLowerCase();
}

export function getOrderStatusLabel(status) {
  return STATUS_LABELS[normalizeOrderStatus(status)] || status || "—";
}

function withinDays(createdAt, days) {
  if (!days || days <= 0) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return new Date(createdAt) >= cutoff;
}

export function filterAdminOrders(orders = [], filters = {}) {
  const { partnerId, storeId, status, days } = filters;
  return (orders || []).filter((o) => {
    if (partnerId && Number(o.partner_id) !== Number(partnerId)) return false;
    if (storeId && Number(o.store_id) !== Number(storeId)) return false;
    if (status && status !== "all" && normalizeOrderStatus(o.status) !== status) {
      return false;
    }
    if (days && !withinDays(o.created_at, days)) return false;
    return true;
  });
}

export function getPartnerCooperationLabel(model) {
  if (model === "referral") return "優惠連結夥伴";
  if (model === "store") return "商店夥伴";
  return "商店夥伴";
}

export function buildPartnerSalesReport(orders = [], filters = {}) {
  const filtered = filterAdminOrders(orders, filters);
  const analytics = buildAdminAnalytics(filtered, filters.days || 30);

  const byStatus = {};
  filtered.forEach((o) => {
    const s = normalizeOrderStatus(o.status);
    if (!byStatus[s]) {
      byStatus[s] = { status: s, label: getOrderStatusLabel(s), count: 0, revenue: 0, profit: 0, b2bCost: 0 };
    }
    byStatus[s].count += 1;
    byStatus[s].revenue += Number(o.total_amount) || 0;
    byStatus[s].profit += Number(o.partner_profit) || 0;
    byStatus[s].b2bCost += Number(o.b2b_cost) || 0;
  });

  const partnerMap = {};
  filtered.forEach((o) => {
    const pid = o.partner_id || 0;
    const name = o.partners?.name || (pid ? `夥伴 #${pid}` : "未指定夥伴");
    const slug = o.partners?.slug || "";
    const cooperationModel = o.partners?.cooperation_model || "store";
    if (!partnerMap[pid]) {
      partnerMap[pid] = {
        partnerId: pid,
        name,
        slug,
        email: o.partners?.email || "",
        cooperationModel,
        cooperationLabel: getPartnerCooperationLabel(cooperationModel),
        referralCode: o.partners?.referral_code || "",
        orders: 0,
        revenue: 0,
        profit: 0,
        b2bCost: 0,
        platformProfit: 0,
        completed: 0,
        refunded: 0,
        pending: 0,
        refundPending: 0,
      };
    }
    const row = partnerMap[pid];
    const amount = Number(o.total_amount) || 0;
    const cost = Number(o.b2b_cost) || 0;
    const share = Number(o.partner_profit) || 0;
    row.orders += 1;
    row.revenue += amount;
    row.profit += share;
    row.b2bCost += cost;
    row.platformProfit += amount - cost - share;
    const st = normalizeOrderStatus(o.status);
    if (st === "completed") row.completed += 1;
    else if (st === "refunded") row.refunded += 1;
    else if (st === "pending") row.pending += 1;
    else if (st === "refund_pending") row.refundPending += 1;
  });

  const storeMap = {};
  filtered.forEach((o) => {
    const sid = o.store_id || 0;
    const name = o.stores?.store_name || (sid ? `店鋪 #${sid}` : "官方主站");
    const domain = o.stores?.domain || "";
    if (!storeMap[sid]) {
      storeMap[sid] = {
        storeId: sid,
        name,
        domain,
        partnerName: o.partners?.name || "",
        partnerId: o.partner_id || 0,
        cooperationModel: o.partners?.cooperation_model || "store",
        orders: 0,
        revenue: 0,
        profit: 0,
        b2bCost: 0,
        platformProfit: 0,
      };
    }
    const row = storeMap[sid];
    const amount = Number(o.total_amount) || 0;
    const cost = Number(o.b2b_cost) || 0;
    const share = Number(o.partner_profit) || 0;
    row.orders += 1;
    row.revenue += amount;
    row.profit += share;
    row.b2bCost += cost;
    row.platformProfit += amount - cost - share;
  });

  return {
    ...analytics,
    byStatus: Object.values(byStatus).sort((a, b) => b.count - a.count),
    byPartner: Object.values(partnerMap).sort((a, b) => b.revenue - a.revenue),
    byStore: Object.values(storeMap).sort((a, b) => b.revenue - a.revenue),
    orders: filtered.map((o) => ({
      id: o.id,
      status: o.status,
      statusLabel: getOrderStatusLabel(o.status),
      partnerId: o.partner_id,
      partnerName: o.partners?.name || "—",
      partnerSlug: o.partners?.slug || "",
      cooperationModel: o.partners?.cooperation_model || "store",
      cooperationLabel: getPartnerCooperationLabel(
        o.partners?.cooperation_model || "store",
      ),
      storeId: o.store_id,
      storeName: o.stores?.store_name || "—",
      storeDomain: o.stores?.domain || "",
      customerEmail: o.customer_email,
      itemSummary: orderItemSummary(o),
      totalAmount: Number(o.total_amount) || 0,
      b2bCost: Number(o.b2b_cost) || 0,
      partnerProfit: Number(o.partner_profit) || 0,
      platformProfit:
        (Number(o.total_amount) || 0) -
        (Number(o.b2b_cost) || 0) -
        (Number(o.partner_profit) || 0),
      createdAt: o.created_at,
    })),
  };
}
