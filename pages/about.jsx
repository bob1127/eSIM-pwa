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
  const images = {
    a: "/images/blog/e0a188c1f87c88f8aaba875ce0b577c9.jpg", // 左上小張]
    b: "/images/blog/c3c58b610f86264d909aac5d64caece0.jpg", // 左上小張
    c: "/images/blog/03c1c69e60c055c532de164f1dec9122.jpg", // 中間大張人像
    d: "/images/blog/3c94863fda7f4c9c8ebed31e0cb0bbc4.jpg", // 右上小張
    e: "/images/blog/4f6bb38e08ca6a6729d3c626ad9acde3.jpg", // 右下小張（可選）
  };

  return (
    <Layout>
      <Carousel />
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
              <h1 className="text-4xl lg:text-6xl font-bold mb-2">Jeko eSIM</h1>
              <p className="text-xl lg:text-2xl font-bold mb-4">
                您出國旅遊的好選擇，各種eSIM方案
              </p>
              <div className="mb-6">
                <span className="text-gray-900 font-bold text-lg lg:text-2xl block lg:inline">
                  美加旅遊 | 日本旅遊 ｜ 韓國旅遊 ｜中國旅遊
                </span>
              </div>

              {/* 內文區域：手機垂直堆疊，桌機水平排列 */}
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 max-w-[1500px]">
                <div className="flex-1 text-stone-800 text-[16px] tracking-widest leading-relaxed">
                  我們是一家專注於全球行動連線解決方案的公司，致力於以 eSIM 技術
                  打破地域界限，讓使用者在世界各地都能輕鬆上網。
                  透過與多國電信合作，我們提供 彈性方案、即時啟用、透明價格
                  的數據服務，讓旅行與通訊更自由、更智能。
                  我們相信，網路不只是連線工具，更是世界互通的橋樑。
                  讓每一段旅程、每一次溝通，都無縫順暢，這就是我們存在的使命。
                </div>
                <div className="flex-1 text-stone-800 text-[16px] tracking-widest leading-relaxed">
                  無論你身處何地，連線只需一瞬。 我們以創新的 eSIM
                  技術，讓旅人、商務人士與數位生活家，輕鬆擁抱全球高速網路。
                  免換卡、免等待、免煩惱——世界，從此隨手可連。
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 圖片區域：優化長寬比 */}
        {/* 手機使用 4:3 或 16:9 避免太扁，桌機維持 16:7 */}
        <div className="swuper-full-img overflow-hidden aspect-[16/10] md:aspect-[16/9] lg:aspect-[16/7] relative w-full">
          <Image
            src="/images/06.png" // 請確保路徑正確
            alt="Jeko eSIM 全球旅遊"
            placeholder="empty" // 如果有 blurDataURL 改用 blur
            loading="lazy"
            fill
            className="object-cover hover:scale-105 duration-700 transition-transform"
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

      {/* ================= Section 2: Blue Mosaic Area ================= */}
      <section className="w-full bg-[#1f57b8] relative z-50 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid items-center gap-12 lg:gap-20 md:grid-cols-2">
            {/* Left: Mosaic Grid */}
            {/* 手機版：padding 確保外框線不被切掉 */}
            <div className="relative px-2">
              {/* Decorative Border Frame */}
              <div className="absolute -inset-2 md:-inset-4 rounded-[28px] border border-white/20 pointer-events-none" />

              <div className="relative grid grid-cols-2 gap-3 md:gap-5">
                {/* Column 1 */}
                <div className="grid gap-3 md:gap-5">
                  {/* 手機高度縮小 (h-[120px])，桌機恢復原本高度 */}
                  <Tile src={images?.a} className="h-[120px] md:h-[180px]" />
                  <Tile src={images?.b} className="h-[240px] md:h-[380px]" />
                  <Tile src={images?.e} className="h-[120px] md:h-[170px]" />
                </div>

                {/* Column 2 - With Top Offset */}
                <div className="grid gap-3 md:gap-5 pt-8 md:pt-14">
                  <Tile src={images?.d} className="h-[120px] md:h-[270px]" />
                  <Tile src={images?.c} className="h-[260px] md:h-[440px]" />
                </div>
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
                <a
                  href="#"
                  className="
                    group inline-flex items-center gap-3 rounded-full
                    bg-white px-6 py-3 text-sm font-semibold text-[#1f57b8]
                    shadow-[0_10px_25px_rgba(0,0,0,0.18)]
                    transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.25)]
                  "
                >
                  More
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1f57b8]/10 group-hover:bg-[#1f57b8]/20 transition-colors">
                    &gt;
                  </span>
                </a>
              </div>

              {/* Decorative line */}
              <div className="mt-12 h-px w-full bg-gradient-to-r from-white/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>
      <ScrollHero />
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
function Tile({ src, className = "" }) {
  return (
    <div
      className={[
        "overflow-hidden rounded-[22px] bg-white/10",
        "shadow-[0_18px_40px_rgba(0,0,0,0.22)]",
        className,
      ].join(" ")}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
