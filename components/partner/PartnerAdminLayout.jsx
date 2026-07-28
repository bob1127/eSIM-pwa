import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import MaterialIcon from "@/components/MaterialIcon";
import { DobermanFooter } from "@/components/partner/DobermanWidgets";
import { usePartnerSession, partnerLogout, SITE_URL } from "@/lib/partnerAuth";
import { PARTNER_UI } from "@/lib/partnerUi";

const NAV_ITEMS = [
  {
    href: "/partner/dashboard",
    label: "儀表板",
    short: "儀表板",
    icon: "space_dashboard",
    models: ["store", "referral"],
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

export default function PartnerAdminLayout({ title, children, footerNotice }) {
  const router = useRouter();
  const { loading, user, partner, store } = usePartnerSession();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: PARTNER_UI.content }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: PARTNER_UI.navy,
              borderTopColor: "transparent",
            }}
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

  return (
    <div
      className="min-h-[100dvh] flex flex-col font-sans"
      style={{ backgroundColor: PARTNER_UI.content }}
    >
      <Head>
        <title>{title ? `${title} | JEKO 夥伴後台` : "JEKO 夥伴後台"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {/* 頂欄 */}
      <header
        className="text-white min-h-12 flex items-center justify-between gap-2 px-3 sm:px-5 shrink-0 shadow-md z-20 relative pt-[env(safe-area-inset-top)]"
        style={{ backgroundColor: PARTNER_UI.navy }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ backgroundColor: PARTNER_UI.yellow }}
        />
        <div className="flex items-center gap-2.5 min-w-0 py-2">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition">
              <MaterialIcon name="storefront" size={18} className="text-white" />
            </div>
            <div className="leading-none hidden sm:block">
              <span className="font-black text-sm tracking-tight">
                <span className="text-white">Jeko</span>
                <span style={{ color: PARTNER_UI.yellow }}>.Partner</span>
              </span>
              <p className="text-[10px] text-blue-100/80 mt-0.5 hidden sm:block">
                合作夥伴後台
              </p>
            </div>
          </Link>
          <div className="min-w-0 border-l border-white/20 pl-2.5 sm:pl-4">
            <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[42vw] sm:max-w-[180px]">
              {displayName}
            </p>
            <p className="text-[10px] text-blue-100/80 font-medium">
              {isReferral ? "專屬連結" : "專屬商店"}
              {title ? ` · ${title}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 py-2">
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1 min-h-10 min-w-10 sm:min-w-0 sm:px-3 rounded-lg text-xs font-bold text-[#111] hover:brightness-95 transition"
              style={{ backgroundColor: PARTNER_UI.yellow }}
              title="預覽賣場"
            >
              <MaterialIcon name="open_in_new" size={16} />
              <span className="hidden sm:inline">預覽</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => partnerLogout(router)}
            className="inline-flex items-center justify-center gap-1 min-h-10 min-w-10 sm:min-w-0 sm:px-3 rounded-lg text-xs font-bold border border-white/30 hover:bg-white/10 transition"
            title="登出"
          >
            <MaterialIcon name="logout" size={16} />
            <span className="hidden sm:inline">登出</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* 桌面側欄 */}
        <aside
          className="w-[232px] flex-col shrink-0 hidden md:flex text-white"
          style={{ backgroundColor: PARTNER_UI.sidebar }}
        >
          <div className="px-4 py-4 border-b border-white/10">
            <p className="text-sm font-black text-white leading-tight">
              JEKO 夥伴
            </p>
            <div
              className="mt-1.5 h-[3px] w-10 rounded-full"
              style={{ backgroundColor: PARTNER_UI.yellow }}
            />
            <p className="text-xs text-blue-100/70 mt-1">Partner Portal</p>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            <Link
              href="/"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 transition"
            >
              <MaterialIcon name="home" size={20} className="opacity-90" />
              <span className="flex-1 truncate">回到首頁</span>
            </Link>

            {navItems.map(({ href, label, icon }) => {
              const active = router.pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition relative ${
                    active
                      ? "bg-white text-[#1E4AD1] shadow-sm font-bold"
                      : "text-blue-50 hover:bg-white/10"
                  }`}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                      style={{ backgroundColor: PARTNER_UI.yellow }}
                    />
                  )}
                  <MaterialIcon
                    name={icon}
                    size={20}
                    className={active ? "text-[#1E4AD1]" : "text-blue-100"}
                  />
                  <span className="flex-1 truncate">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-2">
            <Link
              href="/account"
              className="flex items-center gap-2 text-xs text-blue-100 hover:text-white transition px-2 py-1.5"
            >
              <MaterialIcon name="arrow_back" size={14} />
              會員中心
            </Link>
            <Link
              href={storeUrl || "/cooperation"}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-bold text-[#111] hover:brightness-95 transition shadow-sm"
              style={{ backgroundColor: PARTNER_UI.yellow }}
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

      {/* 手機底部導覽 */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[56px] rounded-lg text-[10px] font-bold transition ${
                  active
                    ? "text-[#1E4AD1]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-9 h-8 rounded-lg ${
                    active ? "bg-[#1E4AD1]/10" : ""
                  }`}
                >
                  <MaterialIcon
                    name={icon}
                    size={22}
                    className={active ? "text-[#1E4AD1]" : "text-slate-500"}
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
      style={accent ? { backgroundColor: PARTNER_UI.navy } : undefined}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          accent ? "text-blue-100" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-xl sm:text-2xl font-black ${
          accent ? "text-white" : "text-[#1E4AD1]"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-xs mt-1 ${accent ? "text-blue-100" : "text-slate-400"}`}
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
    good: PARTNER_UI.navy,
    warn: "#f59e0b",
    info: "#475569",
  };
  return (
    <div
      className="text-white p-4 sm:p-5 flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 shadow-sm relative overflow-hidden rounded-xl sm:rounded-none"
      style={{ backgroundColor: colors[status] || colors.good }}
    >
      {status === "good" && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ backgroundColor: PARTNER_UI.yellow }}
        />
      )}
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
        <p className="text-xs sm:text-sm text-blue-100 mt-0.5 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}
