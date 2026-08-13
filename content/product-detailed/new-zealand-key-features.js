/**
 * 紐西蘭吃到飽／總量／每日型 — Vodafone
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const NZ_TELECOM_VF = "VODAFONE +";

const EXP_UNLIM_10 =
  "奧克蘭、威靈頓、基督城、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps；南島山區、偏遠公路與峽灣會明顯下降。每日 1GB 高速用完後限速約 10Mbps 可持續使用——導航、傳訊、社群通常沒問題，高畫質影音與熱點會變慢。出網為英國／波蘭 IP。僅供參考。";

export function nzVfUnlimited10MbpsKeyFeatures() {
  return pack(
    [
      "本方案為 **紐西蘭** 吃到飽 eSIM（批發 SKU `New Zealand -unlimited-*-A0`），覆蓋南北島主要城市與觀光路線。",
      "**為什麼選擇 Vodafone 10Mbps 吃到飽？**",
      "**Vodafone 4G／5G**：奧克蘭、威靈頓、基督城、皇后鎮、羅托魯瓦等熱門行程較穩。",
      "**每日 1GB 高速後約 10Mbps**：高速額度隔日重置；用完後限速約 10Mbps 可持續上網（非斷網）。",
      "**天數彈性**：1～10、15、20、25、30 天可選。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
      "**漫遊出口**：APN `plus`，出網英國／波蘭 IP。",
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
  "高速額度內：奧克蘭、威靈頓、基督城、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。出網為英國／波蘭 IP。僅供參考。";

export function nzVfTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **紐西蘭** 總量型 eSIM（批發 SKU `New Zealand -Total*-A0`），覆蓋南北島主要城市與觀光路線。",
      "**為什麼選擇 Vodafone 總量型？**",
      "**Vodafone 4G／5G**：奧克蘭、威靈頓、基督城、皇后鎮、羅托魯瓦等熱門行程較穩。",
      "**總量高速後約 128kbps**：可選 3GB／5GB／10GB／20GB／30GB／50GB；高速用完後降速可持續使用。",
      "**天數彈性**：3、5、7、10、15、20、25、30 天可選。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
      "**漫遊出口**：APN `plus`，出網英國／波蘭 IP。",
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
  "每日高速額度內：奧克蘭、威靈頓、基督城、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。出網為英國／波蘭 IP。僅供參考。";

export function nzVfDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **紐西蘭** 每日型 eSIM（批發 SKU `New Zealand -Daily*-A0/A1`），覆蓋南北島主要城市與觀光路線。",
      "**為什麼選擇 Vodafone 每日型？**",
      "**Vodafone 4G／5G**：奧克蘭、威靈頓、基督城、皇后鎮、羅托魯瓦等熱門行程較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**天數彈性**：1～10、15、20、25、30 天可選。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
      "**漫遊出口**：APN `plus`，出網英國／波蘭 IP。",
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
