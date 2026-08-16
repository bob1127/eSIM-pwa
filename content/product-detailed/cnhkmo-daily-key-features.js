/**
 * 中港澳每日型 — 重點特色
 */
export const CNHKMO_DAILY_TELECOM = "中國電信／聯通／CSL／澳門電訊";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export function cnhkmoDailyTcKeyFeatures() {
  return pack(
    [
      "本每日型方案走中國電信、中國聯通、香港 CSL、澳門電訊（CTM），出網為**新加坡 IP**，一卡涵蓋中國大陸、香港與澳門。",
      "**為什麼選擇中港澳每日型？**",
      "**免 VPN 社群**：新加坡出口 IP，一般可直接使用 LINE、Instagram、Facebook（實際依當下路由；非保證每位用戶／每個時段）。",
      "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB；高速用完後一般降速至約 128 kbps，另有每日 1GB（約 5Mbps 續航）選項。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**4G／5G 覆蓋**：大陸電信／聯通、香港 CSL、澳門 CTM，熱門城市覆蓋良好。",
      "**安裝提醒**：建議抵達覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "高速額度內：都會區測速常見可到數十 Mbps。用完後若降速至約 128kbps，測速約 0.1Mbps 等級，僅適合傳訊；若選 5Mbps 續航，導航／輕量網頁通常仍可用。新加坡 IP 下 LINE／IG／FB／TikTok 一般可免 VPN，僅供參考。",
  );
}

export default {
  cnhkmoDailyTcKeyFeatures,
};
