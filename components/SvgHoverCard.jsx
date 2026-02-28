import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";

// 引入 Swiper 樣式
import "swiper/css";
import "swiper/css/pagination";

// SVG 路徑資料
const SVG_DATA = {
  stroke1: {
    width: "2453",
    height: "2273",
    viewBox: "0 0 2453 2273",
    path: "M227.549 1818.76C227.549 1818.76 406.016 2207.75 569.049 2130.26C843.431 1999.85 -264.104 1002.3 227.549 876.262C552.918 792.849 773.647 2456.11 1342.05 2130.26C1885.43 1818.76 14.9644 455.772 760.548 137.262C1342.05 -111.152 1663.5 2266.35 2209.55 1972.76C2755.6 1679.18 1536.63 384.467 1826.55 137.262C2013.5 -22.1463 2209.55 381.262 2209.55 381.262",
  },
  stroke2: {
    width: "2250",
    height: "2535",
    viewBox: "0 0 2250 2535",
    path: "M1661.28 2255.51C1661.28 2255.51 2311.09 1960.37 2111.78 1817.01C1944.47 1696.67 718.456 2870.17 499.781 2255.51C308.969 1719.17 2457.51 1613.83 2111.78 963.512C1766.05 313.198 427.949 2195.17 132.281 1455.51C-155.219 736.292 2014.78 891.514 1708.78 252.012C1437.81 -314.29 369.471 909.169 132.281 566.512C18.1772 401.672 244.781 193.012 244.781 193.012",
  },
};

// 單張卡片元件 (Hover 動畫邏輯 - 優化版)
const Card = ({ id, title, img }) => {
  const containerRef = useRef(null);
  const pathRefs = useRef([]);
  const wordRefs = useRef([]);

  // 每次渲染前重置 ref 陣列，避免重複添加
  pathRefs.current = [];
  wordRefs.current = [];

  const addToPathRefs = (el) => {
    if (el && !pathRefs.current.includes(el)) pathRefs.current.push(el);
  };
  const addToWordRefs = (el) => {
    if (el && !wordRefs.current.includes(el)) wordRefs.current.push(el);
  };

  // 初始化設定 (只執行一次)
  useEffect(() => {
    // 使用 gsap.context 進行範疇管理，確保卸載時清理
    const ctx = gsap.context(() => {
      // 設定文字初始位置
      gsap.set(wordRefs.current, { yPercent: 100 });

      // 設定 SVG 線條初始狀態
      pathRefs.current.forEach((path) => {
        if (path) {
          const length = path.getTotalLength();
          gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length,
            attr: { "stroke-width": 200 },
          });
        }
      });
    }, containerRef);

    return () => ctx.revert(); // 清理動畫
  }, []);

  // Hover 進場動畫
  const handleMouseEnter = () => {
    gsap.context(() => {
      // 線條動畫
      pathRefs.current.forEach((path) => {
        gsap.to(path, {
          strokeDashoffset: 0,
          attr: { "stroke-width": 700 },
          duration: 1.5,
          ease: "power2.out",
          overwrite: true, // 重要：防止動畫衝突
        });
      });

      // 文字動畫
      gsap.to(wordRefs.current, {
        yPercent: 0,
        duration: 0.75,
        ease: "power3.out",
        stagger: 0.075,
        delay: 0.2, // 稍微延遲文字出現
        overwrite: true,
      });
    }, containerRef);
  };

  // Hover 離場動畫
  const handleMouseLeave = () => {
    gsap.context(() => {
      // 線條退場
      pathRefs.current.forEach((path) => {
        const length = path.getTotalLength();
        gsap.to(path, {
          strokeDashoffset: length,
          attr: { "stroke-width": 200 },
          duration: 1,
          ease: "power2.out",
          overwrite: true, // 重要：防止動畫衝突
        });
      });

      // 文字退場
      gsap.to(wordRefs.current, {
        yPercent: 100,
        duration: 0.5,
        ease: "power3.out",
        stagger: { each: 0.05, from: "end" },
        overwrite: true,
      });
    }, containerRef);
  };

  return (
    <div
      className="card-container mt-8"
      id={id}
      ref={containerRef}
      onMouseEnter={handleMouseEnter} // 使用 React 原生事件
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-img">
        <img src={img} alt={title} />
      </div>
      <div className="svg-stroke svg-stroke-1">
        <svg
          width={SVG_DATA.stroke1.width}
          height={SVG_DATA.stroke1.height}
          viewBox={SVG_DATA.stroke1.viewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            ref={addToPathRefs}
            d={SVG_DATA.stroke1.path}
            strokeWidth="200"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="svg-stroke svg-stroke-2">
        <svg
          width={SVG_DATA.stroke2.width}
          height={SVG_DATA.stroke2.height}
          viewBox={SVG_DATA.stroke2.viewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            ref={addToPathRefs}
            d={SVG_DATA.stroke2.path}
            strokeWidth="200"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="card-title">
        <h3>
          {title.split(" ").map((word, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                overflow: "hidden",
                verticalAlign: "top",
              }}
            >
              <span
                ref={addToWordRefs}
                className="word"
                style={{ display: "inline-block" }}
              >
                {word}&nbsp;
              </span>
            </span>
          ))}
        </h3>
      </div>
    </div>
  );
};

