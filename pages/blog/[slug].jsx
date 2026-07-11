import { useRouter } from "next/router";
import parse, { domToReact, attributesToProps } from "html-react-parser";
import Layout from "../Layout";
import { buildBlogPostSeo } from "../../lib/seo.config";
import Link from "next/link";
import ParallaxImage from "../../components/ParallaxImage/page";
import { ReactLenis } from "@studio-freight/react-lenis";
import { useRef, useState } from "react";
import {
  fetchRelatedWpPosts,
  fetchRelatedWpPostsForArticle,
  fetchWpPostBySlug,
  fetchWpPosts,
  fetchWpCategories,
  normalizeWpAssetUrl,
  buildBlogCategoryMaps,
  classifyBlogPost,
} from "../../lib/wordpress";
import { useUser } from "../../components/context/UserContext";
import {
  MAX_IMAGE_MB,
  MAX_IMAGES,
  MAX_VIDEO_MB,
  MAX_VIDEOS,
  useReviewUpload,
  useReviews,
} from "../../hooks/useReviews";
import MediaGalleryLightbox, {
  toGalleryMediaItems,
} from "../../components/MediaGalleryLightbox";
import ArticleBlogPostLayout from "../../components/Blog/ArticleBlogPostLayout";

/** WordPress 表格：補 class、避免 inline 隱藏 */
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
    })
    .replace(
      /<figure([^>]*class="[^"]*wp-block-table[^"]*")/gi,
      "<figure$1 wp-table-figure",
    );
}

// --- 🔧 工具函式：去除 HTML 標籤 (用於 SEO Description) ---
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>?/gm, "")
    .replace(/&#\d+;/gm, "")
    .trim();
}

// 格式化日期（Supabase ISO → YYYY.MM.DD）
function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// --- 左側：日本延伸文章分類資料 ---
const SIDEBAR_CATEGORIES = [
  {
    id: "airport",
    title: "機場與出入境",
    links: [
      "Visit Japan Web 最新填寫教學",
      "成田機場免稅店必買清單",
      "廉航航廈動線全攻略",
    ],
  },
  {
    id: "transport",
    title: "交通與車票",
    links: [
      "Suica 西瓜卡綁定 Apple Pay 教學",
      "JR Pass 全國版購買與劃位",
      "東京地鐵 24/48/72 小時券指南",
    ],
  },
  {
    id: "food",
    title: "美食地圖",
    links: [
      "福岡中洲屋台不踩雷推薦",
      "京都隱藏版 A5 和牛燒肉",
      "大阪道頓堀在地人必吃 Top 5",
    ],
  },
  {
    id: "network",
    title: "網路與通訊",
    links: [
      "日本 eSIM 流量一天要買多少？",
      "實體 SIM 卡與 eSIM 優缺點評比",
      "Softbank/Docomo 訊號實測",
    ],
  },
  {
    id: "rules",
    title: "法令與退稅",
    links: [
      "2026 日本免稅/退稅最新規定",
      "海關禁帶物品與藥妝限購清單",
      "自駕租車注意事項與保險",
    ],
  },
];

