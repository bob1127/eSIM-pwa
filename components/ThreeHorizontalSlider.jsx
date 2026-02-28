// components/ThreeHorizontalSlider.jsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import Lenis from "@studio-freight/lenis";

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

export default function ThreeHorizontalSlider({ items = DEFAULT_ITEMS }) {
  const canvasRef = useRef(null);
  const sectionRef = useRef(null);
  const fpsRef = useRef(null);
  const progRef = useRef(null);

  useEffect(() => {
    if (!items || items.length === 0) return;

    let lenis = null;
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
        1000
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
        segmentsY
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
                drawH
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
                drawH
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
                drawH
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
                drawH
              );
            } else {
              ctx.drawImage(img, drawX, drawY, drawW, drawH);
            }

            ctx.fillText(
              title,
              rect.x + rect.width / 2,
              texCanvas.height * 0.5
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

      // === Lenis ===
      lenis = new Lenis({
        smoothWheel: true,
        smoothTouch: true,
        duration: 1.1,
        lerp: 0.08,
      });

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

        lenis.raf(time);

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
      lenis?.destroy?.();
      sceneCleanup?.();
    };
  }, [items]);

  return (
    <section
      ref={sectionRef}
      className="sliderSection bg-gradient-to-r from-[#0059b8] via-[#0071cf] to-[#0095e6]"
      style={{ height: "320vh" }}
    >
      <div className="stickyWrap bg-gradient-to-r from-[#0059b8] via-[#0071cf] to-[#0095e6]">
        <canvas ref={canvasRef} />

        <div className="title pointer-events-none mb-10 relative z-[10] mt-16 flex flex-col items-center justify-center px-4 text-center leading-none">
          <p className="max-w-[980px] text-[18px] font-semibold tracking-[0.12em] text-[#f5f4f3] md:text-[26px]">
            全球旅遊必備神器！免換實體卡
          </p>
          <p className="mt-3 text-[64px] font-extrabold tracking-[0.18em] text-[#f5f4f3] md:text-[96px]">
            eSIM
          </p>
          <p className="mt-4 max-w-[620px] text-[11px] leading-relaxed text-[#f5f4f3] md:text-[12px]">
            掃描 QR Code 即刻開通高速網路
            <br className="hidden md:block" />
            快速找到您想去的旅遊目的地的 eSIM 卡
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E5E9F2] px-1.5 py-1">
            <button className="pointer-events-auto rounded-full bg-[#0052FF] px-5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#003fd1]">
              HOME
            </button>
            <button className="pointer-events-auto rounded-full bg-transparent px-5 py-1.5 text-[11px] font-semibold text-[#0052FF] transition hover:text-[#003fd1]">
              PRODUCT
            </button>
          </div>
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
