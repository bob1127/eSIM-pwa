import Link from "next/link";
import Layout from "./Layout";
import MaterialIcon from "@/components/MaterialIcon";
import PromoBannerCarousel from "@/components/promo/PromoBannerCarousel";
import PromoLotteryMachine from "@/components/promo/PromoLotteryMachine";
import PromoWelcomeRules from "@/components/promo/PromoWelcomeRules";

const LINE_OA =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@391huuts";

export default function PromoPage() {
  return (
    <Layout
      seo={{
        title: "最新優惠｜Jeko eSIM",
        description:
          "Jeko eSIM 最新優惠：新會員折 50、拉霸抽獎；加入官方 LINE 解鎖更多禮遇。",
      }}
    >
      <div
        className="min-h-screen pb-20 font-sans"
        style={{
          background:
            "linear-gradient(180deg, #F7F8FA 0%, #EEF1F6 45%, #F7F8FA 100%)",
        }}
      >
        <div className="content-wrap">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 md:mb-8 pt-6 md:pt-8">
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
        </div>

        {/* Banner：手機滿版；電腦左右露出相鄰一半 */}
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

        <div id="promo-panels" className="content-wrap">
          <PromoWelcomeRules />
        </div>
      </div>
    </Layout>
  );
}
