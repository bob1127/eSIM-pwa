"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  MemberProfileHeader,
  InnerTabs,
  NavyPanel,
  MetricTile,
  ACCENT,
  AccountPageWrap,
} from "./AccountShell";
import MaterialIcon from "@/components/MaterialIcon";
import { useUser } from "@/components/context/UserContext";
import { orderItemSummary, refundStatusLabel } from "@/lib/refundPolicy";

const formatNTD = (val) => {
  if (val == null) return "0";
  return Math.round(Number(val)).toLocaleString("zh-TW");
};

const formatShortDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

function OrderBadge({ status, order }) {
  const s = String(status || "").toLowerCase();
  const refundBadge = order ? refundStatusLabel(order) : null;
  const map = {
    completed: "bg-[#0071EB]/10 text-[#0071EB] border-[#0071EB]/20",
    pending: "bg-slate-100 text-slate-600 border-slate-200",
    refund_pending: "bg-amber-50 text-amber-800 border-amber-200",
    refunded: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const labels = {
    completed: "已發貨",
    pending: "待付款",
    refund_pending: "退款中",
    refunded: "已退款",
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[s] || "bg-slate-100 text-slate-600 border-slate-200"}`}
      >
        {labels[s] || status}
      </span>
      {refundBadge && s !== "refunded" && (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${refundBadge.color}`}
        >
          {refundBadge.label}
        </span>
      )}
    </span>
  );
}

