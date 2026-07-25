"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import KlookLocationMap from "@/components/KlookLocationMap";

const CAROUSEL_INTERVAL_MS = 4000;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=960&q=85";

const HOTEL_PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=960&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=960&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=960&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=960&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=960&q=80",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=960&q=80",
];

function uniqueImages(images, max = 2) {
  return [...new Set((images || []).filter(Boolean))].slice(0, max);
}

function getItemImages(item) {
  if (item?.images?.length) return uniqueImages(item.images);
  if (item?.imageUrl) return [item.imageUrl];
  if (item?.kind === "hotel" && item?.hotelId) {
    const idx = parseInt(item.hotelId, 10) % HOTEL_PLACEHOLDER_IMAGES.length;
    const next = (idx + 1) % HOTEL_PLACEHOLDER_IMAGES.length;
    return [HOTEL_PLACEHOLDER_IMAGES[idx], HOTEL_PLACEHOLDER_IMAGES[next]];
  }
  return [FALLBACK_IMAGE];
}

function brandOf(item) {
  if (item?.partner === "kkday") {
    return {
      key: "kkday",
      mark: "KK",
      markClass: "bg-[#FFD43A] text-slate-800",
      accent: "#0A6CD0",
      accentHover: "#095bb8",
      chipClass: "text-[#0A6CD0] bg-blue-50",
      badgeClass: "bg-[#0A6CD0] text-white",
      hoverBorder: "hover:border-[#0A6CD0]/25",
      detailClass: "text-[#0A6CD0]",
      ctaLabel: "立即購票",
      legal: "聯盟行銷連結 · 票價以 KKday 官網即時顯示為準",
      featureTitle: "票券特色",
    };
  }
  // klook ticket / hotel
  const isHotel = item?.kind === "hotel";
  return {
    key: "klook",
    mark: "KL",
    markClass: "bg-[#00B259] text-white",
    accent: "#00B259",
    accentHover: "#009f4f",
    chipClass: "text-[#00B259] bg-green-50",
    badgeClass: "bg-[#00B259] text-white",
    hoverBorder: "hover:border-[#00B259]/25",
    detailClass: "text-[#00B259]",
    ctaLabel: isHotel ? "立即預訂" : "立即購票",
    legal: isHotel
      ? "聯盟行銷連結 · 價格以 Klook 官網即時顯示為準"
      : "聯盟行銷連結 · 票價以 Klook 官網即時顯示為準",
    featureTitle: isHotel ? "住宿特色" : "票券特色",
  };
}

