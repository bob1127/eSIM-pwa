"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Layout from "./Layout";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { useSession, signOut } from "next-auth/react";
import { isSettledOrderStatus } from "@/lib/refundPolicy";
import { resolveMemberEmail } from "@/lib/memberIdentity";
import { buildLoginUrl, getCurrentReturnPath } from "@/lib/authRedirect";
import AccountShell, { NavyPanel, MetricTile } from "@/components/account/AccountShell";
import AccountDashboardView from "@/components/account/AccountDashboardView";
import AccountOrdersView from "@/components/account/AccountOrdersView";
import AccountTrafficView from "@/components/account/AccountTrafficView";
import AccountSettingsView from "@/components/account/AccountSettingsView";
import AccountSupportView from "@/components/account/AccountSupportView";
import AccountAdminDashboardView from "@/components/account/AccountAdminDashboardView";

/* ========== 輔助工具 ========== */
const formatNTDNoDecimals = (val) => {
  if (val == null) return "0";
  return Math.round(Number(val)).toLocaleString("zh-TW");
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusConfig = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "completed")
    return {
      label: "已發貨",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  if (s === "pending")
    return {
      label: "待付款",
      color: "bg-amber-100 text-amber-700 border-amber-200",
    };
  if (s === "cancelled")
    return {
      label: "已取消",
      color: "bg-slate-100 text-slate-600 border-slate-200",
    };
  if (s === "failed")
    return {
      label: "付款失敗",
      color: "bg-red-100 text-red-700 border-red-200",
    };
  if (s === "refund_pending")
    return {
      label: "退款審核中",
      color: "bg-amber-100 text-amber-800 border-amber-200",
    };
  if (s === "refunded")
    return {
      label: "已退款",
      color: "bg-slate-100 text-slate-600 border-slate-200",
    };
  return {
    label: status,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  };
};

