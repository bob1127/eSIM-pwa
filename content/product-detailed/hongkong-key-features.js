/**
 * 香港三產品 — 重點特色／實際體驗（key_features_by_carrier）
 * 實際體驗勿加「小編實測」字眼
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const HK_UNLIMITED_TELECOM = "CSL / China Telecom HK";
export const HK_DAILY_TOTAL_TELECOM = "CSL / SmarTone";

/** 吃到飽｜CSL / China Telecom HK（香港 IP） */
export function hongkongUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **CSL／China Telecom HK（香港電信／中國電信香港）** 吃到飽 eSIM，出網為**香港 IP**，每日約 **1GB 高速**後維持約 **10Mbps** 無限流量。",
      "**為什麼選擇 CSL／中國電信香港？**",
      "**香港原生 IP**：連線接近在地用戶，適合地圖、交通 App 與一般上網。",
      "**雙網覆蓋**：CSL 與 China Telecom HK 互補，市區與機場沿線表現穩定。",
      "**每日高速＋10Mbps 吃到飽**：高速用完後仍可持續上網，適合整天有網的行程。",
      "**App／熱點**：本線路**不標示**支援熱點分享、ChatGPT、TikTok、Gemini（供應商未保證）。",
      "**安裝提醒**：建議抵達香港覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "每日 1GB 高速內：都會區測速常見可到數十 Mbps。進入約 10Mbps 後，測速多半約 7～12Mbps——導航、傳訊、網頁通常沒問題；720p 影音多數可看。僅供參考。",
  );
}

/** 每日型｜CSL / SmarTone（新加坡 IP） */
export function hongkongDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **CSL／SmarTone（香港電信／數碼通）** 每日型 eSIM，出網為**新加坡 IP**，可選每日高速額度。",
      "**為什麼選擇 CSL／SmarTone 每日型？**",
      "**雙網自動切換**：CSL 與 SmarTone 互補，移動中較不易斷線。",
      "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB；高速用完後一般降速至約 **128 kbps**（每日重置）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**4G／5G 覆蓋**：香港熱門區域與交通沿線覆蓋良好。",
      "**安裝提醒**：建議抵達香港覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "高速額度內：都會區測速常見可到數十 Mbps。用完後若降速至約 128kbps，僅適合傳訊與輕量網頁。新加坡 IP 下社群／影音一般可正常使用。僅供參考。",
  );
}

/** 總量型｜CSL / SmarTone（新加坡 IP） */
export function hongkongTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **CSL／SmarTone（香港電信／數碼通）** 總量型 eSIM，出網為**新加坡 IP**，於有效天數內共用固定總流量。",
      "**為什麼選擇 CSL／SmarTone 總量型？**",
      "**雙網自動切換**：CSL 與 SmarTone 互補，市區與離島移動較安心。",
      "**總量高速**：可選多種 GB／天數；高速用完後一般降速至約 **128 kbps**，建議預留流量緩衝。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**4G／5G 覆蓋**：香港熱門區域與交通沿線覆蓋良好。",
      "**安裝提醒**：建議抵達香港覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "高速額度內都會區測速常見可到數十 Mbps；進入約 128kbps 後僅適合傳訊。請預留餘量避免旅途中不夠用。新加坡 IP 下社群一般可正常使用。僅供參考。",
  );
}

export function hongkongUnlimitedKeyFeaturesByCarrier() {
  return { [HK_UNLIMITED_TELECOM]: hongkongUnlimitedKeyFeatures() };
}

export function hongkongDailyKeyFeaturesByCarrier() {
  return { [HK_DAILY_TOTAL_TELECOM]: hongkongDailyKeyFeatures() };
}

export function hongkongTotalKeyFeaturesByCarrier() {
  return { [HK_DAILY_TOTAL_TELECOM]: hongkongTotalKeyFeatures() };
}

export default {
  hongkongUnlimitedKeyFeatures,
  hongkongDailyKeyFeatures,
  hongkongTotalKeyFeatures,
  hongkongUnlimitedKeyFeaturesByCarrier,
  hongkongDailyKeyFeaturesByCarrier,
  hongkongTotalKeyFeaturesByCarrier,
};