function ReviewMediaThumbnails({
  media,
  onItemClick,
  thumbClassName = "w-28 h-28",
  wrapperClassName = "",
}) {
  if (!media?.length) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${wrapperClassName}`}>
      {media.map((m, idx) => (
        <button
          key={m.id || `${m.public_url}-${idx}`}
          type="button"
          onClick={() => onItemClick(idx)}
          className={`relative group ${thumbClassName} border border-[#e5e5e5] overflow-hidden rounded-[4px] bg-[#f5f5f5] cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f57b8]`}
          aria-label={
            m.media_type === "video"
              ? `播放影片：${m.file_name || idx + 1}`
              : `檢視圖片：${m.file_name || idx + 1}`
          }
        >
          {m.media_type === "image" ? (
            <img
              src={m.public_url}
              alt={m.file_name || ""}
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                src={m.public_url}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="white"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                影片
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

export default function PostPage({
  post,
  relatedPosts = [],
  isArticle = false,
  articleCountry = null,
  articleSubCats = [],
  popularTags = [],
}) {
  const router = useRouter();
  const { user, session } = useUser();

  // --- 評論 hooks ---
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    submitReview,
    toggleLike,
  } = useReviews({ slug: post?.slug, session });
  const {
    pendingMedia,
    uploading,
    uploadError,
    inputRef: mediaInputRef,
    validateAndUpload,
    removeMedia,
    clearMedia,
  } = useReviewUpload({ session });

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [openCategory, setOpenCategory] = useState("airport");
  const [reviewMediaGallery, setReviewMediaGallery] = useState({
    isOpen: false,
    items: [],
    initialIndex: 0,
    title: "",
  });

  const openReviewMediaGallery = (mediaList, index, galleryTitle) => {
    const items = toGalleryMediaItems(mediaList);
    if (!items.length) return;
    setReviewMediaGallery({
      isOpen: true,
      items,
      initialIndex: index,
      title: galleryTitle,
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!newComment.trim()) {
      setSubmitError("請輸入評論內容");
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitReview({
        rating: newRating,
        content: newComment,
        mediaIds: pendingMedia.map((m) => m.id),
      });
      setNewComment("");
      setNewRating(5);
      clearMedia();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (reviewId, isLiked) => {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      await toggleLike(reviewId, isLiked);
    } catch {}
  };

  const toggleCategory = (id) => {
    setOpenCategory(openCategory === id ? null : id);
  };

  if (router.isFallback) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-xl text-gray-500 font-medium">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-xl text-gray-500 font-medium">找不到文章...</div>
        </div>
      </Layout>
    );
  }

  // 🌟 處理 SEO 資訊
  const yoast = post.yoast_head_json || {};
  // 🌟 處理首圖 Banner：優先抓取精選圖片 -> 備案抓內文第一張圖 -> 預設圖片
  let bannerImage = "/images/placeholder.jpg";
  if (post._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
    bannerImage = normalizeWpAssetUrl(
      post._embedded["wp:featuredmedia"][0].source_url,
    );
  } else {
    const firstImageMatch = post.content?.rendered?.match(
      /<img[^>]+src=["']([^"']+)["']/i,
    );
    if (firstImageMatch) bannerImage = normalizeWpAssetUrl(firstImageMatch[1]);
  }

  // 🌟 解析內文：圖片、表格（WordPress 區塊）
  const renderContent = (html) => {
    const prepared = prepareWpContentHtml(html);
    const parseOptions = {
      replace: (node) => {
        if (node.type !== "tag") return undefined;

        if (node.name === "img" && node.attribs?.src) {
          return (
            <div className="my-10 text-center">
              <img
                src={normalizeWpAssetUrl(node.attribs.src)}
                alt={node.attribs.alt || ""}
                className="max-w-[800px] h-auto mx-auto border border-[#eee]"
                loading="lazy"
              />
            </div>
          );
        }

        if (node.name === "table") {
          const tableProps = attributesToProps(node.attribs || {});
          const mergedClass = ["wp-blog-table", tableProps.className]
            .filter(Boolean)
            .join(" ");
          return (
            <div className="wp-table-wrap my-10 overflow-x-auto rounded-xl border border-[#e5e5e5] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
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

  // 日期格式化
  const postDate = new Date(post.date);
  const formattedDate = `${postDate.getFullYear()}年${String(postDate.getMonth() + 1)}月${String(postDate.getDate())}日 ${String(postDate.getHours()).padStart(2, "0")}時${String(postDate.getMinutes()).padStart(2, "0")}分`;

  const pageSeo = buildBlogPostSeo(post, bannerImage, yoast);

  // 父分類為「文章」→ TABIPPO 風格版型
  if (isArticle) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw";

    return (
      <ReactLenis
        root
        options={{ lerp: 0.1, duration: 1.2, smoothTouch: false }}
      >
        <Layout
          seo={{
            ...pageSeo,
            articlePublishedTime: post.date,
            articleModifiedTime: post.modified || post.date,
          }}
        >
          <ArticleBlogPostLayout
            post={post}
            relatedPosts={relatedPosts}
            popularTags={popularTags}
            articleCountry={articleCountry}
            articleSubCats={articleSubCats}
            bannerImage={bannerImage}
            shareUrl={`${siteUrl}/blog/${post.slug}`}
          />
          <MediaGalleryLightbox
            isOpen={reviewMediaGallery.isOpen}
            onClose={() =>
              setReviewMediaGallery((gallery) => ({
                ...gallery,
                isOpen: false,
              }))
            }
            images={reviewMediaGallery.items}
            title={reviewMediaGallery.title}
            initialIndex={reviewMediaGallery.initialIndex}
            ariaLabel="評論媒體檢視"
          />
        </Layout>
      </ReactLenis>
    );
  }

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothTouch: false }}>
      <Layout
        seo={{
          ...pageSeo,
          articlePublishedTime: post.date,
          articleModifiedTime: post.modified || post.date,
        }}
      >
        <div className="bg-white min-h-screen pb-24 font-sans text-[#333]">
          {/* =========================================
              滿版視差橫幅
          ========================================= */}
          <ParallaxImage
            src={bannerImage}
            title={stripHtml(post.title.rendered)}
            subtitle="JAPAN TRAVEL GUIDE"
          />

          {/* =========================================
              三欄式主體架構 (整體拉寬到 1600px)
          ========================================= */}
          <div className="max-w-[1800px] w-[95%] mx-auto mt-12 md:mt-20 flex flex-col xl:flex-row items-start gap-8 lg:gap-10">
            {/* -----------------------------------------
                [左側] 延伸文章分類導覽 (Sticky)
            ----------------------------------------- */}
            <aside className="w-full xl:w-[280px] shrink-0 xl:sticky xl:top-[120px] order-2 xl:order-1">
              <div className="bg-[#f9f9f9] border border-[#e5e5e5] rounded-[4px] overflow-hidden shadow-sm">
                <div className="bg-[#111] text-white py-3.5 px-5 font-bold text-[14px] tracking-widest text-center">
                  延伸閱讀：日本攻略
                </div>
                <div className="divide-y divide-[#e5e5e5]">
                  {SIDEBAR_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="w-full">
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-[#fafafa] transition-colors text-left"
                      >
                        <span className="text-[14px] font-bold text-[#333] tracking-wider flex items-center gap-2">
                          <span>{cat.icon}</span> {cat.title}
                        </span>
                        <span
                          className={`text-[12px] text-[#999] transition-transform duration-300 ${openCategory === cat.id ? "rotate-180" : ""}`}
                        >
                          ▼
                        </span>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out bg-[#fdfdfd] ${openCategory === cat.id ? "max-h-[300px] border-t border-[#f0f0f0]" : "max-h-0"}`}
                      >
                        <ul className="py-2 px-5">
                          {cat.links.map((link, idx) => (
                            <li key={idx} className="mb-2 last:mb-0">
                              <Link
                                href="#"
                                className="text-[13px] text-[#666] hover:text-[#0056b3] hover:underline tracking-wide leading-snug line-clamp-2 transition-colors"
                              >
                                • {link}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* -----------------------------------------
                [中間] 文章主體與 PR TIMES 區塊
            ----------------------------------------- */}
            <div className="w-full xl:flex-1 min-w-0 order-1 xl:order-2 xl:px-8">
              <main className="w-full max-w-[960px] mx-auto">
                <article>
                  {/* 標題與發布資訊 */}
                  <header className="mb-12">
                    <nav className="flex items-center gap-2 text-[12px] text-[#999] mb-6 tracking-widest uppercase font-medium">
                      <Link
                        href="/"
                        className="hover:text-[#111] transition-colors"
                      >
                        首頁
                      </Link>
                      <span className="text-[#ccc]">/</span>
                      <Link
                        href="/blog"
                        className="hover:text-[#111] transition-colors"
                      >
                        eSIM 專欄
                      </Link>
                      <span className="text-[#ccc]">/</span>
                      <span className="text-[#333] font-bold truncate max-w-[150px] md:max-w-none">
                        正在閱讀
                      </span>
                    </nav>
                    <h1
                      className="text-[24px] md:text-[28px] font-bold text-[#111] leading-[1.5] mb-6 tracking-tight"
                      dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                    />

                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e5e5e5] pb-4 gap-4">
                      <div className="flex items-center gap-4 text-[13px] text-[#666]">
                        <span className="font-medium text-[#333]">
                          WMESIM 編輯部
                        </span>
                        <span>{formattedDate}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[#666]">
                        <button className="hover:opacity-70 transition-opacity">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                          </svg>
                        </button>
                        <button className="hover:opacity-70 transition-opacity text-[#1877F2]">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                          </svg>
                        </button>
                        <button className="hover:opacity-70 transition-opacity">
                          <div className="w-[20px] h-[20px] bg-[#06C755] text-white rounded-[3px] flex items-center justify-center text-[12px] font-bold">
                            L
                          </div>
                        </button>
                      </div>
                    </div>
                  </header>

                  {/* 內文區塊 */}
                  <div className="entry-content max-w-none mb-24">
                    {renderContent(post.content.rendered)}
                  </div>
                </article>

                {/* PR TIMES 區塊：媒體/合作夥伴專區 */}
                <div className="bg-[#f9f9f9] border border-[#e5e5e5] py-16 px-6 text-center mb-16">
                  <p className="font-bold text-[15px] md:text-[16px] text-[#111] mb-8 tracking-wider">
                    本新聞稿包含提供給旅遊同業及媒體關係者的專屬資訊
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
                    <button className="bg-[#111] hover:bg-[#333] text-white px-8 py-3.5 text-[14px] font-bold sm:w-[240px] transition-colors tracking-widest shadow-sm">
                      合作夥伴登入
                    </button>
                    <button className="bg-[#0056b3] hover:bg-[#004494] text-white px-8 py-3.5 text-[14px] font-bold sm:w-[240px] transition-colors tracking-widest shadow-sm">
                      合作夥伴免費註冊
                    </button>
                  </div>
                  <p className="text-[13px] text-[#666] leading-[1.8] tracking-wider">
                    註冊成為合作夥伴後，可獲得企業專屬的高畫質 eSIM 產品圖片、
                    <br className="hidden sm:block" />
                    最新漫遊促銷資訊及專屬優惠碼等特權內容。
                  </p>
                </div>

                {/* 底部麵包屑 */}
                <div className="border-t border-[#e5e5e5] py-5 mb-16 text-[13px] text-[#666] flex flex-wrap items-center gap-3 tracking-wider">
                  <Link href="/" className="hover:underline">
                    首頁
                  </Link>
                  <span className="text-[#ccc]">&gt;</span>
                  <Link href="/blog" className="hover:underline">
                    eSIM 專欄
                  </Link>
                  <span className="text-[#ccc]">&gt;</span>
                  <span
                    className="text-[#333] truncate max-w-[300px]"
                    dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                  />
                </div>

                {/* =========================================
                    讀者評論與推薦 (Supabase 真實資料)
                ========================================= */}
                <section className="mb-10">
                  <div className="flex items-center justify-between mb-8 border-b border-[#111] pb-3">
                    <h3 className="text-[18px] font-bold tracking-widest">
                      讀者評論與推薦
                    </h3>
                    <span className="text-[13px] text-[#666] tracking-widest">
                      {reviewsLoading ? "載入中…" : `${reviews.length} 則留言`}
                    </span>
                  </div>

                  {/* ── 留言表單 ── */}
                  {user ? (
                    <form
                      onSubmit={handleSubmitReview}
                      className="bg-[#f9f9f9] p-8 mb-12 border border-[#e5e5e5]"
                    >
                      <h4 className="text-[14px] font-bold mb-6 tracking-widest">
                        撰寫您的體驗
                      </h4>

                      {/* 星評 */}
                      <div className="flex items-center gap-2 mb-6">
                        <span className="text-[13px] text-[#666] tracking-wider mr-2">
                          推薦指數
                        </span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setNewRating(star)}
                            className={`text-xl transition-colors ${star <= newRating ? "text-yellow-400" : "text-[#ddd]"}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      {/* 文字 */}
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="分享您的想法"
                        className="w-full p-4 border border-[#e5e5e5] bg-white min-h-[120px] focus:outline-none focus:border-[#111] text-[14px] leading-relaxed resize-y mb-4 transition-colors"
                      />

                      {/* 媒體上傳區 */}
                      <div className="mb-6">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <label className="cursor-pointer inline-flex items-center gap-2 border border-[#ccc] px-4 py-2 text-[13px] text-[#555] hover:border-[#111] hover:text-[#111] transition-colors">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            上傳圖片 / 影片
                            <input
                              ref={mediaInputRef}
                              type="file"
                              multiple
                              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                              className="hidden"
                              disabled={uploading}
                              onChange={(e) =>
                                validateAndUpload(e.target.files)
                              }
                            />
                          </label>
                          <span className="text-[12px] text-[#999]">
                            圖片最多 {MAX_IMAGES} 張（≤{MAX_IMAGE_MB}
                            MB），影片最多 {MAX_VIDEOS} 個（≤{MAX_VIDEO_MB}MB）
                          </span>
                          {uploading && (
                            <span className="text-[12px] text-[#1f57b8] animate-pulse">
                              上傳中…
                            </span>
                          )}
                        </div>

                        {uploadError && (
                          <p className="text-[12px] text-red-500 mb-2">
                            {uploadError}
                          </p>
                        )}

                        {/* 預覽已上傳媒體 */}
                        {pendingMedia.length > 0 && (
                          <div className="flex flex-wrap gap-3 mt-2">
                            {pendingMedia.map((m, idx) => (
                              <div
                                key={m.id}
                                className="relative group w-24 h-24 border border-[#e5e5e5] overflow-hidden rounded-[4px] bg-[#f5f5f5]"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    openReviewMediaGallery(
                                      pendingMedia,
                                      idx,
                                      "上傳預覽",
                                    )
                                  }
                                  className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                                  aria-label={
                                    m.media_type === "video"
                                      ? `播放影片：${m.file_name}`
                                      : `檢視圖片：${m.file_name}`
                                  }
                                >
                                  {m.media_type === "image" ? (
                                    <img
                                      src={m.public_url}
                                      alt={m.file_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <>
                                      <video
                                        src={m.public_url}
                                        className="w-full h-full object-cover"
                                        muted
                                        playsInline
                                        preload="metadata"
                                      />
                                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <svg
                                          width="22"
                                          height="22"
                                          viewBox="0 0 24 24"
                                          fill="white"
                                          aria-hidden="true"
                                        >
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                      </span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeMedia(m.id)}
                                  className="absolute top-1 right-1 z-10 w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ✕
                                </button>
                                {m.media_type === "video" && (
                                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded pointer-events-none">
                                    影片
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {submitError && (
                        <p className="text-[12px] text-red-500 mb-4">
                          {submitError}
                        </p>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmitting || uploading}
                          className="bg-[#111] text-white px-10 py-3 text-[13px] font-bold tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50"
                        >
                          {isSubmitting ? "傳送中…" : "送出評論"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* 未登入提示 */
                    <div className="bg-[#f9f9f9] border border-[#e5e5e5] p-8 mb-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-[14px] text-[#555] tracking-wide">
                        登入後即可留下您的旅遊心得與評分
                      </p>
                      <Link
                        href={`/login?redirect=/blog/${post?.slug}`}
                        className="inline-flex items-center gap-2 bg-[#1f57b8] text-white px-6 py-2.5 text-[13px] font-bold tracking-widest hover:bg-[#174da3] transition-colors"
                      >
                        立即登入 →
                      </Link>
                    </div>
                  )}

                  {/* ── 評論列表 ── */}
                  {reviewsLoading ? (
                    <div className="flex items-center gap-3 py-10 text-[#999] text-[14px]">
                      <div className="w-5 h-5 border-2 border-[#ccc] border-t-[#1f57b8] rounded-full animate-spin" />
                      載入評論中…
                    </div>
                  ) : reviewsError ? (
                    <p className="text-[13px] text-red-400 py-6">
                      {reviewsError}
                    </p>
                  ) : reviews.length === 0 ? (
                    <p className="text-[14px] text-[#999] py-10 text-center tracking-wider">
                      還沒有評論，成為第一個留言的旅人吧！
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="border-b border-[#e5e5e5] pb-6 last:border-0"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-start gap-3">
                              {/* 頭像 */}
                              {review.user_avatar ? (
                                <img
                                  src={review.user_avatar}
                                  alt={review.user_name}
                                  className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#1f57b8] text-white text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                  {review.user_name?.[0]?.toUpperCase() || "U"}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-bold text-[14px] tracking-wide">
                                    {review.user_name}
                                  </span>
                                  <span className="text-[#999] text-[12px] tracking-widest">
                                    {formatDate(review.created_at)}
                                  </span>
                                </div>
                                <div className="flex text-yellow-400 text-[13px]">
                                  {"★".repeat(review.rating)}
                                  {"☆".repeat(5 - review.rating)}
                                </div>
                              </div>
                            </div>

                            {/* 按讚 */}
                            <button
                              onClick={() =>
                                handleToggleLike(
                                  review.id,
                                  review.is_liked_by_me,
                                )
                              }
                              className="flex items-center gap-2 text-[12px] group"
                              title={
                                user
                                  ? review.is_liked_by_me
                                    ? "退讚"
                                    : "按讚"
                                  : "登入後才能按讚"
                              }
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill={
                                  review.is_liked_by_me ? "#ef4444" : "none"
                                }
                                stroke={
                                  review.is_liked_by_me ? "#ef4444" : "#999"
                                }
                                strokeWidth="2"
                                className="group-hover:scale-110 transition-transform"
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                              <span
                                className={
                                  review.is_liked_by_me
                                    ? "text-[#ef4444] font-bold"
                                    : "text-[#999]"
                                }
                              >
                                {review.likes}
                              </span>
                            </button>
                          </div>

                          {/* 評論內文 */}
                          <p className="text-[14px] text-[#333] leading-[1.8] tracking-wide ml-11">
                            {review.content}
                          </p>

                          {/* 附件媒體 */}
                          {review.blog_review_media?.length > 0 && (
                            <ReviewMediaThumbnails
                              media={review.blog_review_media}
                              wrapperClassName="mt-4 ml-11"
                              onItemClick={(idx) =>
                                openReviewMediaGallery(
                                  review.blog_review_media,
                                  idx,
                                  `${review.user_name} 的評論`,
                                )
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </main>
            </div>

            {/* -----------------------------------------
                [右側] 變現廣告區塊 (Sticky)
            ----------------------------------------- */}
            <aside className="w-full xl:w-[320px] shrink-0 xl:sticky xl:top-[120px] order-3 flex flex-col gap-6">
              {/* Ad 1: eSIM 折扣碼 */}
              <div className="bg-gradient-to-br from-[#111] to-[#333] text-white rounded-[8px] p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                <span className="bg-[#ff4757] text-white text-[11px] font-bold px-3 py-1 rounded-sm tracking-wider uppercase mb-3 inline-block">
                  獨家優惠
                </span>
                <h4 className="text-[18px] font-bold mb-2 tracking-wide">
                  日本 eSIM 吃到飽方案
                </h4>
                <p className="text-[13px] text-white/80 mb-5 leading-relaxed">
                  輸入折扣碼即享 9 折優惠，免換卡掃碼即用，打卡找路不斷線！
                </p>
                <div className="bg-black/50 border border-white/20 rounded-[4px] p-3 text-center mb-4 flex items-center justify-between">
                  <span className="text-[14px] font-mono font-bold tracking-widest">
                    WMESIM2026
                  </span>
                  <button className="text-[12px] text-[#ff4757] font-bold hover:text-white transition-colors">
                    複製
                  </button>
                </div>
                <Link
                  href="#"
                  className="block w-full bg-white text-[#111] text-center py-3 text-[14px] font-bold rounded-[4px] hover:bg-[#f0f0f0] transition-colors"
                >
                  立即前往購買
                </Link>
              </div>
            </aside>
          </div>

          {/* =========================================
              底部相關文章 (PR TIMES 滿版風格)
          ========================================= */}
          <section className="mb-0 pt-16 mt-16 border-t border-[#e5e5e5]">
            <div className="max-w-[1200px] w-[92%] mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[20px] font-bold text-[#111] tracking-widest">
                  相關文章
                </h2>
                <Link
                  href="/blog"
                  className="text-[13px] text-[#666] hover:underline tracking-wider"
                >
                  查看全部文章
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {relatedPosts.length > 0 ? (
                  relatedPosts.slice(0, 4).map((item) => {
                    let previewImg = "/default-esim.jpg";
                    if (item._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
                      previewImg = normalizeWpAssetUrl(
                        item._embedded["wp:featuredmedia"][0].source_url,
                      );
                    }

                    return (
                      <Link
                        href={`/blog/${item.slug}`}
                        key={item.id}
                        className="group block"
                      >
                        <div className="w-full aspect-[4/3] bg-[#f5f5f5] overflow-hidden mb-4 border border-[#eee]">
                          <img
                            src={previewImg}
                            alt={stripHtml(item.title.rendered)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div>
                          <h4
                            className="text-[14px] font-bold text-[#111] leading-[1.6] mb-2 line-clamp-3 tracking-wide group-hover:text-[#0056b3] transition-colors"
                            dangerouslySetInnerHTML={{
                              __html: item.title.rendered,
                            }}
                          />
                          <span className="text-[12px] text-[#999] tracking-widest">
                            {new Date(item.date).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-[13px] text-[#999] col-span-4 tracking-widest">
                    目前尚無相關文章
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Global Style */}
        <style jsx global>{`
          .entry-content {
            color: #333;
            font-family:
              "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN",
              "Hiragino Sans", Meiryo, sans-serif;
            line-height: 2;
            font-size: 15px;
            letter-spacing: 0.04em;
          }
          .entry-content h2 {
            font-size: 22px;
            font-weight: 700;
            color: #111;
            margin-top: 64px;
            margin-bottom: 24px;
            line-height: 1.5;
            letter-spacing: 0.05em;
          }
          .entry-content h3 {
            font-size: 18px;
            font-weight: 700;
            color: #111;
            margin-top: 40px;
            margin-bottom: 20px;
            letter-spacing: 0.05em;
          }
          .entry-content p {
            margin-bottom: 32px;
          }
          .entry-content img {
            margin: 40px 0;
            width: 100%;
            background: #f9f9f9;
          }
          .entry-content a {
            color: #0056b3;
            text-decoration: underline;
            text-underline-offset: 4px;
          }
          .entry-content a:hover {
            opacity: 0.7;
          }
          .entry-content ul {
            list-style-type: none;
            padding-left: 0;
            margin-bottom: 32px;
          }
          .entry-content li {
            position: relative;
            padding-left: 1.2em;
            margin-bottom: 12px;
          }
          .entry-content li::before {
            content: "・";
            position: absolute;
            left: 0;
            color: #111;
          }

          /* WordPress 表格 */
          .entry-content .wp-table-wrap,
          .entry-content figure.wp-block-table,
          .entry-content .wp-table-figure {
            margin: 40px 0;
            max-width: 100%;
          }
          .entry-content figure.wp-block-table {
            overflow-x: visible;
          }
          .entry-content figure.wp-block-table .wp-table-wrap {
            margin: 0;
          }
          .entry-content table,
          .entry-content .wp-blog-table {
            display: table !important;
            width: 100% !important;
            min-width: 480px;
            border-collapse: collapse !important;
            border-spacing: 0;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            background: #fff;
          }
          .entry-content table thead {
            display: table-header-group;
          }
          .entry-content table tbody {
            display: table-row-group;
          }
          .entry-content table tr {
            display: table-row;
          }
          .entry-content table th,
          .entry-content table td {
            display: table-cell !important;
            border: 1px solid #e5e7eb;
            padding: 12px 16px;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
          }
          .entry-content table th {
            background: #f3f4f6;
            font-weight: 700;
            color: #111;
            font-size: 13px;
            letter-spacing: 0.02em;
          }
          .entry-content table thead th {
            background: #e8eef5;
          }
          .entry-content table tbody tr:nth-child(even) td {
            background: #fafafa;
          }
          .entry-content table tbody tr:hover td {
            background: #f0f7ff;
          }
          .entry-content table caption {
            caption-side: bottom;
            padding: 10px 4px 0;
            font-size: 12px;
            color: #666;
            text-align: left;
          }
          .entry-content .wp-block-table figcaption {
            margin-top: 10px;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          @media (max-width: 640px) {
            .entry-content table,
            .entry-content .wp-blog-table {
              min-width: 560px;
              font-size: 13px;
            }
            .entry-content table th,
            .entry-content table td {
              padding: 10px 12px;
            }
          }
        `}</style>

        <MediaGalleryLightbox
          isOpen={reviewMediaGallery.isOpen}
          onClose={() =>
            setReviewMediaGallery((gallery) => ({ ...gallery, isOpen: false }))
          }
          images={reviewMediaGallery.items}
          title={reviewMediaGallery.title}
          initialIndex={reviewMediaGallery.initialIndex}
          ariaLabel="評論媒體檢視"
        />
      </Layout>
    </ReactLenis>
  );
}

export async function getStaticPaths() {
  try {
    const posts = await fetchWpPosts({ per_page: 100 });
    return {
      paths: posts.map((post) => ({ params: { slug: post.slug } })),
      fallback: "blocking",
    };
  } catch (error) {
    console.error("getStaticPaths (blog):", error);
    return { paths: [], fallback: "blocking" };
  }
}

export async function getStaticProps({ params }) {
  const slug = params?.slug;
  if (!slug) {
    return { notFound: true };
  }

  try {
    const post = await fetchWpPostBySlug(slug);
    if (!post) {
      return { notFound: true };
    }

    const categories = await fetchWpCategories();
    const maps = buildBlogCategoryMaps(categories);
    const classified = classifyBlogPost(post, maps);

    const relatedPosts = classified.isArticle
      ? await fetchRelatedWpPostsForArticle(post, maps, 24)
      : await fetchRelatedWpPosts(post, 4);

    const popularTags = [
      ...(maps.articleTabs || []),
      ...Object.values(maps.articleSubTabsByParent || {}).flat(),
    ]
      .filter(Boolean)
      .slice(0, 12)
      .map((name) => `#${name}`);

    return {
      props: {
        post,
        relatedPosts,
        isArticle: !!classified.isArticle,
        articleCountry: classified.articleCountry || null,
        articleSubCats: classified.articleSubCats || [],
        popularTags,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error("getStaticProps (blog):", error);
    return { notFound: true };
  }
}
