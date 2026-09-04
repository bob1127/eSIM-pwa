"use client";
import React from "react";

/**
 * 文章頁主視覺：左圖右標題（靜態，無視差）
 * 搭配 Layout flushTop：主圖貼螢幕頂，導覽列浮在上方，下方不留白邊
 */
const ParallaxImage = ({ src, alt, title, subtitle = "NEWS" }) => {
  return (
    <div className="relative w-full h-[min(100svh,920px)] min-h-[560px] md:min-h-[640px]">
      {/* 滿版底層：貼頂，無白邊 */}
      <div className="absolute inset-0 flex flex-col md:flex-row">
        <div className="relative w-full flex-1 md:h-full md:w-1/2 overflow-hidden bg-[#222]">
          <img
            src={src}
            alt={alt || title || ""}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-center block"
          />
        </div>
        <div className="w-full flex-1 md:h-full md:w-1/2 bg-[#BCCAD3]" />
      </div>

      {/* 內容層：避開固定 Navbar；左／上為圖區佔位 */}
      <div className="relative z-[1] flex h-full flex-col md:flex-row pt-[96px] lg:pt-[148px]">
        <div className="w-full flex-1 md:w-1/2" aria-hidden />
        <div className="relative w-full flex-1 md:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 py-8 text-[#111]">
          <div className="absolute top-3 left-6 md:top-6 md:left-10 text-[11px] font-bold tracking-widest uppercase">
            {subtitle}
          </div>
          <div className="absolute top-3 right-6 md:top-6 md:right-10 text-[11px] font-bold tracking-widest flex items-center gap-2 uppercase">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            ARTICLE
          </div>
          {title ? (
            <h1 className="text-xl md:text-3xl lg:text-[28px] font-bold leading-[1.6] tracking-wider text-center max-w-[80%] whitespace-pre-wrap mt-6">
              {title}
            </h1>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ParallaxImage;
