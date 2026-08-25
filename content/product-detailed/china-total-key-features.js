/**
 * 中國總量型 — 重點特色（AI 摘要風）
 */
function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CN_TOTAL_CMCC = "CMCC+";
export const CN_TOTAL_CUCC = "CUCC+";

export function chinaTotalCmccKeyFeatures() {
  return pack(
    [
      "本方案為中國移動（CMCC+）總量型漫遊 eSIM，出網多為香港／新加坡 IP，依方案提供固定總流量。",
      "**基本介紹與特色**",
      "**市場地位：** 走中國移動 4G／5G，熱門城市覆蓋佳。",
      "**覆蓋範圍：** 北京、上海、廣州、深圳等國內主要目的地。",
      "**網路速度：** 多數方案高速用完後約 128kbps 續航；部分方案為用完斷網（購買前會標示）。",
      "**數據路由：** 香港／新加坡 IP 漫遊（實際依方案）。",
      "**本站方案：** 總量型；部分降速方案可支援 ChatGPT（實際依裝置／時段）。",
      "**使用注意：** 用完斷網方案請預留餘量；建議抵達後再啟用。",
    ],
    "降速方案：高速內都會區常見數十 Mbps，進入約 128kbps 後僅適合傳訊。用完斷網方案：流量歸零後無法上網。僅供參考。",
  );
}

export function chinaTotalCuccKeyFeatures() {
  return pack(
    [
      "本方案為中國聯通（CUCC+）總量型漫遊 eSIM，出網為新加坡 IP，多數方案高速用完後約 128kbps 續航。",
      "**基本介紹與特色**",
      "**市場地位：** 走中國聯通 4G／5G，都會與交通沿線覆蓋穩定。",
      "**覆蓋範圍：** 國內主要旅遊與商務城市。",
      "**網路速度：** 多數降速約 128kbps 續航；少數（如 7 天 1GB、15 天 2GB）用完斷網。",
      "**數據路由：** 新加坡 IP；一般可免 VPN 使用 LINE／IG／FB。",
      "**本站方案：** 總量型；多數支援熱點與 ChatGPT／TikTok／Gemini；APN e-ideas。",
      "**使用注意：** 選購時請確認是否標示「用完斷網」；建議抵達後再啟用。",
    ],
    "降速方案進入約 128kbps 後僅適合傳訊。用完斷網方案流量歸零後無法上網。新加坡 IP 下社群一般可免 VPN。僅供參考。",
  );
}

export function chinaTotalKeyFeaturesByCarrier() {
  return {
    [CN_TOTAL_CMCC]: chinaTotalCmccKeyFeatures(),
    [CN_TOTAL_CUCC]: chinaTotalCuccKeyFeatures(),
  };
}

export default {
  chinaTotalCmccKeyFeatures,
  chinaTotalCuccKeyFeatures,
  chinaTotalKeyFeaturesByCarrier,
};
