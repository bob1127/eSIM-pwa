"use client";

import Link from "next/link";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ChevronUp } from "lucide-react";
import { normalizeWpAssetUrl } from "@/lib/wordpress";
import { domToReact, attributesToProps } from "html-react-parser";
import {
  FacebookIconSvg,
  InstagramIconSvg,
  LineAppIconSvg,
} from "@/components/social/SocialBrandIcons";
import { SOCIAL_LINKS } from "@/lib/seo.config";
import WpArticleBody from "@/components/Blog/WpArticleBody";
import BlogCreatorEngageBar from "@/components/Blog/BlogCreatorEngageBar";
import CategoryPromoCard from "@/components/CategoryPromoCard";
import ArticleMapToc, {
  extractArticleH2Headings,
} from "@/components/Blog/ArticleMapToc";
import MobileCardCarousel from "@/components/MobileCardCarousel";

import { stripHtml } from "@/lib/stripHtml";

const SKIP_CATEGORY_NAMES = new Set(["文章", "未分類", "uncategorized"]);

function termsFromPost(post, taxonomy) {
  return (
    post?._embedded?.["wp:term"]
      ?.flat()
      ?.filter((t) => t?.taxonomy === taxonomy && t?.name)
      ?.map((t) => String(t.name).trim())
      ?.filter(Boolean) || []
  );
}

/** 文章分類標籤：優先用 SSR 傳入的子分類／國家，再補 WP embedded terms */
function getCategoryLabels(post, articleCountry, articleSubCats = []) {
  const labels = [];
  const push = (name) => {
    const n = String(name || "").trim();
    if (!n || SKIP_CATEGORY_NAMES.has(n) || labels.includes(n)) return;
    labels.push(n);
  };

  (articleSubCats || []).forEach(push);
  push(articleCountry);
  termsFromPost(post, "category").forEach(push);

  return labels;
}

function getTagLabels(post) {
  return termsFromPost(post, "post_tag");
}

/** 相關文章日期：固定格式，避免 Node／瀏覽器 locale 不一致 */
function formatDateJP(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** 文章 meta 日期（標題旁）：固定台北日曆，避免 hydration／SSR locale 差異 */
function formatDateMeta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const taipei = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return `${taipei.getUTCFullYear()}年${taipei.getUTCMonth() + 1}月${taipei.getUTCDate()}日`;
}

