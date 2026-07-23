"use client";

import Link from "next/link";
import Image from "next/image";
import parse from "html-react-parser";
import {
  FacebookIconSvg,
  InstagramIconSvg,
  LineIconSvg,
} from "@/components/social/SocialBrandIcons";
import PartnerBlogSidebar from "@/components/Shop/PartnerBlogSidebar";

function ShareButtons({ store, title }) {
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";
  const encoded = encodeURIComponent(shareUrl);
  const text = encodeURIComponent(title || "");

  const items = [
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      icon: <FacebookIconSvg className="w-4 h-4" />,
      className: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    },
    {
      key: "line",
      label: "LINE",
      href: `https://social-plugins.line.me/lineit/share?url=${encoded}`,
      icon: <LineIconSvg className="w-4 h-4" />,
      className: "hover:bg-[#00C300] hover:text-white hover:border-[#00C300]",
    },
    {
      key: "instagram",
      label: "Instagram",
      href: store?.social_instagram?.trim() || null,
      icon: <InstagramIconSvg className="w-4 h-4" />,
      className:
        "hover:bg-gradient-to-br hover:from-[#f58529] hover:via-[#dd2a7b] hover:to-[#8134af] hover:text-white hover:border-transparent",
    },
  ].filter((i) => i.href);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-slate-500 mr-1">
        Share
      </span>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          className={`w-9 h-9 rounded-full border border-slate-300 text-slate-700 inline-flex items-center justify-center transition-colors ${item.className}`}
        >
          {item.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(shareUrl || window.location.href);
          } catch {
            /* ignore */
          }
        }}
        className="text-[11px] font-bold text-slate-500 hover:text-[#0A6CD0] underline-offset-2 hover:underline"
      >
        複製連結
      </button>
    </div>
  );
}

/**
 * 夥伴 Blog 文章內頁（CHA 編輯風格）
 */
