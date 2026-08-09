/**
 * 中港澳 T+C（cnhkmo-tc-esim）— 每日型／總量型／吃到飽
 * 電信：中國電信／聯通／CSL／澳門電訊（China Telecom / China Unicom / CSL / CTM）
 */
function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CNHKMO_TC_DAILY = "每日型";
export const CNHKMO_TC_TOTAL = "總量型";
export const CNHKMO_TC_UNLIM = "吃到飽";

/** 按鈕／摘要用：中文＋英文電信商名 */
export const CNHKMO_TC_CARRIER_ZH =
  "中國電信／聯通／CSL／澳門電訊";
export const CNHKMO_TC_CARRIER_EN =
  "China Telecom / China Unicom / CSL / CTM";

export function cnhkmoTcDailyKeyFeatures() {
  return pack(
    [
      `本方案為**每日型**中港澳 eSIM，走**${CNHKMO_TC_CARRIER_ZH}**（${CNHKMO_TC_CARRIER_EN}），出網為**新加坡 IP**，一卡涵蓋中國大陸、香港與澳門。`,
      "**為什麼選擇每日型？**",
      "**免 VPN 社群**：新加坡出口 IP，一般可直接使用 LINE、Instagram、Facebook（實際依當下路由；非保證每位用戶／每個時段）。",
      "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB；高速用完後一般降速至約 **128 kbps**，另有每日 1GB（約 **5Mbps 續航**）選項。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
      "**4G／5G 覆蓋**：大陸電信／聯通、香港 CSL、澳門 CTM，熱門城市覆蓋良好。",
      "**安裝提醒**：建議抵達覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "高速額度內：都會區測速常見可到數十 Mbps。用完後若降速至約 128kbps，僅適合傳訊；若選 5Mbps 續航，導航／輕量網頁通常仍可用。新加坡 IP 下 LINE／IG／FB／TikTok 一般可免 VPN，僅供參考。",
  );
}

export function cnhkmoTcTotalKeyFeatures() {
  return pack(
    [
      `本方案為**總量型**中港澳 eSIM，走**${CNHKMO_TC_CARRIER_ZH}**（${CNHKMO_TC_CARRIER_EN}），出網為**新加坡 IP**，於有效天數內共用固定總流量。`,
      "**為什麼選擇總量型？**",
      "**免 VPN 社群**：新加坡出口 IP，一般可直接使用 LINE、Instagram、Facebook（實際依當下路由；非保證每位用戶／每個時段）。",
      "**總量高速**：可選多種 GB／天數組合；高速用完後一般降速至約 **128 kbps**，建議預留流量緩衝。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
      "**4G／5G 覆蓋**：大陸電信／聯通、香港 CSL、澳門 CTM。",
      "**安裝提醒**：建議抵達覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "高速額度內都會區測速常見可到數十 Mbps；進入約 128kbps 後僅適合傳訊。請預留餘量避免旅途中不夠用。新加坡 IP 下社群／TikTok 一般可免 VPN，僅供參考。",
  );
}

export function cnhkmoTcUnlimKeyFeatures() {
  return pack(
    [
      `本方案為**吃到飽**中港澳 eSIM。**11 天起**走**${CNHKMO_TC_CARRIER_ZH}**（${CNHKMO_TC_CARRIER_EN}），約 **10 Mbps**、新加坡 IP；**1–10 天**為短天數線路（中國電信／CSL／澳門電信，香港 IP）。`,
      "**為什麼選擇吃到飽？**",
      "**免 VPN 社群**：出網非中國大陸 IP，一般可直接使用 LINE、Instagram、Facebook（實際依當下路由）。",
      "**長天數約 10Mbps**：適合社群／影音；實際速度依位置與擁塞可能波動。",
      "**短天數（1–10 天）**：香港 IP 短天數線路，無限流量依 FUP；電信商組合與長天數略有不同（無聯通）。",
      "**支援熱點**：長天數方案選品標示支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "長天數進入 FUP 後測速多半約 7～12Mbps，導航／傳訊／社群通常沒問題，720p 影音多數可看。短天數香港 IP 下 LINE／IG／FB 一般可免 VPN。實際體驗僅供參考。",
  );
}

export function cnhkmoTcKeyFeaturesByCarrier() {
  return {
    [CNHKMO_TC_DAILY]: cnhkmoTcDailyKeyFeatures(),
    [CNHKMO_TC_TOTAL]: cnhkmoTcTotalKeyFeatures(),
    [CNHKMO_TC_UNLIM]: cnhkmoTcUnlimKeyFeatures(),
  };
}

export default {
  cnhkmoTcDailyKeyFeatures,
  cnhkmoTcTotalKeyFeatures,
  cnhkmoTcUnlimKeyFeatures,
  cnhkmoTcKeyFeaturesByCarrier,
};
