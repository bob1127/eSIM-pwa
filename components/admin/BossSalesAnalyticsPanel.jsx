"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { bossFetch } from "@/lib/bossAdminClient";
import {
  getOrderStatusLabel,
  getPartnerCooperationLabel,
} from "@/lib/adminAnalytics";
import PartnerDetailPanel from "@/components/admin/PartnerDetailPanel";
import BossPartnerOrdersView from "@/components/admin/BossPartnerOrdersView";
import OrderDetailModal from "@/components/partner/OrderDetailModal";
import { reportOrderToPartnerShape } from "@/lib/adminOrderAdapter";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {
  BossAlert,
  BossBreadcrumb,
  BossButton,
  BossCard,
  BossCooperationBadge,
  BossField,
  BossFilterTabs,
  BossKpiCard,
  BossNum,
  BossSegmented,
  BossSelect,
  BossStatusBadge,
} from "@/components/admin/bossUi";

const fmt = (n) => `NT$${Math.round(Number(n) || 0).toLocaleString()}`;

function periodLabel(days) {
  const d = Number(days) || 30;
  if (d >= 9999) return "全部";
  if (d === 7) return "近 7 日";
  if (d === 30) return "近 30 日";
  if (d === 90) return "近 90 日";
  if (d === 365) return "近 1 年";
  return `近 ${d} 日`;
}

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "completed", label: "已完成" },
  { value: "refunded", label: "已退款" },
  { value: "pending", label: "尚未付款" },
  { value: "refund_pending", label: "退款審核中" },
];

