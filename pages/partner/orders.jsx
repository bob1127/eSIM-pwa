import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { fmt } from "@/components/partner/DobermanWidgets";
import PrintOrdersModal, {
  downloadOrdersCsv,
} from "@/components/partner/PrintOrdersModal";
import OrderDetailModal from "@/components/partner/OrderDetailModal";
import {
  ShopifyTabs,
  ShopifyDropdown,
  ShopifyPagination,
} from "@/components/partner/ShopifyControls";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { usePartnerSession, fetchPartnerStats } from "@/lib/partnerAuth";
import { isSettledOrderStatus } from "@/lib/refundPolicy";
import {
  paymentMethodLabel,
  buyerDisplayName,
  buyerEmail,
} from "@/lib/orderDisplay";
import { PARTNER_UI } from "@/lib/partnerUi";
import StatusIconBadge from "@/components/partner/StatusIconBadge";
import PartnerInfoTimeline from "@/components/partner/PartnerInfoTimeline";
import InfoCircleIcon from "@/components/icons/info-circle-icon";
import WalletIcon from "@/components/icons/wallet-icon";
import ClockIcon from "@/components/icons/clock-icon";
import PartnerOrdersDateRange from "@/components/partner/PartnerOrdersDateRange";
import { orderWithinDateRange } from "@/lib/partnerOrderFilters";

const PAGE_SIZE = 10;

/** 訂單分潤：小圓角 + 深灰／淺灰／白；狀態徽章維持特殊色 */
const UI = {
  dark: "#2d2d2d",
  mid: "#5c5c5c",
  soft: "#8a8a8a",
  border: "#e5e5e5",
  light: "#f0f0f0",
  wash: "#f6f6f6",
  white: "#ffffff",
  radius: "0.5rem",
  radiusSm: "0.375rem",
};

function formatDate(d) {
  return new Date(d).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const STATUS_TONE = {
  completed: "success",
  pending: "warning",
  cancelled: "neutral",
  failed: "critical",
  refunded: "neutral",
  refund_pending: "warning",
};

const STATUS_LABEL = {
  completed: "已完成",
  pending: "尚未付款",
  cancelled: "已取消",
  failed: "付款失敗",
  refunded: "已退款",
  refund_pending: "退款審核中",
};

function StatusBadge({ status }) {
  return (
    <StatusIconBadge
      tone={STATUS_TONE[status] || "neutral"}
      label={STATUS_LABEL[status] || status}
    />
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: UI.white,
        border: `1px solid ${UI.border}`,
        borderRadius: UI.radius,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MetricCard({ label, value, hint, icon, iconBg }) {
  return (
    <Card className="px-4 py-3.5 flex-1 min-w-[140px]">
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: UI.soft }}
        >
          {label}
        </p>
        {icon ? (
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg, borderRadius: UI.radiusSm }}
          >
            <MaterialIcon name={icon} size={16} className="text-white" />
          </div>
        ) : null}
      </div>
      <p
        className="text-xl sm:text-2xl font-black mt-2 tabular-nums"
        style={{ color: UI.dark }}
      >
        {value}
      </p>
      {hint ? (
        <p className="text-[11px] mt-1 leading-snug" style={{ color: UI.soft }}>
          {hint}
        </p>
      ) : null}
    </Card>
  );
}

