"use client";

import { useState } from "react";
import Link from "next/link";
import { toSameOriginImagePath } from "@/lib/resolveMedusaImageUrl";
import { getCountryProductImagePath } from "@/lib/countryProductImages";
import {
  getFeaturedCountryCode,
  getFeaturedCountryCodeTopClass,
} from "@/lib/featuredCountryCode";

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
  usa: "/images/sim/分類/分類eSIM-美國.png",
  america: "/images/sim/分類/分類eSIM-美國.png",
  "us-canada": "/images/sim/分類/分類eSIM-美加-.png",
  "us-ca": "/images/sim/分類/分類eSIM-美加-.png",
  "north-america": "/images/sim/分類/分類eSIM-美加墨.png",
  taiwan: "/images/分類eSIM-台灣.png",
  france: "/images/分類eSIM-法國.png",
  turkey: "/images/分類eSIM-歐洲.png",
  tr: "/images/分類eSIM-歐洲.png",
  turkiye: "/images/分類eSIM-歐洲.png",
  germany: "/images/分類eSIM-德國.png",
  de: "/images/分類eSIM-德國.png",
  spain: "/images/分類eSIM-西班牙.png",
  italy: "/images/分類eSIM-義大利.png",
  uk: "/images/分類eSIM-英國.png",
  "united-kingdom": "/images/分類eSIM-英國.png",
  britain: "/images/分類eSIM-英國.png",
  austria: "/images/分類eSIM-歐洲.png",
  at: "/images/分類eSIM-歐洲.png",
  switzerland: "/images/分類eSIM-瑞士.png",
};

export function resolveCategoryImageSrc(
  slug: string,
  remoteSrc?: string | null,
) {
  const productImg = getCountryProductImagePath(slug);
  if (productImg) return productImg;
  const mapped = CATEGORY_IMAGE_FALLBACKS[slug];
  const local = "/images/jeko-esim.png";
  // Supabase Storage 目前常回 402，略過；站內圖改相對路徑並套用舊路徑 rewrite
  if (remoteSrc && !/supabase\.co\/storage/i.test(remoteSrc)) {
    return toSameOriginImagePath(remoteSrc) || mapped || local;
  }
  return mapped || local;
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
  href?: string;
  footerText?: string;
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
  const subtitle =
    country.description?.trim() ||
    `探索 ${country.name} 熱門 eSIM 上網方案`;
  const footerText =
    country.footerText ||
    (country.productCount > 0
      ? `共 ${country.productCount} 款方案可選`
      : "即將上架更多方案");
  const cardHref = country.href || `/product/${country.slug}`;
  const countryCode = getFeaturedCountryCode(country.slug);
  const codeTopClass = getFeaturedCountryCodeTopClass(country.slug);

  return (
    <Link
      href={cardHref}
      onClick={onNavigate}
      className={[
        "flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm",
        "overflow-hidden shrink-0",
        compact ? "w-[168px]" : "w-[188px] sm:w-[200px]",
      ].join(" ")}
    >
      {/* 圖片區 */}
      <div
        className={[
          "relative bg-slate-50 overflow-hidden flex items-center justify-center",
          compact ? "aspect-[16/9] p-1.5" : "aspect-[16/10] p-2",
        ].join(" ")}
      >
        <img
          src={imgSrc}
          alt={`${country.name} eSIM`}
          className="w-full h-full object-contain"
          onError={() => {
            if (imgSrc !== fallbackSrc) setImgSrc(fallbackSrc);
          }}
        />
        {countryCode ? (
          <span
            className={[
              "absolute left-1/2 z-10 -translate-x-1/2",
              codeTopClass,
              "flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center rounded-full",
              "bg-[#1E4AD1] px-1 text-[10px] font-black leading-none text-white shadow-md",
              countryCode.length > 2 ? "text-[8px] tracking-tight" : "",
            ].join(" ")}
          >
            {countryCode}
          </span>
        ) : null}
      </div>

      {/* 內容區 */}
      <div className="flex flex-1 flex-col px-2.5 pt-1.5 pb-2">
        <p className="text-[10px] text-gray-600 line-clamp-1 leading-snug">
          {subtitle}
        </p>
        <h3 className="mt-0.5 text-[13px] font-black text-gray-900 leading-tight line-clamp-1">
          {country.name}
        </h3>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFD43A]/90 text-[8px] font-black text-slate-800">
              NT
            </span>
            {priceText ? (
              <div className="flex items-baseline gap-0.5 min-w-0">
                <span className="text-[10px] text-gray-600 shrink-0">NT$</span>
                <span className="text-base font-black text-gray-900 truncate">
                  {priceText}
                </span>
                <span className="text-[10px] text-gray-600 shrink-0">起</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-gray-600">查看方案</span>
            )}
          </div>

          {country.productCount > 0 && (
            <span className="shrink-0 rounded-full bg-[#0A6CD0] px-1.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
              {country.productCount} 款
            </span>
          )}
        </div>

        <div className="mt-1.5 border-t border-gray-100 pt-1">
          <p className="text-[10px] text-gray-600 line-clamp-1">{footerText}</p>
        </div>
      </div>
    </Link>
  );
}
