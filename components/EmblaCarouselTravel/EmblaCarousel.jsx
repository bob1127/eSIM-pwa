import React, { useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { fetchWpPosts } from "../../lib/wordpress";
import Link from "next/link";
import { gsap } from "gsap";
import {
  NextButton,
  PrevButton,
  usePrevNextButtons,
} from "./EmblaCarouselArrowButtons";
import { DotButton, useDotButton } from "./EmblaCarosuelDotButton";

// 🔧 工具：擷取文章內第一張圖片 URL
function extractFirstImageFromContent(content) {
  if (!content) return null;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// 🔧 工具：移除 HTML 標籤
function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "");
}
const ArrowIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    className="transition-transform group-hover:translate-x-[2px]"
  >
    <path
      d="M8 5l8 7-8 7"
      stroke="#fff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const EmblaCarousel = ({ options = { dragFree: true, loop: true } }) => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. 抓取資料
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        // 替換成你的 API URL
        const posts = await fetchWpPosts({ per_page: 10 });

        const formattedSlides = posts.map((post) => {
          const contentImage = extractFirstImageFromContent(
            post.content.rendered,
          );
          const featureImage =
            post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
          const finalImage =
            contentImage ||
            featureImage ||
            "https://via.placeholder.com/800x600?text=No+Image";

          let categoryName = "Travel";
          if (post._embedded && post._embedded["wp:term"]) {
            const categories = post._embedded["wp:term"][0];
            if (categories && categories.length > 0) {
              categoryName = categories[0].name;
            }
          }

          return {
            id: post.id,
            title: post.title.rendered,
            description:
              stripHtml(post.excerpt.rendered).substring(0, 80) + "...",
            image: finalImage,
            category: categoryName,
            date: new Date(post.date).toLocaleDateString(),
            link: `/blog/${post.slug}`,
          };
        });

        setSlides(formattedSlides);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 2. Embla 設定
  const [emblaRef, emblaApi] = useEmblaCarousel(options, [
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);

  const cursorRef = useRef(null);
  const xTo = useRef(null);
  const yTo = useRef(null);

  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);
  const {
    prevBtnDisabled,
    nextBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick,
  } = usePrevNextButtons(emblaApi);

  // ==========================================
  // 3. 游標跟隨邏輯 (修正位置問題的核心)
  // ==========================================
  useEffect(() => {
    // 初始化 GSAP quickTo
    // xPercent: -50, yPercent: -50 是為了讓圓圈的中心點對準滑鼠，而不是左上角
    xTo.current = gsap.quickTo(cursorRef.current, "x", {
      duration: 0.15,
      ease: "power3",
    });
    yTo.current = gsap.quickTo(cursorRef.current, "y", {
      duration: 0.15,
      ease: "power3",
    });

    const moveCursor = (e) => {
      // 讓隱藏的圓圈始終跟隨滑鼠移動
      xTo.current(e.clientX);
      yTo.current(e.clientY);
    };

    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, []);

  // 4. 卡片互動：移入放大
  const handleCardMouseEnter = () => {
    gsap.to(cursorRef.current, {
      scale: 1,
      opacity: 1,
      duration: 0.4,
      ease: "power3.out",
      overwrite: "auto",
    });
  };

  // 5. 卡片互動：移出縮小
  const handleCardMouseLeave = () => {
    gsap.to(cursorRef.current, {
      scale: 0,
      opacity: 0,
      duration: 0.3,
      ease: "power3.in",
      overwrite: "auto",
    });
  };

  if (loading) return <div className="text-center py-20">載入中...</div>;
  if (error)
    return (
      <div className="text-center py-20 text-red-500">載入失敗: {error}</div>
    );
  if (slides.length === 0) return null;

  return (
    <div
      className="w-full py-8 max-w-[1400px] mx-auto relative"
      style={{
        "--slide-height": "3rem",
        "--slide-spacing": "1rem",
        "--slide-size": "31%",
      }}
    >
      <style>
        {`
        .superellipse-card {
            position: relative;
            background-color: #f8fafc;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
            overflow: hidden;
            transition: transform .4s ease, box-shadow .4s ease;
             clip-path: polygon(
                100% 50%, 99.97% 77.98%, 99.86% 83.23%, 99.69% 86.7%, 99.44% 89.33%, 99.11% 91.43%, 98.7% 93.17%, 98.19% 94.62%, 97.58% 95.85%, 96.85% 96.88%, 95.97% 97.75%, 94.91% 98.45%, 93.59% 99.02%, 91.9% 99.45%, 89.59% 99.76%, 85.88% 99.94%, 50.24% 100%, 14.12% 99.94%, 10.41% 99.76%, 8.1% 99.45%, 6.41% 99.02%, 5.09% 98.45%, 4.03% 97.75%, 3.15% 96.88%, 2.42% 95.85%, 1.81% 94.62%, 1.3% 93.17%, 0.89% 91.43%, 0.56% 89.33%, 0.31% 86.7%, 0.14% 83.23%, 0.03% 77.98%, 0% 50.01%, 0.03% 22.02%, 0.14% 16.77%, 0.31% 13.3%, 0.56% 10.67%, 0.89% 8.57%, 1.3% 6.83%, 1.81% 5.38%, 2.42% 4.15%, 3.15% 3.12%, 4.03% 2.25%, 5.09% 1.55%, 6.41% 0.98%, 8.1% 0.55%, 10.41% 0.24%, 14.12% 0.06%, 49.72% 0%, 85.88% 0.06%, 89.59% 0.24%, 91.9% 0.55%, 93.59% 0.98%, 94.91% 1.55%, 95.97% 2.25%, 96.85% 3.12%, 97.58% 4.15%, 98.19% 5.38%, 98.7% 6.83%, 99.11% 8.57%, 99.44% 10.67%, 99.69% 13.3%, 99.86% 16.77%, 99.97% 22.02%
            );
        }
        .superellipse-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }
        @media (max-width: 1700px) { .embla__viewport { --slide-size: 32%; } }
        @media (max-width: 1000px) { .embla__viewport { --slide-size: 45%; } }
        @media (max-width: 550px) { .embla__viewport { --slide-size: 85%; } }
        `}
      </style>

      <div className="main-title relative flex flex-col w-full max-w-[100vw] pl-3 overflow-hidden">
        <div className="big-txt absolute z-10 left-0 bottom-[-20%] md:bottom-[-55%] pointer-events-none">
          <p className="font-extrabold text-[64px] sm:text-[120px] md:text-[220px] text-white/10 tracking-normal whitespace-nowrap">
            JEKO NOTE
          </p>
        </div>
        <div className="static z-50">
          <h2 className="text-3xl lg:text-5xl font-bold text-white">NEWS</h2>
          <p className="text-white text-lg mt-2">相關文章</p>

          <span className="tracking-widest  text-[14px] mt-3 leading-relaxed text-stone-100 font-normal  px-4 lg:px-0">
            精選全球熱門旅遊目的地攻略，從上網設定到必去景點，<br></br>
            為您的旅程提供最實用的資訊與建議，讓自由行變得更簡單。
          </span>
        </div>
        <div className="mt-8 flex  ">
          {/* 外層容器：設定 group 以便控制內部所有動畫 */}
          <a
            href="/category/all-product/"
            className="group relative inline-flex items-center justify-center"
          >
            {/* 動畫效果 3 (背景影子層) */}
            <div className="absolute inset-0 h-full w-full rounded-full bg-[#0891b2] opacity-0 transition-all duration-300 group-hover:translate-x-1.5 group-hover:translate-y-1.5 group-hover:opacity-100" />

            {/* 主按鈕層 */}
            <div className="relative z-10 inline-flex items-center justify-center overflow-hidden rounded-full bg-[#30AE99] px-8 py-3.5 font-bold text-white shadow-lg shadow-[#384a72] first-letter:transition-all duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[#0960c3]">
              {/* 動畫效果 2 (文字傾斜滑動) */}
              <span className="relative inline-flex overflow-hidden">
                {/* 第一組內容：原本顯示的。Hover 時向右滑出並傾斜 */}
                <div className="flex items-center gap-3 transition-transform duration-500 group-hover:translate-x-[150%] group-hover:skew-x-12">
                  More
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                    <ArrowIcon />
                  </span>
                </div>

                {/* 第二組內容：原本隱藏在左側。Hover 時歸位並取消傾斜 */}
                <div className="absolute inset-0 flex items-center gap-3 transition-transform duration-500 -translate-x-[150%] skew-x-12 group-hover:translate-x-0 group-hover:skew-x-0">
                  Read
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                    <ArrowIcon />
                  </span>
                </div>
              </span>
            </div>
          </a>
        </div>
      </div>
      <div
        ref={cursorRef}
        className="fixed botom-0 left-1/2 -translate-x-1/2  pointer-events-none z-[9999] flex flex-col items-center justify-center bg-blue-600 text-white rounded-full shadow-lg backdrop-blur-sm bg-opacity-90"
        style={{
          width: "90px",
          height: "90px",
          opacity: 0, // 重要：初始隱藏
          transform: "translate(-50%, -50%) scale(0)", // 重要：初始置中並縮小
        }}
      >
        <span className="text-xs font-bold tracking-widest">READ</span>
      </div>

      <div className="embla__viewport overflow-hidden py-5 px-2" ref={emblaRef}>
        <div
          className="embla__container flex touch-pan-y touch-pinch-zoom h-auto"
          style={{ marginLeft: "calc(var(--slide-spacing) * -1)" }}
        >
          {slides.map((slide) => (
            <div
              className="embla__slide transform flex-none h-full min-w-0"
              key={slide.id}
              style={{
                flex: "0 0 var(--slide-size)",
                paddingLeft: "var(--slide-spacing)",
              }}
            >
              <div
                className="embla__slide__inner h-full select-none py-4"
                onMouseEnter={handleCardMouseEnter}
                onMouseLeave={handleCardMouseLeave}
              >
                <Link
                  href={slide.link}
                  className="block  bg-[#f3f3f2] rounded-[30px] px-5 py-10 h-full group"
                >
                  <div
                    className="superellipse-card w-full bg-white"
                    style={{ aspectRatio: "16 / 10" }}
                  >
                    <img
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt={slide.title}
                      src={slide.image}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>

                  <div className="flex flex-col items-start mt-4 px-2">
                    <div className="flex justify-between w-full items-center mb-1">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-1 rounded-full">
                        {slide.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {slide.date}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {slide.title}
                    </h3>
                    <div
                      className="text-sm font-normal text-slate-500 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: slide.description }}
                    />
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="embla__controls mt-8 px-4 flex items-center justify-between max-w-[var(--slide-size)] mx-auto md:mx-0 md:pl-4">
        <div className="flex gap-1.5">
          {scrollSnaps.map((_, index) => (
            <DotButton
              key={index}
              onClick={() => onDotButtonClick(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex ? "bg-stone-100 w-6" : "bg-slate-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmblaCarousel;
