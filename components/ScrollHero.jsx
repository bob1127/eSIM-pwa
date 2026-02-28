"use client";

import { useRef } from "react";
import { ReactLenis } from "lenis/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SVGIMAGE from "../components/SVGImage";
// 註冊 GSAP Plugin
gsap.registerPlugin(ScrollTrigger);

export default function ScrollHero() {
  const containerRef = useRef(null);
  const heroImgRef = useRef(null);
  const heroImgElementRef = useRef(null);
  const heroMaskRef = useRef(null);
  const heroGridOverlayRef = useRef(null);
  const marker1Ref = useRef(null);
  const marker2Ref = useRef(null);
  const heroContentRef = useRef(null);
  const progressBarRef = useRef(null);

  useGSAP(
    () => {
      // ... (GSAP 邏輯部分完全不變，省略以節省空間) ...
      const heroContent = heroContentRef.current;
      const heroImg = heroImgRef.current;
      const heroImgElement = heroImgElementRef.current;
      const heroMask = heroMaskRef.current;
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

      const ease = (x) => x * x * (3 - 2 * x);

      ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: `+=${window.innerHeight * 4}px`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        onUpdate: (self) => {
          gsap.set(progressBar, {
            "--progress": self.progress,
          });

          gsap.set(heroContent, {
            y: -self.progress * heroContentMovedistance,
          });

          let heroImgProgress;
          if (self.progress <= 0.45) {
            heroImgProgress = ease(self.progress / 0.45) * 0.65;
          } else if (self.progress <= 0.75) {
            heroImgProgress = 0.65;
          } else {
            heroImgProgress = 0.65 + ease((self.progress - 0.75) / 0.25) * 0.35;
          }

          gsap.set(heroImg, {
            y: heroImgProgress * heroImgMovedistance,
          });

          let heroMaskScale;
          let heroImgSaturation;
          let heroImgOverlayOpacity;

          if (self.progress <= 0.4) {
            heroMaskScale = 2.5;
            heroImgSaturation = 1;
            heroImgOverlayOpacity = 0.35;
          } else if (self.progress <= 0.5) {
            const phaseProgress = ease((self.progress - 0.4) / 0.1);
            heroMaskScale = 2.5 - phaseProgress * 1.5;
            heroImgSaturation = 1 - phaseProgress;
            heroImgOverlayOpacity = 0.35 + phaseProgress * 0.35;
          } else if (self.progress <= 0.75) {
            heroMaskScale = 1;
            heroImgSaturation = 0;
            heroImgOverlayOpacity = 0.7;
          } else if (self.progress <= 0.85) {
            const phaseProgress = ease((self.progress - 0.75) / 0.1);
            heroMaskScale = 1 + phaseProgress * 1.5;
            heroImgSaturation = phaseProgress;
            heroImgOverlayOpacity = 0.7 - phaseProgress * 0.35;
          } else {
            heroMaskScale = 2.5;
            heroImgSaturation = 1;
            heroImgOverlayOpacity = 0.35;
          }

          gsap.set(heroMask, {
            scale: heroMaskScale,
          });

          gsap.set(heroImgElement, {
            filter: `saturate(${heroImgSaturation})`,
          });

          gsap.set(heroImg, {
            "--overlay-opacity": heroImgOverlayOpacity,
          });

          let heroGridOpacity;
          if (self.progress <= 0.475) {
            heroGridOpacity = 0;
          } else if (self.progress <= 0.5) {
            heroGridOpacity = ease((self.progress - 0.475) / 0.025);
          } else if (self.progress <= 0.75) {
            heroGridOpacity = 1;
          } else if (self.progress <= 0.775) {
            heroGridOpacity = 1 - ease((self.progress - 0.75) / 0.025);
          } else {
            heroGridOpacity = 0;
          }

          gsap.set(heroGridOverlay, {
            opacity: heroGridOpacity,
          });

          let marker1Opacity;
          if (self.progress <= 0.5) {
            marker1Opacity = 0;
          } else if (self.progress <= 0.525) {
            marker1Opacity = ease((self.progress - 0.5) / 0.025);
          } else if (self.progress <= 0.7) {
            marker1Opacity = 1;
          } else if (self.progress <= 0.75) {
            marker1Opacity = 1 - ease((self.progress - 0.7) / 0.05);
          } else {
            marker1Opacity = 0;
          }

          gsap.set(marker1, {
            opacity: marker1Opacity,
          });

          let marker2Opacity;
          if (self.progress <= 0.55) {
            marker2Opacity = 0;
          } else if (self.progress <= 0.575) {
            marker2Opacity = ease((self.progress - 0.55) / 0.025);
          } else if (self.progress <= 0.7) {
            marker2Opacity = 1;
          } else if (self.progress <= 0.75) {
            marker2Opacity = 1 - ease((self.progress - 0.7) / 0.05);
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
      <ReactLenis root />
      <div ref={containerRef} className="scroll-hero-wrapper">
        <section className="hero">
          <div className="hero-img" ref={heroImgRef}>
            <img ref={heroImgElementRef} src="/hero-img.jpg" alt="Hero" />
          </div>

          <div className="hero-mask" ref={heroMaskRef}></div>

          <div className="hero-grid-overlay" ref={heroGridOverlayRef}>
            <img src="/grid-overlay.svg" alt="Grid Overlay" />
          </div>

          <div className="marker marker-1" ref={marker1Ref}>
            <span className="marker-icon"></span>
            <p className="marker-label">全球通用</p>
          </div>

          <div className="marker marker-2" ref={marker2Ref}>
            <span className="marker-icon"></span>
            <p className="marker-label">eSIM</p>
          </div>

          <div
            className="hero-content sm:pt-20 pt-[250px]"
            ref={heroContentRef}
          >
            {" "}
            <SVGIMAGE />
            {/* ... (內容省略) ... */}
            <div className="hero-content-block ">
              <br></br>
              <div className="hero-content-copy">
                <h2>讓您的目的地保持無縫連接</h2>
                <p>
                  歡迎來到我們的單地eSIM系列，旨在為您的特定目的地提供靈活且實惠的移動連接服務。通過單地eSIM，您可以輕鬆地訪問當地的數據、語音和短信服務，無需實體SIM卡，是旅行者在訪問熱門國家和地區時，實現平滑、無煩憂體驗的最佳選擇。
                </p>
              </div>
            </div>
            <div className="hero-content-block pl-20">
              <div className="hero-content-copy">
                <h2 className="!text-[30px]">
                  無論你去哪裡旅行，<br></br>保持連線不斷網
                </h2>
                <p>
                  在極客eSIM 探索經濟高效的旅遊和商務數據計劃，<br></br>
                  隨時隨地無縫連接，無需昂貴的國際漫遊費
                </p>
              </div>
            </div>
            <div className="hero-content-block">
              <div className="hero-content-copy">
                <h2>Active Locations</h2>
                <p>Keep scrolling.</p>
              </div>
            </div>
            <div className="hero-content-block">
              <div className="hero-content-copy">
                <h2>Spatial Center</h2>
                <p>End of section.</p>
              </div>
            </div>
          </div>

          {/* === 修改部分：飛機 Icon 容器 === */}
          <div className="hero-scroll-progress-bar" ref={progressBarRef}>
            {/* 這裡改用一個 div 來做 mask，不再直接放 svg */}
            <div className="plane-icon">
              <div className="plane-mask" />
            </div>
          </div>
        </section>

        <section className="  h-auto bg-black">
          <p className="!text-[4vw] text-white font-bold">
            The system has reached its final spatial state.
          </p>
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

          .outro {
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .hero-img {
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 200svh;
            --overlay-opacity: 0.35;
            will-change: transform;
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
            will-change: transform;
            pointer-events: none;
            z-index: 10;
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
          }
          .hero-content .hero-content-block {
            width: 100%;
            height: 100svh;
            padding: 4rem;
            display: flex;
          }
          .hero-content .hero-content-copy {
            width: 35%;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }
          .hero-content .hero-content-block:nth-child(1) {
            align-items: flex-end;
          }
          .hero-content .hero-content-block:nth-child(2),
          .hero-content .hero-content-block:nth-child(4) {
            justify-content: flex-end;
            align-items: center;
          }
          .hero-content .hero-content-block:nth-child(3) {
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
              padding: 1.5rem;
            }
            .hero-content .hero-content-copy {
              width: 75%;
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
