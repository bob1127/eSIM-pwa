"use client";

import { useState } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import { ACCOUNT_UI } from "@/lib/accountUi";
import { formatMemberEmailDisplay } from "@/lib/lineAuth";

/** 對齊 /cooperation 品牌色票 */
export const ACCENT = {
  sidebar: "#1E4AD1",
  sidebarHover: "#2550D6",
  sidebarActive: "#ffffff",
  primary: "#0071EB",
  primaryDark: "#1E4AD1",
  content: "#F7F9FB",
  navy: "#1E4AD1",
  yellow: "#FADE2B",
  border: "#e2e8f0",
};

/** 依合作模式顯示認證標籤 */
export function getMemberRoleLabel(userRole, partnerData) {
  if (userRole === "admin") return "系統管理員";
  if (userRole === "partner") {
    return partnerData?.cooperation_model === "referral"
      ? "認證分潤連結"
      : "認證商店";
  }
  return "一般會員";
}

const breadcrumbMap = {
  dashboard: ["會員中心", "首頁總覽"],
  orders: ["會員中心", "我的 eSIM 訂單"],
  traffic: ["會員中心", "查詢流量"],
  settings: ["會員中心", "帳號設定"],
  support: ["會員中心", "安裝與支援"],
  admin_dashboard: ["會員中心", "系統總控"],
  partner_dashboard: ["會員中心", "店鋪管理"],
};

