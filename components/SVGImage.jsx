import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger"; // 1. 引入 ScrollTrigger
import Marquee from "react-fast-marquee";
import Image from "next/image";

// 2. 註冊插件
gsap.registerPlugin(ScrollTrigger);

const HeroComponent = () => {
  const containerRef = useRef(null); // 建立 Ref 來鎖定範圍

  useEffect(() => {
    // 使用 gsap.context 進行範疇管理 (React 最佳實踐)
    let ctx = gsap.context(() => {
      // 設定共同的 ScrollTrigger 設定
      const triggerConfig = {
        trigger: containerRef.current, // 監聽這個元件
        start: "top 75%", // 當元件頂部到達視窗 75% 處時開始 (可以自己調整，例如 "top center")
        toggleActions: "play none none reverse", // 進場播放，離開反轉 (或者改成 "play none none none" 只播放一次)
      };

      // 注意：如果 .nav-container 在這個組件外部，這裡可能選取不到。
      // 如果 nav 是全域的，建議把這個動畫獨立出去，或者移除 scope。
      gsap.from(".nav-container", {
        scrollTrigger: triggerConfig,
        opacity: 0,
        y: -60,
        ease: "power3.inOut",
        duration: 2,
      });

      gsap.from(".hero > *", {
        scrollTrigger: triggerConfig,
        opacity: 0,
        y: 60,
        ease: "power3.inOut",
        duration: 1,
        stagger: { amount: 0.5 },
        delay: 0.5, // 相對於觸發點的延遲
      });
    }, containerRef); // 鎖定選擇器範圍在 containerRef 內

    return () => ctx.revert(); // 清理動畫
  }, []);

  return (
    <div ref={containerRef} className="relative overflow-visible">
      <div className="hero-container relative z-10 w-full overflow-visible">
        <div className="hero relative w-[58%] max-w-[320px] sm:w-[46%] sm:max-w-[380px] mx-auto flex flex-col justify-center items-center text-center py-8 sm:py-10 overflow-visible">
          <h1 className="relative z-10 font-voyage font-medium text-[clamp(1.25rem,2.8vw,2.15rem)] leading-[1.35] tracking-wide text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
            連線。即刻
            <br />
            帶著 Jeko 走遍世界
          </h1>
        </div>
        <Marquee>
          {/* 圖片部分保持不變 */}
          <Image
            width={300}
            height={300}
            placeholder="empty"
            loading="lazy"
            src="/images/4098341.png"
            alt="img"
          />
          <Image
            width={300}
            height={300}
            placeholder="empty"
            loading="lazy"
            src="/images/4098341.png"
            alt="img"
          />
          <Image
            width={300}
            height={300}
            placeholder="empty"
            loading="lazy"
            src="/images/4098341.png"
            alt="img"
          />
          <Image
            width={300}
            height={300}
            placeholder="empty"
            loading="lazy"
            src="/images/4098341.png"
            alt="img"
          />
          <Image
            width={300}
            height={300}
            placeholder="empty"
            loading="lazy"
            src="/images/4098341.png"
            alt="img"
          />
          <Image
            width={300}
            height={300}
            placeholder="empty"
            loading="lazy"
            src="/images/4098341.png"
            alt="img"
          />
        </Marquee>

        <div></div>
      </div>
    </div>
  );
};

export default HeroComponent;
