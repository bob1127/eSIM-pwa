"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

const DEFAULT_CAROUSEL_IMAGES = [
  "/images/index-001.png",
  "/images/865dc2a1-b546-47fe-823f-37bf4f201d43.png",
  "/images/index-05.png",
  "/images/index-003.png",
  "/images/index-004.png",
];

export default function SilkyCarousel({
  images = DEFAULT_CAROUSEL_IMAGES,
  autoplayInterval = 5000,
}) {
  const carouselImages = images.length > 0 ? images : DEFAULT_CAROUSEL_IMAGES;
  const baseLength = carouselImages.length;
  // 複製 3 份陣列以達成無縫循環
  const extendedImages = [
    ...carouselImages,
    ...carouselImages,
    ...carouselImages,
  ];

  // 初始停在中間那一組
  const [currentIndex, setCurrentIndex] = useState(baseLength);

  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const timerRef = useRef(null);
  const isAnimating = useRef(false);
  const isInitialRender = useRef(true);

  const nextSlide = () => {
    if (isAnimating.current) return;
    setCurrentIndex((prev) => prev + 1);
    resetTimer();
  };

  const prevSlide = () => {
    if (isAnimating.current) return;
    setCurrentIndex((prev) => prev - 1);
    resetTimer();
  };

  const goToSlide = (index) => {
    if (isAnimating.current) return;
    const currentGroupStart =
      Math.floor(currentIndex / baseLength) * baseLength;
    const targetIndex = currentGroupStart + index;
    setCurrentIndex(targetIndex);
    resetTimer();
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(nextSlide, autoplayInterval);
  };

  useEffect(() => {
    timerRef.current = setInterval(nextSlide, autoplayInterval);
    return () => clearInterval(timerRef.current);
  }, [autoplayInterval]);

  // GSAP 絕對置中與絲滑切換邏輯
  useEffect(() => {
    if (
      !trackRef.current ||
      !slideRefs.current[currentIndex] ||
      !containerRef.current
    )
      return;

    isAnimating.current = true;

    const containerWidth = containerRef.current.offsetWidth;
    const slide = slideRefs.current[currentIndex];
    const slideWidth = slide.offsetWidth;
    const slideOffset = slide.offsetLeft;

    // 核心置中公式
    const targetX = containerWidth / 2 - slideWidth / 2 - slideOffset;

    const duration = isInitialRender.current ? 0 : 1.2;
    isInitialRender.current = false;

    gsap.to(trackRef.current, {
      x: targetX,
      duration: duration,
      ease: "expo.inOut",
      overwrite: "auto",
      onComplete: () => {
        isAnimating.current = false;

        // 無縫循環 (Silent Snap)
        if (currentIndex >= baseLength * 2) {
          const resetIndex = currentIndex - baseLength;
          const resetSlide = slideRefs.current[resetIndex];
          const resetX =
            containerWidth / 2 -
            resetSlide.offsetWidth / 2 -
            resetSlide.offsetLeft;
          gsap.set(trackRef.current, { x: resetX });
          setCurrentIndex(resetIndex);
        } else if (currentIndex < baseLength) {
          const resetIndex = currentIndex + baseLength;
          const resetSlide = slideRefs.current[resetIndex];
          const resetX =
            containerWidth / 2 -
            resetSlide.offsetWidth / 2 -
            resetSlide.offsetLeft;
          gsap.set(trackRef.current, { x: resetX });
          setCurrentIndex(resetIndex);
        }
      },
    });
  }, [currentIndex, baseLength]);

  // 手機端滑動 (Swipe)
  let touchStartX = 0;
  const handleTouchStart = (e) => (touchStartX = e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX - touchEndX;
    if (swipeDistance > 50) nextSlide();
    if (swipeDistance < -50) prevSlide();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-transparent py-6 lg:py-10"
    >
      <div
        className="w-full cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          // 🌟 核心修改 1：縮小圖片之間的間距 (從 gap-8 改為 gap-3 md:gap-4)
          className="flex w-max gap-4 md:gap-0 items-center  "
        >
          {extendedImages.map((src, index) => {
            const isFocus = currentIndex === index;

            return (
              <div
                key={index}
                ref={(el) => (slideRefs.current[index] = el)}
                // 🌟 核心修改 2：把圖片寬度拉到極大 (電腦版佔畫面 72%)
                className="w-[88vw] md:w-[80vw] lg:w-[42vw] mt-4 shrink-0"
              >
                <div
                  onClick={() => {
                    if (!isFocus && !isAnimating.current) {
                      setCurrentIndex(index);
                      resetTimer();
                    }
                  }}
                  // 🌟 外框圓角與陰影 (跟隨你截圖的日系美學)
                  className={`relative w-full aspect-[4/3] md:aspect-[16/11]     transition-opacity duration-700 ease-in-out ${
                    isFocus
                      ? "opacity-100 cursor-default"
                      : "opacity-40 hover:opacity-100 cursor-pointer"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`banner-${index}`}
                    fill
                    className="object-cover"
                    priority={index >= baseLength && index < baseLength * 2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 下方進度指示條 (Dots) */}
      <div className="mt-8 flex justify-center gap-3 relative z-10">
        {carouselImages.map((_, index) => {
          const activeDotIndex = currentIndex % baseLength;
          return (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`切換到第 ${index + 1} 張投影片`}
              className={`h-1.5 rounded-full transition-all duration-700 ease-in-out ${
                activeDotIndex === index
                  ? "w-10 bg-[#00befa]"
                  : "w-3 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
