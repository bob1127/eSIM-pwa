/**
 * 中港澳每日型 — 重點特色（AI 摘要風）
 */
export const CNHKMO_DAILY_TELECOM = "中國電信／聯通／CSL／澳門電訊";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export function cnhkmoDailyTcKeyFeatures() {
  return pack(
    [
      "本每日型方案走中國電信、中國聯通、香港 CSL、澳門電訊（CTM），出網為新加坡 IP，一卡涵蓋中港澳。",
      "**基本介紹與特色**",
      "**市場地位：** 四網互補，熱門城市覆蓋良好。",
      "**覆蓋範圍：** 中國大陸、香港、澳門。",
      "**網路速度：** 可選每日 500MB～3GB；用完後約 128kbps（另有約 5Mbps 續航選項）。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 免 VPN 社群；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達覆蓋範圍後再啟用。",
    ],
    "高速額度內：都會區測速常見可到數十 Mbps。用完後若降速至約 128kbps，測速約 0.1Mbps 等級，僅適合傳訊；若選 5Mbps 續航，導航／輕量網頁通常仍可用。新加坡 IP 下 LINE／IG／FB／TikTok 一般可免 VPN，僅供參考。",
  );
}

export default {
  cnhkmoDailyTcKeyFeatures,
};
