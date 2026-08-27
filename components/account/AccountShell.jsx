"use client";

import { useState } from "react";
import Link from "next/link";
import AccountIcon from "@/components/account/AccountIcon";
import AccountMemberSearch from "@/components/account/AccountMemberSearch";
import AccountAnnouncementBar from "@/components/account/AccountAnnouncementBar";
import {
  ACCOUNT_UI,
  ACCOUNT_THEME,
  ACCOUNT_BADGE,
  SHOPIFY_UI,
  SHOPIFY_BADGE,
} from "@/lib/accountUi";
import { formatMemberEmailDisplay } from "@/lib/lineAuth";
import { ShopifyDropdown } from "@/components/partner/ShopifyControls";
import Image from "next/image";

/** 相容舊程式：色票改為 Shopify 灰階；特殊色留給徽章／圖示 */
export const ACCENT = {
  sidebar: SHOPIFY_UI.chromeBg,
  sidebarHover: "#2d2d2d",
  sidebarActive: SHOPIFY_UI.sidebarActiveBg,
  primary: SHOPIFY_UI.primaryBtnBg,
  primaryDark: SHOPIFY_UI.chromeBg,
  content: ACCOUNT_THEME.wash,
  navy: SHOPIFY_UI.chromeBg,
  yellow: "#eec200",
  border: ACCOUNT_THEME.border,
};

export function getMemberRoleLabel(userRole, partnerData) {
  if (userRole === "admin") return "系統管理員";
  if (userRole === "partner") {
    return partnerData?.cooperation_model === "referral"
      ? "認證分潤連結"
      : "認證商店";
  }
  return "一般用戶";
}

const breadcrumbMap = {
  dashboard: ["帳戶中心", "首頁總覽"],
  orders: ["帳戶中心", "我的 eSIM 訂單"],
  traffic: ["帳戶中心", "查詢流量"],
  follows: ["帳戶中心", "追蹤創作者"],
  settings: ["帳戶中心", "帳號設定"],
  support: ["帳戶中心", "安裝與支援"],
  admin_dashboard: ["帳戶中心", "系統總控"],
  partner_dashboard: ["帳戶中心", "店鋪管理"],
};

