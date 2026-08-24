"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import CarRentalCharterSection from "./CarRentalCharterSection";
import AccommodationRecommendSection from "./AccommodationRecommendSection";
import KKdayTicketSection from "./KKdayTicketSection";
import TransportTicketSection from "./TransportTicketSection";
import JekoRecommendSection from "./JekoRecommendSection";
import ServiceSection from "./ServiceSection";
import MobileCardCarousel from "./MobileCardCarousel";
import MaterialIcon from "@/components/MaterialIcon";
import { buildLoginUrl } from "@/lib/authRedirect";
import { buildInstallHintText } from "@/lib/deviceDetect";
import { usePWAInstall } from "./usePWAInstall";
import AppInstallGuideModal from "./AppInstallGuideModal";
import HeroCountryPlanPicker from "./HeroCountryPlanPicker";
import GeneralPushToggle from "./GeneralPushToggle";
import { QuarterRing } from "@/components/ui/QuarterRing";

const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";

/* 與原本 Slider.jsx 相同的主頁輪播圖 */
const HERO_SLIDES = [
  {
    image: "/images/Hero-banner-01.png",
    imageMobile: "/images/hero-banner-mobile.png",
  },
  { image: "/images/九州.png" },
  { image: "/images/location/fcc7e825-9136-4c9d-8312-3309fe189b4c.png" },
  { image: "/images/location/korea-02.png" },
  { image: "/images/location/thailand-01.png" },
];

/* 首頁上方快捷：public/images/icon/ */
const QUICK_ICONS = [
  {
    label: "加入官方 LINE",
    href: LINE_OA_URL,
    external: true,
    src: "/images/icon/01.png",
  },
  {
    label: "開啟 APP 流量提醒",
    href: "/data-query?setup=traffic#push-notification-section",
    src: "/images/icon/02.png",
  },
  {
    label: "訂單查詢",
    href: "/account",
    src: "/images/icon/03.png",
  },
  {
    label: "租車包車",
    href: "#car-rental-charter",
    src: "/images/icon/04.png",
  },
  {
    label: "住宿",
    href: "#accommodation-section",
    src: "/images/icon/05.png",
  },
];

const PROMO_BANNERS = [
  { src: "/images/優惠折扣.png", alt: "優惠折扣活動", href: "/promo" },
  { src: "/images/出國必備.png", alt: "出國必備清單", href: "/product" },
  {
    src: "/images/立即租車.png",
    alt: "立即租車包車",
    href: "#car-rental-charter",
  },
];

function MobileHeroCardAction({ children, onClick, href, icon, loading }) {
  const cls =
    "group flex flex-1 min-w-0 items-center gap-2.5 bg-white text-[#1d5cc5] rounded-lg px-3 py-3 transition-colors shadow-sm text-left active:opacity-90";

  const inner = (
    <>
      <MaterialIcon name={icon} size={20} className="shrink-0 text-[#1d5cc5]" />
      <span className="flex-1 min-w-0 text-[13px] font-bold leading-tight text-black inline-flex items-center gap-2">
        {loading ? (
          <>
            <QuarterRing size="xs" />
            處理中…
          </>
        ) : (
          children
        )}
      </span>
      <MaterialIcon
        name="chevron_right"
        size={18}
        className="shrink-0 text-[#1d5cc5]"
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={loading} className={cls}>
      {inner}
    </button>
  );
}

