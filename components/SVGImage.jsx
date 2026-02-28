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

      gsap.from(".blob", {
        scrollTrigger: triggerConfig,
        scale: 0,
        ease: "power3.inOut",
        duration: 2,
        stagger: { amount: 0.5 },
        delay: 1,
      });

      gsap.from(".bg-gradient", {
        scrollTrigger: triggerConfig,
        scale: 0,
        ease: "power3.inOut",
        duration: 2,
        delay: 1.5,
      });
    }, containerRef); // 鎖定選擇器範圍在 containerRef 內

    return () => ctx.revert(); // 清理動畫
  }, []);

  return (
    // 綁定 ref 到最外層 div
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Blob elements */}
      <div className="blob-1 blob"></div>
      <div className="blob-2 blob"></div>
      <div className="blob-3 blob">+</div>

      <div className="bg-gradient absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 z-0">
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 500 500"
          width="100%"
          id="blobSvg"
          className="filter blur-md opacity-100"
        >
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "rgb(248, 121, 21)" }} />
              <stop offset="100%" style={{ stopColor: "rgb(255, 201, 69)" }} />
            </linearGradient>
          </defs>
          <path id="blob" fill="url(#gradient)">
            <animate
              attributeName="d"
              dur="4s"
              repeatCount="indefinite"
              values="M421.63508,307.39005Q364.7801,364.7801,307.39005,427.43403Q250,490.08796,191.6822,428.36178Q133.3644,366.6356,70.9089,308.3178Q8.4534,250,54.21728,174.99058Q99.98115,99.98115,174.99058,81.49686Q250,63.01257,330.66021,75.84607Q411.32042,88.67958,444.90524,169.33979Q478.49006,250,421.63508,307.39005Z;M395.5,320Q390,390,320,400Q250,410,172,408Q94,406,59,328Q24,250,70.5,183.5Q117,117,183.5,108Q250,99,335,89.5Q420,80,410.5,165Q401,250,395.5,320Z;M408.24461,332.63257Q415.26513,415.26513,332.63257,434.71568Q250,454.16622,179.33614,422.74697Q108.67228,391.32772,65.87585,320.66386Q23.07942,250,63.27221,176.73251Q103.46501,103.46501,176.73251,63.02288Q250,22.58075,311.86507,74.4253Q373.73015,126.26985,387.47712,188.13493Q401.22409,250,408.24461,332.63257Z;"
            ></animate>
          </path>
        </svg>
      </div>

      <div className="hero-container relative z-10 w-full">
        {/* 修正了原本的 typo: f;ex -> flex */}
        <div className="hero w-1/3 mx-auto flex flex-col justify-center items-center text-center py-16">
          <h1 className="font-voyage font-medium text-[5vw] xl:text-[3.5vw] leading-tight">
            連線。快速 <br></br>在全世界各個角落
          </h1>
          <div className="cta">
            <button className="bg-black text-white border-none mt-16 py-6 px-12 uppercase text-sm">
              探索更多方案
            </button>
          </div>
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
