"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  MemberProfileHeader,
  InnerTabs,
  NavyPanel,
  MetricTile,
  AccountBadge,
  AccountPageWrap,
  ShopifyDropdown,
} from "./AccountShell";
import AccountIcon from "@/components/account/AccountIcon";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { useUser } from "@/components/context/UserContext";
import { orderItemSummary, refundStatusLabel } from "@/lib/refundPolicy";
import { ACCOUNT_THEME, ACCOUNT_UI, SHOPIFY_BADGE } from "@/lib/accountUi";
import { formatMemberEmailDisplay } from "@/lib/lineAuth";
import { CONTACT_INFO } from "@/lib/contactUi";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { useLineBind } from "@/hooks/useLineBind";
import { maybeMarkWelcomeGiftOnFirstClaim } from "@/lib/welcomeGiftPopup";

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

const STATUS_TONE = {
  completed: "success",
  pending: "warning",
  refund_pending: "warning",
  refunded: "neutral",
  cancelled: "neutral",
  failed: "critical",
};

const STATUS_LABEL = {
  completed: "已發貨",
  pending: "待付款",
  refund_pending: "退款中",
  refunded: "已退款",
  cancelled: "已取消",
  failed: "付款失敗",
};

function OrderBadge({ status, order }) {
  const s = String(status || "").toLowerCase();
  const refundBadge = order ? refundStatusLabel(order) : null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <AccountBadge tone={STATUS_TONE[s] || "neutral"}>
        {STATUS_LABEL[s] || status}
      </AccountBadge>
      {refundBadge && s !== "refunded" ? (
        <AccountBadge tone="warning">{refundBadge.label}</AccountBadge>
      ) : null}
    </span>
  );
}

function SecondaryBtn({ children, onClick, href }) {
  const style = {
    backgroundColor: "#fafafa",
    color: "#303030",
    border: "1px solid #8a8a8a",
    borderRadius: "0.5rem",
  };
  const cls =
    "inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-semibold transition";
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {children}
    </button>
  );
}

