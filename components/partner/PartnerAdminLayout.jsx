import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import MaterialIcon from "@/components/MaterialIcon";
import { DobermanFooter } from "@/components/partner/DobermanWidgets";
import { usePartnerSession, partnerLogout, SITE_URL } from "@/lib/partnerAuth";
import { SHOPIFY_UI } from "@/lib/shopifyUi";

const NAV_ITEMS = [
  {
    href: "/partner/dashboard",
    label: "儀表板",
    short: "儀表板",
    icon: "space_dashboard",
    models: ["store", "referral"],
  },
  {
    href: "/partner/analytics",
    label: "分潤分析",
    short: "分析",
    icon: "insights",
    models: ["store", "referral"],
  },
  {
    href: "/partner/rates",
    label: "方案分潤一覽",
    short: "分潤",
    icon: "percent",
    models: ["referral"],
  },
  {
    href: "/partner/catalog",
    label: "選品管理",
    short: "選品",
    icon: "shopping_bag",
    models: ["store"],
  },
  {
    href: "/partner/products",
    label: "商品管理",
    short: "商品",
    icon: "inventory_2",
    models: ["store"],
  },
  {
    href: "/partner/orders",
    label: "訂單分潤",
    short: "訂單",
    icon: "receipt_long",
    models: ["store", "referral"],
  },
  {
    href: "/partner/settlement",
    label: "結算與提領",
    short: "結算",
    icon: "account_balance_wallet",
    models: ["store", "referral"],
  },
  {
    href: "/partner/blog",
    label: "文章管理",
    short: "文章",
    icon: "article",
    models: ["store", "referral"],
  },
  {
    href: "/partner/settings",
    label: "商店設定",
    short: "設定",
    icon: "settings",
    models: ["store"],
  },
];

/** 頂欄圖示按鈕（深色底、白色圖示，比照 Shopify 頂欄的通知／頭像按鈕） */
function ChromeIconButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white/90 hover:bg-white/10 transition"
      {...props}
    >
      {children}
    </button>
  );
}

