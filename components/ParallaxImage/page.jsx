"use client";
import React, { useRef, useEffect, useState } from "react";

const lerp = (start, end, factor) => start + (end - start) * factor;

const ParallaxImage = ({ src, alt, title, subtitle = "NEWS" }) => {
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  const currentY = useRef(0);
  const targetY = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth <= 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    let boundsTop = 0;
    if (containerRef.current) {
      boundsTop =
        containerRef.current.getBoundingClientRect().top + window.scrollY;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const relativeScroll = -scrollY - boundsTop;

      // 位移幅度 (越小越輕微)
      targetY.current = relativeScroll * 0.05;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    const animate = () => {
      if (imageRef.current && !isMobile) {
        currentY.current = lerp(currentY.current, targetY.current, 0.1);

        if (Math.abs(currentY.current - targetY.current) > 0.01) {
          // 僅輕微視差位移，不再 scale 放大（避免精選圖變糊）
          imageRef.current.style.transform = `translateY(${currentY.current}px)`;
        }
      } else if (imageRef.current && isMobile) {
        imageRef.current.style.transform = "translateY(0)";
      }
      rafId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", checkIfMobile);
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isMobile]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[70vh] md:h-[100vh] flex flex-col md:flex-row"
    >
      {/* =========================================
          左側：視差圖片區塊（原圖、不壓縮放大）
      ========================================= */}
      <div className="relative w-full h-1/2 md:h-full md:w-1/2 overflow-hidden bg-[#222]">
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          decoding="async"
          className="absolute top-0 left-0 w-full h-full object-cover object-center block"
          style={{
            willChange: "transform",
            transform: "translateY(0)",
          }}
        />
      </div>

      {/* =========================================
          右側：Transit 風格文字區塊
      ========================================= */}
      {/* 加上 pt-20 是為了避免文字太靠上，跟透明導覽列重疊 */}
      <div className="relative w-full h-1/2 md:h-full md:w-1/2 flex flex-col justify-center items-center bg-[#BCCAD3] p-8 md:p-16 pt-20 text-[#111]">
        {/* 左上角小標籤 */}
        <div className="absolute top-24 left-6 md:top-24 md:left-10 text-[11px] font-bold tracking-widest uppercase">
          {subtitle}
        </div>

        {/* 右上角裝飾 */}
        <div className="absolute top-24 right-6 md:top-24 md:right-10 text-[11px] font-bold tracking-widest flex items-center gap-2 uppercase">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
          ARTICLE
        </div>

        {/* 置中標題 (支援換行顯示) */}
        {title && (
          <h1 className="text-xl md:text-3xl lg:text-[28px] font-bold leading-[1.6] tracking-wider text-center max-w-[80%] whitespace-pre-wrap mt-8">
            {title}
          </h1>
        )}
      </div>
    </div>
  );
};

export default ParallaxImage;
