"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { bossFetch } from "@/lib/bossAdminClient";
import { getOrderStatusLabel } from "@/lib/adminAnalytics";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { BossAlert, BossNum, BossStatusBadge } from "@/components/admin/bossUi";
import {
  BOSS_AUI,
  BossAnalyticsCard,
  BossAnalyticsHeader,
  BossStatPill,
  BossStatusChips,
} from "@/components/admin/BossAnalyticsChrome";

const chartLoading = () => (
  <div className="h-28 flex items-center justify-center">
    <LoadingIndicator layout="center" label="載入圖表…" size="sm" />
  </div>
);

const RevenueSplitDonut = dynamic(
  () =>
    import("@/components/partner/AnalyticsCharts").then(
      (m) => m.RevenueSplitDonut,
    ),
  { ssr: false, loading: chartLoading },
);
const CountCircle = dynamic(
  () =>
    import("@/components/partner/AnalyticsCharts").then((m) => m.CountCircle),
  { ssr: false, loading: chartLoading },
);
const MonthlyBarChart = dynamic(
  () =>
    import("@/components/partner/AnalyticsCharts").then(
      (m) => m.MonthlyBarChart,
    ),
  { ssr: false, loading: chartLoading },
);

const fmt = (n) => `NT$${Math.round(Number(n) || 0).toLocaleString()}`;

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "completed", label: "已付款" },
  { value: "pending", label: "尚未付款" },
  { value: "refunded", label: "已退款" },
];

