import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import SafeImage from "./SafeImage";
import { Swiper, SwiperSlide } from "swiper/react";
import { motion, AnimatePresence } from "framer-motion";
import MaterialIcon from "./MaterialIcon";
import { shouldBypassImageOptimization } from "../lib/resolveMedusaImageUrl";
import "swiper/css";

const GALLERY_LB_STYLE = `
  .product-gallery-lb.swiper {
    width: 100%;
    height: 100%;
  }
  .product-gallery-lb .swiper-slide {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

function MediaSlide({ item, fill = false, className = "", priority = false }) {
  if (item.type === "video") {
    return (
      <video
        src={item.src}
        controls
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }

  if (fill) {
    return (
      <SafeImage
        src={item.src}
        alt={item.alt || "media"}
        fill
        sizes="(max-width: 1024px) 100vw, 55vw"
        className={className}
        priority={priority}
        unoptimized={shouldBypassImageOptimization(item.src)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.src}
      alt={item.alt || "media"}
      className={className}
      draggable={false}
    />
  );
}

export function toGalleryMediaItems(mediaList = []) {
  return mediaList.map((m) => ({
    type: m.media_type === "video" || m.type === "video" ? "video" : "image",
    src: m.public_url || m.src,
    alt: m.file_name || m.alt || "",
  }));
}

export default function MediaGalleryLightbox({
  isOpen,
  onClose,
  images = [],
  title = "",
  productName,
  initialIndex = 0,
  ariaLabel = "媒體檢視",
}) {
  const displayTitle = title || productName || "";
  const [lbIndex, setLbIndex] = useState(initialIndex);
  const [lbSwiper, setLbSwiper] = useState(null);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [showThumbGrid, setShowThumbGrid] = useState(false);
  const [portalRoot, setPortalRoot] = useState(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setLbIndex(initialIndex);
    setIsAutoplay(false);
    setShowThumbGrid(false);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialIndex]);

  const handleClose = useCallback(() => {
    onClose(lbIndex);
  }, [onClose, lbIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
      if (!isOpen || images.length <= 1) return;
      if (e.key === "ArrowLeft") lbSwiper?.slidePrev();
      if (e.key === "ArrowRight") lbSwiper?.slideNext();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose, lbSwiper, images.length]);

  useEffect(() => {
    if (!isOpen || !isAutoplay || images.length <= 1) return;
    const id = setInterval(() => lbSwiper?.slideNext(), 3500);
    return () => clearInterval(id);
  }, [isOpen, isAutoplay, lbSwiper, images.length]);

  const goTo = useCallback(
    (idx) => {
      if (!lbSwiper) return;
      if (images.length > 1) {
        lbSwiper.slideToLoop?.(idx) ?? lbSwiper.slideTo(idx);
      } else {
        lbSwiper.slideTo(0);
      }
      setLbIndex(idx);
      setShowThumbGrid(false);
    },
    [lbSwiper, images.length],
  );

  if (!portalRoot || images.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[10050] flex flex-col backdrop-blur-[3px]"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.88)" }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
        >
          <header className="relative z-30 flex items-center gap-4 px-4 sm:px-8 lg:px-10 h-14 sm:h-16 shrink-0 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <span className="text-white text-sm font-normal tabular-nums shrink-0">
                {lbIndex + 1} / {images.length}
              </span>
              {displayTitle ? (
                <span className="text-white/90 text-sm font-normal truncate hidden sm:block">
                  {displayTitle}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 text-white/70">
              <button
                type="button"
                className="hidden sm:flex p-2.5 hover:text-white transition-colors"
                aria-label="搜尋"
                onClick={() => {}}
              >
                <MaterialIcon name="search" size={20} />
              </button>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsAutoplay((v) => !v)}
                  className="p-2.5 hover:text-white transition-colors"
                  aria-label={isAutoplay ? "暫停輪播" : "自動輪播"}
                >
                  {isAutoplay ? (
                    <MaterialIcon name="pause" size={20} />
                  ) : (
                    <MaterialIcon name="play_arrow" size={20} />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowThumbGrid((v) => !v)}
                className="hidden sm:flex p-2.5 hover:text-white transition-colors"
                aria-label="縮圖網格"
              >
                <MaterialIcon name="grid_view" size={20} />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 sm:p-2.5 ml-1 sm:ml-2 text-white hover:text-white/90 transition-colors"
                aria-label="關閉"
              >
                <MaterialIcon name="close" size={26} />
              </button>
            </div>
          </header>

          <div className="relative flex-1 flex items-center justify-center min-h-0 z-10">
            {images.length > 1 && !showThumbGrid && (
              <>
                <button
                  type="button"
                  onClick={() => lbSwiper?.slidePrev()}
                  className="absolute left-2 sm:left-6 lg:left-10 top-1/2 -translate-y-1/2 z-20 p-2 text-white/50 hover:text-white transition-colors"
                  aria-label="上一張"
                >
                  <MaterialIcon
                    name="chevron_left"
                    className="w-10 h-10 sm:w-14 sm:h-14 text-[40px] sm:text-[56px]"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => lbSwiper?.slideNext()}
                  className="absolute right-2 sm:right-6 lg:right-10 top-1/2 -translate-y-1/2 z-20 p-2 text-white/50 hover:text-white transition-colors"
                  aria-label="下一張"
                >
                  <MaterialIcon
                    name="chevron_right"
                    className="w-10 h-10 sm:w-14 sm:h-14 text-[40px] sm:text-[56px]"
                  />
                </button>
              </>
            )}

            {showThumbGrid ? (
              <div className="w-full max-w-5xl px-6 py-8 overflow-y-auto max-h-full">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => goTo(idx)}
                      className={`relative aspect-[3/4] overflow-hidden border-2 transition-all ${
                        lbIndex === idx
                          ? "border-[#00befa]"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      {item.type === "video" ? (
                        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                          <MaterialIcon
                            name="play_circle"
                            size={36}
                            className="text-white"
                          />
                        </div>
                      ) : (
                        <MediaSlide
                          item={item}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Swiper
                onSwiper={(swiper) => {
                  setLbSwiper(swiper);
                  setLbIndex(initialIndex);
                  if (images.length > 1) {
                    swiper.slideToLoop?.(initialIndex, 0) ??
                      swiper.slideTo(initialIndex, 0);
                  }
                }}
                initialSlide={initialIndex}
                loop={images.length > 1}
                slidesPerView={1}
                spaceBetween={0}
                onSlideChange={(s) => setLbIndex(s.realIndex)}
                className="w-full h-full max-w-[min(96vw,1200px)] product-gallery-lb px-14 sm:px-20 lg:px-28"
              >
                {images.map((item, idx) => (
                  <SwiperSlide key={idx}>
                    {item.type === "video" ? (
                      <div className="flex items-center justify-center w-full h-full">
                        <MediaSlide
                          item={item}
                          className="max-h-[calc(100vh-220px)] max-w-full w-auto mx-auto object-contain bg-black"
                        />
                      </div>
                    ) : (
                      <MediaSlide
                        item={item}
                        className="max-h-[calc(100vh-220px)] max-w-full w-auto mx-auto object-contain select-none"
                      />
                    )}
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>

          {!showThumbGrid && images.length > 1 && (
            <div className="relative z-30 shrink-0 pb-8 sm:pb-10 pt-2">
              <div className="flex justify-center items-center gap-2 sm:gap-2.5 px-4 overflow-x-auto max-w-[100vw]">
                {images.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goTo(idx)}
                    className={`relative shrink-0 w-[60px] aspect-[3/4] sm:w-[72px] overflow-hidden transition-all duration-200 ${
                      lbIndex === idx
                        ? "border-2 border-[#00befa] opacity-100 shadow-[0_0_0_1px_rgba(0,190,250,0.4)]"
                        : "border-2 border-transparent opacity-45 hover:opacity-75"
                    }`}
                    aria-label={`第 ${idx + 1} 個媒體`}
                    aria-current={lbIndex === idx ? "true" : undefined}
                  >
                    {item.type === "video" ? (
                      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                        <MaterialIcon
                          name="play_circle"
                          size={22}
                          className="text-white"
                        />
                      </div>
                    ) : (
                      <MediaSlide
                        item={item}
                        className="w-full h-full object-cover bg-black/20"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <style dangerouslySetInnerHTML={{ __html: GALLERY_LB_STYLE }} />
        </motion.div>
      )}
    </AnimatePresence>,
    portalRoot,
  );
}
