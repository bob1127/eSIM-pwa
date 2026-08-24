"use client";

import { useCallback, useEffect, useState, Children, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

/**
 * 手機版橫向輪播：自動播放 + 無限循環
 * md 以上由父層自行顯示 grid
 */
export default function MobileCardCarousel({
  children,
  slideClassName = "box-border shrink-0 flex-[0_0_76%] min-w-[76%] max-w-[76%]",
  gap = 6,
  slidesToScroll = 1,
  showArrows = true,
  showDots = true,
  autoplay = true,
  autoplayDelay = 4000,
  loop = true,
  align = "center",
  className = "",
  label = "卡片輪播",
  arrowsOutside = false,
  /** 手機版預設隱藏左右箭頭（可滑動／點點切換） */
  hideArrowsOnMobile = true,
}) {
  const slides = Children.toArray(children);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const enableAutoplay = autoplay && !reduceMotion;

  const autoplayPlugin = useRef(
    Autoplay({
      delay: autoplayDelay,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  );

  const plugins = enableAutoplay ? [autoplayPlugin.current] : [];

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop,
      align,
      containScroll: loop ? false : "trimSnaps",
      dragFree: false,
      slidesToScroll,
    },
    plugins,
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  const scrollPrev = useCallback(() => {
    autoplayPlugin.current?.reset?.();
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    autoplayPlugin.current?.reset?.();
    emblaApi?.scrollNext();
  }, [emblaApi]);

  if (slides.length === 0) return null;

  const dotCount = scrollSnaps.length > 0 ? scrollSnaps.length : slides.length;
  const activeDot =
    dotCount > 0 ? ((selectedIndex % dotCount) + dotCount) % dotCount : 0;
  const useCompactPager = dotCount > 7;
  const thumbPct = Math.max(18, 100 / dotCount);
  const thumbLeft =
    ((activeDot / Math.max(dotCount - 1, 1)) * (100 - thumbPct));

  const jumpFromBar = (event) => {
    if (!emblaApi || dotCount < 2) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const index = Math.round(ratio * (dotCount - 1));
    scrollTo(index);
  };

  const arrowBaseClass =
    "absolute top-1/2 z-10 -translate-y-1/2 items-center justify-center h-9 w-9 rounded-full bg-white shadow-md border border-gray-100 text-stone-900 active:scale-95 transition-transform";
  const arrowVisibilityClass = hideArrowsOnMobile ? "hidden md:flex" : "flex";
  const arrowLeftClass = arrowsOutside
    ? "left-0 md:-left-5"
    : "left-[8%]";
  const arrowRightClass = arrowsOutside
    ? "right-0 md:-right-5"
    : "right-[8%]";

  return (
    <div
      className={className}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className={`relative ${arrowsOutside ? "md:px-8" : ""}`}>
        {showArrows && slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="上一張"
              className={`${arrowBaseClass} ${arrowVisibilityClass} ${arrowLeftClass}`}
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="下一張"
              className={`${arrowBaseClass} ${arrowVisibilityClass} ${arrowRightClass}`}
            >
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}

        <div className="overflow-hidden" ref={emblaRef}>
          <div
            className="flex touch-pan-y"
            style={{ marginLeft: -gap / 2, marginRight: -gap / 2 }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                className={slideClassName}
                style={{ paddingLeft: gap / 2, paddingRight: gap / 2 }}
              >
                <div className="h-full w-full min-w-0">{slide}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDots && dotCount > 1 && !useCompactPager && (
        <div className="mt-4 flex justify-center gap-1.5">
          {Array.from({ length: dotCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`第 ${index + 1} 張`}
              aria-current={index === activeDot ? "true" : undefined}
              onClick={() => scrollTo(index)}
              className={[
                "h-1.5 rounded-full transition-all duration-200",
                index === activeDot ? "w-5 bg-[#0A6CD0]" : "w-1.5 bg-gray-300",
              ].join(" ")}
            />
          ))}
        </div>
      )}

      {showDots && useCompactPager && (
        <div className="mt-3 flex items-center justify-center gap-3 px-8">
          <button
            type="button"
            aria-label={`第 ${activeDot + 1} / ${dotCount} 張`}
            onClick={jumpFromBar}
            className="relative h-1 w-[132px] rounded-full bg-gray-200"
          >
            <span
              className="absolute top-0 h-1 rounded-full bg-[#0A6CD0] transition-all duration-200"
              style={{ width: `${thumbPct}%`, left: `${thumbLeft}%` }}
            />
          </button>
          <span className="text-[11px] tabular-nums font-medium text-gray-600" aria-live="polite">
            {activeDot + 1} / {dotCount}
          </span>
        </div>
      )}
    </div>
  );
}