export default function PartnerOrdersPage() {
  const router = useRouter();
  const { partner, store } = usePartnerSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState(undefined);
  const [selected, setSelected] = useState(() => new Set());
  const [printOpen, setPrintOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => {
    if (!partner) return;
    fetchPartnerStats(partner.id, store?.id).then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, [partner, store]);

  useEffect(() => {
    setSelected(new Set());
    setPage(1);
  }, [filter, dateRange]);

  const orders = stats?.orders || [];

  const ordersInRange = useMemo(
    () => orders.filter((o) => orderWithinDateRange(o.created_at, dateRange)),
    [orders, dateRange],
  );

  const statusCounts = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let paidProfit = 0;
    let unpaidProfit = 0;
    let paidRevenue = 0;
    let unpaidRevenue = 0;
    for (const o of ordersInRange) {
      const profit = Math.round(Number(o.partner_profit) || 0);
      const revenue = Math.round(Number(o.total_amount) || 0);
      if (o.status === "completed") {
        paid += 1;
        paidProfit += profit;
        paidRevenue += revenue;
      } else if (o.status === "pending") {
        unpaid += 1;
        unpaidProfit += profit;
        unpaidRevenue += revenue;
      }
    }
    return {
      paid,
      unpaid,
      valid: paid + unpaid,
      all: ordersInRange.length,
      paidProfit,
      unpaidProfit,
      validProfit: paidProfit + unpaidProfit,
      paidRevenue,
      unpaidRevenue,
      validRevenue: paidRevenue + unpaidRevenue,
    };
  }, [ordersInRange]);

  const filtered = useMemo(
    () =>
      ordersInRange.filter((o) => {
        if (filter === "all") return isSettledOrderStatus(o.status);
        return o.status === filter;
      }),
    [ordersInRange, filter],
  );

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

  const allChecked =
    paged.length > 0 && paged.every((o) => selected.has(o.id));
  const someChecked =
    paged.some((o) => selected.has(o.id)) && !allChecked;

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        paged.forEach((o) => next.delete(o.id));
      } else {
        paged.forEach((o) => next.add(o.id));
      }
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedOrders = filtered.filter((o) => selected.has(o.id));
  const printTargetOrders = selectedOrders.length ? selectedOrders : filtered;
  const partnerDisplayName = store?.store_name || partner?.name || "";
  const csvName = `訂單分潤_${new Date().toISOString().slice(0, 10)}.csv`;
  const selectionLabel =
    selected.size > 0 ? `（已選 ${selected.size}）` : "";

  const amountLabel = (n) => (loading ? "…" : fmt(n));

  const filterTabs = [
    {
      id: "all",
      label: "全部有效",
      count: loading ? "…" : statusCounts.valid,
      amount: amountLabel(statusCounts.validProfit),
    },
    {
      id: "completed",
      label: "已付款",
      count: loading ? "…" : statusCounts.paid,
      amount: amountLabel(statusCounts.paidProfit),
    },
    {
      id: "pending",
      label: "尚未付款",
      count: loading ? "…" : statusCounts.unpaid,
      amount: amountLabel(statusCounts.unpaidProfit),
    },
  ];

  const printMenuItems = [
    {
      id: "printer",
      label: "列印文件預覽",
      icon: "print",
      disabled: !filtered.length,
      onClick: () => setPrintOpen(true),
    },
    {
      id: "csv",
      label: `匯出 CSV${selectionLabel}`,
      icon: "download",
      disabled: !filtered.length,
      onClick: () => downloadOrdersCsv(printTargetOrders, csvName),
    },
    { divider: true },
    {
      id: "csv-selected",
      label: selected.size
        ? `只匯出所選 ${selected.size} 筆`
        : "先勾選訂單再匯出",
      icon: "checklist",
      disabled: !selected.size,
      onClick: () => downloadOrdersCsv(selectedOrders, csvName),
    },
  ];

  const moreMenuItems = [
    {
      id: "settlement",
      label: "結算與提領",
      icon: "account_balance_wallet",
      onClick: () => router.push("/partner/settlement"),
    },
    {
      id: "analytics",
      label: "分潤分析",
      icon: "insights",
      onClick: () => router.push("/partner/analytics"),
    },
    {
      id: "rates",
      label: "方案分潤一覽",
      icon: "percent",
      onClick: () => router.push("/partner/rates"),
    },
    { divider: true },
    {
      id: "products",
      label: "商品管理",
      icon: "inventory_2",
      onClick: () => router.push("/partner/products?tab=products"),
    },
  ];

  const openDetail = (order) => setDetailOrder(order);

  const editBtnStyle = {
    borderRadius: UI.radiusSm,
    border: `1px solid ${UI.border}`,
    backgroundColor: UI.light,
    color: UI.dark,
  };

  return (
    <PartnerAdminLayout title="訂單分潤">
      <div
        className={`${PARTNER_UI.pageFlush} flex flex-col flex-1 min-h-0`}
        style={{ backgroundColor: UI.wash }}
      >
        <div className="px-4 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1
              className="text-xl font-black tracking-tight"
              style={{ color: UI.dark }}
            >
              訂單分潤
            </h1>
            <p
              className="text-xs sm:text-sm mt-1 leading-relaxed max-w-xl"
              style={{ color: UI.mid }}
            >
              分潤採月結對帳單（次月 15）＋後台申請提領；核准後目標 10
              個工作天內匯款。請至{" "}
              <Link
                href="/partner/settlement"
                className="font-bold underline underline-offset-2"
                style={{ color: UI.dark }}
              >
                結算與提領
              </Link>
              申請。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShopifyDropdown
              label="列印"
              icon="print"
              disabled={!filtered.length && !loading}
              items={printMenuItems}
            />
            <ShopifyDropdown label="更多操作" items={moreMenuItems} />
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4">
          <div className="flex flex-wrap gap-3">
            <MetricCard
              label="累計分潤"
              value={loading ? "…" : fmt(stats?.totalProfit)}
              hint={
                loading
                  ? "有效訂單分潤合計"
                  : `已付款 ${fmt(statusCounts.paidProfit)} · 尚未付款 ${fmt(statusCounts.unpaidProfit)}`
              }
              icon="payments"
              iconBg="#008060"
            />
            <MetricCard
              label="有效訂單"
              value={loading ? "…" : statusCounts.valid}
              hint={`已付款 ${loading ? "…" : statusCounts.paid} · 尚未付款 ${loading ? "…" : statusCounts.unpaid}`}
              icon="receipt_long"
              iconBg="#2c6ecb"
            />
            <MetricCard
              label="店鋪營收"
              value={loading ? "…" : fmt(stats?.totalRevenue)}
              hint={
                loading
                  ? "受取合計"
                  : `已付款 ${fmt(statusCounts.paidRevenue)} · 尚未付款 ${fmt(statusCounts.unpaidRevenue)}`
              }
              icon="storefront"
              iconBg="#eec200"
            />
          </div>
          {!loading ? (
            <div className="mt-3">
              <PartnerInfoTimeline
                items={[
                  {
                    variant: "primary",
                    title: "為何累計分潤與可提領不同？",
                    tag: "說明",
                    href: "/partner/settlement",
                    icons: [WalletIcon, ClockIcon, InfoCircleIcon],
                    body: (
                      <>
                        累計分潤含「已付款＋尚未付款」。可提領僅計「已付款且滿 10
                        天」的分潤，並扣除已申請／已匯保留金額。尚未付款約{" "}
                        <span className="font-bold">
                          {fmt(statusCounts.unpaidProfit)}
                        </span>
                        ；其餘差額多半是保護期內訂單或已提領保留。
                      </>
                    ),
                  },
                ]}
              />
            </div>
          ) : null}
        </div>

        <div className="px-4 sm:px-6 pb-6 space-y-4">
          <PartnerInfoTimeline
            items={[
              {
                variant: "primary",
                title: "買家聯絡資訊",
                tag: "說明",
                icons: [InfoCircleIcon],
                body: "僅顯示姓名與 Email，方便您針對「尚未付款」訂單禮貌提醒。繳費代碼等敏感資料不會提供給夥伴。點「編輯」可查看單筆訂單詳情。",
              },
              {
                variant: "notice",
                title: "使用提醒",
                tag: "注意",
                body: "請勿濫發訊息或用於分潤以外用途。買家資料僅供本筆訂單溝通。",
              },
            ]}
          />

          <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-3 sm:px-4 pt-1 relative z-20">
              <div className="min-w-0 flex-1">
                <ShopifyTabs
                  tabs={filterTabs}
                  value={filter}
                  onChange={setFilter}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0 pb-2 sm:pb-2.5">
                <PartnerOrdersDateRange
                  value={dateRange}
                  onChange={setDateRange}
                />
                {selected.size > 0 ? (
                  <span
                    className="hidden sm:inline-flex text-xs font-bold shrink-0 px-2.5 py-1"
                    style={{
                      backgroundColor: UI.light,
                      color: UI.dark,
                      borderRadius: UI.radiusSm,
                    }}
                  >
                    已選取 {selected.size}
                  </span>
                ) : null}
              </div>
            </div>

            {/* 手機卡片 */}
            <div
              className="md:hidden"
              style={{ borderTop: `1px solid ${UI.border}` }}
            >
              {loading ? (
                <LoadingIndicator
                  layout="center"
                  label="載入中..."
                  className="py-10"
                />
              ) : paged.length === 0 ? (
                <div
                  className="py-12 text-center text-sm"
                  style={{ color: UI.soft }}
                >
                  目前沒有符合條件的訂單
                </div>
              ) : (
                paged.map((order) => {
                  const email = buyerEmail(order);
                  return (
                    <div
                      key={order.id}
                      className="p-4 space-y-2.5"
                      style={{ borderTop: `1px solid ${UI.border}` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="font-mono font-bold text-xs"
                            style={{ color: UI.dark }}
                          >
                            {String(order.id).substring(0, 8).toUpperCase()}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: UI.soft }}
                          >
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={order.status} />
                          <button
                            type="button"
                            onClick={() => openDetail(order)}
                            className="w-8 h-8 inline-flex items-center justify-center transition"
                            style={editBtnStyle}
                            aria-label="查看訂單"
                            title="查看訂單"
                          >
                            <MaterialIcon name="edit" size={16} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p
                          className="text-sm font-bold"
                          style={{ color: UI.dark }}
                        >
                          {buyerDisplayName(order)}
                        </p>
                        {email ? (
                          <p
                            className="text-xs break-all"
                            style={{ color: UI.soft }}
                          >
                            {email}
                          </p>
                        ) : (
                          <p className="text-xs" style={{ color: UI.soft }}>
                            無 Email
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div
                          className="px-3 py-2"
                          style={{
                            backgroundColor: UI.light,
                            borderRadius: UI.radiusSm,
                          }}
                        >
                          <p className="font-bold" style={{ color: UI.soft }}>
                            金額
                          </p>
                          <p
                            className="font-bold mt-0.5"
                            style={{ color: UI.dark }}
                          >
                            {fmt(order.total_amount)}
                          </p>
                        </div>
                        <div
                          className="px-3 py-2"
                          style={{
                            backgroundColor: UI.light,
                            borderRadius: UI.radiusSm,
                          }}
                        >
                          <p className="font-bold" style={{ color: UI.soft }}>
                            分潤
                          </p>
                          <p
                            className="font-black mt-0.5"
                            style={{ color: UI.dark }}
                          >
                            {fmt(order.partner_profit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr
                    className="text-[10px] uppercase tracking-wider"
                    style={{ backgroundColor: UI.light, color: UI.soft }}
                  >
                    <th className="pl-5 pr-2 py-3 w-8">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-black cursor-pointer"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someChecked;
                        }}
                        onChange={toggleAll}
                        aria-label="全選本頁"
                      />
                    </th>
                    <th className="px-3 py-3 text-left font-bold">
                      訂單 / 日期
                    </th>
                    <th className="px-5 py-3 text-left font-bold">買家</th>
                    <th className="px-5 py-3 text-left font-bold">付款方式</th>
                    <th className="px-5 py-3 text-left font-bold">訂單金額</th>
                    <th className="px-5 py-3 text-left font-bold">底價成本</th>
                    <th className="px-5 py-3 text-left font-bold">分潤</th>
                    <th className="px-5 py-3 text-left font-bold">付款狀態</th>
                    <th className="px-4 py-3 text-center font-bold w-16">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10">
                        <LoadingIndicator layout="center" label="載入中..." size="sm" />
                      </td>
                    </tr>
                  ) : paged.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-12 text-sm"
                        style={{ color: UI.soft }}
                      >
                        目前沒有符合條件的訂單
                      </td>
                    </tr>
                  ) : (
                    paged.map((order) => {
                      const email = buyerEmail(order);
                      const checked = selected.has(order.id);
                      return (
                        <tr
                          key={order.id}
                          style={{
                            borderTop: `1px solid ${UI.border}`,
                            backgroundColor: checked ? UI.light : undefined,
                          }}
                        >
                          <td className="pl-5 pr-2 py-4">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded accent-black cursor-pointer"
                              checked={checked}
                              onChange={() => toggleRow(order.id)}
                              aria-label={`選取訂單 ${order.id}`}
                            />
                          </td>
                          <td className="px-3 py-4">
                            <p
                              className="font-mono font-bold text-xs"
                              style={{ color: UI.dark }}
                            >
                              {String(order.id).substring(0, 8).toUpperCase()}
                            </p>
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: UI.soft }}
                            >
                              {formatDate(order.created_at)}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p
                              className="text-sm font-bold"
                              style={{ color: UI.dark }}
                            >
                              {buyerDisplayName(order)}
                            </p>
                            {email ? (
                              <p
                                className="text-xs truncate max-w-[180px]"
                                style={{ color: UI.soft }}
                              >
                                {email}
                              </p>
                            ) : (
                              <p className="text-xs" style={{ color: UI.soft }}>
                                無 Email
                              </p>
                            )}
                          </td>
                          <td
                            className="px-5 py-4 text-xs font-medium"
                            style={{ color: UI.mid }}
                          >
                            {paymentMethodLabel(order)}
                          </td>
                          <td
                            className="px-5 py-4 font-bold"
                            style={{ color: UI.dark }}
                          >
                            {fmt(order.total_amount)}
                          </td>
                          <td className="px-5 py-4" style={{ color: UI.soft }}>
                            {fmt(order.b2b_cost)}
                          </td>
                          <td
                            className="px-5 py-4 font-black"
                            style={{ color: UI.dark }}
                          >
                            +{fmt(order.partner_profit)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => openDetail(order)}
                              className="w-8 h-8 inline-flex items-center justify-center transition"
                              style={editBtnStyle}
                              aria-label="查看訂單詳情"
                              title="查看訂單"
                            >
                              <MaterialIcon name="edit" size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && filtered.length > 0 ? (
              <div
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
                style={{
                  borderTop: `1px solid ${UI.border}`,
                  backgroundColor: UI.wash,
                }}
              >
                <p style={{ color: UI.mid }}>
                  此分頁條件合計{" "}
                  <span className="font-bold" style={{ color: UI.dark }}>
                    {filteredTotals.count} 筆
                  </span>
                  {dateRange?.from ? (
                    <span className="text-[11px] font-normal ml-1">
                      （已套用日期篩選）
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-bold tabular-nums">
                  <span style={{ color: UI.mid }}>
                    營收{" "}
                    <span style={{ color: UI.dark }}>
                      {fmt(filteredTotals.revenue)}
                    </span>
                  </span>
                  <span style={{ color: UI.mid }}>
                    分潤{" "}
                    <span style={{ color: "#008060" }}>
                      {fmt(filteredTotals.profit)}
                    </span>
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
          </Card>
        </div>
      </div>

      <PrintOrdersModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        orders={printTargetOrders}
        partnerName={partnerDisplayName}
      />

      <OrderDetailModal
        open={!!detailOrder}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />
    </PartnerAdminLayout>
  );
}
