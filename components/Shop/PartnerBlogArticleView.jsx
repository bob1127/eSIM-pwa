"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import PartnerBlogSidebar from "@/components/Shop/PartnerBlogSidebar";
import PartnerBlogByline from "@/components/Shop/PartnerBlogByline";
import PartnerShareButtons from "@/components/Shop/PartnerShareButtons";
import WpArticleBody from "@/components/Blog/WpArticleBody";
import MediaGalleryLightbox from "@/components/MediaGalleryLightbox";
import {
  BlogArticleLightboxProvider,
  collectWpArticleImages,
} from "@/components/Blog/BlogArticleLightbox";
import {
  collectPartnerBlogBlockImages,
  mergeArticleGalleryLists,
} from "@/lib/partnerBlogBlockImages";
import { normalizeWpAssetUrl } from "@/lib/wordpress";
import { SITE_URL } from "@/lib/seo.config";
import PartnerBlogBlocksRender from "@/components/partner/blog-builder/PartnerBlogBlocksRender";
import PartnerBlogItineraryView, {
  ItineraryDaysNav,
} from "@/components/Shop/PartnerBlogItineraryView";
import { isItineraryBlocks } from "@/lib/partnerBlogItinerary";
import MobileCardCarousel from "@/components/MobileCardCarousel";
import BlogCreatorEngageBar from "@/components/Blog/BlogCreatorEngageBar";

