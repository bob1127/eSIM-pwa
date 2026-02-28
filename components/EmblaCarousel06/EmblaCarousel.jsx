"use client";

import React, { useEffect, useRef, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { gsap } from "gsap";

// ---------------------------------------------------------
// 內建的箭頭按鈕組件 (解決破圖問題)
// ---------------------------------------------------------
const ArrowButton = ({ onClick, disabled, direction }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white transition-all
      hover:bg-black hover:border-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
      ${direction === "prev" ? "mr-2" : "ml-2"}
    `}
    type="button"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-4 h-4"
    >
      {direction === "prev" ? (
        <path d="M15 18l-6-6 6-6" /> // 左箭頭
      ) : (
        <path d="M9 6l6 6-6 6" /> // 右箭頭
      )}
    </svg>
  </button>
);

const DotButton = ({ selected, onClick }) => (
  <button
    className={`
      w-2.5 h-2.5 mx-1 rounded-full transition-all duration-300
      ${selected ? "bg-black w-6" : "bg-gray-300 hover:bg-gray-400"}
    `}
    type="button"
    onClick={onClick}
  />
);

// ---------------------------------------------------------
// 主輪播組件
// ---------------------------------------------------------
const EmblaCarousel = (props) => {
  const { slides, options } = props;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    ...options,
    align: "start", // 確保從左邊開始對齊
    containScroll: "trimSnaps",
  });

  const dragIndicatorRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState([]);
  const [prevBtnDisabled, setPrevBtnDisabled] = React.useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = React.useState(true);

  // 更新按鈕與點點狀態
  const onSelect = useCallback((api) => {
    setSelectedIndex(api.selectedScrollSnap());
    setPrevBtnDisabled(!api.canScrollPrev());
    setNextBtnDisabled(!api.canScrollNext());
  }, []);

  const onInit = useCallback(
    (api) => {
      setScrollSnaps(api.scrollSnapList());
      onSelect(api); // 初始狀態
      api.on("reInit", onSelect);
      api.on("select", onSelect);
    },
    [onSelect]
  );

  useEffect(() => {
    if (!emblaApi) return;
    onInit(emblaApi);
  }, [emblaApi, onInit]);

  // 按鈕點擊事件
  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi]
  );
  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi]
  );
  const scrollTo = useCallback(
    (index) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  // 滑鼠拖曳提示 (僅電腦版)
  const handleMouseEnter = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches
    ) {
      gsap.to(dragIndicatorRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
      });
      document.body.style.cursor = "grab";
    }
  };

  const handleMouseLeave = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches
    ) {
      gsap.to(dragIndicatorRef.current, {
        opacity: 0,
        scale: 0.5,
        duration: 0.5,
      });
      document.body.style.cursor = "default";
    }
  };

  return (
    <div
      className="w-full py-8 mx-auto relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 視窗區域 */}
      <div className="overflow-hidden w-full" ref={emblaRef}>
        <div className="flex touch-pan-y touch-pinch-zoom h-auto md:h-[550px]">
          {slides.map((slide, index) => (
            <div
              key={index}
              // ✅ 這裡修復了關鍵樣式：
              // flex-none: 防止縮小
              // w-[85%]: 手機版寬度固定 85%
              // md:w-[25%]: 電腦版寬度固定 25%
              // pl-4: 左側間距
              className="flex-none w-[85%] md:w-[25%] pl-4 min-w-0"
            >
              <div
                className="
                  relative flex flex-col items-center justify-start
                  bg-white h-full transition-all duration-300 overflow-hidden
                  
                  /* 手機版樣式 */
                    border border-gray-100 shadow-sm
                  
                  /* 電腦版樣式 */
                    border border-gray-100 md:py-8
                  md:[box-shadow:inset_0_0_0_0.2rem_var(--detail-medium-contrast)]
                "
              >
                <a
                  href="/"
                  className="w-full h-full flex flex-col text-decoration-none text-black"
                >
                  {/* 內容區域 */}
                  <div className="flex flex-col h-full w-full">
                    {/* 圖片區塊 */}
                    <div className="w-full px-0 md:px-6 pt-0 md:pt-0">
                      {/* 手機版 16:9 / 電腦版 保持原樣 */}
                      <div className="aspect-[10/9] md:aspect-[8/10] w-full overflow-hidden relative">
                        <img
                          src={slide.image || "/images/placeholder.jpg"} // 預設圖片防止破圖
                          alt={`Slide ${index + 1}`}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    </div>

                    {/* 文字區塊 */}
                    <div className="flex flex-col items-center justify-center p-4 md:p-5 flex-grow text-center">
                      <b className="text-lg md:text-xl mb-2 line-clamp-1">
                        {slide.title || "標題"}
                      </b>
                      <p className="text-sm text-gray-500 md:text-black line-clamp-2 md:line-clamp-none">
                        {slide.description ||
                          "這裡是一段簡短的描述文字，用於說明此卡片的內容。"}
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 控制列 (手機版置中，電腦版左下) */}
      <div
        className="
          mt-6 w-[90%] mx-auto flex flex-col-reverse items-center gap-4
          md:absolute md:bottom-0 md:left-6 md:mt-7 md:w-auto md:flex-row  md:gap-3   md:z-10
        "
      >
        {/* 按鈕組 */}
        <div className="flex justify-center md:justify-start">
          <ArrowButton
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            direction="prev"
          />
          <ArrowButton
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            direction="next"
          />
        </div>

        {/* 點點組 */}
        <div className="flex justify-center items-center py-2 md:py-0 md:px-4">
          {scrollSnaps.map((_, index) => (
            <DotButton
              key={index}
              selected={index === selectedIndex}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>
      </div>

      {/* 拖曳提示 (僅電腦版顯示) */}
      <div
        ref={dragIndicatorRef}
        className="fixed top-0 left-0 pointer-events-none opacity-0 scale-50 z-50 bg-black text-white px-4 py-2 rounded-full hidden md:block"
      >
        Drag
      </div>
    </div>
  );
};

export default EmblaCarousel;
