"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import AccountIcon from "@/components/account/AccountIcon";
import { buildAdminAnalytics } from "@/lib/adminAnalytics";
import { ACCENT, InnerTabs, AccountPageWrap } from "./AccountShell";
import AccountBossGate from "./AccountBossGate";
import AccountBossPartnersPanel from "./AccountBossPartnersPanel";
import AdminRefundsPanel from "@/components/admin/AdminRefundsPanel";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const chartLoading = (
  <div className="h-56 flex items-center justify-center">
    <LoadingIndicator layout="center" label="載入圖表…" />
  </div>
);

const RevenueLineChart = dynamic(
  () => import("./AdminAnalyticsCharts").then((m) => m.RevenueLineChart),
  { ssr: false, loading: () => chartLoading },
);
const StoreDonutChart = dynamic(
  () => import("./AdminAnalyticsCharts").then((m) => m.StoreDonutChart),
  { ssr: false, loading: () => chartLoading },
);
const ProductBarChart = dynamic(
  () => import("./AdminAnalyticsCharts").then((m) => m.ProductBarChart),
  { ssr: false, loading: () => chartLoading },
);
const Sparkline = dynamic(
  () => import("./AdminAnalyticsCharts").then((m) => m.Sparkline),
  { ssr: false, loading: () => <div className="h-8 w-20" /> },
);

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("zh-TW");

