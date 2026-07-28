"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { gsap } from "gsap";
import Link from "next/link";

// ---------------------------------------------------------
// 內建的箭頭按鈕組件
// ---------------------------------------------------------
const ArrowButton = ({ onClick, disabled, direction }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white transition-all
      hover:bg-[#1f57b8] hover:border-[#1f57b8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-sm
      ${direction === "prev" ? "mr-2" : "ml-2"}
    `}
    type="button"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="w-4 h-4"
    >
      {direction === "prev" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 18l-6-6 6-6"
        /> // 左箭頭
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /> // 右箭頭
      )}
    </svg>
  </button>
);

const DotButton = ({ selected, onClick }) => (
  <button
    className={`
      w-2.5 h-2.5 mx-1 rounded-full transition-all duration-300 shrink-0
      ${selected ? "bg-[#1f57b8] w-6" : "bg-gray-300 hover:bg-gray-400"}
    `}
    type="button"
    onClick={onClick}
  />
);

// ---------------------------------------------------------
// 主輪播組件 (純展示版：已經移除內建 fetch，完全接收 InfoPage 傳來的資料)
// ---------------------------------------------------------
const EmblaCarousel = ({ slides = [], options }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    ...options,
    align: "start",
    containScroll: "trimSnaps",
  });

  const dragIndicatorRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const onSelect = useCallback((api) => {
    setSelectedIndex(api.selectedScrollSnap());
    setPrevBtnDisabled(!api.canScrollPrev());
    setNextBtnDisabled(!api.canScrollNext());
  }, []);

  const onInit = useCallback(
    (api) => {
      setScrollSnaps(api.scrollSnapList());
      onSelect(api);
      api.on("reInit", onSelect);
      api.on("select", onSelect);
    },
    [onSelect],
  );

  useEffect(() => {
    if (!emblaApi) return;
    onInit(emblaApi);
    // 當 InfoPage 切換 Tab 導致 slides 變更時，強制重算寬度
    emblaApi.reInit();
  }, [emblaApi, onInit, slides]);

  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi],
  );
  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi],
  );
  const scrollTo = useCallback(
    (index) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi],
  );

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

  if (!slides || slides.length === 0) return null;

  return (
    <div
      className="w-full py-6 md:py-8 mx-auto relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="overflow-hidden w-full pb-16 md:pb-0" ref={emblaRef}>
        <div className="flex touch-pan-y touch-pinch-zoom items-stretch">
          {slides.map((slide, index) => (
            <div
              key={slide.id || index}
              className="flex-none w-[85%] sm:w-[45%] lg:w-[33.33%] xl:w-[25%] pl-4 md:pl-5 min-w-0"
            >
              <div className="relative flex flex-col items-center justify-start bg-white h-full transition-all duration-300 overflow-hidden border border-gray-100 shadow-sm rounded-2xl md:rounded-xl hover:shadow-md hover:border-gray-200">
                <Link
                  href={slide.link || "#"}
                  className="w-full h-full flex flex-col text-decoration-none text-black group/card"
                >
                  <div className="flex flex-col h-full w-full">
                    <div className="w-full p-2 md:p-4 pb-0">
                      <div className="aspect-[4/3] w-full overflow-hidden relative rounded-xl">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-start justify-start p-5 md:p-6 flex-grow text-left">
                      {slide.badge ? (
                        <span className="mb-2 inline-flex items-center rounded-md bg-[#1E4AD1]/10 px-2.5 py-1 text-[11px] font-semibold text-[#1E4AD1]">
                          {slide.badge}
                        </span>
                      ) : null}
                      <h3
                        className="text-[17px] md:text-lg font-bold mb-3 line-clamp-2 text-slate-800 group-hover/card:text-[#1f57b8] transition-colors leading-snug"
                        dangerouslySetInnerHTML={{ __html: slide.title }}
                      />
                      <p
                        className="text-[13px] md:text-sm text-slate-500 leading-relaxed line-clamp-3 w-full"
                        dangerouslySetInnerHTML={{ __html: slide.description }}
                      />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 w-[90%] mx-auto flex flex-col-reverse items-center gap-4 md:absolute md:bottom-0 md:left-6 md:mt-7 md:w-auto md:flex-row md:gap-3 md:z-10">
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
        <div className="flex justify-center items-center py-2 md:py-0 md:px-4 flex-wrap gap-y-2">
          {scrollSnaps.map((_, index) => (
            <DotButton
              key={index}
              selected={index === selectedIndex}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmblaCarousel;