export default function PartnerBlogArticleView({
  store,
  post,
  relatedPosts = [],
  pickupProduct = null,
  prevPost = null,
}) {
  const domain = store?.domain;
  if (!post) return null;

  const brand = store?.store_name || "JEKO";
  const authorName =
    post.authorName || store?.footer_company_name || store?.store_name || null;
  const authorBio =
    post.authorBio ||
    store?.description ||
    `${brand} 精選出國旅遊與 eSIM 實用內容。`;

  // 內文：若第一段已在 hero 展示標題，直接顯示全文
  const bodyHtml = post.contentHtml || "";

  return (
    <div className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-stretch min-h-[70vh]">
          {/* ── 主欄 ── */}
          <div className="flex-1 min-w-0 lg:pr-10 lg:border-r lg:border-slate-200 py-8 lg:py-10">
            {/* Logo / brand */}
            <Link
              href={`/p/${domain}/`}
              className="inline-block text-[13px] font-black tracking-[0.2em] uppercase text-slate-900 mb-6"
            >
              {brand}
            </Link>

            {/* Breadcrumb */}
            <nav className="text-[11px] text-slate-400 tracking-wide mb-4">
              <Link href={`/p/${domain}/`} className="hover:text-slate-700">
                HOME
              </Link>
              <span className="mx-1.5">/</span>
              <Link href={`/p/${domain}/blog/`} className="hover:text-slate-700">
                ARTICLE
              </Link>
              <span className="mx-1.5">/</span>
              <span className="uppercase text-slate-600">
                {post.categoryLabel}
              </span>
            </nav>

            {/* Hero */}
            <div className="relative w-full aspect-[16/10] sm:aspect-[21/10] min-h-[240px] bg-[#efeee9] overflow-hidden mb-10">
              {post.image ? (
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 70vw"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <h1 className="text-white text-xl sm:text-2xl lg:text-[28px] font-bold leading-snug max-w-2xl">
                  {post.title}
                </h1>
                <div className="text-white/90 text-[11px] tracking-wide sm:text-right shrink-0">
                  <p>{post.date}</p>
                  <p className="uppercase font-semibold tracking-[0.14em] mt-0.5">
                    {post.categoryLabel}
                  </p>
                  {post.tags?.length ? (
                    <p className="mt-1 text-white/70 max-w-[220px] sm:ml-auto">
                      {post.tags.slice(0, 4).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 flex-col items-center gap-2 text-white/80">
                <span className="w-px h-10 bg-white/50" />
                <span
                  className="text-[9px] font-bold tracking-[0.3em] uppercase"
                  style={{ writingMode: "vertical-rl" }}
                >
                  Scroll
                </span>
              </div>
            </div>

            {/* Body */}
            <div
              className="partner-blog-prose max-w-[720px]
                text-[15px] sm:text-[16px] leading-[2] text-slate-700
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-12 [&_h2]:mb-4
                [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-8 [&_h3]:mb-3
                [&_p]:mb-6
                [&_a]:text-[#0A6CD0] [&_a]:underline-offset-2 hover:[&_a]:underline
                [&_img]:my-8 [&_img]:w-full [&_img]:h-auto
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-6
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-6
                [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500"
            >
              {bodyHtml ? parse(bodyHtml) : (
                <p>{post.excerpt}</p>
              )}
            </div>

            {/* Author box */}
            {authorName ? (
              <div className="mt-14 bg-[#f3f1eb] px-6 py-7 sm:px-8 sm:py-8">
                <p className="text-[15px] font-bold text-slate-900 mb-3">
                  {authorName}
                  {post.source === "partner" ? (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#0A6CD0]">
                      Partner
                    </span>
                  ) : null}
                </p>
                <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">
                  {authorBio}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                  <Link
                    href={`/p/${domain}/`}
                    className="text-[#0A6CD0] hover:underline"
                  >
                    賣場首頁
                  </Link>
                  {store?.social_instagram ? (
                    <a
                      href={store.social_instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A6CD0] hover:underline"
                    >
                      Instagram
                    </a>
                  ) : null}
                  {store?.social_facebook ? (
                    <a
                      href={store.social_facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A6CD0] hover:underline"
                    >
                      Facebook
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Share + tags */}
            <div className="mt-10 pt-8 border-t border-slate-200 space-y-5">
              <ShareButtons store={store} title={post.title} />
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] uppercase bg-slate-900 text-white">
                  {post.categoryLabel}
                </span>
                {(post.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 text-[11px] text-slate-600 border border-slate-200"
                  >
                    {tag}
                  </span>
                ))}
                {post.source === "wordpress" ? (
                  <span className="inline-flex items-center px-2.5 py-1 text-[10px] text-slate-400 border border-slate-100">
                    主站同步
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 text-[10px] text-[#0A6CD0] border border-sky-100">
                    夥伴原創
                  </span>
                )}
              </div>
            </div>

            {/* Related + prev */}
            <section className="mt-16 pb-10">
              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-[13px] font-black tracking-[0.18em] uppercase text-slate-900">
                    Related Articles
                  </h2>
                  <p className="text-[12px] text-slate-500 mt-1">
                    推薦閱讀
                  </p>
                </div>
                {prevPost ? (
                  <Link
                    href={`/p/${domain}/blog/${prevPost.slug}/`}
                    className="hidden sm:block text-right group max-w-[200px]"
                  >
                    <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400 mb-1">
                      上一篇
                    </p>
                    <p className="text-[12px] font-bold text-slate-700 line-clamp-2 group-hover:text-[#0A6CD0]">
                      {prevPost.title}
                    </p>
                  </Link>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {relatedPosts.slice(0, 3).map((r) => (
                  <Link
                    key={r.slug}
                    href={`/p/${domain}/blog/${r.slug}/`}
                    className="group"
                  >
                    <div className="relative aspect-[4/3] bg-[#efeee9] overflow-hidden">
                      {r.image ? (
                        <Image
                          src={r.image}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="30vw"
                        />
                      ) : null}
                    </div>
                    <p className="mt-3 text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#0A6CD0] transition-colors">
                      {r.title}
                    </p>
                    <p className="mt-1.5 text-[10px] text-slate-400 tracking-wide">
                      {r.date}{" "}
                      <span className="uppercase font-semibold">
                        {r.categoryLabel}
                      </span>
                    </p>
                    {r.tags?.length ? (
                      <p className="mt-1 text-[10px] text-slate-400 line-clamp-1">
                        {r.tags.slice(0, 4).join(" ")}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>

              <div className="mt-10">
                <Link
                  href={`/p/${domain}/blog/`}
                  className="text-[12px] font-bold tracking-[0.18em] uppercase text-slate-800 border-b-2 border-slate-800 pb-1 hover:text-[#0A6CD0] hover:border-[#0A6CD0] transition-colors"
                >
                  ← Back to Articles
                </Link>
              </div>
            </section>
          </div>

          {/* ── 側欄 ── */}
          <div className="lg:w-[260px] shrink-0 lg:pl-8 py-8 lg:py-10">
            <PartnerBlogSidebar
              store={store}
              posts={relatedPosts.length ? relatedPosts : [post]}
              pickupProduct={pickupProduct}
              active="article"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