function DualImageCarousel({
  images,
  alt,
  aspectClass = "aspect-[4/3]",
  roundedClass = "",
  showArrows = false,
}) {
  const slides = uniqueImages(images?.length ? images : [FALLBACK_IMAGE]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, CAROUSEL_INTERVAL_MS);
  }, [slides.length]);

  useEffect(() => {
    setIdx(0);
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [slides, startTimer]);

  const go = (dir) => {
    setIdx((i) => (i + dir + slides.length) % slides.length);
    startTimer();
  };

  return (
    <div
      className={[
        "relative w-full bg-slate-100 overflow-hidden select-none",
        aspectClass,
        roundedClass,
      ].join(" ")}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={`${slides[idx]}-${idx}`}
          src={slides[idx]}
          alt={alt}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
      </AnimatePresence>

      {showArrows && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="上一張"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="下一張"
          >
            ›
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIdx(i);
                startTimer();
              }}
              className={[
                "h-1.5 rounded-full transition-all",
                i === idx ? "w-4 bg-white" : "w-1.5 bg-white/50",
              ].join(" ")}
              aria-label={`第 ${i + 1} 張`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AffiliateOfferModal({ item, onClose }) {
  const brand = brandOf(item);
  const images = getItemImages(item);

  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative w-full sm:max-w-lg h-[90dvh] max-h-[90dvh] sm:h-auto sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
        >
          <DualImageCarousel
            images={images}
            alt={item.title}
            aspectClass="aspect-[16/9] bg-slate-900 shrink-0"
            roundedClass="rounded-t-2xl"
            showArrows
          />

          <div className="overflow-y-auto flex-1 min-h-0 px-5 pt-4 pb-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {(item.category || item.subtitle) && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${brand.chipClass}`}
                >
                  {item.category || item.subtitle}
                </span>
              )}
              {item.regionLabel && (
                <span className="text-[11px] text-gray-400">
                  {item.regionLabel}
                </span>
              )}
              {item.badge && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${brand.badgeClass}`}
                >
                  {item.badge}
                </span>
              )}
            </div>

            <h2 className="text-lg font-black text-gray-900 leading-snug mb-1">
              {item.title}
            </h2>
            {item.kind === "hotel" && item.sellPriceLabel ? (
              <p className="text-sm text-gray-500 mb-3 line-through">
                原價 {item.sellPriceLabel}
              </p>
            ) : (
              item.subtitle && (
                <p className="text-sm text-gray-500 mb-3">{item.subtitle}</p>
              )
            )}

            {item.description && (
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                {item.description}
              </p>
            )}

            {item.features?.length > 0 && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {brand.featureTitle}
                </p>
                <ul className="space-y-1.5">
                  {item.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span
                        className="shrink-0 mt-0.5"
                        style={{ color: brand.accent }}
                      >
                        ·
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.location?.lat && (
              <KlookLocationMap location={item.location} className="mb-2" />
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${brand.markClass}`}
                >
                  {brand.mark}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">
                    {item.kind === "hotel" ? "優惠價格" : "最低價格"}
                  </p>
                  <p className="text-xl font-black text-gray-900 truncate">
                    {item.priceLabel}
                  </p>
                </div>
              </div>
              {(item.discountLabel || item.footer) && (
                <p
                  className={`text-[11px] text-right leading-snug max-w-[45%] ${
                    item.discountLabel ? "font-bold " + brand.detailClass : "text-gray-500"
                  }`}
                >
                  {item.discountLabel || item.footer}
                </p>
              )}
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block w-full text-center py-4 rounded-xl text-white text-base font-black shadow-lg transition-colors"
              style={{ backgroundColor: brand.accent }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = brand.accentHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = brand.accent;
              }}
            >
              {brand.ctaLabel}
            </a>
            <p className="mt-2 text-center text-[10px] text-gray-400">
              {brand.legal}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-lg leading-none transition"
            aria-label="關閉"
          >
            ×
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function AffiliateOfferCard({ item, onClick }) {
  const brand = brandOf(item);
  const images = getItemImages(item);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-md ${brand.hoverBorder} transition-all duration-200 overflow-hidden h-full text-left w-[210px] shrink-0 cursor-pointer`}
    >
      <div className="relative overflow-hidden">
        <DualImageCarousel
          images={images}
          alt={item.title}
          aspectClass="aspect-[4/3]"
        />
        {item.regionLabel && (
          <span className="absolute top-2.5 left-2.5 z-10 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white">
            {item.regionLabel}
          </span>
        )}
        {item.badge && (
          <span
            className={`absolute top-2.5 right-2.5 z-10 rounded-md px-2 py-0.5 text-[10px] font-bold ${brand.badgeClass}`}
          >
            {item.badge}
          </span>
        )}
        {(item.category || (item.kind === "hotel" && item.subtitle)) && (
          <span className="absolute bottom-2.5 left-2.5 z-10 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            {item.category || item.subtitle}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
        <p className="text-[11px] text-gray-400 line-clamp-1">
          {item.subtitle}
        </p>
        <h3 className="mt-1 text-[14px] font-black text-gray-900 leading-snug line-clamp-2 min-h-[2.4rem]">
          {item.title}
        </h3>

        <div className="mt-2.5 flex items-center gap-1.5 min-w-0">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${brand.markClass}`}
          >
            {brand.mark}
          </span>
          <div className="min-w-0">
            <span className="text-[15px] font-black text-gray-900">
              {item.priceLabel}
            </span>
            {item.sellPriceLabel && (
              <p className="text-[10px] text-gray-400 line-through">
                {item.sellPriceLabel}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2.5 border-t border-gray-100 pt-2 flex items-center justify-between gap-2">
          <p
            className={`text-[10px] line-clamp-1 flex-1 ${
              item.discountLabel
                ? `font-bold ${brand.detailClass}`
                : "text-gray-400"
            }`}
          >
            {item.discountLabel || item.footer || "Jeko 合作推薦"}
          </p>
          <span
            className={`shrink-0 text-[10px] font-bold group-hover:underline ${brand.detailClass}`}
          >
            查看詳情 →
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * J寶 聊天室用：首頁同款聯盟卡片 + popup
 */
export default function AffiliateChatOffers({ items = [] }) {
  const [selected, setSelected] = useState(null);
  const trackRef = useRef(null);
  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  if (!list.length) return null;

  const scroll = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-2 -mx-0.5"
    >
      <p className="text-[10px] text-slate-400 mb-1.5 font-medium">
        Jeko × Klook / KKday 推薦
      </p>
      <div className="relative">
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 border border-slate-200 rounded-full p-0.5 shadow-sm hover:bg-slate-50"
              aria-label="上一張"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 border border-slate-200 rounded-full p-0.5 shadow-sm hover:bg-slate-50"
              aria-label="下一張"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </>
        )}
        <div
          ref={trackRef}
          className="flex gap-2.5 overflow-x-auto scroll-smooth pb-1 px-0.5"
          style={{ scrollbarWidth: "none" }}
        >
          {list.map((item) => (
            <AffiliateOfferCard
              key={item.id || item.url}
              item={item}
              onClick={() => setSelected(item)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <AffiliateOfferModal
            item={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
