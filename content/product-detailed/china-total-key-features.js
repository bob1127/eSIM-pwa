/**
 * 中國總量型 — 重點特色／實際體驗
 */
function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CN_TOTAL_CMCC = "CMCC+";
export const CN_TOTAL_CUCC = "CUCC+";

export function chinaTotalCmccKeyFeatures() {
  return pack(
    [
      "本方案為 **中國移動（CMCC+）** 總量型漫遊 eSIM，出網多為**香港／新加坡 IP**，依方案提供固定總流量。",
      "**為什麼選擇中國移動總量型？**",
      "**兩種用量規則可選**：多數方案高速用完後降速至約 **128 kbps** 可持續使用；部分方案標示為**用完斷網**（流量歸零即無法上網，購買前會再提醒）。",
      "**ChatGPT**：部分降速方案可支援（實際依裝置／時段）；用完斷網方案通常不支援 TikTok／ChatGPT。",
      "**移動覆蓋**：走中國移動 4G／5G，熱門城市覆蓋佳。",
      "**安裝提醒**：建議抵達大陸覆蓋範圍後再啟用 eSIM。",
    ],
    "降速方案：高速額度內都會區測速常見可到數十 Mbps，進入約 128kbps 後僅適合傳訊。用完斷網方案：流量歸零後無法上網，請預留餘量。僅供參考。",
  );
}

export function chinaTotalCuccKeyFeatures() {
  return pack(
    [
      "本方案為 **中國聯通（CUCC+）** 總量型漫遊 eSIM，出網為**新加坡 IP**，多數方案高速用完後降速至約 **128 kbps**。",
      "**為什麼選擇中國聯通總量型？**",
      "**支援 ChatGPT、TikTok、Gemini** 與熱點分享（多數降速方案）。",
      "**少數用完斷網**：例如 **7天 1GB**、**15天 2GB** 流量歸零即無法上網，選購時會標示「用完斷網」，結帳前也會再提醒。",
      "**新加坡 IP**：一般可免 VPN 使用 LINE／IG／FB（實際依當下路由；非保證每位用戶／每個時段）。",
      "**聯通 4G／5G**：APN **e-ideas** 多數手機自動設定。",
      "**安裝提醒**：建議抵達大陸覆蓋範圍後再啟用 eSIM。",
    ],
    "降速方案：高速額度內都會區測速常見可到數十 Mbps，進入約 128kbps 後僅適合傳訊。用完斷網方案（如 7天1GB、15天2GB）：流量歸零後無法上網。新加坡 IP 下社群一般可免 VPN。僅供參考。",
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
