"use client";

import { useEffect, useMemo, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function VuckoScroll({
  vimeoSrc = "https://www.youtube.com/watch?v=9xTtsV3nWwc&t=77s",
  brand = "Codegrid",
}) {
  const introRef = useRef(null);
  const desktopContainerRef = useRef(null);
  const rafRef = useRef(0);
  const lenisRef = useRef(null);

  // 專給桌機互動用的計算狀態（用 ref 避免重複 render）
  const stateRef = useRef({
    scrollProgress: 0,
    initialTranslateY: -105,
    currentTranslateY: -105,
    movementMultiplier: 650,
    scale: 0.25,
    fontSize: 80,
    gap: 2,
    targetMouseX: 0,
    currentMouseX: 0,
  });

  const breakpoints = useMemo(
    () => [
      { maxWidth: 1000, translateY: -135, movMultiplier: 450 },
      { maxWidth: 1100, translateY: -130, movMultiplier: 500 },
      { maxWidth: 1200, translateY: -125, movMultiplier: 550 },
      { maxWidth: 1300, translateY: -120, movMultiplier: 600 },
    ],
    []
  );

  // 依視窗寬度取得初始值
  const getInitialValues = () => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1440;
    for (const bp of breakpoints) {
      if (width <= bp.maxWidth) {
        return {
          translateY: bp.translateY,
          movementMultiplier: bp.movMultiplier,
        };
      }
    }
    return { translateY: -105, movementMultiplier: 650 };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 僅桌機開啟互動動畫
    const isDesktop = () => window.innerWidth >= 900;

    // 初始化 Lenis（平滑滾動）
    if (isDesktop()) {
      const lenis = new Lenis();
      lenisRef.current = lenis;

      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    // 設定初始狀態
    const init = getInitialValues();
    stateRef.current.initialTranslateY = init.translateY;
    stateRef.current.currentTranslateY = init.translateY;
    stateRef.current.movementMultiplier = init.movementMultiplier;

    // Resize 時調整
    const onResize = () => {
      const nv = getInitialValues();
      stateRef.current.initialTranslateY = nv.translateY;
      stateRef.current.movementMultiplier = nv.movementMultiplier;
      if (stateRef.current.scrollProgress === 0) {
        stateRef.current.currentTranslateY = nv.translateY;
      }
    };
    window.addEventListener("resize", onResize);

    // Mouse move 只在桌機處理
    const onMouseMove = (e) => {
      if (!isDesktop()) return;
      stateRef.current.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    // GSAP ScrollTrigger（以 intro 區塊為 trigger）
    const ctx = gsap.context(() => {
      if (!introRef.current) return;

      gsap.timeline({
        scrollTrigger: {
          trigger: introRef.current,
          start: "top bottom",
          end: "top 10%",
          scrub: true,
          onUpdate: (self) => {
            const s = stateRef.current;
            s.scrollProgress = self.progress;

            s.currentTranslateY = gsap.utils.interpolate(
              s.initialTranslateY,
              0,
              s.scrollProgress
            );
            s.scale = gsap.utils.interpolate(0.25, 1, s.scrollProgress);
            s.gap = gsap.utils.interpolate(2, 1, s.scrollProgress);

            if (s.scrollProgress <= 0.4) {
              const p = s.scrollProgress / 0.4;
              s.fontSize = gsap.utils.interpolate(80, 40, p);
            } else {
              const p = (s.scrollProgress - 0.4) / 0.6;
              s.fontSize = gsap.utils.interpolate(40, 20, p);
            }
          },
        },
      });
    }, introRef);

    // 手寫 rAF 動畫迴圈（同你原始程式）
    const loop = () => {
      const container = desktopContainerRef.current;
      if (!container) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      if (!isDesktop()) {
        // 手機時不跑互動 transform
        container.style.transform = "";
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const s = stateRef.current;
      const scaledMovementMultiplier = (1 - s.scale) * s.movementMultiplier;
      const maxHorizontalMovement =
        s.scale < 0.95 ? s.targetMouseX * scaledMovementMultiplier : 0;

      s.currentMouseX = gsap.utils.interpolate(
        s.currentMouseX,
        maxHorizontalMovement,
        0.05
      );

      container.style.transform = `translateY(${s.currentTranslateY}%) translateX(${s.currentMouseX}px) scale(${s.scale})`;
      container.style.gap = `${s.gap}em`;

      // 調整標題字級
      const titlePs = container.querySelectorAll(".video-title p");
      titlePs.forEach((el) => {
        el.style.fontSize = `${s.fontSize}px`;
      });

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // 清理
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      if (lenisRef.current) {
        gsap.ticker.remove((time) => {
          lenisRef.current?.raf(time * 1000);
        });
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
    };
  }, [breakpoints]);

  return (
    <div className="">
      <section className="hero">
        <h1>{brand}</h1>
        <div className="hero-copy">
          <p>One subscription, endless web design.</p>
          <p>(Scroll)</p>
        </div>
      </section>

      <section className="intro" ref={introRef}>
        {/* 桌機互動容器 */}
        <div className="video-container-desktop" ref={desktopContainerRef}>
          <div className="video-preview">
            <div className="video-wrapper">
              <iframe
                src={vimeoSrc}
                frameBorder="0"
                allow="autoplay; fullscreen"
                referrerPolicy="no-referrer"
                loading="lazy"
                title={`${brand} video`}
              />
            </div>
          </div>
          <div className="video-title">
            <p>PRO Showreel</p>
            <p>2023 - 2024</p>
          </div>
        </div>

        {/* 手機版（無互動、純顯示） */}
        <div className="video-container-mobile">
          <div className="video-preview">
            <div className="video-wrapper">
              <iframe
                src={vimeoSrc}
                frameBorder="0"
                allow="autoplay; fullscreen"
                referrerPolicy="no-referrer"
                loading="lazy"
                title={`${brand} video`}
              />
            </div>
          </div>
          <div className="video-title">
            <p>PRO Showreel</p>
            <p>2023 - 2024</p>
          </div>
        </div>
      </section>

      {/* --- styled-jsx（單檔元件化樣式） --- */}
      <style jsx>{`
        h1 {
          font-size: 60px;
          font-weight: 500;
        }
        p {
          font-size: 20px;
          font-weight: 500;
        }
        a {
          text-decoration: none;
          color: #fff;
          font-size: 20px;
          font-weight: 500;
        }
        nav {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          padding: 2em 2.5em;
          display: flex;
          justify-content: space-between;
          mix-blend-mode: difference;
          z-index: 2;
        }
        .links {
          display: flex;
          gap: 1em;
        }
        section {
          width: 100vw;
          height: 100svh;
          padding: 2.5em;
        }
        .hero {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-top: 4em;
        }
        .hero h1 {
          position: relative;
          left: -0.05em;
          text-transform: uppercase;
          font-weight: 500;
          font-size: 20vw;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .hero-copy {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .outro {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .intro {
          height: 100%;
        }
        .video-container-desktop {
          position: relative;
          transform: translateY(-105%) scale(0.25);
          display: flex;
          flex-direction: column;
          gap: 2em;
          will-change: transform;
        }
        .video-container-desktop :global(.video-title p) {
          position: relative;
          font-size: 78px;
          font-weight: 500;
        }
        .video-container-mobile {
          display: none;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        .video-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 1.5rem;
          background-color: #b9b9b3;
          overflow: hidden;
        }
        .video-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 1.5rem;
          overflow: hidden;
        }
        iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 0;
          border-radius: 1.5rem;
          pointer-events: none;
        }
        @media (max-width: 900px) {
          nav,
          section {
            padding: 1.5em;
          }
          .hero {
            justify-content: flex-end;
            gap: 2em;
          }
          .hero h1 {
            font-size: 19vw;
          }
          .video-container-desktop {
            display: none;
          }
          .video-container-mobile {
            display: flex;
            flex-direction: column;
            gap: 1em;
          }
        }
      `}</style>
    </div>
  );
}
