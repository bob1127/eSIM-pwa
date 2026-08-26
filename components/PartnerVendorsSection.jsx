"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const BODY =
  "※歡迎旅遊業者、飯店民宿、KOL／部落客與自由接案者加入——可選「專屬連結」分享官網同價分潤，或開「專屬商店」自訂風格、自動選品一鍵開通；客服、行銷與 SEO 皆由我們支援。";

const FEATURES = [
  {
    label: "專屬連結",
    sub: "官網同價分潤",
    icon: (
      <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none" aria-hidden>
        <rect x="6" y="8" width="28" height="20" rx="2" stroke="#0071EB" strokeWidth="2" />
        <path d="M6 14h28" stroke="#0071EB" strokeWidth="2" />
        <circle cx="10" cy="11" r="1.2" fill="#0071EB" />
        <circle cx="14" cy="11" r="1.2" fill="#0071EB" />
      </svg>
    ),
  },
  {
    label: "專屬商店",
    sub: "自訂風格開通",
    icon: (
      <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none" aria-hidden>
        <path
          d="M8 16h24l-2 16H10L8 16z"
          stroke="#0071EB"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M14 16V12a6 6 0 0 1 12 0v4" stroke="#0071EB" strokeWidth="2" />
      </svg>
    ),
  },
  {
    label: "自動選品",
    sub: "一鍵開通上架",
    icon: (
      <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none" aria-hidden>
        <path
          d="M20 6l3.5 9.5H34l-8 6 3 9.5L20 25l-9 6 3-9.5-8-6h10.5L20 6z"
          stroke="#0071EB"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "客服行銷",
    sub: "SEO 全程支援",
    icon: (
      <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none" aria-hidden>
        <circle cx="20" cy="20" r="12" stroke="#0071EB" strokeWidth="2" />
        <path
          d="M20 12v8l5 3"
          stroke="#0071EB"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

/** 假圖：左右漂浮產品占位（之後可換成真實包裝圖） */
function FloatPlaceholder({ className, children, delay = 0 }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

function LeftFloats() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 left-0 hidden w-[22%] lg:block xl:w-[26%]"
      aria-hidden
    >
      <FloatPlaceholder className="absolute left-[8%] top-[12%] w-[42%]" delay={0.2}>
        <div className="aspect-[3/4] rounded-sm bg-gradient-to-b from-slate-100 to-slate-200 shadow-md ring-1 ring-black/5">
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
            <div className="h-[55%] w-[70%] rounded-sm bg-white/80 shadow-inner" />
            <span className="text-[9px] font-semibold tracking-widest text-slate-400">
              PACK
            </span>
          </div>
        </div>
      </FloatPlaceholder>
      <FloatPlaceholder className="absolute left-[38%] top-[38%] w-[48%]" delay={0.8}>
        <div className="aspect-square rounded-md bg-[#2c2c2c] shadow-lg">
          <div className="flex h-full items-center justify-center">
            <span className="text-[10px] font-medium tracking-[0.2em] text-white/80">
              BOX
            </span>
          </div>
        </div>
      </FloatPlaceholder>
      <FloatPlaceholder className="absolute bottom-[18%] left-[12%] w-[28%]" delay={1.4}>
        <div className="aspect-[2/5] overflow-hidden rounded-sm shadow-md ring-1 ring-black/5">
          <div className="h-[45%] bg-white" />
          <div className="h-[55%] bg-[#F5A623]" />
        </div>
      </FloatPlaceholder>
    </div>
  );
}

function RightFloats() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[22%] lg:block xl:w-[26%]"
      aria-hidden
    >
      <FloatPlaceholder className="absolute right-[18%] top-[10%] w-[36%]" delay={0.5}>
        <div className="aspect-[3/4] rounded-t-full rounded-b-md bg-gradient-to-b from-stone-100 to-stone-200 shadow-md ring-1 ring-black/5" />
      </FloatPlaceholder>
      <FloatPlaceholder className="absolute right-[6%] top-[28%] w-[44%]" delay={1.1}>
        <div className="aspect-[3/5] rounded-md bg-gradient-to-b from-[#F5B942] to-[#E8910C] shadow-lg">
          <div className="flex h-full flex-col items-center justify-center gap-2 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/80">
              <span className="text-[8px] font-bold text-white">SIM</span>
            </div>
            <span className="text-center text-[9px] font-semibold tracking-wide text-black/50">
              POUCH
            </span>
          </div>
        </div>
      </FloatPlaceholder>
      <FloatPlaceholder className="absolute bottom-[14%] right-[22%] w-[50%]" delay={0.3}>
        <div className="aspect-[5/4] rounded-sm bg-[#C4A484] shadow-lg">
          <div className="flex h-full items-center justify-center">
            <span className="font-serif text-lg italic text-white/90">Brand.</span>
          </div>
        </div>
      </FloatPlaceholder>
    </div>
  );
}

const LOGO_PLACEHOLDERS = [
  "TRAVEL+",
  "STAY Hub",
  "KOL Lab",
  "TripNest",
  "HotelGo",
  "Nomad TW",
  "SkyPass",
  "Wander",
  "LinkPay",
  "TourMate",
  "BlueChain",
  "eSIM Pro",
];

/**
 * 合作夥伴與廠商 — 對齊參考圖置中文案＋左右漂浮假圖＋底部 logo 列
 */
export default function PartnerVendorsSection({ className = "" }) {
  return (
    <section
      className={`relative w-full overflow-hidden bg-white py-16 md:py-24 ${className}`}
    >
      <div className="relative mx-auto min-h-[420px] max-w-[1280px] px-4 md:px-8">
        <LeftFloats />
        <RightFloats />

        <div className="relative z-10 mx-auto flex max-w-[640px] flex-col items-center text-center lg:max-w-[560px] xl:max-w-[600px]">
          <h2 className="text-[28px] font-black tracking-tight text-[#111] md:text-[36px] lg:text-[40px]">
            合作夥伴與廠商
          </h2>

          <p className="mt-5 max-w-[520px] text-[13px] font-medium leading-[1.85] text-[#5B7382] md:mt-6 md:text-[14px]">
            {BODY}
          </p>

          <ul className="mt-8 grid w-full grid-cols-2 gap-x-4 gap-y-6 sm:mt-10 sm:grid-cols-4 sm:gap-x-2 md:gap-x-4">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex flex-col items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center text-[#0071EB]">
                  {f.icon}
                </div>
                <p className="text-[12px] font-bold leading-snug text-[#222] md:text-[13px]">
                  {f.label}
                </p>
                <p className="text-[11px] font-medium leading-snug text-[#7A8B96]">
                  {f.sub}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex w-full max-w-[420px] flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/register-distributor?mode=referral"
              className="inline-flex items-center justify-center rounded-md bg-[#0071EB] px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-[#005fc7]"
            >
              申請專屬連結
            </Link>
            <Link
              href="/register-distributor?mode=store"
              className="inline-flex items-center justify-center rounded-md border border-[#0071EB] bg-white px-7 py-3.5 text-[14px] font-bold text-[#0071EB] transition-colors hover:bg-[#0071EB]/5"
            >
              申請專屬商店
            </Link>
          </div>
        </div>
      </div>

      {/* Logo 列（假廠商名，之後可換真實 logo） */}
      <div className="relative z-10 mt-14 border-t border-slate-100 pt-10 md:mt-16 md:pt-12">
        <div className="mx-auto grid max-w-[1100px] grid-cols-3 items-center justify-items-center gap-x-6 gap-y-8 px-6 sm:grid-cols-4 md:grid-cols-6 md:gap-y-10">
          {LOGO_PLACEHOLDERS.map((name) => (
            <span
              key={name}
              className="select-none text-[13px] font-bold tracking-wide text-slate-300 md:text-[15px]"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
