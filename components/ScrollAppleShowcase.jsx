"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronUp, ChevronDown, CircleDot, Play, X } from "lucide-react";

// ==========================================
// 1. 影片資料設定
// ==========================================
const features = [
  {
    id: "backend",
    title: "第一步：加入 eSIM",
    description:
      "開啟手機「設定」>「行動服務」>「加入 eSIM」，並準備掃描。建議在有穩定的 Wi-Fi 環境下進行操作。",
    type: "video",
    videoId: "s21mVJiZyCE",
  },
  {
    id: "color",
    title: "第二步：掃描行動條碼",
    description:
      "使用相機對準我們寄送給您的 eSIM QR Code 進行掃描。掃描後請耐心等待系統下載與啟用設定。",
    type: "video",
    videoId: "7lnEQLVOsH4",
  },
  {
    id: "display",
    title: "第三步：完成標籤與設定",
    description:
      "下載完成後，您可以將新的 eSIM 標籤設定為「旅遊」或「次要」，並將其預設為上網用的行動數據。",
    type: "video",
    videoId: "uKJCFXYAE40",
  },
];

// ==========================================
// 2. 主展示元件
// ==========================================
export default function ScrollAppleShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [popupVideoId, setPopupVideoId] = useState(null);

  const handlePrev = () =>
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  const handleNext = () =>
    setActiveIndex((prev) => (prev < features.length - 1 ? prev + 1 : prev));

  return (
    // 🌟 外層容器：大螢幕可以很寬，手機版則自適應
    <div className="w-full max-w-[1700px] mx-auto mt-[-40px] px-4 md:px-8 font-['PP_Neue_Montreal',_sans-serif]">
      {/* 標題區塊 */}
      <div className="text-center mb-10">
        <h2 className="text-[28px] md:text-[24px] font-bold text-slate-800 tracking-tight">
          iOS 影音安裝教學
        </h2>
        <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
          跟著下方的影片步驟，輕鬆在您的 iPhone 上完成 eSIM 的下載與啟用設定。
        </p>
      </div>

      {/* 🌟 播放器與選單容器：手機版 w-full，電腦版才啟動 min-w-[1200px] 避免手機破版 */}
      <div className="flex flex-col md:flex-row w-full md:min-w-[1200px] h-auto bg-gradient-to-br from-[#234577] to-[#084c9e] rounded-[2rem] shadow-2xl relative overflow-hidden border border-blue-800/50">
        {/* 左側：控制選單 (電腦版佔 1/3 寬度) */}
        <div className="w-full md:w-1/3 p-6 md:p-8 flex flex-col justify-center relative z-10 border-b md:border-b-0 md:border-r border-white/10">
          {/* 上下切換按鈕 */}
          <div className="flex flex-row md:flex-col justify-end md:justify-center gap-3 mb-6 md:mb-0 md:mr-6 md:absolute md:left-6 md:top-1/2 md:-translate-y-1/2">
            <button
              onClick={handlePrev}
              disabled={activeIndex === 0}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${
                activeIndex === 0
                  ? "text-blue-400/30 cursor-not-allowed bg-transparent"
                  : "bg-white/10 text-white hover:bg-white/20 hover:scale-105"
              }`}
            >
              <ChevronUp size={20} className="hidden md:block" />
              <ChevronUp size={20} className="md:hidden -rotate-90" />
            </button>
            <button
              onClick={handleNext}
              disabled={activeIndex === features.length - 1}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${
                activeIndex === features.length - 1
                  ? "text-blue-400/30 cursor-not-allowed bg-transparent"
                  : "bg-white/10 text-white hover:bg-white/20 hover:scale-105"
              }`}
            >
              <ChevronDown size={20} className="hidden md:block" />
              <ChevronDown size={20} className="md:hidden -rotate-90" />
            </button>
          </div>

          {/* 選單列表 */}
          <div className="flex flex-col justify-center gap-3 flex-1 md:pl-12">
            {features.map((feature, index) => {
              const isActive = activeIndex === index;
              return (
                <div
                  key={feature.id}
                  className={`relative w-full rounded-2xl transition-all duration-300 overflow-hidden ${
                    isActive
                      ? "bg-white/10 border border-white/20 shadow-lg"
                      : "bg-transparent hover:bg-white/5"
                  }`}
                >
                  <button
                    onClick={() => setActiveIndex(index)}
                    className="flex items-center gap-3 px-5 py-4 w-full text-left relative z-10"
                  >
                    <div
                      className={`flex items-center justify-center transition-colors shrink-0 ${isActive ? "text-sky-300" : "text-blue-200/50"}`}
                    >
                      {isActive ? (
                        <CircleDot size={18} strokeWidth={2.5} />
                      ) : (
                        <Plus size={18} />
                      )}
                    </div>
                    <span
                      className={`text-[15px] md:text-base font-bold transition-colors tracking-wide ${isActive ? "text-white" : "text-blue-100/70"}`}
                    >
                      {feature.title}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative z-10"
                      >
                        <div className="px-5 pb-5 pl-[3.25rem] text-[13px] text-blue-100/80 leading-relaxed">
                          {feature.description}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🌟 右側：影片預覽與觸發區 (電腦版佔 2/3 寬度) */}
        <div className="w-full md:w-2/3 relative bg-[#3c82d2] flex items-center justify-center p-4 sm:p-8 md:p-12 min-h-[300px] md:min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full flex items-center justify-center"
            >
              <div
                onClick={() => setPopupVideoId(features[activeIndex].videoId)}
                className="relative w-full max-w-4xl aspect-[16/10] bg-black rounded-[1.5rem] p-1.5 md:p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-blue-500/20 mx-auto cursor-pointer group"
              >
                {/* Hover 放大觀看遮罩 */}
                <div className="absolute inset-0 z-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-[#0B4078]/60 rounded-[1.2rem] backdrop-blur-[2px]">
                  <div className="bg-white p-3 md:p-4 rounded-full flex items-center gap-2 shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                    <Play className="text-[#0B4078] w-5 h-5 fill-[#0B4078]" />
                    <span className="text-[#0B4078] font-bold tracking-widest text-sm pr-1">
                      播放教學影片
                    </span>
                  </div>
                </div>

                <div className="relative w-full h-full rounded-[1rem] overflow-hidden pointer-events-none">
                  {/* YouTube 背景預覽 (靜音、自動播放) */}
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${features[activeIndex].videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1&rel=0&loop=1&playlist=${features[activeIndex].videoId}`}
                    title="YouTube video preview"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    className="absolute top-1/2 left-1/2 w-[150%] h-[120%] -translate-x-1/2 -translate-y-1/2 opacity-70"
                  ></iframe>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. 全螢幕劇院模式 Popup (點擊播放時彈出)     */}
      {/* ========================================== */}
      <AnimatePresence>
        {popupVideoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999999] flex items-center justify-center bg-[#041224]/95 backdrop-blur-md p-4 md:p-10"
            onClick={() => setPopupVideoId(null)}
          >
            {/* 右上角關閉按鈕 */}
            <button
              onClick={() => setPopupVideoId(null)}
              className="absolute top-6 right-6 md:top-10 md:right-10 text-white bg-white/10 hover:bg-red-500 hover:text-white p-3 rounded-full backdrop-blur-md transition-all z-[10000]"
            >
              <X size={28} />
            </button>

            {/* 實際播放的 YouTube Iframe */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-6xl aspect-[16/10] bg-black rounded-2xl md:rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(11,64,120,0.5)] border border-blue-400/20"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${popupVideoId}?autoplay=1&rel=0&modestbranding=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
