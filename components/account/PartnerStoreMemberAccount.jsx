"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabaseClient";
import { resolveMemberEmail } from "@/lib/memberIdentity";
import { buildLoginUrl } from "@/lib/authRedirect";
import AccountShell from "@/components/account/AccountShell";
import AccountDashboardView from "@/components/account/AccountDashboardView";
import AccountOrdersView from "@/components/account/AccountOrdersView";
import AccountTrafficView from "@/components/account/AccountTrafficView";
import AccountSettingsView from "@/components/account/AccountSettingsView";
import AccountSupportView from "@/components/account/AccountSupportView";

/**
 * 夥伴商店會員中心：共用主站旅客 views，強制 customer 角色。
 * 不含 Boss／夥伴經營後台入口。
 */
export default function PartnerStoreMemberAccount({ store }) {
  const router = useRouter();
  const { data: session, status: navStatus } = useSession();
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [isSupabaseChecked, setIsSupabaseChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTabRaw] = useState("dashboard");
  const [initialDetailOrder, setInitialDetailOrder] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const domain = store?.domain || "";
  const homeHref = domain ? `/p/${domain}/` : "/";
  const accountPath = domain ? `/p/${domain}/account/` : "/account";
  const storeName = store?.store_name || "會員中心";

  const setActiveTab = (tab, orderToOpen) => {
    setActiveTabRaw(tab);
    setInitialDetailOrder(orderToOpen || null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.hash = tab;
      window.history.pushState({ tab }, "", url.toString());
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (hash) setActiveTabRaw(hash);
    const onPopState = (e) => {
      const tab =
        e.state?.tab || window.location.hash.replace("#", "") || "dashboard";
      setActiveTabRaw(tab);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!cancelled) {
        setSupabaseUser(u || null);
        setIsSupabaseChecked(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSupabaseUser(session?.user || null);
      setIsSupabaseChecked(true);
    });
    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (navStatus === "loading" || !isSupabaseChecked) return;

    const memberEmail = resolveMemberEmail({
      supabaseUser,
      sessionUser: session?.user,
    });
    const loggedIn = navStatus === "authenticated" || !!supabaseUser;

    if (!loggedIn || !memberEmail) {
      const loginHref =
        domain
          ? `/p/${domain}/login/?redirect=${encodeURIComponent(accountPath)}`
          : buildLoginUrl(accountPath);
      router.replace(loginHref);
      return;
    }

    const currentUser = {
      id: supabaseUser?.id || session?.user?.id || "member",
      name:
        supabaseUser?.user_metadata?.full_name ||
        session?.user?.name ||
        memberEmail.split("@")[0],
      email: memberEmail,
      image: supabaseUser?.user_metadata?.avatar_url || session?.user?.image,
      phone: supabaseUser?.user_metadata?.phone || session?.user?.phone || "",
    };
    setUser(currentUser);
    setEditingName(currentUser.name || "");
    setEditingPhone(currentUser.phone || "");
    loadOrders(currentUser.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navStatus, isSupabaseChecked, supabaseUser, session, domain, accountPath]);

  const loadOrders = async (email) => {
    setOrdersLoading(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (supabaseUser) {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        if (s?.access_token) headers.Authorization = `Bearer ${s.access_token}`;
      }
      const qs = new URLSearchParams({
        email,
        ...(store?.id ? { store_id: String(store.id) } : {}),
      });
      const res = await fetch(`/api/orders/user-orders?${qs}`, {
        method: "GET",
        headers,
      });
      const result = await res.json();
      setOrders(result.success ? result.data || [] : []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!supabaseUser) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: editingName, phone: editingPhone },
      });
      if (error) throw error;
      setUser((u) => ({ ...u, name: editingName, phone: editingPhone }));
      alert("✅ 個人資料已更新");
    } catch (err) {
      alert("更新失敗：" + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
      return alert("密碼至少需要 6 個字元");
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      alert("✅ 密碼已更新");
    } catch (err) {
      alert("更新失敗：" + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const getAuthHeaders = async () => {
    const headers = {};
    if (supabaseUser) {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (s?.access_token) headers.Authorization = `Bearer ${s.access_token}`;
    }
    return headers;
  };

  const handleGuideClick = () => {
    router.push(`/p/${domain}/tutorial/`);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    await supabase.auth.signOut();
    router.push(homeHref);
  };

  const completedOrders = useMemo(
    () => orders.filter((o) => String(o.status).toLowerCase() === "completed"),
    [orders],
  );

  /** 鎖死旅客角色：永不掛 admin／partner／Boss */
  const userRole = "customer";
  const navItems = [
    { id: "home", label: "回到賣場", icon: "home", href: homeHref },
    { id: "dashboard", label: "首頁總覽", icon: "dashboard" },
    { id: "orders", label: "我的 eSIM 訂單", icon: "qr_code_2" },
    { id: "traffic", label: "查詢流量", icon: "speed" },
    { id: "settings", label: "帳號設定", icon: "manage_accounts" },
    { id: "support", label: "安裝與支援", icon: "help_center" },
  ];

  const pageTitles = {
    dashboard: "首頁總覽",
    orders: "我的 eSIM 訂單",
    traffic: "查詢流量",
    settings: "帳號設定",
    support: "安裝與支援",
  };

  if (navStatus === "loading" || !isSupabaseChecked || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6] text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">驗證身分中…</p>
        </div>
      </div>
    );
  }

  return (
    <AccountShell
      title={pageTitles[activeTab] || "會員中心"}
      user={user}
      userRole={userRole}
      partnerData={null}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      navItems={navItems}
      onLogout={handleLogout}
      orderBadge={orders.length}
      homeHref={homeHref}
      brandLabel={`${storeName} 會員`}
      shopCtaLabel="返回賣場"
    >
      <AnimatePresence mode="wait">
        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard"
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AccountDashboardView
              user={user}
              userRole={userRole}
              partnerData={null}
              orders={orders}
              completedOrders={completedOrders}
              partnerStats={{ profit: 0, orderCount: 0 }}
              adminStats={{ revenue: 0, orderCount: 0, partnerCount: 0 }}
              statsLoading={false}
              onTabChange={setActiveTab}
              onPartnerPortal={() => {}}
            />
          </motion.div>
        )}

        {activeTab === "orders" && (
          <motion.div
            key="orders"
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AccountOrdersView
              orders={orders}
              loading={ordersLoading}
              onRefresh={() => user?.email && loadOrders(user.email)}
              getAuthHeaders={getAuthHeaders}
              onTabChange={setActiveTab}
              initialDetailOrder={initialDetailOrder}
            />
          </motion.div>
        )}

        {activeTab === "traffic" && (
          <motion.div
            key="traffic"
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AccountTrafficView orders={orders} ordersLoading={ordersLoading} />
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div
            key="settings"
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AccountSettingsView
              user={user}
              userRole={userRole}
              partnerData={null}
              editingName={editingName}
              setEditingName={setEditingName}
              editingPhone={editingPhone}
              setEditingPhone={setEditingPhone}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              savingProfile={savingProfile}
              savingPassword={savingPassword}
              onProfileUpdate={handleProfileUpdate}
              onPasswordUpdate={handlePasswordUpdate}
              supabaseUser={supabaseUser}
            />
          </motion.div>
        )}

        {activeTab === "support" && (
          <motion.div
            key="support"
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AccountSupportView
              user={user}
              orders={orders}
              onGuideClick={handleGuideClick}
              onTabChange={setActiveTab}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AccountShell>
  );
}
