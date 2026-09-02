"use client";

import Link from "next/link";
import Layout from "@/pages/Layout";
import { ChevronRight, MapPin } from "lucide-react";
import {
  PRODUCT_ZONE_DEFS,
  STUDENT_ZONE_COUNTRIES,
  BUSINESS_ZONE_COUNTRIES,
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
            <h1 className="mt-1 text-[24px] sm:text-[30px] font-black text-slate-900 tracking-tight">
              {zone.label}
            </h1>
            <p className="mt-2 text-[13px] sm:text-[14px] text-slate-500 leading-relaxed max-w-2xl">
              依國家分開選購。點選下方國家進入該國 eSIM
              分類；精選變體方案稍後更新。
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
              <Link
                key={`${zoneKey}-${c.slug}`}
                href={`/product/${c.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 transition hover:-translate-y-0.5 hover:border-[#1E4AD1]/35 hover:shadow-lg"
              >
                {c.hotSale ? (
                  <span className="absolute top-3 right-3 rounded-full bg-[#FADE2B] text-[10px] font-black text-slate-900 px-2 py-0.5">
                    熱門
                  </span>
                ) : null}
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-[#1E4AD1]" />
                  {c.code}
                </div>
                <h2 className="mt-2 text-[20px] font-black text-slate-900 group-hover:text-[#1E4AD1] transition-colors">
                  {c.name}
                </h2>
                <p className="mt-2 text-[13px] text-slate-500 leading-relaxed line-clamp-3">
                  {c.desc}
                </p>
                <p className="mt-4 text-[12px] font-bold text-[#1E4AD1]">
                  查看 {c.name} eSIM →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

