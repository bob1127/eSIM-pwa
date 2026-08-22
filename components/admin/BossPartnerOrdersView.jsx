"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { fmt } from "@/components/partner/DobermanWidgets";
import OrderDetailModal from "@/components/partner/OrderDetailModal";
import { ShopifyPagination } from "@/components/partner/ShopifyControls";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {
  BossButton,
  BossField,
  BossNum,
  BossOrderTabs,
  BossSelect,
  BossStatusBadge,
} from "@/components/admin/bossUi";
import { reportOrdersToPartnerShape } from "@/lib/adminOrderAdapter";
import { orderWithinDays } from "@/lib/adminAnalytics";
import {
  paymentMethodLabel,
  buyerDisplayName,
  buyerEmail,
} from "@/lib/orderDisplay";
import { isSettledOrderStatus } from "@/lib/refundPolicy";

const PAGE_SIZE = 10;

const RANGE_OPTIONS = [
  { value: "9999", label: "全部" },
  { value: "7", label: "近 7 日" },
  { value: "30", label: "近 30 日" },
  { value: "90", label: "近 90 日" },
  { value: "365", label: "近 1 年" },
];

const STATUS_LABEL = {
  completed: "已完成",
  pending: "尚未付款",
  cancelled: "已取消",
  failed: "付款失敗",
  refunded: "已退款",
  refund_pending: "退款審核中",
};

