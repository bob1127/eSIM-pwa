import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import MaterialIcon from "@/components/MaterialIcon";
import { DobermanFooter } from "@/components/partner/DobermanWidgets";
import { usePartnerSession, partnerLogout, SITE_URL } from "@/lib/partnerAuth";
import { SHOPIFY_UI } from "@/lib/shopifyUi";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {
  isStorePublicLive,
  isStoreSetupPending,
} from "@/lib/partnerStoreLifecycle";

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

/** 手機底部固定顯示的主選單（其餘收進「更多」） */
const MOBILE_PRIMARY_HREFS = {
  store: [
    "/partner/dashboard",
    "/partner/orders",
    "/partner/catalog",
    "/partner/blog",
  ],
  referral: [
    "/partner/dashboard",
    "/partner/orders",
    "/partner/blog",
    "/partner/analytics",
  ],
};

/** 手機底部導覽項目（藍底圓角列） */
function MobileBottomNavItem({ href, icon, label, active, onClick, as = "link" }) {
  const tone = active ? "opacity-100" : "opacity-60";
  const body = (
    <>
      <MaterialIcon name={icon} size={24} className={`text-white ${tone}`} />
      <span className={`mt-1 text-[10px] font-medium leading-none text-white ${tone}`}>
        {label}
      </span>
    </>
  );
  const className =
    "flex min-h-[58px] flex-1 flex-col items-center justify-center px-1 py-2.5 transition-opacity active:opacity-80";

  if (as === "button") {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={label}>
        {body}
      </button>
    );
  }

  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {body}
    </Link>
  );
}
/** 頂欄圖示按鈕（淺色底、灰字） */
function ChromeIconButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition"
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
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
      >
        <LoadingIndicator
          layout="center"
          label="載入合作夥伴後台..."
          size="lg"
          spinnerClassName="text-[#1a1a1a]"
        />
      </div>
    );
  }

  if (!user || !partner) return null;

  const storeUrl = store ? `${SITE_URL}/p/${store.domain}` : null;
  const storeClosed = store?.status === "deleted";
  const storeSetupPending = isStoreSetupPending(store);
  const previewUrl = isStorePublicLive(store) ? storeUrl : null;
  const showStoreClosedBanner =
    storeClosed && router.pathname !== "/partner/settings";
  const showStoreSetupBanner =
    storeSetupPending && router.pathname !== "/partner/settings";
  const partnerStoreHref = store?.domain ? `/p/${store.domain}/` : null;
  const brandHref = partnerStoreHref || "/partner/dashboard";
  const brandTitle = partnerStoreHref
    ? `回到 ${store?.store_name || "賣場"} 首頁`
    : "夥伴後台首頁";
  const brandText = store?.store_name
    ? store.store_name.length > 12
      ? `${store.store_name.slice(0, 12)}…`
      : store.store_name
    : "Jeko";
  const model = partner.cooperation_model === "referral" ? "referral" : "store";
  const isReferral = model === "referral";
  const navItems = NAV_ITEMS.filter((item) => item.models.includes(model));
  const primaryHrefs = MOBILE_PRIMARY_HREFS[model] || MOBILE_PRIMARY_HREFS.store;
  const mobilePrimaryItems = primaryHrefs
    .map((href) => navItems.find((item) => item.href === href))
    .filter(Boolean);
  const mobileMoreItems = navItems.filter((item) => !primaryHrefs.includes(item.href));
  const mobileMoreActive = mobileMoreItems.some(
    (item) => router.pathname === item.href,
  );
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

      {/* 頂欄：UIAble 淺色 */}
      <header
        className="min-h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-20 relative pt-[env(safe-area-inset-top)] border-b"
        style={{
          backgroundColor: SHOPIFY_UI.chromeBg,
          borderColor: SHOPIFY_UI.chromeBorder,
        }}
      >
        <Link
          href={brandHref}
          title={brandTitle}
          className="flex items-center gap-2 shrink-0 group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: SHOPIFY_UI.accentBg }}
          >
            <MaterialIcon name="storefront" size={16} />
          </div>
          <span
            className="font-black text-sm tracking-tight hidden sm:inline max-w-[140px] truncate"
            style={{ color: SHOPIFY_UI.textPrimary }}
          >
            {brandText}
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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="搜尋後台功能（例如：分潤、訂單）"
              className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 text-xs pl-9 pr-3 outline-none transition focus:border-[#1E4AD1] focus:bg-white focus:ring-2 focus:ring-[#1E4AD1]/15"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              title="預覽賣場"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition"
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
              className="flex items-center gap-1 pl-0.5 pr-1.5 sm:pr-2 h-9 rounded-lg hover:bg-slate-100 transition"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
                style={{ backgroundColor: SHOPIFY_UI.accentBg }}
              >
                {initials}
              </span>
              <span
                className="text-xs font-bold hidden md:inline max-w-[120px] truncate"
                style={{ color: SHOPIFY_UI.textPrimary }}
              >
                {displayName}
              </span>
              <MaterialIcon
                name="expand_more"
                size={16}
                className="text-slate-400 hidden md:inline"
              />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {isReferral ? "專屬折扣碼連結" : "專屬商店"}
                    </p>
                  </div>
                  <Link
                    href="/account"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <MaterialIcon name="arrow_back" size={16} />
                    會員中心
                  </Link>
                  <button
                    type="button"
                    onClick={() => partnerLogout(router)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
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
        {/* 桌面側欄：UIAble 淺灰底 + 品牌藍選取 */}
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
            <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-black shrink-0"
                style={{ backgroundColor: SHOPIFY_UI.accentBg }}
              >
                J
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className="text-sm font-bold truncate block"
                  style={{ color: SHOPIFY_UI.sidebarText }}
                >
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  夥伴後台
                </span>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-2">
            <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              一般
            </p>
            <Link
              href={brandHref}
              className="flex items-center px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 transition mb-0.5"
            >
              <span className="flex-1 truncate">
                {partnerStoreHref ? "回到賣場首頁" : "夥伴儀表板"}
              </span>
            </Link>

            <div
              className="h-px my-2 mx-1"
              style={{ backgroundColor: SHOPIFY_UI.divider }}
            />

            <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              功能選單
            </p>
            <div className="space-y-0.5">
              {navItems.map(({ href, label }) => {
                const active = router.pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="w-full flex items-center px-2.5 py-2 rounded-lg text-sm transition"
                    style={{
                      backgroundColor: active
                        ? SHOPIFY_UI.sidebarActiveBg
                        : "transparent",
                      color: active
                        ? SHOPIFY_UI.sidebarActiveText
                        : SHOPIFY_UI.sidebarTextMuted,
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div
            className="p-3"
            style={{ borderTop: `1px solid ${SHOPIFY_UI.sidebarBorder}` }}
          >
            <Link
              href={previewUrl || "/cooperation"}
              className="flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              style={{ backgroundColor: SHOPIFY_UI.primaryBtnBg }}
              {...(previewUrl ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {previewUrl ? "預覽賣場" : "合作說明"}
            </Link>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col min-h-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {showStoreSetupBanner ? (
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 text-sm text-blue-950">
                商店建立中，尚未正式上線。
                <Link
                  href="/partner/settings/"
                  className="font-bold underline underline-offset-2 mx-1"
                >
                  繼續完成智慧開店
                </Link>
              </div>
            ) : null}
            {showStoreClosedBanner ? (
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-950">
                賣場已關閉，前台已下線。
                <Link
                  href="/partner/settings/"
                  className="font-bold underline underline-offset-2 mx-1"
                >
                  前往商店設定
                </Link>
                可重新開啟或建立新商店。
              </div>
            ) : null}
            {children}
          </main>
          <div className="hidden md:block">
            <DobermanFooter notice={footerNotice} />
          </div>
        </div>
      </div>

      {/* 手機底部導覽：藍底圓角 + 白字圖示（UIAble 風格） */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30">
        <div
          className="rounded-t-[32px] shadow-[0_-10px_40px_rgba(30,74,209,0.28)]"
          style={{
            backgroundColor: SHOPIFY_UI.accentBg,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex items-stretch justify-around px-1 pt-2.5 pb-1.5">
            {mobilePrimaryItems.map(({ href, short, icon }) => (
              <MobileBottomNavItem
                key={href}
                href={href}
                icon={icon}
                label={short}
                active={router.pathname === href}
              />
            ))}
            {mobileMoreItems.length > 0 ? (
              <MobileBottomNavItem
                as="button"
                icon="more_horiz"
                label="更多"
                active={mobileMoreActive}
                onClick={() => setMobileMoreOpen(true)}
              />
            ) : null}
          </div>
        </div>
      </nav>

      {mobileMoreOpen ? (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="關閉選單"
            onClick={() => setMobileMoreOpen(false)}
          />
          <div
            className="absolute inset-x-0 rounded-t-2xl border border-slate-200 bg-white shadow-2xl"
            style={{
              bottom: "calc(68px + env(safe-area-inset-bottom))",
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">更多功能</p>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="關閉"
              >
                <MaterialIcon name="close" size={20} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 p-3">
              {mobileMoreItems.map(({ href, short, icon, label }) => {
                const active = router.pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMoreOpen(false)}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-3 text-[11px] transition hover:bg-slate-50"
                    style={{
                      color: active
                        ? SHOPIFY_UI.sidebarActiveText
                        : SHOPIFY_UI.textTertiary,
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: active
                          ? SHOPIFY_UI.sidebarActiveBg
                          : "rgba(241,245,249,0.9)",
                      }}
                    >
                      <MaterialIcon
                        name={icon}
                        size={22}
                        style={{
                          color: active
                            ? SHOPIFY_UI.sidebarActiveText
                            : SHOPIFY_UI.textTertiary,
                        }}
                      />
                    </span>
                    <span className="text-center leading-tight">{short || label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
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
      style={accent ? { backgroundColor: SHOPIFY_UI.accentBg } : undefined}
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
    good: SHOPIFY_UI.accentBg,
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
