"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Layout from "./Layout";
import {
  ChevronRightIcon,
  HandThumbUpIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import Marquee from "react-marquee-slider";

export default function Home() {
  const subNews = [
    {
      id: 1,
      title: "相關合作條款",
      date: "2023.12.20",
      category: "合作須知",
    },
    {
      id: 2,
      title: "專屬分潤機制",
      date: "2023.11.02",
      category: "每筆訂單皆可獲得合作收益。",
    },
    {
      id: 2,
      title: "專人協助",
      date: "2023.11.02",
      category: "提供客服與合作支援。",
    },
  ];
  // 🌟 跑馬燈假資料 (大頭貼 & Logo)
  const marqueeItems = [
    { type: "avatar", src: "https://i.pravatar.cc/150?u=student1" },
    { type: "logo", src: "https://via.placeholder.com/150x50?text=Travel+Co" },
    { type: "avatar", src: "https://i.pravatar.cc/150?u=freelancer1" },
    {
      type: "logo",
      src: "https://via.placeholder.com/150x50?text=Hotel+Group",
    },
    { type: "avatar", src: "https://i.pravatar.cc/150?u=student2" },
    { type: "logo", src: "https://via.placeholder.com/150x50?text=Airline" },
    { type: "avatar", src: "https://i.pravatar.cc/150?u=freelancer2" },
    { type: "logo", src: "https://via.placeholder.com/150x50?text=Agency" },
  ];

  // 🌟 下方Banner區塊合作夥伴Logo (假資料)
  const partnerLogos = [
    {
      name: "JCB",
      src: "https://upload.wikimedia.org/wikipedia/commons/4/40/JCB_logo.svg",
    },
    {
      name: "VISA",
      src: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
    },
    {
      name: "Mastercard",
      src: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
    },
    {
      name: "Diners Club",
      src: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Diners_Club_Logo3.svg",
    },
    {
      name: "SAISON CARD",
      src: "https://upload.wikimedia.org/wikipedia/commons/d/df/Saison_Card_logo.svg",
    },
  ];

  return (
    <Layout>
      {/* =========================================
          🎯 全新設計：TSUNORU 風格 Hero Section 
      ========================================= */}
      <section className="relative w-full h-[600px] md:h-[750px] bg-[#F7F9FB] flex flex-col items-center justify-center overflow-hidden font-sans">
        {/* ================= 背景動態幾何圖形 (多樣化形狀) ================= */}
        {/* 左上角：黃色 C 型圓弧 */}
        <motion.div
          className="absolute top-[25%] left-[3%] md:left-[8%] w-[40px] md:w-[60px] h-[80px] md:h-[120px] border-t-[16px] md:border-t-[20px] border-l-[16px] md:border-l-[20px] border-b-[16px] md:border-b-[20px] border-[#FADE2B] rounded-l-full z-0"
          style={{ rotate: 15 }}
          animate={{ y: [-15, 15, -15], rotate: [15, 5, 15] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 左側：藍色實心小圓點 */}
        <motion.div
          className="absolute top-[60%] left-[12%] w-[20px] md:w-[30px] h-[20px] md:h-[30px] bg-[#0071EB] rounded-full z-0"
          animate={{ y: [10, -20, 10], x: [5, -5, 5] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 左下角：黃色 U 型圓弧 */}
        <motion.div
          className="absolute bottom-[20%] left-[18%] md:left-[25%] w-[70px] md:w-[100px] h-[35px] md:h-[50px] border-b-[16px] md:border-b-[20px] border-l-[16px] md:border-l-[20px] border-r-[16px] md:border-r-[20px] border-[#FADE2B] rounded-b-full z-0"
          style={{ rotate: 25 }}
          animate={{ y: [-10, 10, -10], rotate: [25, 35, 25] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 左下角：藍色四分之一圓弧 */}
        <motion.div
          className="absolute bottom-[35%] left-[6%] w-[40px] md:w-[60px] h-[40px] md:h-[60px] border-t-[16px] md:border-t-[20px] border-l-[16px] md:border-l-[20px] border-[#0071EB] rounded-tl-full z-0"
          animate={{ y: [10, -15, 10], rotate: [-10, 10, -10] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 右上角：黃色空心圓圈 */}
        <motion.div
          className="absolute top-[20%] right-[25%] md:right-[30%] w-[50px] md:w-[70px] h-[50px] md:h-[70px] border-[12px] md:border-[16px] border-[#FADE2B] rounded-full z-0 opacity-80"
          animate={{ y: [15, -15, 15], scale: [1, 1.05, 1] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 右上角：藍色長條 */}
        <motion.div
          className="absolute top-[15%] right-[10%] md:right-[15%] w-[50px] md:w-[70px] h-[16px] md:h-[22px] bg-[#1E4AD1] rounded-full z-0"
          style={{ rotate: -15 }}
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 右側：黃色小點 */}
        <motion.div
          className="absolute top-[45%] right-[8%] md:right-[12%] w-[12px] md:w-[16px] h-[12px] md:h-[16px] bg-[#FADE2B] rounded-full z-0"
          animate={{ y: [-20, 20, -20] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 右下角：藍色 ∩ 型圓弧 */}
        <motion.div
          className="absolute bottom-[25%] right-[15%] md:right-[22%] w-[80px] md:w-[120px] h-[40px] md:h-[60px] border-t-[18px] md:border-t-[24px] border-l-[18px] md:border-l-[24px] border-r-[18px] md:border-r-[24px] border-[#1E4AD1] rounded-t-full z-0"
          style={{ rotate: 10 }}
          animate={{ y: [-15, 15, -15], rotate: [10, -5, 10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ================= 專屬產品圖片漂浮效果 ================= */}
        {/* 漂浮圖 1：左中位置 */}
        <motion.img
          src="/images/jeko-esim.png"
          alt="eSIM"
          className="absolute top-[45%] left-[-5%] md:left-[3%]  w-[100px] h-auto z-10   "
          animate={{ y: [-20, 20, -20], rotate: [-8, 2, -8] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 漂浮圖 2：右上位置 */}
        <motion.img
          src="/images/jeko-esim.png"
          alt="eSIM"
          className="absolute top-[5%] right-[-5%] md:right-[5%] z-10   w-[100px] h-auto"
          animate={{ y: [15, -15, 15], x: [10, -10, 10], rotate: [12, -5, 12] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* --- 主標題區塊 --- */}
        <div className="relative z-20 flex flex-col items-center text-center mt-[-60px]">
          <h2 className="text-[18px] md:text-[24px] font-bold text-[#111] mb-2 md:mb-4 tracking-widest">
            你最專業的夥伴
          </h2>
          <h1
            className="text-[64px] md:text-[110px] font-black text-[#111] leading-none mb-6 tracking-tight"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            Jeko eSIM
          </h1>
          <div className="flex items-center text-[11px] md:text-[13px] text-[#888] font-bold tracking-widest bg-white/50 px-4 py-1.5 rounded-full backdrop-blur-sm">
            <span>給您提供多方案的旅遊連線新選擇</span>
            <span className="mx-3 text-[#ccc]">|</span>
            <span>from 接口eSIM</span>
            {/* 小黃色 Logo 圓點 */}
            <span className="ml-2 flex items-center justify-center w-[16px] h-[16px] md:w-[18px] md:h-[18px] bg-[#FADE2B] rounded-full text-white text-[8px] font-bold leading-none">
              ツ
            </span>
          </div>
        </div>

        {/* --- 🎯 右下角浮動懸浮窗 (完美還原設計圖 UI) --- */}
        <motion.div
          className="absolute bottom-6 right-6 md:bottom-12 md:right-12 z-30 flex flex-col items-start"
          whileHover={{ scale: 1.02, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {/* 對話框標籤 (Speech Bubble) */}
          <div className="relative bg-[#FADE2B] text-[#111] text-[12px] md:text-[14px] font-bold px-4 py-1.5 md:px-5 md:py-2 rounded-xl ml-4 md:ml-8 mb-[-12px] z-10 shadow-sm flex items-center gap-1">
            <span className="text-[#0071EB]">＼</span>
            旅遊eSIM 多種方案！
            <span className="text-[#0071EB]">／</span>
            {/* 往下指的黃色小三角形 */}
            <div className="absolute -bottom-2 left-6 md:left-8 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#FADE2B]"></div>
          </div>

          {/* 白色主數據卡片 */}
          <div className="bg-white px-5 py-4 md:px-8 md:py-6 rounded-[24px] flex items-center justify-center shadow-[0_15px_35px_rgba(0,0,0,0.06)] border border-gray-100/80">
            {/* 左側：応募數 */}
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className="text-[15px] md:text-[20px] font-bold text-[#111]">
                eSIM 種類
              </span>
              <span
                className="text-[44px] md:text-[68px] font-black text-[#111] leading-none tracking-tighter"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                2000
              </span>
              <span className="text-[15px] md:text-[20px] font-bold text-[#111]">
                多種
              </span>
            </div>

            {/* 中央分隔線 */}
            <div className="w-px h-10 md:h-14 bg-gray-200 mx-5 md:mx-8"></div>

            {/* 右側：採択數 */}
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className="text-[15px] md:text-[20px] font-bold text-[#111]">
                熱門eSIM 超過
              </span>
              <div className="flex flex-col items-center">
                <span
                  className="text-[44px] md:text-[68px] font-black text-[#0071EB] leading-none tracking-tighter"
                  style={{ fontFamily: "Arial, sans-serif" }}
                >
                  50
                </span>
                {/* 數字下方的專屬黃色底線 */}
                <div className="w-[85%] h-[4px] md:h-[5px] bg-[#FADE2B] mt-1 md:mt-2"></div>
              </div>
              <span className="text-[15px] md:text-[20px] font-bold text-[#111]">
                種
              </span>
            </div>
          </div>
        </motion.div>
      </section>
      <section className="py-20 bg-[#F7F9FB] font-sans">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col gap-6 md:gap-8">
          {/* =========================================
            上半部：兩張並排卡片 (手機版會自動垂直堆疊)
        ========================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* 卡片 1：現状課題と都市計画 */}
            <div className="group relative w-full h-[380px] md:h-[420px] rounded-[32px] overflow-hidden cursor-pointer shadow-md">
              {/* 背景圖片 (Hover時緩慢放大) */}
              <img
                src="/images/location/73c92d8e-cff9-49ed-b7ad-609204a51467.png"
                alt="現状課題と都市計画"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              {/* 漸層/暗色遮罩 (確保白字清晰) */}
              <div className="absolute inset-0 bg-black/40 transition-colors duration-500 group-hover:bg-black/50"></div>

              {/* 內容區塊 (垂直置中) */}
              <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-white text-[24px] md:text-[32px] font-bold mb-4 tracking-wider drop-shadow-md">
                  立即申請合作
                </h3>
                <p className="text-white/90 text-[14px] md:text-[15px] leading-[1.8] mb-8 max-w-[90%] md:max-w-[80%] font-medium drop-shadow-md">
                  提供日本、韓國、泰國、美國等多國 eSIM 方案
                  快速開通、免寄卡、合作簡單、即時分潤
                </p>
                {/* 藍色藥丸按鈕 */}
                <Link
                  href="/register-distributor"
                  className="bg-[#2550D6] hover:bg-[#1a3ca8] transition-colors duration-300 text-white text-[14px] font-bold px-8 py-3.5 rounded-full flex items-center gap-3 w-fit shadow-lg"
                >
                  立即申請合作
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            </div>

            {/* 卡片 2：都農町について */}
            <div className="group relative w-full h-[380px] md:h-[420px] rounded-[32px] overflow-hidden cursor-pointer shadow-md">
              {/* 背景圖片 (Hover時緩慢放大) */}
              <img
                src="https://tsuno-ru.com/wp-content/themes/tsunoru/assets/images/home/about-tsunoru-2-sp.jpg"
                alt="都農町について"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              {/* 漸層/暗色遮罩 */}
              <div className="absolute inset-0 bg-black/40 transition-colors duration-500 group-hover:bg-black/50"></div>

              {/* 內容區塊 (垂直置中) */}
              <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-white text-[24px] md:text-[32px] font-bold mb-4 tracking-wider drop-shadow-md">
                  隨時隨地開啟你的eSIM生活{" "}
                </h3>
                <p className="text-white/90 text-[14px] md:text-[15px] leading-[1.8] mb-8 max-w-[90%] md:max-w-[85%] font-medium drop-shadow-md">
                  不受時間地點限制，只要你有手機電腦。即可開始販售您的eSIM
                </p>
                {/* 藍色藥丸按鈕 */}
                <button className="bg-[#2550D6] hover:bg-[#1a3ca8] transition-colors duration-300 text-white text-[14px] font-bold px-8 py-3.5 rounded-full flex items-center gap-3 w-fit shadow-lg">
                  詳細を見る
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================
            下半部：全寬橫幅卡片
        ========================================= */}
          <div className="group relative w-full bg-[#1E4AD1] rounded-[32px] overflow-hidden cursor-pointer flex flex-col md:flex-row items-center p-0   transition-colors duration-300 hover:bg-[#163aab] shadow-lg">
            {/* 左側內嵌圖片 */}
            <div className="w-full md:w-[35%] lg:w-[35%] h-[200px] md:h-[220px] rounded-l-[24px] overflow-hidden shrink-0">
              <img
                src="/images/何處何地都能快速使用｜快速上網｜Jeko_eSIM｜極客eSI.png"
                alt="都農町WALT計画"
                className="w-full h-full object-cover transition-transform duration-1000 "
              />
            </div>

            {/* 右側文字與箭頭 */}
            <div className="flex-1 pt-6 md:pt-0 px-4 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between w-full">
              <div className="flex-1 pr-0 md:pr-12">
                <h3 className="text-white text-[22px] md:text-[26px] font-bold mb-3 tracking-wider">
                  我們正在尋找這些合作夥伴
                </h3>
                <p className="text-white/80 text-[14px] md:text-[15px] leading-[1.8] font-medium">
                  旅遊包車業者、民宿 / 飯店、旅行社、{" "}
                  <br className="hidden md:block" />
                  KOL / 旅遊部落客、機場接送 / 司機服務、電商 / 旅遊網站
                </p>
              </div>

              {/* 右側箭頭 Icon */}
              <div className="mt-6 md:mt-0 text-white shrink-0 self-end md:self-center pb-2 md:pb-0">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-300 group-hover:translate-x-2"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-[#F6F8F9] py-20 font-sans">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8">
          {/* 標題 */}
          <h2 className="text-[28px] md:text-[32px] font-black text-[#111] mb-8 tracking-wider">
            合作夥伴召集
          </h2>

          {/* 兩欄式網格佈局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* =========================================
              左側：主打新聞 (Featured News)
          ========================================= */}
            <a
              href="#"
              className="group block bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300"
            >
              {/* 上半部：視覺海報 (利用 CSS 重現截圖中的設計) */}
              <div className="relative aspect-[4/3] bg-white overflow-hidden border-b border-gray-100 flex flex-col items-center justify-center">
                {/* NEW! 紅色標籤 */}
                <div className="absolute top-6 left-0 bg-[#E61D2B] text-white text-[13px] font-bold px-4 py-1.5 z-20 shadow-sm">
                  Go!
                </div>

                {/* 左上角藍色圓形裝飾 */}
                <div className="absolute -top-8 -left-6 w-32 h-32 bg-[#0071EB] rounded-full flex items-end justify-center pb-4 pr-2 z-10">
                  <span className="text-white font-bold text-[18px]">Now</span>
                </div>

                {/* 右上角 Logo 模擬 */}
                <div className="absolute top-4 right-6 flex items-center gap-2">
                  <div className="flex -space-x-2 opacity-80">
                    <div className="w-5 h-5 rounded-full border-2 border-[#0071EB]"></div>
                    <div className="w-5 h-5 rounded-full border-2 border-[#FADE2B]"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[6px] text-gray-500 leading-none mb-0.5">
                      接口eSIM
                    </span>
                    <span className="text-[12px] font-black leading-none tracking-tight">
                      Jeko
                    </span>
                  </div>
                </div>

                {/* 中間大字標題 */}
                <div className="relative z-10 text-center mt-4">
                  <h3 className="text-[42px] md:text-[48px] font-black text-[#111] leading-[1.2] tracking-widest">
                    夥伴募集
                    <br />
                    開始
                  </h3>
                </div>

                {/* 底部黃色區塊 */}
                <div className="absolute bottom-0 w-full h-[20%] bg-[#D5AA39] flex items-center justify-center opacity-90 group-hover:h-[22%] transition-all duration-300">
                  <span className="text-[#111] font-bold text-[18px] md:text-[22px] tracking-widest relative top-1"></span>
                </div>
              </div>

              {/* 下半部：新聞資訊 */}
              <div className="p-6 md:p-8">
                <h4 className="text-[16px] md:text-[18px] font-bold text-[#111] mb-5 tracking-wide group-hover:text-[#0071EB] transition-colors">
                  尋找合作夥伴，分潤機制
                </h4>
                <div className="flex items-center text-[13px] font-medium text-[#111]">
                  <span>2024.01.04</span>
                  <span className="text-[#FADE2B] mx-3 text-[14px] font-black">
                    #
                  </span>
                  <span>可以自由決定您的利潤</span>
                </div>
              </div>
            </a>

            {/* =========================================
              右側：新聞列表 (List News)
          ========================================= */}
            <div className="flex flex-col gap-4 md:gap-5 justify-between">
              {subNews.map((news) => (
                <a
                  key={news.id}
                  href="#"
                  className="group flex h-[120px] md:h-auto md:flex-1 bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300"
                >
                  {/* 縮圖區域 (模擬黃色 TSUNORU 圖案) */}
                  <div className="w-[35%] md:w-[40%] bg-[#F2CC40] flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center transform group-hover:scale-105 transition-transform duration-300">
                      {/* 模擬白色圈圈 Logo */}
                      <div className="flex -space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full border-[3px] border-white"></div>
                        <div className="w-10 h-10 rounded-full border-[3px] border-white"></div>
                      </div>
                      <span className="text-[8px] text-white/90 leading-none mb-1">
                        接口eSIM
                      </span>
                      <span className="text-[14px] text-white font-black leading-none tracking-wider">
                        Jeko
                      </span>
                    </div>
                    {/* 淡淡的漸層裝飾 */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent"></div>
                  </div>

                  {/* 資訊區域 */}
                  <div className="flex-1 p-4 md:p-6 flex flex-col justify-center">
                    <h4 className="text-[14px] md:text-[15px] font-bold text-[#111] mb-3 md:mb-4 leading-[1.6] line-clamp-2 group-hover:text-[#0071EB] transition-colors">
                      {news.title}
                    </h4>
                    <div className="flex items-center text-[12px] md:text-[13px] font-medium text-[#111]">
                      <span>{news.date}</span>
                      <span className="text-[#FADE2B] mx-2 font-black">#</span>
                      <span>{news.category}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* =========================================
            底部：藍色按鈕
        ========================================= */}
          <div className="mt-8 flex justify-end">
            <a
              href="#"
              className="relative group inline-flex items-center justify-center bg-[#0066D6] hover:bg-[#0052ad] text-white font-bold text-[15px] tracking-widest px-10 py-4 rounded-full transition-all duration-300 shadow-md"
            >
              {/* 按鈕左側的極小裝飾圓點 (如截圖細節) */}
              <span className="absolute left-4 w-1.5 h-1.5 bg-[#00428a] rounded-full"></span>
              聯絡我們
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-3 transform group-hover:translate-x-1 transition-transform duration-300"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>
        </div>
      </section>
      {/* =========================================
          CTA Section (白色背景區塊)
      ========================================= */}
      <section className="relative w-full bg-white pb-16 pt-10 z-20">
        <div className="mx-auto max-w-[800px] w-[92%] flex flex-col items-center">
          <div className="text-[#CF213A] font-bold text-[15px] md:text-[18px] mb-3 flex items-center gap-2">
            <span className="text-xl">\</span>
            <span className="border-b-2 border-[#CF213A] pb-0.5">
              歡迎成為我們的一員
            </span>
            <span className="text-xl">/</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <button className="group relative flex items-center justify-center w-full sm:w-[320px] bg-[#CF213A] text-white py-4 rounded-full font-bold text-[16px] md:text-[18px] shadow-[0_4px_14px_rgba(207,33,58,0.4)] hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(207,33,58,0.5)] transition-all">
              立即填寫表單申請
              <span className="absolute right-6 w-5 h-5 border-2 border-white rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ChevronRightIcon className="w-3 h-3 text-white" />
              </span>
            </button>
            <button className="group relative flex items-center justify-center w-full sm:w-[320px] bg-white text-[#CF213A] border-2 border-[#CF213A] py-4 rounded-full font-bold text-[16px] md:text-[18px] hover:bg-red-50 transition-all">
              LINE快速聯繫
              <span className="absolute right-6 w-5 h-5 border-2 border-[#CF213A] rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ChevronRightIcon className="w-3 h-3 text-[#CF213A]" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================
          合作教學影片 
      ========================================= */}
      <section className="relative w-full bg-white pb-20 pt-4 z-20">
        <div className="mx-auto max-w-[800px] w-[92%] flex flex-col items-center">
          <h2 className="text-[22px] md:text-[28px] font-black text-[#1E4AD1] mb-6 tracking-wider text-center">
            合作模式與教學說明
          </h2>
          <div className="w-full aspect-video rounded-xl overflow-hidden shadow-[0_10px_40px_rgb(0,0,0,0.15)] border-[4px] md:border-[8px] border-[#EFF6FC] bg-black">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/s21mVJiZyCE?si=AXjLz_PxtDwVmCtR"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
          <p className="mt-5 text-[13px] md:text-[14px] text-slate-500 font-bold tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">
            ※ 此影片為暫時放置的示意影片
          </p>
        </div>
      </section>

      {/* =========================================
          區塊一：選ばれる理由 (合作夥伴優勢)
      ========================================= */}
      <section className="relative w-full bg-[#F7F9FB] py-20 z-20 font-sans border-t border-slate-200">
        <div className="mx-auto max-w-[1000px] w-[92%] flex flex-col items-center">
          <div className="text-[#1E4AD1] font-bold text-[14px] md:text-[16px] mb-2 tracking-widest flex items-center gap-2">
            <span>\ 簡單 /</span>
            <span>\ 快速 /</span>
            <span>\ 高回饋 /</span>
          </div>
          <h2 className="text-[28px] md:text-[36px] font-black text-[#333] mb-12 tracking-wider">
            選擇我們的<span className="text-[#1E4AD1]">優勢</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10">
            {/* 卡片 1 */}
            <div className="bg-white border-[2px] border-[#1E4AD1] rounded-lg p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[#1E4AD1] font-bold text-[15px] md:text-[16px] leading-relaxed h-[48px] flex items-center justify-center">
                業界最高水準的
                <br />
                分潤制度
              </h3>
              <div className="text-[54px] font-black text-[#333] my-4 leading-none">
                15<span className="text-[32px]">%</span>
              </div>
              <p className="text-[13px] text-[#333] font-medium leading-relaxed">
                只要透過專屬連結下單
                <br />
                即可獲得高額的現金回饋
              </p>
            </div>

            {/* 卡片 2 */}
            <div className="bg-white border-[2px] border-[#1E4AD1] rounded-lg p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[#1E4AD1] font-bold text-[15px] md:text-[16px] leading-relaxed h-[48px] flex items-center justify-center">
                不須繁瑣審核
                <br />
                最快當日開通
              </h3>
              <div className="my-4 text-[#333]">
                <ClockIcon className="w-16 h-16" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-[#333] font-medium leading-relaxed">
                無門檻限制，填表後客服將
                <br />
                火速為您開通專屬推薦連結
              </p>
            </div>

            {/* 卡片 3 */}
            <div className="bg-white border-[2px] border-[#1E4AD1] rounded-lg p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[#1E4AD1] font-bold text-[15px] md:text-[16px] leading-relaxed h-[48px] flex items-center justify-center">
                專屬數據後台
                <br />
                成效一目了然
              </h3>
              <div className="my-4 text-[#333] relative">
                <ChartBarIcon className="w-16 h-16" strokeWidth={1.5} />
                <div className="absolute -bottom-1 -right-2 bg-[#1E4AD1] text-white rounded-full p-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <p className="text-[13px] text-[#333] font-medium leading-relaxed">
                提供透明的點擊與轉單報表
                <br />
                隨時掌握您的推廣收入
              </p>
            </div>
          </div>

          {/* 公式 Banner */}
          <div className="w-full bg-white border-[2px] border-[#1E4AD1] rounded-lg overflow-hidden relative shadow-md">
            <div className="absolute -top-3 -left-3 w-16 h-16 bg-[#1E4AD1] rounded-full flex items-center justify-center border-4 border-white z-10">
              <CurrencyDollarIcon className="w-8 h-8 text-[#FADE2B]" />
            </div>

            <div className="bg-[#1E4AD1] text-white py-3 px-6 md:px-16 text-center font-bold text-[16px] md:text-[18px] tracking-widest pl-12">
              <span className="text-[#FADE2B] font-black">業績達標再加碼</span>
              ，讓您的分潤更上一層樓！
            </div>
            <div className="py-8 px-4 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
              <div className="flex flex-col items-center">
                <span className="bg-[#e4ecf9] text-[#1E4AD1] font-bold px-3 py-1 rounded text-sm mb-2">
                  基本分潤
                </span>
                <span className="text-5xl font-black text-[#1E4AD1]">
                  10<span className="text-3xl">%</span>
                </span>
              </div>

              <div className="text-4xl text-slate-300 font-black hidden md:block">
                +
              </div>

              <div className="flex flex-col items-center">
                <span className="bg-[#e4ecf9] text-[#1E4AD1] font-bold px-3 py-1 rounded text-sm mb-2">
                  達標獎金
                </span>
                <span className="text-5xl font-black text-[#1E4AD1]">
                  5<span className="text-3xl">%</span>
                </span>
              </div>

              <div className="text-4xl text-slate-300 font-black hidden md:block">
                =
              </div>

              <div className="flex flex-col items-center">
                <span className="bg-[#e4ecf9] text-[#1E4AD1] font-bold px-3 py-1 rounded text-sm mb-2">
                  最高可達
                </span>
                <span className="text-6xl md:text-7xl font-black text-[#1E4AD1]">
                  15<span className="text-4xl">%</span>
                </span>
              </div>
            </div>
            <div className="w-full text-center text-[11px] text-slate-500 pb-3">
              ※上記は一例です。詳細的達標門檻將於專屬合約中說明。
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          區塊二：分潤與請款流程說明
      ========================================= */}
      <section className="relative w-full bg-[#FAFAFA] py-20 z-20 font-sans border-t border-slate-200">
        <div className="mx-auto max-w-[1000px] w-[92%] flex flex-col items-center">
          <h3 className="text-[16px] md:text-[18px] font-bold text-[#333] mb-2 tracking-widest">
            從註冊到提領收入
          </h3>
          <h2 className="text-[26px] md:text-[34px] font-black text-[#1E4AD1] mb-6 tracking-wider text-center">
            分潤與請款流程說明
          </h2>
          <p className="text-[14px] text-[#333] font-medium mb-12 text-center">
            推廣產生的訂單將自動記錄，不須複雜的手續即可每月領取您的分潤。
          </p>

          <div className="w-full max-w-[800px] relative">
            <div className="flex justify-between items-end mb-4 px-4 md:px-32 relative z-10">
              <div className="flex flex-col items-center">
                <div className="bg-white border-2 border-[#333] font-bold text-[14px] px-6 py-1 rounded mb-2">
                  當月
                </div>
                <div className="text-[12px] font-bold text-[#333]">
                  推廣期間
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white border-2 border-[#333] font-bold text-[14px] px-6 py-1 rounded mb-2">
                  次月
                </div>
                <div className="text-[12px] font-bold text-[#333]">
                  訂單結算日
                </div>
                <div className="bg-[#CF213A] text-white text-[10px] px-3 py-0.5 rounded-full mt-1">
                  例：15日
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white border-2 border-[#333] font-bold text-[14px] px-6 py-1 rounded mb-2">
                  次次月
                </div>
                <div className="text-[12px] font-bold text-[#333]">
                  獎金匯款日
                </div>
                <div className="bg-white border border-slate-300 text-[#333] text-[10px] px-3 py-0.5 rounded-full mt-1">
                  例：5日
                </div>
              </div>
            </div>

            <div className="border-2 border-[#A5B4CB] rounded-xl bg-white overflow-hidden flex flex-col shadow-sm">
              <div className="flex flex-col md:flex-row items-stretch bg-white">
                <div className="w-full md:w-[220px] bg-white border-b md:border-b-0 md:border-r-2 border-[#A5B4CB] flex items-center justify-center py-6 md:py-0">
                  <span className="text-[#5B7382] font-bold text-[15px] md:text-[16px] text-center leading-relaxed">
                    一般使用者的
                    <br />
                    購買流程
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-between p-6 md:p-8 relative">
                  <div className="flex flex-col items-center">
                    <span className="font-black text-[#333] text-[16px]">
                      點擊連結
                    </span>
                    <span className="text-[13px] text-[#666] mt-1">
                      進入官網
                    </span>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-slate-300" />
                  <div className="w-20 h-20 rounded-full bg-slate-200 flex flex-col items-center justify-center border-2 border-slate-300 z-10">
                    <span className="text-sm font-bold text-slate-600">
                      結帳
                    </span>
                  </div>
                  <div className="absolute top-0 bottom-0 left-[50%] w-px border-l-2 border-dotted border-[#CF213A] -z-10"></div>
                  <div className="absolute top-0 bottom-0 right-[15%] w-px border-l-2 border-dotted border-slate-300 -z-10"></div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-stretch border-t-2 border-[#1E4AD1]">
                <div className="w-full md:w-[220px] bg-[#1E4AD1] text-white flex flex-col items-center justify-center py-6 md:py-8">
                  <span className="text-[18px] font-black italic leading-none mb-1">
                    PARTNER
                  </span>
                  <span className="text-[14px] font-bold">
                    合作夥伴專屬後台
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-between p-6 md:p-8 relative bg-[#F8FAFC]">
                  <div className="flex flex-col items-center">
                    <span className="font-black text-[#333] text-[16px]">
                      產生訂單
                    </span>
                    <span className="text-[13px] text-[#666] mt-1">
                      累積獎金
                    </span>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-slate-300" />

                  <div className="w-24 h-24 rounded-full bg-[#1E4AD1] text-white flex flex-col items-center justify-center shadow-md z-10 border-4 border-white">
                    <DevicePhoneMobileIcon className="w-6 h-6 mb-1" />
                    <span className="text-[12px] font-bold leading-tight text-center">
                      報表
                      <br />
                      結算
                    </span>
                  </div>

                  <div className="absolute top-[20%] bottom-[20%] left-[45%] right-[20%] bg-[#e4ecf9] -z-10 flex items-center justify-center clip-path-arrow">
                    <div className="flex flex-col items-center pl-8">
                      <span className="text-[11px] font-bold text-[#1E4AD1]">
                        系統自動出帳
                      </span>
                      <span className="text-[16px] font-black text-[#1E4AD1]">
                        匯款至指定帳戶
                      </span>
                    </div>
                  </div>

                  <div className="w-20 h-20 rounded-full bg-[#1E4AD1] text-white flex flex-col items-center justify-center shadow-md z-10">
                    <span className="text-[12px] font-bold leading-tight text-center">
                      獎金
                      <br />
                      入帳
                    </span>
                  </div>

                  <div className="absolute top-0 bottom-0 left-[50%] w-px border-l-2 border-dotted border-[#CF213A] -z-20"></div>
                  <div className="absolute top-0 bottom-0 right-[15%] w-px border-l-2 border-dotted border-slate-300 -z-20"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          合作夥伴與廠商 Banner 區塊
      ========================================= */}
      <section className="relative w-full bg-white pb-24 pt-10 z-20 border-t border-slate-200">
        <div className="mx-auto max-w-[1100px] w-[92%] flex flex-col items-center">
          <div className="w-full flex items-center justify-center gap-4 mb-3">
            <div className="flex-grow h-px bg-slate-200"></div>
            <h3 className="text-[18px] md:text-[22px] font-black text-[#1E4AD1] tracking-wider whitespace-nowrap">
              合作夥伴與廠商
            </h3>
            <div className="flex-grow h-px bg-slate-200"></div>
          </div>

          <p className="text-xs md:text-sm text-[#5B7382] font-medium mb-12 text-center leading-relaxed">
            ※合作廠商包含各大旅遊機構、學生社團及自由接案者，共同打造優質旅遊體驗
          </p>

          <div className="w-full overflow-hidden">
            <Marquee velocity={25} minScale={0.7} resetAfterTries={200}>
              {partnerLogos.map((logo, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center h-10 md:h-12 w-auto min-w-[100px] mx-8 md:mx-16"
                >
                  {logo.name === "SAISON CARD" ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#004B91] rounded shadow-sm">
                      <span className="text-white font-serif font-bold text-lg md:text-xl">
                        SAISON
                      </span>
                      <span className="text-white font-sans font-medium text-[9px] md:text-[10px] mt-1">
                        CARD
                      </span>
                    </div>
                  ) : (
                    <img
                      src={logo.src}
                      alt={`${logo.name} Logo`}
                      className="h-full w-auto object-contain max-w-[140px]"
                    />
                  )}
                </div>
              ))}
            </Marquee>
          </div>
        </div>
      </section>

      {/* Tailwind 自訂形狀用的 style */}
      <style jsx global>{`
        .clip-path-arrow {
          clip-path: polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%);
        }
      `}</style>
    </Layout>
  );
}
