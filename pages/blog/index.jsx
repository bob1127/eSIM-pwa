"use client";

import React, { useEffect, useMemo, useState } from "react";
import Layout from "../Layout";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Carousel from "../../components/EmblaCarousel06/index";
import InfiniteCarousel from "@/components/InfiniteCarousel";
import {
  buildBlogCategoryMaps,
  classifyBlogPost,
  fetchWpCategoriesFromApi,
  fetchWpPostsFromApi,
} from "../../lib/wordpress";
// 🔧 工具：擷取文章內第一張圖片 URL
function extractFirstImageFromContent(content) {
  if (!content) return null;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// 🔧 工具：去除 HTML 標籤
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").replace(/&#\d+;/gm, "");
}

export default function InfoPage() {
  const [posts, setPosts] = useState([]);
  const [categoryMaps, setCategoryMaps] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [activeArticleTab, setActiveArticleTab] = useState("全部");
  const [activeArticleSubTab, setActiveArticleSubTab] = useState("全部");
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState("全部");
  const [activeKnowledgeSubTab, setActiveKnowledgeSubTab] = useState("全部");
  const [activeKnowledgeId, setActiveKnowledgeId] = useState(null);

  useEffect(() => {
    const loadBlogData = async () => {
      try {
        const [postsData, categoriesData] = await Promise.all([
          fetchWpPostsFromApi({ per_page: 100 }),
          fetchWpCategoriesFromApi(),
        ]);
        setPosts(postsData);
        setCategoryMaps(buildBlogCategoryMaps(categoriesData));
      } catch (err) {
        setApiError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadBlogData();
  }, []);

  // 🌟 2. 核心分流邏輯 (修復 Tab 消失的 Bug)
  const { articlePosts, knowledgePosts, articleTabs, knowledgeTabs } =
    useMemo(() => {
      const empty = {
        articlePosts: [],
        knowledgePosts: [],
        articleTabs: ["全部"],
        knowledgeTabs: ["全部"],
      };

      if (!posts?.length || !categoryMaps) {
        return empty;
      }

      const tempArticlePosts = [];
      const tempKnowledgePosts = [];
      const articleCatSet = new Set(categoryMaps.articleTabs);
      const knowledgeCatSet = new Set(categoryMaps.knowledgeTabs);

      posts.forEach((post) => {
        const {
          isArticle,
          isKnowledge,
          articleSubCats,
          knowledgeSubCats,
          articleCountry,
          knowledgeCountry,
        } = classifyBlogPost(post, categoryMaps);

        articleSubCats.forEach((name) => {
          if (name !== "綜合文章") articleCatSet.add(name);
        });
        knowledgeSubCats.forEach((name) => {
          if (name !== "綜合知識") knowledgeCatSet.add(name);
        });

        const dateObj = new Date(post.date);
        const postDate = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, "0")}.${String(dateObj.getDate()).padStart(2, "0")}`;

        let featureImageUrl = null;
        if (
          post._embedded &&
          post._embedded["wp:featuredmedia"] &&
          post._embedded["wp:featuredmedia"].length > 0
        ) {
          featureImageUrl = post._embedded["wp:featuredmedia"][0].source_url;
        }
        const inlineImage = extractFirstImageFromContent(post.content.rendered);
        const finalImage =
          featureImageUrl ||
          inlineImage ||
          "/images/blog/TAIWAN__thumb-_20250304.webp";

        const formattedPost = {
          id: String(post.id),
          date: postDate,
          title: post.title.rendered,
          excerptHTML: post.excerpt.rendered,
          plainExcerpt: stripHtml(post.excerpt.rendered),
          rawContent: post.content.rendered,
          image: finalImage,
          slug: post.slug,
        };

        if (isArticle)
          tempArticlePosts.push({
            ...formattedPost,
            tags: articleSubCats.slice(0, 3),
            subCategories: articleSubCats,
            country: articleCountry,
          });
        if (isKnowledge)
          tempKnowledgePosts.push({
            ...formattedPost,
            tags: knowledgeSubCats.slice(0, 3),
            subCategories: knowledgeSubCats,
            country: knowledgeCountry,
          });
      });

      return {
        articlePosts: tempArticlePosts,
        knowledgePosts: tempKnowledgePosts,
        articleTabs: ["全部", ...Array.from(articleCatSet)],
        knowledgeTabs: ["全部", ...Array.from(knowledgeCatSet)],
      };
    }, [posts, categoryMaps]);

  const articleSubTabs = useMemo(() => {
    if (!categoryMaps || activeArticleTab === "全部") return [];
    return categoryMaps.articleSubTabsByParent[activeArticleTab] || [];
  }, [categoryMaps, activeArticleTab]);

  const knowledgeSubTabs = useMemo(() => {
    if (!categoryMaps || activeKnowledgeTab === "全部") return [];
    return categoryMaps.knowledgeSubTabsByParent[activeKnowledgeTab] || [];
  }, [categoryMaps, activeKnowledgeTab]);

  // 過濾文章（國家 Tab + 子分類 Tab）
  const displayArticleItems = useMemo(() => {
    let items = articlePosts;
    if (activeArticleTab !== "全部") {
      items = items.filter(
        (item) =>
          item.country === activeArticleTab ||
          item.subCategories.includes(activeArticleTab),
      );
    }
    if (activeArticleSubTab !== "全部" && activeArticleTab !== "全部") {
      items = items.filter((item) =>
        item.subCategories.includes(activeArticleSubTab),
      );
    }
    return items;
  }, [activeArticleTab, activeArticleSubTab, articlePosts]);

  const carouselSlides = useMemo(() => {
    return displayArticleItems.map((item) => ({
      image: item.image,
      title: item.title,
      description: item.plainExcerpt,
      link: `/blog/${item.slug}`,
    }));
  }, [displayArticleItems]);

  // 過濾知識（國家 Tab + 子分類 Tab）
  const displayKnowledgeItems = useMemo(() => {
    let items = knowledgePosts;
    if (activeKnowledgeTab !== "全部") {
      items = items.filter(
        (item) =>
          item.country === activeKnowledgeTab ||
          item.subCategories.includes(activeKnowledgeTab),
      );
    }
    if (activeKnowledgeSubTab !== "全部" && activeKnowledgeTab !== "全部") {
      items = items.filter((item) =>
        item.subCategories.includes(activeKnowledgeSubTab),
      );
    }
    return items;
  }, [activeKnowledgeTab, activeKnowledgeSubTab, knowledgePosts]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-[#1f57b8] rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-500 font-bold tracking-widest">
            抓取最新文章中...
          </span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="overflow-hidden">
        {apiError && (
          <div className="relative z-[100] mx-auto mt-4 max-w-[1500px] w-[90%] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            無法載入文章：{apiError}（請重新整理或稍後再試）
          </div>
        )}
        {/* 背景 */}
        <div className="bg-svg fixed left-1/2 w-[70vw]">
          <img src="/images/6b328ed5b4de80217f388c6ed012feb8.png" alt="" />
        </div>

        {/* ========================================== */}
        {/* 第一區塊：文章精選 (Carousel) */}
        {/* ========================================== */}
        <section className="flex relative  flex-col z-50 justify-end w-full pb-20 bg-white/70 backdrop-blur-2xl backdrop-saturate-150 ">
          <div className="banner relative z-[99]   ">
            <InfiniteCarousel />
          </div>
          <div className="w-full px-4 mx-auto max-w-[1500px] sm:w-[80%]">
            <div className="title flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div className="flex items-center justify-center">
                <h2 className="text-6xl font-bold text-stone-700">NEWS</h2>
                <div className="mx-4 text-slate-400">/</div>
                <p className="text-[15px] text-stone-600 tracking-wider">
                  文章精選
                </p>
              </div>

              {/* 文章區：國家 Tab */}
              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                <div className="flex flex-wrap gap-2 justify-end">
                  {articleTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setActiveArticleTab(tab);
                        setActiveArticleSubTab("全部");
                      }}
                      className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
                        activeArticleTab === tab
                          ? "bg-[#1f57b8] text-white shadow-[0_4px_12px_rgba(31,87,184,0.3)] scale-105"
                          : "bg-white text-[#1f57b8] border border-[#1f57b8]/20 hover:bg-blue-50 hover:scale-105"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* 子分類 Tab（選國家後顯示，例如日本 → 東京、大阪） */}
                <AnimatePresence>
                  {articleSubTabs.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 justify-end overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveArticleSubTab("全部")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                          activeArticleSubTab === "全部"
                            ? "bg-slate-800 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        全部
                      </button>
                      {articleSubTabs.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setActiveArticleSubTab(sub)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                            activeArticleSubTab === sub
                              ? "bg-slate-800 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {displayArticleItems.length > 0 ? (
                <motion.div
                  key={`${activeArticleTab}-${activeArticleSubTab}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Carousel slides={carouselSlides} />
                </motion.div>
              ) : (
                <div className="text-center py-20 text-slate-500 font-medium bg-white/50 rounded-2xl border border-slate-200">
                  此分類目前無文章...
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 拼圖區塊 */}
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
                  在購買 eSIM 前，請先確認手機是否支援 eSIM
                  功能，並建議在出國前完成安裝與設定。部分方案需要在抵達目的地後才會啟用，請避免提前切換，以確保方案正常生效。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 第二區塊：知識小幫手 (Accordion List) */}
        {/* ========================================== */}
        <section className="relative z-50 w-full bg-white/50 backdrop-blur-2xl backdrop-saturate-150 shadow-lg min-h-[500px] pb-20">
          <div className="mx-auto max-w-[1400px] w-[90%] sm:w-[85%] lg:w-[70%] py-10 sm:py-16">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 sm:mb-12">
              <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                <div>
                  <p className="text-sky-500 font-semibold tracking-wide text-sm sm:text-base">
                    - 你所想知道的問題
                  </p>
                  <h2 className="text-6xl sm:text-[44px] lg:text-[52px] leading-[1] font-extrabold text-stone-700">
                    Knowledge
                  </h2>
                </div>
                <span className="text-xs sm:text-sm text-stone-600 sm:pb-1">
                  / 知識小幫手
                </span>
              </div>

              {/* 知識區：國家 Tab + 子分類 */}
              <div className="flex flex-col items-end gap-3 w-full xl:w-auto">
                <div className="flex flex-wrap gap-2 justify-end">
                  {knowledgeTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setActiveKnowledgeTab(tab);
                        setActiveKnowledgeSubTab("全部");
                        setActiveKnowledgeId(null);
                      }}
                      className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
                        activeKnowledgeTab === tab
                          ? "bg-[#1f57b8] text-white shadow-[0_4px_12px_rgba(31,87,184,0.3)] scale-105"
                          : "bg-white text-[#1f57b8] border border-[#1f57b8]/20 hover:bg-blue-50 hover:scale-105"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {knowledgeSubTabs.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 justify-end overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveKnowledgeSubTab("全部")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                          activeKnowledgeSubTab === "全部"
                            ? "bg-slate-800 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        全部
                      </button>
                      {knowledgeSubTabs.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            setActiveKnowledgeSubTab(sub);
                            setActiveKnowledgeId(null);
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                            activeKnowledgeSubTab === sub
                              ? "bg-slate-800 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeKnowledgeTab}-${activeKnowledgeSubTab}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3 sm:space-y-4"
              >
                {displayKnowledgeItems.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
                    此分類目前無知識文章...
                  </div>
                ) : (
                  displayKnowledgeItems.map((it) => {
                    const open = it.id === activeKnowledgeId;
                    return (
                      <article
                        key={it.id}
                        className={[
                          "rounded-2xl border transition-shadow overflow-hidden",
                          open
                            ? "border-slate-200 shadow-sm bg-slate-50"
                            : "border-slate-200 bg-white",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveKnowledgeId(open ? null : it.id)
                          }
                          className="w-full text-left"
                        >
                          <div className="p-5 sm:p-7 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
                            <div className="flex items-center justify-between sm:block">
                              <div className="text-xs sm:text-sm text-slate-400 min-w-0 sm:min-w-[110px]">
                                {it.date}
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
                              <h3
                                className="mt-3 text-[16px] sm:text-[18px] font-semibold leading-7 text-slate-900"
                                dangerouslySetInnerHTML={{ __html: it.title }}
                              />
                            </div>
                            <div className="hidden sm:block pt-1">
                              <div
                                className={`grid h-12 w-12 place-items-center rounded-full bg-sky-500 text-white transition-transform duration-300 ${open ? "rotate-90" : "rotate-0"}`}
                              >
                                <span className="text-xl leading-none">→</span>
                              </div>
                            </div>
                          </div>
                        </button>
                        <div
                          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
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
                                  <div
                                    className="text-sm leading-7 text-slate-600 prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{
                                      __html: it.excerptHTML,
                                    }}
                                  />
                                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                                    <Link
                                      href={`/blog/${it.slug}`}
                                      className="inline-flex justify-center items-center rounded-full bg-[#1f57b8] px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 w-full sm:w-auto"
                                    >
                                      閱讀全文
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setActiveKnowledgeId(null);
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
