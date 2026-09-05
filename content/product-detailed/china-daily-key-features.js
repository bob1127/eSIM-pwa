/**
 * 中國每日型 — 重點特色（AI 摘要風）
 * 電信：中國移動｜中國聯通 GPT + TikTok (CUCC)
 */
function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CN_DAILY_CMCC = "中國移動";
export const CN_DAILY_CUCC_TIKTOK = "中國聯通 GPT + TikTok (CUCC)";

export function chinaDailyCmccKeyFeatures() {
  return pack(
    [
      "本方案為中國移動每日型漫遊 eSIM，出網多為香港 IP，適合訪陸短中行程、想控管每日用量的旅客。",
      "**基本介紹與特色**",
      "**市場地位：** 走中國移動 4G／LTE／5G，國內覆蓋最廣的電信之一。",
      "**覆蓋範圍：** 北京、上海、廣州、深圳等主要城市與旅遊目的地。",
      "**網路速度：** 依每日額度提供高速；用完後多數約 128kbps（每日重置，以結帳頁為準）。",
      "**數據路由：** 香港 IP 漫遊；一般可免 VPN 使用常見社群（非保證每位用戶／每個時段）。",
      "**本站方案：** 每日型；支援熱點。標準移動方案不保證 TikTok／ChatGPT。",
      "**使用注意：** 若需 TikTok／ChatGPT，請改選 [CUCC+ 吃到飽](/product/china/china-unlimited-esim?data_amount=%E5%90%83%E5%88%B0%E9%A3%BD&days=20&telecom=cucc)。",
    ],
    "高速額度內都會區測速常見可到數十 Mbps；降速至約 128kbps 後僅適合傳訊。僅供參考。",
  );
}

export function chinaDailyCuccTiktokKeyFeatures() {
  return pack(
    [
      "本方案為中國聯通每日型漫遊 eSIM（GPT + TikTok），出網為新加坡 IP，適合需要社群與 AI 工具的訪陸旅客。",
      "**基本介紹與特色**",
      "**市場地位：** 走中國聯通 4G／LTE／5G，都會區覆蓋穩定。",
      "**覆蓋範圍：** 國內主要旅遊與商務城市。",
      "**網路速度：** 依每日額度提供高速；用完後多數約 128kbps（每日重置）。",
      "**數據路由：** 新加坡 IP；一般可免 VPN 使用 LINE／IG／FB。",
      "**本站方案：** 每日型；標示支援 ChatGPT、TikTok、Gemini 與熱點（實際依裝置與平台）。",
      "**使用注意：** 建議抵達大陸覆蓋範圍後再啟用。",
    ],
    "高速額度內都會區測速常見可到數十 Mbps；降速後僅適合傳訊。新加坡 IP 下社群一般可免 VPN。僅供參考。",
  );
}

export function chinaDailyKeyFeaturesByCarrier() {
  return {
    [CN_DAILY_CMCC]: chinaDailyCmccKeyFeatures(),
    [CN_DAILY_CUCC_TIKTOK]: chinaDailyCuccTiktokKeyFeatures(),
  };
}

export default {
  chinaDailyCmccKeyFeatures,
  chinaDailyCuccTiktokKeyFeatures,
  chinaDailyKeyFeaturesByCarrier,
};
