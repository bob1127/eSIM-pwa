/**
 * 義大利 — 重點特色（AI 摘要風）
 * 吃到飽：Iliad / TIM +（約 10Mbps／法國 IP）｜Iliad / WindTre +（約 10Mbps／德國 IP）
 * 每日／總量：Iliad / TIM +
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const IT_TELECOM_34 = "TIM / Vodafone +";
export const IT_TELECOM_32 = "Iliad / TIM +";
export const IT_TELECOM_41 = "Iliad / WindTre +";

const EXP_10MBPS =
  "羅馬、米蘭、佛羅倫斯、威尼斯等都會區 4G／5G 測速常見可到約 10Mbps 上限（方案限速）；地鐵、古蹟室內與鄉村會再下降。導航、傳訊、社群通常沒問題，高畫質影音與多人熱點會變慢。僅供參考。";

const EXP_FUP =
  "羅馬、米蘭、佛羅倫斯、威尼斯等都會區 4G／5G 測速常見可到數十 Mbps；地鐵、古蹟室內與鄉村會下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

const EXP_TOTAL =
  "高速額度內：羅馬、米蘭、佛羅倫斯、威尼斯等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：羅馬、米蘭、佛羅倫斯、威尼斯等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function itTimVodafoneUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為義大利吃到飽（FUP）eSIM，走 TIM／Vodafone 等主流網路，適合自駕、城市走跳與出差。",
      "**基本介紹與特色**",
      "**市場地位：** TIM 覆蓋最廣，Vodafone／WindTre／Iliad 補齊都會與觀光路線。",
      "**覆蓋範圍：** 羅馬、米蘭、佛羅倫斯、威尼斯與拿坡里較穩；地鐵與南部鄉村會下降。",
      "**網路速度：** 吃到飽不限流量（FUP）。",
      "**本站方案：** 吃到飽；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達義大利後再啟用。",
    ],
    EXP_FUP,
  );
}

export function itIliadWindTreUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為義大利吃到飽（限速約 10Mbps）eSIM，走 Iliad／WindTre，出網為德國 IP。",
      "**基本介紹與特色**",
      "**市場地位：** Iliad 與 WindTre 為都會區靈活的民營電信。",
      "**覆蓋範圍：** 羅馬、米蘭、佛羅倫斯等熱門行程較穩。",
      "**網路速度：** 限速約 10Mbps 吃到飽。",
      "**數據路由：** 德國 IP 漫遊。",
      "**本站方案：** 吃到飽；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_10MBPS,
  );
}

export function itIliadTimUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為義大利吃到飽（限速約 10Mbps）eSIM，走 Iliad／TIM／WindTre，出網為法國 IP。",
      "**基本介紹與特色**",
      "**市場地位：** Iliad、TIM、WindTre 覆蓋主要城市與觀光路線。",
      "**覆蓋範圍：** 羅馬、米蘭、佛羅倫斯、威尼斯與拿坡里較穩。",
      "**網路速度：** 限速約 10Mbps 吃到飽。",
      "**數據路由：** 法國 IP 漫遊。",
      "**本站方案：** 吃到飽；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_10MBPS,
  );
}

export function itUnlimited34KeyFeaturesByCarrier() {
  return { [IT_TELECOM_34]: itTimVodafoneUnlimitedKeyFeatures() };
}
export function itUnlimited41KeyFeaturesByCarrier() {
  return { [IT_TELECOM_41]: itIliadWindTreUnlimitedKeyFeatures() };
}
export function itUnlimited32KeyFeaturesByCarrier() {
  return { [IT_TELECOM_32]: itIliadTimUnlimitedKeyFeatures() };
}

export function itIliadTimTotalKeyFeatures() {
  return pack(
    [
      "本方案為義大利總量型 eSIM，走 Iliad／TIM／WindTre，出網為法國 IP。",
      "**基本介紹與特色**",
      "**市場地位：** Iliad、TIM、WindTre 主流覆蓋。",
      "**覆蓋範圍：** 羅馬、米蘭、佛羅倫斯、威尼斯等熱門目的地。",
      "**網路速度：** 可選 1GB～50GB；高速用完後約 128kbps 續航。",
      "**數據路由：** 法國 IP 漫遊。",
      "**本站方案：** 總量型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_TOTAL,
  );
}

export function itTotalKeyFeaturesByCarrier() {
  return { [IT_TELECOM_32]: itIliadTimTotalKeyFeatures() };
}

export function itIliadTimDailyKeyFeatures() {
  return pack(
    [
      "本方案為義大利每日型 eSIM，走 Iliad／TIM／WindTre，出網為法國 IP。",
      "**基本介紹與特色**",
      "**市場地位：** Iliad、TIM、WindTre 主流覆蓋。",
      "**覆蓋範圍：** 羅馬、米蘭、佛羅倫斯等熱門城市。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）。",
      "**數據路由：** 法國 IP 漫遊。",
      "**本站方案：** 每日型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_DAILY,
  );
}

export function itDailyKeyFeaturesByCarrier() {
  return { [IT_TELECOM_32]: itIliadTimDailyKeyFeatures() };
}

export default {
  IT_TELECOM_34,
  IT_TELECOM_32,
  IT_TELECOM_41,
  itUnlimited34KeyFeaturesByCarrier,
  itUnlimited41KeyFeaturesByCarrier,
  itUnlimited32KeyFeaturesByCarrier,
  itTotalKeyFeaturesByCarrier,
  itDailyKeyFeaturesByCarrier,
};
