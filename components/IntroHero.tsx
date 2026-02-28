"use client";

import { useEffect, useRef, useState, RefObject } from "react";
import Link from "next/link"; // 1. 引入 Link
import {
  motion,
  useAnimation,
  useScroll,
  useSpring,
  useTransform,
  AnimatePresence,
  MotionValue,
} from "framer-motion";
import {
  Smartphone,
  Lock, // 修正：使用 Lock 而不是 LockOpen 以符合下方 CardItem 內的引用
  Wifi,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

// --- Parallax Hook ---
function useScrollParallax(ref: RefObject<HTMLElement>) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 15,
    mass: 0.3,
  });

  const y1 = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    ["120px", "0px", "-20px"],
  );
  const y2 = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    ["80px", "0px", "-20px"],
  );
  const y3 = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    ["40px", "0px", "-20px"],
  );

  return { y1, y2, y3 };
}

// --- Main Component ---
export default function IntroHero() {
  const logoControls = useAnimation();
  const phonesControls = useAnimation();
  const titleControls = useAnimation();
  const textControls = useAnimation();

  // Lightbox State
  const [activeImage, setActiveImage] = useState<{
    src: string;
    text: string;
  } | null>(null);

  // Parallax Refs
  const sectionA = useRef<HTMLElement>(null);
  const sectionB = useRef<HTMLElement>(null);
  const sectionC = useRef<HTMLElement>(null);

  const { y1: y1A, y2: y2A, y3: y3A } = useScrollParallax(sectionA);
  const { y1: y1B, y2: y2B, y3: y3B } = useScrollParallax(sectionB);
  const { y1: y1C, y2: y2C, y3: y3C } = useScrollParallax(sectionC);

  // Intro Animation Sequence
  useEffect(() => {
    async function sequence() {
      // 1. Logo appears
      await logoControls.start({
        scale: 1,
        y: 0,
        opacity: 1,
        transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
      });

      // 2. Logo moves up, Title & Phones appear
      await Promise.all([
        logoControls.start({
          scale: 0.5,
          y: "-100px", // 稍微調整高度避免與標題重疊
          transition: { duration: 1.1, ease: [0.33, 1, 0.68, 1] },
        }),
        phonesControls.start({
          opacity: 1,
          y: 0, // Reset y to 0
          scale: 1,
          transition: { duration: 1.3, ease: [0.33, 1, 0.68, 1] },
        }),
        titleControls.start({
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 1.3, ease: [0.33, 1, 0.68, 1] },
        }),
      ]);

      // 3. Bottom text appears
      textControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 1, ease: [0.33, 1, 0.68, 1], delay: 0.2 },
      });
    }
    sequence();
  }, [logoControls, phonesControls, titleControls, textControls]);

  // Render Helper for Parallax Steps
  const renderSteps = (
    y1: MotionValue<string>,
    y2: MotionValue<string>,
    y3: MotionValue<string>,
  ) => {
    const steps = [
      { src: "step01", y: y1, text: "Step 1：點擊設定裡的行動服務選項" },
      { src: "step02", y: y2, text: "Step 2：選擇加入 eSIM" },
      { src: "step03", y: y3, text: "Step 3：掃描 QR Code 完成設定" },
    ];
    return (
      <div className="flex gap-8 justify-center flex-wrap md:flex-nowrap">
        {steps.map((step, idx) => (
          <div key={idx} className="relative group">
            <motion.img
              src={`/images/step/${step.src}.png`}
              alt={`Phone ${idx + 1}`}
              className="w-[150px] md:w-[280px] cursor-pointer object-contain hover:scale-105 transition-transform duration-300"
              style={{ y: step.y }}
              onClick={() =>
                setActiveImage({
                  src: `/images/step/${step.src}.png`,
                  text: step.text,
                })
              }
            />
            <div className="hidden md:block absolute bottom-[-40px] left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
              {step.text}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* 1. Hero Animation Section */}
      <section className="relative bg-white min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
        {/* Logo & Title */}
        <motion.div
          className="z-10 flex flex-col justify-center items-center font-extrabold mb-8 relative"
          initial={{ scale: 2.2, y: 0, opacity: 0 }}
          animate={logoControls}
        >
          <div className="logo bg-[#1757ff] text-white rounded-[20px] flex justify-center items-center w-[120px] h-[120px] md:w-[180px] md:h-[180px] shadow-xl text-2xl md:text-4xl">
            ESIM
          </div>

          <motion.div
            className="absolute top-full mt-8 text-center w-[700px]"
            initial={{ opacity: 0 }}
            animate={titleControls}
          >
            <h1 className="text-stone-800 tracking-widest text-3xl md:text-6xl font-bold leading-loose mb-2">
              如何在iOS裝置上安裝並啟用eSIM？
            </h1>
            <span className="text-xl md:text-[26px] text-gray-500">
              [ Android ]{" "}
            </span>
          </motion.div>
        </motion.div>

        {/* Floating Phones Animation */}
        <motion.div
          className="relative flex gap-4 z-0 mt-32 md:mt-40"
          initial={{ opacity: 0, y: 200, scale: 1.1 }}
          animate={phonesControls}
        >
          {["step01", "step02", "step03"].map((img, i) => (
            <div className="group relative" key={i}>
              <img
                src={`/images/step/${img}.png`}
                alt={`Phone ${i + 1}`}
                className="w-[100px] md:w-[220px] object-contain drop-shadow-2xl"
              />
              <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 bg-white text-black text-sm rounded-full px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm border border-gray-100">
                Step {i + 1}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Hero Bottom Text */}
        <motion.div
          className="mt-12 text-center pb-20"
          initial={{ opacity: 0, y: 40 }}
          animate={textControls}
        >
          <h2 className="text-2xl font-bold">選擇您的旅遊地區</h2>
          <p className="text-neutral-600 mt-2">Powered by Motion + Tailwind</p>
        </motion.div>
      </section>

      {/* 2. Preparation Check Section (Cards) */}
      <section className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="flex items-start gap-4 mb-12">
            <div className="w-12 h-12 rounded-full bg-[#06C755] flex items-center justify-center shrink-0 text-white font-bold text-2xl shadow-sm">
              1
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 mb-1 tracking-wide">
                開始使用 eSIM 前的檢查
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                準備工作確認
              </h2>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1: 設備相容性 (加上連結 - 檢查設備) */}
            <Link
              href="/blog/如何檢查您的iphone-ipad-ios手機設備是否支援esim？/"
              className="  block h-full" // 確保跨兩欄並填滿高度
            >
              <CardItem
                step="1"
                title="確認 eSIM 的設備相容性"
                illustration={
                  <div className="relative flex items-center justify-center w-full h-full">
                    <Smartphone
                      className="w-24 h-24 text-gray-700"
                      strokeWidth={1.5}
                    />
                    <div className="absolute -right-2 top-4 bg-white shadow-md rounded-lg px-3 py-1 flex items-center gap-2 border border-gray-100">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-gray-600">
                        eSIM Supported
                      </span>
                    </div>
                  </div>
                }
              >
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    <strong className="text-gray-800">iPhone XS、XR</strong>{" "}
                    或更新版本通常支援。部分 iPhone 13 支援雙 eSIM。
                  </p>
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 leading-tight">
                      中國大陸機型<span className="font-bold">不支援</span>
                      ，港澳部分機型支援。
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#06C755] font-bold hover:underline text-xs mt-2 transition-colors">
                    查看 Apple 支援頁面清單 <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </CardItem>
            </Link>

            {/* Card 2: 電信解鎖 (加上連結 - 安裝與啟用) */}
            <Link
              href="/blog/如何在ios裝置上安裝並啟用esim？/"
              className="block h-full"
            >
              <CardItem
                step="2"
                title="您的 iPhone 電信業者已解鎖"
                illustration={
                  <div className="relative flex items-center justify-center w-full h-full">
                    <div className="relative">
                      <Smartphone
                        className="w-24 h-24 text-gray-400 opacity-50"
                        strokeWidth={1}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                          <Lock className="w-8 h-8 text-[#06C755]" />
                          <div className="text-[10px] text-center font-bold text-gray-500 mt-1">
                            UNLOCKED
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              >
                <p className="text-sm text-gray-600 leading-relaxed">
                  請確認您的手機是{" "}
                  <span className="font-bold text-gray-800">Sim-Lock Free</span>
                  （無鎖版）。如果是與電信商綁約購機，請聯繫客服確認解鎖狀態。
                </p>
              </CardItem>
            </Link>

            {/* Card 3: 網路連線 (無連結) */}
            <CardItem
              step="3"
              title="確保網路連線穩定"
              illustration={
                <div className="relative flex items-center justify-center w-full h-full gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
                      <Wifi className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                    <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                    <Smartphone className="w-12 h-12 text-gray-700" />
                  </div>
                </div>
              }
            >
              <p className="text-sm text-gray-600 leading-relaxed">
                掃描 QR Code 安裝 eSIM 時，手機必須連接{" "}
                <span className="font-bold text-gray-800">
                  Wi-Fi 或行動數據
                </span>{" "}
                才能完成驗證下載。
              </p>
            </CardItem>
          </div>
        </div>
      </section>

      {/* 3. Parallax Steps Sections */}
      <section
        ref={sectionA}
        className="bg-white mt-[80px] pt-[60px] pb-[160px] flex flex-col items-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center leading-tight">
          eSIM Tutorial <br />{" "}
          <span className="text-lg md:text-2xl text-gray-500 font-normal">
            出國當日可於有網路的狀態下完成 1~7 步驟
          </span>
        </h2>
        {renderSteps(y1A, y2A, y3A)}
      </section>

      <section
        ref={sectionB}
        className="bg-gray-50 mt-[80px] pt-[60px] pb-[160px] flex flex-col items-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center leading-tight">
          啟用 eSIM <br />{" "}
          <span className="text-lg md:text-2xl text-gray-500 font-normal">
            eSIM 安裝及設定
          </span>
        </h2>
        {renderSteps(y1B, y2B, y3B)}
      </section>

      <section
        ref={sectionC}
        className="bg-white mt-[80px] pt-[60px] pb-[160px] flex flex-col items-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center leading-tight">
          切換 eSIM <br />{" "}
          <span className="text-lg md:text-2xl text-gray-500 font-normal">
            抵達目的地後再進行 ⑧~10 步驟
          </span>
        </h2>
        {renderSteps(y1C, y2C, y3C)}
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeImage && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImage(null)}
          >
            <div
              className="relative text-center w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 inline-block bg-white text-black text-sm px-4 py-2 rounded shadow font-bold">
                {activeImage.text}
              </div>
              <img
                src={activeImage.src}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain mx-auto rounded-lg"
              />
              <button
                className="absolute top-0 right-0 md:-right-10 md:-top-10 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                onClick={() => setActiveImage(null)}
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Card Component ---
const CardItem = ({
  step,
  title,
  illustration,
  children,
}: {
  step: string;
  title: string;
  illustration: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Number(step) * 0.1 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
    >
      {/* 標題區 */}
      <div className="px-6 pt-6 pb-2 flex items-start gap-3">
        <span className="bg-[#06C755] text-white text-sm font-bold w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5">
          {step}
        </span>
        <h3 className="font-bold text-lg text-gray-900 leading-tight">
          {title}
        </h3>
      </div>

      {/* 圖解區 */}
      <div className="mx-6 mt-4 h-40 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
        {illustration}
      </div>

      {/* 內文區 */}
      <div className="p-6 pt-4 flex-grow">{children}</div>
    </motion.div>
  );
};
