/**
 * 中港澳總量型 — 單一電信變體
 * 中國電信／聯通／CSL／澳門電訊（China Telecom / China Unicom / CSL / CTM）
 */
function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CNHKMO_TOTAL_TELECOM = "中國電信／聯通／CSL／澳門電訊";
export const CNHKMO_TOTAL_CARRIER_EN =
  "China Telecom / China Unicom / CSL / CTM";

export function cnhkmoTotalTcKeyFeatures() {
  return pack(
    [
      `本方案為**總量型**中港澳 eSIM，走**${CNHKMO_TOTAL_TELECOM}**（${CNHKMO_TOTAL_CARRIER_EN}），出網為**新加坡 IP**，於有效天數內共用固定總流量。`,
      "**為什麼選擇中港澳總量型？**",
      "**免 VPN 社群**：新加坡出口 IP，一般可直接使用 LINE、Instagram、Facebook（實際依當下路由；非保證每位用戶／每個時段）。",
      "**總量高速**：可選多種 GB／天數；高速用完後一般降速至約 **128 kbps**，建議預留流量緩衝。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**4G／5G 覆蓋**：大陸電信／聯通、香港 CSL、澳門 CTM，熱門城市覆蓋良好。",
      "**安裝提醒**：建議抵達覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "高速額度內都會區測速常見可到數十 Mbps；進入約 128kbps 後僅適合傳訊。請預留餘量。新加坡 IP 下 LINE／IG／FB／TikTok 一般可免 VPN，僅供參考。",
  );
}

export function cnhkmoTotalKeyFeaturesByCarrier() {
  return {
    [CNHKMO_TOTAL_TELECOM]: cnhkmoTotalTcKeyFeatures(),
  };
}

export default {
  cnhkmoTotalTcKeyFeatures,
  cnhkmoTotalKeyFeaturesByCarrier,
};