function formatDate(d) {
  return new Date(d).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function countByStatus(orders) {
  let paid = 0;
  let unpaid = 0;
  let paidProfit = 0;
  let unpaidProfit = 0;
  for (const o of orders) {
    const profit = Math.round(Number(o.partner_profit) || 0);
    if (o.status === "completed") {
      paid += 1;
      paidProfit += profit;
    } else if (o.status === "pending") {
      unpaid += 1;
      unpaidProfit += profit;
    }
  }
  return {
    paid,
    unpaid,
    valid: paid + unpaid,
    paidProfit,
    unpaidProfit,
    validProfit: paidProfit + unpaidProfit,
  };
}

/**
 * Boss 後台：夥伴店訂單列表（欄位／分頁／篩選對齊 /partner/orders）
 */
export default function BossPartnerOrdersView({
  orders = [],
  loading = false,
  parentStatus = "all",
  contextTitle = "",
  contextSubtitle = "",
}) {
  const [filter, setFilter] = useState("all");
  const [rangeDays, setRangeDays] = useState("9999");
  const [page, setPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState(null);

  const partnerOrders = useMemo(
    () => reportOrdersToPartnerShape(orders),
    [orders],
  );

  useEffect(() => {
    setRangeDays("9999");
    setFilter("all");
  }, [contextTitle]);

  const ordersInRange = useMemo(
    () =>
      partnerOrders.filter((o) => orderWithinDays(o.created_at, rangeDays)),
    [partnerOrders, rangeDays],
  );

  useEffect(() => {
    setPage(1);
  }, [filter, rangeDays, orders]);

  const usePartnerTabs = parentStatus === "all";

  const statusCounts = useMemo(
    () => countByStatus(ordersInRange),
    [ordersInRange],
  );

  const filtered = useMemo(() => {
    if (!usePartnerTabs) return ordersInRange;
    if (filter === "all") {
      return ordersInRange.filter((o) => isSettledOrderStatus(o.status));
    }
    return ordersInRange.filter((o) => o.status === filter);
  }, [ordersInRange, filter, usePartnerTabs]);

  const filteredTotals = useMemo(() => {
    let profit = 0;
    let revenue = 0;
    for (const o of filtered) {
      profit += Math.round(Number(o.partner_profit) || 0);
      revenue += Math.round(Number(o.total_amount) || 0);
    }
    return { profit, revenue, count: filtered.length };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const filterTabs = [
    {
      id: "all",
      label: "全部有效",
      count: loading ? "…" : statusCounts.valid,
      amount: loading ? "…" : fmt(statusCounts.validProfit),
    },
    {
      id: "completed",
      label: "已付款",
      count: loading ? "…" : statusCounts.paid,
      amount: loading ? "…" : fmt(statusCounts.paidProfit),
    },
    {
      id: "pending",
      label: "尚未付款",
      count: loading ? "…" : statusCounts.unpaid,
      amount: loading ? "…" : fmt(statusCounts.unpaidProfit),
    },
  ];

  const rangeLabel =
    RANGE_OPTIONS.find((o) => o.value === String(rangeDays))?.label || "全部";

  return (
    <div className="space-y-3 p-4">
      {contextTitle ? (
        <div className="px-1">
          <h4 className="text-sm font-semibold text-slate-900">{contextTitle}</h4>
          {contextSubtitle ? (
            <p className="text-xs text-slate-500 mt-0.5">{contextSubtitle}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-3 sm:px-4 pt-2 pb-0">
          <div className="min-w-0 flex-1">
            {usePartnerTabs ? (
              <BossOrderTabs tabs={filterTabs} value={filter} onChange={setFilter} />
            ) : (
              <p className="py-2 text-xs text-slate-500">
                上方狀態篩選：
                <span className="font-semibold text-slate-700 ml-1">
                  {STATUS_LABEL[parentStatus] || parentStatus}
                </span>
              </p>
            )}
          </div>
          <BossField
            label={
              <span className="inline-flex items-center gap-1.5">
                <MaterialIcon name="calendar_month" size={14} className="text-slate-400" />
                期間
              </span>
            }
            className="shrink-0 pb-2 sm:pb-2.5"
          >
            <BossSelect
              value={rangeDays}
              onChange={(e) => setRangeDays(e.target.value)}
              className="min-w-[108px]"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </BossSelect>
          </BossField>
        </div>

        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider bg-slate-50 text-slate-500">
                <th className="px-5 py-3 text-left font-bold">訂單 / 日期</th>
                <th className="px-5 py-3 text-left font-bold">買家</th>
                <th className="px-5 py-3 text-left font-bold">付款方式</th>
                <th className="px-5 py-3 text-left font-bold">訂單金額</th>
                <th className="px-5 py-3 text-left font-bold">進貨成本</th>
                <th className="px-5 py-3 text-left font-bold">分潤</th>
                <th className="px-5 py-3 text-left font-bold">付款狀態</th>
                <th className="px-4 py-3 text-center font-bold w-16">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <LoadingIndicator layout="center" label="載入訂單…" size="sm" />
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-slate-400">
                    {ordersInRange.length === 0 && partnerOrders.length > 0
                      ? `「${rangeLabel}」內沒有訂單，請改選其他期間`
                      : "目前沒有符合條件的訂單"}
                  </td>
                </tr>
              ) : (
                paged.map((order) => {
                  const email = buyerEmail(order);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <p className="font-mono font-semibold text-xs text-slate-800">
                          {String(order.id).substring(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs mt-0.5 text-slate-400">
                          {formatDate(order.created_at)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {buyerDisplayName(order)}
                        </p>
                        {email ? (
                          <p className="text-xs truncate max-w-[200px] text-slate-400">
                            {email}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">無 Email</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-600">
                        {paymentMethodLabel(order)}
                      </td>
                      <td className="px-5 py-4">
                        <BossNum className="font-medium">{fmt(order.total_amount)}</BossNum>
                      </td>
                      <td className="px-5 py-4">
                        <BossNum className="text-slate-500">{fmt(order.b2b_cost)}</BossNum>
                      </td>
                      <td className="px-5 py-4">
                        <BossNum className="font-semibold">
                          +{fmt(order.partner_profit)}
                        </BossNum>
                      </td>
                      <td className="px-5 py-4">
                        <BossStatusBadge
                          status={order.status}
                          label={STATUS_LABEL[order.status] || order.status}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <BossButton
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => setDetailOrder(order)}
                          aria-label="查看訂單詳情"
                          title="查看訂單"
                        >
                          <MaterialIcon name="edit" size={16} />
                        </BossButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs border-t border-slate-200 bg-slate-50">
            <p className="text-slate-600">
              <span className="font-semibold text-slate-800">{rangeLabel}</span>
              {" · "}
              合計{" "}
              <span className="font-semibold text-slate-800">
                {filteredTotals.count} 筆
              </span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums text-slate-600">
              <span>
                營收{" "}
                <BossNum className="font-semibold">{fmt(filteredTotals.revenue)}</BossNum>
              </span>
              <span>
                分潤{" "}
                <BossNum className="font-semibold">{fmt(filteredTotals.profit)}</BossNum>
              </span>
            </div>
          </div>
        ) : null}

        {!loading && filtered.length > 0 ? (
          <ShopifyPagination
            page={safePage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onChange={setPage}
          />
        ) : null}
      </div>

      <OrderDetailModal
        open={!!detailOrder}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        bossView
      />
    </div>
  );
}
