"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { normalizeWpAssetUrl } from "@/lib/wordpress";

/** Jetpack / WP「投影片」區塊 */
export function isWpSlideshowNode(node) {
  if (!node || node.type !== "tag") return false;
  const cls = String(node.attribs?.class || "");
  if (
    /wp-block-jetpack-slideshow|jetpack-slideshow|wp-block-slideshow/.test(cls)
  ) {
    return true;
  }
  // 部分主題／外掛輸出：有 data-effect + slideshow/swiper class
  if (
    (node.attribs?.["data-effect"] || node.attribs?.["data-autoplay"] != null) &&
    /slideshow|swiper-container/.test(cls)
  ) {
    return true;
  }
  return false;
}

export function isImgInsideWpSlideshow(node) {
  let p = node?.parent;
  while (p) {
    if (isWpSlideshowNode(p)) return true;
    p = p.parent;
  }
  return false;
}

function collectSlides(node, out = []) {
  if (!node) return out;
  if (node.name === "img" && node.attribs?.src) {
    let caption = "";
    // figcaption 常在同層 figure 內
    let p = node.parent;
    while (p && p.name !== "figure" && p.name !== "li") p = p.parent;
    if (p?.children) {
      const cap = p.children.find(
        (c) => c.name === "figcaption" || c.name === "span",
      );
      if (cap?.children) {
        caption = cap.children
          .map((c) => (c.type === "text" ? c.data : ""))
          .join("")
          .trim();
      }
    }
    out.push({
      src: node.attribs.src,
      alt: node.attribs.alt || caption || "",
      caption,
    });
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((c) => collectSlides(c, out));
  }
  return out;
}

export function collectSlidesFromNode(node) {
  return collectSlides(node);
}

function readAutoplay(node) {
  const v = node?.attribs?.["data-autoplay"];
  return v === "true" || v === "1";
}

/**
 * WordPress 投影片 → 前台可操作輪播（左右箭頭 + 圓點）
 * 點主圖可開文章級幻燈片（整篇文章圖片）。
 */
export default function WpSlideshow({
  images = [],
  autoplay = false,
  lightboxStartIndex = 0,
  onOpenLightbox,
}) {
  const slides = (images || []).filter((i) => i?.src);
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (dir) => {
      if (!slides.length) return;
      setIndex((i) => (i + dir + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (!autoplay || slides.length < 2) return undefined;
    const t = setInterval(() => go(1), 4000);
    return () => clearInterval(t);
  }, [autoplay, go, slides.length]);

  if (!slides.length) return null;

  const current = slides[index];
  const src = normalizeWpAssetUrl(current.src);
  const canOpenLightbox = typeof onOpenLightbox === "function";

  return (
    <div className="wp-slideshow my-8 md:my-10 relative w-full select-none text-left">
      <div className="relative w-full overflow-hidden bg-[#111] flex items-center justify-center min-h-[220px] md:min-h-[320px]">
        {canOpenLightbox ? (
          <button
            type="button"
            className="relative z-0 w-full h-full flex items-center justify-center p-0 border-0 bg-transparent cursor-zoom-in"
            onClick={() => onOpenLightbox(lightboxStartIndex + index)}
            aria-label={`查看圖片 ${lightboxStartIndex + index + 1}`}
          >
            <img
              key={src}
              src={src}
              alt={current.alt || ""}
              className="relative z-0 w-full h-auto max-h-[70vh] object-contain pointer-events-none"
              loading="lazy"
            />
          </button>
        ) : (
          <img
            key={src}
            src={src}
            alt={current.alt || ""}
            className="relative z-0 w-full h-auto max-h-[70vh] object-contain"
            loading="lazy"
          />
        )}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="上一張"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/60"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="下一張"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/60"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`第 ${i + 1} 張`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={`w-2 h-2 rounded-full transition-opacity ${
                    i === index ? "bg-white opacity-100" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {current.caption ? (
        <p className="mt-2 text-left text-[13px] text-[#666]">
          {current.caption}
        </p>
      ) : null}
    </div>
  );
}

export { readAutoplay };
