"use client";

import Link from "next/link";
import Layout from "./Layout";
import MaterialIcon from "@/components/MaterialIcon";
import PromoBannerCarousel from "@/components/promo/PromoBannerCarousel";
import PromoLotteryMachine from "@/components/promo/PromoLotteryMachine";

const LINE_OA =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@391huuts";

const HIGHLIGHTS = [
  {
    icon: "card_giftcard",
    title: "新會員折 50",
    desc: "加入會員即可領取 50 元折價券（可自動套用）；結帳前請先加入官方 LINE 即可使用。",
  },
  {
    icon: "group_add",
    title: "推薦好友各折 50",
    desc: "好友註冊並完成首購後，你與好友各得 50 元折抵（好友端與新會員 50 合併，不重複疊加）。",
  },
  {
    icon: "casino",
    title: "優惠拉霸機",
    desc: "會員可參加拉霸抽獎，中獎折價券自動存入會員帳戶。",
  },
];

export default function PromoPage() {
  return (
    <Layout
      seo={{
        title: "最新優惠・限時特惠｜Jeko eSIM",
        description:
          "Jeko eSIM 最新優惠：新會員首單折 50、優惠拉霸抽獎，立即查看活動 Banner。",
      }}
    >
      <div
        className="min-h-screen pt-24 md:pt-28 pb-20 font-sans"
        style={{
          background:
            "linear-gradient(180deg, #F7F8FA 0%, #EEF1F6 45%, #F7F8FA 100%)",
        }}
      >
        <div className="max-w-[1500px] w-[94%] mx-auto">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 md:mb-8">
            <Link
              href="/"
              className="hover:text-[#3768C7] flex items-center gap-1"
            >
              <MaterialIcon name="home" size={14} />
              首頁
            </Link>
            <MaterialIcon name="chevron_right" size={14} />
            <span className="font-bold text-slate-700">最新優惠</span>
          </nav>

          <header className="mb-6 md:mb-8 text-center md:text-left">
            <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#3768C7] mb-2">
              Promotions
            </p>
            <h1 className="text-[26px] md:text-[34px] font-black text-slate-900 tracking-tight">
              最新優惠
            </h1>
            <p className="mt-2 text-sm text-slate-500 max-w-xl">
              左右滑動查看活動 Banner，點擊即可前往領取或選購。
            </p>
          </header>
        </div>

        {/* 滿版 Banner：中間完整、左右各半張 */}
        <PromoBannerCarousel minSlides={4} className="mb-10 md:mb-14" />

        {/* 拉霸抽獎：滿版紅底 */}
        <PromoLotteryMachine className=" " />

        {/* 拉霸機下方 Banner */}
        <div className="w-full mb-10 bg-[#f11816] p-10 md:mb-14">
          <a
            href={LINE_OA}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
            aria-label="優惠活動 Banner"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/disccount/5572ea3a-0815-4e94-819d-24aee76826c0.png"
              alt="優惠活動 Banner"
              className="block max-w-[1200px] border-8 border-white mx-auto h-auto"
            />
          </a>
        </div>

        <div className="max-w-[1500px] w-[94%] mx-auto">
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EAF0FB] flex items-center justify-center mb-3">
                  <MaterialIcon
                    name={item.icon}
                    size={22}
                    style={{ color: "#3768C7" }}
                  />
                </div>
                <h2 className="font-bold text-slate-900 text-sm mb-1.5">
                  {item.title}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </section>

          <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
            <a
              href={LINE_OA}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-sm px-6 py-3"
            >
              <MaterialIcon name="chat" size={18} />
              加入官方 LINE 領優惠
            </a>
            <Link
              href="/product"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm px-6 py-3"
            >
              瀏覽 eSIM 方案
              <MaterialIcon name="arrow_forward" size={18} />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