function PrimaryBtn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[13px] font-semibold text-white transition"
      style={{
        backgroundColor: ACCOUNT_THEME.dark,
        borderRadius: "0.5rem",
      }}
    >
      {children}
    </button>
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
  const [needLineForWelcome, setNeedLineForWelcome] = useState(false);
  const [lineOaUrl, setLineOaUrl] = useState(CONTACT_INFO.lineUrl);

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/promo/member-coupons", {
        headers,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      setMemberCoupons(res.ok && data.success ? data.coupons || [] : []);
      setNeedLineForWelcome(Boolean(data.need_line_for_welcome));
      if (data.line_oa_url) setLineOaUrl(data.line_oa_url);
      if (res.ok && data.success && data.welcome) {
        maybeMarkWelcomeGiftOnFirstClaim(data.welcome);
      }
    } catch {
      setMemberCoupons([]);
      setNeedLineForWelcome(false);
    } finally {
      setCouponsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (nextAuthStatus === "loading") return;
    loadCoupons();
  }, [nextAuthStatus, loadCoupons]);

  const {
    status: lineBindStatus,
    message: lineBindMessage,
    bind: bindLine,
  } = useLineBind({ onSuccess: loadCoupons });

  const availableCoupons = memberCoupons.filter((c) => c.status === "available");

  const pendingCount = orders.filter((o) =>
    ["pending", "refund_pending"].includes(String(o.status).toLowerCase()),
  ).length;
  const pendingPay = orders.filter((o) => o.status === "pending").length;
  const refundPending = orders.filter(
    (o) => o.status === "refund_pending",
  ).length;
  const totalSpent = orders
    .filter((o) => String(o.status).toLowerCase() === "completed")
    .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  const joinDate =
    orders.length > 0
      ? formatShortDate(
          orders.reduce((earliest, o) => {
            const t = new Date(o.created_at).getTime();
            return !earliest || t < new Date(earliest).getTime()
              ? o.created_at
              : earliest;
          }, null),
        )
      : "—";

  const latestOrder = orders[0] || null;

  const innerTabs = [
    { id: "overview", label: "總覽" },
    { id: "orders", label: "我的 eSIM", count: completedOrders.length },
    { id: "activity", label: "待辦事項", count: pendingCount || undefined },
  ];

  const moreMenu = [
    ...(userRole === "admin"
      ? [
          {
            id: "admin",
            label: "系統總控制台",
            icon: "admin_panel_settings",
            onClick: () => onTabChange("admin_dashboard"),
          },
        ]
      : []),
    ...(userRole === "partner" && partnerData
      ? [
          {
            id: "partner",
            label: "進入夥伴後台",
            icon: "store",
            onClick: onPartnerPortal,
          },
        ]
      : []),
    { divider: true },
    {
      id: "traffic",
      label: "查詢流量",
      icon: "speed",
      onClick: () => onTabChange("traffic"),
    },
    {
      id: "follows",
      label: "追蹤創作者",
      icon: "notifications",
      onClick: () => onTabChange("follows"),
    },
    {
      id: "support",
      label: "安裝與支援",
      icon: "help_center",
      onClick: () => onTabChange("support"),
    },
    {
      id: "settings",
      label: "帳號設定",
      icon: "manage_accounts",
      onClick: () => onTabChange("settings"),
    },
  ].filter((item, i, arr) => {
    if (item.divider && i === 0) return false;
    if (item.divider && arr[i - 1]?.divider) return false;
    return true;
  });

  return (
    <AccountPageWrap>
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
        actions={
          <>
            <SecondaryBtn onClick={() => onTabChange("orders")}>
              <AccountIcon name="qr_code_2" size={16} />
              我的訂單
            </SecondaryBtn>
            <ShopifyDropdown variant="account" label="更多操作" items={moreMenu} />
          </>
        }
      />

      <InnerTabs tabs={innerTabs} active={innerTab} onChange={setInnerTab} />

      {innerTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] gap-4 xl:gap-5">
          {/* 左欄 — 比照圖一主內容 */}
          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap gap-3">
              <MetricTile
                icon="sim_card"
                label="有效 eSIM"
                value={completedOrders.length}
                variant="green"
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
                variant="yellow"
              />
              <MetricTile
                icon="confirmation_number"
                label="可用優惠券"
                value={couponsLoading ? "…" : availableCoupons.length}
                variant="navy"
              />
            </div>

            {/* 有效 eSIM 卡 — 對應圖一 Fulfillment */}
            <NavyPanel
              title="有效 eSIM"
              icon="sim_card"
              action={
                <span
                  className="text-sm font-bold"
                  style={{ color: ACCOUNT_THEME.dark }}
                >
                  {completedOrders.length
                    ? `${completedOrders.length} 張可使用`
                    : "尚無 eSIM"}
                </span>
              }
            >
              {completedOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p
                    className="text-sm mb-3"
                    style={{ color: ACCOUNT_THEME.soft }}
                  >
                    尚無有效 eSIM，前往商城選購方案
                  </p>
                  <PrimaryBtn onClick={() => (window.location.href = "/")}>
                    瀏覽方案
                  </PrimaryBtn>
                </div>
              ) : (
                <ul className="divide-y" style={{ borderColor: ACCOUNT_THEME.border }}>
                  {completedOrders.slice(0, 4).map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      style={{ borderColor: ACCOUNT_THEME.border }}
                    >
                      <div
                        className="w-10 h-10 flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: ACCOUNT_THEME.light,
                          borderRadius: ACCOUNT_UI.radiusSm,
                        }}
                      >
                        <AccountIcon
                          name="sim_card"
                          size={20}
                          style={{ color: ACCOUNT_THEME.dark }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-bold truncate"
                          style={{ color: ACCOUNT_THEME.dark }}
                        >
                          {orderItemSummary(o)}
                        </p>
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: ACCOUNT_THEME.soft }}
                        >
                          訂單 #{String(o.id).slice(0, 8).toUpperCase()} ·{" "}
                          {formatShortDate(o.created_at)}
                        </p>
                      </div>
                      <OrderBadge status={o.status} order={o} />
                    </li>
                  ))}
                </ul>
              )}
              {completedOrders.length > 0 ? (
                <div
                  className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4"
                  style={{ borderTop: `1px solid ${ACCOUNT_THEME.border}` }}
                >
                  <SecondaryBtn onClick={() => onTabChange("traffic")}>
                    <AccountIcon name="speed" size={16} />
                    查詢流量
                  </SecondaryBtn>
                  <PrimaryBtn onClick={() => onTabChange("orders")}>
                    查看全部訂單
                  </PrimaryBtn>
                </div>
              ) : null}
            </NavyPanel>

            {/* 最近訂單摘要 — 對應圖一 Payment */}
            <NavyPanel
              title="最近訂單"
              icon="receipt_long"
              action={
                <button
                  type="button"
                  onClick={() => onTabChange("orders")}
                  className="text-[12px] font-bold hover:underline"
                  style={{ color: ACCOUNT_THEME.dark }}
                >
                  查看全部
                </button>
              }
            >
              {orders.length === 0 ? (
                <p
                  className="text-sm text-center py-6"
                  style={{ color: ACCOUNT_THEME.soft }}
                >
                  尚無訂單
                </p>
              ) : (
                <>
                  {latestOrder ? (
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between gap-3">
                        <span style={{ color: ACCOUNT_THEME.soft }}>
                          最近一筆
                        </span>
                        <span
                          className="font-mono font-bold"
                          style={{ color: ACCOUNT_THEME.dark }}
                        >
                          #{String(latestOrder.id).slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span style={{ color: ACCOUNT_THEME.soft }}>品項</span>
                        <span
                          className="font-medium truncate max-w-[60%] text-right"
                          style={{ color: ACCOUNT_THEME.dark }}
                        >
                          {orderItemSummary(latestOrder)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span style={{ color: ACCOUNT_THEME.soft }}>狀態</span>
                        <OrderBadge
                          status={latestOrder.status}
                          order={latestOrder}
                        />
                      </div>
                      <div
                        className="flex justify-between gap-3 pt-2"
                        style={{ borderTop: `1px solid ${ACCOUNT_THEME.border}` }}
                      >
                        <span
                          className="font-bold"
                          style={{ color: ACCOUNT_THEME.dark }}
                        >
                          金額
                        </span>
                        <span
                          className="font-black"
                          style={{ color: ACCOUNT_THEME.dark }}
                        >
                          NT$ {formatNTD(latestOrder.total_amount)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <ul>
                    {orders.slice(0, 4).map((o) => (
                      <li
                        key={o.id}
                        style={{ borderTop: `1px solid ${ACCOUNT_THEME.border}` }}
                      >
                        <button
                          type="button"
                          onClick={() => onTabChange("orders", o)}
                          className="w-full flex items-center gap-3 py-2.5 text-left transition hover:bg-[#fafafa]"
                        >
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-bold truncate"
                              style={{ color: ACCOUNT_THEME.dark }}
                            >
                              #{String(o.id).slice(0, 8).toUpperCase()} ·{" "}
                              {orderItemSummary(o)}
                            </p>
                            <p
                              className="text-[10px] mt-0.5"
                              style={{ color: ACCOUNT_THEME.soft }}
                            >
                              {formatShortDate(o.created_at)} · NT${" "}
                              {formatNTD(o.total_amount)}
                            </p>
                          </div>
                          <OrderBadge status={o.status} order={o} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </NavyPanel>

            {/* 優惠券 */}
            <NavyPanel
              title="我的優惠券"
              icon="confirmation_number"
              action={
                <Link
                  href="/promo"
                  className="text-[12px] font-bold hover:underline"
                  style={{ color: ACCOUNT_THEME.dark }}
                >
                  去拉霸
                </Link>
              }
            >
              {needLineForWelcome && (
                <div className="mb-3 rounded-lg border border-[#06C755]/35 bg-[#06C755]/10 px-3.5 py-3">
                  <p
                    className="text-[13px] font-bold leading-snug"
                    style={{ color: ACCOUNT_THEME.dark }}
                  >
                    尚未加入官方 LINE
                  </p>
                  <p
                    className="mt-1 text-[12px] leading-relaxed"
                    style={{ color: ACCOUNT_THEME.mid }}
                  >
                    新會員 50 元折價券已入帳，但須先連結並加入官方 LINE
                    後才能於結帳使用。
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={bindLine}
                      disabled={lineBindStatus === "loading"}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white text-[12px] font-bold px-4 py-2 disabled:opacity-60"
                    >
                      <LineIconSvg className="w-3.5 h-3.5" />
                      {lineBindStatus === "loading"
                        ? "連結中…"
                        : "連結 LINE 並啟用優惠"}
                    </button>
                    <a
                      href={lineOaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-bold underline"
                      style={{ color: ACCOUNT_THEME.dark }}
                    >
                      尚未加好友？點此加入官方 LINE
                    </a>
                  </div>
                  {lineBindMessage && (
                    <p
                      className={`mt-2 text-[12px] font-medium leading-relaxed ${
                        lineBindStatus === "error"
                          ? "text-red-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {lineBindMessage}
                    </p>
                  )}
                </div>
              )}
              {couponsLoading ? (
                <LoadingIndicator label="載入中…" className="py-3" />
              ) : availableCoupons.length === 0 ? (
                <p className="text-sm py-3" style={{ color: ACCOUNT_THEME.mid }}>
                  尚無可用優惠券。到「最新優惠」拉霸抽獎，中獎會自動存入此處。
                </p>
              ) : (
                <ul>
                  {availableCoupons.map((c) => {
                    const isWelcomeLocked =
                      needLineForWelcome && c.source === "welcome";
                    return (
                      <li
                        key={c.id}
                        className="py-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between"
                        style={{
                          borderTop: `1px solid ${ACCOUNT_THEME.border}`,
                        }}
                      >
                        <div className="min-w-0">
                          <p
                            className="text-sm font-bold"
                            style={{ color: ACCOUNT_THEME.dark }}
                          >
                            {c.label || `${c.amount} 元折抵`}
                          </p>
                          <p
                            className="text-[11px] font-mono break-all"
                            style={{ color: ACCOUNT_THEME.soft }}
                          >
                            {c.code}
                          </p>
                          {isWelcomeLocked && (
                            <p className="mt-1 text-[11px] font-medium text-amber-700 leading-snug">
                              ※ 須加入官方 LINE 後才能使用
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isWelcomeLocked && (
                            <AccountBadge tone="warning">待啟用</AccountBadge>
                          )}
                          <AccountBadge tone="success">
                            NT$ {c.amount}
                          </AccountBadge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </NavyPanel>
          </div>

          {/* 右欄 — 比照圖一 Notes / Customer */}
          <aside className="space-y-4 min-w-0">
            <NavyPanel
              title="會員資料"
              icon="person"
              action={
                <button
                  type="button"
                  onClick={() => onTabChange("settings")}
                  className="w-7 h-7 inline-flex items-center justify-center transition"
                  style={{
                    borderRadius: ACCOUNT_UI.radiusSm,
                    border: `1px solid ${ACCOUNT_THEME.border}`,
                    backgroundColor: ACCOUNT_THEME.light,
                    color: ACCOUNT_THEME.dark,
                  }}
                  aria-label="編輯"
                >
                  <AccountIcon name="edit" size={14} />
                </button>
              }
            >
              <div className="space-y-3 text-sm">
                <div>
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: ACCOUNT_THEME.soft }}
                  >
                    姓名
                  </p>
                  <p className="font-bold" style={{ color: ACCOUNT_THEME.dark }}>
                    {user?.name || "—"}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: ACCOUNT_THEME.soft }}
                  >
                    Email
                  </p>
                  <p
                    className="font-medium break-all"
                    style={{ color: ACCOUNT_THEME.dark }}
                  >
                    {formatMemberEmailDisplay(user?.email)}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: ACCOUNT_THEME.soft }}
                  >
                    電話
                  </p>
                  <p style={{ color: ACCOUNT_THEME.dark }}>
                    {user?.phone || "未設定"}
                  </p>
                </div>
                <div
                  className="pt-3 space-y-2"
                  style={{ borderTop: `1px solid ${ACCOUNT_THEME.border}` }}
                >
                  <div className="flex justify-between text-xs">
                    <span style={{ color: ACCOUNT_THEME.soft }}>有效 eSIM</span>
                    <span
                      className="font-bold"
                      style={{ color: ACCOUNT_THEME.dark }}
                    >
                      {completedOrders.length} 張
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: ACCOUNT_THEME.soft }}>累計消費</span>
                    <span
                      className="font-bold"
                      style={{ color: ACCOUNT_THEME.dark }}
                    >
                      NT$ {formatNTD(totalSpent)}
                    </span>
                  </div>
                </div>
              </div>
            </NavyPanel>

            <NavyPanel title="待辦事項" icon="checklist">
              <ul className="space-y-1">
                {[
                  {
                    label: "待付款訂單",
                    val: pendingPay,
                    tab: "orders",
                    icon: "pending",
                  },
                  {
                    label: "退款審核中",
                    val: refundPending,
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
                      className="w-full flex items-center justify-between py-2.5 px-1 rounded-md transition hover:bg-[#f6f6f7] group"
                    >
                      <span
                        className="flex items-center gap-2 text-sm font-medium"
                        style={{ color: ACCOUNT_THEME.dark }}
                      >
                        <AccountIcon
                          name={row.icon}
                          size={18}
                          style={{ color: ACCOUNT_THEME.mid }}
                        />
                        {row.label}
                      </span>
                      <span
                        className="flex items-center gap-1 font-black"
                        style={{ color: ACCOUNT_THEME.dark }}
                      >
                        {row.val}
                        <AccountIcon
                          name="chevron_right"
                          size={18}
                          style={{ color: ACCOUNT_THEME.soft }}
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </NavyPanel>

            <NavyPanel title="需要協助？" icon="support_agent">
              <div className="space-y-1 text-sm">
                {[
                  { href: "/faq", icon: "menu_book", label: "eSIM 安裝指南" },
                  { href: "/contact", icon: "mail", label: "聯絡客服" },
                  {
                    href: "/refund-policy",
                    icon: "policy",
                    label: "退換貨政策",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 p-2 rounded-md transition hover:bg-[#f6f6f7] font-medium"
                    style={{ color: ACCOUNT_THEME.dark }}
                  >
                    <AccountIcon
                      name={item.icon}
                      size={18}
                      style={{ color: ACCOUNT_THEME.mid }}
                    />
                    {item.label}
                  </Link>
                ))}
              </div>
            </NavyPanel>

            <NavyPanel title="系統公告" icon="campaign">
              <div className="space-y-3 text-sm">
                <div
                  className="flex gap-3 p-3"
                  style={{
                    backgroundColor: "#e0f0ff",
                    borderRadius: ACCOUNT_UI.radiusSm,
                  }}
                >
                  <AccountBadge tone="info">新功能</AccountBadge>
                  <p style={{ color: ACCOUNT_THEME.dark }}>
                    帳戶中心已支援一鍵查詢流量與圖表分析。
                  </p>
                </div>
                <div
                  className="flex gap-3 p-3"
                  style={{
                    backgroundColor: ACCOUNT_THEME.light,
                    borderRadius: ACCOUNT_UI.radiusSm,
                  }}
                >
                  <AccountBadge tone="success">政策</AccountBadge>
                  <p style={{ color: ACCOUNT_THEME.dark }}>
                    退換貨可線上申請，詳見{" "}
                    <Link
                      href="/refund-policy"
                      className="font-bold underline underline-offset-2"
                    >
                      退換貨政策
                    </Link>
                    。
                  </p>
                </div>
              </div>
            </NavyPanel>
          </aside>
        </div>
      )}

      {innerTab === "orders" && (
        <NavyPanel
          title="我的 eSIM"
          icon="qr_code_2"
          action={
            <PrimaryBtn onClick={() => onTabChange("orders")}>
              查看全部訂單
            </PrimaryBtn>
          }
        >
          {completedOrders.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: ACCOUNT_THEME.soft }}
            >
              尚無有效 eSIM
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {completedOrders.slice(0, 9).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onTabChange("orders")}
                  className="flex items-center gap-3 p-3 text-left transition hover:bg-[#fafafa]"
                  style={{
                    border: `1px solid ${ACCOUNT_THEME.border}`,
                    borderRadius: ACCOUNT_UI.radius,
                  }}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: ACCOUNT_THEME.light,
                      borderRadius: ACCOUNT_UI.radiusSm,
                    }}
                  >
                    <AccountIcon
                      name="sim_card"
                      size={22}
                      style={{ color: ACCOUNT_THEME.dark }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold text-sm truncate"
                      style={{ color: ACCOUNT_THEME.dark }}
                    >
                      {orderItemSummary(o)}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: ACCOUNT_THEME.soft }}
                    >
                      #{String(o.id).slice(0, 8).toUpperCase()} ·{" "}
                      {formatShortDate(o.created_at)}
                    </p>
                  </div>
                  <OrderBadge status={o.status} order={o} />
                </button>
              ))}
            </div>
          )}
        </NavyPanel>
      )}

      {innerTab === "activity" && (
        <NavyPanel title="待辦與提醒" icon="notifications">
          {pendingCount === 0 ? (
            <div
              className="text-center py-10"
              style={{ color: ACCOUNT_THEME.soft }}
            >
              <AccountIcon
                name="task_alt"
                size={40}
                className="mx-auto mb-2 opacity-40"
              />
              <p className="text-sm">目前沒有待處理事項</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders
                .filter((o) =>
                  ["pending", "refund_pending"].includes(
                    String(o.status).toLowerCase(),
                  ),
                )
                .map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-3 p-3"
                    style={{
                      border: `1px solid ${SHOPIFY_BADGE.warning.bg}`,
                      backgroundColor: "#fffbeb",
                      borderRadius: ACCOUNT_UI.radius,
                    }}
                  >
                    <AccountIcon
                      name="warning_amber"
                      size={22}
                      style={{ color: SHOPIFY_BADGE.warning.dot }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold"
                        style={{ color: ACCOUNT_THEME.dark }}
                      >
                        訂單 #{String(o.id).slice(0, 8).toUpperCase()} —{" "}
                        {orderItemSummary(o)}
                      </p>
                      <p className="text-xs mt-0.5 flex flex-wrap items-center gap-1">
                        <OrderBadge status={o.status} order={o} />
                        <span style={{ color: ACCOUNT_THEME.soft }}>
                          · NT$ {formatNTD(o.total_amount)}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTabChange("orders")}
                      className="text-xs font-bold shrink-0"
                      style={{ color: ACCOUNT_THEME.dark }}
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
