/**
 * 英國 — 重點特色（AI 摘要風）
 * 吃到飽：EE +（約 10Mbps／香港 IP）｜EE / Three +（FUP／波蘭 IP）
 * 每日／總量：EE / Three +
 * 前台單國頁勿寫歐包國數
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const UK_TELECOM_EE36 = "EE +";
export const UK_TELECOM_EE34 = "EE / Three +";

const EXP_10MBPS =
  "倫敦、曼徹斯特、愛丁堡、伯明罕等都會區 4G／5G 測速常見可到約 10Mbps 上限（方案限速）；地鐵、古蹟室內與鄉村會再下降。導航、傳訊、社群通常沒問題，高畫質影音與多人熱點會變慢。僅供參考。";

const EXP_FUP =
  "倫敦、曼徹斯特、愛丁堡、伯明罕等都會區 4G／5G 測速常見可到數十 Mbps；地鐵、古蹟室內與鄉村會下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

const EXP_TOTAL =
  "高速額度內：倫敦、曼徹斯特、愛丁堡、伯明罕等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後依方案斷網（總量型），請依 GB 數規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：倫敦、曼徹斯特、愛丁堡、伯明罕等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 512kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function ukEe36UnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為英國吃到飽（限速約 10Mbps）eSIM，走 EE／Three／Vodafone／O2，適合倫敦與主要城市傳訊、導航與社群。",
      "**基本介紹與特色**",
      "**市場地位：** EE、Three、Vodafone、O2 為英國四大主流電信，都會與機場沿線覆蓋穩定。",
      "**覆蓋範圍：** 倫敦、曼徹斯特、愛丁堡、伯明罕、湖區與主要交通沿線（地鐵、古蹟室內與鄉村會下降）。",
      "**網路速度：** 限速約 10Mbps 吃到飽；高畫質影音會受上限影響。",
      "**數據路由：** 香港 IP 漫遊。",
      "**本站方案：** 吃到飽；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_10MBPS,
  );
}

export function ukEe34UnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為英國吃到飽（FUP）eSIM，走 EE／Three／Vodafone／O2，適合自駕、城市走跳與出差。",
      "**基本介紹與特色**",
      "**市場地位：** EE 覆蓋最完整，Three／Vodafone／O2 補齊都會與交通樞紐。",
      "**覆蓋範圍：** 倫敦、曼徹斯特、愛丁堡、伯明罕與熱門觀光路線。",
      "**網路速度：** 吃到飽不限流量（FUP），可持續上網。",
      "**數據路由：** 波蘭 IP 漫遊。",
      "**本站方案：** 吃到飽；天數可選 1／3／5／7／10／15／20／30／60／90 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_FUP,
  );
}

export function ukUnlimited10MbpsKeyFeaturesByCarrier() {
  return { [UK_TELECOM_EE36]: ukEe36UnlimitedKeyFeatures() };
}

export function ukUnlimitedFupKeyFeaturesByCarrier() {
  return { [UK_TELECOM_EE34]: ukEe34UnlimitedKeyFeatures() };
}

export function ukEe34TotalKeyFeatures() {
  return pack(
    [
      "本方案為英國總量型 eSIM，走 EE／Three／Vodafone／O2，適合想控管總流量的訪英行程。",
      "**基本介紹與特色**",
      "**市場地位：** 英國四大主流電信，倫敦與主要城市較穩。",
      "**覆蓋範圍：** 倫敦、曼徹斯特、愛丁堡、伯明罕等熱門目的地。",
      "**網路速度：** 可選 1GB／3GB／5GB／10GB／20GB／30GB／50GB；高速額度用完即斷網。",
      "**數據路由：** 波蘭 IP 漫遊。",
      "**本站方案：** 總量型；天數 3／5／7／10／15／30 天（視流量組合）。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_TOTAL,
  );
}

export function ukTotalKeyFeaturesByCarrier() {
  return { [UK_TELECOM_EE34]: ukEe34TotalKeyFeatures() };
}

export function ukEe34DailyKeyFeatures() {
  return pack(
    [
      "本方案為英國每日型 eSIM，走 EE／Three／Vodafone／O2，適合想控管每日用量的旅客。",
      "**基本介紹與特色**",
      "**市場地位：** 英國四大主流電信，都會區覆蓋穩定。",
      "**覆蓋範圍：** 倫敦、曼徹斯特、愛丁堡、伯明罕等。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；高速用完後約 512kbps（每日重置）。",
      "**數據路由：** 波蘭 IP 漫遊。",
      "**本站方案：** 每日型；天數 1／3／5／7／10／15／20／30／60／90 天（視流量組合）。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_DAILY,
  );
}

export function ukDailyKeyFeaturesByCarrier() {
  return { [UK_TELECOM_EE34]: ukEe34DailyKeyFeatures() };
}

export default {
  UK_TELECOM_EE36,
  UK_TELECOM_EE34,
  ukUnlimited10MbpsKeyFeaturesByCarrier,
  ukUnlimitedFupKeyFeaturesByCarrier,
  ukTotalKeyFeaturesByCarrier,
  ukDailyKeyFeaturesByCarrier,
};