export default function BossMainSiteSalesPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [meta, setMeta] = useState(null);
  const [days, setDays] = useState("9999");
  const [status, setStatus] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ days, status });
      const data = await bossFetch(`/api/admin/main-site-analytics?${q}`);
      setReport(data.report || null);
      setMeta(data.meta || null);
    } catch (err) {
      setError(err.message || "載入失敗");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [days, status]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = report?.kpis || {};
  const orders = report?.orders || [];
  const productRank = report?.productRank || [];
  const chart = report?.lineChart;

  const monthlyBuckets = useMemo(() => {
    if (!chart?.labels?.length) return [];
    return chart.labels.map((label, i) => ({
      label,
      profit: Number(chart.profitSeries?.[i]) || 0,
      revenue: Number(chart.revenueSeries?.[i]) || 0,
    }));
  }, [chart]);

  const periodHint =
    days === "9999"
      ? "全部期間"
      : days === "365"
        ? "近 1 年"
        : `近 ${days} 天`;

  return (
    <div className="space-y-5" style={{ backgroundColor: BOSS_AUI.wash }}>
      <BossAnalyticsHeader
        title="主站銷售狀況"
        subtitle="Medusa 真實訂單（已排除夥伴店／連結與測試購買）；毛利＝營收 − 變體 cost_price"
        rangeValue={days}
        onRangeChange={setDays}
        extra={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="min-h-9 px-3 py-1.5 text-xs font-bold rounded-xl border bg-white disabled:opacity-50"
            style={{ borderColor: BOSS_AUI.border, color: BOSS_AUI.mid }}
          >
            {loading ? "更新中…" : "重新整理"}
          </button>
        }
      />

      <BossAnalyticsCard className="px-5 py-4">
        <p className="text-base font-black" style={{ color: BOSS_AUI.dark }}>
          {loading
            ? "正在讀取主站訂單…"
            : (kpis.orderCount || 0) > 0
              ? `${periodHint}營收 ${fmt(kpis.revenue)}，毛利 ${fmt(kpis.profit)}（${kpis.orderCount} 筆已付款）`
              : `${periodHint}尚無符合條件的已付款訂單`}
        </p>
        <p className="text-xs mt-1" style={{ color: BOSS_AUI.mid }}>
          Medusa 拉取 {meta?.medusaFetched ?? "—"} 筆
          {meta?.partnerSkipped != null
            ? ` · 已排除夥伴 ${meta.partnerSkipped}`
            : ""}
          {meta?.testSkipped != null && meta.testSkipped > 0
            ? ` · 已排除測試單 ${meta.testSkipped}`
            : ""}
        </p>
      </BossAnalyticsCard>

      <BossStatusChips
        items={STATUS_TABS}
        value={status}
        onChange={setStatus}
      />

      {error ? <BossAlert>{error}</BossAlert> : null}

      <div className="flex flex-wrap gap-3">
        <BossStatPill
          icon="payments"
          iconBg="#2c6ecb"
          label="營收（已付款）"
          value={loading ? "…" : fmt(kpis.revenue)}
          sub={`今日 ${fmt(kpis.todayRevenue || 0)}`}
        />
        <BossStatPill
          icon="inventory_2"
          iconBg="#8c9196"
          label="供應成本"
          value={loading ? "…" : fmt(kpis.cost)}
          sub={
            kpis.missingCostCount
              ? `${kpis.missingCostCount} 筆缺 cost_price`
              : "變體 cost_price"
          }
        />
        <BossStatPill
          icon="account_balance_wallet"
          iconBg="#008060"
          label="毛利"
          value={loading ? "…" : fmt(kpis.profit)}
          sub="營收 − 成本"
        />
        <BossStatPill
          icon="receipt_long"
          iconBg="#1a1a1a"
          label="今日訂單"
          value={loading ? "…" : String(kpis.todayOrders || 0)}
          sub={`近 7 日營收 ${fmt(kpis.weekRevenue || 0)}`}
        />
        <BossStatPill
          icon="report"
          iconBg="#eec200"
          label="待付款 / 退款"
          value={
            loading
              ? "…"
              : `${kpis.pendingCount || 0} / ${kpis.refundCount || 0}`
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <BossAnalyticsCard className="p-4">
          <p
            className="text-xs font-bold mb-3"
            style={{ color: BOSS_AUI.mid }}
          >
            毛利 vs 供應成本
          </p>
          {loading ? (
            chartLoading()
          ) : (
            <RevenueSplitDonut
              profit={Number(kpis.profit) || 0}
              cost={Number(kpis.cost) || 0}
              costLabel="供應成本"
            />
          )}
        </BossAnalyticsCard>

        <BossAnalyticsCard className="p-4 flex items-center gap-4">
          {loading ? (
            chartLoading()
          ) : (
            <>
              <CountCircle value={kpis.todayOrders || 0} color="#008060" />
              <div>
                <p className="text-xs font-bold" style={{ color: BOSS_AUI.mid }}>
                  今日新增訂單
                </p>
                <p className="text-[11px] mt-1" style={{ color: BOSS_AUI.soft }}>
                  主站渠道（已排除夥伴）
                </p>
              </div>
            </>
          )}
        </BossAnalyticsCard>

        <BossAnalyticsCard className="p-4">
          <p className="text-xs font-bold mb-2" style={{ color: BOSS_AUI.mid }}>
            期間毛利趨勢
          </p>
          <div className="h-28">
            {loading ? (
              chartLoading()
            ) : (
              <MonthlyBarChart buckets={monthlyBuckets} />
            )}
          </div>
        </BossAnalyticsCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BossAnalyticsCard className="lg:col-span-1 overflow-hidden">
          <div
            className="px-4 py-3"
            style={{ borderBottom: `1px solid ${BOSS_AUI.border}` }}
          >
            <h4
              className="text-sm font-black"
              style={{ color: BOSS_AUI.dark }}
            >
              熱銷商品
            </h4>
          </div>
          {loading ? (
            <LoadingIndicator layout="center" label="載入中…" className="py-10" />
          ) : productRank.length === 0 ? (
            <p
              className="py-10 text-center text-sm"
              style={{ color: BOSS_AUI.soft }}
            >
              尚無已付款商品
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: BOSS_AUI.border }}>
              {productRank.slice(0, 8).map((p, idx) => (
                <li
                  key={p.name}
                  className="px-4 py-3 flex items-start justify-between gap-2"
                  style={{ borderColor: BOSS_AUI.border }}
                >
                  <div className="min-w-0 flex gap-2">
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                      style={{
                        backgroundColor: idx < 3 ? "#1E4AD1" : BOSS_AUI.light,
                        color: idx < 3 ? "#fff" : BOSS_AUI.mid,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-bold truncate"
                        style={{ color: BOSS_AUI.dark }}
                      >
                        {p.name}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: BOSS_AUI.soft }}
                      >
                        {p.qty} 件 · 成本 {fmt(p.cost)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <BossNum className="text-sm font-black">{fmt(p.revenue)}</BossNum>
                    <p className="text-[11px] text-emerald-700 mt-0.5 font-semibold">
                      毛利 {fmt(p.profit)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BossAnalyticsCard>

        <BossAnalyticsCard className="lg:col-span-2 overflow-hidden">
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${BOSS_AUI.border}` }}
          >
            <h4
              className="text-sm font-black"
              style={{ color: BOSS_AUI.dark }}
            >
              訂單明細
            </h4>
            <span className="text-[11px]" style={{ color: BOSS_AUI.soft }}>
              {orders.length} 筆
            </span>
          </div>
          {loading ? (
            <LoadingIndicator
              layout="center"
              label="載入 Medusa 訂單…"
              className="py-16"
            />
          ) : orders.length === 0 ? (
            <p
              className="py-12 text-center text-sm"
              style={{ color: BOSS_AUI.soft }}
            >
              沒有符合條件的主站訂單
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: BOSS_AUI.wash }}>
                  <tr className="text-[11px]" style={{ color: BOSS_AUI.soft }}>
                    <th className="px-4 py-3 text-left font-bold">訂單</th>
                    <th className="px-4 py-3 text-left font-bold">買家</th>
                    <th className="px-4 py-3 text-left font-bold">商品</th>
                    <th className="px-4 py-3 text-center font-bold">狀態</th>
                    <th className="px-4 py-3 text-right font-bold">營收</th>
                    <th className="px-4 py-3 text-right font-bold">成本</th>
                    <th className="px-4 py-3 text-right font-bold">毛利</th>
                    <th className="px-4 py-3 text-left font-bold">日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#fafafa]">
                      <td className="px-4 py-3">
                        <p
                          className="font-bold"
                          style={{ color: BOSS_AUI.dark }}
                        >
                          #{o.displayId ?? o.id.slice(-8)}
                        </p>
                        <p className="text-[10px] font-mono mt-0.5 truncate max-w-[140px]" style={{ color: BOSS_AUI.soft }}>
                          {o.id}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: BOSS_AUI.mid }}>
                        {o.email || "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: BOSS_AUI.mid }}>
                        {o.itemSummary}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossStatusBadge
                          status={o.status}
                          label={getOrderStatusLabel(o.status)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossNum className="font-bold">{fmt(o.revenue)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: BOSS_AUI.mid }}>
                        <BossNum>{fmt(o.cost)}</BossNum>
                        {o.missingCost ? (
                          <p className="text-[10px] text-amber-600 mt-0.5">缺成本</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right font-black">
                        <BossNum>{fmt(o.profit)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: BOSS_AUI.soft }}>
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleString("zh-TW", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BossAnalyticsCard>
      </div>
    </div>
  );
}
