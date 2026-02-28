"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link"; // 引入 Link

// 修改處 1：文案全部改為 eSIM 相關的主題，並新增 alt 和 link 欄位
const slides = [
  {
    date: "2025.07.19",
    title: "全球旅遊必備神器！免換實體卡，掃描 QR Code 即刻開通高速網路",
    img: "/images/韓國旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽.jpg",
    alt: "韓國旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽", // 自定義 alt
    link: "/esim/global", // 自定義連結
  },
  {
    date: "2025.08.03",
    title: "歐洲跨國漫遊首選，覆蓋 40+ 國家，出差旅遊訊號無縫接軌",
    img: "/images/香港旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽.jpg",
    alt: "香港旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽", // 自定義 alt
    link: "/esim/europe", // 自定義連結
  },
  {
    date: "2025.08.03",
    title: "泰國旅遊上網推薦，高速穩定不降速，隨時分享美食美景", // 修改標題以區分
    img: "/images/泰國旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽.jpg",
    alt: "泰國旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽", // 自定義 alt
    link: "/esim/thailand", // 自定義連結
  },
  {
    date: "2025.09.10",
    title: "限時優惠開跑！日韓 eSIM 吃到飽方案下殺 5 折，立即搶購",
    img: "/images/日本旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽.jpg",
    alt: "日本旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽", // 自定義 alt
    link: "/esim/japan-korea-sale", // 自定義連結
  },
  {
    date: "2025.09.10",
    title: "馬來西亞上網卡，多種方案任選，滿足不同天數需求", // 修改標題以區分
    img: "/images/馬來西亞旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽.jpg",
    alt: "馬來西亞旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽", // 自定義 alt
    link: "/esim/malaysia", // 自定義連結
  },
];

export default function FadeCarousel() {
  const DURATION = 5000;
  const [index, setIndex] = useState(0);

  // ✅ 自動輪播（不受 hover 影響）
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((p) => (p + 1) % slides.length);
    }, DURATION);
    return () => clearInterval(id);
  }, [slides.length]);

  const go = (i) =>
    setIndex(((i % slides.length) + slides.length) % slides.length);
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  const labels = useMemo(
    () => slides.map((_, i) => String(i + 1).padStart(2, "0")),
    [],
  );

  return (
    // 手機版 p-5 / 電腦版 p-10
    <section className="p-5 lg:p-10 relative">
      <div className="bg-[#f4f4f7] rounded-[20px]  max-w-[1500px] p-5 lg:p-10 mx-auto xl:w-[55%] sm:w-[85%] w-full overflow-hidden relative">
        {/* ---------- 導航區 (電腦版顯示 / 手機版隱藏) ---------- */}
        {/* 加入 hidden lg:flex，只在電腦版顯示垂直導航，以免手機版遮擋內容 */}
        <div className="navgation hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 z-10 flex-col items-center">
          {/* 01 / 02 / 03 */}
          <div className="mb-4 flex flex-col items-center gap-1">
            {labels.map((lb, i) => (
              <button
                key={lb}
                onClick={() => go(i)}
                className={`text-xs tracking-widest transition-colors ${
                  i === index
                    ? "text-black font-semibold"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {lb}
              </button>
            ))}
          </div>

          {/* 導航點 + 進度線 */}
          <div className="relative flex items-stretch h-full">
            {/* 導航點 */}
            <div className="flex flex-col justify-between pr-5 h-full">
              <div className="flex flex-col gap-3">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      i === index
                        ? "bg-black scale-110"
                        : "bg-gray-400 hover:bg-gray-600"
                    }`}
                  />
                ))}
              </div>

              {/* 底部箭頭 */}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={prev}
                  className="group w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={next}
                  className="group w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ✅ 進度條 */}
            <div className="relative w-[3px] bg-gray-300 rounded-full overflow-hidden">
              <motion.div
                key={index}
                initial={{ height: "0%" }}
                animate={{ height: "100%" }}
                transition={{ duration: DURATION / 1000, ease: "linear" }}
                className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent"
              />
            </div>
          </div>
        </div>

        {/* ---------- 主內容 ---------- */}
        {/* 手機版：flex-col-reverse (圖上文下) / 電腦版：flex-row (左文右圖) */}
        <div className="main flex flex-col-reverse lg:flex-row relative">
          {/* 左側文字 (電腦版 w-1/2 / 手機版 w-full) */}
          <div className="description justify-center items-start p-6 lg:p-20 flex flex-col w-full lg:w-1/2 relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="space-y-4 lg:space-y-6"
              >
                <span className="text-gray-500 text-sm lg:text-base">
                  {slides[index].date}
                </span>
                <p className="text-xl lg:text-3xl leading-snug font-bold lg:font-normal">
                  {slides[index].title}
                </p>

                {/* 修改處 2：使用 Link 包覆按鈕，並使用自定義連結 */}
                <Link href={slides[index].link} passHref>
                  <button className="border rounded-[20px] border-black px-4 py-2 text-sm lg:text-base hover:bg-black hover:text-white transition-all">
                    查看詳情
                  </button>
                </Link>
              </motion.div>
            </AnimatePresence>

            {/* --- 手機版專用導航 (Mobile Only Dots) --- */}
            <div className="flex lg:hidden gap-2 mt-6">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === index ? "bg-black w-6" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 右側圖片 (電腦版 w-1/2 / 手機版 w-full) */}
          {/* 手機版比例設為 aspect-video (16:9) 避免太高 */}
          {/* 修改處 3：使用 Link 包覆圖片容器，並使用自定義連結 */}
          <Link href={slides[index].link} passHref legacyBehavior>
            <a className="relative overflow-hidden aspect-[3/3.3] lg:aspect-[3/3.8] w-full lg:w-1/2 lg:rounded-[16px] rounded-[16px] block cursor-pointer">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slides[index].img}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.03 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={slides[index].img}
                    // 修改處 4：使用自定義 alt
                    alt={slides[index].alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </motion.div>
              </AnimatePresence>
            </a>
          </Link>
        </div>
      </div>
    </section>
  );
}
