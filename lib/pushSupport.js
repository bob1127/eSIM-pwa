import { getServiceWorkerUrl } from "./pushSw";

/** 是否以 PWA 獨立模式開啟（主畫面 / Dock） */
export function isStandalonePWA() {
  if (typeof window === "undefined") return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/** 辨識瀏覽器環境 */
export function getBrowserContext() {
  if (typeof navigator === "undefined") {
    return {
      isIOS: false,
      isSafari: false,
      isChromeIOS: false,
      isMacDesktop: false,
      isStandalone: false,
    };
  }

  const ua = navigator.userAgent || "";
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isChromeIOS = /CriOS/i.test(ua);
  const isSafari =
    /Safari/.test(ua) &&
    !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS/.test(ua);
  const isMacDesktop = /Macintosh/.test(ua) && navigator.maxTouchPoints <= 1;

  return {
    isIOS,
    isSafari,
    isChromeIOS,
    isMacDesktop,
    isStandalone: isStandalonePWA(),
  };
}

/** iPhone 加入主畫面短提示（依瀏覽器） */
export function getIosAddToHomeHint() {
  const { isChromeIOS, isSafari } = getBrowserContext();
  if (isChromeIOS) {
    return "Chrome 右下「⋯」→「分享」→「加入主畫面」";
  }
  if (isSafari) {
    return "Safari 底部分享圖示 →「加入主畫面」";
  }
  // 其他 iOS 瀏覽器（Edge、Firefox 等）多半也是選單 → 分享
  return "瀏覽器選單 →「分享」→「加入主畫面」";
}

/** 偵測 Web Push 是否可用
 * Safari 不會把 PushManager 掛在 window 上，需改查 registration.pushManager
 */
export async function detectPushSupport() {
  const ctx = getBrowserContext();

  if (!("serviceWorker" in navigator)) {
    return {
      supported: false,
      reason: "no-service-worker",
      title: "此瀏覽器不支援推播",
      hint: "請使用 Chrome、Edge，或將本站加入主畫面 / Dock",
    };
  }

  if (!("Notification" in window)) {
    return {
      supported: false,
      reason: "no-notification",
      title: "此瀏覽器不支援通知",
      hint: "請將本站安裝到主畫面，或使用 Chrome / Edge",
    };
  }

  // iPhone / iPad 一般瀏覽器分頁：需先加入主畫面（Safari / Chrome 皆同，但操作路徑不同）
  if (ctx.isIOS && !ctx.isStandalone) {
    return {
      supported: false,
      reason: "ios-needs-pwa",
      needsPWA: true,
      title: "iPhone 需先安裝 App",
      hint: `${getIosAddToHomeHint()}（下方有圖文教學）`,
    };
  }

  // Chrome / Edge / Firefox
  if ("PushManager" in window) {
    return { supported: true, reason: "standard" };
  }

  // Safari（macOS 或 iOS 已從主畫面開啟）
  if (ctx.isSafari) {
    try {
      let reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) {
        reg = await navigator.serviceWorker.register(getServiceWorkerUrl());
      }
      if (reg?.pushManager) {
        return { supported: true, reason: "safari" };
      }
    } catch {
      /* fall through */
    }

    if (ctx.isMacDesktop) {
      return {
        supported: false,
        reason: "safari-mac-old",
        title: "此 Safari 版本不支援 Web Push",
        hint: "請更新 macOS / Safari，或 Safari 選單 → 加入 Dock",
      };
    }

    return {
      supported: false,
      reason: "safari-unsupported",
      title: "Safari 目前無法訂閱推播",
      hint: "iPhone：分享 → 加入主畫面；Mac：Safari → 加入 Dock",
    };
  }

  return {
    supported: false,
    reason: "unknown",
    title: "此瀏覽器不支援 Web Push",
    hint: "建議安裝到主畫面，或使用 Chrome / Edge",
  };
}
