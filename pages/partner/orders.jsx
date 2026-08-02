import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { DobermanPanel, fmt, METRIC_HELP } from "@/components/partner/DobermanWidgets";
import MaterialIcon from "@/components/MaterialIcon";
import { usePartnerSession, fetchPartnerStats } from "@/lib/partnerAuth";
import { isSettledOrderStatus } from "@/lib/refundPolicy";
import {
  paymentMethodLabel,
  buyerDisplayName,
  buyerEmail,
} from "@/lib/orderDisplay";
import { PARTNER_UI } from "@/lib/partnerUi";

function formatDate(d) {
  return new Date(d).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** 分潤者可見狀態：已完成／尚未付款要一眼分清 */
const STATUS_MAP = {
  completed: { label: "已完成", cls: "bg-[#d1fae5] text-[#065f46]" },
  pending: { label: "尚未付款", cls: "bg-[#fef3c7] text-[#92400e]" },
  cancelled: { label: "已取消", cls: "bg-slate-100 text-slate-500" },
  failed: { label: "付款失敗", cls: "bg-red-100 text-red-600" },
  refunded: { label: "已退款", cls: "bg-slate-100 text-slate-500" },
  refund_pending: { label: "退款審核中", cls: "bg-amber-100 text-amber-800" },
};

export default function PartnerOrdersPage() {
  const { partner, store } = usePartnerSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!partner) return;
    fetchPartnerStats(partner.id, store?.id).then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, [partner, store]);

  const orders = stats?.orders || [];

  const statusCounts = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    for (const o of orders) {
      if (o.status === "completed") paid += 1;
      else if (o.status === "pending") unpaid += 1;
    }
    return {
      paid,
      unpaid,
      valid: paid + unpaid,
      all: orders.length,
    };
  }, [orders]);

  const filtered = orders.filter((o) => {
    if (filter === "all") return isSettledOrderStatus(o.status);
    return o.status === filter;
  });

  return (
    <PartnerAdminLayout title="訂單分潤">
      <div className={`${PARTNER_UI.pageFlush} flex flex-col flex-1 min-h-0`}>
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-[#F7F9FB] text-xs text-slate-600 leading-relaxed">
        分潤採月結對帳單（次月 15）＋後台申請提領；核准後目標 10 個工作天內匯款。請至{" "}
        <Link
          href="/partner/settlement"
          className="font-bold text-[#1E4AD1] underline underline-offset-2"
        >
          結算與提領
        </Link>
        申請（最低 NT$3,000／滿 10 天；每月第 1 次免手續費，之後每次 NT$15）。
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 border-x border-b border-slate-200">
        <div className="border-b md:border-b-0 md:border-r border-slate-200">
          <DobermanPanel
            icon="payments"
            title="累計分潤"
            help={METRIC_HELP.cumulativeProfit}
            rows={[{ label: "分潤合計", value: loading ? "..." : fmt(stats?.totalProfit) }]}
          />
        </div>
        <div className="border-b md:border-b-0 md:border-r border-slate-200">
          <DobermanPanel
            icon="receipt_long"
            title="有效訂單"
            help={METRIC_HELP.validOrders}
            rows={[
              {
                label: "合計（已完成＋尚未付款）",
                value: loading ? "..." : statusCounts.valid,
                unit: "筆",
              },
              {
                label: "已付款",
                value: loading ? "..." : statusCounts.paid,
                unit: "筆",
              },
              {
                label: "尚未付款",
                value: loading ? "..." : statusCounts.unpaid,
                unit: "筆",
              },
            ]}
          />
        </div>
        <DobermanPanel
          icon="language"
          title="店鋪營收"
          help={METRIC_HELP.storeRevenueAll}
          rows={[{ label: "受取合計", value: loading ? "..." : fmt(stats?.totalRevenue) }]}
        />
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div
          className="rounded-xl border px-3.5 py-3 sm:px-4 text-xs leading-relaxed"
          style={{
            borderColor: "rgba(250, 222, 43, 0.65)",
            backgroundColor: "rgba(250, 222, 43, 0.18)",
            color: "#5c4a00",
          }}
        >
          <p className="font-bold mb-0.5 text-[#1E4AD1]">關於買家聯絡資訊</p>
          <p>
            僅顯示姓名與 Email，方便您針對「尚未付款」訂單禮貌提醒。請勿濫發訊息或用於分潤以外用途；繳費代碼等敏感資料不會提供給夥伴。
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-bold text-slate-500 w-full sm:w-auto mr-0 sm:mr-1">
            篩選狀態
          </span>
          {[
            { id: "all", label: "全部有效", count: statusCounts.valid },
            { id: "completed", label: "已付款", count: statusCounts.paid },
            { id: "pending", label: "尚未付款", count: statusCounts.unpaid },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 min-h-10 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition ${
                filter === f.id
                  ? "bg-[#1E4AD1] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
              <span
                className={`tabular-nums ${
                  filter === f.id ? "text-blue-100" : "text-slate-400"
                }`}
              >
                {loading ? "…" : f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 bg-[#f8fafc]">
            <div className="flex items-center gap-2 min-w-0">
              <MaterialIcon name="receipt" size={20} className="text-[#1E4AD1]" />
              <h2 className="text-sm font-black text-slate-800">訂單列表</h2>
            </div>
            <Link
              href="/partner/products?tab=products"
              className="text-xs text-[#1E4AD1] font-bold hover:underline flex items-center gap-1 shrink-0 min-h-9"
            >
              商品管理
              <MaterialIcon name="chevron_right" size={16} />
            </Link>
          </div>

          {/* 手機卡片 */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-10 text-center text-slate-400 text-sm">載入中...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                目前沒有符合條件的訂單
              </div>
            ) : (
              filtered.map((order) => {
                const st = STATUS_MAP[order.status] || {
                  label: order.status,
                  cls: "bg-slate-100 text-slate-500",
                };
                const email = buyerEmail(order);
                const isPending = order.status === "pending";
                return (
                  <div key={order.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-slate-700 text-xs">
                          {String(order.id).substring(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-1 rounded-md shrink-0 ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {buyerDisplayName(order)}
                      </p>
                      {email ? (
                        <a
                          href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
                            isPending
                              ? `【Jeko】訂單付款提醒`
                              : `【Jeko】訂單諮詢`,
                          )}`}
                          className="text-xs text-[#1E4AD1] font-bold break-all"
                        >
                          {email}
                        </a>
                      ) : (
                        <p className="text-xs text-slate-400">無 Email</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-slate-400 font-bold">金額</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {fmt(order.total_amount)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-50 px-3 py-2">
                        <p className="text-slate-400 font-bold">分潤</p>
                        <p className="font-black text-[#1E4AD1] mt-0.5">
                          {fmt(order.partner_profit)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2 col-span-2">
                        <p className="text-slate-400 font-bold">付款方式</p>
                        <p className="font-medium text-slate-700 mt-0.5">
                          {paymentMethodLabel(order) || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-white text-slate-500 text-xs border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left font-bold">訂單 / 日期</th>
                  <th className="px-5 py-3 text-left font-bold">買家</th>
                  <th className="px-5 py-3 text-left font-bold">付款方式</th>
                  <th className="px-5 py-3 text-left font-bold">訂單金額</th>
                  <th className="px-5 py-3 text-left font-bold">底價成本</th>
                  <th className="px-5 py-3 text-left font-bold">分潤</th>
                  <th className="px-5 py-3 text-left font-bold">付款狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      載入中...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      目前沒有符合條件的訂單
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const st = STATUS_MAP[order.status] || {
                      label: order.status,
                      cls: "bg-slate-100 text-slate-500",
                    };
                    const email = buyerEmail(order);
                    const isPending = order.status === "pending";
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4">
                          <p className="font-mono font-bold text-slate-700 text-xs">
                            {String(order.id).substring(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDate(order.created_at)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-800">
                            {buyerDisplayName(order)}
                          </p>
                          {email ? (
                            <a
                              href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
                                isPending
                                  ? `【Jeko eSIM】訂單付款提醒 #${String(order.id).slice(0, 8)}`
                                  : `【Jeko eSIM】關於您的訂單 #${String(order.id).slice(0, 8)}`,
                              )}`}
                              className="text-xs text-[#1E4AD1] hover:underline break-all"
                            >
                              {email}
                            </a>
                          ) : (
                            <p className="text-xs text-slate-400">無 Email</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-700 text-xs font-medium">
                          {paymentMethodLabel(order)}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-800">
                          {fmt(order.total_amount)}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {fmt(order.b2b_cost)}
                        </td>
                        <td className="px-5 py-4 font-black text-[#1E4AD1]">
                          +{fmt(order.partner_profit)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-sm ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </PartnerAdminLayout>
  );
}
