import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import MaterialIcon from "@/components/MaterialIcon";
import {
  ReportPeriodBar,
  DobermanStatusBanner,
  fmt,
  METRIC_HELP,
  MetricPanelHeader,
  lastNDaysRange,
  thisMonthRange,
  lastNMonthsRange,
  thisQuarterRange,
  lastNQuartersRange,
  thisYearRange,
  lastNYearsRange,
} from "@/components/partner/DobermanWidgets";
import { isSettledOrderStatus } from "@/lib/refundPolicy";
import { PARTNER_UI } from "@/lib/partnerUi";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
);

const PALETTE = ["#1E4AD1", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B"];
const BLUE = "#1E4AD1";
const TEAL = "#0EA5E9";
const GREEN = "#10B981";

const GRANULARITY = [
  { id: "day", label: "日" },
  { id: "month", label: "月" },
  { id: "quarter", label: "季" },
  { id: "year", label: "年" },
];

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

function parseYmd(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return { y, m, d };
}

function filterByRange(orders = [], start, end) {
  return orders.filter((o) => {
    const d = taipeiYmd(o.created_at);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

function itemName(order) {
  try {
    const items = Array.isArray(order.item_details)
      ? order.item_details
      : JSON.parse(order.item_details || "[]");
    return items[0]?.name || "其他方案";
  } catch {
    return "其他方案";
  }
}

function bucketKey(ymd, granularity) {
  const { y, m } = parseYmd(ymd);
  if (granularity === "day") return ymd;
  if (granularity === "month") return `${y}-${String(m).padStart(2, "0")}`;
  if (granularity === "quarter") return `${y}-Q${Math.ceil(m / 3)}`;
  return String(y);
}

function labelForKey(key, granularity) {
  if (granularity === "day") {
    const { m, d } = parseYmd(key);
    return `${m}/${d}`;
  }
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${y}/${m}`;
  }
  if (granularity === "quarter") return key.replace("-", " ");
  return `${key}年`;
}

function addDays(ymd, n) {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function enumerateBuckets(start, end, granularity) {
  if (!start || !end || start > end) return [];
  const keys = [];
  const seen = new Set();

  if (granularity === "day") {
    let cur = start;
    let guard = 0;
    while (cur <= end && guard < 400) {
      keys.push(cur);
      cur = addDays(cur, 1);
      guard += 1;
    }
    return keys;
  }

  if (granularity === "month") {
    let { y, m } = parseYmd(start);
    const endP = parseYmd(end);
    let guard = 0;
    while ((y < endP.y || (y === endP.y && m <= endP.m)) && guard < 120) {
      keys.push(`${y}-${String(m).padStart(2, "0")}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      guard += 1;
    }
    return keys;
  }

  if (granularity === "quarter") {
    let { y, m } = parseYmd(start);
    let q = Math.ceil(m / 3);
    const endP = parseYmd(end);
    const endQ = Math.ceil(endP.m / 3);
    let guard = 0;
    while ((y < endP.y || (y === endP.y && q <= endQ)) && guard < 40) {
      keys.push(`${y}-Q${q}`);
      q += 1;
      if (q > 4) {
        q = 1;
        y += 1;
      }
      guard += 1;
    }
    return keys;
  }

  let y = parseYmd(start).y;
  const endY = parseYmd(end).y;
  while (y <= endY) {
    keys.push(String(y));
    y += 1;
  }
  return keys.filter((k) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function aggregateByBucket(orders, granularity, start, end) {
  const map = {};
  for (const o of orders) {
    const ymd = taipeiYmd(o.created_at);
    const k = bucketKey(ymd, granularity);
    if (!map[k]) map[k] = { rev: 0, profit: 0, cost: 0, cnt: 0 };
    map[k].rev += Number(o.total_amount) || 0;
    map[k].profit += Number(o.partner_profit) || 0;
    map[k].cost += Number(o.b2b_cost) || 0;
    map[k].cnt += 1;
  }
  const keys = enumerateBuckets(start, end, granularity);
  // 日視圖過長時只顯示有資料的期＋首尾，避免擠爆
  let displayKeys = keys;
  if (granularity === "day" && keys.length > 45) {
    const withData = keys.filter((k) => map[k]?.cnt);
    displayKeys = withData.length ? withData : keys.slice(-30);
  }
  return displayKeys.map((k) => [
    k,
    map[k] || { rev: 0, profit: 0, cost: 0, cnt: 0 },
  ]);
}

function productShare(orders) {
  const map = {};
  for (const o of orders) {
    const key = itemName(o);
    if (!map[key]) map[key] = { profit: 0, rev: 0, cnt: 0 };
    map[key].profit += Number(o.partner_profit) || 0;
    map[key].rev += Number(o.total_amount) || 0;
    map[key].cnt += 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1].profit - a[1].profit)
    .slice(0, 8);
}

function applyGranularityRange(granularity, onRangeStartChange, onRangeEndChange) {
  let r;
  if (granularity === "day") r = lastNDaysRange(14);
  else if (granularity === "month") r = lastNMonthsRange(6);
  else if (granularity === "quarter") r = lastNQuartersRange(4);
  else r = lastNYearsRange(3);
  onRangeStartChange(r.start);
  onRangeEndChange(r.end);
}

const tooltipNtd = {
  callbacks: {
    title(items) {
      const label = items?.[0]?.label;
      return label && String(label).length > 0 ? String(label) : "";
    },
    label(ctx) {
      const raw = ctx.parsed;
      const v =
        typeof raw === "number"
          ? raw
          : raw?.y ?? raw?.x ?? ctx.raw ?? 0;
      const ds = ctx.dataset.label || "";
      if (ds.includes("訂單") || ds.includes("筆") || ds === "訂單筆數") {
        return ` ${ds || "訂單"}: ${v} 筆`;
      }
      // 長商品名已放 title，label 只顯示數值，避免單行塞爆
      if (ctx.chart?.config?.type === "doughnut") {
        return ` 分潤 ${fmt(v)}`;
      }
      return ds ? ` ${ds}: ${fmt(v)}` : ` ${fmt(v)}`;
    },
  },
};

/** Chart.js canvas tooltip 在小圖上會被裁切 → 改 DOM 浮層 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildExternalTooltip(tipRef, { totalProfit = 0 } = {}) {
  return (context) => {
    const el = tipRef.current;
    if (!el) return;
    const { chart, tooltip } = context;
    if (!tooltip || tooltip.opacity === 0) {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      return;
    }
    const dp = tooltip.dataPoints?.[0];
    if (!dp) {
      el.style.opacity = "0";
      return;
    }
    const name = String(dp.label || "");
    const value = typeof dp.parsed === "number" ? dp.parsed : Number(dp.raw) || 0;
    const pct =
      totalProfit > 0 ? Math.round((value / totalProfit) * 100) : 0;
    const bg = dp.dataset?.backgroundColor;
    const color = Array.isArray(bg)
      ? bg[dp.dataIndex]
      : bg || "#1E4AD1";

    el.innerHTML = `
      <div class="flex items-start gap-2">
        <span class="mt-1.5 w-2.5 h-2.5 rounded-sm shrink-0" style="background:${color}"></span>
        <div class="min-w-0">
          <p class="text-[12px] font-bold text-slate-800 leading-snug break-words">${escapeHtml(name)}</p>
          <p class="mt-1 text-[12px] tabular-nums text-[#1E4AD1] font-bold">${fmt(value)} · ${pct}%</p>
        </div>
      </div>
    `;

    const canvas = chart.canvas;
    const parent = el.offsetParent || el.parentElement;
    const cRect = canvas.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();
    const caretX = tooltip.caretX;
    const caretY = tooltip.caretY;
    const tipW = el.offsetWidth || 220;
    const localX = cRect.left - pRect.left + caretX;
    const localY = cRect.top - pRect.top + caretY;

    let tx = 14;
    if (localX + tipW + 16 > pRect.width) tx = -tipW - 10;

    el.style.opacity = "1";
    el.style.pointerEvents = "none";
    el.style.left = `${localX}px`;
    el.style.top = `${localY}px`;
    el.style.transform = `translate(${tx}px, -50%)`;
  };
}

function KpiCard({ icon, label, value, sub, accent = BLUE, loading }) {
  return (
    <div className="relative bg-white border border-slate-200 overflow-hidden min-h-[108px]">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accent }} />
      <div className="pl-5 pr-4 py-4">
        <div className="flex items-center gap-1.5 text-slate-500 mb-2">
          <MaterialIcon name={icon} size={16} className="text-slate-400" />
          <span className="text-[11px] font-bold tracking-wide">{label}</span>
        </div>
        <p className="text-[24px] sm:text-[1.75rem] font-bold tabular-nums text-slate-900 tracking-tight leading-none">
          {loading ? "…" : value}
        </p>
        {sub ? (
          <p className="mt-2 text-[11px] text-slate-500 leading-snug">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

function ChartShell({ icon, title, help, children, className = "", overflowVisible = false }) {
  return (
    <div
      className={`bg-white border border-slate-200 ${
        overflowVisible ? "overflow-visible" : "overflow-hidden"
      } ${className}`}
    >
      <MetricPanelHeader icon={icon} title={title} help={help} />
      <div className="px-3 sm:px-4 pb-4 pt-1">{children}</div>
    </div>
  );
}

function EmptyChart({ hint = "此期間尚無有效訂單" }) {
  return (
    <div className="h-full min-h-[160px] flex flex-col items-center justify-center gap-2 text-slate-400">
      <MaterialIcon name="insert_chart" size={32} className="opacity-40" />
      <p className="text-sm">{hint}</p>
    </div>
  );
}

export default function PartnerProductAnalytics({
  stats,
  loading,
  rangeStart,
  rangeEnd,
  onRangeStartChange,
  onRangeEndChange,
  onQuickRange,
}) {
  const printRef = useRef();
  const donutTipRef = useRef(null);
  const [granularity, setGranularity] = useState("month");
  const [metricFocus, setMetricFocus] = useState("profit"); // profit | revenue | orders
  const [activeShareIdx, setActiveShareIdx] = useState(null);

  useEffect(() => {
    // 初次進入用「月」視角，預設近 6 個月更利於看趨勢
    if (granularity === "month") {
      const r = lastNMonthsRange(6);
      // 僅當仍是預設當月時才擴張，避免覆寫使用者自訂區間
      const def = thisMonthRange();
      if (rangeStart === def.start && rangeEnd === def.end) {
        onRangeStartChange(r.start);
        onRangeEndChange(r.end);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGranularity = (id) => {
    setGranularity(id);
    applyGranularityRange(id, onRangeStartChange, onRangeEndChange);
  };

  const handleQuick = (type) => {
    if (type === "prevMonth" || type === "thisMonth") {
      onQuickRange?.(type);
      return;
    }
    let r;
    if (type === "last14d") r = lastNDaysRange(14);
    else if (type === "last7d") r = lastNDaysRange(7);
    else if (type === "last6m") r = lastNMonthsRange(6);
    else if (type === "thisQuarter") r = thisQuarterRange();
    else if (type === "last4q") r = lastNQuartersRange(4);
    else if (type === "thisYear") r = thisYearRange();
    else if (type === "last3y") r = lastNYearsRange(3);
    else return;
    onRangeStartChange(r.start);
    onRangeEndChange(r.end);
  };

  const filtered = useMemo(
    () => filterByRange(stats?.orders, rangeStart, rangeEnd),
    [stats?.orders, rangeStart, rangeEnd],
  );

  const valid = useMemo(
    () => filtered.filter((o) => isSettledOrderStatus(o.status)),
    [filtered],
  );

  const completed = useMemo(
    () => valid.filter((o) => String(o.status || "").toLowerCase() === "completed"),
    [valid],
  );

  const pending = useMemo(
    () => valid.filter((o) => String(o.status || "").toLowerCase() === "pending"),
    [valid],
  );

  const totals = useMemo(() => {
    const revenue = valid.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const profit = valid.reduce((s, o) => s + (Number(o.partner_profit) || 0), 0);
    const cost = valid.reduce((s, o) => s + (Number(o.b2b_cost) || 0), 0);
    const settledProfit = completed.reduce(
      (s, o) => s + (Number(o.partner_profit) || 0),
      0,
    );
    const rate = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    const avg = valid.length ? profit / valid.length : 0;
    return {
      revenue,
      profit,
      cost,
      settledProfit,
      count: valid.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      rate,
      avg,
    };
  }, [valid, completed, pending]);

  const series = useMemo(
    () => aggregateByBucket(valid, granularity, rangeStart, rangeEnd),
    [valid, granularity, rangeStart, rangeEnd],
  );

  const share = useMemo(() => productShare(valid), [valid]);

  const granLabel =
    GRANULARITY.find((g) => g.id === granularity)?.label || "月";

  const labels = series.map(([k]) => labelForKey(k, granularity));
  const hasSeriesData = series.some(([, v]) => v.cnt > 0);

  const trendData = {
    labels,
    datasets: [
      {
        label: "我的分潤",
        data: series.map(([, v]) => Math.round(v.profit)),
        borderColor: BLUE,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return "rgba(30,74,209,0.12)";
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, "rgba(30,74,209,0.28)");
          g.addColorStop(1, "rgba(30,74,209,0.02)");
          return g;
        },
        fill: true,
        tension: 0.35,
        pointRadius: granularity === "day" ? 2 : 4,
        pointHoverRadius: 6,
        pointBackgroundColor: BLUE,
        borderWidth: 2.5,
        yAxisID: "y",
      },
      {
        label: "店鋪營收",
        data: series.map(([, v]) => Math.round(v.rev)),
        borderColor: GREEN,
        backgroundColor: "transparent",
        borderDash: [5, 4],
        tension: 0.35,
        pointRadius: granularity === "day" ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        yAxisID: "y",
      },
      {
        label: "底價成本",
        data: series.map(([, v]) => Math.round(v.cost)),
        borderColor: "#94A3B8",
        backgroundColor: "transparent",
        borderDash: [2, 3],
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
        yAxisID: "y",
      },
    ],
  };

  const orderBarData = {
    labels,
    datasets: [
      {
        label: "訂單筆數",
        data: series.map(([, v]) => v.cnt),
        backgroundColor: (ctx) => {
          const i = ctx.dataIndex;
          const active = series[i]?.[1]?.cnt > 0;
          return active ? "rgba(30,74,209,0.88)" : "rgba(148,163,184,0.25)";
        },
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: granularity === "day" ? 18 : 36,
      },
    ],
  };

  const donutData = {
    labels: share.map(([n]) => n),
    datasets: [
      {
        data: share.map(([, v]) => Math.round(v.profit)),
        backgroundColor: PALETTE,
        borderWidth: 2,
        borderColor: "#fff",
        hoverOffset: 6,
      },
    ],
  };

  const topBarData = {
    // 軸標籤適度縮短；完整名稱放在 tooltip title
    labels: share.map(([n]) => (n.length > 18 ? `${n.slice(0, 18)}…` : n)),
    datasets: [
      {
        label: metricFocus === "orders" ? "訂單數" : metricFocus === "revenue" ? "營收" : "分潤",
        data: share.map(([, v]) =>
          metricFocus === "orders"
            ? v.cnt
            : Math.round(metricFocus === "revenue" ? v.rev : v.profit),
        ),
        backgroundColor: share.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 22,
        // 完整品名供 tooltip 使用
        fullNames: share.map(([n]) => n),
      },
    ],
  };

  const donutTooltip = useMemo(
    () => ({
      enabled: false,
      external: buildExternalTooltip(donutTipRef, { totalProfit: totals.profit }),
    }),
    [totals.profit],
  );

  const rankTooltip = {
    callbacks: {
      title(items) {
        const idx = items?.[0]?.dataIndex;
        const full = items?.[0]?.dataset?.fullNames?.[idx] || items?.[0]?.label || "";
        // Canvas tooltip 單行易裁切 → 拆成多行完整顯示
        const s = String(full);
        if (s.length <= 18) return s;
        const lines = [];
        for (let i = 0; i < s.length; i += 16) lines.push(s.slice(i, i + 16));
        return lines;
      },
      label(ctx) {
        const v = ctx.parsed.x;
        if (metricFocus === "orders") return ` ${v} 筆`;
        return ` ${fmt(v)}`;
      },
    },
  };

  const trendOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 14 },
      },
      tooltip: tooltipNtd,
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(148,163,184,0.18)" },
        ticks: {
          font: { size: 10 },
          callback: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v),
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          maxRotation: granularity === "day" ? 45 : 0,
          autoSkip: true,
          maxTicksLimit: granularity === "day" ? 12 : 8,
        },
      },
    },
  };

  const barOpts = {
    ...trendOpts,
    plugins: {
      legend: { display: false },
      tooltip: tooltipNtd,
    },
  };

  const hBarOpts = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...rankTooltip,
        padding: 10,
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 12 },
        displayColors: true,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "rgba(148,163,184,0.15)" },
        ticks: {
          font: { size: 10 },
          callback: (v) =>
            metricFocus === "orders" ? v : v >= 1000 ? `${Math.round(v / 1000)}k` : v,
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          // 軸上仍短顯；完整名稱看 tooltip
          callback(value) {
            const label = this.getLabelForValue(value);
            return label;
          },
        },
      },
    },
  };

  const isGood = !loading && totals.count > 0 && totals.profit > 0;

  return (
    <div ref={printRef} className="bg-slate-50/80">
      <ReportPeriodBar
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onRangeStartChange={onRangeStartChange}
        onRangeEndChange={onRangeEndChange}
        onQuickRange={handleQuick}
        granularity={granularity}
        onGranularityChange={handleGranularity}
        granularities={GRANULARITY}
      />

      <DobermanStatusBanner
        loading={loading}
        title={isGood ? "收益良好" : totals.count > 0 ? "推廣進行中" : "準備就緒"}
        message={
          loading
            ? "正在讀取數據..."
            : totals.count > 0
              ? `期間訂單 ${totals.count} 筆（已完成 ${totals.completedCount}・待付款 ${totals.pendingCount}）・累計分潤 ${fmt(totals.profit)}・可結算 ${fmt(totals.settledProfit)}・平均每單 ${fmt(totals.avg)}`
              : "尚無訂單，分享您的賣場連結或折扣碼開始推廣。"
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border-x border-b border-slate-200">
        <KpiCard
          icon="payments"
          label="累計分潤"
          value={fmt(totals.profit)}
          sub={`可結算（已完成） ${fmt(totals.settledProfit)}`}
          accent={BLUE}
          loading={loading}
        />
        <KpiCard
          icon="storefront"
          label="店鋪營收"
          value={fmt(totals.revenue)}
          sub={`底價成本 ${fmt(totals.cost)}`}
          accent={GREEN}
          loading={loading}
        />
        <KpiCard
          icon="percent"
          label="分潤占營收"
          value={loading ? "…" : `${totals.rate}%`}
          sub={
            loading
              ? "計算中…"
              : `累計分潤 ÷ 店鋪營收（每付 NT$100 約 NT$${totals.rate}；≠ 商店加價趴數）`
          }
          accent={TEAL}
          loading={loading}
        />
        <KpiCard
          icon="receipt_long"
          label="有效訂單"
          value={loading ? "…" : `${totals.count}`}
          sub={`已完成 ${totals.completedCount}・待付款 ${totals.pendingCount}`}
          accent={PARTNER_UI.yellow || "#F5C518"}
          loading={loading}
        />
      </div>

      {/* 主趨勢 */}
      <div className="border-x border-b border-slate-200 p-3 sm:p-4 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <MaterialIcon name="show_chart" size={18} className="text-[#1E4AD1]" />
              <h3 className="text-sm font-bold text-slate-800">
                收益趨勢（依{granLabel}）
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 ml-7">
              分潤／營收／底價同軸對照，時間以台北時區歸桶
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 sm:pr-1">
            <span className="inline-flex items-center gap-1">
              <i className="w-3 h-0.5 bg-[#1E4AD1] inline-block" /> 分潤
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="w-3 h-0.5 bg-[#10B981] inline-block border-t border-dashed" /> 營收
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="w-3 h-0.5 bg-slate-400 inline-block" /> 底價
            </span>
          </div>
        </div>
        <div className="h-56 sm:h-64">
          {hasSeriesData ? <Line data={trendData} options={trendOpts} /> : <EmptyChart />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-x border-b border-slate-200">
        <ChartShell
          icon="bar_chart"
          title={`訂單量（依${granLabel}）`}
          help={METRIC_HELP.orderVolume}
          className="border-b lg:border-b-0 lg:border-r border-slate-200"
        >
          <div className="h-48 sm:h-52 mt-1">
            {hasSeriesData ? <Bar data={orderBarData} options={barOpts} /> : <EmptyChart />}
          </div>
        </ChartShell>

        <ChartShell
          icon="donut_large"
          title="商品分潤占比"
          help={METRIC_HELP.productShare}
          overflowVisible
        >
          <div className="relative flex flex-col sm:flex-row items-stretch gap-4 min-h-[200px] overflow-visible">
            <div className="relative w-40 h-40 sm:w-44 sm:h-44 shrink-0 mx-auto sm:mx-0">
              {share.length > 0 ? (
                <>
                  <Doughnut
                    data={donutData}
                    options={{
                      cutout: "68%",
                      maintainAspectRatio: false,
                      onHover: (_evt, elements) => {
                        setActiveShareIdx(elements?.[0]?.index ?? null);
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: donutTooltip,
                      },
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      合計
                    </p>
                    <p className="text-sm font-bold text-slate-800 tabular-nums">
                      {fmt(totals.profit)}
                    </p>
                  </div>
                </>
              ) : (
                <EmptyChart hint="無分潤資料" />
              )}
            </div>
            {/* 外部 tooltip：掛在整塊面板，可換行顯示完整品名 */}
            {share.length > 0 ? (
              <div
                ref={donutTipRef}
                className="absolute z-30 w-[min(280px,calc(100%-1rem))] max-w-[280px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg transition-opacity duration-100 opacity-0 pointer-events-none"
                style={{ left: 0, top: 0 }}
              />
            ) : null}
            <ul className="space-y-2.5 flex-1 min-w-0">
              {share.length > 0
                ? share.slice(0, 6).map(([name, v], i) => {
                    const pct =
                      totals.profit > 0
                        ? Math.round((v.profit / totals.profit) * 100)
                        : 0;
                    const active = activeShareIdx === i;
                    return (
                      <li
                        key={name}
                        className={`flex items-start gap-2 text-xs min-w-0 rounded-md px-1.5 py-1 transition ${
                          active ? "bg-blue-50 ring-1 ring-[#1E4AD1]/20" : ""
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0 mt-0.5"
                          style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-700 leading-snug break-words">{name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                            {fmt(v.profit)}
                            <span className="mx-1 text-slate-300">·</span>
                            <span className="font-bold text-[#1E4AD1]">{pct}%</span>
                          </p>
                        </div>
                      </li>
                    );
                  })
                : null}
            </ul>
          </div>
        </ChartShell>
      </div>

      {/* Top 商品橫向長條 */}
      <div className="border-x border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 bg-[#F7F9FB] px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <MaterialIcon name="leaderboard" size={20} className="text-[#1E4AD1] shrink-0" />
            <span className="text-sm font-bold text-slate-800">商品排行</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              可切換分潤／營收／筆數
            </span>
          </div>
          <div className="flex items-center gap-1 self-start sm:self-auto bg-white border border-slate-200 p-0.5 rounded-lg">
            {[
              { id: "profit", label: "分潤" },
              { id: "revenue", label: "營收" },
              { id: "orders", label: "筆數" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetricFocus(m.id)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition ${
                  metricFocus === m.id
                    ? "bg-[#1E4AD1] text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-5 pt-2 h-56 sm:h-64">
          {share.length > 0 ? (
            <Bar data={topBarData} options={hBarOpts} />
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>
    </div>
  );
}
