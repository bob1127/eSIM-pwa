"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * 國家分類促銷卡（深色卡＋折扣碼複製）
 * @param {{ promo: import("@/lib/categoryPromoBanner").CategoryPromoBanner }} props
 */
export default function CategoryPromoCard({ promo }) {
  const [copied, setCopied] = useState(false);

  if (!promo?.enabled) return null;

  const copyCode = async () => {
    if (!promo.discountCode) return;
    try {
      await navigator.clipboard.writeText(promo.discountCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#111] to-[#333] text-white rounded-[8px] p-6 shadow-lg relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
      <span className="bg-[#ff4757] text-white text-[11px] font-bold px-3 py-1 rounded-sm tracking-wider uppercase mb-3 inline-block">
        {promo.badge}
      </span>
      <h4 className="text-[18px] font-bold mb-2 tracking-wide relative">
        {promo.title}
      </h4>
      {promo.description ? (
        <p className="text-[13px] text-white/80 mb-5 leading-relaxed relative">
          {promo.description}
        </p>
      ) : null}
      {promo.discountCode ? (
        <div className="bg-black/50 border border-white/20 rounded-[4px] p-3 text-center mb-4 flex items-center justify-between gap-2 relative">
          <span className="text-[14px] font-mono font-bold tracking-widest">
            {promo.discountCode}
          </span>
          <button
            type="button"
            onClick={copyCode}
            className="text-[12px] text-[#ff4757] font-bold hover:text-white transition-colors shrink-0"
          >
            {copied ? "已複製" : "複製"}
          </button>
        </div>
      ) : null}
      <Link
        href={promo.ctaHref || "/product"}
        className="relative block w-full bg-white text-[#111] text-center py-3 text-[14px] font-bold rounded-[4px] hover:bg-[#f0f0f0] transition-colors"
      >
        {promo.ctaLabel}
      </Link>
    </div>
  );
}
