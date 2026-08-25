/**
 * 土耳其 — 重點特色（AI 摘要風）
 * 電信：AVEA TURKEY / VODAFONE TURKEY +
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const TR_TELECOM_AVEA = "AVEA TURKEY / VODAFONE TURKEY +";

const EXP_UNLIM_10 =
  "伊斯坦堡、安卡拉、伊茲密爾、安塔利亞等都會區 4G／5G 測速常見可到數十 Mbps；卡帕多奇亞、海岸公路與偏遠地區會下降。每日 1GB 高速用完後限速約 10Mbps 可持續使用。僅供參考。";
const EXP_128 =
  "高速額度內：都會區測速常見可到數十 Mbps。用完後約 128kbps——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function trAveaUnlimited10MbpsKeyFeatures() {
  return pack(
    [
      "本方案為土耳其吃到飽 eSIM，走 Avea／Vodafone Turkey，出網為英國／波蘭 IP。",
      "**基本介紹與特色**",
      "**市場地位：** Avea（Türk Telekom）與 Vodafone Turkey 為當地主要電信。",
      "**覆蓋範圍：** 伊斯坦堡、安卡拉、伊茲密爾、安塔利亞、棉花堡、卡帕多奇亞等較穩；偏遠會下降。",
      "**網路速度：** 每日約 1GB 高速後維持約 10Mbps 無限流量。",
      "**數據路由：** 英國／波蘭 IP 漫遊。",
      "**本站方案：** 吃到飽；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_UNLIM_10,
  );
}

export function trUnlimitedKeyFeaturesByCarrier() {
  return { [TR_TELECOM_AVEA]: trAveaUnlimited10MbpsKeyFeatures() };
}

export function trAveaTotalKeyFeatures() {
  return pack(
    [
      "本方案為土耳其總量型 eSIM，走 Avea／Vodafone Turkey。",
      "**基本介紹與特色**",
      "**市場地位：** Avea／Vodafone Turkey 主流覆蓋。",
      "**覆蓋範圍：** 伊斯坦堡與主要觀光路線。",
      "**網路速度：** 可選 1GB～50GB；高速用完後約 128kbps 續航。",
      "**數據路由：** 英國／波蘭 IP 漫遊。",
      "**本站方案：** 總量型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_128,
  );
}

export function trTotalKeyFeaturesByCarrier() {
  return { [TR_TELECOM_AVEA]: trAveaTotalKeyFeatures() };
}

export function trAveaDailyKeyFeatures() {
  return pack(
    [
      "本方案為土耳其每日型 eSIM，走 Avea／Vodafone Turkey。",
      "**基本介紹與特色**",
      "**市場地位：** Avea／Vodafone Turkey 主流覆蓋。",
      "**覆蓋範圍：** 伊斯坦堡與主要觀光路線。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）。",
      "**數據路由：** 英國／波蘭 IP 漫遊。",
      "**本站方案：** 每日型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_128,
  );
}

export function trDailyKeyFeaturesByCarrier() {
  return { [TR_TELECOM_AVEA]: trAveaDailyKeyFeatures() };
}

export default {
  TR_TELECOM_AVEA,
  trUnlimitedKeyFeaturesByCarrier,
  trTotalKeyFeaturesByCarrier,
  trDailyKeyFeaturesByCarrier,
};
