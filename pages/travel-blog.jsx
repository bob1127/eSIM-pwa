"use client";

import React, { useMemo, useState } from "react";
import Layout from "./Layout";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Carousel from "../components/EmblaCarousel06/index";
import { fetchWpPosts, normalizeWpAssetUrl } from "../lib/wordpress";
import { stripHtml } from "@/lib/stripHtml";

function extractFirstImageFromContent(content) {
  if (!content) return null;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/** build 時就把 WP 全文壓成列表卡，避免 /travel-blog page data ~1MB */
function mapWpPostToTravelCard(post) {
  const dateObj = new Date(post.date);
  const postDate = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, "0")}.${String(dateObj.getDate()).padStart(2, "0")}`;

  let tags = ["最新消息"];
  const wpTerms = post._embedded?.["wp:term"]?.flat?.() || [];
  if (wpTerms.length > 0) {
    tags = wpTerms.slice(0, 3).map((term) => term.name).filter(Boolean);
  }

  const featureImageUrl =
    post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
  const inlineImage = extractFirstImageFromContent(post.content?.rendered);
  const excerptHTML = post.excerpt?.rendered || "";
  const title = post.title?.rendered || "";

  return {
    id: String(post.id),
    date: postDate,
    tags,
    title,
    excerptHTML,
    plainExcerpt: stripHtml(excerptHTML).slice(0, 180),
    searchText: `${title} ${tags.join(" ")} ${stripHtml(excerptHTML)}`.slice(
      0,
      500,
    ),
    image:
      normalizeWpAssetUrl(featureImageUrl) ||
      normalizeWpAssetUrl(inlineImage) ||
      "/images/blog/TAIWAN__thumb-_20250304.webp",
    slug: post.slug,
  };
}

export default function InfoPage({ posts = [] }) {
  const tabs = ["全部", "日本", "韓國", "泰國", "馬來西亞", "中國/香港"];
  const [activeTab, setActiveTab] = useState("全部");
  const [activeId, setActiveId] = useState(null);

  const wpItems = useMemo(() => (Array.isArray(posts) ? posts : []), [posts]);

  const displayItems = useMemo(() => {
    if (wpItems.length === 0) return [];
    if (activeTab === "全部") return wpItems;

    const filtered = wpItems.filter(
      (item) =>
        item.title?.includes(activeTab) ||
        item.searchText?.includes(activeTab) ||
        item.tags?.some((tag) => tag.includes(activeTab)),
    );

    if (filtered.length === 0) {
      const shuffled = [...wpItems];
      const shiftAmount = tabs.indexOf(activeTab);
      for (let i = 0; i < shiftAmount; i++) {
        shuffled.push(shuffled.shift());
      }
      return shuffled;
    }

    return filtered;
  }, [activeTab, wpItems]);

  // 🌟 4. 將轉換好的資料傳給 Carousel 用的格式
  const carouselSlides = useMemo(() => {
    return displayItems.map((item) => ({
      image: item.image,
      title: item.title,
      description: item.plainExcerpt,
    }));
  }, [displayItems]);

  // 🌟 5. 動態抓取前 5 篇文章的圖片作為拼圖區塊 (Mosaic) 的素材
  const mosaicImages = useMemo(() => {
    const defaults = [
      "/images/blog/e0a188c1f87c88f8aaba875ce0b577c9.jpg",
      "/images/blog/c3c58b610f86264d909aac5d64caece0.jpg",
      "/images/blog/03c1c69e60c055c532de164f1dec9122.jpg",
      "/images/blog/3c94863fda7f4c9c8ebed31e0cb0bbc4.jpg",
      "/images/blog/4f6bb38e08ca6a6729d3c626ad9acde3.jpg",
    ];
    // 從 wpItems 中提取真實圖片
    const validImages = wpItems.map((item) => item.image);

    return {
      a: validImages[0] || defaults[0],
      b: validImages[1] || defaults[1],
      c: validImages[2] || defaults[2],
      d: validImages[3] || defaults[3],
      e: validImages[4] || defaults[4],
    };
  }, [wpItems]);

  return (
    <Layout>
      <div className="overflow-hidden">
        {/* 背景 */}
        <div className="bg-svg fixed left-1/2 w-[70vw]">
          <img src="/images/6b328ed5b4de80217f388c6ed012feb8.png" alt="" />
        </div>

        {/* 第一區塊：精選輪播區 */}
        <section className="flex relative z-50 justify-end w-full py-20 bg-white/30 backdrop-blur-2xl backdrop-saturate-150 shadow-lg">
          <div className="w-full px-4 sm:w-[80%]">
            {/* Tabs 區塊 */}
            <div className="title flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div className="flex items-center justify-center">
                <h2 className="text-[36px] font-bold text-slate-900">NEWS</h2>
                <div className="mx-4 text-slate-400">/</div>
                <p className="text-[15px] text-stone-800 tracking-wider">
                  旅遊文章知識精選
                </p>
              </div>

              {/* 白藍色系 Tabs UI */}
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setActiveId(null);
                    }}
                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
                      activeTab === tab
                        ? "bg-[#1f57b8] text-white shadow-[0_4px_12px_rgba(31,87,184,0.3)] scale-105"
                        : "bg-white text-[#1f57b8] border border-[#1f57b8]/20 hover:bg-blue-50 hover:scale-105"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* 🚀 Carousel 動畫切換 (這裡修正了：把 carouselSlides 傳給 Carousel) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Carousel slides={carouselSlides} />
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* 拼圖區塊 (抓取 WP 最新 5 張圖片) */}
        <section className="w-full bg-[#1f57b8] relative z-50">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div className="relative ">
                <div className="absolute -inset-3 rounded-[28px] border border-white/15" />
                <div className="relative grid grid-cols-2 gap-5">
                  <div className="grid gap-5">
                    <Tile
                      src="/images/blog/bb302fdcf80de8468a324fac44900180.jpg"
                      className="h-[160px] md:h-[180px]"
                    />
                    <Tile
                      src="/images/blog/9085c7667bb4a404dacd4e5001557fc8.jpg"
                      className="h-[320px] md:h-[380px]"
                    />
                    <Tile
                      src="/images/blog/TAIWAN__thumb-_20250304.webp"
                      className="h-[150px] md:h-[170px]"
                    />
                  </div>
                  <div className="grid gap-5 pt-10 md:pt-14">
                    <Tile
                      src="/images/blog/03c1c69e60c055c532de164f1dec9122.jpg"
                      className="h-[150px] md:h-[270px]"
                    />
                    <Tile
                      src="/images/blog/thum_80-Years-on-the-Journey-to-Peace_2.webp"
                      className="h-[360px] md:h-[440px]"
                    />
                  </div>
                </div>
              </div>

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
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1f57b8] shadow-[0_10px_25px_rgba(0,0,0,0.18)] transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    More
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1f57b8]/10">
                      &gt;
                    </span>
                  </Link>
                </div>
                <div className="mt-10 h-px w-full bg-white/10" />
              </div>
            </div>
          </div>
        </section>

        {/* 文章列表區塊 */}
        <section className="relative z-50 w-full bg-white/50 backdrop-blur-2xl backdrop-saturate-150 shadow-lg min-h-[500px]">
          <div className="mx-auto max-w-[1400px] w-[90%] sm:w-[85%] lg:w-[70%] py-10 sm:py-16">
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
                / {activeTab === "全部" ? "最新文章" : `${activeTab} 相關文章`}
              </span>
            </div>

            {/* News List 動畫切換 (絲滑的 Fade up / Fade down) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 sm:mt-12 space-y-3 sm:space-y-4"
              >
                {displayItems.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
                    載入文章中，或此分類目前無資料...
                  </div>
                ) : (
                  displayItems.map((it) => {
                    const open = it.id === activeId;

                    return (
                      <article
                        key={it.id}
                        className={[
                          "rounded-2xl border transition-shadow overflow-hidden",
                          open
                            ? "border-slate-200 shadow-sm"
                            : "border-slate-200",
                          open ? "bg-slate-50" : "bg-white",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveId(open ? null : it.id)}
                          className="w-full text-left"
                        >
                          <div className="p-5 sm:p-7 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
                            <div className="flex items-center justify-between sm:block">
                              <div className="text-xs sm:text-sm text-slate-400 min-w-0 sm:min-w-[110px]">
                                {it.date}
                              </div>
                              <div className="sm:hidden">
                                <div
                                  className={[
                                    "grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-white transition-transform duration-300",
                                    open ? "rotate-90" : "rotate-0",
                                  ].join(" ")}
                                  aria-hidden="true"
                                >
                                  <span className="text-lg leading-none">
                                    →
                                  </span>
                                </div>
                              </div>
                            </div>

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
                              {/* 渲染真實 WP 標題 (防止 HTML 符號破版) */}
                              <h3
                                className="mt-3 text-[16px] sm:text-[18px] font-semibold leading-7 text-slate-900"
                                dangerouslySetInnerHTML={{ __html: it.title }}
                              />
                            </div>

                            <div className="hidden sm:block pt-1">
                              <div
                                className={[
                                  "grid h-12 w-12 place-items-center rounded-full bg-sky-500 text-white transition-transform duration-300",
                                  open ? "rotate-90" : "rotate-0",
                                ].join(" ")}
                                aria-hidden="true"
                              >
                                <span className="text-xl leading-none">→</span>
                              </div>
                            </div>
                          </div>
                        </button>

                        <div
                          className={[
                            "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
                            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                          ].join(" ")}
                        >
                          <div className="min-h-0">
                            <div className="border-t border-slate-200 px-5 sm:px-7 py-5 sm:py-6">
                              <div className="grid gap-5 sm:gap-6 md:grid-cols-[280px_1fr]">
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                  <div className="aspect-[16/9] md:aspect-auto h-full">
                                    <img
                                      src={it.image}
                                      alt=""
                                      className="h-full w-full object-cover md:h-[340px]"
                                    />
                                  </div>
                                </div>
                                <div>
                                  {/* WP 真實摘要渲染 */}
                                  <div
                                    className="text-sm leading-7 text-slate-600 prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{
                                      __html: it.excerptHTML,
                                    }}
                                  />
                                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                                    <Link
                                      href={`/blog/${it.slug}`}
                                      className="inline-flex justify-center items-center rounded-full bg-[#1f57b8] px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors w-full sm:w-auto"
                                    >
                                      閱讀全文
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setActiveId(null);
                                      }}
                                      className="inline-flex justify-center items-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
                                    >
                                      收合文章
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* 聯絡我們區塊 */}
        <section className="bg-[#FAFDFF] relative z-50 h-[60vh] flex justify-center items-center">
          <div className="grid grid-cols-1 md:grid-cols-2 max-w-[1400px] w-[80%]">
            <div>
              <div>
                <h2 className="text-[43px] font-bold">
                  CONTACT <span className="text-[43px] text-[#3d94f2]">US</span>
                </h2>
                <p>如遇到問題請立即聯繫我們</p>
              </div>
            </div>
            <div></div>
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
        "overflow-hidden rounded-[22px] bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.22)]",
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

export async function getStaticProps() {
  try {
    const raw = await fetchWpPosts({ per_page: 20 });
    return {
      props: { posts: raw.map(mapWpPostToTravelCard) },
      revalidate: 3600,
    };
  } catch {
    return {
      props: { posts: [] },
      revalidate: 3600,
    };
  }
}
