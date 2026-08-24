import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import BossAdminLayout from "@/components/admin/BossAdminLayout";
import { StatusBanner } from "@/components/partner/PartnerAdminLayout";
import {
  bossFetch,
  clearBossSession,
  getBossToken,
  setBossSession,
} from "@/lib/bossAdminClient";
import AdminRefundsPanel from "@/components/admin/AdminRefundsPanel";
import AdminWithdrawalsPanel from "@/components/admin/AdminWithdrawalsPanel";
import AccountBossPartnersPanel from "@/components/account/AccountBossPartnersPanel";
import BossSalesAnalyticsPanel from "@/components/admin/BossSalesAnalyticsPanel";
import AdminMissionsPanel from "@/components/admin/AdminMissionsPanel";
import BossPlatformSettingsPanel from "@/components/admin/BossPlatformSettingsPanel";
import BossTrafficAlertCopyPanel from "@/components/admin/BossTrafficAlertCopyPanel";
import BossInlineLogin from "@/components/account/BossInlineLogin";
import { QuarterRing } from "@/components/ui/QuarterRing";

function BossLoginPage({ onLoginSuccess, embed }) {
  return (
    <div
      className={`min-h-screen flex font-sans items-center justify-center p-6 ${
        embed ? "bg-white" : "bg-[#eef1f6]"
      }`}
    >
      <Head>
        <title>總部管理登入 | JEKO eSIM</title>
      </Head>
      <div className="w-full max-w-md">
        <BossInlineLogin onLoginSuccess={onLoginSuccess} />
      </div>
    </div>
  );
}

export default function AdminBossDashboard() {
  const router = useRouter();
  const embed = router.query.embed === "1";
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [bossTab, setBossTab] = useState("sales");
  const [partnerStats, setPartnerStats] = useState({ total: 0, pending: 0, active: 0 });

  useEffect(() => {
    if (!router.isReady) return;
    const tab = router.query.tab;
    if (
      tab === "partners" ||
      tab === "refunds" ||
      tab === "sales" ||
      tab === "withdrawals" ||
      tab === "missions" ||
      tab === "settings" ||
      tab === "traffic-copy"
    ) {
      setBossTab(tab);
    }
  }, [router.isReady, router.query.tab]);

  useEffect(() => {
    if (!embed) return;

    function onMessage(event) {
      const data = event?.data;
      if (!data || data.type !== "jeko_boss_token") return;
      if (data.token) {
        setBossSession(data.token, data.email || "");
        fetch("/api/admin/session", {
          headers: { Authorization: `Bearer ${data.token}` },
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.authenticated) {
              setAdminUser(res.user);
              setIsAuthenticated(true);
              setAuthChecking(false);
            }
          })
          .catch(() => {});
      }
    }

    window.addEventListener("message", onMessage);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "jeko_boss_ready" }, "*");
    }
    return () => window.removeEventListener("message", onMessage);
  }, [embed]);

  useEffect(() => {
    const token = getBossToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    fetch("/api/admin/session", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          setAdminUser(data.user);
        } else {
          clearBossSession();
        }
      })
      .finally(() => setAuthChecking(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    bossFetch("/api/admin/partners")
      .then((data) => {
        const list = data.partners || [];
        setPartnerStats({
          total: list.length,
          pending: list.filter((p) => p.status === "pending").length,
          active: list.filter((p) => p.status === "active").length,
        });
      })
      .catch(() => {});
  }, [isAuthenticated, bossTab]);

  if (authChecking) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          embed ? "bg-white" : "bg-[#1a56db]"
        }`}
      >
        <QuarterRing
          size="md"
          className={embed ? "text-[#1a56db]" : "text-white"}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <BossLoginPage
        embed={embed}
        onLoginSuccess={(user) => {
          setAdminUser(user);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  const { pending, active } = partnerStats;

  const tabs = [
    { id: "sales", label: "銷售分析" },
    { id: "partners", label: "夥伴審核" },
    { id: "missions", label: "任務牆" },
    { id: "refunds", label: "退款審核" },
    { id: "withdrawals", label: "提領審核" },
    { id: "traffic-copy", label: "流量提醒文案" },
    { id: "settings", label: "平台設定" },
  ];

  const title =
    bossTab === "sales"
      ? "銷售分析"
      : bossTab === "refunds"
        ? "退款審核"
        : bossTab === "withdrawals"
          ? "提領審核"
          : bossTab === "missions"
            ? "任務牆"
            : bossTab === "traffic-copy"
              ? "流量提醒文案"
              : bossTab === "settings"
                ? "平台設定"
                : "夥伴審核";

  const content = (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setBossTab(t.id);
              if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                if (t.id === "sales") url.searchParams.delete("tab");
                else url.searchParams.set("tab", t.id);
                window.history.replaceState({}, "", url.toString());
              }
            }}
            className={`px-4 py-2 rounded-sm text-sm font-bold transition ${
              bossTab === t.id
                ? "bg-[#1a56db] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {bossTab === "sales" && <BossSalesAnalyticsPanel />}

      {bossTab === "refunds" && <AdminRefundsPanel />}

      {bossTab === "withdrawals" && <AdminWithdrawalsPanel />}

      {bossTab === "missions" && <AdminMissionsPanel />}

      {bossTab === "settings" && <BossPlatformSettingsPanel />}

      {bossTab === "traffic-copy" && <BossTrafficAlertCopyPanel />}

      {bossTab === "partners" && (
        <>
          <StatusBanner
            title={`您好，${adminUser?.first_name || adminUser?.email?.split("@")[0] || "管理員"}`}
            message={`目前 ${pending} 筆待審核、${active} 家已開通夥伴`}
            status={pending > 0 ? "warn" : "good"}
          />
          <AccountBossPartnersPanel />
        </>
      )}
    </>
  );

  if (embed) {
    return (
      <div className="min-h-screen bg-[#eef2f7] font-sans">
        <Head>
          <title>{title} | JEKO 夥伴管理</title>
        </Head>
        <div className="p-4 md:p-6">{content}</div>
      </div>
    );
  }

  return (
    <BossAdminLayout title={title} activeTab={bossTab}>
      {content}
    </BossAdminLayout>
  );
}
