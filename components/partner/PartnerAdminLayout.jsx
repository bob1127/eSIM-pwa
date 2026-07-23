import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import MaterialIcon from "@/components/MaterialIcon";
import { DobermanFooter } from "@/components/partner/DobermanWidgets";
import { usePartnerSession, partnerLogout, SITE_URL } from "@/lib/partnerAuth";

const NAV_ITEMS = [
  { href: "/partner/dashboard", label: "儀表板", icon: "space_dashboard" },
  { href: "/partner/catalog", label: "選品管理", icon: "shopping_bag" },
  { href: "/partner/products", label: "商品管理", icon: "inventory_2" },
  { href: "/partner/orders", label: "訂單分潤", icon: "receipt_long" },
  { href: "/partner/blog", label: "文章管理", icon: "article" },
  { href: "/partner/settings", label: "商店設定", icon: "settings" },
];

export default function PartnerAdminLayout({ title, children, footerNotice }) {
  const router = useRouter();
  const { loading, user, partner, store } = usePartnerSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8ecf1]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">載入合作夥伴後台...</p>
        </div>
      </div>
    );
  }

  if (!user || !partner) return null;

  const storeUrl = store ? `${SITE_URL}/p/${store.domain}` : null;

  return (
    <div className="min-h-screen bg-[#e8ecf1] flex flex-col font-sans">
      <Head>
        <title>{title ? `${title} | JEKO 夥伴後台` : "JEKO 夥伴後台"}</title>
      </Head>

      {/* ── DOBERMAN ヘッダー ── */}
      <header className="bg-[#1a3a6b] text-white h-12 flex items-center justify-between px-5 shrink-0 shadow-md z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/10 rounded flex items-center justify-center">
              <MaterialIcon name="shield" size={18} className="text-blue-200" />
            </div>
            <span className="font-black text-sm tracking-wider">JEKO SYSTEM</span>
          </div>
          <span className="text-blue-300 text-xs font-bold hidden sm:inline border-l border-white/20 pl-4">
            DS-PARTNER R1
          </span>
        </div>

        <div className="flex items-center gap-3">
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1 text-xs text-blue-200 hover:text-white transition"
            >
              <MaterialIcon name="open_in_new" size={14} />
              賣場預覽
            </a>
          )}
          <Link
            href="/partner/settings"
            className="flex items-center gap-1.5 text-xs border border-white/30 hover:bg-white/10 px-3 py-1.5 rounded-sm transition font-bold"
          >
            <MaterialIcon name="settings" size={16} />
            <span className="hidden sm:inline">商店設定</span>
          </Link>
          <button
            type="button"
            onClick={() => partnerLogout(router)}
            className="flex items-center gap-1.5 text-xs border border-white/30 hover:bg-white/10 px-3 py-1.5 rounded-sm transition font-bold"
          >
            <MaterialIcon name="logout" size={16} />
            <span className="hidden sm:inline">登出</span>
          </button>
          <div className="hidden md:flex items-center gap-2 border-l border-white/20 pl-3 ml-1">
            <div className="w-7 h-7 bg-white/15 rounded-full flex items-center justify-center overflow-hidden">
              {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    user.user_metadata.avatar_url || user.user_metadata.picture
                  }
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <MaterialIcon name="storefront" size={16} className="text-blue-200" />
              )}
            </div>
            <span className="text-xs text-blue-200 font-bold max-w-[100px] truncate">
              {store?.store_name || partner.name}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── DOBERMAN サイドバー（ライトグレー） ── */}
        <aside className="w-48 bg-[#f5f6f8] border-r border-slate-200 flex-col shrink-0 hidden md:flex">
          <nav className="flex-1 py-2">
            {NAV_ITEMS.map(({ href, label, icon }, i) => {
              const active = router.pathname === href;
              return (
                <div key={href}>
                  {i > 0 && <div className="mx-3 border-t border-slate-200" />}
                  <Link
                    href={href}
                    className={`flex items-center gap-3 mx-2 my-1 px-3 py-3 text-sm font-bold transition-all rounded-sm ${
                      active
                        ? "bg-[#1a56db] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-800"
                    }`}
                  >
                    <MaterialIcon
                      name={icon}
                      size={20}
                      className={active ? "text-white" : "text-slate-500"}
                    />
                    {label}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-200">
            <Link
              href="/account"
              className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-[#1a56db] transition px-2 py-1"
            >
              <MaterialIcon name="arrow_back" size={14} />
              會員中心
            </Link>
          </div>
        </aside>

        {/* ── メインコンテンツ ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* モバイルナビ */}
          <div className="md:hidden flex overflow-x-auto bg-[#f5f6f8] border-b border-slate-200 px-2 py-1 gap-1 shrink-0">
            {NAV_ITEMS.map(({ href, label, icon }) => {
              const active = router.pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold whitespace-nowrap transition ${
                    active ? "bg-[#1a56db] text-white" : "text-slate-600"
                  }`}
                >
                  <MaterialIcon name={icon} size={16} />
                  {label}
                </Link>
              );
            })}
          </div>

          <main className="flex-1 overflow-y-auto">{children}</main>
          <DobermanFooter notice={footerNotice} />
        </div>
      </div>
    </div>
  );
}

/** @deprecated 使用 DobermanPanel 代替 */
export function StatCard({ label, value, sub, accent = false, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-sm p-5 flex flex-col gap-1 text-left transition hover:shadow-md ${
        accent
          ? "bg-[#1a56db] text-white shadow-sm"
          : "bg-white border border-slate-200 shadow-sm"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <p className={`text-xs font-bold uppercase tracking-wide ${accent ? "text-blue-100" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`text-3xl font-black ${accent ? "text-white" : "text-[#1a56db]"}`}>{value}</p>
      {sub && (
        <p className={`text-xs mt-1 ${accent ? "text-blue-100" : "text-slate-400"}`}>{sub}</p>
      )}
    </Tag>
  );
}

/** @deprecated 使用 DobermanStatusBanner 代替 */
export function StatusBanner({ title, message, status = "good" }) {
  const colors = {
    good: "bg-[#1a56db]",
    warn: "bg-amber-500",
    info: "bg-slate-600",
  };
  return (
    <div className={`${colors[status]} text-white p-5 flex items-center gap-4 mb-6 shadow-sm`}>
      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
        <MaterialIcon name="verified_user" size={28} className="text-white" filled />
      </div>
      <div>
        <p className="font-black text-lg">{title}</p>
        <p className="text-sm text-blue-100 mt-0.5">{message}</p>
      </div>
    </div>
  );
}
