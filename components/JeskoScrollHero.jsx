"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SVGIMAGE from "./SVGImage";
import { REGION_MARKERS } from "@/lib/mapMarkerPositions";

gsap.registerPlugin(ScrollTrigger);

const WORLD_MAP_SRC = "/images/world-map-dark.jpg";
const WINDOW_FRAME_SRC = "/window.png";

const MARKER_FADE_STARTS = [0.5, 0.525, 0.55, 0.575, 0.6, 0.625, 0.65];
const SCROLL_VH = 3;

export default function JeskoScrollHero() {
  const containerRef = useRef(null);
  const windowSceneRef = useRef(null);
  const skyRef = useRef(null);
  const skyImgRef = useRef(null);
  const cloudRef = useRef(null);
  const mapLayerRef = useRef(null);
  const mapImgRef = useRef(null);
  const windowRef = useRef(null);
  const heroGridOverlayRef = useRef(null);
  const markersRef = useRef(null);
  const heroContentRef = useRef(null);
  const progressBarRef = useRef(null);

  useGSAP(
    () => {
      const windowScene = windowSceneRef.current;
      const sky = skyRef.current;
      const skyImg = skyImgRef.current;
      const cloud = cloudRef.current;
      const mapLayer = mapLayerRef.current;
      const mapImg = mapImgRef.current;
      const windowContainer = windowRef.current;
      const heroContent = heroContentRef.current;
      const heroGridOverlay = heroGridOverlayRef.current;
      const markers = markersRef.current;
      const progressBar = progressBarRef.current;

      if (!windowScene || !sky || !windowContainer || !heroContent) return;

      const viewportHeight = window.innerHeight;
      const skyMoveDistance = sky.offsetHeight - viewportHeight;
      const heroContentMoveDistance =
        heroContent.offsetHeight - viewportHeight;
      const markerEls = markers?.querySelectorAll(".map-marker") ?? [];

      const ease = (x) => x * x * (3 - 2 * x);

      ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: `+=${viewportHeight * SCROLL_VH}px`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;

          gsap.set(progressBar, { "--progress": progress });

          // JeskoJets: window + viewport zoom together
          let windowScale;
          if (progress <= 0.5) {
            windowScale = 1 + (progress / 0.5) * 3;
          } else {
            windowScale = 4;
          }
          gsap.set(windowContainer, { scale: windowScale });
          gsap.set(windowScene, { scale: windowScale });

          gsap.set(sky, { y: -progress * skyMoveDistance });

          gsap.set(heroContent, {
            y: -progress * heroContentMoveDistance,
          });

          // Sky → map (0.4–0.5)
          let skyOpacity = 1;
          let mapOpacity = 0;
          if (progress <= 0.4) {
            skyOpacity = 1;
            mapOpacity = 0;
          } else if (progress <= 0.5) {
            const t = ease((progress - 0.4) / 0.1);
            skyOpacity = 1 - t;
            mapOpacity = t;
          } else {
            skyOpacity = 0;
            mapOpacity = 1;
          }

          if (skyImg) gsap.set(skyImg, { opacity: skyOpacity });
          if (cloud) gsap.set(cloud, { opacity: skyOpacity });
          if (mapLayer) gsap.set(mapLayer, { opacity: mapOpacity });

          // Subtle desaturate on map mid-phase only
          let mapSaturation = 1;
          if (progress > 0.5 && progress <= 0.72) {
            mapSaturation = 1 - ease((progress - 0.5) / 0.22) * 0.35;
          } else if (progress > 0.72 && progress <= 0.88) {
            mapSaturation =
              0.65 + ease((progress - 0.72) / 0.16) * 0.35;
          }
          if (mapImg) {
            gsap.set(mapImg, { filter: `saturate(${mapSaturation})` });
          }

          // Grid
          let heroGridOpacity = 0;
          if (progress <= 0.475) {
            heroGridOpacity = 0;
          } else if (progress <= 0.5) {
            heroGridOpacity = ease((progress - 0.475) / 0.025);
          } else if (progress <= 0.88) {
            heroGridOpacity = 1;
          } else if (progress <= 0.95) {
            heroGridOpacity = 1 - ease((progress - 0.88) / 0.07);
          }
          gsap.set(heroGridOverlay, { opacity: heroGridOpacity * mapOpacity });

          // Markers — stay through map phase, fade at end
          markerEls.forEach((el, i) => {
            const start = MARKER_FADE_STARTS[i] ?? 0.5 + i * 0.025;
            let opacity = 0;

            if (progress <= start) {
              opacity = 0;
            } else if (progress <= start + 0.025) {
              opacity = ease((progress - start) / 0.025);
            } else if (progress <= 0.88) {
              opacity = 1;
            } else if (progress <= 0.96) {
              opacity = 1 - ease((progress - 0.88) / 0.08);
            }

            gsap.set(el, { opacity: opacity * mapOpacity });
          });

          // End: soften window scene before unpin
          let sceneOpacity = 1;
          if (progress > 0.92) {
            sceneOpacity = 1 - ease((progress - 0.92) / 0.08) * 0.15;
          }
          gsap.set(windowScene, { opacity: sceneOpacity });
          gsap.set(windowContainer, { opacity: sceneOpacity });
        },
      });
    },
    { scope: containerRef },
  );

  return (
    <>
      <div ref={containerRef} className="scroll-hero-wrapper">
        <section className="hero">
          {/* Clipped to window aperture — not full-bleed */}
          <div className="window-scene" ref={windowSceneRef}>
            <div className="sky-container" ref={skyRef}>
              <img ref={skyImgRef} src="/sky.jpg" alt="" className="sky-bg" />
              <div className="cloud-container" ref={cloudRef}>
                <div className="cloud-track">
                  <img src="/cloud.png" alt="" />
                  <img src="/cloud.png" alt="" />
                </div>
              </div>
            </div>

            <div className="map-layer" ref={mapLayerRef}>
              <div className="map-stage">
                <div className="map-frame">
                  <img
                    ref={mapImgRef}
                    src={WORLD_MAP_SRC}
                    alt="世界地圖"
                    className="map-image"
                  />
                  <div className="map-overlay">
                    <div className="hero-grid-overlay" ref={heroGridOverlayRef}>
                      <img src="/grid-overlay.svg" alt="" />
                    </div>
                    <div className="markers-layer" ref={markersRef}>
                      {REGION_MARKERS.map((m) => (
                        <div
                          key={m.key}
                          className={`map-marker accent-${m.accent}`}
                          style={{ top: m.top, left: m.left }}
                        >
                          <span className="marker-icon" />
                          <p className="marker-label">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="window-container" ref={windowRef}>
            <img src={WINDOW_FRAME_SRC} alt="" />
          </div>

          <div
            className="hero-content sm:pt-20 pt-[250px]"
            ref={heroContentRef}
          >
            <SVGIMAGE />
            <div className="hero-content-block">
              <div className="hero-content-copy">
                <h2>讓您的目的地保持無縫連接</h2>
                <p>
                  歡迎來到我們的單地eSIM系列，旨在為您的特定目的地提供靈活且實惠的移動連接服務。通過單地eSIM，您可以輕鬆地訪問當地的數據、語音和短信服務，無需實體SIM卡。
                </p>
              </div>
            </div>
            <div className="hero-content-block pl-20">
              <div className="hero-content-copy">
                <h2 className="!text-[30px]">
                  無論你去哪裡旅行，
                  <br />
                  保持連線不斷網
                </h2>
                <p>
                  在 Jeko eSIM 探索經濟高效的旅遊和商務數據計劃，
                  <br />
                  隨時隨地無縫連接，無需昂貴的國際漫遊費
                </p>
              </div>
            </div>
          </div>

          <div className="hero-scroll-progress-bar" ref={progressBarRef}>
            <div className="plane-icon">
              <div className="plane-mask" />
            </div>
          </div>
        </section>

        <style jsx>{`
          @import url("https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap");

          .scroll-hero-wrapper {
            --light: #fff;
            --dark: #141414;
            --cabin: #3a3a3a;
            --accent-1: #dc5935;
            --accent-2: #d3ef76;
            font-family: "DM Sans", sans-serif;
            background-color: var(--cabin);
            color: var(--light);
            width: 100%;
            overflow: hidden;
          }

          .scroll-hero-wrapper :global(*) {
            box-sizing: border-box;
          }

          img {
            display: block;
          }

          h2 {
            font-weight: 400;
            line-height: 1.1;
            margin: 0;
            font-size: clamp(1.5rem, 2.25vw, 3rem);
          }

          p {
            font-size: 1.125rem;
            font-weight: 400;
            line-height: 1.4;
            margin: 0;
          }

          .hero {
            position: relative;
            width: 100%;
            height: 100svh;
            overflow: hidden;
            perspective: 1000px;
            color: var(--light);
            background-color: var(--cabin);
          }

          /* Window aperture — content only visible inside */
          .window-scene {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 22vw;
            height: 66vh;
            max-width: 340px;
            transform: translate(-50%, -50%);
            transform-origin: center center;
            overflow: hidden;
            z-index: 1;
            will-change: transform, opacity;
            border-radius: 3px;
          }

          .sky-container {
            position: absolute;
            inset: 0;
            height: 280%;
            will-change: transform;
          }

          .sky-container :global(.sky-bg) {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            will-change: opacity;
          }

          .cloud-container {
            position: absolute;
            top: -15%;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 2;
            overflow: hidden;
            pointer-events: none;
            will-change: opacity;
          }

          .cloud-track {
            display: flex;
            width: 200%;
            height: 100%;
            animation: heroCloudMarquee 60s linear infinite;
          }

          .cloud-track img {
            width: 50%;
            height: 100%;
            object-fit: cover;
            opacity: 0.9;
            -webkit-mask-image: linear-gradient(
              to right,
              transparent,
              black 10%,
              black 90%,
              transparent
            );
            mask-image: linear-gradient(
              to right,
              transparent,
              black 10%,
              black 90%,
              transparent
            );
          }

          @keyframes heroCloudMarquee {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }

          .map-layer {
            position: absolute;
            inset: 0;
            opacity: 0;
            will-change: opacity;
            z-index: 3;
          }

          .map-stage {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .map-frame {
            position: relative;
            max-width: 100%;
            max-height: 100%;
            line-height: 0;
          }

          .map-frame :global(.map-image) {
            display: block;
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            will-change: filter;
          }

          .map-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .hero-grid-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            will-change: opacity;
          }

          .hero-grid-overlay img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            opacity: 0.28;
          }

          .markers-layer {
            position: absolute;
            inset: 0;
          }

          .map-marker {
            position: absolute;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            opacity: 0;
            will-change: opacity;
          }

          .map-marker .marker-label {
            text-transform: uppercase;
            font-family: "DM Mono", monospace;
            font-size: 0.55rem;
            font-weight: 500;
            padding: 0.15rem 0.35rem;
            border-radius: 0.2rem;
            white-space: nowrap;
          }

          .map-marker .marker-icon {
            position: relative;
            width: 0.45rem;
            height: 0.45rem;
            border-radius: 2rem;
            flex-shrink: 0;
          }

          .map-marker .marker-icon::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 5rem;
            height: 5rem;
            border-radius: 100%;
            animation: pulse 1.5s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
          }

          .map-marker.accent-1 .marker-icon,
          .map-marker.accent-1 .marker-icon::before,
          .map-marker.accent-1 .marker-label {
            background-color: var(--accent-1);
            color: var(--light);
          }

          .map-marker.accent-2 .marker-icon,
          .map-marker.accent-2 .marker-icon::before,
          .map-marker.accent-2 .marker-label {
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

          .window-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100svh;
            z-index: 10;
            pointer-events: none;
            transform-origin: center center;
            will-change: transform, opacity;
          }

          .window-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .hero-content {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 200svh;
            display: flex;
            flex-direction: column;
            will-change: transform;
            z-index: 3;
            pointer-events: none;
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

          .hero-content .hero-content-block:nth-child(2) {
            align-items: flex-end;
          }

          .hero-content .hero-content-block:nth-child(3) {
            justify-content: flex-end;
            align-items: center;
          }

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
          }

          .plane-icon {
            position: absolute;
            left: 50%;
            top: calc(100% * var(--progress));
            transform: translate(-50%, -50%) rotate(180deg);
            z-index: 21;
            pointer-events: none;
          }

          .plane-mask {
            width: 1.5rem;
            height: 1.5rem;
            background-color: var(--light);
            -webkit-mask: url("/images/airplane-svgrepo-com.svg") no-repeat
              center / contain;
            mask: url("/images/airplane-svgrepo-com.svg") no-repeat center /
              contain;
          }

          @media (max-width: 800px) {
            .window-scene {
              width: 38vw;
              height: 52vh;
            }

            .map-marker .marker-label {
              font-size: 0.45rem;
              padding: 0.1rem 0.25rem;
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
