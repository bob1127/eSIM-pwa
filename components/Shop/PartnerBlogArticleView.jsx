"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import PartnerBlogSidebar from "@/components/Shop/PartnerBlogSidebar";
import PartnerBlogByline from "@/components/Shop/PartnerBlogByline";
import PartnerShareButtons from "@/components/Shop/PartnerShareButtons";
import WpArticleBody from "@/components/Blog/WpArticleBody";
import MediaGalleryLightbox from "@/components/MediaGalleryLightbox";
import { collectWpArticleImages } from "@/components/Blog/BlogArticleLightbox";
import { normalizeWpAssetUrl } from "@/lib/wordpress";
import { SITE_URL } from "@/lib/seo.config";
import PartnerBlogBlocksRender from "@/components/partner/blog-builder/PartnerBlogBlocksRender";
import PartnerContentDisclaimer from "@/components/legal/PartnerContentDisclaimer";
import MobileCardCarousel from "@/components/MobileCardCarousel";

function RelatedReadCard({ post, href }) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[4/3] bg-[#efeee9] overflow-hidden">
        {post.image ? (
          <Image
            src={post.image}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, 30vw"
          />
        ) : null}
      </div>
      <p className="mt-3 text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#0A6CD0] transition-colors">
        {post.title}
      </p>
      <p className="mt-1.5 text-[10px] text-slate-400 tracking-wide">
        {post.date}{" "}
        <span className="uppercase font-semibold">{post.categoryLabel}</span>
      </p>
      {post.tags?.length ? (
        <p className="mt-1 text-[10px] text-slate-400 line-clamp-1">
          {post.tags.slice(0, 4).join(" ")}
        </p>
      ) : null}
    </Link>
  );
}

/**
 * 夥伴 Blog 文章內頁（CHA 編輯風格）
 */
