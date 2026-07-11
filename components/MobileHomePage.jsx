"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CarRentalCharterSection from "./CarRentalCharterSection";
import AccommodationRecommendSection from "./AccommodationRecommendSection";
import KKdayTicketSection from "./KKdayTicketSection";
import KlookTicketSection from "./KlookTicketSection";
import JekoRecommendSection from "./JekoRecommendSection";

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

/* 使用 public/images/mobile-icon/ 八張圖 */
const QUICK_ICONS = [
  {
    label: "精選eSIM",
    href: "/product",
    src: "/images/mobile-icon/精選國家.png",
  },
  {
    label: "好物商城",
    href: "/shop",
    src: "/images/出國必備.png",
  },
  {
    label: "我的訂單",
    href: "/account",
    src: "/images/mobile-icon/我的訂單.png",
  },
  {
    label: "使用教學",
    href: "#how-to-install",
    src: "/images/mobile-icon/使用教學.png",
  },
  {
    label: "關於Jeko",
    href: "/about",
    src: "/images/mobile-icon/關於jeko.png",
  },
  {
    label: "包車服務",
    href: "#car-rental-charter",
    src: "/images/mobile-icon/包車服務.png",
  },
  {
    label: "住宿推薦",
    href: "#accommodation-section",
    src: "/images/mobile-icon/住宿推薦.png",
  },
  {
    label: "景點門票",
    href: "#kkday-section",
    src: "/images/mobile-icon/景點門票.png",
  },
  {
    label: "聯絡客服",
    href: LINE_OA_URL,
    external: true,
    src: "/images/mobile-icon/聯絡客服.png",
  },
];

const PROMO_BANNERS = [
  { src: "/images/優惠折扣.png", alt: "優惠折扣活動" },
  { src: "/images/出國必備.png", alt: "出國必備清單" },
  { src: "/images/立即租車.png", alt: "立即租車包車" },
];

const NEWS_ITEMS = [
  {
    id: 1,
    date: "2025.09.26",
    tag: "購買流程",
    title: "Jeko eSIM 的購買流程到使用方式",
    link: "#",
    color: "bg-sky-100 text-sky-600",
  },
  {
    id: 2,
    date: "2025.04.16",
    tag: "實體辦公",
    title: "目前有實體辦公處，有問題或合作意願可親洽或聯絡我們",
    link: "#",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    id: 3,
    date: "2025.03.27",
    tag: "退貨政策",
    title: "eSIM 無法安裝/使用？請參考退貨說明",
    link: "#",
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: 4,
    date: "2025.02.23",
    tag: "支付方式",
    title: "提供街口支付、LINE Pay 等主流付款方式",
    link: "#",
    color: "bg-purple-100 text-purple-600",
  },
];

const PROMO_NEWS = [
  {
    id: 101,
    date: "2025.10.01",
    tag: "限時優惠",
    title: "【秋季旅展】日本 eSIM 買一送一，限時 3 天！",
    link: "#",
    color: "bg-red-100 text-red-500",
  },
  {
    id: 102,
    date: "2025.09.15",
    tag: "會員專屬",
    title: "加入官方 LINE 好友，即刻領取 $50 折扣碼",
    link: "#",
    color: "bg-green-100 text-green-600",
  },
  {
    id: 103,
    date: "2025.08.30",
    tag: "新品上市",
    title: "歐洲 33 國通用 eSIM 全新上線，早鳥優惠中",
    link: "#",
    color: "bg-indigo-100 text-indigo-600",
  },
];

