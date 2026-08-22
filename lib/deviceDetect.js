/**
 * 從 User-Agent 推斷裝置顯示名稱（無法取得精確型號時回退 OS 名稱）
 */

/** 常見 iOS 機型識別碼 → 顯示名稱（僅部分，其餘回退 iOS） */
const IOS_MODEL_NAMES = {
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,4": "iPhone 13 mini",
  "iPhone14,5": "iPhone 13",
  "iPhone13,1": "iPhone 12 mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
};

function cleanAndroidModel(raw) {
  if (!raw) return null;
  let name = raw.trim();
  name = name.replace(/^(zh-TW|zh-CN|en-US|en)[;\s]+/i, "");
  if (!name || /^Android/i.test(name) || name.length > 40) return null;
  return name;
}

/**
 * @returns {{ os: 'ios'|'mac'|'android'|'windows'|'other', displayLabel: string }}
 */
export function detectDeviceLabel() {
  if (typeof navigator === "undefined") {
    return { os: "other", displayLabel: "使用者" };
  }

  const ua = navigator.userAgent;
  const maxTouch = navigator.maxTouchPoints || 0;
  const isIpadOS =
    /iPad/.test(ua) || (navigator.platform === "MacIntel" && maxTouch > 1);

  const iosModelToken = ua.match(/(iPhone\d+,\d+|iPad\d+,\d+)/i)?.[1];
  const androidModel = cleanAndroidModel(
    ua.match(/Android[^;]*;\s([^)]+?)\s*(?:Build|\))/i)?.[1],
  );

  if (/iPhone/.test(ua) || (iosModelToken && iosModelToken.startsWith("iPhone"))) {
    const mapped = iosModelToken && IOS_MODEL_NAMES[iosModelToken];
    return {
      os: "ios",
      displayLabel: mapped || "iOS",
    };
  }

  if (isIpadOS) {
    return { os: "ios", displayLabel: "iPad" };
  }

  if (/Macintosh|Mac OS X/.test(ua) && maxTouch <= 1) {
    return { os: "mac", displayLabel: "Mac" };
  }

  if (/Android/.test(ua)) {
    return {
      os: "android",
      displayLabel: androidModel || "Android",
    };
  }

  if (/Windows/.test(ua)) {
    return { os: "windows", displayLabel: "Windows" };
  }

  return { os: "other", displayLabel: "使用者" };
}

/** 是否為 Chromium 系瀏覽器（Chrome / Edge 等，支援 beforeinstallprompt） */
export function isChromiumBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Chrome|Chromium|CriOS|Edg|OPR/.test(ua);
}

/** 是否為 Safari（不含 Chrome on Mac） */
export function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/.test(ua);
}

/** 左側區塊安裝提示文案（僅在 client 呼叫；SSR 請回 null） */
export function buildInstallHintText({ isStandalone } = {}) {
  if (isStandalone) return null;
  if (typeof navigator === "undefined") return null;

  const ua = navigator.userAgent || "";
  const maxTouch = navigator.maxTouchPoints || 0;
  const isIpadOS =
    /iPad/.test(ua) || (navigator.platform === "MacIntel" && maxTouch > 1);

  if (/iPhone|iPod/.test(ua) || isIpadOS) {
    if (/CriOS/i.test(ua)) {
      return "請 Chrome 右下「⋯」→「分享」→「加入主畫面」，再開啟推播或流量提醒。";
    }
    if (isSafariBrowser()) {
      return "請 Safari 底部分享圖示 →「加入主畫面」，再開啟推播或流量提醒。";
    }
    return "請瀏覽器選單 →「分享」→「加入主畫面」，再開啟推播或流量提醒。";
  }

  if (isChromiumBrowser()) {
    return "點「安裝 APP」即可下載；若按鈕尚未出現，請稍候或重新整理後再試。";
  }

  if (/Macintosh|Mac OS X/.test(ua) && maxTouch <= 1) {
    return "Mac Safari 使用者：Safari → 檔案 →「加入 Dock 中」。";
  }

  return "請先安裝 Jeko APP，再開啟推播或流量提醒。";
}
