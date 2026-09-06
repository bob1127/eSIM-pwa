"use client";

import React, { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import {
  QrCode,
  Smartphone,
  Unlock,
  Wifi,
  ScanLine,
  ShieldAlert,
  Lock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  motion,
  useAnimation,
  useScroll,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";

// ==========================================
// 1. eSIM 6大步驟資料 (對應你的圖二)
// ==========================================
const GUIDE_STEPS = [
  {
    id: 1,
    tag: "STEP 01",
    title: ["檢查相容性", "支援 eSIM 設備"],
    desc: "請檢查您的設備是否有新增 eSIM 按鈕，以確保您的設備支援 eSIM。您可以前往設定中查看或點擊下方連結確認。",
    icon: <Smartphone className="w-16 h-16 text-[#315cff]" />,
    action: "查看 eSIM 相容設備 >",
  },
  {
    id: 2,
    tag: "STEP 02",
    title: ["確認無鎖卡", "沒有 Sim Lock"],
    desc: "請確保您的設備沒有 Sim Lock（電信商鎖定）。若您的手機是向特定電信商綁約購買，請先聯絡電信商解鎖。",
    icon: <Unlock className="w-16 h-16 text-[#315cff]" />,
  },
  {
    id: 3,
    tag: "STEP 03",
    title: ["準備 QR 碼", "準備掃描設備"],
    desc: "請準備列印的 QR 碼，或其他顯示 QR 碼的設備（如平板、另一支手機或電腦螢幕）以進行掃描。",
    icon: <QrCode className="w-16 h-16 text-[#315cff]" />,
  },
  {
    id: 4,
    tag: "STEP 04",
    title: ["連接穩定網路", "確保網路連線"],
    desc: "在加入 eSIM 方案時，請確保您用於掃描的手機具有穩定的網路連線 (建議使用 Wi-Fi)。",
    icon: <Wifi className="w-16 h-16 text-[#315cff]" />,
  },
  {
    id: 5,
    tag: "STEP 05",
    title: ["僅限單次掃描", "使用旅途手機"],
    desc: "請使用您旅途中「實際要上網」的手機進行掃描，因為專屬的二維碼 (QR Code) 只能掃描一次，無法轉移。",
    icon: <ScanLine className="w-16 h-16 text-[#315cff]" />,
  },
  {
    id: 6,
    tag: "STEP 06",
    title: ["切勿刪除 eSIM", "刪除將無法使用"],
    desc: "安裝完成後，請不要從手機中刪除 eSIM，因為一旦刪除，您將無法再次使用它，也無法重新掃描恢復。",
    icon: <ShieldAlert className="w-16 h-16 text-red-500" />,
  },
];

export default function EsimGuideCarousel() {
  // 輪播設定：允許拖曳、無限迴圈，並加入自動播放 (每 5 秒切換)
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, dragFree: false },
    [Autoplay({ delay: 5000, stopOnInteraction: false })],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi],
  );

  return (
    <section className="relative w-full bg-[#f2f6ff] py-16 md:py-24 overflow-hidden font-sans">
      {/* ========================================== */}
      {/* 幾何背景裝飾 (仿 8card 風格) */}
      {/* ========================================== */}
      <div className="absolute top-10 left-10 w-64 h-64 rounded-full border-[20px] border-[#e0e7ff] opacity-60 pointer-events-none"></div>
      <div className="absolute -bottom-20 right-10 w-96 h-96 rounded-full border-[30px] border-[#e0e7ff] opacity-60 pointer-events-none"></div>
      <div className="absolute top-1/4 right-[20%] text-[#dbe4ff] pointer-events-none opacity-80">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
          <rect x="10" y="0" width="4" height="24" rx="2" />
          <rect x="0" y="10" width="24" height="4" rx="2" />
        </svg>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        {/* 頂部標題 */}
        <div className="text-center mb-12 md:mb-20">
          <h2 className="text-[#315cff] font-bold tracking-widest text-sm mb-3">
            HOW TO INSTALL
          </h2>
          <h3 className="text-[28px] md:text-[24px] font-bold text-slate-900">
            如何安裝 eSIM - (事前確認與準備)
          </h3>
        </div>

        {/* ========================================== */}
        {/* Embla 輪播主體 */}
        {/* ========================================== */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y touch-pinch-zoom">
            {GUIDE_STEPS.map((step, index) => (
              <div
                key={step.id}
                className="flex-[0_0_100%] min-w-0 flex flex-col md:flex-row items-center gap-10 md:gap-20 px-4"
              >
                {/* 👈 左側：手機 Mockup 視覺區 */}
                <div className="w-full md:w-1/2 flex justify-center relative">
                  {/* 背景虛化輔助手機 */}
                  <div className="absolute top-10 -right-4 w-[240px] h-[480px] bg-white rounded-[2.5rem] shadow-sm border-[8px] border-slate-100 opacity-40 scale-90 -rotate-6 hidden md:block"></div>

                  {/* 主手機 */}
                  <div className="relative w-[260px] h-[520px] bg-white rounded-[2.5rem] shadow-2xl border-[12px] border-white flex flex-col items-center justify-center p-6 z-10 shrink-0">
                    {/* 瀏海 / 動態島 */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-slate-100 rounded-b-2xl"></div>

                    {/* App 畫面模擬 */}
                    <div className="w-full h-full border border-gray-100 rounded-2xl bg-[#fafcff] flex flex-col items-center justify-center p-6 text-center">
                      <div className="mb-6 bg-white p-6 rounded-3xl shadow-sm">
                        {step.icon}
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg mb-2">
                        {step.title[0]}
                      </h4>
                      <p className="text-xs text-slate-500">{step.tag}</p>

                      {/* 模擬掃描框或按鈕 */}
                      <div className="mt-auto w-full pt-6">
                        <div className="w-full h-10 bg-[#315cff] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md shadow-blue-200">
                          下一步
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 👉 右側：藍底文字敘述區 (完全仿照 8card) */}
                <div className="w-full md:w-1/2 flex flex-col items-start text-left pt-6 md:pt-0">
                  <span className="text-[#315cff] font-bold text-lg mb-4 tracking-widest">
                    {step.tag}
                  </span>

                  {/* 8card 風格的藍底反白標題 */}
                  <div className="flex flex-col items-start gap-2 mb-8">
                    {step.title.map((line, i) => (
                      <span
                        key={i}
                        className="bg-[#315cff] text-white px-4 py-1.5 text-[24px] font-bold tracking-wide leading-tight shadow-sm inline-block"
                      >
                        {line}
                      </span>
                    ))}
                  </div>

                  <p className="text-slate-700 text-base md:text-lg leading-relaxed font-medium max-w-lg">
                    {step.desc}
                  </p>

                  {/* 連結按鈕 (如果有的話) */}
                  {step.action && (
                    <button className="mt-8 px-8 py-3 border-2 border-[#315cff] text-[#315cff] rounded-full font-bold hover:bg-[#315cff] hover:text-white transition-colors duration-300">
                      {step.action}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================== */}
        {/* 底部導覽圓點 (Pagination Dots) */}
        {/* ========================================== */}
        <div className="flex justify-center items-center gap-3 mt-16 md:mt-24">
          {GUIDE_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`transition-all duration-300 rounded-full ${
                index === selectedIndex
                  ? "w-8 h-2.5 bg-[#315cff]"
                  : "w-2.5 h-2.5 bg-blue-200 hover:bg-blue-300"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
      <section className="py-20   z-50 relative">
        <div className="container mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="flex items-start gap-4 mb-12">
            <div>
              <p className="text-sm font-bold text-gray-500 mb-1 tracking-wide">
                開始使用 eSIM 前的檢查
              </p>
              <h2 className="text-[28px] md:text-[24px] font-bold text-gray-900">
                準備工作確認
              </h2>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Link
              href="/blog/如何檢查您的iphone-ipad-ios手機設備是否支援esim？/"
              className="  block h-full"
            >
              <CardItem
                step="1"
                title="確認 eSIM 的設備相容性"
                illustration={
                  <div className="relative flex items-center justify-center w-full h-full">
                    <Smartphone
                      className="w-24 h-24 text-stone-900"
                      strokeWidth={1.5}
                    />
                    <div className="absolute -right-2 top-4 bg-white shadow-md rounded-lg px-3 py-1 flex items-center gap-2 border border-gray-100">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-gray-600">
                        eSIM Supported
                      </span>
                    </div>
                  </div>
                }
              >
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    <strong className="text-gray-800">iPhone XS、XR</strong>{" "}
                    或更新版本通常支援。部分 iPhone 13 支援雙 eSIM。
                  </p>
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 leading-tight">
                      中國大陸機型<span className="font-bold">不支援</span>
                      ，港澳部分機型支援。
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#06C755] font-bold hover:underline text-xs mt-2 transition-colors">
                    查看 Apple 支援頁面清單 <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </CardItem>
            </Link>

            <Link
              href="/blog/如何在ios裝置上安裝並啟用esim？/"
              className="block h-full"
            >
              <CardItem
                step="2"
                title="您的 iPhone 電信業者已解鎖"
                illustration={
                  <div className="relative flex items-center justify-center w-full h-full">
                    <div className="relative">
                      <Smartphone
                        className="w-24 h-24 text-gray-400 opacity-50"
                        strokeWidth={1}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                          <Lock className="w-8 h-8 text-[#06C755]" />
                          <div className="text-[10px] text-center font-bold text-gray-500 mt-1">
                            UNLOCKED
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              >
                <p className="text-sm text-gray-600 leading-relaxed">
                  請確認您的手機是{" "}
                  <span className="font-bold text-gray-800">Sim-Lock Free</span>
                  （無鎖版）。如果是與電信商綁約購機，請聯繫客服確認解鎖狀態。
                </p>
              </CardItem>
            </Link>

            <CardItem
              step="3"
              title="確保網路連線穩定"
              illustration={
                <div className="relative flex items-center justify-center w-full h-full gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
                      <Wifi className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                    <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                    <Smartphone className="w-12 h-12 text-stone-900" />
                  </div>
                </div>
              }
            >
              <p className="text-sm text-gray-600 leading-relaxed">
                掃描 QR Code 安裝 eSIM 時，手機必須連接{" "}
                <span className="font-bold text-gray-800">
                  Wi-Fi 或行動數據
                </span>{" "}
                才能完成驗證下載。
              </p>
            </CardItem>
          </div>
        </div>
      </section>
    </section>
  );
}

// --- Card Component ---
const CardItem = ({ step, title, illustration, children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Number(step) * 0.1 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
    >
      {/* 標題區 */}
      <div className="px-6 pt-6 pb-2 flex items-start gap-3">
        <span className="bg-[#06C755] text-white text-sm font-bold w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5">
          {step}
        </span>
        <h3 className="font-bold text-lg text-gray-900 leading-tight">
          {title}
        </h3>
      </div>

      {/* 圖解區 */}
      <div className="mx-6 mt-4 h-40 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
        {illustration}
      </div>

      {/* 內文區 */}
      <div className="p-6 pt-4 flex-grow">{children}</div>
    </motion.div>
  );
};
