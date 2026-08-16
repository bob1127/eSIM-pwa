/**
 * 法國吃到飽／總量／每日型 — Orange / Bouygues（歐包）
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const FR_TELECOM_ORANGE = "ORANGE +";

const EXP_UNLIM =
  "巴黎、里昂、尼斯、馬賽等都會區 4G／5G 測速常見可到數十 Mbps；地鐵、古蹟室內與鄉村會下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

const EXP_TOTAL =
  "高速額度內：巴黎、里昂、尼斯、馬賽等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：巴黎、里昂、尼斯、馬賽等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function frOrangeUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **法國吃到飽** eSIM。",
      "**為什麼選擇 ORANGE＋？**",
      "**法國三網 4G／5G**：Orange、Bouygues、Free Mobile，巴黎與主要城市較穩。",
      "**吃到飽不限流量（FUP）**：公平使用政策下可持續上網，適合自駕、城市走跳與出差。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：1／3／5／7／10／15／20／30／60／90 天。",
      "**安裝提醒**：建議抵達法國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_UNLIM,
  );
}

export function frUnlimitedKeyFeaturesByCarrier() {
  return {
    [FR_TELECOM_ORANGE]: frOrangeUnlimitedKeyFeatures(),
  };
}

export function frOrangeTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **法國總量型** eSIM。",
      "**為什麼選擇 ORANGE＋總量型？**",
      "**法國雙網 4G／5G**：Orange France、Bouygues France，巴黎與主要城市較穩。",
      "**總量高速後約 128kbps**：可選 1GB／3GB／5GB／10GB／20GB／30GB／50GB；高速用完後降速可持續使用。",
      "**天數**：3／5／7／10／15／30 天（視流量組合）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達法國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_TOTAL,
  );
}

export function frTotalKeyFeaturesByCarrier() {
  return {
    [FR_TELECOM_ORANGE]: frOrangeTotalKeyFeatures(),
  };
}

export function frOrangeDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **法國每日型** eSIM。",
      "**為什麼選擇 ORANGE＋每日型？**",
      "**法國雙網 4G／5G**：Orange France、Bouygues France，巴黎與主要城市較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**天數**：1／2／3／5／7／10／15／20／30 天（視流量組合）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達法國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_DAILY,
  );
}

export function frDailyKeyFeaturesByCarrier() {
  return {
    [FR_TELECOM_ORANGE]: frOrangeDailyKeyFeatures(),
  };
}

export default {
  FR_TELECOM_ORANGE,
  frOrangeUnlimitedKeyFeatures,
  frUnlimitedKeyFeaturesByCarrier,
  frOrangeTotalKeyFeatures,
  frTotalKeyFeaturesByCarrier,
  frOrangeDailyKeyFeatures,
  frDailyKeyFeaturesByCarrier,
};