// 主元件
export default function SVGCardCarousel() {
  // 1. 啟用 Lenis 平滑滾動
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  const cards = [
    {
      id: "card-1",
      title: "旅行小知識",
      img: "/images/Generated-Image-November-15,-2025---5_19PM.png",
    },
    { id: "card-2", title: "推薦eSIM方案", img: "/images/01.png" },
    { id: "card-5", title: "Muted Presence", img: "/images/問題解決.png" },
    { id: "card-3", title: "Material Pause", img: "/images/推薦eSIM方案.png" },
    { id: "card-4", title: "Obscured Profile", img: "/images/操作安裝.png" },
    // 修正了重複的 ID，改為 card-6
    {
      id: "card-6",
      title: "Spatial Balance",
      img: "/images/Gemini_Generated_Image_6c0o006c0o006c0o.png",
    },
  ];

  return (
    <div className="carousel-wrapper">
      {/* 🌟🌟🌟 這裡已修改為 dangerouslySetInnerHTML 🌟🌟🌟 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url("https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap");

        :root {
          --card-1-stroke: #e67339;
          --card-2-stroke: #a66363;
          --card-3-stroke: #eb3828;
          --card-4-stroke: #a6a09d;
          --card-5-stroke: #99938a;
          --card-6-stroke: #5f7c98;
          --card-base-stroke: #e0e0e0;
          --card-copy: #000;
        }

        html, body {
          width: 100%;
          min-height: 100%;
          overflow-y: auto !important;
          margin: 0;
          padding: 0;
        }

        .carousel-wrapper * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .carousel-wrapper {
          font-family: "Google Sans", sans-serif;
          width: 100%;
           margin-bottom: 180px;
      
      
          color: black;
          display: flex;
          flex-direction: column;
          overflow-x: hidden; 
        }

        .carousel-wrapper header,
        .carousel-wrapper footer {
          padding: 8rem 2rem;
          text-align: center;
        }

        .carousel-wrapper h1 {
          font-size: clamp(2.5rem, 5vw, 6rem);
          font-weight: 500;
        }

        .carousel-wrapper h3 {
          font-size: clamp(1.5rem, 2vw, 2.5rem);
          font-weight: 450;
        }

        .carousel-wrapper img,
        .carousel-wrapper svg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Swiper 外部容器 */
        .swiper-container-box {
          width: 100%;
          max-width: 1920px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        /* --- 卡片樣式 --- */
        .card-container {
          position: relative;
          width: 100%;
          aspect-ratio: 3/4; /* 保持你要求的長方形比例 */
          border-radius: 0;
          overflow: hidden;
          background-color: #f0f0f0;
          cursor: pointer;
          margin-top: 43px;
        }

        .card-container .svg-stroke {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(2); /* 保持放大比例 */
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        /* 顏色對應 ID */
        #card-1 .svg-stroke-1 svg path { stroke: var(--card-1-stroke); }
        #card-2 .svg-stroke-1 svg path { stroke: var(--card-2-stroke); }
        #card-3 .svg-stroke-1 svg path { stroke: var(--card-3-stroke); }
        #card-4 .svg-stroke-1 svg path { stroke: var(--card-4-stroke); }
        #card-5 .svg-stroke-1 svg path { stroke: var(--card-5-stroke); }
        #card-6 .svg-stroke-1 svg path { stroke: var(--card-6-stroke); }

        .card-container .svg-stroke-2 svg path {
          stroke: var(--card-base-stroke);
        }

        .card-title {
          position: absolute;
          bottom: 2rem;
          left: 2rem;
          color: var(--card-copy);
          z-index: 10;
          pointer-events: none;
        }

        .swiper-pagination-bullet {
          background: #000;
          opacity: 0.3;
          width: 10px;
          height: 10px;
        }
        .swiper-pagination-bullet-active {
          opacity: 1;
          background: #000;
        }
      `,
        }}
      />

      <div className="swiper-container-box">
        <div className="main-title max-w-[1500px] flex flex-col  mx-auto  ">
          <h2 className="text-3xl lg:text-5xl text-white font-bold">NEWS</h2>
          <p className="text-slate-300 text-lg mt-2">事項及相關文章</p>

          <span className="tracking-widest   text-md  mt-3 leading-relaxed text-slate-50 px-4 lg:px-0">
            精選全球熱門旅遊目的地攻略，從上網設定到必去景點，<br></br>
            為您的旅程提供最實用的資訊與建議，讓自由行變得更簡單。
          </span>
        </div>
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={20}
          slidesPerView={1}
          grabCursor={true}
          pagination={{ clickable: true }}
          loop={true} // 恢復循環
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
          }}
          // RWD 斷點設定：
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 30,
            },
            1280: {
              slidesPerView: 4,
              spaceBetween: 30,
            },
            1500: {
              slidesPerView: 5, // 大螢幕顯示 5 張
              spaceBetween: 30,
            },
          }}
          style={{ paddingBottom: "4rem" }}
        >
          {cards.map((card) => (
            <SwiperSlide key={card.id}>
              <Card id={card.id} title={card.title} img={card.img} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