function OrdersTable({ orders, statusBadge, onOpenPartner, onOpenOrder }) {
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
            <th className="px-4 py-3 text-right font-bold">夥伴分潤</th>
            <th className="px-4 py-3 text-right font-bold">我的利潤</th>
            <th className="px-4 py-3 text-left font-bold">日期</th>
            <th className="px-4 py-3 text-right font-bold">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <BossButton
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 font-semibold"
                  onClick={() => onOpenOrder?.(o)}
                >
                  #{o.id}
                </BossButton>
              </td>
              <td className="px-4 py-3">
                <BossButton
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 font-semibold text-slate-800"
                  onClick={() => onOpenPartner?.(o.partnerId)}
                >
                  {o.partnerName}
                </BossButton>
                <div className="mt-1">
                  <BossCooperationBadge>
                    {o.cooperationLabel || getPartnerCooperationLabel(o.cooperationModel)}
                  </BossCooperationBadge>
                </div>
                <p className="text-xs text-slate-400 mt-1">{o.storeName}</p>
              </td>
              <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                {o.itemSummary}
              </td>
              <td className="px-4 py-3 text-center">{statusBadge(o.status)}</td>
              <td className="px-4 py-3 text-right font-medium">
                <BossNum>{fmt(o.totalAmount)}</BossNum>
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                <BossNum>{fmt(o.b2bCost)}</BossNum>
              </td>
              <td className="px-4 py-3 text-right font-medium">
                <BossNum>{fmt(o.partnerProfit)}</BossNum>
              </td>
              <td className="px-4 py-3 text-right font-semibold">
                <BossNum>{fmt(o.platformProfit)}</BossNum>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString("zh-TW")
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <BossButton
                  type="button"
                  size="sm"
                  onClick={() => onOpenOrder?.(o)}
                >
                  詳情
                </BossButton>
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
  const [days, setDays] = useState("9999");
  /** partners = 外層夥伴；orders = 訂單明細；stores = 依店鋪 */
  const [view, setView] = useState("partners");
  const [detailPartner, setDetailPartner] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [drilldownOrders, setDrilldownOrders] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ days, status });
      if (partnerId) q.set("partner_id", partnerId);
      if (storeId) q.set("store_id", storeId);
      const requests = [bossFetch(`/api/admin/analytics?${q}`)];
      if (partnerId || storeId) {
        const dq = new URLSearchParams({ days: "9999", status });
        if (partnerId) dq.set("partner_id", partnerId);
        if (storeId) dq.set("store_id", storeId);
        requests.push(bossFetch(`/api/admin/analytics?${dq}`));
      }
      const [data, detailData] = await Promise.all(requests);
      setPartners(data.partners || []);
      setStores(data.stores || []);
      setReport(data.report || null);
      setDrilldownOrders(
        partnerId || storeId ? detailData?.report?.orders || [] : [],
      );
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
  const isOrderDrilldown = Boolean(partnerId || storeId);
  const partnerRows = useMemo(() => report?.byPartner || [], [report]);
  const storeRows = useMemo(() => report?.byStore || [], [report]);

  const storeMetaById = useMemo(() => {
    const map = new Map();
    for (const s of stores) {
      map.set(String(s.id), s);
    }
    return map;
  }, [stores]);

  const enrichStoreRow = useCallback(
    (row) => {
      const meta = storeMetaById.get(String(row.storeId));
      return {
        ...row,
        name: row.name || meta?.store_name || `店鋪 #${row.storeId}`,
        domain: row.domain || meta?.domain || "",
      };
    },
    [storeMetaById],
  );

  const enrichedStoreRows = useMemo(
    () => storeRows.map(enrichStoreRow),
    [storeRows, enrichStoreRow],
  );

  const drilledStore = useMemo(() => {
    if (!storeId) return null;
    return (
      enrichedStoreRows.find((s) => String(s.storeId) === String(storeId)) ||
      (() => {
        const meta = storeMetaById.get(String(storeId));
        if (!meta) return null;
        return enrichStoreRow({
          storeId: meta.id,
          name: meta.store_name,
          domain: meta.domain,
          partnerName: "",
          partnerId: 0,
          orders: orders.length,
          revenue: kpis.revenue,
          profit: kpis.partnerProfit,
          b2bCost: kpis.b2bCost,
          platformProfit: kpis.platformProfit,
          completed: 0,
          refunded: 0,
          pending: 0,
        });
      })()
    );
  }, [
    storeId,
    enrichedStoreRows,
    storeMetaById,
    enrichStoreRow,
    orders.length,
    kpis.revenue,
    kpis.partnerProfit,
    kpis.b2bCost,
    kpis.platformProfit,
  ]);

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

  const statusBadge = (s) => (
    <BossStatusBadge status={s} label={getOrderStatusLabel(s)} />
  );

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
    setStoreId("");
    setView("orders");
  };

  const enterStoreOrders = (sid) => {
    setStoreId(String(sid || ""));
    setView("orders");
  };

  const backToPartners = () => {
    setPartnerId("");
    setView("partners");
  };

  const backToStores = () => {
    setStoreId("");
    setView("stores");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">夥伴銷售分析</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            點進夥伴或店鋪後，每列為一筆買家訂單；詳情可查看商品底價、夥伴售價與分潤。
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

      <BossCard className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <BossField label="夥伴">
          <BossSelect
            value={partnerId}
            onChange={(e) => {
              const v = e.target.value;
              setPartnerId(v);
              if (v) {
                setStoreId("");
                setView("orders");
              } else {
                setView("partners");
              }
            }}
          >
            <option value="">全部夥伴</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.slug}) ·{" "}
                {getPartnerCooperationLabel(p.cooperation_model)}
              </option>
            ))}
          </BossSelect>
        </BossField>
        <BossField label="店鋪">
          <BossSelect
            value={storeId}
            onChange={(e) => {
              const v = e.target.value;
              setStoreId(v);
              if (v) setView("orders");
              else if (!partnerId) setView("stores");
            }}
          >
            <option value="">全部店鋪</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name} ({s.domain})
              </option>
            ))}
          </BossSelect>
        </BossField>
        <BossField label="期間">
          <BossSelect value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="9999">全部</option>
            <option value="7">近 7 日</option>
            <option value="30">近 30 日</option>
            <option value="90">近 90 日</option>
            <option value="365">近 1 年</option>
          </BossSelect>
        </BossField>
        <BossField label="檢視">
          <BossSegmented
            options={[
              ["partners", "依夥伴"],
              ["orders", "訂單明細"],
              ["stores", "依店鋪"],
            ]}
            value={view}
            onChange={(v) => {
              setView(v);
              if (v === "partners") setPartnerId("");
              if (v === "stores") {
                setPartnerId("");
                setStoreId("");
              }
            }}
          />
        </BossField>
      </BossCard>

      <BossFilterTabs items={STATUS_TABS} value={status} onChange={setStatus} />

      {error && <BossAlert>{error}</BossAlert>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <BossKpiCard
          label="營收（已結算）"
          value={fmt(kpis.revenue)}
          sub={`${kpis.orderCount || 0} 筆`}
        />
        <BossKpiCard label="底價成本" value={fmt(kpis.b2bCost)} />
        <BossKpiCard label="夥伴分潤" value={fmt(kpis.partnerProfit)} />
        <BossKpiCard
          label="我的利潤"
          value={fmt(kpis.platformProfit)}
          sub="營收 − 底價 − 分潤"
        />
        <BossKpiCard
          label="待付款 / 退款"
          value={`${kpis.pendingCount || 0} / ${kpis.refundCount || 0}`}
          sub={`退款審核中 ${kpis.refundPendingCount || 0}`}
        />
      </div>

      {partnerId && view === "orders" && (
        <BossBreadcrumb>
          <BossButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={backToPartners}
            className="h-8 px-2"
          >
            <MaterialIcon name="arrow_back" size={14} />
            返回夥伴列表
          </BossButton>
          <span className="text-slate-300">/</span>
          <BossButton
            type="button"
            variant="link"
            size="sm"
            onClick={() => openPartnerDetail(partnerId)}
            disabled={detailLoading}
            className="font-semibold text-slate-900"
          >
            {drilledPartner?.name || `夥伴 #${partnerId}`}
          </BossButton>
          {drilledPartner && (
            <BossCooperationBadge>{drilledPartner.cooperationLabel}</BossCooperationBadge>
          )}
          <span className="text-xs text-slate-500 ml-auto">
            以下為該夥伴店訂單，每列一位買家
          </span>
        </BossBreadcrumb>
      )}

      {storeId && view === "orders" && !partnerId && (
        <BossBreadcrumb>
          <BossButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={backToStores}
            className="h-8 px-2"
          >
            <MaterialIcon name="arrow_back" size={14} />
            返回店鋪列表
          </BossButton>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-900">
            {drilledStore?.name || `店鋪 #${storeId}`}
          </span>
          {drilledStore?.domain ? (
            <span className="text-[11px] font-mono text-slate-500">
              /p/{drilledStore.domain}/
            </span>
          ) : null}
          {drilledStore?.partnerName ? (
            <BossButton
              type="button"
              variant="link"
              size="sm"
              onClick={() => drilledStore.partnerId && openPartnerDetail(drilledStore.partnerId)}
            >
              {drilledStore.partnerName}
            </BossButton>
          ) : null}
          <span className="text-xs text-slate-500 ml-auto">
            以下為該店鋪訂單，每列一位買家
          </span>
        </BossBreadcrumb>
      )}

      <BossCard>
        {loading ? (
          <LoadingIndicator layout="center" label="載入分析資料…" className="py-16" />
        ) : view === "partners" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">夥伴</th>
                  <th className="px-4 py-3 text-left font-bold">類型</th>
                  <th className="px-4 py-3 text-center font-bold">
                    訂單
                    <span className="block text-[10px] font-normal text-slate-400">
                      {periodLabel(days)}
                    </span>
                  </th>
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
                        <BossButton
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 font-semibold text-slate-800"
                          onClick={() => openPartnerDetail(p.partnerId)}
                        >
                          {p.name}
                        </BossButton>
                        {p.email ? (
                          <p className="text-[11px] text-slate-400 mt-0.5">{p.email}</p>
                        ) : null}
                        {p.slug ? (
                          <p className="text-[11px] font-mono text-slate-400">{p.slug}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <BossCooperationBadge>{p.cooperationLabel}</BossCooperationBadge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossNum>{p.orders}</BossNum>
                        {p.ordersAllTime > p.orders ? (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            累計 {p.ordersAllTime}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossNum>{p.completed}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossNum>{p.refunded}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossNum>{p.pending}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossNum className="font-medium">{fmt(p.revenue)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossNum className="font-medium">{fmt(p.profit)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossNum className="font-semibold">{fmt(p.platformProfit)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <BossButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openPartnerDetail(p.partnerId)}
                          >
                            夥伴資訊
                          </BossButton>
                          <BossButton
                            type="button"
                            size="sm"
                            onClick={() => enterPartnerOrders(p.partnerId)}
                          >
                            查看訂單
                          </BossButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : view === "orders" ? (
          isOrderDrilldown ? (
            <BossPartnerOrdersView
              orders={drilldownOrders}
              loading={loading}
              parentStatus={status}
              contextTitle={
                drilledStore?.name ||
                drilledPartner?.name ||
                (storeId ? `店鋪 #${storeId}` : partnerId ? `夥伴 #${partnerId}` : "")
              }
              contextSubtitle="欄位與夥伴後台 /partner/orders 相同；每列為一位買家"
            />
          ) : (
            <OrdersTable
              orders={orders}
              statusBadge={statusBadge}
              onOpenPartner={openPartnerDetail}
              onOpenOrder={(o) => setDetailOrder(reportOrderToPartnerShape(o))}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">店鋪</th>
                  <th className="px-4 py-3 text-left font-bold">夥伴</th>
                  <th className="px-4 py-3 text-center font-bold">
                    訂單
                    <span className="block text-[10px] font-normal text-slate-400">
                      {periodLabel(days)}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center font-bold">完成</th>
                  <th className="px-4 py-3 text-center font-bold">退款</th>
                  <th className="px-4 py-3 text-center font-bold">待付</th>
                  <th className="px-4 py-3 text-right font-bold">營收</th>
                  <th className="px-4 py-3 text-right font-bold">底價</th>
                  <th className="px-4 py-3 text-right font-bold">分潤</th>
                  <th className="px-4 py-3 text-right font-bold">我的利潤</th>
                  <th className="px-4 py-3 text-right font-bold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrichedStoreRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      沒有符合條件的店鋪銷售
                    </td>
                  </tr>
                ) : (
                  enrichedStoreRows.map((s) => (
                    <tr key={s.storeId || `none-${s.name}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{s.name}</p>
                        {s.domain ? (
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                            /p/{s.domain}/
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <BossButton
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 font-semibold text-slate-700"
                          onClick={() => s.partnerId && openPartnerDetail(s.partnerId)}
                        >
                          {s.partnerName || "—"}
                        </BossButton>
                        {s.cooperationModel ? (
                          <div className="mt-1">
                            <BossCooperationBadge>
                              {getPartnerCooperationLabel(s.cooperationModel)}
                            </BossCooperationBadge>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossNum>{s.orders}</BossNum>
                        {s.ordersAllTime > s.orders ? (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            累計 {s.ordersAllTime}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossNum>{s.completed}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossNum>{s.refunded}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BossNum>{s.pending}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossNum className="font-medium">{fmt(s.revenue)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossNum>{fmt(s.b2bCost)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossNum className="font-medium">{fmt(s.profit)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossNum className="font-semibold">{fmt(s.platformProfit)}</BossNum>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BossButton
                          type="button"
                          size="sm"
                          onClick={() => enterStoreOrders(s.storeId)}
                        >
                          查看訂單
                        </BossButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </BossCard>

      <p className="text-xs text-slate-400 flex items-center gap-1">
        <MaterialIcon name="info" size={14} />
        訂單筆數依上方「期間」篩選；累計為該夥伴全部歷史（與 /partner/orders 一致）。
        資料來源 Supabase 夥伴訂單；Medusa 主站零售訂單不在此表。
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

      {!isOrderDrilldown && detailOrder && (
        <OrderDetailModal
          open={!!detailOrder}
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          bossView
        />
      )}
    </div>
  );
}
