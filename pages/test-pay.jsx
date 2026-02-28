"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

export default function Home() {
  const heroWrapRef = useRef(null);

  // 量測 hero 區塊滾動進度
  const { scrollYProgress } = useScroll({
    target: heroWrapRef,
    offset: ["start start", "end start"],
  });

  // 背景淡出 + 縮放
  const bgScale = useTransform(
    scrollYProgress,
    [0, 0.18, 0.35],
    [1, 1.12, 1.25]
  );
  const bgOpacity = useTransform(scrollYProgress, [0, 0.12, 0.35], [1, 1, 0]);

  // 白卡放大為全畫面
  const cardScale = useTransform(
    scrollYProgress,
    [0, 0.12, 0.32],
    [1, 1.8, 14]
  );
  const cardRadius = useTransform(
    scrollYProgress,
    [0, 0.18, 0.32],
    ["24px", "16px", "0px"]
  );
  const cardOpacity = useTransform(scrollYProgress, [0, 1], [1, 1]);

  // ✅ 內層內容反向縮放，讓視覺大小維持不變
  const innerScale = useTransform(cardScale, (s) => 1 / s);

  return (
    <>
      {/* hero 外層：稍滑就讓背景消散 */}
      <section ref={heroWrapRef} className="relative h-[160vh]">
        {/* 背景與文案（會淡出） */}
        <motion.section
          style={{ scale: bgScale, opacity: bgOpacity }}
          className="sticky top-0 z-30 w-full h-screen overflow-hidden"
        >
          {/* 背景圖 */}
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{
              backgroundImage:
                "url('https://assets.revolut.com/published-assets-v3/cc36007f-22dc-4ad1-8c2a-9858b2545d6d/044b1387-8743-49e2-8be7-2fe9d5f91ef3.png')",
            }}
          />

          {/* Hero 文案 */}
          <div className="absolute left-[14%] top-[20%] z-10">
            <h1 className="text-[72px] md:text-[120px] text-white leading-none font-extrabold">
              CHANGE THE WAY
            </h1>
            <h1 className="text-[72px] md:text-[120px] text-white leading-none font-extrabold">
              YOU MONEY
            </h1>
            <p className="text-white mt-3 ml-1 md:ml-4 text-base md:text-lg max-w-[450px]">
              Home or away, local or global — move freely between countries and
              currencies. Sign up for a Standard account with no monthly fees.
            </p>
            <button className="bg-black mt-6 md:mt-8 ml-1 md:ml-4 text-white rounded-full px-4 py-2">
              Download the app
            </button>
          </div>
        </motion.section>

        {/* ✅ 白卡：外層放大、內層反向縮放，內容維持原尺寸 */}
        <motion.div
          style={{
            scale: cardScale,
            borderRadius: cardRadius,
            opacity: cardOpacity,
          }}
          className="
            absolute left-[40%] top-[24%]
            -translate-x-1/2 -translate-y-1/2
            z-[50]
            w-[320px] md:w-[400px] h-[480px] md:h-[550px]
            bg-white overflow-hidden shadow-2xl
          "
        >
          {/* 內層內容容器：反向縮放抵銷外層縮放 */}
          <motion.div
            style={{
              scale: innerScale,
            }}
            className="w-full   h-full  border-red-400 border"
          >
            {/* 這裡仍然維持卡片原本大小的版面 */}
            <section className="relative w-[900px] mx-auto border h-full bg-white">
              <div className="flex flex-col justify-center items-center h-full w-full px-6">
                <div className="w-full max-w-[1200px] mx-auto text-center">
                  <h2 className="text-[28px] md:text-[40px] font-extrabold">
                    Your salary, reimagined
                  </h2>
                  <p className="text-sm md:text-base mt-3 max-w-[560px] mx-auto text-neutral-700">
                    Spend smartly, send quickly, organize your salary
                    automatically, and watch your savings grow — all with
                    Revolut.
                  </p>
                  <button className="bg-black mt-6 text-white rounded-full px-4 py-2">
                    Download the app
                  </button>
                </div>

                <div className="mt-8 md:mt-10 mx-auto flex flex-wrap justify-center">
                  <div className="mx-2 mt-4 bg-black/90 border border-gray-200 rounded-xl w-[200px] h-[280px] md:w-[260px] md:h-[360px]" />
                  <div className="mx-2 mt-4 relative overflow-hidden border border-gray-200 rounded-xl w-[200px] h-[280px] md:w-[260px] md:h-[360px]">
                    <Image
                      src="https://assets.revolut.com/published-assets-v3/cc36007f-22dc-4ad1-8c2a-9858b2545d6d/044b1387-8743-49e2-8be7-2fe9d5f91ef3.png"
                      alt="hero"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="mx-2 mt-4 bg-black/90 border border-gray-200 rounded-xl w-[200px] h-[280px] md:w-[260px] md:h-[360px]" />
                </div>
              </div>
            </section>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
