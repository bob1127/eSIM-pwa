"use client";

import { useCallback, useEffect, useState } from "react";
import { bossFetch } from "@/lib/bossAdminClient";
import { getOrderStatusLabel } from "@/lib/adminAnalytics";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {
  BossAlert,
  BossButton,
  BossCard,
  BossField,
  BossFilterTabs,
  BossKpiCard,
  BossNum,
  BossSelect,
  BossStatusBadge,
} from "@/components/admin/bossUi";

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">主站銷售狀況</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            資料來自 Medusa 真實訂單（已排除夥伴店／連結）；成本取自變體{" "}
            <code className="text-[11px] bg-slate-100 px-1 rounded">cost_price</code>
            ，毛利＝營收 − 成本（未扣金流手續費）。
          </p>
        </div>
        <BossButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={load}
          disabled={loading}
        >
          {loading ? "更新中…" : "重新整理"}
        </BossButton>
      </div>

      <BossCard className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <BossField label="期間">
          <BossSelect value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="9999">全部</option>
            <option value="7">近 7 日</option>
            <option value="30">近 30 日</option>
            <option value="90">近 90 日</option>
            <option value="365">近 1 年</option>
          </BossSelect>
        </BossField>
        <BossField label="資料來源">
          <p className="text-xs text-slate-600 pt-2">
            Medusa 拉取 {meta?.medusaFetched ?? "—"} 筆
            {meta?.partnerSkipped != null
              ? ` · 已排除夥伴 ${meta.partnerSkipped}`
              : ""}
          </p>
        </BossField>
      </BossCard>

      <BossFilterTabs items={STATUS_TABS} value={status} onChange={setStatus} />

      {error && <BossAlert>{error}</BossAlert>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <BossKpiCard
          label="營收（已付款）"
          value={fmt(kpis.revenue)}
          sub={`${kpis.orderCount || 0} 筆 · 今日 ${fmt(kpis.todayRevenue || 0)}`}
        />
        <BossKpiCard
          label="供應成本"
          value={fmt(kpis.cost)}
          sub={
            kpis.missingCostCount
              ? `${kpis.missingCostCount} 筆缺 cost_price`
              : "變體 cost_price"
          }
        />
        <BossKpiCard
          label="毛利"
          value={fmt(kpis.profit)}
          sub="營收 − 成本"
        />
        <BossKpiCard
          label="今日訂單"
          value={String(kpis.todayOrders || 0)}
          sub={`近 7 日營收 ${fmt(kpis.weekRevenue || 0)}`}
        />
        <BossKpiCard
          label="待付款 / 退款"
          value={`${kpis.pendingCount || 0} / ${kpis.refundCount || 0}`}
        />
      </div>

      {chart?.labels?.length ? (
        <BossCard className="p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">
            近 {chart.labels.length} 日營收／毛利（已付款）
          </p>
          <div className="flex items-end gap-1 h-28">
            {chart.labels.map((label, i) => {
              const rev = Number(chart.revenueSeries[i]) || 0;
              const max = Math.max(1, ...chart.revenueSeries.map(Number));
              const h = Math.round((rev / max) * 100);
              return (
                <div
                  key={`${label}-${i}`}
                  className="flex-1 min-w-0 flex flex-col items-center gap-1"
                  title={`${label} · 營收 ${fmt(rev)} · 毛利 ${fmt(chart.profitSeries[i])}`}
                >
                  <div
                    className="w-full max-w-[14px] rounded-t bg-[#1a56db]/80"
                    style={{ height: `${Math.max(h, rev > 0 ? 4 : 0)}%` }}
                  />
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </BossCard>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BossCard className="lg:col-span-1 p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900">商品營收排行</h4>
          </div>
          {loading ? (
            <LoadingIndicator layout="center" label="載入中…" className="py-10" />
          ) : productRank.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">尚無已付款商品</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {productRank.map((p, idx) => (
                <li
                  key={p.name}
                  className="px-4 py-2.5 flex items-start justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                      {p.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {p.qty} 件 · 成本 {fmt(p.cost)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <BossNum className="font-semibold">{fmt(p.revenue)}</BossNum>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      毛利 {fmt(p.profit)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BossCard>

        <BossCard className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">訂單明細</h4>
            <span className="text-[11px] text-slate-400">{orders.length} 筆</span>
          </div>
          {loading ? (
            <LoadingIndicator
              layout="center"
              label="載入 Medusa 訂單…"
              className="py-16"
            />
          ) : orders.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">
              沒有符合條件的主站訂單
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
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
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          #{o.displayId ?? o.id.slice(-8)}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[140px]">
                          {o.id}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-[160px] truncate">
                        {o.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                        {o.itemSummary}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossStatusBadge
                          status={o.status}
                          label={getOrderStatusLabel(o.status)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossNum className="font-medium">{fmt(o.revenue)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        <BossNum>{fmt(o.cost)}</BossNum>
                        {o.missingCost ? (
                          <p className="text-[10px] text-amber-600 mt-0.5">缺成本</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <BossNum>{fmt(o.profit)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
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
        </BossCard>
      </div>
    </div>
  );
}
