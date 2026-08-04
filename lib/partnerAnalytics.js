/**
 * 夥伴後台「分潤分析」共用計算工具。
 * 全部基於 orders 真實紀錄計算（金額／分潤／期間比較），不使用假資料。
 */

export function filterByRange(orders = [], start, end) {
  const s = start ? new Date(start).getTime() : 0;
  const e = end ? new Date(`${end}T23:59:59`).getTime() : Infinity;
  return orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= s && t <= e;
  });
}

export function parseItemDetails(order) {
  try {
    return Array.isArray(order?.item_details)
      ? order.item_details
      : JSON.parse(order?.item_details || "[]");
  } catch {
    return [];
  }
}

export function primaryItemName(order) {
  const items = parseItemDetails(order);
  return items[0]?.name || items[0]?.title || "其他方案";
}

function primaryItemMeta(order) {
  const items = parseItemDetails(order);
  const first = items[0] || {};
  return {
    name: first.name || first.title || "其他方案",
    image: first.image || first.thumbnail || first.image_url || null,
    handle: first.handle || first.slug || null,
  };
}

/**
 * 依商品名稱彙總：分潤／營收／訂單數／單筆均分潤／圖片，依分潤高到低排序
 */
export function productBreakdown(orders = []) {
  const map = new Map();
  for (const o of orders) {
    const meta = primaryItemMeta(o);
    const key = meta.name;
    const cur = map.get(key) || {
      name: key,
      profit: 0,
      revenue: 0,
      count: 0,
      image: meta.image,
      handle: meta.handle,
    };
    cur.profit += Number(o.partner_profit) || 0;
    cur.revenue += Number(o.total_amount) || 0;
    cur.count += 1;
    if (!cur.image && meta.image) cur.image = meta.image;
    if (!cur.handle && meta.handle) cur.handle = meta.handle;
    map.set(key, cur);
  }
  return [...map.values()]
    .map((row) => ({
      ...row,
      avgProfit: row.count > 0 ? row.profit / row.count : 0,
      sharePercent: 0,
    }))
    .sort((a, b) => b.profit - a.profit)
    .map((row, _i, arr) => {
      const totalProfit = arr.reduce((s, r) => s + r.profit, 0);
      return {
        ...row,
        sharePercent:
          totalProfit > 0 ? Math.round((row.profit / totalProfit) * 100) : 0,
      };
    });
}

/** 熱銷商品：依訂單數（賣最多）排序，同分再比分潤 */
export function topSellingProducts(orders = [], limit = 6) {
  return [...productBreakdown(orders)]
    .sort((a, b) => b.count - a.count || b.profit - a.profit)
    .slice(0, limit);
}

export function sumTotals(orders = []) {
  const revenue = orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const profit = orders.reduce((s, o) => s + (Number(o.partner_profit) || 0), 0);
  const cost = orders.reduce((s, o) => s + (Number(o.b2b_cost) || 0), 0);
  const rate = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  return { revenue, profit, cost, count: orders.length, rate };
}

/** 成長率％：((本期-前期)/前期)*100，前期為 0 時以有/無資料判斷 */
export function growthPercent(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (!p) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 100);
}

/** 近 N 個月每月分潤／訂單數（含當月），供長條圖使用 */
export function monthlyProfitSeries(orders = [], months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${d.getMonth() + 1}月`,
      profit: 0,
      count: 0,
    });
  }
  const map = new Map(buckets.map((b) => [b.key, b]));
  for (const o of orders) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = map.get(key);
    if (bucket) {
      bucket.profit += Number(o.partner_profit) || 0;
      bucket.count += 1;
    }
  }
  return buckets;
}

/** 依商品彙總並附上與「前一等長期間」比較的成長率（真實資料比較，非假數據） */
export function productBreakdownWithTrend(currentOrders = [], previousOrders = []) {
  const current = productBreakdown(currentOrders);
  const prevMap = new Map(productBreakdown(previousOrders).map((p) => [p.name, p]));
  return current.map((p) => {
    const prev = prevMap.get(p.name);
    const trend = prev ? growthPercent(p.profit, prev.profit) : p.profit > 0 ? 100 : 0;
    return { ...p, trend, hasPrev: !!prev };
  });
}

/** 近 N 天內建立的訂單數（不限狀態，用於「近期新增」計數卡） */
export function ordersInLastNDays(orders = [], days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return orders.filter((o) => new Date(o.created_at).getTime() >= cutoff).length;
}

/** 依現在時間回傳問候語（早安／午安／晚安），單純即時、非固定假資料 */
export function greetingByHour(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "夜深了";
  if (h < 12) return "早安";
  if (h < 18) return "午安";
  return "晚安";
}

/** 取得與所選期間等長的「前一期間」原始訂單清單 */
export function previousPeriodOrders(validOrders = [], start, end) {
  if (!start || !end) return [];
  const startMs = new Date(start).getTime();
  const endMs = new Date(`${end}T23:59:59`).getTime();
  const spanMs = Math.max(endMs - startMs, 0);
  const prevEndMs = startMs - 1;
  const prevStartMs = prevEndMs - spanMs;

  return validOrders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= prevStartMs && t <= prevEndMs;
  });
}

/** 與所選期間等長的「前一期間」彙總，用於真實成長率比較（無則回傳全 0） */
export function previousPeriodTotals(validOrders = [], start, end) {
  return sumTotals(previousPeriodOrders(validOrders, start, end));
}
