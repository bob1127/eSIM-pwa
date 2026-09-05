"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  motion,
  useAnimation,
  useScroll,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  Smartphone,
  Lock,
  Wifi,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Layout from "../pages/Layout";
import EsimGuideCarousel from "../components/EsimGuideCarousel";
import ScrollAppleShowcase from "../components/ScrollAppleShowcase";

// --- Parallax Hook ---
function useScrollParallax(ref) {
  const { scrollYProgress } = useScroll({
    target: ref,
    // 🌟 關鍵修改：提早觸發點
    // "start 90%" -> 當區塊頂部進入螢幕下方 90% 處就「開始」動畫
    // "center 40%" -> 當區塊中間到達螢幕上方 40% 處就「結束」動畫
    offset: ["start 90%", "center 40%"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 15,
    mass: 0.3,
  });

  // 進度 0% (剛出現) -> y: 120px (在下面)
  // 進度 50% (滾到中間) -> y: 0px (回到原位)
  // 進度 100% (快離開) -> y: -20px (往上推一點)
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
  const router = useRouter();

  // 管理切換狀態，達到「即點即切換」的絲滑感
  const [activeTab, setActiveTab] = useState("ios");

  // 初始化與監聽路由
  useEffect(() => {
    if (router.isReady) {
      setActiveTab(router.pathname.includes("android") ? "android" : "ios");
    }
  }, [router.pathname, router.isReady]);

  const tabs = [
    { id: "ios", label: "iOS", href: "/operation-ios" },
    { id: "android", label: "Android", href: "/operation-android" },
  ];

  const logoControls = useAnimation();
  const phonesControls = useAnimation();
  const titleControls = useAnimation();
  const textControls = useAnimation();

  // Lightbox State
  const [activeImage, setActiveImage] = useState(null);

  // Parallax Refs
  const sectionA = useRef(null);
  const sectionB = useRef(null);
  const sectionC = useRef(null);
  const sectionD = useRef(null);

  const { y1: y1A, y2: y2A, y3: y3A } = useScrollParallax(sectionA);
  const { y1: y1B, y2: y2B, y3: y3B } = useScrollParallax(sectionB);
  const { y1: y1C, y2: y2C, y3: y3C } = useScrollParallax(sectionC);
  const { y1: y1D } = useScrollParallax(sectionD);

  // Intro Animation Sequence
  useEffect(() => {
    async function sequence() {
      await logoControls.start({
        scale: 1,
        y: 0,
        opacity: 1,
        transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
      });

      await Promise.all([
        logoControls.start({
          scale: 0.5,
          y: "-100px",
          transition: { duration: 1.1, ease: [0.33, 1, 0.68, 1] },
        }),
        phonesControls.start({
          opacity: 1,
          y: 0,
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

      textControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 1, ease: [0.33, 1, 0.68, 1], delay: 0.2 },
      });
    }
    sequence();
  }, [logoControls, phonesControls, titleControls, textControls]);

  const renderSteps = (y1, y2, y3) => {
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
            <div className="hidden md:block absolute bottom-[-40px] left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-[#4592f0] rounded-2xl text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
              {step.text}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      {/* 🌟 修正版：浮動切換列 */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
        // pointer-events-none 放外層，防止隱形外框擋住底部其他元素
        className="fixed bottom-6 w-full flex justify-center z-[999999] px-4 pointer-events-none"
      >
        {/* pointer-events-auto 放內層，確保按鈕本身可以被點擊 */}
        <div className="flex items-center bg-white/90 backdrop-blur-md border border-gray-200/80 p-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center px-8 py-2.5 rounded-full text-[15px] font-bold transition-colors duration-300 ease-in-out w-[120px] md:w-[140px] z-10 ${
                  isActive
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50/50"
                }`}
              >
                {/* Framer Motion Layout 動畫色塊 */}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-[#3970fc] rounded-full -z-10 shadow-md"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}

                <div className="flex items-center gap-2 relative z-20">
                  {tab.label}
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      <EsimGuideCarousel />

      {/* 1. Hero Animation Section */}
      <section className="relative bg-white min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
        <motion.div
          className="z-10 flex flex-col justify-center items-center font-bold mb-8 relative"
          initial={{ scale: 2.2, y: 0, opacity: 0 }}
          animate={logoControls}
        >
          <div className="logo bg-[#1757ff] text-white rounded-[20px] flex justify-center items-center w-[120px] h-[120px] md:w-[180px] md:h-[180px] shadow-xl text-[24px]">
            ESIM
          </div>

          <motion.div
            className="absolute top-full mt-8 text-center w-[700px]"
            initial={{ opacity: 0 }}
            animate={titleControls}
          >
            <h1 className="text-stone-800 tracking-widest text-[28px] font-bold leading-loose mb-2">
              如何在iOS裝置上安裝並啟用eSIM？
            </h1>
            <span className="text-xl md:text-[26px] text-gray-500">
              [ IOS ]{" "}
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative flex gap-4 z-0  "
          initial={{ opacity: 0, y: 200, scale: 1.1 }}
          animate={phonesControls}
        >
          <div className=" ">
            <div className="w-full relative z-20 mt-10">
              <ScrollAppleShowcase />
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. Parallax Steps Sections */}
      <section
        ref={sectionB}
        className="bg-gray-50 mt-[170px] pt-[60px] pb-[160px] flex flex-col items-center"
      >
        <section
          ref={sectionA}
          className=" mt-[80px] pt-[30px] pb-[260px] flex flex-col items-center"
        >
          <h2 className="text-[28px] md:text-[24px] font-bold  text-center leading-tight">
            eSIM 安裝教學
          </h2>
          <h3 className="text-[24px] font-bold mt-3">
            安裝eSIM 方式 (建議事前先安裝)
          </h3>{" "}
          <span className="text-lg md:text-lg mt-8 text-stone-800 text-center  w-[80%] max-w-[550px] font-normal">
            建議在國內先安裝好eSIM，{" "}
            <b className="text-[#eb3737] font-bold text-xl">
              因為eSIM 安裝需要有穩定訊號
            </b>{" "}
            ，<br></br>
            避免在國外網路不好無法安裝{" "}
          </span>
        </section>

        <h2 className="text-[28px] md:text-[24px] font-bold mb-12 text-center leading-tight">
          第一種安裝方式 <br /> <br />
          長按eSIM QR碼
        </h2>

        <span className="  text-stone-800 max-w-[550px] text-center font-normal">
          此方法適用於
          <b className="text-[#eb3737] font-bold text-xl">
            iOS17.4及以上版本
          </b>
          。 Jeko將您訂單中的eSIM安裝和啟動資訊
          <b className="text-[#eb3737] font-bold text-xl">
            傳送至您的電子郵件地址
          </b>
          。長按郵件中的eSIM QRcode，在彈出的提示中點選「加入eSIM」選項。
        </span>
        <motion.img
          src="/images/operation-ios/長按eSIM-QR碼.png"
          className="max-w-[650px]"
          alt=""
          style={{ y: y1B }}
        />
      </section>
      <section
        ref={sectionB}
        className="bg-gray-50 mt-[170px] pt-[60px] pb-[160px] flex flex-col items-center"
      >
        <section
          ref={sectionA}
          className=" mt-[80px] pt-[30px] pb-[260px] flex flex-col items-center"
        >
          <h2 className="text-[28px] md:text-[24px] font-bold  text-center leading-tight">
            eSIM 安裝教學
          </h2>
          <h3 className="text-[24px] font-bold mt-3">
            安裝eSIM 的三種方式 (建議事前先安裝)
          </h3>{" "}
          <span className="text-lg md:text-lg mt-8 text-stone-800 text-center  w-[80%] max-w-[550px] font-normal">
            建議在國內先安裝好eSIM，因為eSIM 安裝需要有穩定訊號，<br></br>
            避免在國外網路不好無法安裝{" "}
          </span>
        </section>

        <h2 className="text-[28px] md:text-[24px] font-bold mb-12 text-center leading-tight">
          第一種安裝方式 <br />{" "}
          <span className="text-lg md:text-xl text-stone-800 font-normal">
            用iPhone相機掃描QR碼
          </span>
        </h2>
        <motion.img
          src="/images/operation-ios/用iPhone相機掃描QR碼.png"
          className="max-w-[650px]"
          alt=""
          style={{ y: y1B }}
        />
      </section>

      <section
        ref={sectionC}
        className="bg-white mt-[80px] pt-[60px] pb-[160px] flex flex-col items-center"
      >
        <h2 className="text-[28px] md:text-[24px] font-bold mb-12 text-center leading-tight">
          第一種安裝方式 <br />{" "}
          <span className="text-lg md:text-xl text-stone-800 font-normal">
            長按eSIM 直接安裝
          </span>
        </h2>
        <div className="w-[80%] max-w-[600px] mb-12 space-y-6 text-stone-700 text-base md:text-lg leading-relaxed">
          <div>
            <p className="font-bold mb-1">1. 開啟手機設定</p>
            <p>
              點選「設定」&gt;「行動服務」或「蜂窩數據」&gt;「加入行動方案」或「加入
              eSIM」&gt;「使用行動條碼」。
            </p>
          </div>
          <div>
            <p className="font-bold mb-1">2. 掃描 QR 碼</p>
            <p>使用手機的相機掃描透過電子郵件收到的 eSIM QR code。</p>
          </div>
        </div>
        <motion.img
          src="/images/operation-ios/掃描QR碼.png"
          className="max-w-[1250px]"
          alt="在手機設定頁面掃描QR碼"
          style={{ y: y1C }}
        />
      </section>
      <section
        ref={sectionC}
        className="bg-white mt-[80px] pt-[60px] pb-[160px] flex flex-col items-center"
      >
        <h2 className="text-[28px] md:text-[24px] font-bold mb-12 text-center leading-tight">
          第二種安裝方式 <br />{" "}
          <span className="text-lg md:text-xl text-stone-800 font-normal">
            在手機設定頁面掃描
          </span>
        </h2>
        <div className="w-[80%] max-w-[600px] mb-12 space-y-6 text-stone-700 text-base md:text-lg leading-relaxed">
          <div>
            <p className="font-bold mb-1">1. 開啟手機設定</p>
            <p>
              點選「設定」&gt;「行動服務」或「蜂窩數據」&gt;「加入行動方案」或「加入
              eSIM」&gt;「使用行動條碼」。
            </p>
          </div>
          <div>
            <p className="font-bold mb-1">2. 掃描 QR 碼</p>
            <p>使用手機的相機掃描透過電子郵件收到的 eSIM QR code。</p>
          </div>
        </div>
        <motion.img
          src="/images/operation-ios/掃描QR碼.png"
          className="max-w-[1250px]"
          alt="在手機設定頁面掃描QR碼"
          style={{ y: y1C }}
        />
      </section>

      <section
        ref={sectionD}
        className="bg-gray-50 mt-[80px] pt-[60px] pb-[160px] flex flex-col items-center"
      >
        <h2 className="text-[28px] md:text-[24px] font-bold mb-12 text-center leading-tight">
          第三種安裝方式 <br />{" "}
          <span className="text-lg md:text-xl text-stone-800 font-normal">
            從「照片」應用程式新增 eSIM
          </span>
        </h2>
        <div className="w-[80%] max-w-[600px] mb-12 space-y-6 text-stone-700 text-base md:text-lg leading-relaxed">
          <div>
            <p className="font-bold mb-1">1. 開啟手機設定</p>
            <p>
              點選「設定」&gt;「行動服務」或「蜂窩數據」&gt;「加入行動方案」或「加入
              eSIM」&gt;「使用行動條碼」&gt;「打開照片」。
            </p>
          </div>
          <div>
            <p className="font-bold mb-1">2. 選擇 eSIM 二維碼</p>
            <p>
              從您的圖庫中選擇 eSIM 二維碼的照片。您的 iPhone 將掃描二維碼並安裝
              eSIM。
            </p>
          </div>
        </div>
        <motion.img
          src="/images/operation-ios/從照片應用程式新增eSIM.png"
          className="max-w-[650px]"
          alt="從照片應用程式新增eSIM"
          style={{ y: y1D }}
        />
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
    </Layout>
  );
}

// --- Card Component ---
const CardItem = ({ step, title, illustration, children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Number(step) * 0.1 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
    >
      <div className="px-6 pt-6 pb-2 flex items-start gap-3">
        <span className="bg-[#067A38] text-white text-sm font-bold w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5">
          {step}
        </span>
        <h3 className="font-bold text-lg text-gray-900 leading-tight">
          {title}
        </h3>
      </div>
      <div className="mx-6 mt-4 h-40 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
        {illustration}
      </div>
      <div className="p-6 pt-4 flex-grow">{children}</div>
    </motion.div>
  );
};