function KpiCard({ label, value, sub, change, active, onClick, sparkData }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-sm border bg-white transition hover:shadow-md w-full ${
        active ? "border-[#0071EB] ring-2 ring-[#0071EB]/20" : "border-slate-200"
      }`}
    >
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="text-2xl font-black text-[#1E4AD1] mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      {change != null && (
        <p
          className={`text-[11px] font-bold mt-2 ${
            change >= 0 ? "text-[#0071EB]" : "text-red-500"
          }`}
        >
          {change >= 0 ? "▲" : "▼"} 較昨日 {Math.abs(change)}%
        </p>
      )}
      {sparkData && (
        <div className="mt-2 opacity-70">
          <Sparkline data={sparkData} />
        </div>
      )}
    </button>
  );
}

export default function AccountAdminDashboardView({
  adminStats,
  adminAllOrders,
  groupedStores,
  statsLoading,
}) {
  const [days, setDays] = useState(30);
  const [section, setSection] = useState("overview");
  const [chartMetric, setChartMetric] = useState("revenue");

  const analytics = useMemo(
    () => buildAdminAnalytics(adminAllOrders, days),
    [adminAllOrders, days],
  );
  const { kpis, lineChart, storeShare, productRank, recentActivity } = analytics;

  const sections = [
    { id: "overview", label: "營運概況" },
    { id: "sales", label: "銷售分析" },
    { id: "stores", label: "分店分布" },
    { id: "partners", label: "夥伴審核" },
    { id: "refunds", label: "退款審核" },
  ];

  return (
    <AccountPageWrap className="space-y-5">
      {/* 頂部篩選 — 數據中心風 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-slate-500">全站營收、訂單與分店數據分析</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-sm px-3 py-2 bg-white font-medium"
          >
            <option value={7}>近 7 日</option>
            <option value={30}>近 30 日</option>
            <option value={90}>近 90 日</option>
          </select>
          <Link
            href="/admin-boss"
            target="_blank"
            className="text-xs font-bold text-[#0071EB] border border-[#0071EB] px-3 py-2 rounded-sm hover:bg-blue-50 flex items-center gap-1"
          >
            <AccountIcon name="open_in_new" size={14} />
            獨立後台
          </Link>
        </div>
      </div>

      <InnerTabs tabs={sections} active={section} onChange={setSection} />

      {(section === "overview" ||
        section === "sales" ||
        section === "stores") && (
      <>
      {/* KPI 卡片列 — 商品分析 / 數據中心風 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="全站營收"
          value={statsLoading ? "…" : `NT$ ${fmt(kpis.revenue)}`}
          sub={`今日 NT$ ${fmt(kpis.todayRevenue)}`}
          change={kpis.revenueVsYesterday}
          active={chartMetric === "revenue"}
          onClick={() => setChartMetric("revenue")}
          sparkData={lineChart.revenueSeries.slice(-7)}
        />
        <KpiCard
          label="有效訂單"
          value={statsLoading ? "…" : kpis.orderCount}
          sub={`今日 ${kpis.todayOrders} 筆`}
          change={kpis.ordersVsYesterday}
          active={chartMetric === "orders"}
          onClick={() => setChartMetric("orders")}
          sparkData={lineChart.orderSeries.slice(-7)}
        />
        <KpiCard
          label="退款金額"
          value={statsLoading ? "…" : `NT$ ${fmt(kpis.refundAmount)}`}
          sub={`${kpis.refundCount} 筆已退款`}
        />
        <KpiCard
          label="合作夥伴"
          value={statsLoading ? "…" : adminStats.partnerCount}
          sub={`分潤 NT$ ${fmt(kpis.partnerProfit)}`}
        />
      </div>

      {section === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] gap-5 xl:gap-6">
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-[#1E4AD1]">
                {chartMetric === "revenue" ? "營收趨勢" : "訂單趨勢"}
              </h3>
              <span className="text-[10px] text-slate-400">近 {days} 日</span>
            </div>
            {statsLoading ? (
              <div className="h-56 flex items-center justify-center">
                <LoadingIndicator layout="center" label="載入中…" />
              </div>
            ) : (
              <RevenueLineChart
                labels={lineChart.labels}
                revenueSeries={lineChart.revenueSeries}
                orderSeries={lineChart.orderSeries}
                metric={chartMetric}
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm">
              <h3 className="text-sm font-black text-[#1E4AD1] mb-3">即時概況</h3>
              <ul className="space-y-2 text-sm">
                {[
                  { label: "待付款", val: kpis.pendingCount, icon: "pending" },
                  { label: "已發貨", val: kpis.completedCount, icon: "check_circle" },
                  { label: "本週營收", val: `NT$ ${fmt(kpis.weekRevenue)}`, icon: "payments" },
                ].map((row) => (
                  <li key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="flex items-center gap-2 text-slate-600">
                      <AccountIcon name={row.icon} size={18} className="text-[#0071EB]" />
                      {row.label}
                    </span>
                    <span className="font-bold text-[#1E4AD1] tabular-nums">{row.val}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm">
              <h3 className="text-sm font-black text-[#1E4AD1] mb-3">最新動態</h3>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {recentActivity.map((a) => (
                  <li key={a.id} className="text-[11px] text-slate-600 flex gap-2">
                    <AccountIcon name="receipt" size={14} className="text-slate-300 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.label}</p>
                      <p className="text-slate-400">
                        {new Date(a.at).toLocaleString("zh-TW", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {section === "sales" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
            <h3 className="text-sm font-black text-[#1E4AD1] mb-4">方案銷售排行</h3>
            <ProductBarChart productRank={productRank} />
          </div>
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
            <h3 className="text-sm font-black text-[#1E4AD1] mb-4">方案銷售明細</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-slate-400 border-b">
                  <th className="text-left pb-2 font-bold">排名</th>
                  <th className="text-left pb-2 font-bold">方案</th>
                  <th className="text-right pb-2 font-bold">銷量</th>
                  <th className="text-right pb-2 font-bold">營收</th>
                </tr>
              </thead>
              <tbody>
                {productRank.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      尚無資料
                    </td>
                  </tr>
                ) : (
                  productRank.map((p, i) => (
                    <tr key={p.name} className="border-b border-slate-50">
                      <td className="py-2.5 font-bold text-slate-400">{i + 1}</td>
                      <td className="py-2.5 font-medium text-[#1E4AD1] truncate max-w-[140px]">
                        {p.name}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{p.qty}</td>
                      <td className="py-2.5 text-right font-bold text-[#0071EB] tabular-nums">
                        NT$ {fmt(p.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === "stores" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
            <h3 className="text-sm font-black text-[#1E4AD1] mb-4">分店營收占比</h3>
            <StoreDonutChart storeShare={storeShare} totalRevenue={kpis.revenue} />
          </div>
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-black text-[#1E4AD1] mb-4">各店營收排行</h3>
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="text-[11px] text-slate-400 border-b">
                  <th className="text-left pb-2 font-bold">店鋪</th>
                  <th className="text-right pb-2 font-bold">訂單</th>
                  <th className="text-right pb-2 font-bold">營收</th>
                  <th className="text-right pb-2 font-bold">分潤</th>
                </tr>
              </thead>
              <tbody>
                {(groupedStores.length ? groupedStores : storeShare).map((s) => (
                  <tr key={s.store_id || s.name} className="border-b border-slate-50">
                    <td className="py-3 font-semibold text-[#1E4AD1]">
                      {s.store_name || s.name}
                    </td>
                    <td className="py-3 text-right tabular-nums">{s.orderCount ?? s.orders}</td>
                    <td className="py-3 text-right font-bold tabular-nums">
                      NT$ {fmt(s.totalRevenue ?? s.revenue)}
                    </td>
                    <td className="py-3 text-right text-emerald-600 font-semibold tabular-nums">
                      NT$ {fmt(s.totalProfit ?? s.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}

      {section === "partners" && (
        <AccountBossGate>
          <AccountBossPartnersPanel />
        </AccountBossGate>
      )}

      {section === "refunds" && (
        <AccountBossGate>
          <AdminRefundsPanel />
        </AccountBossGate>
      )}
    </AccountPageWrap>
  );
}
