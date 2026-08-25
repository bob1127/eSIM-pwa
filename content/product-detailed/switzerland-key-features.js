/**
 * 瑞士 — 重點特色（AI 摘要風）
 * 吃到飽：Swisscom / Sunrise +（FUP）｜Sunrise / Salt +（約 10Mbps）
 * 總量／每日：Swisscom / Sunrise +
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

const EXP_TOTAL =
  "高速額度內：蘇黎世、日內瓦、伯恩、琉森等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後依方案斷網（總量型），請依 GB 數規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：蘇黎世、日內瓦、伯恩、琉森等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 512kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function chSwisscomSunriseUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為瑞士吃到飽（FUP）eSIM，走 Swisscom／Sunrise／Salt，適合蘇黎世、日內瓦與阿爾卑斯觀光。",
      "**基本介紹與特色**",
      "**市場地位：** Swisscom 是瑞士覆蓋最廣的傳統電信，Sunrise 與 Salt 補齊都會與觀光路線。",
      "**覆蓋範圍：** 蘇黎世、日內瓦、伯恩、琉森、因特拉肯與采爾馬特較穩；阿爾卑斯山區、隧道與室內會下降。",
      "**網路速度：** 吃到飽不限流量（FUP），可持續上網。",
      "**本站方案：** 吃到飽；天數可選 1／3／5／7／10／15／20／30／60／90 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_FUP,
  );
}

export function chSunriseSaltUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為瑞士吃到飽（限速約 10Mbps）eSIM，走 Sunrise／Salt，適合傳訊、導航與社群為主的行程。",
      "**基本介紹與特色**",
      "**市場地位：** Sunrise 與 Salt 是瑞士主要民營電信，都會區 4G／5G 與熱點使用較靈活。",
      "**覆蓋範圍：** 蘇黎世、日內瓦、伯恩、琉森等熱門行程較穩；阿爾卑斯山區與隧道訊號會下降。",
      "**網路速度：** 限速約 10Mbps 吃到飽；高畫質影音會受上限影響。",
      "**本站方案：** 吃到飽；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 Gemini。建議抵達後再啟用。",
    ],
    EXP_10MBPS,
  );
}

export function chUnlimited34KeyFeaturesByCarrier() {
  return { [CH_TELECOM_34]: chSwisscomSunriseUnlimitedKeyFeatures() };
}

export function chUnlimited41KeyFeaturesByCarrier() {
  return { [CH_TELECOM_41]: chSunriseSaltUnlimitedKeyFeatures() };
}

export function chSwisscomSunriseTotalKeyFeatures() {
  return pack(
    [
      "本方案為瑞士總量型 eSIM，走 Swisscom／Sunrise／Salt，適合想控管總流量的訪瑞行程。",
      "**基本介紹與特色**",
      "**市場地位：** Swisscom、Sunrise、Salt 為瑞士主流網路，蘇黎世與主要城市較穩。",
      "**覆蓋範圍：** 蘇黎世、日內瓦、伯恩、琉森等都會與觀光熱點。",
      "**網路速度：** 可選 1GB／3GB／5GB／10GB／20GB／30GB／50GB；高速額度用完即斷網。",
      "**本站方案：** 總量型；天數 3／5／7／10／15／30 天（視流量組合）。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_TOTAL,
  );
}

export function chTotalKeyFeaturesByCarrier() {
  return { [CH_TELECOM_34]: chSwisscomSunriseTotalKeyFeatures() };
}

export function chSwisscomSunriseDailyKeyFeatures() {
  return pack(
    [
      "本方案為瑞士每日型 eSIM，走 Swisscom／Sunrise／Salt，適合想控管每日用量的旅客。",
      "**基本介紹與特色**",
      "**市場地位：** Swisscom、Sunrise、Salt 主流覆蓋，蘇黎世與主要城市較穩。",
      "**覆蓋範圍：** 蘇黎世、日內瓦、伯恩、琉森等熱門目的地。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；高速用完後約 512kbps（每日重置）。",
      "**本站方案：** 每日型；天數 1／3／5／7／10／15／20／30／60／90 天（視流量組合）。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_DAILY,
  );
}

export function chDailyKeyFeaturesByCarrier() {
  return { [CH_TELECOM_34]: chSwisscomSunriseDailyKeyFeatures() };
}

export default {
  CH_TELECOM_34,
  CH_TELECOM_41,
  chUnlimited34KeyFeaturesByCarrier,
  chUnlimited41KeyFeaturesByCarrier,
  chTotalKeyFeaturesByCarrier,
  chDailyKeyFeaturesByCarrier,
};
