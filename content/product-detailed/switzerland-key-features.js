/**
 * 瑞士吃到飽 — Europe 34 FUP（Swisscom／Sunrise／Salt）與 Europe 41 限速約 10Mbps（Sunrise／Salt）
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CH_TELECOM_34 = "Swisscom / Sunrise +";
export const CH_TELECOM_41 = "Sunrise / Salt +";

const EXP_FUP =
  "蘇黎世、日內瓦、伯恩、琉森等都會區 4G／5G 測速常見可到數十 Mbps；阿爾卑斯山區、隧道、古蹟室內與鄉村會下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

const EXP_10MBPS =
  "蘇黎世、日內瓦、伯恩、琉森等都會區 4G／5G 測速常見可到約 10Mbps 上限（方案限速）；阿爾卑斯山區、隧道與室內會再下降。導航、傳訊、社群通常沒問題，高畫質影音與多人熱點會變慢。僅供參考。";

const CH_INTRO_SWISSCOM =
  "Swisscom 是瑞士覆蓋最廣的傳統電信，Sunrise 與 Salt（前 Orange）補齊都會與觀光路線。蘇黎世、日內瓦、伯恩、琉森、因特拉肯與采爾馬特較穩；阿爾卑斯山區、隧道與室內仍可能下降。抵達即可上網、免換實體 SIM。";

const CH_INTRO_SUNRISE =
  "Sunrise 與 Salt 是瑞士主要民營電信，都會區 4G／5G 與熱點使用較靈活。蘇黎世、日內瓦、伯恩、琉森等熱門行程較穩；阿爾卑斯山區與隧道訊號會下降。";

const EXP_TOTAL =
  "高速額度內：蘇黎世、日內瓦、伯恩、琉森等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後依方案斷網（總量型），請依 GB 數規劃用量。僅供參考。";

export function chSwisscomSunriseTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **瑞士總量型** eSIM。",
      CH_INTRO_SWISSCOM,
      "**為什麼選擇 Swisscom／Sunrise＋總量型？**",
      "**瑞士主流網路 4G／5G**：Swisscom、Sunrise、Salt，蘇黎世與主要城市較穩。",
      "**總量高速後斷網**：可選 1GB／3GB／5GB／10GB／20GB／30GB／50GB；高速額度用完即斷網。",
      "**天數**：3／5／7／10／15／30 天（視流量組合）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達瑞士覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_TOTAL,
  );
}

export function chTotalKeyFeaturesByCarrier() {
  return {
    [CH_TELECOM_34]: chSwisscomSunriseTotalKeyFeatures(),
  };
}

const EXP_DAILY =
  "每日高速額度內：蘇黎世、日內瓦、伯恩、琉森等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 512kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function chSwisscomSunriseDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **瑞士每日型** eSIM。",
      CH_INTRO_SWISSCOM,
      "**為什麼選擇 Swisscom／Sunrise＋每日型？**",
      "**瑞士主流網路 4G／5G**：Swisscom、Sunrise、Salt，蘇黎世與主要城市較穩。",
      "**每日高速後約 512kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**天數**：1／3／5／7／10／15／20／30／60／90 天（視流量組合）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達瑞士覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_DAILY,
  );
}

export function chDailyKeyFeaturesByCarrier() {
  return {
    [CH_TELECOM_34]: chSwisscomSunriseDailyKeyFeatures(),
  };
}

export function chSwisscomSunriseUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **瑞士吃到飽（FUP）** eSIM。",
      CH_INTRO_SWISSCOM,
      "**為什麼選擇 Swisscom／Sunrise＋？**",
      "**瑞士主流網路 4G／5G**：Swisscom、Sunrise、Salt，蘇黎世與主要城市較穩。",
      "**吃到飽不限流量（FUP）**：公平使用政策下可持續上網，適合自駕、城市走跳與出差。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：1／3／5／7／10／15／20／30／60／90 天。",
      "**安裝提醒**：建議抵達瑞士覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_FUP,
  );
}

export function chSunriseSaltUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **瑞士吃到飽（限速約 10Mbps）** eSIM。",
      CH_INTRO_SUNRISE,
      "**為什麼選擇 Sunrise／Salt＋？**",
      "**瑞士主流網路 4G／5G**：Sunrise、Salt，蘇黎世與主要城市較穩。",
      "**限速約 10Mbps 吃到飽**：高速不另切額度，適合傳訊、導航與社群；高畫質影音會受上限影響。",
      "**支援熱點與常用 App**：熱點分享；支援 Gemini。",
      "**天數**：1／2／3／4／5／6／7／8／9／10／15／20／25／30 天。",
      "**安裝提醒**：建議抵達瑞士覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_10MBPS,
  );
}

export function chUnlimited34KeyFeaturesByCarrier() {
  return {
    [CH_TELECOM_34]: chSwisscomSunriseUnlimitedKeyFeatures(),
  };
}

export function chUnlimited41KeyFeaturesByCarrier() {
  return {
    [CH_TELECOM_41]: chSunriseSaltUnlimitedKeyFeatures(),
  };
}
