"use client";

import Link from "next/link";
import { PRODUCT_ZONE_DEFS } from "@/lib/productZoneCategories";

/**
 * /product 商店頁：留學生／出差辦公專區入口
 */
export default function ProductZoneCategorySection() {
  return (
    <section className="bg-white rounded-xl border border-slate-100 px-3 sm:px-5 py-4 sm:py-5">
      <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
        <div>
          <h2 className="text-[16px] sm:text-[18px] font-bold text-slate-900 tracking-tight">
            專區分類
          </h2>
          <p className="mt-0.5 text-[12px] sm:text-[13px] text-slate-500">
            依用途快速挑選國家 eSIM（各國分開）
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRODUCT_ZONE_DEFS.map((zone) => (
          <Link
            key={zone.key}
            href={zone.href}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-[#F7FAFF] px-4 py-4 sm:px-5 sm:py-5 transition hover:border-[#1E4AD1]/40 hover:shadow-md"
          >
            <div className="pointer-events-none absolute -bottom-6 -right-6 h-20 w-20 rounded-tl-full bg-[#1E4AD1]/10 transition group-hover:scale-110" />
            <p className="relative text-[11px] font-bold text-[#1E4AD1] tracking-wide">
              {zone.pill}
            </p>
            <h3 className="relative mt-1 text-[17px] sm:text-[19px] font-bold text-slate-900 group-hover:text-[#1E4AD1] transition-colors">
              {zone.label}
            </h3>
            <p className="relative mt-1.5 text-[12px] text-slate-500 leading-relaxed">
              {zone.countries.map((c) => c.name).join("、")}
            </p>
            <p className="relative mt-3 text-[12px] font-bold text-[#1E4AD1]">
              查看國家 →
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
