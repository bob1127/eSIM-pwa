"use client";

import Link from "next/link";
import SafeImage from "./SafeImage";
import MobileCardCarousel from "./MobileCardCarousel";

const NATIVE_IP_TAG = "/images/原生ip-tag.png";
const NATIVE_IP_SLIDES = new Set([
  "/images/九州01.png",
  "/images/韓國01.png",
  "/images/泰國原生eSIM.png",
]);

const JAPAN_HREF = "/product/japan";
const KYUSHU_HREF =
  "/product/japan/japan-unlimited-esim?telecom=au-kddi&days=5";
const KOREA_HREF =
  "/product/korea/korea-unlimited-esim?telecom=sk-native&days=5";
const THAILAND_HREF =
  "/product/thailand/thailand-unlimited-esim?telecom=truemove&days=8";
const CHINA_HREF = "/product/china/china-unlimited-esim?telecom=cmcc-70&days=5";
const MEMBER_PROMO_HREF = "/promo";

const RECOMMEND_SLIDES = [
  { src: "/images/日本eSIM.png", href: JAPAN_HREF, alt: "日本 eSIM 方案" },
  { src: "/images/九州01.png", href: KYUSHU_HREF, alt: "九州不限速 eSIM 方案" },
  { src: "/images/中國.png", href: CHINA_HREF, alt: "中國 eSIM 方案" },
  {
    src: "/images/加入會員_加入line官方_優惠-Jeko eSIM_多國旅遊eSIM.png",
    href: MEMBER_PROMO_HREF,
    alt: "加入會員與 LINE 官方帳號優惠",
  },
  { src: "/images/韓國01.png", href: KOREA_HREF, alt: "韓國原生 eSIM 方案" },
  { src: "/images/泰國原生eSIM.png", href: THAILAND_HREF, alt: "泰國原生 eSIM 方案" },
  { src: "/images/日本eSIM.png", href: JAPAN_HREF, alt: "日本 eSIM 方案" },
  { src: "/images/九州01.png", href: KYUSHU_HREF, alt: "九州不限速 eSIM 方案" },
  { src: "/images/中國.png", href: CHINA_HREF, alt: "中國 eSIM 方案" },
  { src: "/images/韓國01.png", href: KOREA_HREF, alt: "韓國原生 eSIM 方案" },
  { src: "/images/泰國原生eSIM.png", href: THAILAND_HREF, alt: "泰國原生 eSIM 方案" },
];

function RecommendSlide({ src, href, alt, index, sizes }) {
  const showNativeIpTag = NATIVE_IP_SLIDES.has(src);

  const inner = (
    <div className="relative w-full pt-6 sm:pt-8">
      <div className="relative w-full aspect-[16/9] sm:aspect-[16/8] overflow-hidden rounded-[15px] bg-black">
        <SafeImage
          src={src}
          alt={alt}
          fill
          className="object-cover object-center"
          sizes={sizes}
          priority={index < 2}
        />
      </div>
      {showNativeIpTag && (
        <SafeImage
          src={NATIVE_IP_TAG}
          alt="原生IP推薦"
          width={160}
          height={80}
          className="pointer-events-none absolute top-0 right-2 sm:right-3 w-[88px] sm:w-[110px] h-auto drop-shadow-md z-10"
        />
      )}
    </div>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="block w-full group">
      {inner}
    </Link>
  );
}

export default function JekoRecommendSection() {
  const renderSlides = () =>
    RECOMMEND_SLIDES.map((slide, index) => (
      <RecommendSlide
        key={`recommend-${index}`}
        src={slide.src}
        href={slide.href}
        alt={slide.alt}
        index={index}
        sizes="(max-width: 768px) 88vw, 50vw"
      />
    ));

  return (
    <section
      id="jeko-recommend"
      className="w-full bg-[#f0f1f3] pt-12 lg:pt-14 pb-4 scroll-mt-28"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4 lg:mb-6">
          <h2 className="text-2xl sm:text-[28px] font-black text-gray-900 tracking-tight">
            Jeko 推薦專區
          </h2>
          <p className="text-sm text-gray-600 font-medium">
            精選 eSIM 方案・旅遊優惠・出國必備
          </p>
        </div>

        {/* 手機版：與租車包車區相同，單張 88% 露出下一張 */}
        <div className="md:hidden -mx-4">
          <MobileCardCarousel
            align="center"
            slideClassName="min-w-0 flex-[0_0_76%]"
            label="Jeko 推薦專區輪播"
          >
            {renderSlides()}
          </MobileCardCarousel>
        </div>

        {/* 桌面版：可視區兩張，每次滑動兩張 */}
        <div className="hidden md:block">
          <MobileCardCarousel
            slideClassName="min-w-0 flex-[0_0_50%]"
            slidesToScroll={2}
            autoplayDelay={5000}
            align="start"
            loop
            label="Jeko 推薦專區輪播"
          >
            {renderSlides()}
          </MobileCardCarousel>
        </div>
      </div>
    </section>
  );
}
