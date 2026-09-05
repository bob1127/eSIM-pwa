"use client";

import React, { useState } from "react";
import {
  Bell,
  ChevronUp,
  ChevronDown,
  Info,
  ArrowLeftRight,
  EyeOff,
  QrCode,
  MapPin,
  Landmark,
  Receipt,
  ShoppingBag,
  Plane,
  Gift,
  Home,
  Utensils,
  MessageCircle,
  PlaySquare,
  Newspaper,
  CreditCard,
  ChevronRight,
} from "lucide-react";

export default function MemberDashboard() {
  // 控制綠色與白色卡片的展開/收合狀態
  const [isGreenExpanded, setIsGreenExpanded] = useState(true);
  const [isWhiteExpanded, setIsWhiteExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("購物");

  // 服務網格資料
  const services = [
    { icon: <CreditCard className="w-6 h-6" />, label: "LINE Pay" },
    { icon: <MapPin className="w-6 h-6" />, label: "好康地圖" },
    { icon: <Landmark className="w-6 h-6" />, label: "LINE Bank" },
    {
      icon: <span className="font-bold text-lg">P</span>,
      label: "LINE POINTS",
      badge: "點數回饋",
    },
    { icon: <Receipt className="w-6 h-6" />, label: "發票管家" },
    {
      icon: <ShoppingBag className="w-6 h-6" />,
      label: "LINE 購物",
      dot: true,
    },
    { icon: <Plane className="w-6 h-6" />, label: "LINE 旅遊", dot: true },
    { icon: <Gift className="w-6 h-6" />, label: "LINE 禮物", dot: true },
    { icon: <Home className="w-6 h-6" />, label: "MINI Home", badge: "訂餐廳" },
    { icon: <Utensils className="w-6 h-6" />, label: "吃喝玩樂" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 pb-20 md:pb-8">
      {/* 頂部導覽列 (全裝置共用) */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-5 py-3 flex justify-between items-center md:px-10 md:py-4 md:shadow-sm">
        <h1 className="text-xl md:text-[24px] font-bold tracking-wider">錢包</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-green-100 text-[#00C300] px-2 py-0.5 rounded-full text-sm font-bold">
            <span className="w-4 h-4 bg-[#00C300] text-white rounded-full flex items-center justify-center text-[10px] mr-1">
              P
            </span>
            1
          </div>
          <button className="relative">
            <Bell className="w-6 h-6 text-stone-900" />
            <span className="absolute 0 right-0 w-2 h-2 bg-[#00C300] rounded-full border border-white"></span>
          </button>
        </div>
      </header>

      {/* 內容佈局：手機版單欄，電腦版雙欄 (Dashboard 佈局) */}
      <main className="max-w-7xl mx-auto md:px-6 md:py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* ================= 左欄：資產卡片 & 服務網格 ================= */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-6 px-4 pt-4 md:px-0 md:pt-0">
          {/* 混合資產卡片 */}
          <div className="rounded-2xl shadow-sm bg-white overflow-hidden border border-gray-100">
            {/* 綠色上半部 (LINE Pay) */}
            <div className="bg-[#098cdd] text-white transition-all duration-300 ease-in-out">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-lg tracking-wider">
                    NT$ ******
                  </span>
                </div>
                <div className="flex items-center gap-3 opacity-90">
                  <Info className="w-5 h-5 cursor-pointer hover:opacity-70" />
                  <ArrowLeftRight className="w-5 h-5 cursor-pointer hover:opacity-70" />
                  <button
                    onClick={() => setIsGreenExpanded(!isGreenExpanded)}
                    className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
                  >
                    {isGreenExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 綠色展開內容 */}
              {isGreenExpanded && (
                <div className="px-4 pb-4 pt-2 grid grid-cols-3 gap-2 text-center text-sm font-medium">
                  <button className="flex items-center justify-center gap-1.5 hover:bg-white/10 py-2 rounded-lg transition">
                    <Plane className="w-4 h-4" />
                    出遊投保
                  </button>
                  <button className="flex items-center justify-center gap-1.5 hover:bg-white/10 py-2 rounded-lg transition">
                    <Landmark className="w-4 h-4" />
                    高利活存
                  </button>
                  <button className="flex items-center justify-center gap-1.5 hover:bg-white/10 py-2 rounded-lg transition">
                    <Receipt className="w-4 h-4" />
                    快速貸款
                  </button>
                </div>
              )}
            </div>

            {/* 白色下半部 (LINE Bank) */}
            <div className="bg-white transition-all duration-300 ease-in-out">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Landmark className="w-6 h-6 text-[#00C300]" />
                  </div>
                  <span className="font-bold text-lg tracking-wider text-gray-900">
                    NT$ ******
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <EyeOff className="w-5 h-5 cursor-pointer hover:text-gray-900" />
                  <QrCode className="w-5 h-5 cursor-pointer hover:text-gray-900" />
                  <button
                    onClick={() => setIsWhiteExpanded(!isWhiteExpanded)}
                    className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
                  >
                    {isWhiteExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 白色展開內容 */}
              {isWhiteExpanded && (
                <div className="px-4 pb-4 pt-2 grid grid-cols-3 gap-2 text-center text-sm font-medium text-stone-900 border-t border-gray-50 pt-4 mt-2">
                  <button className="flex items-center justify-center gap-1.5 hover:bg-gray-50 py-2 rounded-lg transition">
                    <ArrowLeftRight className="w-4 h-4" />
                    轉帳
                  </button>
                  <button className="flex items-center justify-center gap-1.5 hover:bg-gray-50 py-2 rounded-lg transition">
                    <Receipt className="w-4 h-4" />
                    繳費
                  </button>
                  <button className="flex items-center justify-center gap-1.5 hover:bg-gray-50 py-2 rounded-lg transition">
                    <Newspaper className="w-4 h-4" />
                    交易紀錄
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 服務網格 (Icon Grid) */}
          <div className="grid grid-cols-5 gap-y-6 gap-x-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            {services.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="relative w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 bg-white group-hover:bg-gray-50 transition">
                  {item.icon}
                  {item.badge && (
                    <span className="absolute -top-2.5 -right-3 bg-[#00C300] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm z-10">
                      {item.badge}
                    </span>
                  )}
                  {item.dot && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00C300] rounded-full border-2 border-white"></span>
                  )}
                </div>
                <span className="text-[11px] text-gray-600 text-center whitespace-nowrap group-hover:text-gray-900">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ================= 右欄：廣告、頁籤、內容區塊 ================= */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col px-4 md:px-0">
          {/* 廣告橫幅 */}
          <div className="flex gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-6 cursor-pointer hover:shadow-md transition">
            <div className="w-28 h-28 shrink-0 bg-pink-100 rounded-xl overflow-hidden relative">
              {/* 模擬圖片 */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-pink-500 text-xs font-bold p-2 text-center">
                AD 班後來約會吧
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-sm md:text-base font-bold text-gray-900 leading-snug mb-1">
                上班族認真想談戀愛？單身聯誼活動優惠中🌸
              </h3>
              <p className="text-xs text-gray-500 mb-2">戀愛生活館</p>
              <span className="text-sm text-blue-500 flex items-center hover:underline">
                將官方帳號加入好友 <ChevronRight className="w-4 h-4 ml-0.5" />
              </span>
            </div>
          </div>

          {/* 內容頁籤 (Tabs) */}
          <div className="flex gap-6 border-b border-gray-200 mb-6 px-1 overflow-x-auto hide-scrollbar">
            {["購物", "LINE Pay", "LINE Bank", "生活優惠"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm md:text-base font-bold whitespace-nowrap transition-colors relative ${
                  activeTab === tab
                    ? "text-gray-900"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-t-full"></span>
                )}
              </button>
            ))}
          </div>

          {/* 推薦內容區塊 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-1">
                LINE 購物-經典免費貼圖 ✨
              </h2>
              <ChevronRight className="w-5 h-5 text-gray-400 cursor-pointer" />
            </div>

            {/* 橫向滑動區塊 */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {/* 假卡片 1 */}
              <div className="snap-start shrink-0 w-[140px] md:w-[180px] cursor-pointer group">
                <div className="w-full aspect-square bg-red-50 rounded-xl mb-2 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-red-200 transition">
                  <span className="font-bold text-red-400 text-sm">
                    買給我♡
                  </span>
                </div>
              </div>
              {/* 假卡片 2 */}
              <div className="snap-start shrink-0 w-[140px] md:w-[180px] cursor-pointer group">
                <div className="w-full aspect-square bg-blue-50 rounded-xl mb-2 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-blue-200 transition">
                  <span className="font-bold text-blue-400 text-sm">
                    求求您了
                  </span>
                </div>
              </div>
              {/* 假卡片 3 */}
              <div className="snap-start shrink-0 w-[140px] md:w-[180px] cursor-pointer group">
                <div className="w-full aspect-square bg-amber-50 rounded-xl mb-2 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-amber-200 transition">
                  <span className="font-bold text-amber-500 text-sm">
                    好想吃
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ================= 底部導覽列 (僅限手機版顯示) ================= */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe z-50">
        <div className="flex justify-around items-center pt-2 pb-1">
          <button className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-gray-900">
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">主頁</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-gray-900 relative">
            <MessageCircle className="w-6 h-6" />
            <span className="absolute top-0 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full">
              276
            </span>
            <span className="text-[10px] font-bold">聊天</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-gray-900 relative">
            <PlaySquare className="w-6 h-6" />
            <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            <span className="text-[10px] font-bold">VOOM</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-gray-900 relative">
            <Newspaper className="w-6 h-6" />
            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            <span className="text-[10px] font-bold uppercase">Today</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 text-gray-900">
            <CreditCard className="w-6 h-6 fill-current" />
            <span className="text-[10px] font-bold">錢包</span>
          </button>
        </div>
      </nav>

      {/* 隱藏捲軸的輔助 CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `,
        }}
      />
    </div>
  );
}
