// components/RevolutLikeHero.jsx
"use client";

import { useRef, useState, useMemo } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";

const GAP_PX = 32; // 兩張卡片之間的 gap（px）
const SIDE_SCALE = 0.9; // 左右鄰卡縮放
const SIDE_SHIFT = 0.95; // 左右鄰卡橫向位移（相對自身寬度百分比）
const ROTATE_HOVER = 6; // 滑鼠 3D 轉動最大角度

export default function RevolutLikeHero() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"], // 進場到離開視窗頂
  });

  // 背景圖視差：往上滑，背景緩慢往上移、微縮放
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0.85]);

  // 內容淡入：hero 文案從底部輕微浮出
  const copyY = useTransform(scrollYProgress, [0, 0.3], [0, -24]);
  const copyOpacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.3],
    [1, 1, 0.9]
  );

  // 假資料（換成你的圖片）
  const slides = useMemo(
    () => [
      {
        title: "Your salary, reimagined",
        desc: "Spend smartly, send quickly, organise your salary automatically, and watch your savings grow — all in one place.",
        // 3840/2048/1080 像素都備好時，可用多 srcSet；這裡先用單張
        img: "https://images.pexels.com/photos/4968392/pexels-photo-4968392.jpeg",
      },
      {
        title: "Move money globally",
        desc: "Low-cost FX, fast international transfers, and multi-currency accounts.",
        img: "https://images.pexels.com/photos/730564/pexels-photo-730564.jpeg",
      },
      {
        title: "Instant virtual cards",
        desc: "Create, freeze and dispose cards in seconds with smart limits and controls.",
        img: "https://images.pexels.com/photos/4968392/pexels-photo-4968392.jpeg",
      },
    ],
    []
  );

  const [active, setActive] = useState(1); // 中間那張
  const [hover, setHover] = useState({ x: 0, y: 0 });

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width; // 0~1
    const ny = (e.clientY - rect.top) / rect.height; // 0~1
    setHover({ x: (nx - 0.5) * 2, y: (ny - 0.5) * 2 }); // -1 ~ 1
  };

  return (
    <section
      ref={heroRef}
      className="relative w-full min-h-[90vh] overflow-clip"
    >
      {/* 背景圖（全版） */}
      <motion.div
        style={{ y: bgY, scale: bgScale, opacity: bgOpacity }}
        className="absolute inset-0"
      >
        <Image
          src="https://images.pexels.com/photos/21014/pexels-photo.jpg"
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        {/* 左右白色柔和 overlay（仿 Revolut 兩側淡化） */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-y-0 left-0 w-[22%] bg-gradient-to-r from-white/70 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-[22%] bg-gradient-to-l from-white/70 to-transparent" />
        </div>
      </motion.div>

      {/* 前景內容 */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-24 pb-16">
        {/* Hero Copy */}
        <motion.div style={{ y: copyY, opacity: copyOpacity }}>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            Change the way you money
          </h1>
          <p className="mt-4 max-w-2xl text-black/70 text-base md:text-lg">
            Home or away, local or global — move freely between countries and
            currencies. Sign up for a Standard account with no monthly fees.
          </p>
          <button className="mt-6 rounded-full bg-black text-white px-5 py-3 text-sm md:text-base">
            Download the app
          </button>
        </motion.div>

        {/* Carousel 區（模擬 Revolut 卡片組） */}
        <div
          className="relative mt-10 md:mt-16"
          style={{ "--gap": `${GAP_PX}px` }}
        >
          <div className="relative h-[420px] md:h-[520px]">
            {/* 可點擊的左右透明 hit-area（滑鼠/點擊切換） */}
            <button
              aria-label="prev"
              className="absolute left-0 top-0 h-full w-[15%] z-20"
              onClick={() => setActive((p) => Math.max(0, p - 1))}
            />
            <button
              aria-label="next"
              className="absolute right-0 top-0 h-full w-[15%] z-20"
              onClick={() =>
                setActive((p) => Math.min(slides.length - 1, p + 1))
              }
            />

            {/* 卡片容器 */}
            <div className="absolute inset-0">
              {slides.map((s, i) => {
                // 位置計算：active=中心（scale=1、translateX=0），其他依距離偏移
                const offset = i - active;

                // 基礎 transform
                const translateX =
                  offset === 0
                    ? "0%"
                    : offset < 0
                    ? `calc(-${SIDE_SHIFT * 100}% - var(--gap))`
                    : `calc(${SIDE_SHIFT * 100}% + var(--gap))`;
                const scale = offset === 0 ? 1 : SIDE_SCALE;
                const z = offset === 0 ? 3 : 2;

                // 滑鼠 3D 旋轉（只對目前 active 有效，其他保持平）
                const rotX = offset === 0 ? -hover.y * ROTATE_HOVER : 0;
                const rotY = offset === 0 ? hover.x * ROTATE_HOVER : 0;

                return (
                  <AnimatePresence key={i} initial={false}>
                    <motion.div
                      className="absolute left-1/2 top-1/2 w-[82%] md:w-[72%] lg:w-[64%] aspect-[16/9] rounded-2xl overflow-hidden border border-black/10 shadow-2xl bg-white"
                      style={{
                        transformOrigin: "center",
                        translateX: "-50%",
                        translateY: "-50%",
                        willChange: "transform, opacity",
                        perspective: 1200,
                        zIndex: z,
                      }}
                      animate={{
                        x: translateX,
                        scale,
                        rotateX: rotX,
                        rotateY: rotY,
                        opacity: Math.abs(offset) > 1 ? 0 : 1,
                        filter:
                          offset === 0 ? "brightness(100%)" : "brightness(92%)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 240,
                        damping: 28,
                        mass: 0.7,
                      }}
                    >
                      <Image
                        src={s.img}
                        alt={s.title}
                        fill
                        sizes="(max-width: 768px) 82vw, (max-width: 1200px) 72vw, 64vw"
                        className="object-cover"
                        priority={i === active} // 中央優先載入
                      />
                      {/* 漸層壓黑 + 文案（貼近 Revolut 卡片感） */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 text-white">
                        <h3 className="text-lg md:text-2xl font-semibold">
                          {s.title}
                        </h3>
                        <p className="text-white/90 text-sm md:text-base mt-1 max-w-[90%]">
                          {s.desc}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                );
              })}
            </div>

            {/* 圓點導覽 */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    i === active ? "bg-black" : "bg-black/25"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
