"use client";

import { useState } from "react";
import Link from "next/link";
import AccountIcon from "@/components/account/AccountIcon";
import { getIosAddToHomeHint } from "@/lib/pushSupport";
import {
  AccountPageWrap,
  AccountBadge,
  MetricTile,
  NavyPanel,
  ShopifyDropdown,
} from "./AccountShell";
import { ACCOUNT_THEME, ACCOUNT_UI, SHOPIFY_BADGE } from "@/lib/accountUi";
import { CONTACT_INFO } from "@/lib/contactUi";

const UI = {
  dark: ACCOUNT_THEME.dark,
  mid: ACCOUNT_THEME.mid,
  soft: ACCOUNT_THEME.soft,
  border: ACCOUNT_THEME.border,
  light: ACCOUNT_THEME.light,
  wash: ACCOUNT_THEME.wash,
  white: ACCOUNT_THEME.white,
  radius: ACCOUNT_UI.radius,
  radiusSm: ACCOUNT_UI.radiusSm,
};

function formatShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function orderShortId(id) {
  return String(id || "")
    .slice(0, 8)
    .toUpperCase();
}

function SecondaryBtn({ children, onClick, href, className = "" }) {
  const style = {
    backgroundColor: "#fafafa",
    color: "#303030",
    border: "1px solid #8a8a8a",
    borderRadius: "0.5rem",
  };
  const cls = `inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[13px] font-semibold transition ${className}`;
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

function PrimaryBtn({ children, onClick, href, className = "" }) {
  const style = {
    backgroundColor: UI.dark,
    borderRadius: "0.5rem",
  };
  const cls = `inline-flex items-center justify-center gap-1.5 h-8 px-3.5 text-[13px] font-semibold text-white transition ${className}`;
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

const STATUS_LABEL = {
  completed: "已發貨",
  pending: "待付款",
  refund_pending: "退款審核",
  refunded: "已退款",
  cancelled: "已取消",
  failed: "失敗",
};

const STATUS_TONE = {
  completed: "success",
  pending: "warning",
  refund_pending: "warning",
  refunded: "neutral",
  cancelled: "neutral",
  failed: "critical",
};

/** 安裝與支援 — Shopify 雙欄小圓角 */
export default function AccountSupportView({
  user,
  orders = [],
  onGuideClick,
  onTabChange,
}) {
  const [iosHintOpen, setIosHintOpen] = useState(true);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const refundPending = orders.filter(
    (o) => o.status === "refund_pending",
  ).length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "早安";
    if (h < 18) return "午安";
    return "晚安";
  };

  const firstName = user?.name?.split(" ")[0] || "會員";

  const todos = [
    pendingCount > 0 && {
      icon: "inventory_2",
      iconBg: "#eec200",
      label: `請完成 ${pendingCount} 筆待付款訂單`,
      action: () => onTabChange?.("orders"),
    },
    completedCount > 0 && {
      icon: "qr_code_scanner",
      iconBg: "#008060",
      label: `您有 ${completedCount} 張 eSIM 可安裝`,
      action: () => onTabChange?.("orders"),
    },
    {
      icon: "speed",
      iconBg: "#2c6ecb",
      label: "查詢 eSIM 剩餘流量",
      action: () => onTabChange?.("traffic"),
    },
    refundPending > 0 && {
      icon: "undo",
      iconBg: SHOPIFY_BADGE.critical.dot,
      label: `${refundPending} 筆退款審核中`,
      action: () => onTabChange?.("orders"),
    },
  ].filter(Boolean);

  const activities = [
    ...orders.slice(0, 5).map((o) => ({
      id: o.id,
      text: `訂單 #${orderShortId(o.id)} · ${STATUS_LABEL[o.status] || o.status}`,
      tone: STATUS_TONE[o.status] || "neutral",
      at: o.created_at,
    })),
    {
      id: "guide",
      text: "eSIM 安裝指南已更新",
      tone: "info",
      at: new Date().toISOString(),
    },
  ];

  const guides = [
    {
      icon: "phone_iphone",
      iconBg: "#2c6ecb",
      title: "iOS 安裝教學",
      desc: "iPhone / iPad 加入 eSIM 步驟",
      href: "/operation-ios",
    },
    {
      icon: "android",
      iconBg: "#008060",
      title: "Android 教學",
      desc: "掃描截圖安裝行動方案",
      href: "/operation-android",
    },
    {
      icon: "help_center",
      iconBg: "#5c5c5c",
      title: "FAQ 常見問題",
      desc: "啟用、訊號、漫遊疑難排解",
      href: "/faq",
    },
    {
      icon: "policy",
      iconBg: "#eec200",
      title: "退換貨政策",
      desc: "未開通 7 日內可申請退款",
      href: "/refund-policy",
    },
  ];

  const moreMenu = [
    {
      id: "orders",
      label: "我的 eSIM 訂單",
      icon: "qr_code_2",
      onClick: () => onTabChange?.("orders"),
    },
    {
      id: "traffic",
      label: "查詢流量",
      icon: "speed",
      onClick: () => onTabChange?.("traffic"),
    },
    { divider: true },
    {
      id: "contact",
      label: "聯絡客服",
      icon: "mail",
      onClick: () => {
        window.location.href = "/contact";
      },
    },
  ];

  return (
    <AccountPageWrap>
      {/* 標題列 — 比照圖一訂單頁 */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="text-xl sm:text-[24px] font-bold tracking-tight"
              style={{ color: UI.dark }}
            >
              安裝與支援
            </h1>
            <AccountBadge tone="success">即時</AccountBadge>
            {completedCount > 0 ? (
              <AccountBadge tone="info">{completedCount} 張可安裝</AccountBadge>
            ) : null}
          </div>
          <p className="text-xs sm:text-sm mt-1.5" style={{ color: UI.mid }}>
            {greeting()}，{firstName} — 一起確認您的 eSIM 使用狀況
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <SecondaryBtn onClick={() => onTabChange?.("orders")}>
            <AccountIcon name="qr_code_2" size={16} />
            我的訂單
          </SecondaryBtn>
          <PrimaryBtn onClick={onGuideClick}>
            <AccountIcon name="menu_book" size={16} />
            開啟適合我的教學
          </PrimaryBtn>
          <ShopifyDropdown variant="account" label="更多操作" items={moreMenu} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] gap-4 xl:gap-5">
        {/* 左欄 */}
        <div className="space-y-4 min-w-0">
          <div className="flex flex-wrap gap-3">
            <MetricTile
              icon="sim_card"
              label="有效 eSIM"
              value={completedCount}
              variant="green"
            />
            <MetricTile
              icon="pending_actions"
              label="待處理"
              value={pendingCount + refundPending}
              sub={
                pendingCount || refundPending
                  ? `待付 ${pendingCount} · 退款 ${refundPending}`
                  : "目前無待辦"
              }
              variant="yellow"
            />
            <MetricTile
              icon="menu_book"
              label="教學文件"
              value="4"
              sub="iOS / Android / FAQ / 政策"
              variant="sky"
            />
          </div>

          {/* 可安裝狀態 — Fulfillment 風 */}
          <Card>
            <div
              className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2"
              style={{ borderBottom: `1px solid ${UI.border}` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: completedCount
                      ? SHOPIFY_BADGE.success.dot
                      : UI.soft,
                  }}
                />
                <h3 className="text-sm font-bold" style={{ color: UI.dark }}>
                  eSIM 安裝狀態
                </h3>
              </div>
              <AccountBadge tone={completedCount ? "success" : "neutral"}>
                {completedCount ? `${completedCount} 張可使用` : "尚無 eSIM"}
              </AccountBadge>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-sm" style={{ color: UI.mid }}>
                {completedCount
                  ? "掃描訂單內的 QR Code 即可安裝。不確定裝置？點下方按鈕開啟對應教學。"
                  : "完成購買並發貨後，QR Code 會出現在訂單明細。"}
              </p>
              <div
                className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4"
                style={{ borderTop: `1px solid ${UI.border}` }}
              >
                <SecondaryBtn onClick={() => onTabChange?.("traffic")}>
                  <AccountIcon name="speed" size={16} />
                  查詢流量
                </SecondaryBtn>
                <PrimaryBtn onClick={onGuideClick}>開啟適合我的教學</PrimaryBtn>
              </div>
            </div>
          </Card>

          {/* 建議事項 */}
          <Card>
            <div
              className="px-4 sm:px-5 py-3.5"
              style={{ borderBottom: `1px solid ${UI.border}` }}
            >
              <h3 className="text-sm font-bold" style={{ color: UI.dark }}>
                建議事項
              </h3>
            </div>
            {todos.length === 0 ? (
              <div
                className="px-4 py-10 text-center text-sm"
                style={{ color: UI.soft }}
              >
                <AccountIcon
                  name="task_alt"
                  size={36}
                  className="mx-auto mb-2 opacity-40"
                />
                <p>目前沒有待辦事項</p>
              </div>
            ) : (
              <ul>
                {todos.map((t) => (
                  <li
                    key={t.label}
                    style={{ borderTop: `1px solid ${UI.border}` }}
                  >
                    <button
                      type="button"
                      onClick={t.action}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#fafafa] group"
                    >
                      <div
                        className="w-9 h-9 flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: t.iconBg,
                          borderRadius: UI.radiusSm,
                        }}
                      >
                        <AccountIcon
                          name={t.icon}
                          size={18}
                          className="text-white"
                        />
                      </div>
                      <span
                        className="flex-1 text-sm font-medium"
                        style={{ color: UI.dark }}
                      >
                        {t.label}
                      </span>
                      <AccountIcon
                        name="chevron_right"
                        size={20}
                        style={{ color: UI.soft }}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 教學文件網格 */}
          <Card>
            <div
              className="px-4 sm:px-5 py-3.5 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${UI.border}` }}
            >
              <h3 className="text-sm font-bold" style={{ color: UI.dark }}>
                安裝教學
              </h3>
              <SecondaryBtn onClick={onGuideClick}>依裝置開啟</SecondaryBtn>
            </div>
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guides.map((g) => (
                <Link
                  key={g.href}
                  href={g.href}
                  className="flex items-start gap-3 p-3 transition hover:bg-[#fafafa]"
                  style={{
                    border: `1px solid ${UI.border}`,
                    borderRadius: UI.radius,
                  }}
                >
                  <div
                    className="w-9 h-9 flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: g.iconBg,
                      borderRadius: UI.radiusSm,
                    }}
                  >
                    <AccountIcon
                      name={g.icon}
                      size={18}
                      className="text-white"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: UI.dark }}>
                      {g.title}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 leading-snug"
                      style={{ color: UI.soft }}
                    >
                      {g.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* iOS PWA 提示 */}
          {iosHintOpen ? (
            <Card
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{
                backgroundColor: "#fffbeb",
                borderColor: SHOPIFY_BADGE.warning.bg,
              }}
            >
              <div className="flex gap-3 min-w-0">
                <div
                  className="w-9 h-9 flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: SHOPIFY_BADGE.warning.dot,
                    borderRadius: UI.radiusSm,
                  }}
                >
                  <AccountIcon name="info" size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-bold"
                    style={{ color: SHOPIFY_BADGE.warning.text }}
                  >
                    iPhone 推播需先安裝 PWA
                  </p>
                  <p
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: "#78350f" }}
                  >
                    {getIosAddToHomeHint()}，才能接收流量偏低推播。
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <SecondaryBtn onClick={() => onTabChange?.("traffic")}>
                  了解更多
                </SecondaryBtn>
                <button
                  type="button"
                  onClick={() => setIosHintOpen(false)}
                  className="h-8 px-3 text-[13px] font-semibold transition"
                  style={{ color: UI.mid, borderRadius: UI.radiusSm }}
                >
                  關閉
                </button>
              </div>
            </Card>
          ) : null}
        </div>

        {/* 右欄 */}
        <aside className="space-y-4 min-w-0">
          <NavyPanel title="智能裝置偵測" icon="devices">
            <p className="text-sm leading-relaxed" style={{ color: UI.mid }}>
              依您目前使用的裝置，自動開啟對應的 eSIM 安裝圖文教學。
            </p>
            <div className="mt-4">
              <PrimaryBtn onClick={onGuideClick} className="w-full">
                開啟適合我的教學
              </PrimaryBtn>
            </div>
          </NavyPanel>

          <NavyPanel title="快速連結" icon="link">
            <ul className="space-y-0.5 text-sm">
              {[
                {
                  label: "iOS 安裝教學",
                  href: "/operation-ios",
                  icon: "phone_iphone",
                },
                {
                  label: "Android 教學",
                  href: "/operation-android",
                  icon: "android",
                },
                { label: "FAQ 常見問題", href: "/faq", icon: "help_center" },
                { label: "退換貨政策", href: "/refund-policy", icon: "policy" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-center gap-2.5 p-2 rounded-md transition hover:bg-[#f6f6f7] font-medium"
                    style={{ color: UI.dark }}
                  >
                    <AccountIcon
                      name={l.icon}
                      size={18}
                      style={{ color: UI.mid }}
                    />
                    <span className="flex-1">{l.label}</span>
                    <AccountIcon
                      name="chevron_right"
                      size={16}
                      style={{ color: UI.soft }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </NavyPanel>

          <NavyPanel title="客服摘要" icon="support_agent">
            <dl className="text-sm">
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 items-start py-1">
                <dt className="pt-0.5" style={{ color: UI.soft }}>
                  回覆時間
                </dt>
                <dd>
                  <p
                    className="font-bold text-base leading-snug"
                    style={{ color: UI.dark }}
                  >
                    早上 09:00 – 晚上 12:00
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: UI.soft }}>
                    人工客服時段
                  </p>
                </dd>
              </div>
              <div
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 items-start py-2"
                style={{ borderTop: `1px solid ${UI.border}` }}
              >
                <dt className="pt-0.5" style={{ color: UI.soft }}>
                  其他時段
                </dt>
                <dd>
                  <p className="font-medium" style={{ color: UI.dark }}>
                    智慧客服自動回覆
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: UI.soft }}>
                    全天候 24 小時
                  </p>
                </dd>
              </div>
              <div
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 items-baseline py-2"
                style={{ borderTop: `1px solid ${UI.border}` }}
              >
                <dt style={{ color: UI.soft }}>管道</dt>
                <dd className="font-medium" style={{ color: UI.dark }}>
                  LINE 官方 · Email
                </dd>
              </div>
            </dl>
            <div className="mt-3 space-y-2">
              <a
                href={CONTACT_INFO.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 h-8 px-3.5 text-[13px] font-semibold text-white transition"
                style={{
                  backgroundColor: "#06C755",
                  borderRadius: "0.5rem",
                }}
              >
                <AccountIcon name="chat" size={16} />
                LINE 官方客服
              </a>
              <SecondaryBtn href="/contact" className="w-full">
                <AccountIcon name="mail" size={16} />
                Email 聯絡客服
              </SecondaryBtn>
            </div>
          </NavyPanel>

          <NavyPanel title="最近動態" icon="history">
            <ul className="space-y-0">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="flex gap-2.5 py-2.5"
                  style={{ borderTop: `1px solid ${UI.border}` }}
                >
                  <AccountIcon
                    name="event"
                    size={16}
                    className="shrink-0 mt-0.5"
                    style={{ color: UI.soft }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-medium leading-snug"
                      style={{ color: UI.dark }}
                    >
                      {a.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {a.tone && a.id !== "guide" ? (
                        <AccountBadge tone={a.tone}>
                          {STATUS_LABEL[
                            orders.find((o) => o.id === a.id)?.status
                          ] || "動態"}
                        </AccountBadge>
                      ) : null}
                      <span className="text-[10px]" style={{ color: UI.soft }}>
                        {formatShort(a.at)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </NavyPanel>
        </aside>
      </div>
    </AccountPageWrap>
  );
}
