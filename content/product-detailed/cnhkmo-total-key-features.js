/**
 * 中港澳總量型 — 重點特色（AI 摘要風）
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
      "本總量型方案走中國電信／聯通／CSL／澳門電訊，出網為新加坡 IP，於有效天數內共用固定總流量。",
      "**基本介紹與特色**",
      "**市場地位：** 四網互補，熱門城市覆蓋良好。",
      "**覆蓋範圍：** 中國大陸、香港、澳門。",
      "**網路速度：** 可選多種 GB／天數；高速用完後約 128kbps 續航。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 免 VPN 社群；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議預留流量緩衝；抵達後再啟用。",
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
