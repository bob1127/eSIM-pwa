// components/ThreeHorizontalSlider.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

const DEFAULT_ITEMS = [
  {
    src: "/images/Jeko_eSIM即買即用| 極客eSIM | Jeko eSIM.jpg",
    title: " ",
  },
  {
    src: "/images/如何開始使用eSIM|如何設定eSIM | 極客eSIM Jeko eSIM.jpg",
    title: " ",
  },
  { src: "/images/01.png", title: "World" },
  {
    src: "/images/Generated-Image-November-15,-2025---5_19PM.png",
    title: " ",
  },
  { src: "/images/立即使用.jpg", title: " " },
  {
    src: "/images/Jeko_eSIM即買即用| 極客eSIM | Jeko eSIM.jpg",
    title: " ",
  },
  {
    src: "/images/如何開始使用eSIM|如何設定eSIM | 極客eSIM Jeko eSIM.jpg",
    title: " ",
  },
];

/** 合作頁預設：專屬連結 / 專屬商店 */
export const COOPERATION_LIQUID_TABS = [
  {
    id: "referral",
    label: "專屬連結",
    eyebrow: "分享連結賺分潤，售價與官網相同",
    title: "專屬連結",
    lines: [
      "複製專屬推薦連結，貼到 LINE／社群即可開始推廣",
      "官網下單自動計入分潤・客服／行銷／SEO 由我們支援",
    ],
  },
  {
    id: "store",
    label: "專屬商店",
    eyebrow: "打造專屬商店風格，自動選品一鍵開通",
    title: "專屬商店",
    lines: [
      "自訂 Banner、店名、色系、Logo 與形象圖片",
      "AI 自動選品・一鍵開通・客服／行銷／SEO 全程支援",
    ],
  },
];

