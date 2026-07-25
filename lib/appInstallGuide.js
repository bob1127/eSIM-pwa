/**
 * APP 安裝圖文教學（依裝置／瀏覽器載入對應步驟）
 * 圖片目錄：public/images/app-install/{ios|android|mac}/
 *
 * 注意：現有 ios/*.png 為 Chrome on iOS 截圖（⋯ → 分享）。
 * Safari 路徑不同，改用語意正確的步驟文案（分享步驟後與系統面板相同可沿用圖）。
 */

export const INSTALL_GUIDE_PLATFORMS = [
  "ios",
  "ios-chrome",
  "ios-safari",
  "android",
  "mac",
];

/** @typedef {'ios'|'ios-chrome'|'ios-safari'|'android'|'mac'} InstallGuidePlatform */

/**
 * @returns {InstallGuidePlatform}
 */
export function detectInstallGuidePlatform() {
  if (typeof navigator === "undefined") return "android";

  const ua = navigator.userAgent || "";
  const maxTouch = navigator.maxTouchPoints || 0;
  const isIpadOS =
    /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && maxTouch > 1);
  const isIOS = /iPhone|iPod/i.test(ua) || isIpadOS;

  if (isIOS) {
    if (/CriOS/i.test(ua)) return "ios-chrome";
    const isSafari =
      /Safari/i.test(ua) &&
      !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS/i.test(ua);
    if (isSafari) return "ios-safari";
    // Edge / Firefox on iOS：選單路徑接近 Chrome
    return "ios-chrome";
  }

  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";

  return "android";
}

export function getInstallGuideMeta(platform) {
  const map = {
    "ios-chrome": {
      title: "iPhone · Chrome 安裝教學",
      subtitle: "右下「⋯」→ 分享 → 加入主畫面，即可當 APP 使用",
      doneLabel: "我已加入主畫面",
    },
    "ios-safari": {
      title: "iPhone · Safari 安裝教學",
      subtitle: "底部分享圖示 → 加入主畫面，即可當 APP 使用",
      doneLabel: "我已加入主畫面",
    },
    ios: {
      title: "iPhone 安裝教學",
      subtitle: "加入主畫面即可當 APP 使用",
      doneLabel: "我已加入主畫面",
    },
    android: {
      title: "Android 安裝教學",
      subtitle: "依圖示步驟操作；若出現「安裝」視窗可直接確認",
      doneLabel: "我已安裝完成",
    },
    mac: {
      title: "Mac 安裝教學",
      subtitle: "Safari：分享 → 加入 Dock；Chrome 也可一鍵安裝",
      doneLabel: "我已加入 Dock",
    },
  };
  return map[platform] || map.android;
}

/**
 * @param {InstallGuidePlatform} platform
 * @returns {{ src: string, title: string, caption: string }[]}
 */
export function getInstallGuideSteps(platform) {
  // Safari：入口是分享圖示（非 ⋯）；進系統分享面板後與 Chrome 相同
  if (platform === "ios-safari") {
    return [
      {
        src: "/images/app-install/ios/step-04.png",
        title: "步驟 1／3",
        caption:
          "點 Safari 底部（或頂部）的「分享」圖示（方框＋向上箭頭）",
      },
      {
        src: "/images/app-install/ios/step-04.png",
        title: "步驟 2／3",
        caption: "在分享選單向下滑，選擇「加入主畫面」",
      },
      {
        src: "/images/app-install/ios/step-05.jpg",
        title: "步驟 3／3",
        caption: "右上角點「加入」即可完成安裝",
      },
    ];
  }

  // Chrome / 其他 Chromium on iOS（現有截圖）
  if (
    platform === "ios" ||
    platform === "ios-chrome"
  ) {
    return [
      {
        src: "/images/app-install/ios/step-01.png",
        title: "步驟 1／5",
        caption: "點選 Chrome 右下角的「⋯」選單",
      },
      {
        src: "/images/app-install/ios/step-02.png",
        title: "步驟 2／5",
        caption: "選擇「分享」",
      },
      {
        src: "/images/app-install/ios/step-03.png",
        title: "步驟 3／5",
        caption: "在分享選單向右滑，點「檢視較多」",
      },
      {
        src: "/images/app-install/ios/step-04.png",
        title: "步驟 4／5",
        caption: "選擇「加入主畫面」",
      },
      {
        src: "/images/app-install/ios/step-05.jpg",
        title: "步驟 5／5",
        caption: "右上角點「加入」即可完成安裝",
      },
    ];
  }

  if (platform === "mac") {
    return [
      {
        src: "/images/app-install/mac/step-01.png",
        title: "步驟 1／1",
        caption: "點分享圖標，選擇「加入 Dock 中」",
      },
    ];
  }

  return [
    {
      src: "/images/app-install/android/step-01.png",
      title: "步驟 1／4",
      caption: "點選瀏覽器的分享／選單圖標",
    },
    {
      src: "/images/app-install/android/step-02.png",
      title: "步驟 2／4",
      caption: "點「檢視較多」展開更多選項",
    },
    {
      src: "/images/app-install/android/step-03.png",
      title: "步驟 3／4",
      caption: "選擇「加入主畫面」或「安裝應用程式」",
    },
    {
      src: "/images/app-install/android/step-04.jpg",
      title: "步驟 4／4",
      caption: "確認後點「加入」完成安裝",
    },
  ];
}
