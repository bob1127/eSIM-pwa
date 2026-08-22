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
import { stripHtml } from "@/lib/stripHtml";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import BlogCardMeta, { BlogDotTags } from "@/components/Blog/BlogCardMeta";

const GENERIC_TAGS = new Set([
  "綜合文章",
  "綜合知識",
  "文章",
  "未分類",
  "Uncategorized",
]);

function pickDisplayTags(names = []) {
  return (names || []).filter((n) => n && !GENERIC_TAGS.has(n)).slice(0, 3);
}

function extractWpAuthor(post) {
  const author = post?._embedded?.author?.[0];
  return {
    authorName: author?.name || post?.yoast_head_json?.author || "Jeko eSIM",
    authorAvatar:
      author?.avatar_urls?.["96"] ||
      author?.avatar_urls?.["48"] ||
      author?.avatar_urls?.["24"] ||
      "/images/Logo/icon-192.png",
  };
}

function extractFirstImageFromContent(content) {
  if (!content) return null;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function BlogFilterSelects({
  tabs,
  activeTab,
  onTabChange,
  subTabs = [],
  activeSubTab,
  onSubChange,
  tabAriaLabel = "選擇分類",
  subAriaLabel = "選擇地區",
}) {
  const selectClass =
    "w-full min-w-[10.5rem] appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-semibold text-slate-800 shadow-sm outline-none transition hover:border-[#1f57b8]/40 focus:border-[#1f57b8] focus:ring-2 focus:ring-[#1f57b8]/20";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full md:w-auto md:justify-end">
      <label className="relative block">
        <span className="sr-only">{tabAriaLabel}</span>
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value)}
          className={selectClass}
          aria-label={tabAriaLabel}
        >
          {tabs.map((tab) => (
            <option key={tab} value={tab}>
              {tab === "全部" ? "全部分類" : tab}
            </option>
          ))}
        </select>
        <SelectChevron />
      </label>

      {subTabs.length > 0 ? (
        <label className="relative block">
          <span className="sr-only">{subAriaLabel}</span>
          <select
            value={activeSubTab}
            onChange={(e) => onSubChange(e.target.value)}
            className={selectClass}
            aria-label={subAriaLabel}
          >
            <option value="全部">全部地區</option>
            {subTabs.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
          <SelectChevron />
        </label>
      ) : null}
    </div>
  );
}

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const DESKTOP_PAGE_SIZE = 8;
const KNOWLEDGE_PAGE_SIZE = 8;

function BlogArticleCard({ slide }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-md">
      <Link
        href={slide.link || "#"}
        className="group/card flex h-full w-full flex-col text-black no-underline"
      >
        <div className="w-full p-4 pb-0">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
            <img
              src={slide.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
              loading="lazy"
            />
          </div>
        </div>
        <div className="flex flex-grow flex-col items-start p-6 text-left">
          <BlogDotTags tags={slide.tags} />
          <h3
            className="mb-3 line-clamp-2 text-lg font-bold leading-snug text-slate-800 transition-colors group-hover/card:text-[#1f57b8]"
            dangerouslySetInnerHTML={{ __html: slide.title }}
          />
          <p
            className="mb-1 line-clamp-3 w-full flex-grow text-sm leading-relaxed text-slate-500"
            dangerouslySetInnerHTML={{ __html: slide.description }}
          />
          <BlogCardMeta
            date={slide.date}
            authorName={slide.authorName}
            authorAvatar={slide.authorAvatar}
            showTags={false}
          />
        </div>
      </Link>
    </div>
  );
}

function visiblePageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }
  return [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
}

function BlogPagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const nums = visiblePageNumbers(page, totalPages);
  const items = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) items.push("ellipsis");
    items.push(n);
  });

  const square =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-none border text-sm font-semibold transition-colors";

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
      aria-label="文章分頁"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="上一頁"
        className={`${square} border-gray-300 bg-white text-slate-700 hover:border-[#1f57b8] hover:bg-[#1f57b8] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:bg-white disabled:hover:text-slate-700`}
      >
        ‹
      </button>
      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span
            key={`e-${i}`}
            className={`${square} border-transparent text-slate-400`}
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`${square} ${
              item === page
                ? "border-[#1f57b8] bg-[#1f57b8] text-white"
                : "border-gray-200 bg-white text-slate-700 hover:border-[#1f57b8] hover:text-[#1f57b8]"
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="下一頁"
        className={`${square} border-gray-300 bg-white text-slate-700 hover:border-[#1f57b8] hover:bg-[#1f57b8] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:bg-white disabled:hover:text-slate-700`}
      >
        ›
      </button>
    </nav>
  );
}

