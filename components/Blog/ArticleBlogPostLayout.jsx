"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import parse, { domToReact, attributesToProps } from "html-react-parser";
import { normalizeWpAssetUrl } from "@/lib/wordpress";

const RELATED_PER_PAGE = 6;

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>?/gm, "")
    .replace(/&#\d+;/gm, "")
    .trim();
}

function prepareWpContentHtml(html) {
  if (!html) return "";
  return html
    .replace(/<table([^>]*)>/gi, (match, attrs = "") => {
      const cleaned = attrs.replace(
        /style="[^"]*display\s*:\s*none[^"]*"/gi,
        "",
      );
      if (/class="/i.test(cleaned)) {
        return `<table${cleaned.replace(/class="([^"]*)"/i, 'class="$1 wp-blog-table"')}>`;
      }
      return `<table class="wp-blog-table"${cleaned}>`;
    });
}

function formatDateJP(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDateMeta(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getPostTerms(post) {
  if (!post?._embedded?.["wp:term"]) return [];
  return post._embedded["wp:term"].flat().filter(Boolean);
}

function getCategoryLabels(post, articleCountry, articleSubCats = []) {
  const terms = getPostTerms(post).filter((t) => t.taxonomy === "category");
  const names = terms
    .map((t) => t.name)
    .filter((n) => n && n !== "文章" && n !== "article");
  if (names.length) return names;
  if (articleCountry) return [articleCountry, ...articleSubCats].filter(Boolean);
  return articleSubCats.length ? articleSubCats : ["旅遊"];
}

function getTagLabels(post) {
  return getPostTerms(post)
    .filter((t) => t.taxonomy === "post_tag")
    .map((t) => t.name)
    .filter(Boolean);
}

function extractHeadings(html) {
  if (!html) return [];
  const matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  return matches
    .map((m, i) => ({
      id: `heading-${i}`,
      text: stripHtml(m[1]),
    }))
    .filter((h) => h.text)
    .slice(0, 8);
}

function RelatedArticlesSection({ posts = [] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(posts.length / RELATED_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * RELATED_PER_PAGE;
    return posts.slice(start, start + RELATED_PER_PAGE);
  }, [posts, safePage]);

  if (!posts.length) {
    return (
      <section className="mt-16 pt-10 border-t border-[#eee]">
        <div className="flex items-baseline gap-3 mb-8">
          <h2 className="text-[20px] font-black tracking-widest text-[#111]">
            RELATED
          </h2>
          <span className="text-[14px] text-[#666]">相關文章</span>
        </div>
        <p className="text-[13px] text-[#999]">目前尚無相關文章</p>
      </section>
    );
  }

  return (
    <section className="mt-16 pt-10 border-t border-[#eee]">
      <div className="flex items-baseline justify-between gap-3 mb-8">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[20px] font-black tracking-widest text-[#111]">
            RELATED
          </h2>
          <span className="text-[14px] text-[#666]">相關文章</span>
        </div>
        {totalPages > 1 && (
          <span className="text-[12px] text-[#999] tracking-wide">
            {safePage} / {totalPages}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {pageItems.map((item) => {
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
              key={item.id}
              href={`/blog/${item.slug}`}
              className="group block"
            >
              <div className="w-full aspect-[3/2] overflow-hidden bg-[#f5f5f5] mb-3">
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
                <span className="w-6 h-6 rounded-full bg-[#0A6CD0] text-white text-[8px] font-black flex items-center justify-center shrink-0">
                  J
                </span>
                <span>{formatDateJP(item.date)}</span>
                <span>Jeko eSIM</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 簡約分頁：超過 6 則才可翻頁；少於等於 6 則仍顯示頁碼列 */}
      <nav
        className="mt-10 flex items-center justify-center gap-1"
        aria-label="相關文章分頁"
      >
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))}
          className="min-w-[36px] h-9 px-2 text-[13px] text-[#666] disabled:text-[#ccc] disabled:cursor-not-allowed hover:text-[#111] transition-colors"
          aria-label="上一頁"
        >
          ‹
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPage(n)}
            aria-current={n === safePage ? "page" : undefined}
            className={`min-w-[36px] h-9 text-[13px] transition-colors ${
              n === safePage
                ? "text-[#111] font-bold border-b-2 border-[#111]"
                : "text-[#999] hover:text-[#111]"
            }`}
          >
            {n}
          </button>
        ))}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() =>
            setPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1))
          }
          className="min-w-[36px] h-9 px-2 text-[13px] text-[#666] disabled:text-[#ccc] disabled:cursor-not-allowed hover:text-[#111] transition-colors"
          aria-label="下一頁"
        >
          ›
        </button>
      </nav>
    </section>
  );
}

