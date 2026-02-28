import React, { useMemo, useState } from "react";

import Layout from "./Layout";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Carousel from "../components/EmblaCarousel06/index";
export default function InfoPage() {
  const items = useMemo(
    () => [
      {
        id: "e1",
        date: "2025.01.12",
        tags: ["旅遊須知", "eSIM 入門", "行前準備"],
        title: "第一次使用 eSIM 出國？新手必看的 7 大重點與常見誤區",
        excerpt:
          "eSIM 讓出國上網更方便，但第一次使用仍有不少細節需要注意。本篇整理啟用前準備、安裝時機、常見錯誤與解決方式，幫助你順利出國不斷線。",
        image: "/images/blog/TAIWAN__thumb-_20250304.webp",
      },
      {
        id: "e2",
        date: "2025.01.05",
        tags: ["旅遊注意事項", "網路設定", "裝置相容"],
        title: "出國前一定要檢查！你的手機支援 eSIM 嗎？完整相容清單與檢查方法",
        excerpt:
          "不是每一支手機都能使用 eSIM。本篇教你快速確認 iPhone、Android 是否支援 eSIM，並整理常見品牌與型號的注意事項，避免買了卻不能用。",
        image: "/images/blog/thum_My-Folk-Craft-Notes_post_fix.webp",
      },
      {
        id: "e3",
        date: "2024.12.28",
        tags: ["旅遊攻略", "日本旅遊", "網路推薦"],
        title: "日本旅遊上網怎麼選？eSIM、Wi-Fi 分享器、實體 SIM 卡完整比較",
        excerpt:
          "到日本旅遊該選哪種上網方式？本文從價格、速度、便利性與穩定度比較 eSIM、Wi-Fi 機與實體 SIM，幫你依旅遊型態選到最適合的方案。",
        image: "/images/blog/thum_To-the-Capital-of-Tohoku.webp",
      },
      {
        id: "e4",
        date: "2024.12.18",
        tags: ["旅遊須知", "資安提醒", "行動網路"],
        title: "使用 eSIM 出國上網安全嗎？公共 Wi-Fi 與行動網路的資安差異",
        excerpt:
          "出國時常連公共 Wi-Fi 真的安全嗎？本篇說明使用 eSIM 行動網路的資安優勢，以及如何避免個資外洩，讓你旅遊上網更安心。",
        image: "/images/blog/thum_80-Years-on-the-Journey-to-Peace_2.webp",
      },
      {
        id: "e5",
        date: "2024.12.10",
        tags: ["旅遊攻略", "歐洲旅遊", "eSIM 推薦"],
        title: "歐洲多國旅行怎麼上網最方便？跨國 eSIM 使用技巧一次整理",
        excerpt:
          "歐洲多國移動最怕網路切換麻煩。本篇整理跨國 eSIM 的使用方式、設定技巧與注意事項，讓你跨國移動也能一路順暢上網。",
        image: "/images/blog/thum_Living-Local-in-THAILAND_post.webp",
      },
    ],
    [],
  );

  const [activeId, setActiveId] = useState(items[0]?.id ?? null);
  const images = {
    a: "/images/blog/e0a188c1f87c88f8aaba875ce0b577c9.jpg", // 左上小張]
    b: "/images/blog/c3c58b610f86264d909aac5d64caece0.jpg", // 左上小張
    c: "/images/blog/03c1c69e60c055c532de164f1dec9122.jpg", // 中間大張人像
    d: "/images/blog/3c94863fda7f4c9c8ebed31e0cb0bbc4.jpg", // 右上小張
    e: "/images/blog/4f6bb38e08ca6a6729d3c626ad9acde3.jpg", // 右下小張（可選）
  };

  return (
    <Layout>
      <div className="overflow-hidden">
        <div className="bg-svg fixed left-1/2 w-[70vw]">
          <img src="/images/6b328ed5b4de80217f388c6ed012feb8.png" alt="" />
        </div>
        <section
          className="
  flex
  relative
  z-50
  justify-end
  w-full
  py-20

  bg-white/30
  backdrop-blur-2xl
  backdrop-saturate-150

 
  shadow-lg
"
        >
          <div className=" w-full px-4 sm:w-[80%]">
            <div className="title flex justify-between">
              <div className="flex items-center justify-center">
                <h2 className="text-[36px] font-bold">NEWS</h2>{" "}
                <div className="mx-4">/</div>{" "}
                <p className="text-[15px] text-stone-800 tracking-wider">
                  旅遊文章知識精選
                </p>
              </div>
              <div className="flex flex-col">
                <h3></h3>
              </div>
            </div>
            <Carousel />
          </div>
        </section>
        <section className="w-full bg-[#1f57b8] relative z-50">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
            <div className="grid items-center gap-10 md:grid-cols-2">
              {/* Left: Mosaic */}
              <div className="relative ">
                {/* subtle frame line like screenshot */}
                <div className="absolute -inset-3 rounded-[28px] border border-white/15" />

                <div className="relative grid grid-cols-2 gap-5">
                  {/* col 1 */}
                  <div className="grid gap-5">
                    <Tile src={images.a} className="h-[160px] md:h-[180px]" />
                    <Tile src={images.b} className="h-[320px] md:h-[380px]" />
                    <Tile src={images.e} className="h-[150px] md:h-[170px]" />
                  </div>

                  {/* col 2 */}
                  <div className="grid gap-5 pt-10 md:pt-14">
                    <Tile src={images.d} className="h-[150px] md:h-[270px]" />
                    <Tile src={images.c} className="h-[360px] md:h-[440px]" />
                  </div>
                </div>
              </div>

              {/* Right: Content */}
              <div className="text-white">
                <h2 className="text-4xl font-extrabold tracking-wide md:text-5xl">
                  出國前一定要知道的 eSIM 使用重點
                </h2>

                <p className="mt-6 max-w-xl text-sm leading-loose text-white/80 md:text-base">
                  在購買 eSIM 前，請先確認手機是否支援 eSIM 功能，
                  並建議在出國前完成安裝與設定。
                  部分方案需要在抵達目的地後才會啟用，
                  請避免提前切換，以確保方案正常生效。
                </p>

                <div className="mt-10">
                  <a
                    href="#"
                    className="
                  inline-flex items-center gap-3 rounded-full
                  bg-white px-6 py-3 text-sm font-semibold text-[#1f57b8]
                  shadow-[0_10px_25px_rgba(0,0,0,0.18)]
                  transition-transform duration-200 hover:-translate-y-0.5
                "
                  >
                    More
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1f57b8]/10">
                      &gt;
                    </span>
                  </a>
                </div>

                {/* optional: tiny helper line like screenshot spacing */}
                <div className="mt-10 h-px w-full bg-white/10" />
              </div>
            </div>
          </div>
        </section>
        <section
          className="relative z-50 w-full 
    bg-white/50
    backdrop-blur-2xl
    backdrop-saturate-150
    shadow-lg"
        >
          <div className="mx-auto max-w-[1300px] w-[90%] sm:w-[85%] lg:w-[70%] py-10 sm:py-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
              <div>
                <p className="text-sky-500 font-semibold tracking-wide text-sm sm:text-base">
                  Latest
                </p>
                <h2 className="text-[36px] sm:text-[44px] lg:text-[52px] leading-[1] font-extrabold text-slate-900">
                  News
                </h2>
              </div>
              <span className="text-xs sm:text-sm text-slate-400 sm:pb-1">
                / 出國注意
              </span>
            </div>

            {/* List container */}
            <div className="mt-8 sm:mt-12 space-y-3 sm:space-y-4">
              {items.map((it) => {
                const open = it.id === activeId;

                return (
                  <article
                    key={it.id}
                    className={[
                      "rounded-2xl border transition-shadow overflow-hidden",
                      open ? "border-slate-200 shadow-sm" : "border-slate-200",
                      open ? "bg-slate-50" : "bg-white",
                    ].join(" ")}
                  >
                    {/* Row (clickable) */}
                    <button
                      type="button"
                      onClick={() => setActiveId(open ? null : it.id)}
                      className="w-full text-left"
                    >
                      <div
                        className="
                  p-5 sm:p-7
                  flex flex-col sm:flex-row
                  sm:items-start
                  gap-3 sm:gap-6
                "
                      >
                        {/* Top meta on mobile / left meta on desktop */}
                        <div className="flex items-center justify-between sm:block">
                          <div className="text-xs sm:text-sm text-slate-400 min-w-0 sm:min-w-[110px]">
                            {it.date}
                          </div>

                          {/* Right circle arrow (mobile shows here) */}
                          <div className="sm:hidden">
                            <div
                              className={[
                                "grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-white",
                                "transition-transform duration-300",
                                open ? "rotate-90" : "rotate-0",
                              ].join(" ")}
                              aria-hidden="true"
                            >
                              <span className="text-lg leading-none">→</span>
                            </div>
                          </div>
                        </div>

                        {/* Middle content */}
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2">
                            {it.tags.map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center rounded-md bg-sky-50 px-3 py-1 text-[11px] sm:text-xs font-semibold text-sky-700"
                              >
                                {t}
                              </span>
                            ))}
                          </div>

                          <h3 className="mt-3 text-[16px] sm:text-[18px] font-semibold leading-7 text-slate-900">
                            {it.title}
                          </h3>
                        </div>

                        {/* Right circle arrow (desktop) */}
                        <div className="hidden sm:block pt-1">
                          <div
                            className={[
                              "grid h-12 w-12 place-items-center rounded-full bg-sky-500 text-white",
                              "transition-transform duration-300",
                              open ? "rotate-90" : "rotate-0",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            <span className="text-xl leading-none">→</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded content */}
                    <div
                      className={[
                        "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      ].join(" ")}
                    >
                      <div className="min-h-0">
                        <div className="border-t border-slate-200 px-5 sm:px-7 py-5 sm:py-6">
                          <div className="grid gap-5 sm:gap-6 md:grid-cols-[280px_1fr]">
                            {/* image */}
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              {/* 手機用固定比例避免太高；桌機維持你想要的視覺 */}
                              <div className="aspect-[16/9] md:aspect-auto">
                                <img
                                  src={it.image}
                                  alt=""
                                  className="h-full w-full object-cover md:h-[340px]"
                                />
                              </div>
                            </div>

                            {/* excerpt */}
                            <div>
                              <p className="text-sm leading-7 text-slate-600">
                                {it.excerpt}
                              </p>

                              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                                <a
                                  href="#"
                                  className="
                            inline-flex justify-center items-center
                            rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:opacity-90
                            w-full sm:w-auto
                          "
                                >
                                  More
                                </a>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveId(null);
                                  }}
                                  className="
                            inline-flex justify-center items-center
                            rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50
                            w-full sm:w-auto
                          "
                                >
                                  DETAIL
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#FAFDFF] relative z-50 h-[60vh] flex  border   justify-center items-center">
          <div className="grid grid-cols-2 max-w-[1400px] w-[80%]">
            <div className=" border">
              <div className="   ">
                <h2 className="text-[43px] font-bold">
                  CONTACT{" "}
                  <span className="text-[43px] text-[#3d94f2]">US</span>{" "}
                </h2>
                <p>如遇到問題請立即聯繫我們</p>
              </div>
            </div>
            <div className="border"></div>
          </div>
        </section>
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