export default function ThreeHorizontalSlider({
  items = DEFAULT_ITEMS,
  /** 背景 class；about 維持預設藍漸層，合作頁可改淺底 */
  backgroundClassName = "bg-gradient-to-r from-[#0059b8] via-[#0071cf] to-[#0095e6]",
  /** dark = 白字（藍底）；light = 深字（淺底） */
  textTone = "dark",
  /** false 時只留標題區，不跑下方 3D 圖片橫滑（合作頁用） */
  showGallery = true,
  /**
   * 有傳入時啟用液態切換＋依 tab 換文案（合作頁）
   * 未傳入則維持 HOME / PRODUCT 靜態（about）
   */
  liquidTabs = null,
  /** 受控：與下方區塊同步切換 */
  activeTab: controlledTab = undefined,
  onActiveTabChange,
}) {
  const canvasRef = useRef(null);
  const sectionRef = useRef(null);
  const fpsRef = useRef(null);
  const progRef = useRef(null);
  const tabs =
    Array.isArray(liquidTabs) && liquidTabs.length >= 2 ? liquidTabs : null;
  const [internalTab, setInternalTab] = useState(tabs?.[0]?.id || "referral");
  const activeTab =
    controlledTab !== undefined && controlledTab !== null
      ? controlledTab
      : internalTab;
  const setActiveTab = (id) => {
    setInternalTab(id);
    onActiveTabChange?.(id);
  };
  const activeContent =
    tabs?.find((t) => t.id === activeTab) || tabs?.[0] || null;

  const titleClass = textTone === "light" ? "text-slate-800" : "text-[#f5f4f3]";
  const headingClass =
    textTone === "light" ? "text-slate-900" : "text-[#f5f4f3]";
  const subClass = textTone === "light" ? "text-slate-600" : "text-[#f5f4f3]";

  useEffect(() => {
    if (!showGallery) return;
    if (!items || items.length === 0) return;

    let rafId = null;
    let disposed = false;
    let resizeTimeout = null;
    let sceneCleanup = null;

    const SHOW_DEBUG = false;

    // FPS Monitor
    let lastTime = performance.now();
    let frameCount = 0;
    function updateFPS(now) {
      frameCount++;
      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;
        if (SHOW_DEBUG && fpsRef.current) {
          fpsRef.current.textContent = `FPS: ${fps}`;
        }
      }
    }

    const total = items.length;
    const images = [];
    let loaded = 0;

    // === Load Images ===
    items.forEach((item, index) => {
      const img = new Image();
      img.onload = checkLoaded;
      img.onerror = () => {
        console.warn(`Failed to load image: ${item.src}`);
        checkLoaded();
      };
      // Important for cross-origin images if your images are hosted elsewhere
      img.crossOrigin = "anonymous";
      img.src = item.src;
      images[index] = img;
    });

    function checkLoaded() {
      loaded++;
      if (loaded === total) {
        sceneCleanup = init();
      }
    }

    // === Section Progress ===
    function sectionProgress() {
      const el = sectionRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return 0;
      return Math.max(0, Math.min(1, -rect.top / totalScrollable));
    }

    // === Init Three.js ===
    function init() {
      if (disposed) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      );

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance",
        alpha: true, // Allow transparency
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0); // Transparent background
      renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color output

      // === Curved Geometry ===
      const parentWidth = 70;
      const parentHeight = 18;
      const curvature = 25;
      const segmentsX = 96;
      const segmentsY = 48;
      const geometry = new THREE.PlaneGeometry(
        parentWidth,
        parentHeight,
        segmentsX,
        segmentsY,
      );

      const pos = geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i];
        const dist = Math.abs(x / (parentWidth / 2));
        pos[i + 2] = Math.pow(dist, 2) * curvature;
      }
      geometry.computeVertexNormals();

      // === Texture Canvas ===
      const texCanvas = document.createElement("canvas");
      const ctx = texCanvas.getContext("2d");

      // High resolution for sharpness
      texCanvas.width = 4096;
      texCanvas.height = 1024;

      const texture = new THREE.CanvasTexture(texCanvas);

      // === CRITICAL FIXES FOR COLOR AND SHARPNESS ===
      // 1. Correct Color Space for texture
      texture.colorSpace = THREE.SRGBColorSpace;

      // 2. Disable mipmaps for canvas textures that update frequently to prevent blurring
      texture.generateMipmaps = false;

      // 3. Use LinearFilter for minFilter (since we disabled mipmaps)
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // === Camera ===
      camera.position.set(0, 4, 28);
      camera.lookAt(0, 0, 0);

      // === Slides Config ===
      const fixedRatio = 1;
      const totalSlides = total;
      const slideWidth = 8;
      const gap = 1.4;
      const cycleWidth = totalSlides * (slideWidth + gap);

      function updateTexture(offset = 0) {
        ctx.clearRect(0, 0, texCanvas.width, texCanvas.height);

        const fontSize = 92;
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";

        const extra = 2;
        for (let i = -extra; i < totalSlides + extra; i++) {
          let slideX = i * (slideWidth + gap);
          slideX += offset * cycleWidth;
          const textureX = (slideX / cycleWidth) * texCanvas.width;
          let wrappedX = textureX % texCanvas.width;
          if (wrappedX < 0) wrappedX += texCanvas.width;

          const idx = ((i % totalSlides) + totalSlides) % totalSlides;
          const rect = {
            x: wrappedX,
            y: texCanvas.height * 0.22,
            width: (slideWidth / cycleWidth) * texCanvas.width,
            height: texCanvas.height * 0.56,
          };

          let drawW = rect.width;
          let drawH = drawW / fixedRatio;
          if (drawH > rect.height) {
            drawH = rect.height;
            drawW = drawH * fixedRatio;
          }
          const drawX = rect.x + (rect.width - drawW) / 2;
          const drawY = rect.y + (rect.height - drawH) / 2;

          const img = images[idx];
          const title = items[idx]?.title || "";

          // Added safety checks
          if (img && img.complete && img.naturalWidth > 0) {
            const overflowR = drawX + drawW - texCanvas.width;

            if (overflowR > 0) {
              ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                drawX,
                drawY,
                drawW - overflowR,
                drawH,
              );
              ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                0,
                drawY,
                overflowR,
                drawH,
              );
            } else if (drawX < 0) {
              const overflowL = -drawX;
              ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                0,
                drawY,
                drawW - overflowL,
                drawH,
              );
              ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                texCanvas.width - overflowL,
                drawY,
                overflowL,
                drawH,
              );
            } else {
              ctx.drawImage(img, drawX, drawY, drawW, drawH);
            }

            ctx.fillText(
              title,
              rect.x + rect.width / 2,
              texCanvas.height * 0.5,
            );
          }
        }
        texture.needsUpdate = true;
      }

      // === Scroll Parallax ===
      function applyScrollParallax(p) {
        mesh.rotation.y = THREE.MathUtils.degToRad((p - 0.5) * 6);

        mesh.position.y = (p - 0.5) * 0.6 - 3.5;
      }

      // === Pointer Parallax ===
      let pointerX = 0,
        pointerY = 0;
      let pointerMoved = false;

      const onPointerMove = (e) => {
        pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
        pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
        pointerMoved = true;
      };

      window.addEventListener("pointermove", onPointerMove, { passive: true });

      function applyPointerParallax() {
        const targetX = -pointerY * 0.03;
        const targetY = pointerX * 0.05;
        mesh.rotation.x += (targetX - mesh.rotation.x) * 0.08;
        mesh.rotation.y += (targetY - mesh.rotation.y) * 0.08;
      }

      // === Lenis 平滑滾動已全站停用，改用原生滾動 ===

      let currentP = sectionProgress();
      let targetP = currentP;
      let lastRenderedOffset = -999;

      // Initial Render
      updateTexture(-currentP);
      applyScrollParallax(currentP);
      renderer.render(scene, camera);

      const SMOOTH_FACTOR = 0.15;
      const PROGRESS_EPS = 0.0008;

      function raf(time) {
        if (disposed) return;

        const rawP = sectionProgress();
        targetP = rawP;

        const delta = targetP - currentP;
        if (Math.abs(delta) > PROGRESS_EPS) {
          currentP += delta * SMOOTH_FACTOR;
        }

        const offset = -currentP;
        if (Math.abs(offset - lastRenderedOffset) > PROGRESS_EPS) {
          updateTexture(offset);
          applyScrollParallax(currentP);
          renderer.render(scene, camera);
          lastRenderedOffset = offset;

          if (SHOW_DEBUG && progRef.current) {
            progRef.current.textContent = `progress: ${currentP.toFixed(3)}`;
          }
        }

        if (pointerMoved) {
          applyPointerParallax();
          renderer.render(scene, camera);
          pointerMoved = false;
        }

        updateFPS(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);

      // === Resize ===
      const onResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

          const p = sectionProgress();
          currentP = p;
          targetP = p;
          updateTexture(-p);
          applyScrollParallax(p);
          renderer.render(scene, camera);
          lastRenderedOffset = -p;
        }, 150);
      };

      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointerMove);
        clearTimeout(resizeTimeout);
        geometry.dispose();
        material.dispose();
        texture.dispose();
        renderer.dispose();
      };
    }

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      sceneCleanup?.();
    };
  }, [items, showGallery]);

  return (
    <section
      ref={sectionRef}
      className={`sliderSection ${backgroundClassName}`.trim()}
      style={{ height: showGallery ? "320vh" : "auto" }}
    >
      <div
        className={`stickyWrap ${backgroundClassName}`.trim()}
        style={
          showGallery
            ? undefined
            : { position: "relative", height: "auto", minHeight: "auto" }
        }
      >
        {showGallery && <canvas ref={canvasRef} />}

        <div
          className={`title relative z-[10] flex flex-col items-center justify-center px-4 text-center leading-none ${
            showGallery
              ? "pointer-events-none mb-10 mt-16"
              : "pointer-events-auto py-16 md:py-24"
          }`}
        >
          <div className="relative w-full max-w-[980px] min-h-[200px] md:min-h-[240px] flex flex-col items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeContent?.id || "default"}
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <p
                  className={`max-w-[980px] text-[18px] font-semibold tracking-[0.12em] md:text-[26px] ${titleClass}`}
                >
                  {activeContent?.eyebrow || "全球旅遊必備神器！免換實體卡"}
                </p>
                <p
                  className={`mt-3 text-[52px] font-extrabold tracking-[0.08em] md:text-[88px] md:tracking-[0.14em] ${headingClass}`}
                >
                  {activeContent?.title || "eSIM"}
                </p>
                <p
                  className={`mt-4 max-w-[620px] text-[11px] leading-relaxed md:text-[12px] ${subClass}`}
                >
                  {activeContent?.lines ? (
                    <>
                      {activeContent.lines[0]}
                      <br className="hidden md:block" />
                      {activeContent.lines[1]}
                    </>
                  ) : (
                    <>
                      掃描 QR Code 即刻開通高速網路
                      <br className="hidden md:block" />
                      快速找到您想去的旅遊目的地的 eSIM 卡
                    </>
                  )}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {tabs ? (
            <div
              className="mt-6 relative inline-flex items-center rounded-full bg-[#E5E9F2] p-1.5"
              role="tablist"
              aria-label="合作模式切換"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative min-w-[7.5rem] rounded-full px-5 py-2 text-[11px] md:text-[12px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]/40"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="cooperation-liquid-pill"
                        className="absolute inset-0 rounded-full bg-[#0052FF] shadow-[0_6px_16px_rgba(0,82,255,0.28)]"
                        transition={{
                          type: "spring",
                          stiffness: 520,
                          damping: 36,
                          mass: 0.65,
                        }}
                        style={{ borderRadius: 9999 }}
                      />
                    )}
                    <motion.span
                      className="relative z-[1] inline-block"
                      animate={{
                        color: isActive ? "#ffffff" : "#0052FF",
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {tab.label}
                    </motion.span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E5E9F2] px-1.5 py-1 pointer-events-none">
              <button
                type="button"
                className="rounded-full bg-[#0052FF] px-5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
              >
                HOME
              </button>
              <button
                type="button"
                className="rounded-full bg-transparent px-5 py-1.5 text-[11px] font-semibold text-[#0052FF]"
              >
                PRODUCT
              </button>
            </div>
          )}
        </div>

        <div className="overlay" />

        <div className="debug" style={{ display: "none" }}>
          <span ref={fpsRef}>FPS: -</span>
          <span ref={progRef} style={{ marginLeft: 12 }}>
            progress: -
          </span>
        </div>
      </div>

      <style jsx>{`
        .sliderSection {
          position: relative;
          width: 100%;
          color: #111;
        }
        .stickyWrap {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
        }
        canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }
        .overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .debug {
          position: absolute;
          left: 12px;
          bottom: 12px;
          z-index: 99;
          font-size: 12px;
          opacity: 0.8;
          user-select: none;
          pointer-events: none;
          color: #fff;
          background: rgba(0, 0, 0, 0.5);
          padding: 4px 8px;
          border-radius: 4px;
        }
      `}</style>
    </section>
  );
}