export default function InfoPage() {
  const [posts, setPosts] = useState([]);
  const [partnerCards, setPartnerCards] = useState([]);
  const [categoryMaps, setCategoryMaps] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [activeArticleTab, setActiveArticleTab] = useState("全部");
  const [activeArticleSubTab, setActiveArticleSubTab] = useState("全部");
  const [articlePage, setArticlePage] = useState(1);
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState("全部");
  const [activeKnowledgeSubTab, setActiveKnowledgeSubTab] = useState("全部");
  const [knowledgePage, setKnowledgePage] = useState(1);
  const [activeKnowledgeId, setActiveKnowledgeId] = useState(null);

  useEffect(() => {
    const loadBlogData = async () => {
      try {
        const [postsResult, categoriesResult, partnerResult] =
          await Promise.allSettled([
            fetchWpPostsFromApi({ per_page: 100 }),
            fetchWpCategoriesFromApi(),
            fetch("/api/blog/partner-contributions?limit=100", {
              cache: "no-store",
            }).then(async (r) => {
              if (!r.ok) return [];
              const data = await r.json();
              return Array.isArray(data) ? data : [];
            }),
          ]);

        if (postsResult.status === "fulfilled") {
          setPosts(postsResult.value);
        } else {
          setApiError(postsResult.reason?.message || "無法載入 WordPress 文章");
        }

        if (categoriesResult.status === "fulfilled") {
          setCategoryMaps(buildBlogCategoryMaps(categoriesResult.value));
        } else {
          setCategoryMaps(buildBlogCategoryMaps([]));
        }

        if (partnerResult.status === "fulfilled") {
          setPartnerCards(partnerResult.value);
        }
      } catch (err) {
        setApiError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadBlogData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  // 🌟 2. 核心分流邏輯 (修復 Tab 消失的 Bug)
  const { articlePosts, knowledgePosts, articleTabs, knowledgeTabs } =
    useMemo(() => {
      const emptyMaps = {
        articleTabs: [],
        knowledgeTabs: [],
        articleSubTabsByParent: {},
        knowledgeSubTabsByParent: {},
      };
      const maps = categoryMaps || emptyMaps;

      const tempArticlePosts = [];
      const tempKnowledgePosts = [];
      const articleCatSet = new Set(maps.articleTabs || []);
      const knowledgeCatSet = new Set(maps.knowledgeTabs || []);
      const wpSlugs = new Set();

      if (posts?.length && categoryMaps) {
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
            ...extractWpAuthor(post),
          };

          if (post.slug) wpSlugs.add(post.slug);

          if (isArticle)
            tempArticlePosts.push({
              ...formattedPost,
              tags: pickDisplayTags(articleSubCats),
              subCategories: articleSubCats,
              country: articleCountry,
            });
          if (isKnowledge)
            tempKnowledgePosts.push({
              ...formattedPost,
              tags: pickDisplayTags(knowledgeSubCats),
              subCategories: knowledgeSubCats,
              country: knowledgeCountry,
            });
        });
      }

      // 夥伴供稿：僅在主站尚無同 slug WP 文時併入文章精選
      let hasPartnerContribution = false;
      for (const card of partnerCards || []) {
        if (!card?.slug || wpSlugs.has(card.slug)) continue;
        hasPartnerContribution = true;
        tempArticlePosts.push({
          ...card,
          tags: card.tags?.length ? card.tags : ["合作夥伴供稿"],
          subCategories: ["合作夥伴供稿"],
          country: null,
          partnerContribution: true,
          authorName:
            card.authorName ||
            card.partnerAuthorName ||
            card.partnerStoreName ||
            "合作夥伴",
          authorAvatar: card.authorAvatar || "/images/Logo/icon-192.png",
        });
      }
      if (hasPartnerContribution) {
        articleCatSet.add("合作夥伴供稿");
      }

      // 依日期新到舊（partnerCards 已是新到舊；合併後再排一次）
      tempArticlePosts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

      return {
        articlePosts: tempArticlePosts,
        knowledgePosts: tempKnowledgePosts,
        articleTabs: ["全部", ...Array.from(articleCatSet)],
        knowledgeTabs: ["全部", ...Array.from(knowledgeCatSet)],
      };
    }, [posts, categoryMaps, partnerCards]);

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
      date: item.date,
      authorName: item.authorName,
      authorAvatar: item.authorAvatar,
      tags: item.tags,
    }));
  }, [displayArticleItems]);

  const articleTotalPages = Math.max(
    1,
    Math.ceil(carouselSlides.length / DESKTOP_PAGE_SIZE),
  );
  const pagedArticleSlides = useMemo(() => {
    const page = Math.min(articlePage, articleTotalPages);
    const start = (page - 1) * DESKTOP_PAGE_SIZE;
    return carouselSlides.slice(start, start + DESKTOP_PAGE_SIZE);
  }, [carouselSlides, articlePage, articleTotalPages]);

  useEffect(() => {
    setArticlePage(1);
  }, [activeArticleTab, activeArticleSubTab]);

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

  const knowledgeTotalPages = Math.max(
    1,
    Math.ceil(displayKnowledgeItems.length / KNOWLEDGE_PAGE_SIZE),
  );
  const pagedKnowledgeItems = useMemo(() => {
    const page = Math.min(knowledgePage, knowledgeTotalPages);
    const start = (page - 1) * KNOWLEDGE_PAGE_SIZE;
    return displayKnowledgeItems.slice(start, start + KNOWLEDGE_PAGE_SIZE);
  }, [displayKnowledgeItems, knowledgePage, knowledgeTotalPages]);

  useEffect(() => {
    setKnowledgePage(1);
    setActiveKnowledgeId(null);
  }, [activeKnowledgeTab, activeKnowledgeSubTab]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
          <LoadingIndicator
            layout="inline"
            label="抓取最新文章中..."
            size="lg"
            labelClassName="font-bold tracking-widest text-gray-500"
          />
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

              {/* 文章區：分類／地區下拉 */}
              <BlogFilterSelects
                tabs={articleTabs}
                activeTab={activeArticleTab}
                onTabChange={(tab) => {
                  setActiveArticleTab(tab);
                  setActiveArticleSubTab("全部");
                }}
                subTabs={articleSubTabs}
                activeSubTab={activeArticleSubTab}
                onSubChange={setActiveArticleSubTab}
                tabAriaLabel="文章分類"
                subAriaLabel="文章地區"
              />
            </div>

            {displayArticleItems.length > 0 ? (
              <>
                <div className="md:hidden">
                  <Carousel slides={carouselSlides} />
                </div>
                <div className="hidden md:block">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${activeArticleTab}-${activeArticleSubTab}-${articlePage}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 30 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
                        {pagedArticleSlides.map((slide, index) => (
                          <BlogArticleCard
                            key={slide.link || index}
                            slide={slide}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <BlogPagination
                    page={Math.min(articlePage, articleTotalPages)}
                    totalPages={articleTotalPages}
                    onChange={setArticlePage}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-slate-500 font-medium bg-white/50 rounded-2xl border border-slate-200">
                此分類目前無文章...
              </div>
            )}
          </div>
        </section>

        {/* 雙欄無限跑馬燈 */}
        <section className="w-full bg-[#1f57b8] relative z-50 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div className="relative px-1">
                <div className="absolute -inset-3 rounded-[28px] border border-white/15 pointer-events-none z-10" />
                <div className="relative h-[480px] md:h-[620px] overflow-hidden rounded-[22px]">
                  <div className="grid h-full grid-cols-2 gap-3 md:gap-4">
                    <VerticalMarquee
                      items={BLOG_MARQUEE_UP}
                      duration={28}
                    />
                    <VerticalMarquee
                      items={BLOG_MARQUEE_DOWN}
                      duration={36}
                      reverse
                      className="pt-10 md:pt-14"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#1f57b8] to-transparent z-[5]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1f57b8] to-transparent z-[5]" />
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
          <style jsx global>{`
            @keyframes blogMarqueeY {
              0% {
                transform: translateY(0);
              }
              100% {
                transform: translateY(-50%);
              }
            }
          `}</style>
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

              {/* 知識區：分類／地區下拉 */}
              <BlogFilterSelects
                tabs={knowledgeTabs}
                activeTab={activeKnowledgeTab}
                onTabChange={(tab) => {
                  setActiveKnowledgeTab(tab);
                  setActiveKnowledgeSubTab("全部");
                  setActiveKnowledgeId(null);
                }}
                subTabs={knowledgeSubTabs}
                activeSubTab={activeKnowledgeSubTab}
                onSubChange={(sub) => {
                  setActiveKnowledgeSubTab(sub);
                  setActiveKnowledgeId(null);
                }}
                tabAriaLabel="知識分類"
                subAriaLabel="知識地區"
              />
            </div>

            {displayKnowledgeItems.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
                此分類目前無知識文章...
              </div>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeKnowledgeTab}-${activeKnowledgeSubTab}-${knowledgePage}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3 sm:space-y-4"
                  >
                    {pagedKnowledgeItems.map((it) => {
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
                                <BlogDotTags tags={it.tags} />
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
                    })}
                  </motion.div>
                </AnimatePresence>
                <BlogPagination
                  page={Math.min(knowledgePage, knowledgeTotalPages)}
                  totalPages={knowledgeTotalPages}
                  onChange={(next) => {
                    setKnowledgePage(next);
                    setActiveKnowledgeId(null);
                  }}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function VerticalMarquee({
  items = [],
  duration = 30,
  reverse = false,
  className = "",
}) {
  const loop = [...items, ...items];
  return (
    <div className={["h-full overflow-hidden", className].filter(Boolean).join(" ")}>
      <div
        className="flex flex-col gap-3 md:gap-4 will-change-transform"
        style={{
          animation: `blogMarqueeY ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
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
    </div>
  );
}

const BLOG_MARQUEE_UP = [
  { src: "/images/japan-esim-banner.jpg", alt: "日本 eSIM" },
  { src: "/images/korea-esim-banner.jpg", alt: "韓國 eSIM" },
  { src: "/images/hongkung-esim-banner.jpg", alt: "香港 eSIM" },
  { src: "/images/01.png", alt: "Jeko eSIM" },
];

const BLOG_MARQUEE_DOWN = [
  { src: "/images/tailand-esim-banner.jpg", alt: "泰國 eSIM" },
  { src: "/images/malaysia-esim-banner.jpg", alt: "馬來西亞 eSIM" },
  {
    src: "/images/Generated-Image-November-15,-2025---5_19PM.png",
    alt: "旅遊配件",
  },
];
