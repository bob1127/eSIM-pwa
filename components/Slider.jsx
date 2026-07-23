"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import { useUser } from "@/components/context/UserContext";
import { detectPushSupport } from "@/lib/pushSupport";
import { buildLoginUrl } from "@/lib/authRedirect";
import { buildInstallHintText, isChromiumBrowser } from "@/lib/deviceDetect";
import { usePWAInstall } from "./usePWAInstall";
import HeroCountryPlanPicker from "./HeroCountryPlanPicker";

const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";

function FadeUp({
  children,
  className = "",
  delay = 0,
  distance = 96,
  amount = 0.3,
}) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance, filter: "blur(6px)" }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { ease: [0.16, 1, 0.3, 1], duration: 1.05, delay },
      }}
      viewport={{ once: true, amount, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </motion.div>
  );
}

function HeroCardAction({
  children,
  onClick,
  href,
  external,
  icon,
  loading,
  className = "",
}) {
  const cls = `group flex flex-1 min-w-0 items-center gap-2.5 bg-white text-[#1d5cc5] hover:bg-white/95 disabled:opacity-60 rounded-lg px-3.5 py-3.5 transition-colors shadow-sm text-left ${className}`;

  const inner = (
    <>
      <MaterialIcon name={icon} size={22} className="shrink-0 text-[#1d5cc5]" />
      <span className="flex-1 min-w-0 text-sm font-bold leading-tight">
        {loading ? "處理中…" : children}
      </span>
      <MaterialIcon
        name="chevron_right"
        size={20}
        className="shrink-0 text-[#1d5cc5] group-hover:translate-x-0.5 transition-transform"
      />
    </>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
        >
          {inner}
        </a>
      );
    }
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

