"use client";

import { useState } from "react";
import Link from "next/link";

/** Medusa 分類 metadata 圖常連到外部 Storage；失效時改用本地圖 */
export const CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  japan: "/images/分類eSIM-日本.png",
  korea: "/images/分類eSIM-韓國.png",
  china: "/images/分類eSIM-中國.png",
  kongkong: "/images/分類eSIM-中港澳.png",
  hongkong: "/images/分類eSIM-中港澳.png",
  tailand: "/images/分類eSIM-泰國.png",
  thailand: "/images/分類eSIM-泰國.png",
  malaysia: "/images/分類eSIM-馬來西亞.png",
  singapore: "/images/分類eSIM-新馬.png",
  vietnam: "/images/分類eSIM-越南.png",
  usa: "/images/美國esim.png",
  "us-canada": "/images/美國esim.png",
  "us-ca": "/images/美國esim.png",
  "north-america": "/images/美國esim.png",
  america: "/images/美國esim.png",
};

export function resolveCategoryImageSrc(
  slug: string,
  remoteSrc?: string | null,
) {
  const local = CATEGORY_IMAGE_FALLBACKS[slug] || "/images/jeko-esim.png";
  // 外部 Storage 目前回 402，精選卡優先用本地圖
  if (remoteSrc && !/supabase\.co\/storage/i.test(remoteSrc)) {
    return remoteSrc;
  }
  return local;
}

export interface FeaturedCountry {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  imageSrc: string | null;
  productCount: number;
  minPrice: number | null;
  regionLabel?: string;
  badge?: string;
}

function formatPrice(amount: number) {
  if (!amount || amount <= 0) return null;
  const value = amount >= 100 ? Math.round(amount / 100) : amount;
  return value.toLocaleString("zh-TW");
}

export default function FeaturedCountryCard({
  country,
  compact = false,
  onNavigate,
}: {
  country: FeaturedCountry;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const fallbackSrc = resolveCategoryImageSrc(country.slug, null);
  const [imgSrc, setImgSrc] = useState(
    () => resolveCategoryImageSrc(country.slug, country.imageSrc),
  );
  const priceText = country.minPrice ? formatPrice(country.minPrice) : null;
  const regionTag = country.regionLabel || country.name;
  const subtitle =
    country.description?.trim() ||
    `探索 ${country.name} 熱門 eSIM 上網方案`;
  const footerText =
    country.productCount > 0
      ? `共 ${country.productCount} 款方案可選`
      : "即將上架更多方案";

  return (
    <Link
      href={`/product/${country.slug}`}
      onClick={onNavigate}
      className={[
        "flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm",
        "overflow-hidden shrink-0",
        compact ? "w-[200px]" : "w-[220px] sm:w-[240px]",
      ].join(" ")}
    >
      {/* 圖片區 */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        <img
          src={imgSrc}
          alt={country.name}
          className="w-full h-full object-cover"
          onError={() => {
            if (imgSrc !== fallbackSrc) setImgSrc(fallbackSrc);
          }}
        />

        <span className="absolute top-2.5 left-2.5 rounded-md bg-black/85 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
          {regionTag}
        </span>

        {country.badge && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-[#0A6CD0] px-2 py-0.5 text-[10px] font-bold text-white">
            {country.badge}
          </span>
        )}
      </div>

      {/* 內容區 */}
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
        <p className="text-[11px] text-gray-400 line-clamp-1 leading-snug">
          {subtitle}
        </p>
        <h3 className="mt-1 text-[15px] font-black text-gray-900 leading-tight line-clamp-2 min-h-[2.5rem]">
          {country.name}
        </h3>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFD43A]/90 text-[9px] font-black text-slate-800">
              NT
            </span>
            {priceText ? (
              <div className="flex items-baseline gap-0.5 min-w-0">
                <span className="text-[10px] text-gray-500 shrink-0">NT$</span>
                <span className="text-lg font-black text-gray-900 truncate">
                  {priceText}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">起</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-gray-500">查看方案</span>
            )}
          </div>

          {country.productCount > 0 && (
            <span className="shrink-0 rounded-full bg-[#0A6CD0] px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
              {country.productCount} 款
            </span>
          )}
        </div>

        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="text-[10px] text-gray-400 line-clamp-1">{footerText}</p>
        </div>
      </div>
    </Link>
  );
}
