"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { bossFetch } from "@/lib/bossAdminClient";
import {
  getOrderStatusLabel,
  getPartnerCooperationLabel,
} from "@/lib/adminAnalytics";
import PartnerDetailPanel from "@/components/admin/PartnerDetailPanel";

const fmt = (n) => `NT$${Math.round(Number(n) || 0).toLocaleString()}`;

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "completed", label: "已完成" },
  { value: "refunded", label: "已退款" },
  { value: "pending", label: "尚未付款" },
  { value: "refund_pending", label: "退款審核中" },
];

function Kpi({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`text-2xl font-black mt-1 tabular-nums ${accent || "text-[#1e3a5f]"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function CooperationBadge({ model, label }) {
  const isReferral = model === "referral";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-bold whitespace-nowrap ${
        isReferral
          ? "bg-violet-50 text-violet-700 border border-violet-200"
          : "bg-sky-50 text-sky-800 border border-sky-200"
      }`}
    >
      {label || getPartnerCooperationLabel(model)}
    </span>
  );
}

function OrdersTable({ orders, statusBadge, onOpenPartner }) {
  if (orders.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        沒有符合條件的訂單
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs">
          <tr>
            <th className="px-4 py-3 text-left font-bold">訂單</th>
            <th className="px-4 py-3 text-left font-bold">夥伴 / 店鋪</th>
            <th className="px-4 py-3 text-left font-bold">商品</th>
            <th className="px-4 py-3 text-center font-bold">狀態</th>
            <th className="px-4 py-3 text-right font-bold">營收</th>
            <th className="px-4 py-3 text-right font-bold">底價</th>
            <th className="px-4 py-3 text-right font-bold">分潤</th>
            <th className="px-4 py-3 text-right font-bold">我的利潤</th>
            <th className="px-4 py-3 text-left font-bold">日期</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 font-bold text-slate-800">#{o.id}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onOpenPartner?.(o.partnerId)}
                  className="font-bold text-slate-700 hover:text-[#1a56db] text-left"
                >
                  {o.partnerName}
                </button>
                <div className="mt-1">
                  <CooperationBadge
                    model={o.cooperationModel}
                    label={o.cooperationLabel}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{o.storeName}</p>
              </td>
              <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                {o.itemSummary}
              </td>
              <td className="px-4 py-3 text-center">{statusBadge(o.status)}</td>
              <td className="px-4 py-3 text-right font-bold">{fmt(o.totalAmount)}</td>
              <td className="px-4 py-3 text-right text-slate-600">{fmt(o.b2bCost)}</td>
              <td className="px-4 py-3 text-right text-[#1a56db] font-bold">
                {fmt(o.partnerProfit)}
              </td>
              <td className="px-4 py-3 text-right font-black text-emerald-700">
                {fmt(o.platformProfit)}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString("zh-TW")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BossSalesAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partners, setPartners] = useState([]);
  const [stores, setStores] = useState([]);
  const [report, setReport] = useState(null);
  const [partnerId, setPartnerId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState("30");
  /** partners = 外層夥伴；orders = 訂單明細；stores = 依店鋪 */
  const [view, setView] = useState("partners");
  const [detailPartner, setDetailPartner] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ days, status });
      if (partnerId) q.set("partner_id", partnerId);
      if (storeId) q.set("store_id", storeId);
      const data = await bossFetch(`/api/admin/analytics?${q}`);
      setPartners(data.partners || []);
      setStores(data.stores || []);
      setReport(data.report || null);
    } catch (err) {
      setError(err.message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [partnerId, storeId, status, days]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = report?.kpis || {};
  const orders = report?.orders || [];
  const partnerRows = useMemo(() => report?.byPartner || [], [report]);
  const storeRows = useMemo(() => report?.byStore || [], [report]);

  const partnerMetaById = useMemo(() => {
    const map = new Map();
    for (const p of partners) {
      map.set(String(p.id), p);
    }
    return map;
  }, [partners]);

  const enrichPartnerRow = useCallback(
    (row) => {
      const meta = partnerMetaById.get(String(row.partnerId));
      const model = meta?.cooperation_model || row.cooperationModel || "store";
      return {
        ...row,
        email: row.email || meta?.email || "",
        cooperationModel: model,
        cooperationLabel:
          row.cooperationLabel || getPartnerCooperationLabel(model),
        referralCode: row.referralCode || meta?.referral_code || "",
      };
    },
    [partnerMetaById],
  );

  const enrichedPartnerRows = useMemo(
    () => partnerRows.map(enrichPartnerRow),
    [partnerRows, enrichPartnerRow],
  );

  const drilledPartner = useMemo(() => {
    if (!partnerId) return null;
    return (
      enrichedPartnerRows.find((p) => String(p.partnerId) === String(partnerId)) ||
      (() => {
        const meta = partnerMetaById.get(String(partnerId));
        if (!meta) return null;
        return enrichPartnerRow({
          partnerId: meta.id,
          name: meta.name,
          slug: meta.slug,
          cooperationModel: meta.cooperation_model,
          orders: orders.length,
          revenue: kpis.revenue,
          profit: kpis.partnerProfit,
          completed: 0,
          refunded: 0,
          pending: 0,
        });
      })()
    );
  }, [
    partnerId,
    enrichedPartnerRows,
    partnerMetaById,
    enrichPartnerRow,
    orders.length,
    kpis.revenue,
    kpis.partnerProfit,
  ]);

  const statusBadge = (s) => {
    const label = getOrderStatusLabel(s);
    const cls =
      s === "completed"
        ? "bg-emerald-100 text-emerald-800"
        : s === "refunded"
          ? "bg-red-100 text-red-700"
          : s === "pending"
            ? "bg-amber-100 text-amber-800"
            : s === "refund_pending"
              ? "bg-orange-100 text-orange-800"
              : "bg-slate-100 text-slate-600";
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-sm ${cls}`}>{label}</span>
    );
  };

  const openPartnerDetail = async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const cached = partnerMetaById.get(String(id));
      if (cached?.description != null || cached?.cooperation_model) {
        // analytics 已帶回部分欄位；再拉完整夥伴資料供彈窗
      }
      const data = await bossFetch("/api/admin/partners");
      const full = (data.partners || []).find(
        (p) => String(p.id) === String(id),
      );
      setDetailPartner(full || cached || null);
    } catch (err) {
      setError(err.message || "無法載入夥伴資料");
    } finally {
      setDetailLoading(false);
    }
  };

  const enterPartnerOrders = (pid) => {
    setPartnerId(String(pid || ""));
    setView("orders");
  };

  const backToPartners = () => {
    setPartnerId("");
    setView("partners");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-[#1e3a5f]">夥伴銷售分析</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            外層依夥伴彙總（非重複訂單）；點進夥伴後才看該夥伴訂單。一列仍對應一筆訂單。
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-xs font-bold text-[#1a56db] border border-[#1a56db] px-3 py-1.5 rounded-sm hover:bg-blue-50 disabled:opacity-50"
        >
          {loading ? "更新中…" : "重新整理"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-xs">
          <span className="font-bold text-slate-500 block mb-1">夥伴</span>
          <select
            value={partnerId}
            onChange={(e) => {
              const v = e.target.value;
              setPartnerId(v);
              if (v) setView("orders");
              else setView("partners");
            }}
            className="w-full border border-slate-300 rounded-sm px-2 py-2 text-sm"
          >
            <option value="">全部夥伴</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.slug}) ·{" "}
                {getPartnerCooperationLabel(p.cooperation_model)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="font-bold text-slate-500 block mb-1">店鋪</span>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full border border-slate-300 rounded-sm px-2 py-2 text-sm"
          >
            <option value="">全部店鋪</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name} ({s.domain})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="font-bold text-slate-500 block mb-1">期間</span>
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-full border border-slate-300 rounded-sm px-2 py-2 text-sm"
          >
            <option value="7">近 7 日</option>
            <option value="30">近 30 日</option>
            <option value="90">近 90 日</option>
            <option value="365">近 1 年</option>
            <option value="9999">全部</option>
          </select>
        </label>
        <div className="text-xs">
          <span className="font-bold text-slate-500 block mb-1">檢視</span>
          <div className="flex rounded-sm border border-slate-300 overflow-hidden">
            {[
              ["partners", "依夥伴"],
              ["orders", "訂單明細"],
              ["stores", "依店鋪"],
            ].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`flex-1 px-2 py-2 text-xs font-bold ${
                  view === v ? "bg-[#1a56db] text-white" : "bg-white text-slate-600"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setStatus(t.value)}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold border transition ${
              status === t.value
                ? "bg-[#1a56db] text-white border-[#1a56db]"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#1a56db]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="營收（已結算）" value={fmt(kpis.revenue)} sub={`${kpis.orderCount || 0} 筆`} />
        <Kpi label="底價成本" value={fmt(kpis.b2bCost)} />
        <Kpi label="夥伴分潤" value={fmt(kpis.partnerProfit)} accent="text-[#1a56db]" />
        <Kpi
          label="我的利潤"
          value={fmt(kpis.platformProfit)}
          accent="text-emerald-700"
          sub="營收 − 底價 − 分潤"
        />
        <Kpi
          label="待付款 / 退款"
          value={`${kpis.pendingCount || 0} / ${kpis.refundCount || 0}`}
          sub={`退款審核中 ${kpis.refundPendingCount || 0}`}
        />
      </div>

      {partnerId && view === "orders" && (
        <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-100 rounded-sm px-4 py-3">
          <button
            type="button"
            onClick={backToPartners}
            className="text-xs font-bold text-[#1a56db] hover:underline inline-flex items-center gap-1"
          >
            <MaterialIcon name="arrow_back" size={14} />
            返回夥伴列表
          </button>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={() => openPartnerDetail(partnerId)}
            disabled={detailLoading}
            className="font-black text-[#1e3a5f] hover:text-[#1a56db]"
          >
            {drilledPartner?.name || `夥伴 #${partnerId}`}
          </button>
          {drilledPartner && (
            <CooperationBadge
              model={drilledPartner.cooperationModel}
              label={drilledPartner.cooperationLabel}
            />
          )}
          <span className="text-xs text-slate-500 ml-auto">
            以下為該夥伴訂單（一列一筆，非重複）
          </span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">載入分析資料…</div>
        ) : view === "partners" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">夥伴</th>
                  <th className="px-4 py-3 text-left font-bold">類型</th>
                  <th className="px-4 py-3 text-center font-bold">訂單</th>
                  <th className="px-4 py-3 text-center font-bold">完成</th>
                  <th className="px-4 py-3 text-center font-bold">退款</th>
                  <th className="px-4 py-3 text-center font-bold">待付</th>
                  <th className="px-4 py-3 text-right font-bold">營收</th>
                  <th className="px-4 py-3 text-right font-bold">分潤</th>
                  <th className="px-4 py-3 text-right font-bold">我的利潤</th>
                  <th className="px-4 py-3 text-right font-bold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrichedPartnerRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      沒有符合條件的夥伴銷售
                    </td>
                  </tr>
                ) : (
                  enrichedPartnerRows.map((p) => (
                    <tr key={p.partnerId || `none-${p.name}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openPartnerDetail(p.partnerId)}
                          className="font-bold text-slate-800 hover:text-[#1a56db] text-left"
                        >
                          {p.name}
                        </button>
                        {p.email ? (
                          <p className="text-[11px] text-slate-400 mt-0.5">{p.email}</p>
                        ) : null}
                        {p.slug ? (
                          <p className="text-[11px] font-mono text-slate-400">{p.slug}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <CooperationBadge
                          model={p.cooperationModel}
                          label={p.cooperationLabel}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">{p.orders}</td>
                      <td className="px-4 py-3 text-center text-emerald-700">{p.completed}</td>
                      <td className="px-4 py-3 text-center text-red-600">{p.refunded}</td>
                      <td className="px-4 py-3 text-center text-amber-700">{p.pending}</td>
                      <td className="px-4 py-3 text-right font-bold">{fmt(p.revenue)}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#1a56db]">
                        {fmt(p.profit)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-700">
                        {fmt(p.platformProfit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => openPartnerDetail(p.partnerId)}
                            className="text-xs font-bold text-slate-600 border border-slate-200 px-2 py-1 rounded-sm hover:bg-slate-50"
                          >
                            夥伴資訊
                          </button>
                          <button
                            type="button"
                            onClick={() => enterPartnerOrders(p.partnerId)}
                            className="text-xs font-bold text-white bg-[#1a56db] px-2 py-1 rounded-sm hover:bg-[#1749c0]"
                          >
                            查看訂單
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : view === "orders" ? (
          <OrdersTable
            orders={orders}
            statusBadge={statusBadge}
            onOpenPartner={openPartnerDetail}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">店鋪</th>
                  <th className="px-4 py-3 text-left font-bold">夥伴</th>
                  <th className="px-4 py-3 text-center font-bold">訂單</th>
                  <th className="px-4 py-3 text-right font-bold">營收</th>
                  <th className="px-4 py-3 text-right font-bold">底價</th>
                  <th className="px-4 py-3 text-right font-bold">分潤</th>
                  <th className="px-4 py-3 text-right font-bold">我的利潤</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storeRows.map((s) => (
                  <tr key={s.storeId}>
                    <td className="px-4 py-3 font-bold">{s.name}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => s.partnerId && openPartnerDetail(s.partnerId)}
                        className="text-slate-700 font-bold hover:text-[#1a56db] text-left"
                      >
                        {s.partnerName || "—"}
                      </button>
                      <div className="mt-1">
                        <CooperationBadge model={s.cooperationModel} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{s.orders}</td>
                    <td className="px-4 py-3 text-right font-bold">{fmt(s.revenue)}</td>
                    <td className="px-4 py-3 text-right">{fmt(s.b2bCost)}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#1a56db]">
                      {fmt(s.profit)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      {fmt(s.platformProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 flex items-center gap-1">
        <MaterialIcon name="info" size={14} />
        資料來源 Supabase 夥伴訂單；Medusa 主站零售訂單不在此表。夥伴名稱重複是因為多筆訂單，不是資料重複。
      </p>

      {detailPartner && (
        <PartnerDetailPanel
          partner={detailPartner}
          onClose={() => setDetailPartner(null)}
          onUpdated={(updated) => {
            setDetailPartner(updated);
            load();
          }}
        />
      )}
    </div>
  );
}