export default function PartnerAdminLayout({ title, children, footerNotice }) {
  const router = useRouter();
  const { loading, user, partner, store } = usePartnerSession();
  const [navQuery, setNavQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: SHOPIFY_UI.chromeBg, borderTopColor: "transparent" }}
          />
          <p className="text-sm text-slate-500 font-medium">
            載入合作夥伴後台...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !partner) return null;

  const storeUrl = store ? `${SITE_URL}/p/${store.domain}` : null;
  const model = partner.cooperation_model === "referral" ? "referral" : "store";
  const isReferral = model === "referral";
  const navItems = NAV_ITEMS.filter((item) => item.models.includes(model));
  const displayName = isReferral
    ? partner.name
    : store?.store_name || partner.name;
  const initials = (displayName || "P").trim().slice(0, 2).toUpperCase();

  const handleQuickNav = (e) => {
    e.preventDefault();
    const q = navQuery.trim().toLowerCase();
    if (!q) return;
    const match = navItems.find((item) => item.label.toLowerCase().includes(q));
    if (match) {
      router.push(match.href);
      setNavQuery("");
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col font-sans"
      style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
    >
      <Head>
        <title>{title ? `${title} | JEKO 夥伴後台` : "JEKO 夥伴後台"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {/* 頂欄：黑底比照 Shopify Admin chrome */}
      <header
        className="min-h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-20 relative pt-[env(safe-area-inset-top)]"
        style={{ backgroundColor: SHOPIFY_UI.chromeBg }}
      >
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <MaterialIcon name="storefront" size={16} className="text-[#1a1a1a]" />
          </div>
          <span className="text-white font-black text-sm tracking-tight hidden sm:inline">
            Jeko
          </span>
        </Link>

        <form
          onSubmit={handleQuickNav}
          className="flex-1 max-w-sm mx-auto hidden sm:block"
        >
          <div className="relative">
            <MaterialIcon
              name="search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="搜尋後台功能（例如：分潤、訂單）"
              className="w-full h-8 rounded-md bg-white/10 focus:bg-white text-white focus:text-[#1a1a1a] placeholder:text-gray-400 text-xs pl-8 pr-3 outline-none transition"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              title="預覽賣場"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white/90 hover:bg-white/10 transition"
            >
              <MaterialIcon name="open_in_new" size={18} />
            </a>
          )}
          <ChromeIconButton title="通知">
            <MaterialIcon name="notifications" size={18} />
          </ChromeIconButton>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-1 pl-0.5 pr-1.5 sm:pr-2 h-9 rounded-full hover:bg-white/10 transition"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
                style={{ backgroundColor: SHOPIFY_UI.link }}
              >
                {initials}
              </span>
              <span className="text-white text-xs font-bold hidden md:inline max-w-[120px] truncate">
                {displayName}
              </span>
              <MaterialIcon
                name="expand_more"
                size={16}
                className="text-white/70 hidden md:inline"
              />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#e3e3e3] z-20 py-1.5 overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#eceef0]">
                    <p className="text-sm font-bold text-[#1a1a1a] truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-[#6b6b6b]">
                      {isReferral ? "專屬折扣碼連結" : "專屬商店"}
                    </p>
                  </div>
                  <Link
                    href="/account"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#1a1a1a] hover:bg-[#f1f1f1] transition"
                  >
                    <MaterialIcon name="arrow_back" size={16} />
                    會員中心
                  </Link>
                  <button
                    type="button"
                    onClick={() => partnerLogout(router)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#d82c0d] hover:bg-[#fed3d1]/40 transition text-left"
                  >
                    <MaterialIcon name="logout" size={16} />
                    登出
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* 桌面側欄：白底比照 Shopify sidebar */}
        <aside
          className="w-[232px] flex-col shrink-0 hidden md:flex"
          style={{
            backgroundColor: SHOPIFY_UI.sidebarBg,
            borderRight: `1px solid ${SHOPIFY_UI.sidebarBorder}`,
          }}
        >
          <div
            className="px-3 py-3"
            style={{ borderBottom: `1px solid ${SHOPIFY_UI.sidebarBorder}` }}
          >
            <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-md">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white text-[11px] font-black shrink-0"
                style={{ backgroundColor: SHOPIFY_UI.chromeBg }}
              >
                J
              </div>
              <span
                className="text-sm font-bold truncate flex-1"
                style={{ color: SHOPIFY_UI.sidebarText }}
              >
                {displayName}
              </span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            <Link
              href="/"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium hover:bg-[#f1f1f1] transition"
              style={{ color: SHOPIFY_UI.sidebarTextMuted }}
            >
              <MaterialIcon name="home" size={18} />
              <span className="flex-1 truncate">回到首頁</span>
            </Link>

            <div
              className="h-px my-2 mx-1"
              style={{ backgroundColor: SHOPIFY_UI.divider }}
            />

            {navItems.map(({ href, label, icon }) => {
              const active = router.pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition"
                  style={{
                    backgroundColor: active ? SHOPIFY_UI.sidebarActiveBg : "transparent",
                    color: active ? SHOPIFY_UI.sidebarText : SHOPIFY_UI.sidebarTextMuted,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <MaterialIcon name={icon} size={18} />
                  <span className="flex-1 truncate">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div
            className="p-3"
            style={{ borderTop: `1px solid ${SHOPIFY_UI.sidebarBorder}` }}
          >
            <Link
              href={storeUrl || "/cooperation"}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md text-sm font-bold text-white transition"
              style={{ backgroundColor: SHOPIFY_UI.primaryBtnBg }}
              {...(storeUrl ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              <MaterialIcon name="storefront" size={18} />
              {storeUrl ? "預覽賣場" : "合作說明"}
            </Link>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col min-h-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {children}
          </main>
          <div className="hidden md:block">
            <DobermanFooter notice={footerNotice} />
          </div>
        </div>
      </div>

      {/* 手機底部導覽：白底比照 Shopify 行動版樣式 */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 backdrop-blur-md"
        style={{
          borderTop: `1px solid ${SHOPIFY_UI.sidebarBorder}`,
          backgroundColor: "rgba(255,255,255,0.97)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          className={`flex items-stretch justify-around gap-0.5 px-1 pt-1 ${
            navItems.length > 5 ? "overflow-x-auto" : ""
          }`}
        >
          {navItems.map(({ href, short, icon }) => {
            const active = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[56px] rounded-lg text-[10px] transition"
                style={{
                  color: active ? SHOPIFY_UI.textPrimary : SHOPIFY_UI.textTertiary,
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span
                  className="flex items-center justify-center w-9 h-8 rounded-lg"
                  style={{ backgroundColor: active ? SHOPIFY_UI.sidebarActiveBg : "transparent" }}
                >
                  <MaterialIcon
                    name={icon}
                    size={22}
                    style={{ color: active ? SHOPIFY_UI.textPrimary : SHOPIFY_UI.textTertiary }}
                  />
                </span>
                {short}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** @deprecated 使用 DobermanPanel 代替 */
export function StatCard({ label, value, sub, accent = false, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-xl p-4 sm:p-5 flex flex-col gap-1 text-left transition hover:shadow-md ${
        accent
          ? "text-white shadow-sm"
          : "bg-white border border-slate-200 shadow-sm"
      } ${onClick ? "cursor-pointer" : ""}`}
      style={accent ? { backgroundColor: SHOPIFY_UI.chromeBg } : undefined}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          accent ? "text-white/70" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-xl sm:text-2xl font-black ${
          accent ? "text-white" : "text-[#1a1a1a]"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-xs mt-1 ${accent ? "text-white/70" : "text-slate-400"}`}
        >
          {sub}
        </p>
      )}
    </Tag>
  );
}

/** @deprecated 使用 DobermanStatusBanner 代替 */
export function StatusBanner({ title, message, status = "good" }) {
  const colors = {
    good: SHOPIFY_UI.chromeBg,
    warn: "#8a5a00",
    info: "#475569",
  };
  return (
    <div
      className="text-white p-4 sm:p-5 flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 shadow-sm relative overflow-hidden rounded-xl sm:rounded-none"
      style={{ backgroundColor: colors[status] || colors.good }}
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
        <MaterialIcon
          name="verified_user"
          size={24}
          className="text-white"
          filled
        />
      </div>
      <div className="min-w-0">
        <p className="font-black text-base sm:text-lg">{title}</p>
        <p className="text-xs sm:text-sm text-white/80 mt-0.5 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}