/** 對齊 /cooperation：深藍側欄 + 淺灰內容區 */
export default function AccountShell({
  title = "會員中心",
  user,
  userRole,
  partnerData = null,
  activeTab,
  onTabChange,
  navItems,
  onLogout,
  orderBadge = 0,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const roleLabel = getMemberRoleLabel(userRole, partnerData);

  const crumbs = breadcrumbMap[activeTab] || ["會員中心", title];

  return (
    <div
      className={`min-h-screen flex flex-col font-sans ${ACCOUNT_UI.pagePt}`}
      style={{ backgroundColor: ACCENT.content }}
    >
      {mobileOpen && (
        <button
          type="button"
          className={`fixed inset-0 bg-black/45 lg:hidden ${ACCOUNT_UI.dropdown}`}
          aria-label="關閉選單"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)] flex-1 min-h-0 w-full max-w-none">
      {/* 深藍側欄 — 圖 1~3 HR Spanner */}
      <aside
        className={`fixed lg:relative ${ACCOUNT_UI.stickyTop} left-0 ${ACCOUNT_UI.dropdown} lg:z-auto ${ACCOUNT_UI.sidebarH} lg:h-auto lg:min-h-screen w-[232px] flex flex-col shrink-0 transition-transform duration-200 shadow-lg lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ backgroundColor: ACCENT.sidebar }}
      >
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-sm bg-white/15 flex items-center justify-center">
              <MaterialIcon name="sim_card" size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight">JEKO 會員</p>
              <div className="mt-1 h-[3px] w-10 rounded-full bg-[#FADE2B]" />
              <p className="text-[10px] text-blue-100/70 mt-1">Member Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
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
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-blue-100 hover:bg-white/10 transition"
                >
                  <MaterialIcon name={item.icon} size={20} className="opacity-90" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isExternal && (
                    <MaterialIcon name="open_in_new" size={14} className="opacity-60" />
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
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition relative group ${
                  active
                    ? "bg-white text-[#1E4AD1] shadow-sm font-bold"
                    : "text-blue-50 hover:bg-white/10"
                }`}
              >
                {active && (
                  <>
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#FADE2B]" />
                    <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-transparent border-l-white hidden lg:block" />
                  </>
                )}
                <MaterialIcon
                  name={item.icon}
                  size={20}
                  className={active ? "text-[#1E4AD1]" : "text-blue-100"}
                />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#ef4444] text-white text-[10px] font-black flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-bold text-[#111] bg-[#FADE2B] hover:brightness-95 transition shadow-sm"
          >
            <MaterialIcon name="storefront" size={18} />
            返回商城
          </Link>
        </div>
      </aside>

      {/* 主內容 — minmax(0,1fr) 撐滿右側 */}
      <div className="min-w-0 w-full flex flex-col lg:col-start-2">
        {/* 頂部工具列 — HR Spanner 白底 header */}
        <header className={`bg-white border-b border-slate-200 shrink-0 sticky ${ACCOUNT_UI.stickyTop} ${ACCOUNT_UI.shellSticky}`}>
          <div className={`${ACCOUNT_UI.contentMax} px-4 sm:px-6 py-3 flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="lg:hidden p-1.5 rounded hover:bg-slate-100 text-slate-600"
                onClick={() => setMobileOpen(true)}
                aria-label="開啟選單"
              >
                <MaterialIcon name="menu" size={22} />
              </button>
              <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                {crumbs.map((c, i) => (
                  <span key={c} className="flex items-center gap-1.5 shrink-0">
                    {i > 0 && <MaterialIcon name="chevron_right" size={14} />}
                    <span
                      className={
                        i === crumbs.length - 1
                          ? "text-[#1E4AD1] font-bold truncate"
                          : "truncate"
                      }
                    >
                      {c}
                    </span>
                  </span>
                ))}
              </nav>
              <h1 className="sm:hidden text-base font-black text-[#1E4AD1] truncate">
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <Link
                href="/contact"
                className="hidden md:flex items-center gap-1 text-xs text-slate-500 hover:text-[#0071EB] font-medium"
              >
                <MaterialIcon name="mail_outline" size={16} />
                聯絡客服
              </Link>
              <Link
                href="/faq"
                className="hidden md:flex items-center gap-1 text-xs text-slate-500 hover:text-[#0071EB] font-medium"
              >
                <MaterialIcon name="help_outline" size={16} />
                使用指南
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-sm hover:bg-slate-50 border border-transparent hover:border-slate-200 transition"
                >
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: ACCENT.sidebar }}
                    >
                      {user?.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-bold text-slate-700 max-w-[100px] truncate">
                    {user?.name || "會員"}
                  </span>
                  <MaterialIcon name="expand_more" size={18} className="text-slate-400" />
                </button>
                {userMenuOpen && (
                  <>
                    <button
                      type="button"
                      className={`fixed inset-0 ${ACCOUNT_UI.dropdown}`}
                      aria-label="關閉"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className={`absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-sm shadow-xl ${ACCOUNT_UI.dropdown} py-1 text-sm`}>
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="font-bold text-slate-800 truncate">{user?.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {formatMemberEmailDisplay(user?.email)}
                        </p>
                        <p className="text-[10px] text-[#0071EB] font-bold mt-0.5">
                          {roleLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onTabChange("settings");
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <MaterialIcon name="manage_accounts" size={18} />
                        帳號設定
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onLogout();
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        <MaterialIcon name="logout" size={18} />
                        登出
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:px-8 lg:py-6 overflow-x-hidden">
          <div className={ACCOUNT_UI.contentMax}>
            <div className="hidden sm:block mb-4">
              <h1 className="text-xl font-black text-[#1E4AD1]">{title}</h1>
            </div>
            <div className="w-full">{children}</div>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}

/** Josys 風 — 會員個人資料頭部（圖 4、5） */
export function MemberProfileHeader({
  user,
  userRole,
  partnerData = null,
  stats = {},
  onEdit,
  joinDate,
}) {
  const roleLabel = getMemberRoleLabel(userRole, partnerData);

  const fields = [
    { label: "會員 Email", value: formatMemberEmailDisplay(user?.email) },
    { label: "會員等級", value: roleLabel },
    { label: "有效 eSIM", value: `${stats.activeEsims ?? 0} 張` },
    { label: "加入日期", value: joinDate || "—" },
    { label: "聯絡電話", value: user?.phone || "未設定" },
    { label: "累計消費", value: stats.totalSpent ? `NT$ ${stats.totalSpent}` : "—" },
  ];

  return (
    <div className={`bg-white ${ACCOUNT_UI.radiusCard} border border-slate-200 shadow-sm overflow-hidden mb-6`}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-start gap-6">
          {user?.image ? (
            <img
              src={user.image}
              alt=""
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm object-cover border border-slate-100 shrink-0"
            />
          ) : (
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm flex items-center justify-center text-white text-3xl font-black shrink-0"
              style={{ backgroundColor: ACCENT.sidebar }}
            >
              {user?.name?.charAt(0) || "U"}
            </div>
          )}

          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1E4AD1]">
                  {user?.name || "會員"}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    使用中
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#0071EB]/10 text-[#0071EB] border border-[#0071EB]/20">
                    {roleLabel}
                  </span>
                  {stats.pendingCount > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {stats.pendingCount} 待處理
                    </span>
                  )}
                </div>
              </div>
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className={`flex items-center gap-1.5 px-4 py-2 border border-slate-200 ${ACCOUNT_UI.radiusBtn} text-sm font-bold text-slate-600 hover:bg-slate-50 shrink-0 self-start`}
                >
                  <MaterialIcon name="edit" size={16} />
                  編輯資料
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3 mt-5 pt-5 border-t border-slate-100">
              {fields.map((f) => (
                <div key={f.label} className="text-sm min-w-0">
                  <p className="text-slate-400 font-medium text-xs mb-0.5">{f.label}</p>
                  <p
                    className={`text-slate-800 font-semibold ${
                      f.label === "會員 Email"
                        ? "whitespace-normal break-words leading-snug"
                        : "truncate"
                    }`}
                    title={f.value}
                  >
                    {f.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Josys 風 — 內部分頁底線 */
export function InnerTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-6 border-b border-slate-200 mb-5 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition -mb-px ${
            active === tab.id
              ? "border-[#0071EB] text-[#0071EB]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {tab.label}
          {tab.count != null && (
            <span className="ml-1 text-slate-400 font-normal">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Carely 風 — 篩選列 */
export function FilterBar({ children, actions }) {
  return (
    <div className="px-4 sm:px-5 py-3 bg-white border border-slate-200 border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 面板 */
export function NavyPanel({ title, icon, action, children, className = "" }) {
  return (
    <div className={`bg-white border border-slate-200 ${ACCOUNT_UI.radiusCard} shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <MaterialIcon name={icon} size={20} className="text-[#1E4AD1] shrink-0" />
            )}
            {title && (
              <h3 className="text-sm font-black text-[#1E4AD1] truncate">{title}</h3>
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
      className={`${ACCOUNT_UI.radiusCard} overflow-hidden flex items-stretch min-h-[80px] mb-5 ${
        isGood ? "" : "bg-amber-600"
      }`}
      style={isGood ? { backgroundColor: ACCENT.sidebar } : undefined}
    >
      <div className="w-16 sm:w-20 flex items-center justify-center bg-black/10 shrink-0">
        <MaterialIcon
          name={isGood ? "verified" : "warning"}
          size={32}
          className="text-white/90"
        />
      </div>
      <div className="flex-1 flex flex-col justify-center px-4 py-3 text-white">
        <p className="text-lg sm:text-xl font-black">{title}</p>
        {message && <p className="text-xs sm:text-sm text-blue-100 mt-0.5">{message}</p>}
      </div>
    </div>
  );
}

export function MetricTile({ icon, label, value, sub, variant = "navy", trend }) {
  const iconBg =
    variant === "green"
      ? "bg-emerald-50 text-emerald-700"
      : variant === "sky"
        ? "bg-sky-50 text-sky-700"
        : "bg-[#1E4AD1]/10 text-[#1E4AD1]";
  return (
    <div className={`bg-white border border-slate-200 ${ACCOUNT_UI.radiusCard} p-4 flex items-start gap-3 shadow-sm`}>
      <div className={`w-10 h-10 rounded-sm flex items-center justify-center shrink-0 ${iconBg}`}>
        <MaterialIcon name={icon} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-black text-[#1E4AD1] leading-tight">{value}</p>
        <p className="text-xs font-bold text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
        {trend && (
          <p
            className={`text-[10px] font-bold mt-1 ${trend > 0 ? "text-[#0071EB]" : "text-red-500"}`}
          >
            {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </p>
        )}
      </div>
    </div>
  );
}

export function HrTableShell({ title, filters, actions, children }) {
  return (
    <div className={`bg-white border border-slate-200 ${ACCOUNT_UI.radiusCard} shadow-sm overflow-hidden`}>
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-black text-[#1E4AD1]">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {filters && (
        <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap gap-2">
          {filters}
        </div>
      )}
      <div className="p-0">{children}</div>
    </div>
  );
}

export function QuickActionCard({ icon, title, desc, onClick, href }) {
  const cls =
    "block text-left p-5 bg-white border border-slate-200 rounded-sm hover:border-[#0071EB] hover:shadow-md transition group h-full";
  const inner = (
    <>
      <div className="w-12 h-12 rounded-full bg-[#1E4AD1]/10 flex items-center justify-center mb-3 group-hover:bg-[#1E4AD1] transition">
        <MaterialIcon
          name={icon}
          size={26}
          className="text-[#1E4AD1] group-hover:text-white transition"
        />
      </div>
      <p className="font-black text-[#1E4AD1] text-sm">{title}</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${cls} w-full`}>
      {inner}
    </button>
  );
}

export function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
        active
          ? "bg-[#1E4AD1] text-white border-[#1E4AD1]"
          : "bg-white text-slate-600 border-slate-200 hover:border-[#0071EB]"
      }`}
    >
      {children}
    </button>
  );
}

export const AccountCard = NavyPanel;

/** 會員中心內容區 — 全寬，避免右側留白 */
export function AccountPageWrap({ children, className = "" }) {
  return <div className={`w-full min-w-0 ${className}`}>{children}</div>;
}