function SectionHeader({ title, link }) {
  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-2 bg-white">
      <h2 className="text-[16px] font-bold text-gray-900 tracking-tight">
        {title}
      </h2>
      {link && (
        <Link
          href={link}
          className="flex items-center gap-0.5 text-xs text-gray-400 font-medium"
        >
          更多
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      )}
    </div>
  );
}

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
    <section className="relative w-full h-[58vh] min-h-[340px] max-h-[520px] overflow-hidden bg-black">
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
          街口eSIM 成為您連接世界的接口
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
  const [activeNewsTab, setActiveNewsTab] = useState(0);
  const displayNews = activeNewsTab === 0 ? NEWS_ITEMS : PROMO_NEWS;

  return (
    <div className="bg-[#f2f3f5] min-h-screen pb-4">
      {/* ═══ 1. 原本主頁圖片輪播 ═══ */}
      <MobileHeroCarousel />

      {/* ═══ 2. 快捷功能圖示 ═══ */}
      <div className="mx-4 -mt-10 relative z-10 bg-white rounded-3xl border-1 border-gray-200  px-4 pt-5 pb-4">
        <div className="grid grid-cols-4 gap-y-3 gap-x-1">
          {QUICK_ICONS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              {...(item.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="flex flex-col items-center active:opacity-70 transition-opacity"
            >
              <Image
                src={item.src}
                alt={item.label}
                width={72}
                height={88}
                className="object-contain w-[72px] h-auto"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ 3. 促銷輪播橫幅 ═══ */}
      <div className="mt-4">
        <div
          className="flex gap-3 overflow-x-auto px-4 pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {PROMO_BANNERS.map((b) => (
            <div
              key={b.src}
              className="flex-shrink-0 w-[78vw] rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="relative w-full aspect-[2/1]">
                <Image
                  src={b.src}
                  alt={b.alt}
                  fill
                  className="object-cover"
                  sizes="78vw"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 4. 最新消息 / 優惠公告 ═══ */}
      <div className="mt-3">
        <div className="bg-white">
          <div className="flex items-center justify-between px-4 pt-4 pb-0">
            <div className="flex gap-0 border-b border-gray-100 w-full">
              {["最新消息/公告", "特價/優惠"].map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveNewsTab(i)}
                  className={`flex-1 py-2.5 text-[13px] font-bold transition-all ${
                    activeNewsTab === i
                      ? "text-[#0284c7] border-b-2 border-[#0284c7]"
                      : "text-gray-400"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-50 px-4">
            {displayNews.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                className="flex items-center gap-3 py-3.5 active:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.color}`}
                >
                  <span className="text-[10px] font-black">
                    {item.tag.slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-snug">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {item.date} · {item.tag}
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 5. 精選 eSIM 方案 ═══ */}
      <div className="mt-3">
        <SectionHeader title="精選 eSIM 方案" link="/product" />
        <div className="[&>section]:!bg-transparent [&>section]:!pt-0">
          <JekoRecommendSection />
        </div>
      </div>

      {/* ═══ 6. 租車包車 ═══ */}
      <div className="mt-3" id="car-rental-charter">
        <SectionHeader title="租車包車" />
        <div className="[&>section]:!bg-transparent [&>section]:!pt-0 [&>section_.flex.flex-wrap.items-baseline]:!hidden">
          <CarRentalCharterSection />
        </div>
      </div>

      {/* ═══ 7. 住宿推薦 ═══ */}
      <div className="mt-3" id="accommodation-section">
        <SectionHeader title="住宿推薦" />
        <AccommodationRecommendSection />
      </div>

      {/* ═══ 8. 景點門票 KKday ═══ */}
      <div className="mt-3" id="kkday-section">
        <SectionHeader title="景點門票 · KKday" />
        <KKdayTicketSection />
      </div>

      {/* ═══ 9. 景點體驗 Klook ═══ */}
      <div className="mt-3">
        <SectionHeader title="景點體驗 · Klook" />
        <KlookTicketSection />
      </div>

      {/* ═══ 10. 快速導覽 ═══ */}
      <div className="mt-4 mx-4 bg-white rounded-2xl shadow-sm px-5 py-4">
        <p className="text-xs text-gray-400 font-semibold mb-3 tracking-wider">
          快速導覽
        </p>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
          {[
            { label: "如何使用 eSIM？", href: "#how-to-install" },
            { label: "查看支援裝置", href: "/" },
            { label: "退貨政策", href: "/contact" },
            { label: "合作夥伴", href: "/partner/catalog" },
            { label: "蝦皮快速兌換", href: "/shopee-qrcode" },
            { label: "查找用量", href: "/data-query" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="flex items-center gap-1.5 text-[12px] text-gray-500 py-1 active:text-[#0284c7]"
            >
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
