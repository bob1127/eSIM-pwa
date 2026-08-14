import confetti from "canvas-confetti";

const BRAND_COLORS = ["#1a56db", "#0A6CD0", "#24A148", "#FADE2B", "#ffffff"];

/**
 * 從按鈕元素位置噴出慶祝彩帶（canvas-confetti）
 * @param {HTMLElement | null} element
 * @param {import('canvas-confetti').Options} opts
 */
export function fireCelebrationConfettiFromElement(element, opts = {}) {
  if (typeof window === "undefined") return;

  let origin = { x: 0.5, y: 0.6 };

  if (element) {
    const rect = element.getBoundingClientRect();
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }

  const base = {
    origin,
    zIndex: 10000,
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
    ...opts,
  };

  confetti({
    ...base,
    particleCount: 90,
    spread: 72,
    startVelocity: 42,
    gravity: 0.9,
    ticks: 220,
  });

  window.setTimeout(() => {
    confetti({
      ...base,
      particleCount: 55,
      spread: 110,
      startVelocity: 32,
      scalar: 0.85,
      origin: { x: Math.max(0.1, origin.x - 0.12), y: origin.y },
    });
    confetti({
      ...base,
      particleCount: 55,
      spread: 110,
      startVelocity: 32,
      scalar: 0.85,
      origin: { x: Math.min(0.9, origin.x + 0.12), y: origin.y },
    });
  }, 120);

  window.setTimeout(() => {
    confetti({
      ...base,
      particleCount: 40,
      spread: 360,
      startVelocity: 18,
      scalar: 0.6,
      shapes: ["circle"],
    });
  }, 280);
}

/** 全畫面緞帶（綁定成功／完成申請） */
export function fireRibbonBurst() {
  if (typeof window === "undefined") return;
  fireCelebrationConfettiFromElement(null, {
    particleCount: 140,
    spread: 92,
    startVelocity: 52,
    origin: { x: 0.5, y: 0.22 },
  });
  window.setTimeout(() => {
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 58,
      origin: { x: 0, y: 0.45 },
      zIndex: 10000,
      colors: BRAND_COLORS,
    });
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 58,
      origin: { x: 1, y: 0.45 },
      zIndex: 10000,
      colors: BRAND_COLORS,
    });
  }, 160);
}
