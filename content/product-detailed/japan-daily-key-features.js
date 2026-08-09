/**
 * 日本每日型 daily-jp — 重點特色／實際體驗（key_features_by_carrier）
 */
export const JP_DAILY_TELECOM_SB_KDDI = "SoftBank / KDDI";
export const JP_DAILY_TELECOM_SOFTBANK =
  "SoftBank（注意：Android 通常需手動 APN）";
export const JP_DAILY_TELECOM_IIJ =
  "IIJ Docomo（注意：需手動設定 APN）";
export const JP_DAILY_TELECOM_TRIPLE = "KDDI / SoftBank / Docomo +";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

/** SoftBank / KDDI：Japan(KDDI+SB)(T+C) 雙網漫遊、新加坡 IP、APN e-ideas */
export function softbankKddiDailyKeyFeatures() {
  return pack(
    [
      "本方案走日本 **KDDI／SoftBank** 雙網（T+C），出網為**新加坡 IP**，APN **e-ideas** 自動設定，適合想少設定、雙網切換找訊號的旅客。",
      "**為什麼選擇 SoftBank／KDDI 每日型？**",
      "**雙網自動切換**：KDDI 與 SoftBank 4G／5G，熱門城市與交通沿線覆蓋互補，移動中較不易斷線。",
      "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB；高速用完後一般降速至約 128 kbps，隔日重置。",
      "**安裝即用**：多數手機可自動帶入 APN。建議在台灣機場先安裝設定好，抵達當地再啟用 eSIM。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
      "**適合誰**：短途／多日行程、偏好雙網穩定、不想手動設 APN 的旅客（相對 SoftBank 單網手動 APN／IIJ Docomo）。",
    ],
    "高速額度內：東京／大阪等都會區測速常見可到數十 Mbps（視訊號與負載而定）。高速用完後降速至約 128kbps，測速約 0.1Mbps 等級——傳訊／輕量網頁勉強可以，影音與即時導航會明顯困難。新加坡 IP 下多數社群可正常使用，僅供參考。",
  );
}

/**
 * KDDI／SoftBank／Docomo 三網切換（Japan-Daily*）
 * APN mobile.three.com.hk 自動｜香港 IP｜漫遊
 */
export function kddiSoftbankDocomoDailyKeyFeatures() {
  return pack(
    [
      "本方案為日本 **KDDI／SoftBank／Docomo 三網切換** 每日型 eSIM（漫遊線路），出網為**香港 IP**，APN **mobile.three.com.hk 自動設定**。",
      "**為什麼選擇三網切換每日型？**",
      "**三網自動切換**：單一 eSIM 可在 KDDI、SoftBank、Docomo 間切換找訊號，覆蓋互補、移動中較不易斷線。",
      "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB；高速用完後一般降速至約 128 kbps，隔日重置。",
      "**安裝即用**：多數手機可自動帶入 APN。建議在台灣機場先安裝設定好，抵達當地再啟用 eSIM。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
      "**適合誰**：行程長、跨區移動多，想要三網備援且不想手動設 APN 的旅客。",
    ],
    "高速額度內：都會區測速常見可到數十 Mbps（視當下連上的電信與訊號而定）。高速用完後約 128kbps 等級，僅適合傳訊。香港 IP 下多數社群可正常使用，僅供參考。",
  );
}

/**
 * SoftBank 單網（JapanSB-Daily*／plus.4g）
 * 選品標自動設定，但實務上大部分 Android 仍需手動設 APN
 */
export function softbankManualApnDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **SoftBank 單網** 每日型 eSIM（**漫遊線路**），走 SoftBank 4G／5G、出網為**日本 IP**，APN 為 **plus.4g**。",
      "**為什麼選擇 SoftBank 每日型？**",
      "**漫遊 eSIM｜日本 IP**：出網為日本 IP，在地服務／導航／社群通常較順。",
      "**每日高速額度**：可選每日 1GB／2GB／3GB／5GB／10GB；高速用完後一般降速至約 128 kbps，隔日重置。",
      "**APN 提醒**：iPhone 多半會自動帶入；**大部分 Android 手機通常需另外手動設定 APN：plus.4g**（用戶名 plus／密碼 4g／CHAP）。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議在台灣機場先安裝設定好；抵達日本、於 SoftBank 覆蓋範圍內再啟用。",
    ],
    "高速額度內：熱門城市測速常見可到數十 Mbps。用完後約 128kbps 等級，僅適合傳訊。日本 IP 對在地 App／網站通常較順。Android 若未設 plus.4g 可能有訊號但無法上網——請先確認 APN。僅供參考。",
  );
}

/** @deprecated 舊名；實際為 SoftBank 單網漫遊（非原生） */
export function softbankNativeDailyKeyFeatures() {
  return softbankManualApnDailyKeyFeatures();
}

/** IIJ Docomo 原生：日本 IP、APN vmobile.jp（需手動） */
export function iijDocomoDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **IIJ Docomo（DOCOMO 網路）原生** 每日型，走 Docomo 4G／LTE、**日本 IP**，適合偏好 Docomo 覆蓋的旅客。",
      "**為什麼選擇 IIJ Docomo 每日型？**",
      "**日本原生 IP**：當地出口，延遲低、連線接近在地用戶體驗。",
      "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB；高速用完後依方案降速至約 200／256 kbps，隔日重置。",
      "**需手動設定 APN**：安裝後請設定 APN 為 **vmobile.jp**（供應商特殊說明；購買前會再提醒）。",
      "**啟用方式**：建議在台灣機場先安裝設定好；抵達日本後連上網路時再啟用。",
      "**支援熱點**：可熱點分享；實際可用 App 依當下網路與設定而定。",
    ],
    "高速額度內：都會區測速常見可到數十 Mbps。用完後約 200～256kbps，傳訊／輕量網頁通常可用，影音偏卡。若未手動設定 vmobile.jp，常見狀況是有訊號但無法上網。僅供參考。",
  );
}

/** 給 Medusa metadata 用的完整 map（鍵＝前台電信商選項值） */
export function japanDailyKeyFeaturesByCarrier() {
  return {
    [JP_DAILY_TELECOM_SB_KDDI]: softbankKddiDailyKeyFeatures(),
    [JP_DAILY_TELECOM_TRIPLE]: kddiSoftbankDocomoDailyKeyFeatures(),
    [JP_DAILY_TELECOM_SOFTBANK]: softbankManualApnDailyKeyFeatures(),
    SoftBank: softbankManualApnDailyKeyFeatures(),
    "SoftBank（注意：Android 通常需手動 APN）": softbankManualApnDailyKeyFeatures(),
    [JP_DAILY_TELECOM_IIJ]: iijDocomoDailyKeyFeatures(),
    "IIJ Docomo": iijDocomoDailyKeyFeatures(),
  };
}

export default {
  softbankKddiDailyKeyFeatures,
  kddiSoftbankDocomoDailyKeyFeatures,
  softbankManualApnDailyKeyFeatures,
  softbankNativeDailyKeyFeatures,
  iijDocomoDailyKeyFeatures,
  japanDailyKeyFeaturesByCarrier,
};
