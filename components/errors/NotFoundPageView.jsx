"use client";

import Link from "next/link";
import BrandHeroDecor from "@/components/BrandHeroDecor";
import JekoPillButton from "@/components/ui/JekoPillButton";

/**
 * 404：與 /cooperation hero 同款漂浮背景
 */
export default function NotFoundPageView({ showHomeLink = true }) {
  return (
    <section className="relative w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] bg-[#F7F9FB] flex flex-col items-center justify-center overflow-hidden font-sans px-6">
      <BrandHeroDecor />

      <div className="relative z-20 flex flex-col items-center text-center max-w-xl">
        <p className="text-[18px] md:text-[24px] font-bold text-[#111] mb-2 md:mb-4 tracking-widest">
          Oops
        </p>
        <h1
          className="text-[28px] font-bold text-[#111] leading-none mb-4 tracking-tight"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          404
        </h1>
        <h2 className="text-[18px] md:text-[22px] font-bold text-[#111] mb-3">
          找不到這個頁面
        </h2>
        <div className="flex flex-wrap items-center justify-center text-[11px] md:text-[13px] text-[#888] font-bold tracking-widest bg-white/50 px-4 py-1.5 rounded-full backdrop-blur-sm mb-10">
          <span>連結可能已失效或頁面暫時無法載入</span>
          <span className="mx-3 text-[#ccc]">|</span>
          <span>from 接口eSIM</span>
          <span className="ml-2 flex items-center justify-center w-[16px] h-[16px] md:w-[18px] md:h-[18px] bg-[#FADE2B] rounded-full text-white text-[8px] font-bold leading-none">
            ツ
          </span>
        </div>

        {showHomeLink ? (
          <JekoPillButton href="/" variant="primary" size="md" fullWidth={false}>
            回到官網
          </JekoPillButton>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-[#666]">
          <Link href="/product/" className="hover:text-[#1E4AD1] transition-colors">
            瀏覽 eSIM
          </Link>
          <span className="text-[#ddd]">·</span>
          <Link href="/blog/" className="hover:text-[#1E4AD1] transition-colors">
            旅遊攻略
          </Link>
          <span className="text-[#ddd]">·</span>
          <Link
            href="/cooperation/"
            className="hover:text-[#1E4AD1] transition-colors"
          >
            合作夥伴
          </Link>
        </div>
      </div>
    </section>
  );
}
