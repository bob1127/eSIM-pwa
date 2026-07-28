import { useMemo, useRef } from "react";
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
  DobermanPanel,
  fmt,
  METRIC_HELP,
  MetricPanelHeader,
} from "@/components/partner/DobermanWidgets";
import { isSettledOrderStatus } from "@/lib/refundPolicy";

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Filler,
);

const PALETTE = ["#1E4AD1", "#4ade80", "#fbbf24", "#f87171", "#a78bfa", "#94a3b8"];

function filterByRange(orders = [], start, end) {
  const s = start ? new Date(start).getTime() : 0;
  const e = end ? new Date(end + "T23:59:59").getTime() : Infinity;
  return orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= s && t <= e;
  });
}

function productShare(orders) {
  const map = {};
  for (const o of orders) {
    const items = (() => {
      try {
        return Array.isArray(o.item_details) ? o.item_details : JSON.parse(o.item_details || "[]");
      } catch {
        return [];
      }
    })();
    const key = items[0]?.name || "其他方案";
    map[key] = (map[key] || 0) + (Number(o.partner_profit) || 0);
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function byMonth(orders) {
  const map = {};
  for (const o of orders) {
    const d = new Date(o.created_at);
    const k = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[k]) map[k] = { rev: 0, profit: 0, cnt: 0 };
    map[k].rev += Number(o.total_amount) || 0;
    map[k].profit += Number(o.partner_profit) || 0;
    map[k].cnt += 1;
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
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

  const filtered = useMemo(
    () => filterByRange(stats?.orders, rangeStart, rangeEnd),
    [stats?.orders, rangeStart, rangeEnd],
  );

  const valid = useMemo(
    () => filtered.filter((o) => isSettledOrderStatus(o.status)),
    [filtered],
  );

  const totals = useMemo(() => {
    const revenue = valid.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const profit = valid.reduce((s, o) => s + (Number(o.partner_profit) || 0), 0);
    const cost = valid.reduce((s, o) => s + (Number(o.b2b_cost) || 0), 0);
    const rate = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    const avg = valid.length ? profit / valid.length : 0;
    return { revenue, profit, cost, count: valid.length, rate, avg };
  }, [valid]);

  const share = useMemo(() => productShare(valid), [valid]);
  const monthly = useMemo(() => byMonth(valid), [valid]);

  const donutData = {
    labels: share.map(([n]) => n),
    datasets: [{ data: share.map(([, v]) => v), backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 5 }],
  };

  const lineData = {
    labels: monthly.map(([m]) => m),
    datasets: [
      {
        label: "我的分潤",
        data: monthly.map(([, v]) => v.profit),
        borderColor: "#1E4AD1",
        backgroundColor: "rgba(26,86,219,0.10)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
      },
      {
        label: "店鋪營收",
        data: monthly.map(([, v]) => v.rev),
        borderColor: "#4ade80",
        backgroundColor: "transparent",
        borderDash: [4, 4],
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  const barData = {
    labels: monthly.map(([m]) => m),
    datasets: [{
      label: "訂單數",
      data: monthly.map(([, v]) => v.cnt),
      backgroundColor: "rgba(26,58,107,0.82)",
      borderRadius: 5,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
    scales: {
      y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

  const isGood = !loading && totals.count > 0 && totals.profit > 0;

  return (
    <div ref={printRef}>
      <ReportPeriodBar
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onRangeStartChange={onRangeStartChange}
        onRangeEndChange={onRangeEndChange}
        onQuickRange={onQuickRange}
      />

      <DobermanStatusBanner
        loading={loading}
        title={isGood ? "收益良好" : totals.count > 0 ? "推廣進行中" : "準備就緒"}
        message={
          loading
            ? "正在讀取數據..."
            : totals.count > 0
              ? `期間訂單 ${totals.count} 筆・累計分潤 ${fmt(totals.profit)}・平均每單 ${fmt(totals.avg)}`
              : "尚無訂單，分享您的賣場連結或折扣碼開始推廣。"
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 border-x border-b border-slate-200">
        <div className="border-b lg:border-r border-slate-200">
          <DobermanPanel
            icon="payments"
            title="累計分潤（淨收益）"
            help={METRIC_HELP.totalProfit}
            rows={[{ label: "分潤合計", value: loading ? "..." : fmt(totals.profit) }]}
          />
        </div>
        <div className="border-b border-slate-200">
          <DobermanPanel
            icon="language"
            title="店鋪營收"
            help={METRIC_HELP.storeRevenue}
            rows={[
              { label: "受取合計", arrow: "up", value: loading ? "..." : fmt(totals.revenue) },
              { label: "底價成本", arrow: "down", value: loading ? "..." : fmt(totals.cost) },
            ]}
          />
        </div>
        <div className="lg:border-r border-b lg:border-b-0 border-slate-200">
          <DobermanPanel
            icon="filter_alt"
            title="分潤率分析"
            help={METRIC_HELP.profitRate}
            rows={[
              { label: "分潤率", value: loading ? "..." : totals.rate, unit: "%" },
              { label: "有效訂單", value: loading ? "..." : totals.count, unit: "筆" },
            ]}
          />
        </div>
        <div>
          <div className="bg-white overflow-hidden h-full">
            <MetricPanelHeader
              icon="donut_large"
              title="商品分潤報表"
              help={METRIC_HELP.productShare}
            />
            <div className="px-4 py-3 flex items-center gap-4">
              <div className="relative w-32 h-32 shrink-0">
                {share.length > 0 ? (
                  <>
                    <Doughnut
                      data={donutData}
                      options={{ cutout: "66%", plugins: { legend: { display: false } }, maintainAspectRatio: false }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-[9px] text-slate-400 font-bold">合計</p>
                      <p className="text-xs font-black text-slate-700">{fmt(totals.profit)}</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex flex-col items-center justify-center gap-1">
                      <MaterialIcon name="pie_chart" size={28} className="text-slate-300" />
                      <p className="text-[10px] text-slate-400">無資料</p>
                    </div>
                  </div>
                )}
              </div>
              <ul className="space-y-1.5 flex-1 min-w-0">
                {share.length > 0
                  ? share.map(([name, val], i) => (
                    <li key={name} className="flex items-center gap-1.5 text-xs min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                      <span className="text-slate-500 truncate flex-1">{name}</span>
                      <span className="font-bold text-[#1E4AD1] tabular-nums shrink-0">
                        {totals.profit > 0 ? `${Math.round((val / totals.profit) * 100)}%` : "0%"}
                      </span>
                    </li>
                  ))
                  : <li className="text-xs text-slate-400">尚無分潤資料</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-x border-b border-slate-200">
        <div className="border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-4">
          <MetricPanelHeader
            icon="show_chart"
            title="收益趨勢（近 6 期）"
            help={METRIC_HELP.revenueTrend}
          />
          <div className="h-44 mt-3">
            {monthly.length > 0 ? <Line data={lineData} options={chartOpts} /> : <Empty />}
          </div>
        </div>
        <div className="bg-white p-4">
          <MetricPanelHeader
            icon="bar_chart"
            title="訂單量分析（近 6 期）"
            help={METRIC_HELP.orderVolume}
          />
          <div className="h-44 mt-3">
            {monthly.length > 0
              ? <Bar data={barData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
              : <Empty />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-400">
      尚無資料
    </div>
  );
}
