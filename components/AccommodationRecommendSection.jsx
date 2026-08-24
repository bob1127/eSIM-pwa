"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MobileCardCarousel from "./MobileCardCarousel";
import KlookLocationMap from "./KlookLocationMap";
import HomeSectionHeader from "./HomeSectionHeader";
import { KLOOK_HOTELS, klookHotelAff } from "../data/klook/hotels";

const COUNTRY_TABS = [
  { id: "japan", label: "日本 🇯🇵" },
  { id: "korea", label: "韓國 🇰🇷" },
  { id: "thailand", label: "泰國 🇹🇭" },
  { id: "china", label: "中國 🇨🇳" },
  { id: "hongkong", label: "港澳 🇭🇰" },
  { id: "vietnam", label: "越南 🇻🇳" },
];

const PREVIEW_COUNT = 4;
const CAROUSEL_INTERVAL_MS = 4000;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=960&q=80";

const HOTEL_PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=960&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=960&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=960&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=960&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=960&q=80",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=960&q=80",
];

function getHotelImages(item) {
  const fromCatalog = Array.isArray(item?.images)
    ? item.images.filter(Boolean)
    : [];
  if (fromCatalog.length) return fromCatalog;
  const idx = parseInt(item.hotelId, 10) % HOTEL_PLACEHOLDER_IMAGES.length;
  const next = (idx + 1) % HOTEL_PLACEHOLDER_IMAGES.length;
  return [HOTEL_PLACEHOLDER_IMAGES[idx], HOTEL_PLACEHOLDER_IMAGES[next]];
}

function getHotelCategory(item) {
  if (item.category) return item.category;
  if (item.starRating) return `${item.starRating} 星飯店`;
  return "精選飯店";
}

function getHotelPriceLabel(item) {
  return item.priceLabel || "TWD 入住報價 起";
}

function getHotelFooter(item) {
  return item.footer || "立即確認 · 免費取消視方案 · 價格依日期而異";
}

function HotelImageCarousel({
  item,
  aspectClass = "aspect-[4/3]",
  showArrows = false,
}) {
  const slides = useMemo(() => getHotelImages(item), [item]);
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
      ].join(" ")}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={`${slides[idx]}-${idx}`}
          src={slides[idx]}
          alt={item.title}
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
            className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
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
            className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
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

function HotelModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative w-full sm:max-w-xl h-[90dvh] max-h-[90dvh] sm:h-auto sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
        >
          <HotelImageCarousel
            item={item}
            aspectClass="aspect-[16/9] bg-slate-900 shrink-0"
            showArrows
          />

          <div className="overflow-y-auto flex-1 min-h-0 px-5 pt-4 pb-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[11px] font-bold text-[#00B259] bg-green-50 px-2 py-0.5 rounded-full">
                {getHotelCategory(item)}
              </span>
              <span className="text-[11px] text-gray-600">
                {item.regionLabel}
              </span>
              {item.badge && (
                <span className="text-[11px] font-bold text-white bg-[#00B259] px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>

            <h2 className="text-lg font-black text-gray-900 leading-snug mb-1">
              {item.title}
            </h2>
            <p className="text-sm text-gray-500 mb-3">{item.subtitle}</p>

            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00B259] text-[10px] font-black text-white">
                KL
              </span>
              <span className="text-2xl font-black text-gray-900">
                {getHotelPriceLabel(item)}
              </span>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {item.description}
            </p>

            {item.features?.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
                  住宿特色
                </p>
                <ul className="space-y-1.5">
                  {item.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="shrink-0 text-[#00B259] mt-1">·</span>
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
              <div>
                <p className="text-[11px] text-gray-600">預訂價格</p>
                <p className="text-xl font-black text-gray-900">
                  {getHotelPriceLabel(item)}
                </p>
              </div>
              {item.discountLabel && (
                <p className="text-[11px] font-bold text-[#00B259] text-right">
                  {item.discountLabel}
                </p>
              )}
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block w-full text-center py-4 rounded-xl bg-[#00B259] hover:bg-[#009f4f] text-white text-base font-black shadow-lg transition-colors"
            >
              立即預訂
            </a>

            <p className="mt-2 text-center text-[10px] text-gray-600">
              聯盟行銷連結 · 價格以{" "}
              {item.partner === "kkday" ? "KKday" : "Klook"} 官網即時顯示為準
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-lg leading-none"
            aria-label="關閉"
          >
            ×
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function HotelCard({ item, onClick }) {
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
      className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#00B259]/25 transition-all duration-200 overflow-hidden h-full text-left w-full cursor-pointer"
    >
      <div className="relative overflow-hidden">
        <HotelImageCarousel item={item} aspectClass="aspect-[4/3]" />
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700 z-10">
          {getHotelCategory(item)}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <p className="text-[11px] text-gray-600 line-clamp-1">
          {item.subtitle}
        </p>
        <h3 className="mt-1 text-[15px] font-black text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">
          {item.title}
        </h3>

        <div className="mt-3 flex items-center gap-1.5 min-w-0">
          <span
            className={[
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white",
              item.partner === "kkday" ? "bg-[#FF5A1F]" : "bg-[#00B259]",
            ].join(" ")}
          >
            {item.partner === "kkday" ? "KK" : "KL"}
          </span>
          <span className="text-base font-black text-gray-900">
            {getHotelPriceLabel(item)}
          </span>
        </div>

        <div className="mt-3 border-t border-gray-100 pt-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] text-gray-600 line-clamp-1 flex-1">
            {getHotelFooter(item)}
          </p>
          <span className="shrink-0 text-[10px] font-bold text-[#00B259] group-hover:underline">
            查看詳情 →
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AccommodationRecommendSection() {
  const [activeTab, setActiveTab] = useState("japan");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(
    () => KLOOK_HOTELS.filter((h) => h.countryId === activeTab),
    [activeTab],
  );

  const displayItems = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);

  const listingUrl =
    activeTab === "thailand"
      ? klookHotelAff("https://www.klook.com/zh-TW/hotels/city/4-bangkok-hotels/")
      : activeTab === "korea"
        ? klookHotelAff("https://www.klook.com/zh-TW/hotels/city/2-seoul-hotels/")
        : activeTab === "china"
          ? klookHotelAff(
              "https://www.klook.com/zh-TW/hotels/city/23301-shenzhen-city-hotels/",
            )
          : activeTab === "hongkong"
            ? klookHotelAff(
                "https://www.klook.com/zh-TW/hotels/city/2-hong-kong-hotels/",
              )
            : activeTab === "vietnam"
              ? klookHotelAff(
                  "https://www.klook.com/zh-TW/hotels/city/33-ho-chi-minh-city-hotels/",
                )
              : klookHotelAff("https://www.klook.com/zh-TW/hotels/city/29-tokyo-hotels/");

  return (
    <section
      id="accommodation-recommend"
      className="w-full bg-[#f0f1f3] pb-12 lg:pb-16 pt-4 scroll-mt-28"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <HomeSectionHeader
          eyebrow="住宿推薦"
          title={
            <>
              Jeko <span className="text-[#00B259]">×</span> Klook
            </>
          }
          href={listingUrl}
          moreLabel="住宿 / 飯店推薦"
          external
        />

        <div className="flex gap-6 sm:gap-8 mb-8 border-b border-gray-200/80 overflow-x-auto scrollbar-none">
          {COUNTRY_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowAll(false);
                }}
                className={[
                  "relative shrink-0 pb-3 text-[15px] sm:text-base font-medium tracking-tight transition-colors",
                  active
                    ? "text-[#1a73e8]"
                    : "text-gray-500 hover:text-gray-800",
                ].join(" ")}
              >
                {tab.label}
                {active && (
                  <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full bg-[#1a73e8]" />
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`mobile-${activeTab}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="md:hidden -mx-4"
          >
            {filtered.length > 0 ? (
              <MobileCardCarousel align="center" slideClassName="min-w-0 flex-[0_0_76%]">
                {filtered.map((item) => (
                  <HotelCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </MobileCardCarousel>
            ) : (
              <p className="text-center text-gray-500 py-12 text-sm">
                暫無推薦住宿
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`desktop-${activeTab}-${showAll}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
          >
            {displayItems.length > 0 ? (
              displayItems.map((item) => (
                <HotelCard
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedItem(item)}
                />
              ))
            ) : (
              <p className="col-span-full text-center text-gray-500 py-12 text-sm">
                暫無推薦住宿
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 hidden md:flex items-center justify-center gap-4 flex-wrap">
          {!showAll && filtered.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex items-center justify-center min-w-[180px] px-8 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-bold hover:border-gray-300 transition-colors"
            >
              顯示全部
            </button>
          )}
          <a
            href={listingUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center justify-center min-w-[180px] px-8 py-3.5 rounded-xl bg-[#00B259] text-white text-sm font-bold shadow-md hover:bg-[#009f4f] transition-colors"
          >
            Klook 查看更多住宿
          </a>
        </div>
      </div>

      {selectedItem && (
        <HotelModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </section>
  );
}