/** Shopify 風會員殼：黑頂欄／白側欄／淺灰畫布 */
export default function AccountShell({
  title = "帳戶中心",
  user,
  userRole,
  partnerData = null,
  activeTab,
  onTabChange,
  navItems,
  onLogout,
  orderBadge = 0,
  orders = [],
  children,
  /** 夥伴商店：回賣場／品牌文案 */
  homeHref = "/",
  brandLabel = "Jeko",
  shopCtaLabel = "返回商城",
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const roleLabel = getMemberRoleLabel(userRole, partnerData);
  const crumbs = breadcrumbMap[activeTab] || ["帳戶中心", title];
  const initials = (user?.name || "U").trim().slice(0, 1).toUpperCase();

  const renderNavItem = (item) => {
    const active = activeTab === item.id && !item.external && !item.href;
    const badge =
      item.id === "orders" && orderBadge > 0 ? orderBadge : item.badge;
    const linkHref = item.href || item.external;

    if (linkHref) {
      const isExternal = Boolean(item.external) && !item.href;
      return (
        <Link
          key={item.id}
          href={linkHref}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition hover:bg-[#f1f1f1]"
          style={{ color: SHOPIFY_UI.sidebarTextMuted }}
        >
          <AccountIcon name={item.icon} size={18} />
          <span className="flex-1 truncate">{item.label}</span>
          {isExternal && (
            <AccountIcon name="open_in_new" size={14} className="opacity-50" />
          )}
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onTabChange(item.id);
          setMobileOpen(false);
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition"
        style={{
          backgroundColor: active ? SHOPIFY_UI.sidebarActiveBg : "transparent",
          color: active ? SHOPIFY_UI.sidebarText : SHOPIFY_UI.sidebarTextMuted,
          fontWeight: active ? 700 : 500,
        }}
      >
        <AccountIcon name={item.icon} size={18} />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {badge > 0 && (
          <span
            className="min-w-[18px] h-[18px] px-1 text-white text-[10px] font-black flex items-center justify-center"
            style={{
              backgroundColor: "#1E4AD1",
              borderRadius: ACCOUNT_UI.radiusSm,
            }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
    );
  };

  const sidebar = (
    <>
      <div
        className="px-3 py-3"
        style={{ borderBottom: `1px solid ${SHOPIFY_UI.sidebarBorder}` }}
      >
        <div className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-md">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
            />
          ) : (
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-black shrink-0"
              style={{ backgroundColor: SHOPIFY_UI.accentBg }}
            >
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-bold truncate"
              style={{ color: SHOPIFY_UI.sidebarText }}
            >
              {user?.name || "會員"}
            </p>
            <p
              className="text-[10px] truncate"
              style={{ color: SHOPIFY_UI.sidebarTextMuted }}
            >
              {roleLabel}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map(renderNavItem)}
      </nav>

      <div
        className="p-3"
        style={{ borderTop: `1px solid ${SHOPIFY_UI.sidebarBorder}` }}
      >
        <Link
          href={homeHref || "/"}
          className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-white transition"
          style={{
            backgroundColor: SHOPIFY_UI.primaryBtnBg,
            borderRadius: ACCOUNT_UI.radiusSm,
          }}
        >
          <AccountIcon name="storefront" size={18} />
          {shopCtaLabel || "返回商城"}
        </Link>
      </div>
    </>
  );

  return (
    <div
      className={`min-h-[100dvh] flex flex-col font-sans ${ACCOUNT_UI.pagePt}`}
      style={{ backgroundColor: ACCOUNT_THEME.wash }}
    >
      <AccountAnnouncementBar />

      {/* 頂欄：對齊夥伴後台淺色 chrome，內容寬度限制 */}
      <header
        className="min-h-14 shrink-0 z-20 relative pt-[env(safe-area-inset-top)] border-b"
        style={{
          backgroundColor: SHOPIFY_UI.chromeBg,
          borderColor: SHOPIFY_UI.chromeBorder,
        }}
      >
        <div
          className={`h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 ${ACCOUNT_UI.contentMax}`}
        >
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100"
          onClick={() => setMobileOpen(true)}
          aria-label="開啟選單"
        >
          <AccountIcon name="menu" size={20} />
        </button>

        <Link
          href={homeHref || "/"}
          className="flex items-center gap-2 shrink-0"
          aria-label="Jeko 首頁"
        >
          <span className="inline-flex h-8 items-center rounded-md px-0.5 py-1">
            <Image
              src="/images/Logo/logo-no-bg.png"
              alt="Jeko"
              width={72}
              height={28}
              className="h-6 w-auto object-contain"
              priority
            />
          </span>
          <span
            className="font-black text-sm tracking-tight hidden lg:inline"
            style={{ color: SHOPIFY_UI.textPrimary }}
          >
            {brandLabel || "Jeko"}
          </span>
        </Link>

        <div className="flex-1 min-w-0 max-w-sm mx-2 sm:mx-auto">
          <AccountMemberSearch
            navItems={navItems}
            orders={orders}
            onTabChange={(id) => {
              onTabChange(id);
              setMobileOpen(false);
            }}
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
          <Link
            href="/contact"
            title="聯絡客服"
            className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          >
            <AccountIcon name="mail_outline" size={18} />
          </Link>
          <Link
            href="/faq"
            title="使用指南"
            className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          >
            <AccountIcon name="help_outline" size={18} />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-1 pl-0.5 pr-1.5 sm:pr-2 h-9 rounded-lg hover:bg-slate-100 transition"
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
                  style={{ backgroundColor: SHOPIFY_UI.accentBg }}
                >
                  {initials}
                </span>
              )}
              <span
                className="text-xs font-bold hidden md:inline max-w-[100px] truncate"
                style={{ color: SHOPIFY_UI.textPrimary }}
              >
                {user?.name || "會員"}
              </span>
              <AccountIcon
                name="expand_more"
                size={16}
                className="text-slate-400 hidden md:inline"
              />
            </button>

            {userMenuOpen && (
              <>
                <button
                  type="button"
                  className={`fixed inset-0 ${ACCOUNT_UI.dropdown}`}
                  aria-label="關閉"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  className={`absolute right-0 top-full mt-2 w-56 bg-white border overflow-hidden py-1.5 ${ACCOUNT_UI.dropdown}`}
                  style={{
                    borderColor: SHOPIFY_UI.cardBorder,
                    borderRadius: "0.75rem",
                    boxShadow:
                      "0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  <div
                    className="px-3 py-2"
                    style={{ borderBottom: `1px solid ${SHOPIFY_UI.divider}` }}
                  >
                    <p
                      className="text-sm font-bold truncate"
                      style={{ color: ACCOUNT_THEME.dark }}
                    >
                      {user?.name}
                    </p>
                    <p
                      className="text-[11px] truncate"
                      style={{ color: ACCOUNT_THEME.soft }}
                    >
                      {formatMemberEmailDisplay(user?.email)}
                    </p>
                    <p
                      className="text-[10px] font-bold mt-0.5"
                      style={{ color: ACCOUNT_THEME.mid }}
                    >
                      {roleLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange("settings");
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-[#f1f1f1]"
                    style={{ color: ACCOUNT_THEME.dark }}
                  >
                    <AccountIcon name="manage_accounts" size={16} />
                    帳號設定
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ok =
                        typeof window !== "undefined" &&
                        window.confirm("確定要登出嗎？");
                      if (!ok) return;
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-semibold flex items-center gap-2 text-red-600 hover:bg-red-50"
                  >
                    <AccountIcon name="logout" size={16} color="#DC2626" />
                    登出
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className={`fixed inset-0 bg-black/45 md:hidden ${ACCOUNT_UI.dropdown}`}
          aria-label="關閉選單"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* 桌面側欄 */}
        <aside
          className="w-[232px] flex-col shrink-0 hidden md:flex"
          style={{
            backgroundColor: SHOPIFY_UI.sidebarBg,
            borderRight: `1px solid ${SHOPIFY_UI.sidebarBorder}`,
          }}
        >
          {sidebar}
        </aside>

        {/* 手機抽屜側欄 */}
        <aside
          className={`fixed md:hidden ${ACCOUNT_UI.stickyTop} left-0 ${ACCOUNT_UI.dropdown} ${ACCOUNT_UI.sidebarH} w-[232px] flex flex-col transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            backgroundColor: SHOPIFY_UI.sidebarBg,
            borderRight: `1px solid ${SHOPIFY_UI.sidebarBorder}`,
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          {sidebar}
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col min-h-0 pb-20 md:pb-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="px-4 sm:px-6 pt-4 pb-2">
              <nav
                className="hidden sm:flex items-center gap-1.5 text-xs mb-1"
                style={{ color: ACCOUNT_THEME.soft }}
              >
                {crumbs.map((c, i) => (
                  <span key={c} className="flex items-center gap-1.5 shrink-0">
                    {i > 0 && <AccountIcon name="chevron_right" size={14} />}
                    <span
                      className={
                        i === crumbs.length - 1 ? "font-bold truncate" : "truncate"
                      }
                      style={{
                        color:
                          i === crumbs.length - 1
                            ? ACCOUNT_THEME.dark
                            : ACCOUNT_THEME.soft,
                      }}
                    >
                      {c}
                    </span>
                  </span>
                ))}
              </nav>
            </div>
            <div className={`${ACCOUNT_UI.contentMax} px-4 sm:px-6 pb-8 w-full`}>
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* 手機底欄 */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 backdrop-blur-md"
        style={{
          borderTop: `1px solid ${SHOPIFY_UI.sidebarBorder}`,
          backgroundColor: "rgba(255,255,255,0.97)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-stretch justify-around gap-0.5 px-1 pt-1 overflow-x-auto">
          {navItems
            .filter((item) => !item.href && !item.external)
            .slice(0, 5)
            .map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[56px] rounded-lg text-[10px] transition"
                  style={{
                    color: active
                      ? SHOPIFY_UI.textPrimary
                      : SHOPIFY_UI.textTertiary,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <span
                    className="flex items-center justify-center w-9 h-8 rounded-lg"
                    style={{
                      backgroundColor: active
                        ? SHOPIFY_UI.sidebarActiveBg
                        : "transparent",
                    }}
                  >
                    <AccountIcon name={item.icon} size={22} />
                  </span>
                  {item.label.length > 6
                    ? item.label.slice(0, 4)
                    : item.label}
                </button>
              );
            })}
        </div>
      </nav>
    </div>
  );
}

/** Jeko 藍／黃狀態徽章（對齊膠囊按鈕色系） */
export function AccountBadge({ tone = "neutral", children }) {
  const t = ACCOUNT_BADGE[tone] || ACCOUNT_BADGE.neutral;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
      style={{
        backgroundColor: t.bg,
        color: t.text,
        borderRadius: ACCOUNT_UI.radiusBadge,
        border: `1px solid ${t.border || "transparent"}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: t.dot }}
      />
      {children}
    </span>
  );
}

/** 會員資料頭 — 比照圖一訂單頁標題列（標題 + 徽章 + 操作鈕） */
export function MemberProfileHeader({
  user,
  userRole,
  partnerData = null,
  stats = {},
  onEdit,
  joinDate,
  actions,
}) {
  const roleLabel = getMemberRoleLabel(userRole, partnerData);

  return (
    <div className="mb-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="text-xl sm:text-2xl font-black tracking-tight"
              style={{ color: ACCOUNT_THEME.dark }}
            >
              {user?.name || "會員"}
            </h1>
            <AccountBadge tone="success">使用中</AccountBadge>
            <AccountBadge tone={userRole === "admin" ? "info" : "neutral"}>
              {roleLabel}
            </AccountBadge>
            {stats.pendingCount > 0 ? (
              <AccountBadge tone="warning">
                {stats.pendingCount} 待處理
              </AccountBadge>
            ) : null}
          </div>
          <p
            className="text-xs sm:text-sm mt-1.5"
            style={{ color: ACCOUNT_THEME.mid }}
          >
            {formatMemberEmailDisplay(user?.email)}
            {joinDate && joinDate !== "—" ? ` · 加入 ${joinDate}` : ""}
            {stats.activeEsims != null
              ? ` · ${stats.activeEsims} 張有效 eSIM`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-semibold transition"
              style={{
                backgroundColor: "#fafafa",
                color: "#303030",
                border: "1px solid #8a8a8a",
                borderRadius: "0.5rem",
              }}
            >
              <AccountIcon name="edit" size={16} />
              編輯資料
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function InnerTabs({ tabs, active, onChange }) {
  return (
    <div
      className="flex gap-0.5 overflow-x-auto mb-5"
      style={{ borderBottom: `1px solid ${ACCOUNT_THEME.border}` }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className="relative px-3.5 py-2.5 text-sm whitespace-nowrap transition shrink-0"
            style={{
              color: isActive ? ACCOUNT_THEME.dark : ACCOUNT_THEME.soft,
              fontWeight: isActive ? 700 : 500,
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {tab.count != null ? (
                <span
                  className="tabular-nums text-[11px] font-bold px-1.5 py-0.5"
                  style={{
                    backgroundColor: isActive
                      ? ACCOUNT_THEME.light
                      : ACCOUNT_THEME.wash,
                    color: isActive ? ACCOUNT_THEME.dark : ACCOUNT_THEME.soft,
                    borderRadius: ACCOUNT_UI.radiusSm,
                  }}
                >
                  {tab.count}
                </span>
              ) : null}
            </span>
            {isActive ? (
              <span
                className="absolute left-2 right-2 -bottom-px h-[2.5px]"
                style={{
                  backgroundColor: ACCOUNT_THEME.dark,
                  borderRadius: "999px",
                }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function FilterBar({ children, actions }) {
  return (
    <div
      className="px-4 sm:px-5 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      style={{
        border: `1px solid ${ACCOUNT_THEME.border}`,
        borderBottom: 0,
        borderRadius: `${ACCOUNT_UI.radius} ${ACCOUNT_UI.radius} 0 0`,
      }}
    >
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 白卡面板 — 圖一小圓角卡片 */
export function NavyPanel({ title, icon, action, children, className = "" }) {
  return (
    <div
      className={`bg-white overflow-hidden ${className}`}
      style={{
        border: `1px solid ${ACCOUNT_THEME.border}`,
        borderRadius: ACCOUNT_UI.radius,
      }}
    >
      {(title || action) && (
        <div
          className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2"
          style={{
            borderBottom: `1px solid ${ACCOUNT_THEME.border}`,
            backgroundColor: ACCOUNT_THEME.white,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <AccountIcon
                name={icon}
                size={18}
                style={{ color: ACCOUNT_THEME.mid }}
              />
            )}
            {title && (
              <h3
                className="text-sm font-black truncate"
                style={{ color: ACCOUNT_THEME.dark }}
              >
                {title}
              </h3>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function StatusBanner({ status = "good", title, message }) {
  const isGood = status === "good";
  return (
    <div
      className="overflow-hidden flex items-stretch min-h-[80px] mb-5"
      style={{
        backgroundColor: isGood ? ACCOUNT_THEME.dark : "#8a5a00",
        borderRadius: ACCOUNT_UI.radius,
      }}
    >
      <div className="w-16 sm:w-20 flex items-center justify-center bg-black/10 shrink-0">
        <AccountIcon
          name={isGood ? "verified" : "warning"}
          size={32}
          className="text-white/90"
        />
      </div>
      <div className="flex-1 flex flex-col justify-center px-4 py-3 text-white">
        <p className="text-lg sm:text-xl font-black">{title}</p>
        {message && (
          <p className="text-xs sm:text-sm text-white/80 mt-0.5">{message}</p>
        )}
      </div>
    </div>
  );
}

export function MetricTile({
  icon,
  label,
  value,
  sub,
  variant = "navy",
  accent,
  trend,
  iconBg: iconBgProp,
}) {
  const v = accent || variant;
  const iconBg =
    iconBgProp ||
    (v === "green"
      ? "#008060"
      : v === "sky" || v === "blue"
        ? "#2c6ecb"
        : v === "yellow"
          ? "#eec200"
          : "#5c5c5c");

  return (
    <div
      className="bg-white px-4 py-3.5 flex-1 min-w-[140px]"
      style={{
        border: `1px solid ${ACCOUNT_THEME.border}`,
        borderRadius: ACCOUNT_UI.radius,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: ACCOUNT_THEME.soft }}
        >
          {label}
        </p>
        {icon ? (
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0"
            style={{
              backgroundColor: iconBg,
              borderRadius: ACCOUNT_UI.radiusSm,
            }}
          >
            <AccountIcon name={icon} size={16} className="text-white" />
          </div>
        ) : null}
      </div>
      <p
        className="text-xl sm:text-2xl font-black mt-2 tabular-nums leading-tight"
        style={{ color: ACCOUNT_THEME.dark }}
      >
        {value}
      </p>
      {sub ? (
        <p className="text-[11px] mt-1" style={{ color: ACCOUNT_THEME.soft }}>
          {sub}
        </p>
      ) : null}
      {trend != null ? (
        <p
          className="text-[10px] font-bold mt-1"
          style={{
            color:
              trend > 0
                ? SHOPIFY_BADGE.success.dot
                : SHOPIFY_BADGE.critical.dot,
          }}
        >
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
        </p>
      ) : null}
    </div>
  );
}

export function HrTableShell({ title, filters, actions, children }) {
  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        border: `1px solid ${ACCOUNT_THEME.border}`,
        borderRadius: ACCOUNT_UI.radius,
      }}
    >
      <div
        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ borderBottom: `1px solid ${ACCOUNT_THEME.border}` }}
      >
        <h2
          className="text-base font-black"
          style={{ color: ACCOUNT_THEME.dark }}
        >
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {filters && (
        <div
          className="px-5 py-3 flex flex-wrap gap-2"
          style={{
            backgroundColor: ACCOUNT_THEME.light,
            borderBottom: `1px solid ${ACCOUNT_THEME.border}`,
          }}
        >
          {filters}
        </div>
      )}
      <div className="p-0">{children}</div>
    </div>
  );
}

export function QuickActionCard({ icon, title, desc, onClick, href }) {
  const cls =
    "block text-left p-4 bg-white transition group h-full hover:bg-[#fafafa]";
  const style = {
    border: `1px solid ${ACCOUNT_THEME.border}`,
    borderRadius: ACCOUNT_UI.radius,
  };
  const inner = (
    <>
      <div
        className="w-10 h-10 flex items-center justify-center mb-3"
        style={{
          backgroundColor: ACCOUNT_THEME.light,
          borderRadius: ACCOUNT_UI.radiusSm,
        }}
      >
        <AccountIcon
          name={icon}
          size={22}
          style={{ color: ACCOUNT_THEME.dark }}
        />
      </div>
      <p
        className="font-black text-sm"
        style={{ color: ACCOUNT_THEME.dark }}
      >
        {title}
      </p>
      <p
        className="text-xs mt-1 leading-relaxed"
        style={{ color: ACCOUNT_THEME.soft }}
      >
        {desc}
      </p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${cls} w-full`} style={style}>
      {inner}
    </button>
  );
}

export function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-bold transition"
      style={{
        backgroundColor: active ? ACCOUNT_THEME.dark : ACCOUNT_THEME.white,
        color: active ? "#fff" : ACCOUNT_THEME.mid,
        border: `1px solid ${active ? ACCOUNT_THEME.dark : ACCOUNT_THEME.border}`,
        borderRadius: ACCOUNT_UI.radiusSm,
      }}
    >
      {children}
    </button>
  );
}

export const AccountCard = NavyPanel;

export function AccountPageWrap({ children, className = "" }) {
  return <div className={`w-full min-w-0 ${className}`}>{children}</div>;
}

export { ShopifyDropdown };
