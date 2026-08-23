"use client";
// import styles from "./page.module.scss";
import { useEffect, useState } from "react";
// import { AnimatePresence } from "framer-motion";
// import Preloader from "../components/toys05/Preloader";
import ScrollHero from "../components/ScrollHero.jsx";
import Marquee from "react-marquee-slider";
import Layout from "./Layout.js";
import Link from "next/link";
import Image from "next/image.js";
import Carousel from "../components/ThreeHorizontalSlider.jsx";
export default function Home() {
  const marqueeColA = [
    { src: "/images/about-marquee/japan.png", alt: "日本 eSIM" },
    { src: "/images/about-marquee/korea.png", alt: "韓國 eSIM" },
    { src: "/images/about-marquee/hongkong.png", alt: "香港 eSIM" },
    { src: "/images/about-marquee/howto.png", alt: "如何使用 Jeko eSIM" },
  ];
  const marqueeColB = [
    { src: "/images/about-marquee/thailand.png", alt: "泰國 eSIM" },
    { src: "/images/about-marquee/malaysia.png", alt: "馬來西亞 eSIM" },
    { src: "/images/about-marquee/features.png", alt: "Jeko eSIM 特色" },
    { src: "/images/about-marquee/japan.png", alt: "日本 eSIM" },
  ];

  return (
    <Layout flushTop>
      <ScrollHero />
      <section className="section-company-intro pt-10 lg:pt-20">
        {/* 主要容器：手機垂直排列，桌機水平排列 (min-h 取代 h 以容納內容) */}
        <div className="flex flex-col lg:flex-row lg:min-h-[400px] group border-b border-gray-200 lg:border-b-0">
          {/* 01. Sidebar / Topbar */}
          {/* 手機時：變為頂部橫條，文字水平。桌機時：變為左側直條，文字旋轉 */}
          <div className="w-full lg:w-[5%] h-12 lg:h-auto border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-row lg:flex-col justify-between lg:justify-center items-center px-4 lg:px-0 bg-gray-50 lg:bg-transparent">
            <p className="font-bold text-gray-500 group-hover:text-black duration-500 lg:rotate-90 lg:mb-8">
              01
            </p>
            <p className="text-sm lg:text-lg font-bold text-gray-500 group-hover:text-black duration-500 lg:rotate-90 lg:my-8">
              ABOUT
            </p>
          </div>

          {/* 02. Spacer (只在桌機顯示，手機隱藏以節省空間) */}
          <div className="hidden lg:block lg:w-[10%] lg:border-r border-gray-200 h-full"></div>

          {/* 03. Content Area */}
          <div className="w-full lg:w-[85%] lg:border-r border-gray-200 h-full flex justify-center items-center">
            <div className="flex flex-col p-6 lg:p-10 w-full">
              {/* 標題區域 */}
              <h1 className="text-4xl lg:text-6xl font-bold mb-2">
                Jeko 接口 eSIM
              </h1>
              <p className="text-xl lg:text-2xl font-bold mb-4">
                成為你與世界的接口
              </p>
              <div className="mb-6">
                <span className="text-gray-900 font-bold text-lg lg:text-2xl block lg:inline">
                  台灣在地｜日本・韓國原生高速｜泰國・越南・中國・香港
                </span>
              </div>

              {/* 內文區域：手機垂直堆疊，桌機水平排列 */}
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 max-w-[1500px]">
                <div className="flex-1 text-stone-800 text-[16px] tracking-widest leading-relaxed">
                  Jeko 接口 eSIM 是一家台灣在地公司。我們從旅人真正會用到的連線開始，提供各類 eSIM：日本、韓國原生高速吃到飽，泰國、越南、中國、香港等熱門目的地方案齊全，熱銷種類多達
                  200 種以上。購買後即可取得 QR Code，掃描安裝、免換卡、免等待實體寄送，落地就能上網。
                </div>
                <div className="flex-1 text-stone-800 text-[16px] tracking-widest leading-relaxed">
                  連線只是起點。Jeko 也整合住宿、包車與旅遊服務，努力打造一個適合旅遊夥伴們一起成長的平台。
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 圖片區域：全寬顯示原圖比例，不裁切 */}
        <div className="swuper-full-img w-full">
          <Image
            src="/images/07.png"
            alt="Jeko eSIM 全球旅遊"
            width={2220}
            height={1004}
            loading="lazy"
            unoptimized
            className="w-full h-auto block"
          />
        </div>
      </section>

      {/* ================= Section 1: eSIM Feature Intro ================= */}
      <section className="section-company-intro border-b border-gray-200 lg:border-none">
        <div className="flex flex-col lg:flex-row h-auto lg:min-h-[600px] group">
          {/* 1. Sidebar / Topbar Area */}
          {/* 手機: 黑底橫條 | 桌機: 透明底直條 */}
          <div className="w-full lg:w-[5%] h-14 lg:h-auto bg-black lg:bg-transparent border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-row lg:flex-col justify-between lg:justify-center items-center px-4 lg:px-0 z-10">
            <p className="font-bold text-gray-400 group-hover:text-white lg:group-hover:text-black duration-500 lg:rotate-90 lg:mb-8">
              02
            </p>
            <p className="text-sm lg:text-lg font-bold text-gray-400 group-hover:text-white lg:group-hover:text-black duration-500 lg:rotate-90 lg:my-8">
              eSIM
            </p>
          </div>

          {/* 2. Main Content (Middle) */}
          <div className="w-full lg:w-[50%] xl:w-[65%] lg:border-r border-gray-200 h-full p-6 md:p-10 xl:p-20">
            <div className="max-w-[600px]">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-normal leading-tight text-gray-900">
                eSIM。
                <br />
                <span className="font-bold">您旅行的好夥伴</span>
              </h2>
              <p className="leading-relaxed mt-6 text-stone-800 text-[16px]">
                即掃即用，隨時上線。全新 eSIM 服務提供 24HR
                快速發貨，讓你無須等待、無需實體卡，出國前後都能輕鬆啟用。無論工作、旅遊或日常上網，一掃即可連線世界，享受真正的即時便利與自由行動力。
              </p>

              <button className="group/btn inline-flex items-center px-8 py-3 rounded-full mt-8 text-white font-semibold text-sm bg-gradient-to-r from-[#0059b8] via-[#0071cf] to-[#0095e6] shadow-md transition-all duration-300 hover:brightness-110 hover:shadow-lg hover:-translate-y-1">
                eSIM 產品
                <span className="ml-2 text-base group-hover/btn:translate-x-1 transition-transform">
                  {">"}
                </span>
              </button>
            </div>

            <div className="mt-10 w-full relative aspect-video lg:aspect-[21/9] overflow-hidden rounded-lg">
              <Image
                src="/images/何處何地都能快速使用｜快速上網｜Jeko_eSIM｜極客eSI.png" // 請確保路徑正確
                placeholder="empty"
                loading="lazy"
                fill
                className="object-cover"
                alt="何處何地都能快速使用｜快速上網｜Jeko_eSIM｜極客eSIM"
              />
            </div>
          </div>

          {/* 3. Secondary Content (Right) */}
          <div className="w-full lg:w-[45%] xl:w-[30%] h-full flex justify-center items-center border-t lg:border-t-0 border-gray-200">
            <div className="p-6 md:p-10 xl:p-20">
              <h3 className="text-xl md:text-3xl lg:text-4xl text-gray-800 font-medium mb-4">
                無卡束縛，自由上線
              </h3>
              <p className="leading-relaxed text-stone-800 text-[16px] text-justify">
                eSIM
                讓連線變得更直覺、更自由。免插卡、免等待，只需掃描即可啟用，無論出國旅行或日常使用都能立即上線。
                <span className="hidden md:inline">
                  支援多門號切換，讓你在工作、生活間輕鬆管理不同方案；內建式設計也更安全、不怕遺失，更具耐用性。
                </span>
                <span className="block mt-2">
                  同時減少實體塑料使用，是更環保、更現代的通信選擇。以更聰明的方式連線，讓你的行動力再進化。
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Section 3: 旅遊平台與合作 ================= */}
      <section className="section-company-intro">
        <div className="mx-auto w-full max-w-[1500px] px-6 lg:px-10 py-12 lg:py-16">
          <p className="text-sm font-bold tracking-[0.2em] text-stone-500">
            03 ／ PARTNERS
          </p>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
            給旅人一個接口，
            <br />
            也給夥伴一個舞台
          </h2>
          <p className="mt-4 text-lg md:text-xl font-semibold text-stone-600">
            從一張 eSIM，長成一整趟旅程的後勤。
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 items-start">
            <div>
              <p className="text-xs font-bold tracking-widest text-[#0A6CD0] mb-2">
                01 ／ 旅客
              </p>
              <h3 className="text-xl font-bold text-gray-900 mb-3 min-h-[1.75rem]">
                出發前一次備齊
              </h3>
              <p className="text-stone-700 text-[15px] leading-relaxed tracking-wide">
                先選目的地 eSIM，再配住宿與包車。日本、韓國要原生高速吃到飽，東南亞與中港要穩定覆蓋——熱銷方案超過 200 種，讓行程少一個臨時找網的變數。
              </p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-[#0A6CD0] mb-2">
                02 ／ 夥伴
              </p>
              <h3 className="text-xl font-bold text-gray-900 mb-3 min-h-[1.75rem]">
                把你的服務接上來
              </h3>
              <p className="text-stone-700 text-[15px] leading-relaxed tracking-wide">
                民宿、司機、旅行社、地陪與內容創作者都歡迎。Jeko 希望做成適合旅遊夥伴一起接單、曝光與分潤的平台，而不是只賣一張卡。
              </p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-[#0A6CD0] mb-2">
                03 ／ 合作
              </p>
              <h3 className="text-xl font-bold text-gray-900 mb-3 min-h-[1.75rem]">
                台灣團隊，好溝通
              </h3>
              <p className="text-stone-700 text-[15px] leading-relaxed tracking-wide">
                我們在台灣，時差、語言與售後都走得近。有通路、有車隊、有內容，或只是想讓旅客多一個可靠選項——來聊聊，我們一起把旅程接好。
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/cooperation"
              className="inline-flex items-center justify-center rounded-full bg-[#0A6CD0] px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110 hover:-translate-y-0.5"
            >
              了解合作方式
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-7 py-3 text-sm font-semibold text-slate-800 transition-all duration-300 hover:border-[#0A6CD0] hover:text-[#0A6CD0]"
            >
              聯絡我們
            </Link>
          </div>
        </div>
      </section>

      <Carousel />

      {/* ================= Section 2: Blue Mosaic Area ================= */}
      <section className="w-full bg-[#1f57b8] relative z-50 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid items-center gap-12 lg:gap-20 md:grid-cols-2">
            {/* Left: 往上無限跑馬燈 */}
            <div className="relative px-2">
              <div className="absolute -inset-2 md:-inset-4 rounded-[28px] border border-white/20 pointer-events-none z-10" />

              <div className="relative h-[480px] md:h-[620px] overflow-hidden rounded-[22px]">
                <div className="grid h-full grid-cols-2 gap-3 md:gap-4">
                  <VerticalMarquee
                    items={marqueeColA}
                    duration={28}
                    className="h-full"
                  />
                  <VerticalMarquee
                    items={marqueeColB}
                    duration={36}
                    className="h-full pt-10 md:pt-14"
                  />
                </div>
                {/* 上下漸層遮罩，邊緣更柔和 */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#1f57b8] to-transparent z-[5]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1f57b8] to-transparent z-[5]" />
              </div>
            </div>

            {/* Right: Content */}
            <div className="text-white flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-wide">
                出國前一定要知道的 <br className="hidden md:block" />
                <span className="text-blue-200">eSIM 使用重點</span>
              </h2>

              <p className="mt-6 max-w-xl text-sm md:text-base leading-loose text-white/90">
                在購買 eSIM 前，請先確認手機是否支援 eSIM 功能，
                並建議在出國前完成安裝與設定。
                部分方案需要在抵達目的地後才會啟用，
                請避免提前切換，以確保方案正常生效。
              </p>

              <div className="mt-8 md:mt-10">
                <Link
                  href="/product"
                  className="
                    group inline-flex items-center gap-3 rounded-full
                    bg-white px-6 py-3 text-sm font-semibold text-[#1f57b8]
                    shadow-[0_10px_25px_rgba(0,0,0,0.18)]
                    transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.25)]
                  "
                >
                  探索方案
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1f57b8]/10 group-hover:bg-[#1f57b8]/20 transition-colors">
                    &gt;
                  </span>
                </Link>
              </div>

              {/* Decorative line */}
              <div className="mt-12 h-px w-full bg-gradient-to-r from-white/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>
      <div className="marquee mt-8">
        <Marquee>
          {[
            <div className="flex" key="scan">
              <div className="mx-4">
                <img
                  src="/素材/形象/Generated-Image-November-15,-2025---6_07PM.png"
                  className="max-w-[450px]"
                  alt="scan"
                />
              </div>
              <div className="mx-4">
                <img
                  src="/素材/形象/Generated-Image-November-15,-2025---5_19PM.png"
                  className="max-w-[450px]"
                  alt="scan"
                />
              </div>
              <div className="mx-4">
                <img
                  src="/素材/形象/Generated Image November 15, 2025 - 5_25PM.png"
                  className="max-w-[450px]"
                  alt="scan"
                />
              </div>
              <div className="mx-4">
                <img
                  src="/素材/形象/Generated Image November 05, 2025 - 8_40PM.png"
                  className="max-w-[450px]"
                  alt="scan"
                />
              </div>
              <div className="mx-4">
                <img
                  src="/素材/形象/Generated-Image-November-15,-2025---6_07PM.png"
                  className="max-w-[450px]"
                  alt="scan"
                />
              </div>
              <div className="mx-4">
                <img
                  src="/素材/形象/Generated-Image-November-15,-2025---5_19PM.png"
                  className="max-w-[450px]"
                  alt="scan"
                />
              </div>
              <div className="mx-4">
                <img
                  src="/素材/形象/Generated Image November 15, 2025 - 5_25PM.png"
                  className="max-w-[450px]"
                  alt="scan"
                />
              </div>
            </div>,
          ]}
        </Marquee>
      </div>
    </Layout>
  );
}
function VerticalMarquee({
  items = [],
  duration = 30,
  className = "",
}) {
  const loop = [...items, ...items];
  return (
    <div className={["overflow-hidden", className].filter(Boolean).join(" ")}>
      <div
        className="flex flex-col gap-3 md:gap-4 will-change-transform"
        style={{
          animation: `aboutMarqueeUp ${duration}s linear infinite`,
        }}
      >
        {loop.map((item, i) => (
          <div
            key={`${item.src}-${i}`}
            className="overflow-hidden rounded-[18px] bg-white/10 shadow-[0_14px_32px_rgba(0,0,0,0.22)] shrink-0"
          >
            <img
              src={item.src}
              alt={item.alt || ""}
              className="block w-full h-auto aspect-[3/4] object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes aboutMarqueeUp {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }
      `}</style>
    </div>
  );
}