function ShareBar({ url, title }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const items = [
    {
      key: "x",
      label: "分享",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      className: "text-black",
    },
    {
      key: "fb",
      label: "分享",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      className: "text-[#1877F2]",
    },
    {
      key: "line",
      label: "LINE 傳送",
      href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
      icon: (
        <span className="w-4 h-4 rounded-full bg-[#06C755] text-white text-[9px] font-black flex items-center justify-center">
          L
        </span>
      ),
      className: "text-[#06C755]",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-5 py-4 border-y border-[#eee]">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-[13px] font-medium hover:opacity-70 transition-opacity ${item.className}`}
        >
          {item.icon}
          {item.label}
        </a>
      ))}
    </div>
  );
}

function RecommendedList({ posts }) {
  if (!posts?.length) {
    return (
      <p className="text-[13px] text-[#999] py-4">目前尚無推薦文章</p>
    );
  }

  return (
    <ul className="divide-y divide-[#eee]">
      {posts.slice(0, 6).map((item) => {
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
        const catLabel = cats[0] || "旅遊";

        return (
          <li key={item.id}>
            <Link
              href={`/blog/${item.slug}`}
              className="flex gap-3 py-3.5 group"
            >
              <div className="w-[88px] h-[66px] shrink-0 overflow-hidden bg-[#f5f5f5]">
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-[#999] mb-1">{catLabel}</p>
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
  );
}

function SidebarSection({ title, href, linkLabel = "查看全部", children }) {
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between border-b border-[#111] pb-2 mb-1">
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
      {children}
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
  children,
}) {
  const titleText = stripHtml(post.title.rendered);
  const shareUrl =
    shareUrlProp ||
    (typeof window !== "undefined"
      ? window.location.href
      : `https://www.jeko-esim.com.tw/blog/${post.slug}`);
  const categoryLabels = getCategoryLabels(post, articleCountry, articleSubCats);
  const tagLabels = getTagLabels(post);
  const displayTags =
    tagLabels.length > 0
      ? tagLabels
      : categoryLabels.map((c) => `#${c}`);
  const headings = extractHeadings(post.content?.rendered || "");
  const primaryCat = categoryLabels[0] || articleCountry || "旅遊";
  const sidebarTags =
    popularTags.length > 0
      ? popularTags
      : categoryLabels.slice(0, 8).map((n) => `#${n}`);

  const renderContent = (html) => {
    let h2Index = 0;
    const prepared = prepareWpContentHtml(html);
    const parseOptions = {
      replace: (node) => {
        if (node.type !== "tag") return undefined;

        if (node.name === "img" && node.attribs?.src) {
          return (
            <div className="my-10">
              <img
                src={normalizeWpAssetUrl(node.attribs.src)}
                alt={node.attribs.alt || ""}
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          );
        }

        if (node.name === "h2") {
          const id = `heading-${h2Index++}`;
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
        }

        if (node.name === "table") {
          const tableProps = attributesToProps(node.attribs || {});
          const mergedClass = ["wp-blog-table", tableProps.className]
            .filter(Boolean)
            .join(" ");
          return (
            <div className="wp-table-wrap my-10 overflow-x-auto rounded-xl border border-[#e5e5e5] bg-white">
              <table
                {...tableProps}
                className={mergedClass}
                style={{ ...tableProps.style, display: "table", width: "100%" }}
              >
                {domToReact(node.children, parseOptions)}
              </table>
            </div>
          );
        }
      },
    };
    return parse(prepared, parseOptions);
  };

  return (
    <div className="bg-white min-h-screen pb-20 font-sans text-[#333]">
      <div className="max-w-[1120px] w-[92%] mx-auto pt-8 md:pt-12">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
          {/* ── 主欄 ── */}
          <main className="w-full lg:flex-1 min-w-0">
            {/* 特色圖 */}
            <div className="relative w-full aspect-[16/9] md:aspect-[2/1] overflow-hidden bg-[#f0f0f0] mb-6 md:mb-8">
              <img
                src={bannerImage}
                alt={titleText}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
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

            {/* 標題 — 字級照舊 */}
            <h1
              className="text-[24px] md:text-[28px] font-bold text-[#111] leading-[1.5] mb-4 tracking-tight"
              dangerouslySetInnerHTML={{ __html: post.title.rendered }}
            />

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#888] mb-2">
              <span>{primaryCat}</span>
              <span>·</span>
              <time dateTime={post.date}>{formatDateMeta(post.date)}</time>
              {post.modified && post.modified !== post.date && (
                <span>（更新 {formatDateMeta(post.modified)}）</span>
              )}
            </div>

            <ShareBar url={shareUrl} title={titleText} />

            {/* 見出し TOC */}
            {headings.length > 0 && (
              <div className="mt-8 mb-10 border border-[#e5e5e5] border-t-[3px] border-t-[#7eb8e8] bg-[#fafafa] px-5 py-5">
                <p className="text-[16px] font-bold text-[#111] mb-3">見出し</p>
                <ol className="space-y-2">
                  {headings.map((h, i) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="text-[14px] text-[#333] hover:text-[#0A6CD0] leading-relaxed"
                      >
                        {i + 1}. {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 內文 */}
            <div className="article-entry-content max-w-none mb-12">
              {renderContent(post.content.rendered)}
            </div>

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

            {/* 編輯部 / 作者盒 */}
            <div className="mt-10 border border-[#e5e5e5] rounded-sm p-5 md:p-6">
              <p className="text-[11px] text-[#999] mb-4 tracking-wide">編輯部</p>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[#0A6CD0] text-white flex items-center justify-center text-[13px] font-black shrink-0">
                  JEKO
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-bold text-[#111]">
                        Jeko eSIM
                      </p>
                      <p className="text-[12px] text-[#888] mt-0.5">編輯部</p>
                    </div>
                    <div className="flex items-center gap-3 text-[#555] shrink-0">
                      <a
                        href="https://www.facebook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="hover:opacity-60"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </a>
                      <a
                        href="https://line.me/R/ti/p/@593gvyzn"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LINE"
                        className="hover:opacity-60"
                      >
                        <span className="w-[18px] h-[18px] rounded bg-[#06C755] text-white text-[10px] font-black flex items-center justify-center">
                          L
                        </span>
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
                Jeko eSIM
                編輯部專注旅遊通訊與現地生活情報，整理各國 eSIM
                方案、交通票券與實用攻略，協助旅客輕鬆出國、無縫連線。
              </p>
            </div>

            {/* 評論等額外區塊（由父層傳入） */}
            {children}
          </main>

          {/* ── 側欄 ── */}
          <aside className="w-full lg:w-[300px] shrink-0 lg:sticky lg:top-28">
            <SidebarSection title="#熱門標籤" href="/blog" linkLabel="標籤一覽">
              <ul className="py-3 space-y-2.5">
                {sidebarTags.slice(0, 10).map((tag) => (
                  <li key={tag}>
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-1.5 text-[13px] text-[#333] hover:text-[#0A6CD0]"
                    >
                      <span className="text-[#0A6CD0] font-bold">#</span>
                      {String(tag).replace(/^#/, "")}
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarSection>

            <SidebarSection title="推薦文章" href="/blog" linkLabel="查看全部">
              <RecommendedList posts={relatedPosts} />
            </SidebarSection>
          </aside>
        </div>

        {/* RELATED + 簡約分頁，每頁 6 則 */}
        <RelatedArticlesSection posts={relatedPosts} />
      </div>

      <style jsx global>{`
        .article-entry-content {
          color: #333;
          font-family:
            "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN",
            "Hiragino Sans", "Noto Sans TC", sans-serif;
          line-height: 2;
          font-size: 15px;
          letter-spacing: 0.03em;
        }
        .article-entry-content h3 {
          font-size: 18px;
          font-weight: 700;
          color: #111;
          margin-top: 40px;
          margin-bottom: 20px;
        }
        .article-entry-content p {
          margin-bottom: 28px;
        }
        .article-entry-content a {
          color: #0a6cd0;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .article-entry-content ul {
          list-style: none;
          padding-left: 0;
          margin-bottom: 28px;
        }
        .article-entry-content li {
          position: relative;
          padding-left: 1.2em;
          margin-bottom: 10px;
        }
        .article-entry-content li::before {
          content: "・";
          position: absolute;
          left: 0;
        }
        .article-entry-content table,
        .article-entry-content .wp-blog-table {
          display: table !important;
          width: 100% !important;
          border-collapse: collapse !important;
          font-size: 14px;
        }
        .article-entry-content table th,
        .article-entry-content table td {
          border: 1px solid #e5e7eb;
          padding: 12px 16px;
          text-align: left;
        }
        .article-entry-content table th {
          background: #f3f4f6;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
