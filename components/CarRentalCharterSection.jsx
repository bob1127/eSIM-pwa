"use client";

import Link from "next/link";
import MobileCardCarousel from "./MobileCardCarousel";
import HomeSectionHeader from "./HomeSectionHeader";

function DecoDot({ className, color = "white" }) {
  return (
    <span
      className={`absolute rounded-full opacity-90 ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}

const CARD_BASE =
  "group relative block w-full aspect-[2/1] overflow-hidden rounded-[20px] shadow-sm transition-transform duration-300 hover:scale-[1.01] hover:shadow-md";

/** 卡片 1：藍底圖文促銷 */
function PromoCard() {
  return (
    <Link
      href="#"
      className={`${CARD_BASE} flex flex-col items-center justify-center bg-[#2B6CE8] p-4 sm:p-5 text-center text-white`}
    >
      {/* 裝飾圖形 */}
      <DecoDot className="top-4 left-6 h-2 w-2" color="#FFD43A" />
      <DecoDot className="top-8 right-10 h-1.5 w-1.5" color="#7DD3FC" />
      <DecoDot className="bottom-10 left-12 h-2.5 w-2.5" color="#F9A8D4" />
      <DecoDot className="bottom-6 right-8 h-2 w-2" color="#86EFAC" />
      <span className="absolute top-5 right-6 text-lg opacity-80">✦</span>
      <span className="absolute bottom-8 left-8 text-sm opacity-70">〜</span>
      <span className="absolute top-1/2 left-4 text-xs opacity-50 rotate-12">
        ★
      </span>

      <p className="relative z-10 text-[11px] sm:text-xs font-bold tracking-wide opacity-95">
        出國移動更輕鬆
      </p>
      <p
        className="relative z-10 mt-1 text-[40px] sm:text-[48px] lg:text-[52px] font-black leading-none tracking-tight"
        style={{
          fontFamily: "system-ui, sans-serif",
          textShadow: "2px 2px 0 rgba(0,0,0,0.08)",
          letterSpacing: "-0.02em",
        }}
      >
        <span className="inline-block border-b-4 border-dotted border-white/40 pb-1">
          24H
        </span>
      </p>
      <p className="relative z-10 mt-2 text-[10px] sm:text-[11px] font-bold leading-relaxed px-2">
        機場接送・包車觀光
        <br />
        預約即享專屬優惠！
      </p>
    </Link>
  );
}

/** 卡片 2：立即租車圖片 */
function VehicleTypesCard() {
  return (
    <Link href="#" className={CARD_BASE}>
      <img
        src="/images/立即租車.png"
        alt="立即租車"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </Link>
  );
}

/** 卡片 3：全幅圖片 + 置中框線標題 */
function CharterPhotoCard() {
  return (
    <Link href="#" className={CARD_BASE}>
      <img
        src="/images/包車.png"
        alt="包車旅遊"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/10" />

      <div className="absolute inset-0 flex items-center justify-center z-10 px-4">
        <div className="rounded-lg border-2 border-white px-4 py-2 sm:px-6 sm:py-3 text-center bg-black/10 backdrop-blur-[2px]">
          <p className="text-base sm:text-lg font-black text-white tracking-widest leading-tight">
            Jeko
          </p>
          <p className="text-xs sm:text-sm font-bold text-white mt-0.5 tracking-[0.2em]">
            包車服務
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function CarRentalCharterSection() {
  return (
    <section
      id="car-rental-charter"
      className="w-full bg-[#f0f1f3] pt-12 lg:pt-14 pb-4 scroll-mt-28"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <HomeSectionHeader
          eyebrow="出行服務"
          title="租車包車服務"
          href="#car-rental-charter"
          moreLabel="機場接送・包車觀光・自駕租車"
        />

        {/* 手機版輪播 */}
        <div className="md:hidden -mx-4">
          <MobileCardCarousel align="center" slideClassName="min-w-0 flex-[0_0_76%]">
            <PromoCard />
            <VehicleTypesCard />
            <CharterPhotoCard />
          </MobileCardCarousel>
        </div>

        {/* 桌面版三欄 */}
        <div className="hidden md:grid grid-cols-3 gap-4 lg:gap-5">
          <PromoCard />
          <VehicleTypesCard />
          <CharterPhotoCard />
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-600">
          包車合作夥伴預約連結
        </p>
      </div>
    </section>
  );
}