function RelatedArticlesSection({ posts = [] }) {
  if (!posts.length) {
    return (
      <section className="mt-16 pt-10 border-t border-[#eee]">
        <div className="flex items-baseline gap-3 mb-8">
          <h2 className="text-[20px] font-bold tracking-widest text-[#111]">
            RELATED
          </h2>
          <span className="text-[14px] text-[#666]">相關文章</span>
        </div>
        <p className="text-[13px] text-[#999]">目前尚無相關文章</p>
      </section>
    );
  }

  const slides = posts.slice(0, 12);

  return (
    <section className="mt-16 pt-10 border-t border-[#eee]">
      <div className="flex items-baseline justify-between gap-3 mb-8">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[20px] font-bold tracking-widest text-[#111]">
            RELATED
          </h2>
          <span className="text-[14px] text-[#666]">相關文章</span>
        </div>
      </div>

      <MobileCardCarousel
        label="相關文章輪播"
        slideClassName="box-border shrink-0 flex-[0_0_78%] min-w-[78%] max-w-[78%] sm:flex-[0_0_48%] sm:min-w-[48%] sm:max-w-[48%] md:flex-[0_0_calc((100%-32px)/3)] md:min-w-[calc((100%-32px)/3)] md:max-w-[calc((100%-32px)/3)]"
        gap={16}
        autoplay
        autoplayDelay={4000}
        loop={slides.length > 2}
        showArrows={slides.length > 1}
        arrowsOutside
        hideArrowsOnMobile
        align="start"
      >
        {slides.map((item) => {
          let thumb = "/images/placeholder.jpg";
          if (item._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
            thumb = normalizeWpAssetUrl(
              item._embedded["wp:featuredmedia"][0].source_url,
            );
          }
          const cats =
            item._embedded?.["wp:term"]
              ?.flat()
              ?.filter((t) => t.taxonomy === "category")
              ?.map((t) => t.name)
              ?.filter((n) => n && n !== "文章") || [];

          return (
            <Link
              key={item.id || item.slug}
              href={`/blog/${item.slug}`}
              className="group block h-full"
            >
              <div className="w-full aspect-[3/2] overflow-hidden bg-[#f5f5f5] mb-3 rounded-[8px]">
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="text-[11px] font-bold tracking-wider text-[#111] mb-1.5 uppercase">
                {cats[0] || "JEKO"}
              </p>
              <h3
                className="text-[15px] font-bold text-[#111] leading-snug line-clamp-3 mb-3 group-hover:text-[#0A6CD0] transition-colors"
                dangerouslySetInnerHTML={{ __html: item.title.rendered }}
              />
              <div className="flex items-center gap-2 text-[12px] text-[#888]">
                <span className="w-6 h-6 rounded-full bg-[#0A6CD0] text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                  J
                </span>
                <span>{formatDateJP(item.date)}</span>
                <span>Jeko eSIM</span>
              </div>
            </Link>
          );
        })}
      </MobileCardCarousel>
    </section>
  );
}

function ShareBar({ url, title }) {
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  };

  /** 永遠分享「當前這篇文章」正式網址（去掉 #hash） */
  const getShareUrl = () => {
    const site = (
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
    ).replace(/\/$/, "");

    if (typeof window !== "undefined") {
      const path = window.location.pathname || "";
      if (path.startsWith("/blog/") && path.length > "/blog/".length) {
        return `${site}${path}`;
      }
    }

    if (url && /\/blog\/.+/.test(url)) {
      return url.split("#")[0].replace(/\/$/, "");
    }

    return url || site;
  };

  const openShareWindow = (href) => {
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=640");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      return true;
    } catch {
      return false;
    }
  };

  /** Instagram 沒有官方網頁分享 API：優先系統分享，否則複製連結 */
  const shareInstagram = async () => {
    const shareUrl = getShareUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url: shareUrl });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    const ok = await copyLink();
    showToast(
      ok
        ? "文章連結已複製，可貼到 Instagram"
        : "請手動複製網址後貼到 Instagram",
    );
  };

  const shareFacebook = () => {
    const shareUrl = getShareUrl();
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    );
  };

  const shareLine = () => {
    const shareUrl = getShareUrl();
    openShareWindow(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`,
    );
  };

  const items = [
    {
      key: "ig",
      label: "IG 分享",
      onClick: shareInstagram,
      className: "text-[#E1306C]",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      key: "fb",
      label: "分享",
      onClick: shareFacebook,
      className: "text-[#1877F2]",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="#1877F2"
          aria-hidden
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      key: "line",
      label: "LINE 傳送",
      onClick: shareLine,
      className: "text-[#067A38]",
      icon: <LineAppIconSvg className="w-4 h-4" />,
    },
  ];

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo?.({ top: 0, behavior: "smooth" });
  };
}

function RecommendedList({ posts }) {
  const boxRef = useRef(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ROW = 88;
    const FOOTER = 44;
    const measure = () => {
      const h = el.clientHeight;
      if (h < 120) {
        setPerPage(5);
        return;
      }
      setPerPage(Math.max(3, Math.floor((h - FOOTER) / ROW)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!posts?.length) {
    return <p className="text-[13px] text-[#999] py-4">目前尚無推薦文章</p>;
  }

  const pages = Math.max(1, Math.ceil(posts.length / perPage));
  const safePage = Math.min(page, pages);
  const slice = posts.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <div ref={boxRef} className="flex-1 min-h-[240px] lg:min-h-0 flex flex-col">
      <ul className="flex-1 min-h-0">
        {slice.map((item) => {
          let thumb = "";
          if (item._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
            thumb = normalizeWpAssetUrl(
              item._embedded["wp:featuredmedia"][0].source_url,
            );
          }
          const cats =
            item._embedded?.["wp:term"]
              ?.flat()
              ?.filter((t) => t.taxonomy === "category")
              ?.map((t) => t.name)
              ?.filter((n) => n && n !== "文章") || [];
          const catLabel = cats[0] || "旅遊";

          return (
            <li key={item.id} className="border-b border-[#eee] last:border-0">
              <Link
                href={`/blog/${item.slug}`}
                className="flex items-center gap-3 py-2.5 group"
              >
                <div className="w-16 h-16 shrink-0 overflow-hidden bg-[#f0f0f0]">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-[#999] leading-none mb-1 truncate">
                    {catLabel}
                  </p>
                  <p
                    className="text-[13px] font-bold text-[#111] leading-snug line-clamp-2 group-hover:text-[#0A6CD0] transition-colors"
                    dangerouslySetInnerHTML={{ __html: item.title.rendered }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {pages > 1 ? (
        <nav
          className="shrink-0 pt-2 pb-1 flex items-center justify-center gap-1"
          aria-label="推薦文章分頁"
        >
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-7 min-w-7 text-[13px] font-bold text-[#0A6CD0] disabled:opacity-30"
          >
            ‹
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`h-7 min-w-7 px-1.5 rounded-full text-[12px] font-bold ${
                n === safePage
                  ? "bg-[#0A6CD0] text-white"
                  : "text-[#555] hover:bg-[#f3f3f3]"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={safePage >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="h-7 min-w-7 text-[13px] font-bold text-[#0A6CD0] disabled:opacity-30"
          >
            ›
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function SidebarSection({ title, href, linkLabel = "查看全部", children, className = "" }) {
  return (
    <section className={`mb-10 last:mb-0 ${className}`}>
      <div className="flex items-end justify-between border-b border-[#111] pb-2 mb-1 shrink-0">
        <h3 className="text-[16px] font-bold text-[#111] tracking-tight">
          {title}
        </h3>
        {href && (
          <Link
            href={href}
            className="text-[12px] text-[#333] underline underline-offset-4 decoration-2 decoration-[#111] hover:opacity-60"
          >
            {linkLabel}
          </Link>
        )}
      </div>
      <div className="min-h-0 flex-1 flex flex-col">{children}</div>
    </section>
  );
}

/**
 * 父分類為「文章」(slug: article) 時使用的 TABIPPO 風格內頁
 * 標題字級維持既有 24 / 28px
 */
export default function ArticleBlogPostLayout({
  post,
  relatedPosts = [],
  popularTags = [],
  articleCountry,
  articleSubCats = [],
  bannerImage,
  shareUrl: shareUrlProp,
  categoryPromo = null,
  children,
}) {
  const titleText = stripHtml(post.title.rendered);
  const shareUrl =
    shareUrlProp ||
    (typeof window !== "undefined"
      ? window.location.href
      : `https://www.jeko-esim.com.tw/blog/${post.slug}`);
  const categoryLabels = getCategoryLabels(
    post,
    articleCountry,
    articleSubCats,
  );
  const tagLabels = getTagLabels(post);
  const displayTags =
    tagLabels.length > 0 ? tagLabels : categoryLabels.map((c) => `#${c}`);
  const headings = extractArticleH2Headings(post.content?.rendered || "");
  const primaryCat = categoryLabels[0] || articleCountry || "旅遊";
  const sidebarTags =
    popularTags.length > 0
      ? popularTags
      : categoryLabels.slice(0, 8).map((n) => `#${n}`);

  const replaceExtras = useCallback(() => {
    let h2Index = 0;
    return {
      onH2: (node, parseOptions) => {
        const id = `article-map-${h2Index++}`;
        const props = attributesToProps(node.attribs || {});
        return (
          <h2
            {...props}
            id={id}
            className="scroll-mt-28 text-[22px] font-bold text-[#111] mt-16 mb-6 leading-[1.5]"
          >
            {domToReact(node.children, parseOptions)}
          </h2>
        );
      },
    };
  }, []);

  return (
    <div className="bg-white min-h-screen pb-20 font-sans text-[#333] pt-[96px] lg:pt-[148px]">
      <div className="max-w-[1280px] w-[92%] mx-auto pt-4 md:pt-6">
        {/* 精選圖：主欄＋側欄同寬滿版、橫式 21:9 */}
        <div className="relative w-full aspect-[21/9] overflow-hidden bg-[#f0f0f0] mb-6 md:mb-8">
          <img
            src={bannerImage}
            alt={titleText}
            className="absolute inset-0 block h-full w-full object-cover"
          />
          <div className="absolute top-4 left-4 flex flex-col gap-2 items-start pointer-events-none z-10">
            <span className="bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide">
              {primaryCat}
            </span>
            {articleCountry && articleCountry !== primaryCat && (
              <span className="bg-white text-[#111] text-[12px] font-bold px-2.5 py-1">
                {articleCountry}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
          {/* ── 主欄 ── */}
          <main className="w-full lg:flex-1 min-w-0">
            {/* 標題 — 字級照舊 */}
            <h1
              className="seo-speakable-title text-[24px] md:text-[28px] font-bold text-[#111] leading-[1.5] mb-4 tracking-tight"
              dangerouslySetInnerHTML={{ __html: post.title.rendered }}
            />

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#888] mb-3">
              <span>{primaryCat}</span>
              <span>·</span>
              <time dateTime={post.date}>{formatDateMeta(post.date)}</time>
              {post.modified && post.modified !== post.date && (
                <span>（更新 {formatDateMeta(post.modified)}）</span>
              )}
            </div>

            <BlogCreatorEngageBar post={post} />

            {post.partnerContribution ? (
              <p className="mb-3 text-[13px] font-semibold text-[#1E4AD1]">
                合作夥伴供稿
                {post.partnerStoreName && post.partnerStoreDomain ? (
                  <>
                    {" · "}
                    <Link
                      href={`/p/${post.partnerStoreDomain}/`}
                      className="underline-offset-2 hover:underline"
                    >
                      {post.partnerStoreName}
                    </Link>
                    {" · "}
                    <Link
                      href={`/p/${post.partnerStoreDomain}/blog/${post.slug}/`}
                      className="font-medium text-[#0A6CD0] underline-offset-2 hover:underline"
                    >
                      夥伴賣場原文
                    </Link>
                  </>
                ) : post.partnerStoreName ? (
                  ` · ${post.partnerStoreName}`
                ) : null}
              </p>
            ) : null}

            {post.excerpt?.rendered && (
              <p className="seo-speakable-summary text-[15px] text-[#555] leading-[1.9] mb-4">
                {stripHtml(post.excerpt.rendered)}
              </p>
            )}

            <ShareBar url={shareUrl} title={titleText} />

            <ArticleMapToc headings={headings} className="mt-8 mb-10" />

            {/* 內文 */}
            <WpArticleBody
              html={post.content.rendered}
              className="article-entry-content max-w-none mb-12"
              replaceExtras={replaceExtras}
              lightboxTitle={titleText || "文章圖片"}
            />

            {/* Tags */}
            {displayTags.length > 0 && (
              <div className="bg-[#f5f5f5] px-4 py-3 mb-8 flex flex-wrap gap-2">
                {displayTags.map((tag) => (
                  <Link
                    key={tag}
                    href="/blog"
                    className="text-[13px] text-[#0A6CD0] hover:underline"
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </Link>
                ))}
              </div>
            )}

            <ShareBar url={shareUrl} title={titleText} />

            {/* 站在你J編 / 作者盒 */}
            <div className="mt-10 border border-[#e5e5e5] rounded-sm p-5 md:p-6">
              <p className="text-[11px] text-[#999] mb-4 tracking-wide">
                站在你J編
              </p>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[#0A6CD0] text-white flex items-center justify-center text-[13px] font-bold shrink-0">
                  JEKO
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-bold text-[#111]">
                        Jeko eSIM
                      </p>
                      <p className="text-[12px] text-[#888] mt-0.5">
                        站在你J編
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[#555] shrink-0">
                      <a
                        href={SOCIAL_LINKS.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="hover:opacity-60"
                      >
                        <InstagramIconSvg className="w-[18px] h-[18px]" />
                      </a>
                      <a
                        href={SOCIAL_LINKS.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="hover:opacity-60"
                      >
                        <FacebookIconSvg className="w-[18px] h-[18px]" />
                      </a>
                      <a
                        href="https://line.me/R/ti/p/@593gvyzn"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LINE"
                        className="hover:opacity-60"
                      >
                        <LineAppIconSvg className="w-[18px] h-[18px]" />
                      </a>
                    </div>
                  </div>
                  <Link
                    href="/blog"
                    className="inline-block mt-3 text-[12px] font-medium border border-[#ccc] rounded-full px-3.5 py-1.5 hover:border-[#111] hover:text-[#111] transition-colors"
                  >
                    前往文章列表
                  </Link>
                </div>
              </div>
              <p className="mt-5 text-[13px] text-[#666] leading-[1.9]">
                Jeko eSIM 站在你J編專注旅遊通訊與現地生活情報，整理各國 eSIM
                方案、交通票券與實用攻略，協助旅客輕鬆出國、無縫連線。
              </p>
            </div>

            {/* 評論等額外區塊（由父層傳入） */}
            {children}
          </main>

          {/* ── 側欄 ── */}
          <aside className="w-full lg:w-[300px] shrink-0 lg:sticky lg:top-28 lg:max-h-[calc(100vh-7rem)] lg:flex lg:flex-col lg:overflow-hidden">
            {categoryPromo ? (
              <div className="shrink-0 mb-6">
                <CategoryPromoCard promo={categoryPromo} />
              </div>
            ) : null}

            <SidebarSection
              title="#熱門標籤"
              href="/blog"
              linkLabel="標籤一覽"
              className="shrink-0 mb-6"
            >
              <ul className="py-3 flex flex-wrap gap-x-3 gap-y-2">
                {sidebarTags.slice(0, 10).map((tag) => (
                  <li key={tag}>
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-1 text-[13px] text-[#333] hover:text-[#0A6CD0]"
                    >
                      <span className="text-[#0A6CD0] font-bold">#</span>
                      {String(tag).replace(/^#/, "")}
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarSection>

            <SidebarSection
              title="推薦文章"
              href="/blog"
              linkLabel="查看全部"
              className="flex-1 min-h-0 flex flex-col mb-0"
            >
              <RecommendedList posts={relatedPosts} />
            </SidebarSection>
          </aside>
        </div>

        {/* RELATED + 簡約分頁，每頁 6 則 */}
        <RelatedArticlesSection posts={relatedPosts} />
      </div>

      <style jsx global>{`
        .article-entry-content {
          color: #111;
          font-family:
            "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN",
            "Hiragino Sans", "Noto Sans TC", sans-serif;
          line-height: 1.7;
          font-size: 15px;
          letter-spacing: 0.02em;
        }
        .article-entry-content h2,
        .article-entry-content h3,
        .article-entry-content h4,
        .article-entry-content p,
        .article-entry-content li,
        .article-entry-content td,
        .article-entry-content th {
          color: #111 !important;
        }
        .article-entry-content h3 {
          font-size: 18px;
          font-weight: 700;
          color: #111;
          margin-top: 32px;
          margin-bottom: 14px;
          line-height: 1.5;
        }
        .article-entry-content p {
          margin-bottom: 1.15em;
          line-height: 1.7;
        }
        .article-entry-content img {
          max-width: 100%;
          height: auto;
        }
        .article-entry-content .fl-wall.tiled-gallery {
          width: 100%;
          max-width: 100%;
        }
        .article-entry-content .tiled-gallery__item img {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          object-fit: cover !important;
          margin: 0 !important;
        }
        .article-entry-content .wp-single-img {
          margin: 32px 0;
          text-align: left;
        }
        .article-entry-content .wp-single-img__btn {
          display: inline-block;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: zoom-in;
          max-width: 100%;
          text-align: left;
        }
        .article-entry-content .wp-single-img__media {
          display: block;
          width: auto !important;
          max-width: 100% !important;
          max-height: min(640px, 70vh) !important;
          height: auto !important;
          margin: 0 !important;
          object-fit: contain;
          border: 1px solid #eee;
          background: #f9f9f9;
        }
        .article-entry-content p span,
        .article-entry-content li span,
        .article-entry-content h2 span,
        .article-entry-content h3 span {
          color: #111 !important;
        }
        .article-entry-content a,
        .article-entry-content a span {
          color: #0a6cd0 !important;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .article-entry-content ul {
          list-style: none;
          padding-left: 0;
          margin-bottom: 1.15em;
        }
        .article-entry-content li {
          position: relative;
          padding-left: 1.2em;
          margin-bottom: 0.45em;
          line-height: 1.7;
        }
        .article-entry-content li::before {
          content: "・";
          position: absolute;
          left: 0;
        }
        .article-entry-content .wp-table-wrap,
        .article-entry-content figure.wp-block-table {
          margin: 40px 0;
          border: none !important;
          box-shadow: none !important;
          background: #f6f7f9;
          border-radius: 6px;
          padding: 12px 8px 16px;
        }
        .article-entry-content table,
        .article-entry-content .wp-blog-table {
          display: table !important;
          table-layout: fixed;
          width: 100% !important;
          min-width: 520px;
          border-collapse: separate !important;
          border-spacing: 0;
          border: none !important;
          font-size: 14px;
          line-height: 1.7;
          letter-spacing: 0.04em;
          color: #111;
          background: transparent;
        }
        .article-entry-content table th,
        .article-entry-content table td {
          display: table-cell !important;
          border: none !important;
          border-bottom: none !important;
          padding: 0.9em 1.15em;
          text-align: left;
          vertical-align: middle;
          word-break: break-word;
          line-height: 1.7;
          letter-spacing: 0.04em;
        }
        .article-entry-content table thead th {
          font-weight: 700;
          font-size: 12px;
          color: #111 !important;
          letter-spacing: 0.16em;
          padding: 1.05em 1.15em 1.15em;
          background: transparent;
        }
        .article-entry-content table th:first-child,
        .article-entry-content table td:first-child {
          width: 24%;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #111 !important;
          white-space: nowrap;
        }
        .article-entry-content table tbody td {
          font-size: 14px;
          font-weight: 400;
          color: #111 !important;
        }
        .article-entry-content table tbody tr:nth-child(odd) td {
          background: #fff;
        }
        .article-entry-content table tbody tr:nth-child(even) td {
          background: transparent;
        }
        .article-entry-content table thead th:nth-child(2),
        .article-entry-content table tbody td:nth-child(2) {
          background: #eef3fb;
        }
        .article-entry-content table tbody tr:nth-child(odd) td:nth-child(2) {
          background: #e8eef8;
        }
        .article-entry-content table thead th:nth-child(2) {
          color: #0a6cd0 !important;
        }
        @media (max-width: 640px) {
          .article-entry-content table,
          .article-entry-content .wp-blog-table {
            min-width: 560px;
            font-size: 13px;
          }
          .article-entry-content table th,
          .article-entry-content table td {
            padding: 0.8em 1em;
          }
        }
      `}</style>
    </div>
  );
}
