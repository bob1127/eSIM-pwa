/**
 * 紐西蘭 — 重點特色（AI 摘要風）
 * 電信：VODAFONE +（One NZ）
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const NZ_TELECOM_VF = "VODAFONE +";

const EXP_UNLIM_10 =
  "奧克蘭、威靈頓、基督城、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps；南島山區、偏遠公路與峽灣會明顯下降。每日 1GB 高速用完後限速約 10Mbps 可持續使用——導航、傳訊、社群通常沒問題，高畫質影音與熱點會變慢。僅供參考。";

const EXP_TOTAL =
  "高速額度內：奧克蘭、威靈頓、基督城、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：奧克蘭、威靈頓、基督城、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function nzVfUnlimited10MbpsKeyFeatures() {
  return pack(
    [
      "本方案為紐西蘭吃到飽 eSIM，走 Vodafone（現品牌 One NZ），覆蓋南北島主要城市與觀光路線。",
      "**基本介紹與特色**",
      "**市場地位：** Vodafone 紐西蘭（One NZ）是當地主要電信之一，熱門行程 4G／5G 覆蓋較完整。",
      "**覆蓋範圍：** 奧克蘭、威靈頓、基督城、皇后鎮、羅托魯瓦等較穩；南島山區、峽灣與偏遠公路訊號會下降。",
      "**網路速度：** 每日約 1GB 高速後維持約 10Mbps 無限流量（非斷網）。",
      "**本站方案：** 吃到飽；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_UNLIM_10,
  );
}

export function nzUnlimitedKeyFeaturesByCarrier() {
  return { [NZ_TELECOM_VF]: nzVfUnlimited10MbpsKeyFeatures() };
}

export function nzVfTotalKeyFeatures() {
  return pack(
    [
      "本方案為紐西蘭總量型 eSIM，走 Vodafone（One NZ），適合想控管總流量的訪紐行程。",
      "**基本介紹與特色**",
      "**市場地位：** Vodafone 紐西蘭（One NZ）主流覆蓋，南北島熱門城市表現穩定。",
      "**覆蓋範圍：** 奧克蘭、威靈頓、基督城、皇后鎮、羅托魯瓦等；山區與峽灣會下降。",
      "**網路速度：** 可選 3GB／5GB／10GB／20GB／30GB／50GB；高速用完後約 128kbps 續航。",
      "**本站方案：** 總量型；天數可選 3、5、7、10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_TOTAL,
  );
}

export function nzTotalKeyFeaturesByCarrier() {
  return { [NZ_TELECOM_VF]: nzVfTotalKeyFeatures() };
}

export function nzVfDailyKeyFeatures() {
  return pack(
    [
      "本方案為紐西蘭每日型 eSIM，走 Vodafone（One NZ），適合想控管每日用量的旅客。",
      "**基本介紹與特色**",
      "**市場地位：** Vodafone 紐西蘭（One NZ）主流覆蓋。",
      "**覆蓋範圍：** 奧克蘭、威靈頓、基督城、皇后鎮等熱門行程；南島山區訊號會下降。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；高速用完後約 128kbps（每日重置）。",
      "**本站方案：** 每日型；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_DAILY,
  );
}

export function nzDailyKeyFeaturesByCarrier() {
  return { [NZ_TELECOM_VF]: nzVfDailyKeyFeatures() };
}

export default {
  NZ_TELECOM_VF,
  nzVfUnlimited10MbpsKeyFeatures,
  nzUnlimitedKeyFeaturesByCarrier,
  nzVfTotalKeyFeatures,
  nzTotalKeyFeaturesByCarrier,
  nzVfDailyKeyFeatures,
  nzDailyKeyFeaturesByCarrier,
};
