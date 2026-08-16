/**
 * 英國吃到飽 — 歐36（10Mbps／cmlink）與歐34（FUP／波蘭 IP）
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

const UK_CARRIER_INTRO =
  "EE、Three、Vodafone、O2 是英國四大主流行動電信。EE 覆蓋最完整（都會、鄉村與地鐵沿線），Three 在倫敦等大城市數據用量友善，Vodafone 國際品牌、機場與交通樞紐較穩，O2 在倫敦與主要商圈訊號常見穩定。本方案走英國當地 4G／5G，適合倫敦、曼徹斯特、愛丁堡、湖區與自駕，抵達即可上網、免換實體 SIM。";

export function ukEe36UnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **英國吃到飽（限速約 10Mbps）** eSIM。",
      UK_CARRIER_INTRO,
      "**為什麼選擇 EE＋？**",
      "**英國主流網路 4G／5G**：EE、Three、Vodafone、O2，倫敦與主要城市較穩。",
      "**限速約 10Mbps 吃到飽**：高速不另切額度，適合傳訊、導航與社群；高畫質影音會受上限影響。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：1／2／3／4／5／6／7／8／9／10／15／20／25／30 天。",
      "**安裝提醒**：建議抵達英國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_10MBPS,
  );
}

export function ukEe34UnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **英國吃到飽（FUP）** eSIM。",
      UK_CARRIER_INTRO,
      "**為什麼選擇 EE／Three＋？**",
      "**英國主流網路 4G／5G**：EE、Three、Vodafone、O2，倫敦與主要城市較穩。",
      "**吃到飽不限流量（FUP）**：公平使用政策下可持續上網，適合自駕、城市走跳與出差。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：1／3／5／7／10／15／20／30／60／90 天。",
      "**安裝提醒**：建議抵達英國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_FUP,
  );
}

export function ukUnlimited10MbpsKeyFeaturesByCarrier() {
  return {
    [UK_TELECOM_EE36]: ukEe36UnlimitedKeyFeatures(),
  };
}

export function ukUnlimitedFupKeyFeaturesByCarrier() {
  return {
    [UK_TELECOM_EE34]: ukEe34UnlimitedKeyFeatures(),
  };
}

const EXP_TOTAL =
  "高速額度內：倫敦、曼徹斯特、愛丁堡、伯明罕等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後依方案斷網（總量型），請依 GB 數規劃用量。僅供參考。";

export function ukEe34TotalKeyFeatures() {
  return pack(
    [
      "本方案為 **英國總量型** eSIM。",
      UK_CARRIER_INTRO,
      "**為什麼選擇 EE／Three＋總量型？**",
      "**英國主流網路 4G／5G**：EE、Three、Vodafone、O2 等，倫敦與主要城市較穩。",
      "**總量高速後斷網**：可選 1GB／3GB／5GB／10GB／20GB／30GB／50GB；高速額度用完即斷網。",
      "**天數**：3／5／7／10／15／30 天（視流量組合）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達英國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_TOTAL,
  );
}

export function ukTotalKeyFeaturesByCarrier() {
  return {
    [UK_TELECOM_EE34]: ukEe34TotalKeyFeatures(),
  };
}

const EXP_DAILY =
  "每日高速額度內：倫敦、曼徹斯特、愛丁堡、伯明罕等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 512kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function ukEe34DailyKeyFeatures() {
  return pack(
    [
      "本方案為 **英國每日型** eSIM。",
      UK_CARRIER_INTRO,
      "**為什麼選擇 EE／Three＋每日型？**",
      "**英國主流網路 4G／5G**：EE、Three、Vodafone、O2 等，倫敦與主要城市較穩。",
      "**每日高速後約 512kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**天數**：1／3／5／7／10／15／20／30／60／90 天（視流量組合）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達英國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_DAILY,
  );
}

export function ukDailyKeyFeaturesByCarrier() {
  return {
    [UK_TELECOM_EE34]: ukEe34DailyKeyFeatures(),
  };
}
