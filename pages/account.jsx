"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "./Layout";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

// 🚀 關鍵引入：匯入 NextAuth 的 hook 與方法
import { useSession, signOut } from "next-auth/react";

import {
  UserIcon,
  QrCodeIcon,
  Cog6ToothIcon,
  LifebuoyIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

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
      label: "等待付款中",
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
  return {
    label: status,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  };
};

// 🚀 強化的 QR Code 解析防呆工具
const getEsimQRCodes = (order) => {
  if (!order || !order.qrcode_data) return [];
  let data = order.qrcode_data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  if (data && typeof data === "object" && !Array.isArray(data)) data = [data];

  if (Array.isArray(data)) {
    return data
      .map((item) => {
        const rawSrcString = String(item.qrcodeUrl || item.src || "");
        const cleanSrc = rawSrcString.split(",")[0].trim();
        return {
          name: item.productName || item.name || "eSIM 方案",
          src: cleanSrc,
          topupId: item.topupId || item.topup_id || "無系統單號",
        };
      })
      .filter((item) => item.src);
  }
  return [];
};

/* ========== 主元件 ========== */
export default function AccountPage() {
  const router = useRouter();

  // 🚀 關鍵修改 1：使用 NextAuth 的 useSession 來取得登入狀態
  const { data: session, status } = useSession();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");

  // 個人資料編輯狀態
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // 密碼變更狀態
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  /* ====== 初始化與抓取資料 ====== */
  // 🚀 關鍵修改 2：將 Supabase 驗證改為 NextAuth 驗證
  useEffect(() => {
    // 1. 如果還在讀取狀態，先不動作
    if (status === "loading") return;

    // 2. 如果確定未登入，強制跳轉回登入頁
    if (status === "unauthenticated" || !session) {
      router.push("/login");
      return;
    }

    // 3. 如果確定已登入，將資料寫入狀態並開始抓訂單
    if (status === "authenticated" && session.user) {
      const currentUser = session.user;
      setUser(currentUser);

      // 兼容 LINE 登入(session.user.name) 和 Supabase 登入的資料格式
      setEditingName(
        currentUser.name || currentUser.user_metadata?.full_name || "",
      );
      setEditingPhone(
        currentUser.phone || currentUser.user_metadata?.phone || "",
      );

      // 使用 Email 去撈訂單
      if (currentUser.email) {
        loadOrders(currentUser.email);
      } else {
        setLoading(false); // 如果連 email 都沒有(極端情況)，直接取消 loading
      }
    }
  }, [status, session, router]);

  const loadOrders = async (email) => {
    setOrdersLoading(true);
    try {
      // 確保抓取所有訂單，並依時間排序
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", email)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("❌ 讀取訂單失敗:", err.message);
    } finally {
      setOrdersLoading(false);
      setLoading(false);
    }
  };

  /* ====== 更新功能 ====== */
  const handleProfileUpdate = async () => {
    setSavingProfile(true);
    try {
      // 注意：這裡如果你要更新 Supabase，可能需要自己寫 API Route 處理
      // 因為前端直接用 supabase.auth.updateUser 可能對 NextAuth 使用者無效
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: editingName, phone: editingPhone },
      });
      if (error) throw error;
      setUser(data.user);
      alert("✅ 基本資料更新成功！");
    } catch (err) {
      alert("更新失敗：" + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) return alert("密碼至少需要 6 個字元");
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      alert("✅ 密碼修改成功！請妥善保管新密碼。");
      setNewPassword("");
    } catch (err) {
      alert("密碼修改失敗：" + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  // 🚀 關鍵修改 3：登出時改用 NextAuth 的 signOut
  const handleLogout = async () => {
    // redirect: false 讓我們可以自己控制登出後的跳轉
    await signOut({ redirect: false });
    // 如果你還是希望順便清空 Supabase 舊引擎的狀態，可以保留下面這行
    await supabase.auth.signOut();
    router.push("/login");
  };

  // 🚀 關鍵修改 4：確保 status === loading 時也顯示載入中動畫
  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p>載入會員資料中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const completedOrders = orders.filter((o) => o.status === "completed");

  return (
    <Layout>
      <div className="min-h-screen w-full bg-[#F4F7FB] px-4 py-24 sm:py-32">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-8">
          {/* 左側 Sidebar導覽列 */}
          <aside className="w-full lg:w-[280px] shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky top-24">
              <div className="p-6 bg-gradient-to-br from-sky-500 to-blue-600 text-white text-center">
                {/* 🚀 相容 LINE 的大頭貼顯示邏輯 */}
                {user?.image ? (
                  <img
                    src={user.image}
                    alt="Avatar"
                    className="w-16 h-16 mx-auto rounded-full border-2 border-white/20 shadow-inner mb-3 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-3 text-2xl font-bold uppercase shadow-inner">
                    {user?.name?.charAt(0) ||
                      user?.user_metadata?.full_name?.charAt(0) ||
                      user?.email?.charAt(0)}
                  </div>
                )}

                <h2 className="text-lg font-bold truncate">
                  {user?.name || user?.user_metadata?.full_name || "會員"}
                </h2>
                <p className="text-xs text-sky-100 truncate mt-1">
                  {user?.email}
                </p>
              </div>

              <nav className="p-3 flex flex-col gap-1">
                {[
                  { id: "dashboard", label: "帳號總覽", icon: UserIcon },
                  { id: "orders", label: "我的 eSIM (訂單)", icon: QrCodeIcon },
                  { id: "settings", label: "設定與安全", icon: Cog6ToothIcon },
                  { id: "support", label: "安裝與支援", icon: LifebuoyIcon },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? "bg-sky-50 text-sky-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <tab.icon
                      className={`w-5 h-5 ${activeTab === tab.id ? "text-sky-500" : "text-slate-400"}`}
                    />
                    {tab.label}
                  </button>
                ))}
                <div className="h-px bg-slate-100 my-2 mx-2" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-400" />
                  安全登出
                </button>
              </nav>
            </div>
          </aside>

          {/* 右側主內容區 */}
          <main className="flex-1 min-h-[500px]">
            <AnimatePresence mode="wait">
              {/* 1. 總覽 Dashboard */}
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <QrCodeIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-800">
                          {completedOrders.length}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 uppercase">
                          有效 eSIM 數
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircleIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-800">
                          {orders.length}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 uppercase">
                          歷史訂單總數
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                      最近訂單
                    </h3>
                    {ordersLoading ? (
                      <p className="text-sm text-slate-500">讀取中...</p>
                    ) : orders.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-xl">
                        <p className="text-slate-500 text-sm mb-4">
                          您目前還沒有任何購買紀錄。
                        </p>
                        <button
                          onClick={() => router.push("/product")}
                          className="px-6 py-2 bg-sky-500 text-white rounded-full text-sm font-semibold shadow-md hover:bg-sky-600 transition"
                        >
                          前往選購 eSIM
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.slice(0, 3).map((order) => {
                          const conf = statusConfig(order.status);
                          return (
                            <div
                              key={order.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-xl hover:shadow-md transition bg-slate-50/50"
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  單號 #{order.id.substring(0, 8)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {formatDate(order.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 mt-3 sm:mt-0">
                                <span className="font-bold text-slate-800">
                                  NT$ {formatNTDNoDecimals(order.total_amount)}
                                </span>
                                <span
                                  className={`px-2.5 py-1 text-xs font-bold rounded-md border ${conf.color}`}
                                >
                                  {conf.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {orders.length > 3 && (
                          <button
                            onClick={() => setActiveTab("orders")}
                            className="w-full py-3 text-sm font-semibold text-sky-600 hover:text-sky-700 transition"
                          >
                            查看全部訂單 &rarr;
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* 2. 我的 eSIM (項目式詳細訂單 + 待付款功能) */}
              {activeTab === "orders" && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-black text-slate-800">
                    我的 eSIM 與訂單
                  </h2>

                  {ordersLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-48 bg-white rounded-2xl border border-slate-100" />
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-slate-500">尚無購買紀錄。</p>
                  ) : (
                    <div className="space-y-5">
                      {orders.map((order) => {
                        const codes = getEsimQRCodes(order);
                        const conf = statusConfig(order.status);
                        // 假設你將藍新的回傳資訊存在 payment_info 欄位中
                        const paymentInfo = order.payment_info || {};

                        return (
                          <div
                            key={order.id}
                            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                          >
                            {/* 訂單 Header */}
                            <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600">
                                  <ClockIcon className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Order ID: {order.id}
                                  </p>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {formatDate(order.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 self-start sm:self-auto">
                                <div className="text-right hidden sm:block">
                                  <p className="text-[11px] font-bold text-slate-400 uppercase">
                                    總金額
                                  </p>
                                  <p className="text-sm font-bold text-slate-800">
                                    NT${" "}
                                    {formatNTDNoDecimals(order.total_amount)}
                                  </p>
                                </div>
                                <span
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border shadow-sm ${conf.color}`}
                                >
                                  {conf.label}
                                </span>
                              </div>
                            </div>

                            {/* 🚨 待付款 (Pending) 專屬 UI 面板 */}
                            {order.status === "pending" && (
                              <div className="p-5 border-b border-amber-100 bg-amber-50/30">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-amber-100 text-amber-600 rounded-full shrink-0 mt-0.5">
                                    <InformationCircleIcon className="w-5 h-5" />
                                  </div>
                                  <div className="w-full">
                                    <h4 className="font-bold text-slate-800 text-sm">
                                      訂單等待付款中
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed max-w-lg">
                                      若您選擇超商代碼或 ATM
                                      轉帳，請於期限內完成繳費，系統將於確認收款後自動發送
                                      eSIM QR
                                      Code。若需重新結帳，請點擊下方按鈕。
                                    </p>

                                    {/* 藍新繳費資訊區塊 (自動解析 PaymentNo 或 BankCode) */}
                                    {(paymentInfo.PaymentNo ||
                                      paymentInfo.BankCode) && (
                                      <div className="mb-4 flex flex-wrap gap-3">
                                        {paymentInfo.PaymentNo && (
                                          <div className="bg-white px-4 py-2.5 rounded-lg border border-amber-200 shadow-sm">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                                              超商繳費代碼
                                            </p>
                                            <p className="font-mono font-bold text-slate-700 tracking-wider text-base">
                                              {paymentInfo.PaymentNo}
                                            </p>
                                          </div>
                                        )}
                                        {paymentInfo.BankCode &&
                                          paymentInfo.CodeNo && (
                                            <div className="bg-white px-4 py-2.5 rounded-lg border border-amber-200 shadow-sm">
                                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                                                ATM 轉帳帳號 (
                                                {paymentInfo.BankCode})
                                              </p>
                                              <p className="font-mono font-bold text-slate-700 tracking-wider text-base">
                                                {paymentInfo.CodeNo}
                                              </p>
                                            </div>
                                          )}
                                      </div>
                                    )}

                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/checkout?orderId=${order.id}`,
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition shadow-sm"
                                    >
                                      <CreditCardIcon className="w-4 h-4" />
                                      {paymentInfo.PaymentNo ||
                                      paymentInfo.BankCode
                                        ? "前往重新結帳"
                                        : "前往付款"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ✅ 已完成 eSIM 項目明細 (發貨成功才顯示) */}
                            {order.status === "completed" && (
                              <div className="p-5">
                                {codes.length > 0 ? (
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {codes.map((code, i) => (
                                      <div
                                        key={i}
                                        className="flex gap-4 p-4 rounded-xl border border-sky-100 bg-sky-50/30 relative overflow-hidden"
                                      >
                                        {/* QR Code 顯示區塊 (套用安全切割邏輯) */}
                                        <div className="w-28 h-28 shrink-0 bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center z-10">
                                          <img
                                            src={code.src}
                                            alt="eSIM QR"
                                            className="w-full h-full object-contain"
                                          />
                                        </div>

                                        <div className="flex flex-col justify-between py-1 z-10 w-full">
                                          <div>
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 mb-1">
                                              eSIM {i + 1}
                                            </span>
                                            <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 pr-2">
                                              {code.name}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 font-mono bg-white/60 px-1.5 py-0.5 rounded inline-block">
                                              單號: {code.topupId}
                                            </p>
                                          </div>
                                          <button
                                            onClick={() =>
                                              setActiveTab("support")
                                            }
                                            className="text-left text-xs font-semibold text-sky-600 hover:text-sky-800 underline underline-offset-2 mt-2 self-start"
                                          >
                                            查看安裝教學
                                          </button>
                                        </div>

                                        {/* 裝飾背景 */}
                                        <QrCodeIcon className="absolute -right-4 -bottom-4 w-24 h-24 text-sky-100/50 -rotate-12 z-0 pointer-events-none" />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="py-2 text-sm text-slate-500 flex items-center gap-2">
                                    <InformationCircleIcon className="w-5 h-5 text-slate-400" />
                                    此訂單無數位 eSIM
                                    記錄（可能為實體商品或發貨異常，請聯繫客服）。
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* 3. 設定與安全 (基本資料 & 密碼修改) */}
              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* 基本資料修改 */}
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-1">
                      基本資料
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                      更新您的聯絡資訊以確保能順利收到訂單通知。
                    </p>

                    <div className="space-y-5 max-w-md">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                          登入信箱 (不可修改)
                        </label>
                        <input
                          value={user.email}
                          disabled
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border-none text-slate-500 cursor-not-allowed text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                          顯示姓名
                        </label>
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="請輸入姓名"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                          聯絡電話
                        </label>
                        <input
                          value={editingPhone}
                          onChange={(e) => setEditingPhone(e.target.value)}
                          placeholder="請輸入手機號碼"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition"
                        />
                      </div>
                      <button
                        onClick={handleProfileUpdate}
                        disabled={savingProfile}
                        className="w-full sm:w-auto px-8 py-2.5 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition shadow-sm"
                      >
                        {savingProfile ? "儲存中..." : "儲存變更"}
                      </button>
                    </div>
                  </section>

                  {/* 密碼修改 */}
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-1">
                      修改密碼
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                      定期更新您的密碼以保持帳號安全。
                    </p>

                    <div className="space-y-5 max-w-md">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                          新密碼
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="至少輸入 6 位新密碼"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition"
                        />
                      </div>
                      <button
                        onClick={handlePasswordUpdate}
                        disabled={savingPassword || !newPassword}
                        className="w-full sm:w-auto px-8 py-2.5 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-900 transition shadow-sm disabled:bg-slate-300"
                      >
                        {savingPassword ? "更新中..." : "確認修改密碼"}
                      </button>
                    </div>
                  </section>
                </motion.div>
              )}

              {/* 4. 支援與安裝教學 */}
              {activeTab === "support" && (
                <motion.div
                  key="support"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-black text-slate-800">
                    安裝與支援
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                      onClick={() => router.push("/operation-shopee")}
                    >
                      <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-4">
                        <QrCodeIcon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-2">
                        iOS / iPhone 安裝教學
                      </h3>
                      <p className="text-sm text-slate-500">
                        查看圖文並茂的 iPhone eSIM 加入指南，掃描即可啟用。
                      </p>
                    </div>

                    <div
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition cursor-pointer"
                      onClick={() => window.open("https://line.me/", "_blank")}
                    >
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                        <LifebuoyIcon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-2">
                        專人線上支援
                      </h3>
                      <p className="text-sm text-slate-500">
                        掃描失敗或連不上網路？點擊聯絡我們的 LINE
                        官方客服協助您。
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </Layout>
  );
}