/* ========== 主元件 ========== */
export default function AccountPage() {
  const router = useRouter();

  const { data: session, status: navStatus } = useSession();
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [isSupabaseChecked, setIsSupabaseChecked] = useState(false);

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTabRaw] = useState("dashboard");
  const [initialDetailOrder, setInitialDetailOrder] = useState(null);

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
      const tab = e.state?.tab || window.location.hash.replace("#", "") || "dashboard";
      setActiveTabRaw(tab);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const [userRole, setUserRole] = useState("customer");
  const [partnerData, setPartnerData] = useState(null);

  // 🌟 Admin 狀態
  const [adminStats, setAdminStats] = useState({
    revenue: 0,
    orderCount: 0,
    partnerCount: 0,
  });
  const [adminAllOrders, setAdminAllOrders] = useState([]);
  const [adminSubTab, setAdminSubTab] = useState("partners");
  const [selectedAdminStoreId, setSelectedAdminStoreId] = useState(null);

  // 🌟 Partner 店長專屬狀態
  const [partnerStats, setPartnerStats] = useState({
    profit: 0,
    orderCount: 0,
  });
  const [partnerAllOrders, setPartnerAllOrders] = useState([]);
  const [partnerCoupons, setPartnerCoupons] = useState([]);
  const [partnerStoreInfo, setPartnerStoreInfo] = useState(null);
  const [partnerSubTab, setPartnerSubTab] = useState("my_orders");
  const [statsLoading, setStatsLoading] = useState(false);

  // 店長：新增折扣碼狀態
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "fixed",
    discount_value: "",
  });
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // 🌟 核心新增：店長修改商店設定狀態
  const [editStoreName, setEditStoreName] = useState("");
  const [savingStore, setSavingStore] = useState(false);

  // 個人資料編輯狀態
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const groupedStores = useMemo(() => {
    if (!adminAllOrders || adminAllOrders.length === 0) return [];
    const storeMap = {};
    adminAllOrders.forEach((order) => {
      const sId = order.store_id || "official";
      if (!storeMap[sId]) {
        storeMap[sId] = {
          store_id: sId,
          store_name: order.stores?.store_name || "官方主站",
          orderCount: 0,
          totalRevenue: 0,
          totalProfit: 0,
          orders: [],
        };
      }
      storeMap[sId].orderCount += 1;
      storeMap[sId].totalRevenue += Number(order.total_amount) || 0;
      storeMap[sId].totalProfit += Number(order.partner_profit) || 0;
      storeMap[sId].orders.push(order);
    });
    return Object.values(storeMap).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );
  }, [adminAllOrders]);

  const handleGuideClick = () => {
    if (typeof window === "undefined") return;
    const isAndroid = /android/i.test(
      navigator.userAgent || navigator.vendor || window.opera,
    );
    router.push(isAndroid ? "/operation-android" : "/operation-ios");
  };

  useEffect(() => {
    const checkSupabaseAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setSupabaseUser(user);
      setIsSupabaseChecked(true);
    };
    checkSupabaseAuth();
  }, []);

  useEffect(() => {
    if (navStatus === "loading" || !isSupabaseChecked) return;
    const isLoggedIn = navStatus === "authenticated" || !!supabaseUser;
    if (!isLoggedIn) {
      router.push(buildLoginUrl(getCurrentReturnPath("/account")));
      return;
    }

    // 🚀 核心升級：雙棲背景同步 Medusa 魔法
    const syncWithMedusa = async () => {
      try {
        let syncPayload = null;

        // 判斷 A: Supabase 登入 (Google/Email)
        if (supabaseUser) {
          const {
            data: { session: supaSession },
          } = await supabase.auth.getSession();
          if (supaSession) {
            syncPayload = {
              email: supabaseUser.email,
              id: supabaseUser.id,
              token: supaSession.access_token,
              provider: "supabase",
            };
          }
        }
        // 判斷 B: NextAuth 登入 (LINE)
        else if (session?.user) {
          syncPayload = {
            email: resolveMemberEmail({ sessionUser: session.user }),
            id: session.user.id || "line_user",
            provider: "line",
          };
        }

        if (syncPayload) {
          const res = await fetch("/api/medusa/sync-customer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(syncPayload),
          });

          const data = await res.json();
          if (data.success && data.medusaCustomerId) {
            console.log(
              "✅ [背景同步] Medusa 綁定成功！Customer ID:",
              data.medusaCustomerId,
            );
            // 存進 localStorage，等一下結帳 API 可以抓出來用
            localStorage.setItem("medusa_customer_id", data.medusaCustomerId);
          }
        }
      } catch (err) {
        console.error("❌ Medusa 背景同步失敗:", err);
      }
    };

    // 觸發背景同步
    syncWithMedusa();

    // 整合 currentUser 狀態 (支援雙邊)
    const memberEmail = resolveMemberEmail({
      supabaseUser,
      sessionUser: session?.user,
    });
    const currentUser = {
      id: supabaseUser?.id || session?.user?.id || "line_user",
      name: supabaseUser?.user_metadata?.full_name || session?.user?.name,
      email: memberEmail,
      image: supabaseUser?.user_metadata?.avatar_url || session?.user?.image,
      phone: supabaseUser?.user_metadata?.phone || session?.user?.phone || "",
    };

    setUser(currentUser);
    setEditingName(currentUser.name || "");
    setEditingPhone(currentUser.phone || "");

    // 用 Email 載入後續資料
    if (currentUser.email) {
      loadOrders(currentUser.email);
      checkUserRole(currentUser.email, currentUser.id);
    }
  }, [navStatus, isSupabaseChecked, supabaseUser, session, router]);

  const checkUserRole = async (email, authUserId) => {
    if (email === "bob112722761236tom@gmail.com") {
      setUserRole("admin");
      loadAdminData();
      return;
    }
    try {
      const { data: partner, error } = await supabase
        .from("partners")
        .select("id, name, slug, cooperation_model, status")
        .eq("email", email)
        .single();
      if (partner && !error) {
        setUserRole("partner");
        setPartnerData(partner);
        loadPartnerData(partner.id, authUserId);
      }
    } catch (err) {
      console.log("此用戶非分店夥伴");
    }
  };

  // 🚀 升級版：呼叫專屬 API 撈取訂單 (支援雙棲登入)
  const loadOrders = async (email) => {
    setOrdersLoading(true);
    try {
      let headers = { "Content-Type": "application/json" };

      // 判斷：如果是 Supabase 登入的客人，就把 Token 放進標頭讓 API 驗證
      if (supabaseUser) {
        const {
          data: { session: supaSession },
        } = await supabase.auth.getSession();
        if (supaSession?.access_token) {
          headers["Authorization"] = `Bearer ${supaSession.access_token}`;
        }
      }

      // 呼叫我們等等要建的後端 API
      const res = await fetch(
        `/api/orders/user-orders?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          headers: headers,
        },
      );

      const result = await res.json();

      if (result.success) {
        setOrders(result.data || []);
      } else {
        console.error("撈取訂單失敗:", result.message);
        setOrders([]);
      }
    } catch (err) {
      console.error("系統撈取訂單發生異常:", err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const getAuthHeaders = async () => {
    const headers = {};
    if (supabaseUser) {
      const {
        data: { session: supaSession },
      } = await supabase.auth.getSession();
      if (supaSession?.access_token) {
        headers.Authorization = `Bearer ${supaSession.access_token}`;
      }
    }
    return headers;
  };

  const loadAdminData = async () => {
    setStatsLoading(true);
    try {
      const { data: allOrdersData } = await supabase
        .from("orders")
        .select(`*, stores ( store_name )`)
        .order("created_at", { ascending: false });
      const validOrders = (allOrdersData || []).filter((o) =>
        isSettledOrderStatus(o.status),
      );
      const totalRevenue = validOrders.reduce(
        (sum, order) => sum + (Number(order.total_amount) || 0),
        0,
      );
      const { count: pCount } = await supabase
        .from("partners")
        .select("*", { count: "exact", head: true });
      setAdminStats({
        revenue: totalRevenue,
        orderCount: validOrders.length,
        partnerCount: pCount || 0,
      });
      setAdminAllOrders(allOrdersData || []);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadPartnerData = async (partnerId, authUserId) => {
    if (!partnerId) return;
    setStatsLoading(true);
    try {
      const { data: partnerOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (partnerOrders) {
        setPartnerAllOrders(partnerOrders);
        const valid = partnerOrders.filter((o) => isSettledOrderStatus(o.status));
        const totalProfit = valid.reduce(
          (sum, order) => sum + (Number(order.partner_profit) || 0),
          0,
        );
        setPartnerStats({ profit: totalProfit, orderCount: valid.length });
      }

      const { data: coupons } = await supabase
        .from("coupons")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      setPartnerCoupons(coupons || []);

      if (authUserId) {
        const { data: store } = await supabase
          .from("stores")
          .select("*")
          .eq("user_id", authUserId)
          .single();
        if (store) {
          setPartnerStoreInfo(store);
          setEditStoreName(store.store_name || ""); // 🌟 初始化編輯狀態
        }
      }
    } catch (err) {
      console.error("讀取店鋪數據失敗:", err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  /* ====== 🌟 核心新增：店長儲存商店設定 ====== */
  const handleUpdateStoreSettings = async () => {
    if (!editStoreName.trim()) return alert("商店名稱不能為空！");
    setSavingStore(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ store_name: editStoreName })
        .eq("id", partnerStoreInfo.id);

      if (error) throw error;

      alert("✅ 商店設定已更新！前台已同步生效。");
      setPartnerStoreInfo({ ...partnerStoreInfo, store_name: editStoreName });

      // 同步更新左側 Sidebar 或大標題可能用到的 PartnerData 名稱 (可選)
      if (partnerData) setPartnerData({ ...partnerData, name: editStoreName });
    } catch (err) {
      alert("更新失敗：" + err.message);
    } finally {
      setSavingStore(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value)
      return alert("請填寫折扣碼與折扣數值");
    setIsCreatingCoupon(true);
    try {
      const { error } = await supabase.from("coupons").insert([
        {
          code: newCoupon.code.toUpperCase(),
          discount_type: newCoupon.discount_type,
          discount_value: Number(newCoupon.discount_value),
          partner_id: partnerData.id,
          is_active: true,
        },
      ]);
      if (error) {
        if (error.code === "23505")
          throw new Error("折扣碼已存在，請換一個代碼！");
        throw error;
      }
      alert("✅ 折扣碼建立成功！");
      setNewCoupon({ code: "", discount_type: "fixed", discount_value: "" });
      loadPartnerData(partnerData.id, user.id);
    } catch (err) {
      alert("建立失敗：" + err.message);
    } finally {
      setIsCreatingCoupon(false);
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
  const handleLogout = async () => {
    await signOut({ redirect: false });
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (navStatus === "loading" || !isSupabaseChecked) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen flex items-center justify-center bg-[#e8ecf1] text-slate-500">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#1E4AD1] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">驗證身分中…</p>
          </div>
        </div>
      </Layout>
    );
  }

  const isLoggedIn = navStatus === "authenticated" || !!supabaseUser;
  if (!isLoggedIn || !user) {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6] text-slate-500">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">導向登入頁…</p>
          </div>
        </div>
      </Layout>
    );
  }

  const completedOrders = orders.filter((o) => o.status === "completed");

  const navItems = [
    { id: "home", label: "回到首頁", icon: "home", href: "/" },
    { id: "dashboard", label: "首頁總覽", icon: "dashboard" },
    { id: "orders", label: "我的 eSIM 訂單", icon: "qr_code_2" },
    { id: "traffic", label: "查詢流量", icon: "speed" },
    ...(userRole === "admin"
      ? [{ id: "admin_dashboard", label: "系統總控", icon: "admin_panel_settings" }]
      : []),
    ...(userRole === "partner"
      ? [
          {
            id: "partner_portal",
            label: "夥伴後台",
            icon: "store",
            external: "/partner/dashboard",
          },
        ]
      : []),
    { id: "settings", label: "帳號設定", icon: "manage_accounts" },
    { id: "support", label: "安裝與支援", icon: "help_center" },
  ];

  const pageTitles = {
    dashboard: "首頁總覽",
    orders: "我的 eSIM 訂單",
    traffic: "查詢流量",
    admin_dashboard: "系統總控制台",
    partner_dashboard: "店鋪管理",
    settings: "帳號設定",
    support: "安裝與支援",
  };

  return (
    <Layout hideNavbar>
      <AccountShell
        title={pageTitles[activeTab] || "會員中心"}
        user={user}
        userRole={userRole}
        partnerData={partnerData}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        navItems={navItems}
        onLogout={handleLogout}
        orderBadge={orders.length}
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
              partnerData={partnerData}
              orders={orders}
              completedOrders={completedOrders}
              partnerStats={partnerStats}
              adminStats={adminStats}
              statsLoading={statsLoading}
              onTabChange={setActiveTab}
              onPartnerPortal={() => router.push("/partner/dashboard")}
            />
          </motion.div>
        )}

        {activeTab === "admin_dashboard" && userRole === "admin" && (
          <motion.div
            key="admin"
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AccountAdminDashboardView
              adminStats={adminStats}
              adminAllOrders={adminAllOrders}
              groupedStores={groupedStores}
              statsLoading={statsLoading}
            />
          </motion.div>
        )}

        {activeTab === "partner_dashboard" && userRole === "partner" && (
          <motion.div
            key="partner_dashboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6 w-full"
          >
            <div>
              <h2 className="text-2xl font-bold text-[#202223]">店鋪管理後台</h2>
              <p className="text-sm text-[#6d7175] mt-1">
                專屬 {partnerStoreInfo?.store_name || partnerData?.name} 的業績與設定
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricTile
                icon="account_balance_wallet"
                label="累積分潤"
                value={
                  statsLoading
                    ? "…"
                    : `NT$ ${formatNTDNoDecimals(partnerStats.profit)}`
                }
                accent="green"
              />
              <MetricTile
                icon="trending_up"
                label="成功推廣訂單"
                value={statsLoading ? "…" : partnerStats.orderCount}
                accent="blue"
              />
            </div>

            <NavyPanel title="店鋪管理" icon="store">
              <div className="flex border-b border-[#e1e3e5] -mt-2 -mx-5 px-5 mb-5">
                {[
                  { id: "my_orders", label: "本店訂單" },
                  { id: "coupons", label: "折扣碼" },
                  { id: "store_settings", label: "商店設定" },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setPartnerSubTab(sub.id)}
                    className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
                      partnerSubTab === sub.id
                        ? "border-[#008060] text-[#008060]"
                        : "border-transparent text-[#6d7175] hover:text-[#202223]"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
                      {partnerSubTab === "my_orders" && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm min-w-[520px]">
                            <thead>
                              <tr className="text-[11px] uppercase text-[#6d7175] border-b border-[#e1e3e5]">
                                <th className="pb-2 font-semibold">訂單 / 日期</th>
                                <th className="pb-2 font-semibold">金額</th>
                                <th className="pb-2 font-semibold">分潤</th>
                                <th className="pb-2 font-semibold text-center">狀態</th>
                              </tr>
                            </thead>
                            <tbody>
                              {statsLoading ? (
                                <tr>
                                  <td colSpan={4} className="py-8 text-center text-[#6d7175]">
                                    載入中…
                                  </td>
                                </tr>
                              ) : partnerAllOrders.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-8 text-center text-[#6d7175]">
                                    尚無推廣紀錄
                                  </td>
                                </tr>
                              ) : (
                                partnerAllOrders.map((order) => {
                                  const conf = statusConfig(order.status);
                                  return (
                                    <tr key={order.id} className="border-b border-[#f1f2f4]">
                                      <td className="py-3">
                                        <div className="font-mono font-semibold text-xs">
                                          #{order.id}
                                        </div>
                                        <div className="text-[11px] text-[#8c9196] mt-0.5">
                                          {formatDate(order.created_at)}
                                        </div>
                                      </td>
                                      <td className="py-3 font-semibold">
                                        NT$ {formatNTDNoDecimals(order.total_amount)}
                                      </td>
                                      <td className="py-3 font-semibold text-[#008060]">
                                        + NT$ {formatNTDNoDecimals(order.partner_profit)}
                                      </td>
                                      <td className="py-3 text-center">
                                        <span
                                          className={`text-[11px] font-bold px-2 py-0.5 rounded border ${conf.color}`}
                                        >
                                          {conf.label}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {partnerSubTab === "coupons" && (
                        <div className="space-y-4 max-w-lg">
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="折扣碼"
                              value={newCoupon.code}
                              onChange={(e) =>
                                setNewCoupon({ ...newCoupon, code: e.target.value })
                              }
                              className="px-3 py-2 border border-[#c9cccf] rounded-lg text-sm"
                            />
                            <input
                              type="number"
                              placeholder="折抵金額"
                              value={newCoupon.discount_value}
                              onChange={(e) =>
                                setNewCoupon({
                                  ...newCoupon,
                                  discount_value: e.target.value,
                                })
                              }
                              className="px-3 py-2 border border-[#c9cccf] rounded-lg text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateCoupon}
                            disabled={isCreatingCoupon}
                            className="px-4 py-2 bg-[#202223] text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                          >
                            {isCreatingCoupon ? "建立中…" : "新增折扣碼"}
                          </button>
                          {partnerCoupons.length > 0 && (
                            <ul className="divide-y divide-[#f1f2f4] text-sm">
                              {partnerCoupons.map((c) => (
                                <li key={c.id} className="py-2 flex justify-between">
                                  <span className="font-mono font-bold">{c.code}</span>
                                  <span className="text-[#6d7175]">
                                    -{c.discount_value}
                                    {c.discount_type === "percent" ? "%" : " 元"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {partnerSubTab === "store_settings" && (
                        <div className="max-w-xl space-y-4">
                          <p className="text-sm text-[#6d7175]">
                            修改店鋪名稱後將同步至專屬賣場前台。
                          </p>
                          {partnerStoreInfo ? (
                            <>
                              <div>
                                <label className="block text-xs font-semibold text-[#6d7175] mb-1">
                                  分店顯示名稱
                                </label>
                                <input
                                  type="text"
                                  value={editStoreName}
                                  onChange={(e) => setEditStoreName(e.target.value)}
                                  className="w-full px-3 py-2.5 border border-[#c9cccf] rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-[#6d7175] mb-1">
                                  專屬網址（不可修改）
                                </label>
                                <div className="flex items-center bg-[#f1f2f4] border border-[#e1e3e5] rounded-lg px-3 py-2.5 text-sm text-[#6d7175]">
                                  www.jeko-esim.com.tw/p/{partnerStoreInfo.domain}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleUpdateStoreSettings}
                                disabled={
                                  savingStore ||
                                  editStoreName === partnerStoreInfo.store_name
                                }
                                className="px-5 py-2.5 bg-[#008060] text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                              >
                                {savingStore ? "儲存中…" : "儲存設定"}
                              </button>
                            </>
                          ) : (
                            <p className="text-sm text-[#b98900] bg-[#fff5ea] p-4 rounded-lg">
                              總部審核中，或尚未開通專屬網址。
                            </p>
                          )}
                        </div>
                      )}
            </NavyPanel>
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
          <motion.div key="settings" className="w-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AccountSettingsView
              user={user}
              userRole={userRole}
              partnerData={partnerData}
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
          <motion.div key="support" className="w-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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
    </Layout>
  );
}
