"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import MaterialIcon from "@/components/MaterialIcon";
import { buildPromoSlides } from "@/lib/promoBanners";

/**
 * 滿版輪播：中間完整、左右各露出約半張（共可視三張）
 * 高度依圖片自然比例，不裁切
 */
export default function PromoBannerCarousel({
  minSlides = 4,
  className = "",
}) {
  const slides = buildPromoSlides(minSlides);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "center",
      skipSnaps: false,
      containScroll: false,
      slidesToScroll: 1,
    },
    [
      Autoplay({
        delay: 4500,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return undefined;
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!slides.length) return null;

  return (
    <div className={`relative w-full ${className}`}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slides.map((slide, index) => {
            const active = index === selectedIndex;
            const inner = (
              <div
                className={`relative w-full overflow-hidden rounded-lg md:rounded-xl bg-stone-100 shadow-sm transition-[transform,opacity] duration-300 ${
                  active ? "scale-100 opacity-100" : "scale-[0.96] opacity-80"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="block w-full h-auto"
                  draggable={false}
                />
              </div>
            );

            return (
              <div
                key={slide.key}
                /* 每張約 50% 寬 → 中間完整 + 左右各半張 */
                className="min-w-0 shrink-0 grow-0 basis-[50%] px-1.5 sm:px-2"
              >
                {slide.href ? (
                  <a
                    href={slide.href}
                    target={
                      slide.href.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      slide.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="block"
                    aria-label={slide.alt}
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={scrollPrev}
        aria-label="上一張"
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 border border-stone-200 shadow flex items-center justify-center text-stone-700 hover:bg-white"
      >
        <MaterialIcon name="chevron_left" size={22} />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="下一張"
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 border border-stone-200 shadow flex items-center justify-center text-stone-700 hover:bg-white"
      >
        <MaterialIcon name="chevron_right" size={22} />
      </button>

      <div className="flex justify-center gap-2 mt-4">
        {slides.map((slide, index) => (
          <button
            key={`dot-${slide.key}`}
            type="button"
            aria-label={`切換到第 ${index + 1} 張`}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              index === selectedIndex
                ? "w-6 bg-[#3768C7]"
                : "w-2 bg-stone-300 hover:bg-stone-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
