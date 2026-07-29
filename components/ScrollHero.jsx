"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SVGIMAGE from "./SVGImage";
// 註冊 GSAP Plugin
gsap.registerPlugin(ScrollTrigger);

export default function ScrollHero() {
  const containerRef = useRef(null);
  const skyRef = useRef(null);
  const skyDimRef = useRef(null);
  const heroImgRef = useRef(null);
  const heroImgElementRef = useRef(null);
  const heroMaskRef = useRef(null);
  const windowRef = useRef(null);
  const heroGridOverlayRef = useRef(null);
  const marker1Ref = useRef(null);
  const marker2Ref = useRef(null);
  const heroContentRef = useRef(null);
  const progressBarRef = useRef(null);

  useGSAP(
    () => {
      const sky = skyRef.current;
      const skyDim = skyDimRef.current;
      const heroContent = heroContentRef.current;
      const heroImg = heroImgRef.current;
      const heroImgElement = heroImgElementRef.current;
      const heroMask = heroMaskRef.current;
      const windowContainer = windowRef.current;
      const heroGridOverlay = heroGridOverlayRef.current;
      const marker1 = marker1Ref.current;
      const marker2 = marker2Ref.current;
      const progressBar = progressBarRef.current;

      if (!heroContent || !heroImg) return;

      const heroContentHeight = heroContent.offsetHeight;
      const viewportHeight = window.innerHeight;
      const heroContentMovedistance = heroContentHeight - viewportHeight;

      const heroImgHeight = heroImg.offsetHeight;
      const heroImgMovedistance = heroImgHeight - viewportHeight;

      const skyMoveDistance = sky
        ? sky.offsetHeight - viewportHeight
        : 0;

      const ease = (x) => x * x * (3 - 2 * x);

      ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: `+=${window.innerHeight * 4}px`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;

          // JeskoJets: window 1× → 4× (first 50% scroll)
          let windowScale;
          if (progress <= 0.5) {
            windowScale = 1 + (progress / 0.5) * 3;
          } else {
            windowScale = 4;
          }
          if (windowContainer) {
            gsap.set(windowContainer, { scale: windowScale });
          }

          // JeskoJets: sky parallax
          if (sky) {
            gsap.set(sky, { y: -progress * skyMoveDistance });
          }

          gsap.set(progressBar, {
            "--progress": progress,
          });

          gsap.set(heroContent, {
            y: -progress * heroContentMovedistance,
          });

          let heroImgProgress;
          if (progress <= 0.45) {
            heroImgProgress = ease(progress / 0.45) * 0.65;
          } else if (progress <= 0.75) {
            heroImgProgress = 0.65;
          } else {
            heroImgProgress = 0.65 + ease((progress - 0.75) / 0.25) * 0.35;
          }

          gsap.set(heroImg, {
            y: heroImgProgress * heroImgMovedistance,
          });

          let heroMaskScale;
          let heroImgSaturation;
          // 全程透黑 0.1；滾到 Active Locations／標記段 → 0.7
          let skyDimOpacity = 0.1;
          if (progress <= 0.42) {
            skyDimOpacity = 0.1;
          } else if (progress <= 0.52) {
            const t = ease((progress - 0.42) / 0.1);
            skyDimOpacity = 0.1 + t * 0.6;
          } else {
            skyDimOpacity = 0.7;
          }

          if (progress <= 0.4) {
            heroMaskScale = 2.5;
            heroImgSaturation = 1;
          } else if (progress <= 0.5) {
            const phaseProgress = ease((progress - 0.4) / 0.1);
            heroMaskScale = 2.5 - phaseProgress * 1.5;
            heroImgSaturation = 1 - phaseProgress;
          } else if (progress <= 0.75) {
            heroMaskScale = 1;
            heroImgSaturation = 0;
          } else if (progress <= 0.85) {
            const phaseProgress = ease((progress - 0.75) / 0.1);
            heroMaskScale = 1 + phaseProgress * 1.5;
            heroImgSaturation = phaseProgress;
          } else {
            heroMaskScale = 2.5;
            heroImgSaturation = 1;
          }

          gsap.set(heroMask, {
            scale: heroMaskScale,
            opacity: 0,
          });

          gsap.set(heroImgElement, {
            filter: `saturate(${heroImgSaturation})`,
          });

          gsap.set(heroImg, {
            "--overlay-opacity": skyDimOpacity,
          });

          if (skyDim) {
            gsap.set(skyDim, { opacity: skyDimOpacity });
          }

          let heroGridOpacity;
          if (progress <= 0.475) {
            heroGridOpacity = 0;
          } else if (progress <= 0.5) {
            heroGridOpacity = ease((progress - 0.475) / 0.025);
          } else if (progress <= 0.75) {
            heroGridOpacity = 1;
          } else if (progress <= 0.775) {
            heroGridOpacity = 1 - ease((progress - 0.75) / 0.025);
          } else {
            heroGridOpacity = 0;
          }

          gsap.set(heroGridOverlay, {
            opacity: heroGridOpacity,
          });

          let marker1Opacity;
          if (progress <= 0.5) {
            marker1Opacity = 0;
          } else if (progress <= 0.525) {
            marker1Opacity = ease((progress - 0.5) / 0.025);
          } else if (progress <= 0.7) {
            marker1Opacity = 1;
          } else if (progress <= 0.75) {
            marker1Opacity = 1 - ease((progress - 0.7) / 0.05);
          } else {
            marker1Opacity = 0;
          }

          gsap.set(marker1, {
            opacity: marker1Opacity,
          });

          let marker2Opacity;
          if (progress <= 0.55) {
            marker2Opacity = 0;
          } else if (progress <= 0.575) {
            marker2Opacity = ease((progress - 0.55) / 0.025);
          } else if (progress <= 0.7) {
            marker2Opacity = 1;
          } else if (progress <= 0.75) {
            marker2Opacity = 1 - ease((progress - 0.7) / 0.05);
          } else {
            marker2Opacity = 0;
          }

          gsap.set(marker2, {
            opacity: marker2Opacity,
          });
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <>
      <div ref={containerRef} className="scroll-hero-wrapper">
        <section className="hero">
          <div className="sky-container" ref={skyRef}>
            <img src="/sky.jpg" alt="" className="sky-bg" />
          </div>

          {/* cloud.png 往左無限跑馬燈 */}
          <div className="cloud-mist" aria-hidden>
            <div className="cloud-marquee">
              <img src="/cloud.png" alt="" />
              <img src="/cloud.png" alt="" />
            </div>
          </div>

          {/* 捲到地圖／標記階段時的透明黑遮罩 */}
          <div className="sky-dim-overlay" ref={skyDimRef} aria-hidden />

          <div className="hero-img" ref={heroImgRef}>
            <img ref={heroImgElementRef} src="/hero-img.jpg" alt="Hero" />
          </div>

          <div className="hero-mask" ref={heroMaskRef} aria-hidden />

          <div className="hero-grid-overlay" ref={heroGridOverlayRef}>
            <img src="/grid-overlay.svg" alt="Grid Overlay" />
          </div>

          <div className="marker marker-1" ref={marker1Ref}>
            <span className="marker-icon"></span>
            <p className="marker-label">多國通用</p>
          </div>

          <div className="marker marker-2" ref={marker2Ref}>
            <span className="marker-icon"></span>
            <p className="marker-label">即掃即用</p>
          </div>

          <div
            className="hero-content pt-[26vh] sm:pt-[28vh] overflow-visible"
            ref={heroContentRef}
          >
            <SVGIMAGE />
            <div className="hero-content-block is-inset-right">
              <div className="hero-content-copy">
                <h2>抵達即連線，旅途不中斷</h2>
                <p>
                  Jeko eSIM
                  專為出國旅遊與商務出差打造。購買後即可取得 QR
                  Code，掃描安裝、免換卡、免等待實體寄送。依目的地選擇天數與流量方案，落地就能上網，讓你專注行程，不必再煩惱高額漫遊費。
                </p>
              </div>
            </div>
            <div className="hero-content-block is-inset-left">
              <div className="hero-content-copy">
                <h2 className="!text-[30px]">
                  無論你去哪裡，<br></br>Jeko 陪你一路在線
                </h2>
                <p>
                  涵蓋全球多國熱門旅遊目的地，提供彈性流量與吃到飽方案。
                  <br></br>
                  支援主流 iPhone／Android，即買即用，讓連線像呼吸一樣自然。
                </p>
              </div>
            </div>
            <div className="hero-content-block is-inset-center">
              <div className="hero-content-copy">
                <h2>服務覆蓋各地</h2>
                <p>繼續往下探索，看看 Jeko eSIM 能帶你去哪裡。</p>
              </div>
            </div>
            <div className="hero-content-block is-inset-right">
              <div className="hero-content-copy">
                <h2>連線，從這裡開始</h2>
                <p>
                  選好目的地與方案，幾分鐘內完成啟用——下一段旅程，Jeko
                  與你同在線。
                </p>
              </div>
            </div>
          </div>

          {/* === 修改部分：飛機 Icon 容器 === */}
          <div className="hero-scroll-progress-bar" ref={progressBarRef}>
            <div className="plane-icon">
              <div className="plane-mask" />
            </div>
          </div>

          <div className="window-container" ref={windowRef}>
            <img src="/window.png" alt="" />
          </div>
        </section>

        {/* CSS Scoped to this component */}
        <style jsx>{`
          @import url("https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap");

          .scroll-hero-wrapper {
            --light: #fff;
            --dark: #141414;
            --accent-1: #dc5935;
            --accent-2: #d3ef76;
            font-family: "DM Sans", sans-serif;
            background-color: var(--dark);
            color: var(--light);
            width: 100%;
            overflow: hidden;
          }

          .scroll-hero-wrapper :global(*) {
            box-sizing: border-box;
          }

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          h1,
          h2 {
            font-weight: 400;
            line-height: 1.1;
            margin: 0;
          }

          h1 {
            font-size: clamp(3rem, 4vw, 5rem);
          }
          h2 {
            font-size: clamp(1.5rem, 2.25vw, 3rem);
          }
          p {
            font-size: 1.125rem;
            font-weight: 400;
            line-height: 1.4;
            margin: 0;
          }

          section {
            position: relative;
            width: 100%;
            height: 100svh;
            background-color: var(--dark);
            overflow: hidden;
          }

          .hero {
            perspective: 1000px;
          }

          .sky-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 350svh;
            will-change: transform;
            z-index: 0;
          }

          .sky-container .sky-bg {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .cloud-mist {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100svh;
            /* 必須低於透黑遮罩，雲霧在遮罩下方 */
            z-index: 1;
            overflow: hidden;
            pointer-events: none;
          }

          .cloud-marquee {
            display: flex;
            width: 200%;
            height: 100%;
            will-change: transform;
            animation: heroCloudMarquee 40s linear infinite;
          }

          .cloud-marquee img {
            width: 50%;
            height: 100%;
            max-width: none;
            object-fit: cover;
            object-position: center;
            mix-blend-mode: screen;
            opacity: 0.9;
            flex-shrink: 0;
          }

          @keyframes heroCloudMarquee {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }

          .sky-dim-overlay {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100svh;
            background: #000;
            opacity: 0.1;
            pointer-events: none;
            /* 蓋在雲霧之上 */
            z-index: 2;
            will-change: opacity;
          }

          .window-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100svh;
            z-index: 11;
            pointer-events: none;
            transform-origin: center center;
            will-change: transform;
          }

          .outro {
            display: flex;
            justify-content: center;
            align-items: center;
          }

          /* hero-img.jpg 本身也是飛機窗圖，疊在 window.png 孔洞後會形成窗中窗；隱藏以免重複 */
          .hero-img {
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 200svh;
            --overlay-opacity: 0.35;
            will-change: transform;
            z-index: 1;
            opacity: 0;
            pointer-events: none;
            visibility: hidden;
          }

          .hero-img::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: var(--dark);
            opacity: var(--overlay-opacity);
            will-change: opacity;
          }

          .hero-img img {
            will-change: filter;
          }

          .hero-mask {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100svh;
            background-color: var(--dark);
            mask: linear-gradient(var(--light), var(--light)),
              url("/mask.svg") center/50% no-repeat;
            -webkit-mask: linear-gradient(var(--light), var(--light)),
              url("/mask.svg") center/50% no-repeat;
            mask-composite: subtract;
            -webkit-mask-composite: subtract;
            will-change: transform, opacity;
            pointer-events: none;
            z-index: 10;
            opacity: 0;
          }

          .hero-grid-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 55%;
            will-change: opacity;
            z-index: 1;
          }
          .hero-grid-overlay img {
            opacity: 0.25;
          }

          .marker {
            position: absolute;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            gap: 1rem;
            will-change: opacity;
            z-index: 5;
          }
          .marker-1 {
            top: 50svh;
            left: 50vw;
          }
          .marker-2 {
            top: 35svh;
            left: 60vw;
          }

          .marker .marker-label {
            text-transform: uppercase;
            font-family: "DM Mono", monospace;
            font-size: 0.7rem;
            font-weight: 500;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
          }

          .marker .marker-icon {
            position: relative;
            width: 0.5rem;
            height: 0.5rem;
            border-radius: 2rem;
          }
          .marker .marker-icon:before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 10rem;
            height: 10rem;
            border-radius: 100%;
            animation: pulse 1.5s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
          }

          .marker.marker-1 .marker-icon,
          .marker.marker-1 .marker-icon::before,
          .marker.marker-1 .marker-label {
            background-color: var(--accent-1);
            color: var(--light);
          }
          .marker.marker-2 .marker-icon,
          .marker.marker-2 .marker-icon::before,
          .marker.marker-2 .marker-label {
            background-color: var(--accent-2);
            color: var(--dark);
          }

          @keyframes pulse {
            0% {
              transform: translate(-50%, -50%) scale(0.25);
            }
            80%,
            100% {
              opacity: 0;
            }
          }

          .hero-content {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 400svh;
            display: flex;
            flex-direction: column;
            will-change: transform;
            z-index: 2;
            overflow: visible;
          }
          .hero-content .hero-content-block {
            width: 100%;
            height: 100svh;
            /* 兩側加大內縮，文字落在飛機窗可見區內，不貼窗框 */
            padding: 5rem clamp(4.5rem, 22vw, 15rem);
            display: flex;
            box-sizing: border-box;
          }
          .hero-content .hero-content-copy {
            width: min(36%, 22rem);
            max-width: 100%;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            text-shadow: 0 1px 10px rgba(0, 0, 0, 0.28);
          }
          .hero-content .hero-content-block.is-inset-left {
            justify-content: flex-start;
            align-items: center;
            padding-left: clamp(5rem, 24vw, 16rem);
            padding-right: clamp(3rem, 18vw, 12rem);
          }
          .hero-content .hero-content-block.is-inset-right {
            justify-content: flex-end;
            align-items: center;
            padding-right: clamp(5rem, 24vw, 16rem);
            padding-left: clamp(3rem, 18vw, 12rem);
          }
          .hero-content .hero-content-block.is-inset-center {
            justify-content: center;
            align-items: center;
          }

          /* === Scroll Bar 樣式 === */
          .hero-scroll-progress-bar {
            position: absolute;
            top: 50%;
            right: 2rem;
            transform: translateY(-50%);
            width: 0.1rem;
            height: 10rem;
            background-color: rgba(255, 255, 255, 0.2);
            --progress: 0;
            z-index: 20;
          }

          .hero-scroll-progress-bar::after {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            background-color: var(--light);
            transform-origin: top;
            transform: scaleY(var(--progress));
            will-change: transform;
          }

          /* === 修改部分：飛機 Icon 容器定位 === */
          .plane-icon {
            position: absolute;
            left: 50%;
            /* 根據進度計算 top 位置 */
            top: calc(100% * var(--progress));
            /* 置中，並旋轉 180 度讓飛機頭朝下 (假設你的 SVG 預設是朝上的) */
            transform: translate(-50%, -50%) rotate(180deg);
            z-index: 21;
            pointer-events: none;
            will-change: top;
          }

          /* === 修改部分：使用 CSS Mask 製作純白飛機 === */
          .plane-mask {
            width: 1.5rem;
            height: 1.5rem;
            /* 設定背景色為純白 */
            background-color: var(--light);
            /* 使用 SVG 作為遮罩，這樣背景色只會顯示在飛機形狀內 */
            -webkit-mask: url("/images/airplane-svgrepo-com.svg") no-repeat
              center / contain;
            mask: url("/images/airplane-svgrepo-com.svg") no-repeat center /
              contain;
          }

          @media (max-width: 800px) {
            .hero-mask {
              mask: linear-gradient(var(--light), var(--light)),
                url("/mask.svg") center/75% no-repeat;
              -webkit-mask: linear-gradient(var(--light), var(--light)),
                url("/mask.svg") center/75% no-repeat;
              mask-composite: subtract;
              -webkit-mask-composite: subtract;
            }
            .hero-grid-overlay {
              width: 100%;
            }
            .marker-1 {
              top: 52.5svh;
              left: 50vw;
            }
            .marker-2 {
              top: 45svh;
              left: 70vw;
            }
            .hero-content .hero-content-block {
              padding: 3.5rem clamp(2.75rem, 16vw, 5rem);
            }
            .hero-content .hero-content-block.is-inset-left {
              padding-left: clamp(3rem, 18vw, 5.5rem);
              padding-right: clamp(2.5rem, 14vw, 4rem);
            }
            .hero-content .hero-content-block.is-inset-right {
              padding-right: clamp(3rem, 18vw, 5.5rem);
              padding-left: clamp(2.5rem, 14vw, 4rem);
            }
            .hero-content .hero-content-copy {
              width: min(78%, 18rem);
            }
            .hero-scroll-progress-bar {
              right: 1rem;
            }
          }
        `}</style>
      </div>
    </>
  );
}
