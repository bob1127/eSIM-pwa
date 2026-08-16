/**
 * 土耳其吃到飽／總量／每日型 — Avea / Vodafone
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const TR_TELECOM_AVEA = "AVEA TURKEY / VODAFONE TURKEY +";

const TR_CARRIER_INTRO =
  "Avea（現為 Türk Telekom 行動網）與 Vodafone Turkey 是土耳其主要電信。伊斯坦堡歐亞兩岸、安卡拉、伊茲密爾、安塔利亞與棉花堡、卡帕多奇亞等觀光路線 4G／5G 覆蓋較完整；海岸公路與偏遠地區會下降。抵達即可上網、免換實體 SIM。";

const EXP_UNLIM_10 =
  "伊斯坦堡、安卡拉、伊茲密爾、安塔利亞等都會區 4G／5G 測速常見可到數十 Mbps；卡帕多奇亞、海岸公路與偏遠地區會下降。每日 1GB 高速用完後限速約 10Mbps 可持續使用——導航、傳訊、社群通常沒問題，高畫質影音與熱點會變慢。僅供參考。";

export function trAveaUnlimited10MbpsKeyFeatures() {
  return pack(
    [
      "本方案為 **土耳其** 吃到飽 eSIM，覆蓋伊斯坦堡與主要觀光路線。",
      TR_CARRIER_INTRO,
      "**為什麼選擇 AVEA／Vodafone 10Mbps 吃到飽？**",
      "**Avea／Vodafone Turkey 4G／5G**：伊斯坦堡、安卡拉、伊茲密爾、安塔利亞、棉花堡等熱門行程較穩。",
      "**每日 1GB 高速後約 10Mbps**：高速額度隔日重置；用完後限速約 10Mbps 可持續上網（非斷網）。",
      "**天數彈性**：1～10、15、20、25、30 天可選。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達土耳其後再啟用 eSIM。",
    ],
    EXP_UNLIM_10,
  );
}

export function trUnlimitedKeyFeaturesByCarrier() {
  return {
    [TR_TELECOM_AVEA]: trAveaUnlimited10MbpsKeyFeatures(),
  };
}

const EXP_TOTAL =
  "高速額度內：伊斯坦堡、安卡拉、伊茲密爾、安塔利亞等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

export function trAveaTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **土耳其** 總量型 eSIM，覆蓋伊斯坦堡與主要觀光路線。",
      TR_CARRIER_INTRO,
      "**為什麼選擇 AVEA／Vodafone 總量型？**",
      "**Avea／Vodafone Turkey 4G／5G**：伊斯坦堡、安卡拉、伊茲密爾、安塔利亞、棉花堡等熱門行程較穩。",
      "**總量高速後約 128kbps**：可選 1GB／3GB／5GB／10GB／20GB／30GB／50GB；高速用完後降速可持續使用。",
      "**天數彈性**：3、5、7、10、15、20、25、30 天（視流量組合）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達土耳其後再啟用 eSIM。",
    ],
    EXP_TOTAL,
  );
}

export function trTotalKeyFeaturesByCarrier() {
  return {
    [TR_TELECOM_AVEA]: trAveaTotalKeyFeatures(),
  };
}

const EXP_DAILY =
  "每日高速額度內：伊斯坦堡、安卡拉、伊茲密爾、安塔利亞等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function trAveaDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **土耳其** 每日型 eSIM，覆蓋伊斯坦堡與主要觀光路線。",
      TR_CARRIER_INTRO,
      "**為什麼選擇 AVEA／Vodafone 每日型？**",
      "**Avea／Vodafone Turkey 4G／5G**：伊斯坦堡、安卡拉、伊茲密爾、安塔利亞、棉花堡等熱門行程較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**天數彈性**：1～10、15、20、25、30 天（視流量組合）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達土耳其後再啟用 eSIM。",
    ],
    EXP_DAILY,
  );
}

export function trDailyKeyFeaturesByCarrier() {
  return {
    [TR_TELECOM_AVEA]: trAveaDailyKeyFeatures(),
  };
}

export default {
  TR_TELECOM_AVEA,
  trAveaUnlimited10MbpsKeyFeatures,
  trUnlimitedKeyFeaturesByCarrier,
  trAveaTotalKeyFeatures,
  trTotalKeyFeaturesByCarrier,
  trAveaDailyKeyFeatures,
  trDailyKeyFeaturesByCarrier,
};
