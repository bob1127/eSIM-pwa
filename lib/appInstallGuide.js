/**
 * APP 安裝圖文教學（依裝置載入對應步驟圖）
 * 圖片目錄：public/images/app-install/{ios|android|mac}/
 */

export const INSTALL_GUIDE_PLATFORMS = ["ios", "android", "mac"];

/** @typedef {'ios'|'android'|'mac'} InstallGuidePlatform */

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

  if (/iPhone|iPod/i.test(ua) || isIpadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";

  // Windows／其他：Chrome 選單安裝流程較接近 Android 教學
  return "android";
}

export function getInstallGuideMeta(platform) {
  const map = {
    ios: {
      title: "iPhone 安裝教學",
      subtitle: "Safari／Chrome 皆可：加入主畫面即可當 APP 使用",
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
  if (platform === "ios") {
    return [
      {
        src: "/images/app-install/ios/step-01.png",
        title: "步驟 1／5",
        caption: "點選瀏覽器底部的「⋯」選單",
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

  // android
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
