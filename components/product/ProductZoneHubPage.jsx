"use client";

import Link from "next/link";
import Layout from "@/pages/Layout";
import { ChevronRight, MapPin } from "lucide-react";
import {
  PRODUCT_ZONE_DEFS,
  STUDENT_ZONE_COUNTRIES,
  BUSINESS_ZONE_COUNTRIES,
  resolveZoneCountryHref,
} from "@/lib/productZoneCategories";

const ZONE_BY_KEY = {
  student: {
    ...PRODUCT_ZONE_DEFS.find((z) => z.key === "student"),
    countries: STUDENT_ZONE_COUNTRIES,
    seoTitle: "留學生專區 eSIM｜Jeko eSIM",
    seoDesc:
      "台生熱門留學國家 eSIM：美國、澳洲、日本、英國、加拿大、韓國、新加坡，各國分開選購。",
  },
  business: {
    ...PRODUCT_ZONE_DEFS.find((z) => z.key === "business"),
    countries: BUSINESS_ZONE_COUNTRIES,
    seoTitle: "出差辦公專區 eSIM｜Jeko eSIM",
    seoDesc:
      "出差辦公常用國家 eSIM：日本、中國、韓國、香港、越南、新加坡、泰國、馬來西亞、美國。",
  },
};

function CountryCard({ zoneKey, country }) {
  const href = resolveZoneCountryHref(country, zoneKey);
  const body = (
    <>
      {country.hotSale ? (
        <span className="absolute top-3 right-3 rounded-full bg-[#FADE2B] text-[10px] font-bold text-slate-900 px-2 py-0.5">
          熱門
        </span>
      ) : null}
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
        <MapPin className="w-3.5 h-3.5 text-[#1E4AD1]" />
        {country.code}
      </div>
      <h2
        className={`mt-2 text-[20px] font-bold text-slate-900 transition-colors ${
          href ? "group-hover:text-[#1E4AD1]" : ""
        }`}
      >
        {country.name}
      </h2>
      <p className="mt-2 text-[13px] text-slate-500 leading-relaxed line-clamp-3">
        {country.desc}
      </p>
      <p
        className={`mt-4 text-[12px] font-bold ${
          href ? "text-[#1E4AD1]" : "text-slate-400"
        }`}
      >
        {href ? `查看 ${country.name} eSIM →` : "方案連結即將上線"}
      </p>
    </>
  );

  const className = href
    ? "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 transition hover:-translate-y-0.5 hover:border-[#1E4AD1]/35 hover:shadow-lg"
    : "relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 opacity-80 cursor-default";

  if (href) {
    return (
      <Link key={`${zoneKey}-${country.slug}`} href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <div
      key={`${zoneKey}-${country.slug}`}
      className={className}
      aria-disabled="true"
    >
      {body}
    </div>
  );
}

export default function ZoneHubPage({ zoneKey }) {
  const zone = ZONE_BY_KEY[zoneKey];
  if (!zone) return null;

  const seo = {
    title: zone.seoTitle,
    description: zone.seoDesc,
  };

  return (
    <Layout seo={seo}>
      <div className="bg-[#f9f9fa] min-h-screen">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16">
          <nav
            aria-label="麵包屑"
            className="flex items-center gap-1 text-[12px] sm:text-[13px] text-slate-500 mb-4"
          >
            <Link href="/product" className="hover:text-[#0071EB]">
              商店
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-bold text-[#1E4AD1]">{zone.label}</span>
          </nav>

          <header className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 sm:px-6 py-5 mb-5">
            <p className="text-[12px] font-bold text-[#1E4AD1]">{zone.pill}</p>
            <h1 className="mt-1 text-[22px] sm:text-[26px] lg:text-[28px] font-bold text-black tracking-normal leading-[1.35]">
              {zone.label}
            </h1>
            <p className="mt-2 text-[14px] sm:text-[16px] text-[#666666] font-normal leading-[28px] max-w-2xl">
              依國家分開選購。各國直達長天數 eSIM（20
              天以上）：同一商品可選每日型／總量型／吃到飽。
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRODUCT_ZONE_DEFS.map((z) => {
                const active = z.key === zoneKey;
                return (
                  <Link
                    key={z.key}
                    href={z.href}
                    className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold border transition ${
                      active
                        ? "bg-[#1E4AD1] text-white border-[#1E4AD1]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#1E4AD1]/40"
                    }`}
                  >
                    {z.label}
                  </Link>
                );
              })}
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {zone.countries.map((c) => (
              <CountryCard
                key={`${zoneKey}-${c.slug}`}
                zoneKey={zoneKey}
                country={c}
              />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