export default function AccountDashboardView({
  user,
  userRole,
  partnerData,
  orders,
  completedOrders,
  partnerStats,
  adminStats,
  statsLoading,
  onTabChange,
  onPartnerPortal,
}) {
  const [innerTab, setInnerTab] = useState("overview");
  const { token } = useUser();
  const { status: nextAuthStatus } = useSession();
  const [memberCoupons, setMemberCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setCouponsLoading(true);
      try {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/promo/member-coupons", {
          headers,
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setMemberCoupons(res.ok && data.success ? data.coupons || [] : []);
        }
      } catch {
        if (!cancelled) setMemberCoupons([]);
      } finally {
        if (!cancelled) setCouponsLoading(false);
      }
    };
    if (nextAuthStatus === "loading") return undefined;
    load();
    return () => {
      cancelled = true;
    };
  }, [token, nextAuthStatus]);

  const availableCoupons = memberCoupons.filter((c) => c.status === "available");

  const pendingCount = orders.filter((o) =>
    ["pending", "refund_pending"].includes(String(o.status).toLowerCase()),
  ).length;
  const totalSpent = orders
    .filter((o) => String(o.status).toLowerCase() === "completed")
    .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  const joinDate =
    orders.length > 0
      ? formatShortDate(
          orders.reduce((earliest, o) => {
            const t = new Date(o.created_at).getTime();
            return !earliest || t < new Date(earliest).getTime() ? o.created_at : earliest;
          }, null),
        )
      : "—";

  const innerTabs = [
    { id: "overview", label: "總覽" },
    { id: "orders", label: "我的 eSIM", count: completedOrders.length },
    { id: "activity", label: "待辦事項", count: pendingCount || undefined },
  ];

  return (
    <AccountPageWrap>
      {/* Josys 會員資料卡 — 圖 4、5 */}
      <MemberProfileHeader
        user={user}
        userRole={userRole}
        partnerData={partnerData}
        joinDate={joinDate}
        stats={{
          activeEsims: completedOrders.length,
          totalSpent: formatNTD(totalSpent),
          pendingCount,
        }}
        onEdit={() => onTabChange("settings")}
      />

      {(userRole === "admin" || userRole === "partner") && (
        <div className="flex flex-wrap gap-2 mb-5">
          {userRole === "admin" && (
            <button
              type="button"
              onClick={() => onTabChange("admin_dashboard")}
              className="px-4 py-2 bg-[#0071EB] text-white text-xs font-bold rounded-sm"
            >
              系統總控制台
            </button>
          )}
          {userRole === "partner" && partnerData && (
            <button
              type="button"
              onClick={onPartnerPortal}
              className="px-4 py-2 text-white text-xs font-bold rounded-sm"
              style={{ backgroundColor: ACCENT.sidebar }}
            >
              進入夥伴後台 →
            </button>
          )}
        </div>
      )}

      <InnerTabs tabs={innerTabs} active={innerTab} onChange={setInnerTab} />

      {innerTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] gap-5 xl:gap-6">
          <div className="space-y-5 min-w-0">
          {/* HR Spanner 指標列 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricTile
              icon="sim_card"
              label="有效 eSIM"
              value={completedOrders.length}
              variant="navy"
            />
            <MetricTile
              icon="receipt_long"
              label="歷史訂單"
              value={orders.length}
              sub={pendingCount ? `${pendingCount} 待處理` : undefined}
              variant="sky"
            />
            <MetricTile
              icon="payments"
              label="累計消費"
              value={`NT$ ${formatNTD(totalSpent)}`}
              variant="green"
            />
            <MetricTile
              icon="speed"
              label="流量查詢"
              value="一鍵"
              sub="會員專屬"
              variant="navy"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NavyPanel
              title="我的優惠券"
              icon="confirmation_number"
              action={
                <Link
                  href="/promo"
                  className="text-[11px] font-bold text-[#0071EB] hover:underline"
                >
                  去拉霸
                </Link>
              }
            >
              {couponsLoading ? (
                <p className="text-sm text-slate-400 py-3">載入中…</p>
              ) : availableCoupons.length === 0 ? (
                <p className="text-sm text-slate-500 py-3">
                  尚無可用優惠券。到「最新優惠」拉霸抽獎，中獎會自動存入此處。
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {availableCoupons.map((c) => (
                    <li
                      key={c.id}
                      className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {c.label || `${c.amount} 元折抵`}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 break-all">
                          {c.code}
                        </p>
                      </div>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full w-fit">
                        NT$ {c.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </NavyPanel>

            <NavyPanel
              title="待辦事項"
              icon="checklist"
              action={
                <button
                  type="button"
                  onClick={() => onTabChange("orders")}
                  className="text-[11px] font-bold text-[#0071EB] hover:underline"
                >
                  查看全部
                </button>
              }
            >
              <ul className="divide-y divide-slate-100">
                {[
                  {
                    label: "待付款訂單",
                    val: orders.filter((o) => o.status === "pending").length,
                    tab: "orders",
                    icon: "pending",
                  },
                  {
                    label: "退款審核中",
                    val: orders.filter((o) => o.status === "refund_pending").length,
                    tab: "orders",
                    icon: "undo",
                  },
                  {
                    label: "查詢流量",
                    val: "→",
                    tab: "traffic",
                    icon: "speed",
                  },
                ].map((row) => (
                  <li key={row.label}>
                    <button
                      type="button"
                      onClick={() => onTabChange(row.tab)}
                      className="w-full flex items-center justify-between py-3 hover:bg-slate-50 px-1 rounded transition group"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                        <MaterialIcon
                          name={row.icon}
                          size={18}
                          className="text-[#1E4AD1] opacity-70"
                        />
                        {row.label}
                      </span>
                      <span className="flex items-center gap-1 font-black text-[#1E4AD1]">
                        {row.val}
                        <MaterialIcon
                          name="chevron_right"
                          size={18}
                          className="text-slate-300 group-hover:text-[#0071EB]"
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </NavyPanel>

            <NavyPanel title="系統公告" icon="campaign">
              <div className="space-y-4 text-sm">
                <div className="flex gap-3 p-3 rounded-sm bg-[#0071EB]/5 border border-[#0071EB]/10">
                  <span className="text-[10px] font-bold bg-[#0071EB] text-white px-2 py-0.5 rounded h-fit shrink-0">
                    新功能
                  </span>
                  <p className="text-slate-700">
                    會員中心已支援<strong>一鍵查詢流量</strong>與圖表分析，請至「查詢流量」分頁。
                  </p>
                </div>
                <div className="flex gap-3 p-3 rounded-sm bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded h-fit shrink-0">
                    政策
                  </span>
                  <p className="text-slate-700">
                    退換貨可線上申請，詳見{" "}
                    <Link href="/refund-policy" className="text-[#0071EB] font-bold hover:underline">
                      退換貨政策
                    </Link>
                    。
                  </p>
                </div>
              </div>
            </NavyPanel>

            <NavyPanel
              title="最近訂單"
              icon="history"
              className="md:col-span-2"
              action={
                <button
                  type="button"
                  onClick={() => onTabChange("orders")}
                  className="text-[11px] font-bold text-[#0071EB] hover:underline"
                >
                  全部
                </button>
              }
            >
              {orders.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">尚無訂單</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => onTabChange("orders", o)}
                        className="w-full flex items-center gap-3 py-2.5 hover:bg-slate-50 px-1 rounded-sm transition text-left group"
                      >
                        <div className="w-8 h-8 rounded-sm bg-[#1E4AD1]/10 flex items-center justify-center shrink-0">
                          <MaterialIcon name="receipt" size={16} className="text-[#1E4AD1]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#1E4AD1] truncate">
                            #{o.id} · {orderItemSummary(o)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatShortDate(o.created_at)} · NT$ {formatNTD(o.total_amount)}
                          </p>
                        </div>
                        <OrderBadge status={o.status} order={o} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </NavyPanel>
          </div>
          </div>

          {/* 右側欄 — 填滿寬螢幕右側空間 */}
          <aside className="space-y-4 min-w-0">
            <NavyPanel title="快速入口" icon="apps">
              <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
                {[
                  { icon: "qr_code_2", label: "我的訂單", tab: "orders" },
                  { icon: "speed", label: "查詢流量", tab: "traffic" },
                  { icon: "help_center", label: "安裝支援", tab: "support" },
                  { icon: "manage_accounts", label: "帳號設定", tab: "settings" },
                ].map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => onTabChange(item.tab)}
                    className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-sm hover:border-[#0071EB] hover:bg-white hover:shadow-sm transition text-left w-full"
                  >
                    <MaterialIcon name={item.icon} size={20} className="text-[#1E4AD1] shrink-0" />
                    <span className="text-sm font-bold text-[#1E4AD1]">{item.label}</span>
                  </button>
                ))}
              </div>
            </NavyPanel>

            <NavyPanel title="需要協助？" icon="support_agent">
              <div className="space-y-2 text-sm">
                <Link
                  href="/faq"
                  className="flex items-center gap-2 p-2.5 rounded-sm hover:bg-slate-50 text-slate-700 font-medium"
                >
                  <MaterialIcon name="menu_book" size={18} className="text-[#0071EB]" />
                  eSIM 安裝指南
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 p-2.5 rounded-sm hover:bg-slate-50 text-slate-700 font-medium"
                >
                  <MaterialIcon name="mail" size={18} className="text-[#0071EB]" />
                  聯絡客服
                </Link>
                <Link
                  href="/refund-policy"
                  className="flex items-center gap-2 p-2.5 rounded-sm hover:bg-slate-50 text-slate-700 font-medium"
                >
                  <MaterialIcon name="policy" size={18} className="text-[#0071EB]" />
                  退換貨政策
                </Link>
              </div>
            </NavyPanel>

            {userRole === "admin" && (
              <div className="p-4 rounded-sm border border-[#0071EB]/20 bg-[#0071EB]/5">
                <p className="text-xs font-bold text-[#0071EB] mb-1">管理員捷徑</p>
                <button
                  type="button"
                  onClick={() => onTabChange("admin_dashboard")}
                  className="text-sm font-bold text-[#1E4AD1] hover:text-[#0071EB] flex items-center gap-1"
                >
                  開啟系統總控
                  <MaterialIcon name="arrow_forward" size={16} />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {innerTab === "orders" && (
        <NavyPanel
          title="我的 eSIM"
          icon="qr_code_2"
          action={
            <button
              type="button"
              onClick={() => onTabChange("orders")}
              className="text-xs font-bold text-white px-3 py-1.5 rounded-sm"
              style={{ backgroundColor: ACCENT.primary }}
            >
              + 查看全部訂單
            </button>
          }
        >
          {completedOrders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">尚無有效 eSIM</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 xl:gap-px xl:bg-slate-100 xl:border xl:border-slate-100 xl:rounded-sm xl:overflow-hidden">
              {completedOrders.slice(0, 9).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-4 py-3.5 px-3 hover:bg-slate-50/80 bg-white transition group border-b border-slate-100 xl:border-0"
                >
                  <div className="w-10 h-10 rounded-sm bg-[#1E4AD1]/10 flex items-center justify-center shrink-0">
                    <MaterialIcon name="sim_card" size={22} className="text-[#1E4AD1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1E4AD1] text-sm truncate">
                      {orderItemSummary(o)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      訂單 #{o.id} · {formatShortDate(o.created_at)}
                    </p>
                  </div>
                  <OrderBadge status={o.status} order={o} />
                  <button
                    type="button"
                    onClick={() => onTabChange("orders")}
                    className="text-slate-300 group-hover:text-[#0071EB]"
                  >
                    <MaterialIcon name="chevron_right" size={22} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </NavyPanel>
      )}

      {innerTab === "activity" && (
        <NavyPanel title="待辦與提醒" icon="notifications">
          {pendingCount === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <MaterialIcon name="task_alt" size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">目前沒有待處理事項</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders
                .filter((o) =>
                  ["pending", "refund_pending"].includes(String(o.status).toLowerCase()),
                )
                .map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-3 p-3 rounded-sm border border-amber-100 bg-amber-50/50"
                  >
                    <MaterialIcon name="warning_amber" size={22} className="text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">
                        訂單 #{o.id} — {orderItemSummary(o)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <OrderBadge status={o.status} order={o} /> · NT$ {formatNTD(o.total_amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTabChange("orders")}
                      className="text-xs font-bold text-[#0071EB] shrink-0"
                    >
                      處理 →
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </NavyPanel>
      )}
    </AccountPageWrap>
  );
}
