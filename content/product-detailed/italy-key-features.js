/**
 * 義大利吃到飽／總量／每日
 *   吃到飽：EU-32（Iliad／TIM／WindTre、orange 法國 IP）＋ EU-36（Iliad／WindTre、cmlink 德國 IP）
 *   總量／每日：Europe 34（TIM／Vodafone）
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const IT_TELECOM_34 = "TIM / Vodafone +";
export const IT_TELECOM_32 = "Iliad / TIM +";
export const IT_TELECOM_41 = "Iliad / WindTre +";

const EXP_FUP =
  "羅馬、米蘭、佛羅倫斯、威尼斯等都會區 4G／5G 測速常見可到數十 Mbps；地鐵、古蹟室內與鄉村會下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

const EXP_10MBPS =
  "羅馬、米蘭、佛羅倫斯、威尼斯等都會區 4G／5G 測速常見可到約 10Mbps 上限（方案限速）；地鐵、古蹟室內與鄉村會再下降。導航、傳訊、社群通常沒問題，高畫質影音與多人熱點會變慢。僅供參考。";

const IT_INTRO_TIM =
  "TIM（Telecom Italia）是義大利覆蓋最廣的傳統電信，Vodafone、WindTre 與 Iliad 補齊都會與觀光路線。羅馬、米蘭、佛羅倫斯、威尼斯與拿坡里較穩；地鐵、古蹟室內與南部鄉村仍可能下降。抵達即可上網、免換實體 SIM。";

const IT_INTRO_ILIAD =
  "Iliad 與 WindTre 是義大利都會區成長快的民營電信，熱點與數據用量較靈活。羅馬、米蘭、佛羅倫斯等熱門行程較穩；地鐵與古蹟室內訊號會下降。";

const IT_INTRO_ILIAD_TIM =
  "Iliad、TIM 與 WindTre 覆蓋義大利主要城市與觀光路線。羅馬、米蘭、佛羅倫斯、威尼斯與拿坡里較穩；地鐵、古蹟室內與南部鄉村仍可能下降。抵達即可上網、免換實體 SIM。";

const EXP_TOTAL =
  "高速額度內：羅馬、米蘭、佛羅倫斯、威尼斯等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：羅馬、米蘭、佛羅倫斯、威尼斯等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function itTimVodafoneUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **義大利吃到飽（FUP）** eSIM。",
      IT_INTRO_TIM,
      "**為什麼選擇 TIM／Vodafone＋？**",
      "**義大利主流網路 4G／5G**：TIM、Vodafone、WindTre、Iliad，羅馬與主要城市較穩。",
      "**吃到飽不限流量（FUP）**：公平使用政策下可持續上網，適合自駕、城市走跳與出差。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：1／3／5／7／10／15／20／30／60／90 天。",
      "**安裝提醒**：建議抵達義大利覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_FUP,
  );
}

export function itIliadWindTreUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **義大利吃到飽（限速約 10Mbps）** eSIM。",
      IT_INTRO_ILIAD,
      "**為什麼選擇 Iliad／WindTre＋？**",
      "**義大利主流網路 4G／5G**：Iliad、WindTre，羅馬與主要城市較穩。",
      "**限速約 10Mbps 吃到飽**：高速不另切額度，適合傳訊、導航與社群；高畫質影音會受上限影響。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：1／2／3／4／5／6／7／8／9／10／15／20／25／30 天。",
      "**安裝提醒**：建議抵達義大利覆蓋範圍後再啟用 eSIM。",
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

export function itIliadTimUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **義大利吃到飽（限速約 10Mbps）** eSIM。",
      IT_INTRO_ILIAD_TIM,
      "**為什麼選擇 Iliad／TIM＋？**",
      "**義大利主流網路 4G／5G**：Iliad、TIM、WindTre，羅馬與主要城市較穩。",
      "**限速約 10Mbps 吃到飽**：高速不另切額度，適合傳訊、導航與社群；高畫質影音會受上限影響。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：1／2／3／4／5／6／7／8／9／10／15／20／25／30 天。",
      "**安裝提醒**：建議抵達義大利覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_10MBPS,
  );
}

export function itUnlimited32KeyFeaturesByCarrier() {
  return { [IT_TELECOM_32]: itIliadTimUnlimitedKeyFeatures() };
}

export function itIliadTimTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **義大利總量型** eSIM。",
      IT_INTRO_ILIAD_TIM,
      "**為什麼選擇 Iliad／TIM＋總量型？**",
      "**義大利主流網路 4G／5G**：Iliad、TIM、WindTre，羅馬與主要城市較穩。",
      "**總量高速後約 128kbps**：可選 1GB／2GB／3GB／5GB／10GB／20GB／30GB／50GB；高速用完後降速可持續使用。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達義大利覆蓋範圍後再啟用 eSIM。",
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
      "本方案為 **義大利每日型** eSIM。",
      IT_INTRO_ILIAD_TIM,
      "**為什麼選擇 Iliad／TIM＋每日型？**",
      "**義大利主流網路 4G／5G**：Iliad、TIM、WindTre，羅馬與主要城市較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達義大利覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_DAILY,
  );
}

export function itDailyKeyFeaturesByCarrier() {
  return { [IT_TELECOM_32]: itIliadTimDailyKeyFeatures() };
}