function HeroQuickTile({ label, icon, href, external, onClick }) {
  const cls =
    "group flex flex-col items-center justify-center gap-2 bg-white rounded-xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_20px_rgba(29,92,197,0.12)] hover:border-[#1d5cc5]/25 transition-all duration-200 p-3 sm:p-4 aspect-square w-full";

  const inner = (
    <>
      <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#eef4ff] flex items-center justify-center group-hover:bg-[#dbeafe] transition-colors">
        <MaterialIcon name={icon} size={24} className="text-[#1d5cc5]" />
      </span>
      <span className="text-[10px] sm:text-[11px] font-bold text-[#1d5cc5] text-center leading-snug line-clamp-2">
        {label}
      </span>
    </>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

const HEADLINE_FROM_INDEX = 2;

const slides = [
  {
    image: "/images/Hero-banner-01.png",
    imageMobile: "/images/hero-banner-mobile.png",
  },
  { image: "/images/九州.png" },

  { image: "/images/location/fcc7e825-9136-4c9d-8312-3309fe189b4c.png" },
  { image: "/images/location/korea-02.png" },
  { image: "/images/location/thailand-01.png" },
];

function HeroSlideImage({ slide }) {
  if (slide.imageMobile) {
    return (
      <picture>
        <source media="(max-width: 767px)" srcSet={slide.imageMobile} />
        <img src={slide.image} alt="Hero Banner" />
      </picture>
    );
  }
  return <img src={slide.image} alt="Hero Banner" />;
}

export default function Slider() {
  const router = useRouter();
  const { token } = useUser();
  const containerRef = useRef(null);
  const imagesRef = useRef([]);
  const titleRef = useRef(null);
  const indicatorsRef = useRef([]);
  const timerRef = useRef(null);

  const {
    isInstallable,
    installPWA,
    deviceType,
    isStandalone,
    subscribeToPush,
  } = usePWAInstall();

  const [showPrompt, setShowPrompt] = useState(false);
  const [promptMode, setPromptMode] = useState("push");
  const [pushLoading, setPushLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [installHint, setInstallHint] = useState(null);

  useEffect(() => {
    setInstallHint(buildInstallHintText({ isStandalone }));
  }, [isStandalone]);

  const installHintText = useMemo(
    () => installHint ?? buildInstallHintText({ isStandalone }),
    [installHint, isStandalone],
  );

  const needsAppleInstall =
    !isStandalone && (deviceType === "ios" || deviceType === "mac");

  const openInstallGuide = (mode) => {
    setPromptMode(mode);
    setShowPrompt(true);
  };

  const handleOpenPush = async () => {
    if (needsAppleInstall) {
      openInstallGuide("push");
      return;
    }

    const support = await detectPushSupport();
    if (!support.supported) {
      alert(support.hint || support.title || "此裝置不支援推播通知");
      return;
    }

    setPushLoading(true);
    try {
      await subscribeToPush({ token });
    } catch {
      /* alert handled in hook */
    } finally {
      setPushLoading(false);
    }
  };

  const handleTrafficAlert = () => {
    if (needsAppleInstall) {
      openInstallGuide("traffic");
      return;
    }
    router.push("/data-query?setup=traffic#push-notification-section");
  };

  const handleInstallApp = () => {
    if (isInstallable) {
      alert(
        "Chrome 網址列右側應已出現「安裝」圖示（電腦＋箭頭），請點它安裝。\n\n若沒看到，請點右上角 ⋮ →「安裝 Jeko eSIM…」",
      );
      return;
    }
    if (needsAppleInstall) {
      openInstallGuide("push");
      return;
    }
    if (isChromiumBrowser()) {
      alert(
        "Chrome 安裝圖示尚未出現，請試試：\n\n1. 回到首頁 jeko-esim.com.tw 停留 30 秒\n2. 點一下頁面任意位置\n3. 重新整理（Cmd+Shift+R）\n4. 右上角 ⋮ 選單找「安裝 Jeko eSIM…」\n5. chrome://settings/content/all → 搜 jeko → 清除資料後重試\n\n※ 不要用無痕視窗",
      );
      return;
    }
    alert("請先安裝 Jeko APP，再開啟推播或流量提醒。");
  };

  const scrollToSection = (hash) => {
    const el = document.getElementById(hash.replace("#", ""));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useGSAP(
    () => {
      let currentIndex = 0;
      let isAnimating = false;

      const slideDuration = 4;
      const transitionDuration = 1.5;

      function animateSlide(nextIndex) {
        if (isAnimating || nextIndex === currentIndex) return;
        isAnimating = true;

        const currentImg = imagesRef.current[currentIndex];
        const nextImg = imagesRef.current[nextIndex];

        const tl = gsap.timeline({
          onComplete: () => {
            isAnimating = false;
            currentIndex = nextIndex;
            setActiveSlide(nextIndex);
            startAutoplay();
          },
        });

        gsap.set(nextImg, { zIndex: 2 });
        gsap.set(currentImg, { zIndex: 1 });

        tl.to(
          currentImg,
          { opacity: 0, duration: transitionDuration, ease: "power2.inOut" },
          0,
        );

        gsap.set(nextImg, { scale: 1, opacity: 0 });
        tl.to(
          nextImg,
          { opacity: 1, duration: transitionDuration, ease: "power2.inOut" },
          0,
        );

        if (titleRef.current) {
          const showCurrent = currentIndex >= HEADLINE_FROM_INDEX;
          const showNext = nextIndex >= HEADLINE_FROM_INDEX;

          if (showCurrent && !showNext) {
            tl.to(
              titleRef.current,
              {
                autoAlpha: 0,
                duration: transitionDuration,
                ease: "power2.inOut",
              },
              0,
            );
          } else if (!showCurrent && showNext) {
            gsap.set(titleRef.current, { autoAlpha: 0 });
            tl.to(
              titleRef.current,
              {
                autoAlpha: 1,
                duration: transitionDuration,
                ease: "power2.inOut",
              },
              0,
            );
          }
        }

        indicatorsRef.current.forEach((ind, i) => {
          const ring = ind.querySelector(".ring");
          if (i === nextIndex) {
            gsap.to(ind, { opacity: 1, duration: 0.3 }, 0);
            gsap.to(
              ring,
              { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" },
              0,
            );
          } else {
            gsap.to(ind, { opacity: 0.4, duration: 0.3 }, 0);
            gsap.to(ring, { scale: 0, opacity: 0, duration: 0.3 }, 0);
          }
        });
      }

      function startAutoplay() {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          animateSlide((currentIndex + 1) % slides.length);
        }, slideDuration * 1000);
      }

      gsap.set(imagesRef.current, { opacity: 0 });
      gsap.set(imagesRef.current[0], {
        opacity: 1,
        scale: 1,
        zIndex: 2,
      });

      indicatorsRef.current.forEach((ind, i) => {
        const ring = ind.querySelector(".ring");
        if (i === 0) {
          gsap.set(ind, { opacity: 1 });
          gsap.set(ring, { scale: 1, opacity: 1 });
        } else {
          gsap.set(ind, { opacity: 0.4 });
          gsap.set(ring, { scale: 0, opacity: 0 });
        }
      });

      if (titleRef.current) {
        gsap.set(titleRef.current, {
          autoAlpha: HEADLINE_FROM_INDEX === 0 ? 1 : 0,
        });
      }

      startAutoplay();

      return () => {
        clearTimeout(timerRef.current);
      };
    },
    { scope: containerRef },
  );

  const promptTitle =
    promptMode === "traffic"
      ? "安裝 APP 以開啟流量提醒"
      : "安裝 APP 以開啟推播";
  const promptDesc =
    promptMode === "traffic"
      ? "iPhone 需先將 Jeko 加入主畫面，才能綁定 eSIM 並接收低流量推播。"
      : "iPhone 需先將 Jeko 加入主畫面，才能接收推播通知。";

  return (
    <>
      <style>{`
        .hero-wrap { position: relative; width: 100%; z-index: 30; isolation: isolate; background: #fff; }
        .hero-container { position: relative; width: 100%; height: 95vh; height: 95svh; min-height: 480px; overflow: hidden; background-color: #000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #fff; z-index: 0; }
        .images-wrapper { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
        .slide-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; will-change: transform, opacity; z-index: 0; overflow: hidden; }
        .slide-image img { width: 100%; height: 100%; object-fit: cover; object-position: center 55%; display: block; }
        .slide-image picture { display: block; width: 100%; height: 100%; }
        .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.55) 100%); z-index: 10; pointer-events: none; }
        .hero-headline { position: absolute; top: 18%; left: 0; right: 0; z-index: 20; padding: 0 clamp(1.25rem, 4vw, 3rem); }
        .hero-headline-inner { max-width: 72rem; margin: 0 auto; }
        .title-group { width: 100%; text-align: left; }
        .hero-dock { position: relative; z-index: 60; isolation: isolate; }
        .hero-slide-dots { position: absolute; left: clamp(1.25rem, 4vw, 3rem); bottom: clamp(7rem, 14vw, 10rem); z-index: 20; display: flex; align-items: center; gap-2; }
        .top-right-badge { position: absolute; top: 2.5rem; right: 0; z-index: 20; background-color: #2b65f6; padding: 0.6rem 1.5rem; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; }
        @media (max-width: 768px) {
          .hero-container { height: 95vh; height: 95svh; min-height: 420px; }
          .hero-headline { top: 14%; }
          .hero-slide-dots { bottom: clamp(5rem, 12vw, 8rem); }
          .top-right-badge { top: 1.5rem; padding: 0.4rem 1rem; }
        }
      `}</style>

      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-end bg-black/80 pb-12 px-4"
            onClick={() => setShowPrompt(false)}
          >
            <motion.div
              initial={{ y: "100%", scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white text-black p-6 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative mb-4"
              onClick={(e) => e.stopPropagation()}
            >
              {deviceType === "ios" ? (
                <>
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-500">
                    <MaterialIcon name="install_mobile" size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{promptTitle}</h3>
                  <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    {promptDesc}
                    <br />
                    <br />
                    1. 點擊螢幕正下方的{" "}
                    <span className="font-bold text-blue-500">分享按鈕</span>
                    <br />
                    2. 選擇「
                    <span className="font-bold text-black bg-gray-100 px-2 py-1 rounded">
                      加入主畫面
                    </span>
                    」
                  </p>
                </>
              ) : (
                <div className="py-2">
                  <h3 className="text-xl font-bold mb-4">{promptTitle}</h3>
                  <p className="text-gray-600 mb-6 text-sm">
                    請點擊螢幕左上角的「
                    <span className="font-bold text-black">檔案</span>」選單
                    <br />
                    並選擇「
                    <span className="font-bold text-blue-500">
                      加入 Dock 中
                    </span>
                    」
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPrompt(false)}
                className="w-full bg-gray-100 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                我知道了
              </button>
            </motion.div>

            {deviceType === "ios" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: [0, 15, 0] }}
                transition={{
                  opacity: { duration: 0.3 },
                  y: { repeat: Infinity, duration: 1.2, ease: "easeInOut" },
                }}
                className="text-white flex flex-col items-center pointer-events-none"
              >
                <span className="text-sm font-bold tracking-widest mb-1 shadow-black drop-shadow-md">
                  點擊這裡
                </span>
                <MaterialIcon name="keyboard_arrow_down" size={40} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hero-wrap">
        <section className="hero-container" ref={containerRef}>
          <div className="images-wrapper">
            {slides.map((slide, idx) => (
              <div
                key={`img-${idx}`}
                className="slide-image"
                ref={(el) => {
                  imagesRef.current[idx] = el;
                }}
              >
                <HeroSlideImage slide={slide} />
              </div>
            ))}
          </div>
          <div className="overlay" />

          <div className="top-right-badge mt-[-40px] hidden lg:block">
            Global eSIM
          </div>

          <div className="hero-headline">
            <div
              ref={titleRef}
              className={`title-group hero-headline-inner relative ${
                activeSlide >= HEADLINE_FROM_INDEX
                  ? "min-h-[160px] md:min-h-[180px]"
                  : "min-h-0"
              }`}
            >
              <h1 className="text-[44px] md:text-[68px] lg:text-[94px] font-black leading-[1.08] tracking-tight drop-shadow-lg italic">
                Jeko eSIM
              </h1>
              <p className="mt-2 md:mt-3 text-[15px] md:text-lg text-white/95 font-medium drop-shadow-md">
                接口eSIM 成為您連接世界的接口
              </p>
              <Link
                href="/product"
                className="mt-5 md:mt-6 inline-flex items-center gap-2 bg-white text-[#1d5cc5] hover:bg-white/95 rounded-full px-6 py-2.5 text-sm font-bold shadow-md transition-colors"
              >
                查看 eSIM 方案
                <MaterialIcon name="arrow_forward" size={18} />
              </Link>
            </div>
          </div>

          <div className="hero-slide-dots" aria-hidden>
            {slides.map((_, idx) => (
              <span
                key={`dot-${idx}`}
                className={`block rounded-full transition-all duration-300 ${
                  activeSlide === idx
                    ? "w-2 h-2 bg-white"
                    : "w-1.5 h-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>

          <div className="side-indicators hidden">
            {slides.map((_, idx) => (
              <div
                key={`ind-${idx}`}
                className="indicator-item"
                ref={(el) => {
                  indicatorsRef.current[idx] = el;
                }}
              >
                <div className="dot" />
                <div className="ring" />
              </div>
            ))}
          </div>
        </section>

        <FadeUp delay={0.06} distance={32} amount={0.12}>
          <div className="hero-dock">
            {/* 藍色功能卡：直接重疊 hero 底部（參考機場官網） */}
            <div className="relative z-[60] px-4 sm:px-6 lg:px-8 -mt-[clamp(88px,12vw,128px)]">
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="bg-[#3583d8] rounded-lg md:rounded-xl p-5 md:p-6 shadow-[0_8px_32px_rgba(29,92,197,0.35)]">
                  <h3 className="text-white font-bold text-base md:text-lg mb-4 tracking-wide">
                    {isStandalone ? "推播與警示" : "APP 與會員"}
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    {isStandalone ? (
                      <>
                        <HeroCardAction
                          icon="notifications_active"
                          onClick={handleOpenPush}
                          loading={pushLoading}
                        >
                          開啟推播
                        </HeroCardAction>
                        <HeroCardAction
                          icon="speed"
                          onClick={handleTrafficAlert}
                        >
                          開啟流量警示
                        </HeroCardAction>
                      </>
                    ) : (
                      <>
                        <HeroCardAction
                          icon="install_mobile"
                          onClick={handleInstallApp}
                        >
                          安裝 APP
                        </HeroCardAction>
                        <HeroCardAction
                          icon="person_add"
                          href={buildLoginUrl("/account")}
                        >
                          加入會員
                        </HeroCardAction>
                      </>
                    )}
                  </div>
                  {isStandalone ? (
                    <p className="mt-3 text-[11px] text-white/80 leading-relaxed">
                      已安裝 APP，可開啟推播通知與 eSIM 低流量警示。
                    </p>
                  ) : (
                    installHintText && (
                      <p className="mt-3 text-[11px] text-white/80 leading-relaxed">
                        {installHintText}
                      </p>
                    )
                  )}
                </div>

                <HeroCountryPlanPicker />
              </div>
            </div>

            {/* 白底快捷區 */}
            <div className="relative z-[55] bg-white pt-8 md:pt-10 pb-8 md:pb-10">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-3 md:gap-4">
                  <HeroQuickTile
                    label="加入官方 LINE"
                    icon="chat"
                    href={LINE_OA_URL}
                    external
                  />
                  <HeroQuickTile
                    label="開啟 APP 流量提醒"
                    icon="notifications_active"
                    onClick={handleTrafficAlert}
                  />
                  <HeroQuickTile
                    label="訂單查詢"
                    icon="receipt_long"
                    href="/account"
                  />
                  <HeroQuickTile
                    label="租車包車"
                    icon="directions_car"
                    onClick={() => scrollToSection("car-rental-charter")}
                  />
                  <HeroQuickTile
                    label="住宿"
                    icon="hotel"
                    onClick={() => scrollToSection("accommodation-recommend")}
                  />
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </>
  );
}
