import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  UserGroupIcon,
  ChartBarIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";
import { clearBossSession, getBossEmail } from "@/lib/bossAdminClient";
import { StatCard } from "@/components/partner/PartnerAdminLayout";

const NAV_ITEMS = [
  { id: "sales", href: "/admin-boss", label: "銷售分析", icon: ChartBarIcon },
  { id: "partners", href: "/admin-boss?tab=partners", label: "夥伴審核", icon: UserGroupIcon },
  { id: "missions", href: "/admin-boss?tab=missions", label: "任務牆", icon: ClipboardDocumentCheckIcon },
  { id: "refunds", href: "/admin-boss?tab=refunds", label: "退款審核", icon: BanknotesIcon },
  {
    id: "withdrawals",
    href: "/admin-boss?tab=withdrawals",
    label: "提領審核",
    icon: CurrencyDollarIcon,
  },
  {
    id: "traffic-copy",
    href: "/admin-boss?tab=traffic-copy",
    label: "流量提醒文案",
    icon: BellAlertIcon,
  },
  {
    id: "settings",
    href: "/admin-boss?tab=settings",
    label: "平台設定",
    icon: Cog6ToothIcon,
  },
];

export default function BossAdminLayout({ title, children, activeTab = "sales" }) {
  const router = useRouter();
  const email = getBossEmail();

  const handleLogout = () => {
    clearBossSession();
    router.replace("/admin-boss");
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] flex flex-col font-sans">
      <Head>
        <title>{title ? `${title} | JEKO 總部後台` : "JEKO 總部後台"}</title>
      </Head>

      <header className="bg-[#1a3a6b] text-white h-14 flex items-center justify-between px-6 shrink-0 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <span className="text-sm font-black text-blue-200">J</span>
          </div>
          <div>
            <span className="font-black text-sm tracking-wide">JEKO eSIM</span>
            <span className="text-blue-300 text-xs ml-2 font-medium">總部管理後台</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-xs text-blue-200 hover:text-white transition font-medium"
          >
            商城首頁 <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </Link>
          <span className="text-xs text-blue-300 hidden md:block">{email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition font-bold"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" /> 登出
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 bg-[#234876] text-white flex flex-col shrink-0 hidden md:flex">
          <div className="px-4 py-5 border-b border-white/10">
            <p className="text-[10px] text-blue-300 uppercase tracking-widest font-bold mb-1">
              總部
            </p>
            <p className="text-sm font-bold truncate">Medusa 管理員</p>
            <p className="text-[10px] text-blue-400 mt-0.5 truncate">{email}</p>
          </div>

          <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2">
            {NAV_ITEMS.map(({ id, href, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <Link
                  key={id}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-[#1a3a6b] text-white shadow-sm"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10 space-y-2">
            <Link
              href="/partner/login"
              className="text-[11px] text-blue-400 hover:text-blue-200 transition block"
            >
              夥伴後台登入 →
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-200 transition"
            >
              <HomeIcon className="w-3.5 h-3.5" /> 返回商城
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="md:hidden flex overflow-x-auto bg-[#234876] px-2 py-1 gap-1 shrink-0">
            {NAV_ITEMS.map(({ id, href, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <Link
                  key={id}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    active ? "bg-[#1a3a6b] text-white" : "text-blue-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </div>
          <div className="p-5 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export { StatCard };