export default function PartnerBlogArticleView({
  store,
  post,
  relatedPosts = [],
  prevPost = null,
  variant = "partner",
}) {
  const domain = store?.domain;
  const isMain = variant === "main";
  const articleHref = (slug) =>
    isMain ? `/blog/${slug}/` : `/p/${domain}/blog/${slug}/`;
  const listHref = isMain ? "/blog/" : `/p/${domain}/blog/`;
  const shareUrl = isMain
    ? `${SITE_URL}/blog/${post?.slug}/`
    : `${SITE_URL}/p/${domain}/blog/${post?.slug}/`;
  const brand = store?.store_name || "JEKO";
  const authorName =
    post?.authorName || store?.footer_company_name || store?.store_name || null;
  const authorBio =
    post?.authorBio ||
    store?.description ||
    `${brand} 精選出國旅遊與 eSIM 實用內容。`;

  const bodyHtml = post?.contentHtml || "";
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const related = relatedPosts.slice(0, 6);

  const articleGallery = useMemo(() => {
    const list = [];
    if (post?.image) {
      const src = normalizeWpAssetUrl(post.image);
      list.push({
        src,
        thumb: src,
        alt: post.title || "",
        type: "image",
      });
    }
    list.push(...collectWpArticleImages(bodyHtml));
    const seen = new Set();
    return list.filter((item) => {
      if (!item?.src || seen.has(item.src)) return false;
      seen.add(item.src);
      return true;
    });
  }, [post?.image, post?.title, bodyHtml]);

  const bodyClassName = `partner-blog-prose w-full
                text-[15px] sm:text-[16px] leading-[2] text-slate-700`;
  const htmlProseClassName = `${bodyClassName}
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:leading-snug
                [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:leading-snug
                [&_p]:mb-6
                [&_a]:text-[#0A6CD0] [&_a]:underline-offset-2 hover:[&_a]:underline
                [&_img]:my-8 [&_img]:block [&_img]:w-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-[100dvh] [&_img]:object-contain
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-6
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-6
                [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500
                [&_button]:cursor-zoom-in`;

  if (!post) return null;

  return (
    <div className="bg-white">
      <div className="max-w-[1680px] w-[96%] mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start min-h-[70vh]">
          {/* ── 主欄 ── */}
          <div className="flex-1 min-w-0 lg:pr-10 lg:border-r lg:border-slate-200 py-8 lg:py-10">
            {/* Logo / brand */}
            <Link
              href={isMain ? "/blog/" : `/p/${domain}/`}
              className="inline-block text-[13px] font-black tracking-[0.2em] uppercase text-slate-900 mb-6"
            >
              {isMain ? "NEWS" : brand}
            </Link>

            {/* Breadcrumb */}
            <nav className="text-[12px] text-slate-400 tracking-wide mb-4">
              {isMain ? (
                <>
                  <Link href="/" className="hover:text-slate-700">
                    首頁
                  </Link>
                  <span className="mx-1.5">/</span>
                  <Link href="/blog/" className="hover:text-slate-700">
                    旅遊文章
                  </Link>
                  <span className="mx-1.5">/</span>
                  <span className="text-[#0A6CD0]">合作夥伴供稿</span>
                </>
              ) : (
                <>
                  <Link href={`/p/${domain}/`} className="hover:text-slate-700">
                    首頁
                  </Link>
                  <span className="mx-1.5">/</span>
                  <Link href={`/p/${domain}/blog/`} className="hover:text-slate-700">
                    旅遊文章
                  </Link>
                  <span className="mx-1.5">/</span>
                  <span className="text-slate-600">{post.categoryLabel}</span>
                </>
              )}
            </nav>

            {/* Hero */}
            <div className="relative w-full max-h-[100dvh] aspect-[16/10] sm:aspect-[21/10] min-h-[240px] bg-[#efeee9] overflow-hidden mb-10">
              {post.image ? (
                <button
                  type="button"
                  className="absolute inset-0 block w-full h-full cursor-zoom-in text-left"
                  onClick={() =>
                    articleGallery.length > 0 && setCoverLightboxOpen(true)
                  }
                  aria-label="查看文章圖片幻燈片"
                >
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 80vw"
                  />
                </button>
              ) : null}
              {isMain ? (
                <span className="absolute top-4 left-4 z-10 bg-[#1E4AD1] text-white text-[11px] font-bold px-2.5 py-1 tracking-wide">
                  合作夥伴供稿
                </span>
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pointer-events-none">
                <h1 className="text-white text-xl sm:text-2xl lg:text-[28px] font-bold leading-snug max-w-2xl">
                  {post.title}
                </h1>
                <div className="text-white/90 text-[11px] tracking-wide sm:text-right shrink-0 max-w-[260px] sm:ml-auto">
                  <p className="uppercase font-semibold tracking-[0.14em] mb-2">
                    {post.categoryLabel}
                  </p>
                  <PartnerBlogByline post={post} tone="light" compact />
                </div>
              </div>
              <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 flex-col items-center gap-2 text-white/80 pointer-events-none">
                <span className="w-px h-10 bg-white/50" />
                <span
                  className="text-[9px] font-bold tracking-[0.2em]"
                  style={{ writingMode: "vertical-rl" }}
                >
                  往下看
                </span>
              </div>
            </div>

            {/* Body：視覺區塊優先，否則 HTML */}
            {Array.isArray(post?.blocks) && post.blocks.length > 0 ? (
              <div className={bodyClassName}>
                <PartnerBlogBlocksRender
                  blocks={post.blocks}
                  shareContext={{
                    store,
                    title: post.title,
                    slug: post.slug,
                    shareUrl,
                  }}
                />
              </div>
            ) : bodyHtml ? (
              <WpArticleBody
                html={bodyHtml}
                className={htmlProseClassName}
                lightboxTitle={post.title || "文章圖片"}
              />
            ) : (
              <div className={htmlProseClassName}>
                <p>{post.excerpt}</p>
              </div>
            )}

            <MediaGalleryLightbox
              isOpen={coverLightboxOpen}
              onClose={() => setCoverLightboxOpen(false)}
              images={articleGallery}
              title={post.title || "文章圖片"}
              initialIndex={0}
              ariaLabel="文章圖片幻燈片"
            />

            {/* Author box */}
            {authorName ? (
              <div className="mt-14">
                <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-2">
                  編輯者
                </p>
                <p className="text-[17px] font-bold text-slate-900 mb-1">
                  {authorName}
                  {post.source === "partner" || post.source === "partner-demo" ? (
                    <span className="ml-2 align-middle text-[10px] font-bold tracking-wider text-[#0A6CD0]">
                      夥伴
                    </span>
                  ) : null}
                </p>
                <PartnerBlogByline post={post} className="mb-3" />
                <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">
                  {authorBio}
                </p>
                <div className="mt-4">
                  <Link
                    href={`/p/${domain}/`}
                    className="text-[12px] text-[#0A6CD0] hover:underline"
                  >
                    賣場首頁
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Share + tags */}
            <div className="mt-10 pt-8 border-t border-slate-200 space-y-5">
              <PartnerShareButtons
                store={store}
                title={post.title}
                slug={post.slug}
                shareUrl={shareUrl}
              />
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
              {post.source !== "wordpress" ? (
                <PartnerContentDisclaimer variant="compact" className="pt-1" />
              ) : null}
            </div>

            {/* Related + prev */}
            <section className="mt-16 pb-10">
              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-[15px] font-black text-slate-900">
                    推薦閱讀
                  </h2>
                </div>
                {prevPost ? (
                  <Link
                    href={articleHref(prevPost.slug)}
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

              <div className="sm:hidden">
                {related.length ? (
                  <MobileCardCarousel
                    slideClassName="min-w-0 flex-[0_0_50%]"
                    gap={12}
                    autoplay
                    autoplayDelay={4000}
                    loop={related.length > 2}
                    showArrows={false}
                  >
                    {related.map((r) => (
                      <RelatedReadCard
                        key={r.slug}
                        post={r}
                        href={articleHref(r.slug)}
                      />
                    ))}
                  </MobileCardCarousel>
                ) : null}
              </div>
              <div className="hidden sm:grid grid-cols-3 gap-5">
                {related.slice(0, 3).map((r) => (
                  <RelatedReadCard
                    key={r.slug}
                    post={r}
                    href={articleHref(r.slug)}
                  />
                ))}
              </div>

              <div className="mt-10">
                <Link
                  href={listHref}
                  className="text-[13px] font-bold text-slate-800 border-b-2 border-slate-800 pb-1 hover:text-[#0A6CD0] hover:border-[#0A6CD0] transition-colors"
                >
                  ← 返回文章列表
                </Link>
              </div>
            </section>
          </div>

          {/* ── 側欄 ── */}
          <div className="lg:w-[300px] shrink-0 lg:pl-8 py-8 lg:py-10 lg:self-start">
            <PartnerBlogSidebar
              store={store}
              posts={relatedPosts.length ? [post, ...relatedPosts] : [post]}
              active="article"
              articleHref={articleHref}
              selectedCategory={post?.categoryLabel || ""}
              listHref={listHref}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