function RelatedReadCard({ post, href }) {
  const excerpt = String(post.excerpt || post.metaDescription || "")
    .replace(/<[^>]+>/g, "")
    .trim();
  const tags = (post.tags || []).filter(Boolean).slice(0, 3);

  return (
    <Link
      href={href}
      className="group flex flex-col h-full w-full min-w-0 bg-white border border-slate-200 overflow-hidden"
    >
      <div className="relative aspect-[4/3] bg-[#efeee9] overflow-hidden">
        {post.image ? (
          <Image
            src={post.image}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 72vw, (max-width:1024px) 46vw, 340px"
          />
        ) : null}
        {post.categoryLabel ? (
          <span className="absolute left-2.5 top-2.5 bg-black/75 text-white text-[10px] font-bold tracking-wide px-2 py-0.5">
            {post.categoryLabel}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 px-3.5 py-3.5 flex flex-col">
        <p className="text-[15px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#0A6CD0] transition-colors">
          {post.title}
        </p>
        {excerpt ? (
          <p className="mt-2 text-[13px] text-slate-500 leading-relaxed line-clamp-2">
            {excerpt}
          </p>
        ) : null}
        {tags.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 text-[11px] text-slate-500 border border-slate-200"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        ) : null}
        {post.date ? (
          <p className="mt-auto pt-3 text-[12px] text-slate-400">{post.date}</p>
        ) : null}
      </div>
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
  latestPosts = [],
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
    store?.store_name ||
    post?.authorName ||
    store?.footer_company_name ||
    null;
  const authorBio =
    store?.description ||
    post?.authorBio ||
    `${brand} 精選出國旅遊與 eSIM 實用內容。`;
  const bylinePost = {
    ...post,
    editorName: authorName || post?.editorName,
    authorName: authorName || post?.authorName,
  };

  const bodyHtml = post?.contentHtml || "";
  const hasBlocks = Array.isArray(post?.blocks) && post.blocks.length > 0;
  const itinerary = isItineraryBlocks(post?.blocks);
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const related = relatedPosts.slice(0, 12);
  const sidebarPosts = useMemo(() => {
    const rest = (latestPosts.length ? latestPosts : relatedPosts).filter(
      (p) => p?.slug && p.slug !== post?.slug,
    );
    return post ? [post, ...rest] : rest;
  }, [latestPosts, relatedPosts, post]);

  const articleGallery = useMemo(() => {
    const cover = post?.image
      ? [
          {
            src: normalizeWpAssetUrl(post.image),
            thumb: normalizeWpAssetUrl(post.image),
            alt: post.title || "",
            type: "image",
          },
        ]
      : [];
    if (hasBlocks && !itinerary) {
      const { images: blockImages } = collectPartnerBlogBlockImages(
        post.blocks,
      );
      return mergeArticleGalleryLists(cover, blockImages);
    }
    return mergeArticleGalleryLists(cover, collectWpArticleImages(bodyHtml));
  }, [post?.image, post?.title, post?.blocks, bodyHtml, hasBlocks, itinerary]);

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

  const shellClass =
    "max-w-[1480px] w-[96%] mx-auto px-3 sm:px-5 lg:px-8";
  const mainColumnClass = "min-w-0 w-full lg:max-w-[calc(100%-330px)]";

  const breadcrumb = isMain ? (
    <>
      <Link href="/" className="hover:text-slate-700">
        首頁
      </Link>
      <span className="mx-1.5">/</span>
      <Link href="/blog/" className="hover:text-slate-700">
        旅遊文章
      </Link>
      <span className="mx-1.5">/</span>
      <span className="text-[#0A6CD0] line-clamp-1 max-w-[min(70vw,28rem)]">
        {post.title}
      </span>
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
  );

  return (
    <div className="bg-white min-h-screen">
      <div className={`${shellClass} pt-8 lg:pt-10`}>
        <Link
          href={isMain ? "/blog/" : `/p/${domain}/`}
          className="inline-block text-[13px] font-black tracking-[0.2em] uppercase text-slate-900 mb-4"
        >
          {isMain ? "NEWS" : brand}
        </Link>
        <nav className="text-[12px] text-slate-400 tracking-wide mb-5 md:mb-6">
          {breadcrumb}
        </nav>

        {/* Hero：與下方主欄+側欄同一內容寬對齊（非視窗滿版） */}
        <div className="relative w-full aspect-[16/9] md:aspect-[2/1] bg-[#efeee9] overflow-hidden mb-6 md:mb-8">
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
                sizes="(max-width:1480px) 96vw, 1480px"
              />
            </button>
          ) : null}
          {isMain ? (
            <span className="absolute top-4 left-4 z-10 bg-[#1E4AD1] text-white text-[11px] font-bold px-2.5 py-1 tracking-wide">
              合作夥伴供稿
            </span>
          ) : post.categoryLabel ? (
            <span className="absolute top-4 left-4 z-10 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide">
              {post.categoryLabel}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start min-h-[70vh] gap-6 lg:gap-0 pb-8 lg:pb-12">
          {/* ── 主欄 ── */}
          <div className={`flex-1 ${mainColumnClass} lg:pr-10 pb-8 lg:pb-10`}>
            <h1 className="text-[24px] md:text-[28px] font-bold text-[#111] leading-[1.5] mb-4 tracking-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#888] mb-3">
              <span>{post.categoryLabel || "旅遊"}</span>
              <span>·</span>
              <span>{post.publishedLabel || post.date || ""}</span>
              {post.wasEdited && post.updatedLabel ? (
                <span>（更新 {post.updatedLabel}）</span>
              ) : null}
            </div>
            <BlogCreatorEngageBar
              avatar={store?.logo_url || ""}
              post={{
                ...post,
                partnerStoreName: store?.store_name,
                partnerAuthorName: post.authorName,
                partnerStoreDomain: domain,
                partnerContribution:
                  Boolean(isMain) || post.source === "partner",
              }}
              partnerDomain={domain}
            />

            {/* Body：視覺區塊優先，否則 HTML */}
            {itinerary ? (
              <PartnerBlogItineraryView
                blocks={post.blocks}
                category={post.categoryLabel}
                title={post.title}
                tags={post.tags}
              />
            ) : hasBlocks ? (
              <BlogArticleLightboxProvider
                images={articleGallery}
                title={post.title || "文章圖片"}
              >
                <div className={`${bodyClassName} [&_img]:cursor-zoom-in [&_button]:cursor-zoom-in`}>
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
              </BlogArticleLightboxProvider>
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
          </div>

          <div className="lg:w-[300px] shrink-0 lg:sticky lg:top-[148px] lg:h-[calc(100dvh-188px)] lg:max-h-[calc(100dvh-188px)] lg:self-start lg:overflow-hidden lg:pl-[30px]">
            <div className="bg-white h-full overflow-hidden flex flex-col p-5 lg:p-[30px] lg:pb-6">
              <PartnerBlogSidebar
                store={store}
                posts={sidebarPosts}
                active="article"
                variant={isMain ? "main" : "partner"}
                articleHref={articleHref}
                listHref={listHref}
                showSearch={false}
                showCategories={false}
                fillHeight
                extra={
                  itinerary ? (
                    <div className="hidden lg:block">
                      <ItineraryDaysNav blocks={post.blocks} />
                    </div>
                  ) : null
                }
              />
            </div>
          </div>
        </div>
      </div>

      <section className="border-t border-slate-100 w-full">
        <div className={`${shellClass} py-8 sm:py-10`}>
          <div className={mainColumnClass}>
          {authorName ? (
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-2">
                編輯者
              </p>
              <p className="text-[17px] font-bold text-slate-900 mb-1">
                {authorName}
                {post.source === "partner" ||
                post.source === "partner-demo" ? (
                  <span className="ml-2 align-middle text-[10px] font-bold tracking-wider text-[#0A6CD0]">
                    夥伴
                  </span>
                ) : null}
              </p>
              <PartnerBlogByline post={bylinePost} className="mb-3" />
              <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">
                {authorBio}
              </p>
              <div className="mt-4">
                <Link
                  href={isMain ? "/" : `/p/${domain}/`}
                  className="text-[12px] text-[#0A6CD0] hover:underline"
                >
                  {isMain ? "官網首頁" : "賣場首頁"}
                </Link>
                {isMain ? (
                  <>
                    <span className="mx-2 text-slate-300">·</span>
                    <Link
                      href="/blog/"
                      className="text-[12px] text-[#0A6CD0] hover:underline"
                    >
                      旅遊文章
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            className={`${
              authorName ? "mt-10 pt-8 border-t border-slate-200" : ""
            } hidden md:block`}
          >
            <PartnerShareButtons
              store={store}
              title={post.title}
              slug={post.slug}
              shareUrl={shareUrl}
              items="copy,native"
              layout="split"
            />
          </div>
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="border-t border-slate-100 w-full">
          <div className={`${shellClass} pt-10 pb-4 flex items-end justify-between gap-4`}>
            <h2 className="text-[15px] font-black text-slate-900">推薦閱讀</h2>
            {prevPost ? (
              <Link
                href={articleHref(prevPost.slug)}
                className="hidden sm:block text-right group max-w-[240px]"
              >
                <p className="text-[15px] font-bold tracking-wide text-slate-400 mb-1">
                  上一篇
                </p>
                <p className="text-[15px] font-bold text-slate-700 line-clamp-2 group-hover:text-[#0A6CD0]">
                  {prevPost.title}
                </p>
              </Link>
            ) : null}
          </div>
          <div className={`${shellClass} pb-8`}>
            <MobileCardCarousel
              slideClassName="box-border shrink-0 flex-[0_0_78%] min-w-[78%] max-w-[78%] sm:flex-[0_0_48%] sm:min-w-[48%] sm:max-w-[48%] lg:flex-[0_0_calc((100%-32px)/3)] lg:min-w-[calc((100%-32px)/3)] lg:max-w-[calc((100%-32px)/3)]"
              gap={16}
              autoplay
              autoplayDelay={4500}
              loop={related.length > 2}
              showArrows={related.length > 1}
              arrowsOutside
              hideArrowsOnMobile
            >
              {related.map((r) => (
                <RelatedReadCard
                  key={r.slug}
                  post={r}
                  href={articleHref(r.slug)}
                />
              ))}
            </MobileCardCarousel>
          </div>
          <div className={`${shellClass} pb-10`}>
            <Link
              href={listHref}
              className="text-[15px] font-bold text-slate-800 border-b-2 border-slate-800 pb-1 hover:text-[#0A6CD0] hover:border-[#0A6CD0] transition-colors"
            >
              ← 返回文章列表
            </Link>
          </div>
        </section>
      ) : (
        <div className={`${shellClass} pb-10`}>
          <Link
            href={listHref}
            className="text-[15px] font-bold text-slate-800 border-b-2 border-slate-800 pb-1 hover:text-[#0A6CD0] hover:border-[#0A6CD0] transition-colors"
          >
            ← 返回文章列表
          </Link>
        </div>
      )}
    </div>
  );
}
