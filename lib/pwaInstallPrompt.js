/**
 * PWA 安裝提示（依 PikFun 指南）
 * Android / Chrome / Edge：preventDefault 後由自訂按鈕呼叫 prompt()
 * iOS Safari：無 beforeinstallprompt，改顯示「加入主畫面」教學
 */

let installAvailable = false;
/** @type {BeforeInstallPromptEvent | null} */
let deferredPrompt = null;
const listeners = new Set();

function notify(available) {
  installAvailable = available;
  listeners.forEach((fn) => {
    try {
      fn(available);
    } catch {
      /* ignore */
    }
  });
}

function stashPrompt(event) {
  if (!event) return;
  try {
    event.preventDefault();
  } catch {
    /* already prevented */
  }
  deferredPrompt = event;
  if (typeof window !== "undefined") {
    window.__pwaDeferredPrompt = event;
    window.__pwaInstallAvailable = true;
  }
  notify(true);
}

function clearPrompt() {
  deferredPrompt = null;
  if (typeof window !== "undefined") {
    window.__pwaDeferredPrompt = null;
    window.__pwaInstallAvailable = false;
  }
  notify(false);
}

export function isPwaInstallAvailable() {
  return (
    installAvailable ||
    (typeof window !== "undefined" && !!window.__pwaInstallAvailable)
  );
}

export function getDeferredInstallPrompt() {
  if (deferredPrompt) return deferredPrompt;
  if (typeof window !== "undefined" && window.__pwaDeferredPrompt) {
    return window.__pwaDeferredPrompt;
  }
  return null;
}

export function subscribeInstallPrompt(listener) {
  listeners.add(listener);
  listener(isPwaInstallAvailable());
  return () => listeners.delete(listener);
}

export function initInstallPromptCapture() {
  if (typeof window === "undefined" || window.__pwaInstallPromptInit) return;
  window.__pwaInstallPromptInit = true;

  // _document 早期攔截的事件
  if (window.__pwaDeferredPrompt) {
    stashPrompt(window.__pwaDeferredPrompt);
  } else if (window.__pwaInstallAvailable) {
    notify(true);
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    stashPrompt(e);
    window.dispatchEvent(new Event("pwa-install-available"));
  });

  window.addEventListener("pwa-install-available", () => {
    if (window.__pwaDeferredPrompt) stashPrompt(window.__pwaDeferredPrompt);
    else notify(true);
  });

  window.addEventListener("appinstalled", () => {
    clearPrompt();
  });
}

/**
 * 觸發系統安裝對話框（需使用者手勢）
 * @returns {Promise<{ outcome: 'accepted' | 'dismissed' | 'unavailable' }>}
 */
export async function promptInstall() {
  const promptEvent = getDeferredInstallPrompt();
  if (!promptEvent || typeof promptEvent.prompt !== "function") {
    return { outcome: "unavailable" };
  }

  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    clearPrompt();
    return { outcome: choice?.outcome === "accepted" ? "accepted" : "dismissed" };
  } catch (err) {
    console.warn("[PWA] promptInstall failed:", err);
    return { outcome: "unavailable" };
  }
}
