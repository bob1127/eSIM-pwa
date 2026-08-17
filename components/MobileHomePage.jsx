"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CarRentalCharterSection from "./CarRentalCharterSection";
import AccommodationRecommendSection from "./AccommodationRecommendSection";
import KKdayTicketSection from "./KKdayTicketSection";
import TransportTicketSection from "./TransportTicketSection";
import JekoRecommendSection from "./JekoRecommendSection";
import ServiceSection from "./ServiceSection";
import MobileCardCarousel from "./MobileCardCarousel";

const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";

/* 與原本 Slider.jsx 相同的主頁輪播圖 */
const HERO_SLIDES = [
  {
    image: "/images/Hero-banner-01.png",
    imageMobile: "/images/hero-banner-mobile.png",
  },
  { image: "/images/九州.png" },
  { image: "/images/location/fcc7e825-9136-4c9d-8312-3309fe189b4c.png" },
  { image: "/images/location/korea-02.png" },
  { image: "/images/location/thailand-01.png" },
];

/* 首頁上方快捷：public/images/icon/ */
const QUICK_ICONS = [
  {
    label: "加入官方 LINE",
    href: LINE_OA_URL,
    external: true,
    src: "/images/icon/01.png",
  },
  {
    label: "開啟 APP 流量提醒",
    href: "/data-query?setup=traffic#push-notification-section",
    src: "/images/icon/02.png",
  },
  {
    label: "訂單查詢",
    href: "/account",
    src: "/images/icon/03.png",
  },
  {
    label: "租車包車",
    href: "#car-rental-charter",
    src: "/images/icon/04.png",
  },
  {
    label: "住宿",
    href: "#accommodation-section",
    src: "/images/icon/05.png",
  },
];

const PROMO_BANNERS = [
  { src: "/images/優惠折扣.png", alt: "優惠折扣活動", href: "/promo" },
  { src: "/images/出國必備.png", alt: "出國必備清單", href: "/product" },
  { src: "/images/立即租車.png", alt: "立即租車包車", href: "#car-rental-charter" },
];

/** 原本主頁圖片輪播（手機版） */
function MobileHeroCarousel() {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <section className="relative mx-4 mt-3 h-[58vh] min-h-[340px] max-h-[520px] overflow-hidden rounded-2xl bg-black">
      {HERO_SLIDES.map((slide, idx) => (
        <div
          key={`hero-${idx}`}
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{
            opacity: active === idx ? 1 : 0,
            zIndex: active === idx ? 2 : 1,
            transitionDuration: "1.2s",
          }}
        >
          {slide.imageMobile ? (
            <picture>
              <source media="(max-width: 767px)" srcSet={slide.imageMobile} />
              <img
                src={slide.image}
                alt={`Jeko eSIM Banner ${idx + 1}`}
                className="w-full h-full object-cover object-[center_55%]"
              />
            </picture>
          ) : (
            <img
              src={slide.image}
              alt={`Jeko eSIM Banner ${idx + 1}`}
              className="w-full h-full object-cover object-[center_55%]"
            />
          )}
        </div>
      ))}

      {/* 漸層遮罩 */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/20 via-black/15 to-black/55" />

      {/* 文案 */}
      <div className="absolute left-0 right-0 top-[18%] z-20 px-5">
        <h1 className="text-[36px] font-black leading-[1.08] tracking-tight text-white drop-shadow-lg italic">
          Jeko eSIM
        </h1>
        <p className="mt-2 text-[14px] text-white/95 font-medium drop-shadow-md">
          接口eSIM 成為您連接世界的接口
        </p>
        <Link
          href="/product"
          className="mt-4 inline-flex items-center gap-1.5 bg-white text-[#1d5cc5] rounded-full px-5 py-2 text-sm font-bold shadow-md active:scale-[0.98] transition-transform"
        >
          查看 eSIM 方案
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              d="M5 12h14M13 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {/* 指示點 */}
      <div className="absolute left-5 bottom-6 z-20 flex items-center gap-1.5">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={`dot-${idx}`}
            type="button"
            aria-label={`切換至第 ${idx + 1} 張`}
            onClick={() => setActive(idx)}
            className={`rounded-full transition-all duration-300 ${
              active === idx ? "w-2 h-2 bg-white" : "w-1.5 h-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

export default function MobileHomePage() {
  return (
    <div className="bg-[#f2f3f5] min-h-screen pb-4">
      {/* ═══ 1. 原本主頁圖片輪播 ═══ */}
      <MobileHeroCarousel />

      {/* ═══ 2. 快捷功能圖示 ═══ */}
      <div className="mx-4 -mt-10 relative z-10 bg-white rounded-3xl border-1 border-gray-200 px-2.5 pt-4 pb-3">
        <div className="grid grid-cols-5 gap-1.5">
          {QUICK_ICONS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              {...(item.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 aspect-square w-full px-1 py-1.5 active:opacity-70 transition-opacity"
            >
              <Image
                src={item.src}
                alt={item.label}
                width={72}
                height={72}
                className="object-contain w-[62%] h-auto"
              />
              <span className="text-[9px] font-bold text-[#1d5cc5] text-center leading-tight line-clamp-2">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ 3. 促銷輪播橫幅（置中，左右露出相鄰圖）═══ */}
      <div className="mt-4">
        <MobileCardCarousel
          align="center"
          slideClassName="min-w-0 flex-[0_0_76%]"
          showArrows={false}
          autoplayDelay={4500}
        >
          {PROMO_BANNERS.map((b) => {
            const card = (
              <div className="relative w-full aspect-[2/1] overflow-hidden rounded-2xl shadow-sm bg-white">
                <Image
                  src={b.src}
                  alt={b.alt}
                  fill
                  className="object-cover"
                  sizes="76vw"
                />
              </div>
            );
            return b.href ? (
              <Link key={b.src} href={b.href} className="block">
                {card}
              </Link>
            ) : (
              <div key={b.src}>{card}</div>
            );
          })}
        </MobileCardCarousel>
      </div>

      {/* ═══ 4. 連線方案（原生卡／日韓東南亞）═══ */}
      <div className="mt-3">
        <ServiceSection />
      </div>

      {/* ═══ 5. 精選 eSIM 方案 ═══ */}
      <div className="mt-3">
        <div className="[&>section]:!bg-transparent [&>section]:!pt-0">
          <JekoRecommendSection />
        </div>
      </div>

      {/* ═══ 6. 租車包車 ═══ */}
      <div className="mt-3" id="car-rental-charter">
        <div className="[&>section]:!bg-transparent [&>section]:!pt-0 [&>section_.flex.flex-wrap.items-baseline]:!hidden">
          <CarRentalCharterSection />
        </div>
      </div>

      {/* ═══ 7. 住宿推薦 ═══ */}
      <div className="mt-3" id="accommodation-section">
        <AccommodationRecommendSection />
      </div>

      {/* ═══ 8. 景點門票 ═══ */}
      <div className="mt-3" id="kkday-section">
        <KKdayTicketSection />
      </div>

      {/* ═══ 9. 交通票券 ═══ */}
      <div className="mt-3" id="transport-section">
        <TransportTicketSection />
      </div>
    </div>
  );
}
