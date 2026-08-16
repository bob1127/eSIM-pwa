/**
 * 紐西蘭吃到飽／總量／每日型 — Vodafone
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const NZ_TELECOM_VF = "VODAFONE +";

const NZ_CARRIER_INTRO =
  "Vodafone 紐西蘭（現品牌 One NZ）是當地主要電信之一，奧克蘭、威靈頓、基督城、皇后鎮與羅托魯瓦等熱門行程 4G／5G 覆蓋較完整；南島山區、峽灣與偏遠公路訊號會明顯下降。抵達即可上網、免換實體 SIM。";

const EXP_UNLIM_10 =
  "奧克蘭、威靈頓、基督城、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps；南島山區、偏遠公路與峽灣會明顯下降。每日 1GB 高速用完後限速約 10Mbps 可持續使用——導航、傳訊、社群通常沒問題，高畫質影音與熱點會變慢。僅供參考。";

export function nzVfUnlimited10MbpsKeyFeatures() {
  return pack(
    [
      "本方案為 **紐西蘭** 吃到飽 eSIM，覆蓋南北島主要城市與觀光路線。",
      NZ_CARRIER_INTRO,
      "**為什麼選擇 Vodafone 10Mbps 吃到飽？**",
      "**Vodafone 4G／5G**：奧克蘭、威靈頓、基督城、皇后鎮、羅托魯瓦等熱門行程較穩。",
      "**每日 1GB 高速後約 10Mbps**：高速額度隔日重置；用完後限速約 10Mbps 可持續上網（非斷網）。",
      "**天數彈性**：1～10、15、20、25、30 天可選。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達紐西蘭後再啟用 eSIM。",
    ],
    EXP_UNLIM_10,
  );
}

export function nzUnlimitedKeyFeaturesByCarrier() {
  return {
    [NZ_TELECOM_VF]: nzVfUnlimited10MbpsKeyFeatures(),
  };
}

const EXP_TOTAL =
  "高速額度內：奧克蘭、威靈頓、基督城、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

export function nzVfTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **紐西蘭** 總量型 eSIM，覆蓋南北島主要城市與觀光路線。",
      NZ_CARRIER_INTRO,
      "**為什麼選擇 Vodafone 總量型？**",
      "**Vodafone 4G／5G**：奧克蘭、威靈頓、基督城、皇后鎮、羅托魯瓦等熱門行程較穩。",
      "**總量高速後約 128kbps**：可選 3GB／5GB／10GB／20GB／30GB／50GB；高速用完後降速可持續使用。",
      "**天數彈性**：3、5、7、10、15、20、25、30 天可選。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達紐西蘭後再啟用 eSIM。",
    ],
    EXP_TOTAL,
  );
}

export function nzTotalKeyFeaturesByCarrier() {
  return {
    [NZ_TELECOM_VF]: nzVfTotalKeyFeatures(),
  };
}

const EXP_DAILY =
  "每日高速額度內：奧克蘭、威靈頓、基督城、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function nzVfDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **紐西蘭** 每日型 eSIM，覆蓋南北島主要城市與觀光路線。",
      NZ_CARRIER_INTRO,
      "**為什麼選擇 Vodafone 每日型？**",
      "**Vodafone 4G／5G**：奧克蘭、威靈頓、基督城、皇后鎮、羅托魯瓦等熱門行程較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**天數彈性**：1～10、15、20、25、30 天可選。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達紐西蘭後再啟用 eSIM。",
    ],
    EXP_DAILY,
  );
}

export function nzDailyKeyFeaturesByCarrier() {
  return {
    [NZ_TELECOM_VF]: nzVfDailyKeyFeatures(),
  };
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