/** 手機版滿版 Hero 輪播 */
function MobileHeroCarousel() {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <section className="relative w-full h-[56vh] min-h-[360px] max-h-[560px] overflow-hidden bg-black">
      {HERO_SLIDES.map((slide, idx) => (
        <div
          key={`hero-${idx}`}
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{
            opacity: active === idx ? 1 : 0,
            zIndex: active === idx ? 2 : 1,
            transitionDuration: "1.2s",
          }}
        >
          {slide.imageMobile ? (
            <picture>
              <source media="(max-width: 767px)" srcSet={slide.imageMobile} />
              <img
                src={slide.image}
                alt={`Jeko eSIM Banner ${idx + 1}`}
                className="w-full h-full object-cover object-[center_55%]"
              />
            </picture>
          ) : (
            <img
              src={slide.image}
              alt={`Jeko eSIM Banner ${idx + 1}`}
              className="w-full h-full object-cover object-[center_55%]"
            />
          )}
        </div>
      ))}

      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/20 via-black/15 to-black/60" />

      <div className="absolute left-0 right-0 top-[28%] z-20 px-5">
        <h1 className="text-[40px] font-black leading-[1.08] tracking-tight text-white drop-shadow-lg italic">
          Jeko eSIM
        </h1>
        <p className="mt-2 text-[14px] text-white/95 font-medium drop-shadow-md">
          接口eSIM 成為您連接世界的接口
        </p>
        <Link
          href="/product"
          className="mt-4 inline-flex items-center gap-1.5 bg-white text-[#1d5cc5] rounded-full px-5 py-2 text-sm font-bold shadow-md active:scale-[0.98] transition-transform"
        >
          查看 eSIM 方案
          <MaterialIcon name="arrow_forward" size={16} />
        </Link>
      </div>

      <div className="absolute left-5 bottom-14 z-20 flex items-center gap-1.5">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={`dot-${idx}`}
            type="button"
            aria-label={`切換至第 ${idx + 1} 張`}
            onClick={() => setActive(idx)}
            className={`rounded-full transition-all duration-300 ${
              active === idx ? "w-2 h-2 bg-white" : "w-1.5 h-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

/** 圖二：APP 與推播 + 選擇國家方案（手機疊在 hero 下方） */
function MobileHeroDock() {
  const router = useRouter();
  const { isInstallable, installPWA, deviceType, isStandalone } =
    usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [installHint, setInstallHint] = useState(null);

  useEffect(() => {
    setInstallHint(buildInstallHintText({ isStandalone }));
  }, [isStandalone]);

  const needsAppleInstall =
    !isStandalone && (deviceType === "ios" || deviceType === "mac");

  const handleTrafficAlert = () => {
    if (needsAppleInstall) {
      setShowPrompt(true);
      return;
    }
    router.push("/data-query?setup=traffic#push-notification-section");
  };

  const handleInstallApp = async () => {
    if (isStandalone) {
      alert("您已安裝 Jeko APP。");
      return;
    }
    if (isInstallable) {
      const outcome = await installPWA();
      if (outcome === "accepted" || outcome === "dismissed") return;
    }
    setShowPrompt(true);
  };

  return (
    <>
      <AppInstallGuideModal
        open={showPrompt}
        onClose={() => setShowPrompt(false)}
      />
      <div className="relative z-20 -mt-10 px-3 space-y-3">
        <div className="bg-[#3583d8] rounded-xl p-4 shadow-[0_8px_28px_rgba(29,92,197,0.35)]">
          <h3 className="text-white font-bold text-[15px] mb-3 tracking-wide">
            {isStandalone ? "推播與警示" : "APP 與推播"}
          </h3>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2">
              {isStandalone ? (
                <MobileHeroCardAction icon="speed" onClick={handleTrafficAlert}>
                  開啟流量警示
                </MobileHeroCardAction>
              ) : (
                <div className="flex gap-2">
                  <MobileHeroCardAction
                    icon="install_mobile"
                    onClick={handleInstallApp}
                  >
                    安裝 APP
                  </MobileHeroCardAction>
                  <MobileHeroCardAction
                    icon="person_add"
                    href={buildLoginUrl()}
                  >
                    加入會員
                  </MobileHeroCardAction>
                </div>
              )}
            </div>
            <GeneralPushToggle theme="dark" className="w-full" />
          </div>
          {isStandalone ? (
            <p className="mt-3 text-[11px] text-white/80 leading-relaxed">
              推播通知：優惠公告；流量警示請至查詢頁或官方 LINE 綁定 eSIM。
            </p>
          ) : (
            installHint && (
              <p className="mt-3 text-[11px] text-white/80 leading-relaxed">
                {installHint}
              </p>
            )
          )}
        </div>

        <HeroCountryPlanPicker />
      </div>
    </>
  );
}

export default function MobileHomePage() {
  return (
    <div className="bg-[#f2f3f5] min-h-screen pb-4">
      {/* ═══ 1. 滿版 Hero 輪播 ═══ */}
      <MobileHeroCarousel />

      {/* ═══ 2. APP／推播 + 國家方案（圖二）═══ */}
      <MobileHeroDock />

      {/* ═══ 3. 快捷功能圖示（暫隱藏）═══ */}
      {false && (
      <div className="mx-3 mt-3 relative z-10 bg-white rounded-2xl border border-gray-200 px-2.5 pt-4 pb-3">
        <div className="grid grid-cols-5 gap-1.5">
          {QUICK_ICONS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              {...(item.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 aspect-square w-full px-1 py-1.5 active:opacity-70 transition-opacity"
            >
              <Image
                src={item.src}
                alt={item.label}
                width={72}
                height={72}
                className="object-contain w-[62%] h-auto"
              />
              <span className="text-[9px] font-bold text-[#1d5cc5] text-center leading-tight line-clamp-2">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
      )}

      {/* ═══ 4. 連線方案 ═══ */}
      <div className="mt-3">
        <ServiceSection />
      </div>

      {/* ═══ 5. 促銷輪播（原圖一 → 移至推薦專區位置）═══ */}
      <div className="mt-3">
        <MobileCardCarousel
          align="center"
          slideClassName="min-w-0 flex-[0_0_76%]"
          showArrows={false}
          autoplayDelay={4500}
        >
          {PROMO_BANNERS.map((b) => {
            const card = (
              <div className="relative w-full aspect-[2/1] overflow-hidden rounded-2xl shadow-sm bg-white">
                <Image
                  src={b.src}
                  alt={b.alt}
                  fill
                  className="object-cover"
                  sizes="76vw"
                />
              </div>
            );
            return b.href ? (
              <Link key={b.src} href={b.href} className="block">
                {card}
              </Link>
            ) : (
              <div key={b.src}>{card}</div>
            );
          })}
        </MobileCardCarousel>
      </div>

      {/* ═══ 6. 精選 eSIM 方案 ═══ */}
      <div className="mt-3">
        <div className="[&>section]:!bg-transparent [&>section]:!pt-0">
          <JekoRecommendSection />
        </div>
      </div>

      {/* ═══ 7. 租車包車 ═══ */}
      <div className="mt-3" id="car-rental-charter">
        <div className="[&>section]:!bg-transparent [&>section]:!pt-0 [&>section_.flex.flex-wrap.items-baseline]:!hidden">
          <CarRentalCharterSection />
        </div>
      </div>

      {/* ═══ 8. 住宿推薦 ═══ */}
      <div className="mt-3" id="accommodation-section">
        <AccommodationRecommendSection />
      </div>

      {/* ═══ 9. 景點門票 ═══ */}
      <div className="mt-3" id="kkday-section">
        <KKdayTicketSection />
      </div>

      {/* ═══ 10. 交通票券 ═══ */}
      <div className="mt-3" id="transport-section">
        <TransportTicketSection />
      </div>
    </div>
  );
}
