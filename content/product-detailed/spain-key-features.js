/**
 * 西班牙 — 重點特色（AI 摘要風）
 * 現行上架：吃到飽 Movistar +｜總量 Orange / Movistar +｜每日 Orange +
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const ES_TELECOM_34 = "Vodafone / Orange +";
export const ES_TELECOM_32 = "Movistar +";
export const ES_TELECOM_32_OM = "Orange / Movistar +";
export const ES_TELECOM_32_OR = "Orange +";
export const ES_TELECOM_41 = "Movistar / Vodafone +";

const EXP_FUP =
  "馬德里、巴塞隆納、塞維亞、瓦倫西亞等都會區 4G／5G 測速常見可到數十 Mbps；地鐵、古蹟室內與鄉村會下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

const EXP_10MBPS =
  "馬德里、巴塞隆納、塞維亞、瓦倫西亞等都會區 4G／5G 測速常見可到約 10Mbps 上限（方案限速）；地鐵、古蹟室內與鄉村會再下降。導航、傳訊、社群通常沒問題，高畫質影音與多人熱點會變慢。僅供參考。";

const EXP_TOTAL =
  "高速額度內：馬德里、巴塞隆納、塞維亞、瓦倫西亞等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：馬德里、巴塞隆納、塞維亞、瓦倫西亞等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function esVodafoneOrangeUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為西班牙吃到飽（FUP）eSIM，走 Vodafone／Orange／Yoigo 等主流網路，適合馬德里、巴塞隆納與海岸線行程。",
      "**基本介紹與特色**",
      "**市場地位：** Vodafone 與 Orange 是西班牙都會與觀光路線常用電信，Yoigo 補齊部分城市。",
      "**覆蓋範圍：** 馬德里、巴塞隆納、塞維亞、瓦倫西亞與海岸線較穩；地鐵、古蹟室內與內陸鄉村會下降。",
      "**網路速度：** 吃到飽不限流量（FUP），可持續上網。",
      "**本站方案：** 吃到飽；天數可選 1／3／5／7／10／15／20／30／60／90 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_FUP,
  );
}

export function esMovistarVodafoneUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為西班牙吃到飽（限速約 10Mbps）eSIM，走 Movistar／Vodafone／Yoigo，適合傳訊、導航與社群為主的行程。",
      "**基本介紹與特色**",
      "**市場地位：** Movistar（Telefónica）覆蓋最廣，搭配 Vodafone、Yoigo 都會區表現穩定。",
      "**覆蓋範圍：** 馬德里、巴塞隆納與主要城市較穩；地鐵與古蹟室內會下降。",
      "**網路速度：** 限速約 10Mbps 吃到飽；高畫質影音會受上限影響。",
      "**本站方案：** 吃到飽；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 Gemini。建議抵達後再啟用。",
    ],
    EXP_10MBPS,
  );
}

export function esMovistarUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為西班牙吃到飽（限速約 10Mbps）eSIM，走 Movistar（Telefónica），適合馬德里、巴塞隆納與主要城市觀光。",
      "**基本介紹與特色**",
      "**市場地位：** Movistar 是西班牙覆蓋最廣的傳統電信，熱門行程表現穩定。",
      "**覆蓋範圍：** 馬德里、巴塞隆納、塞維亞、瓦倫西亞等主要城市（地鐵與古蹟室內會下降）。",
      "**網路速度：** 限速約 10Mbps 吃到飽，適合傳訊、導航與社群。",
      "**本站方案：** 吃到飽；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_10MBPS,
  );
}

export function esUnlimited34KeyFeaturesByCarrier() {
  return { [ES_TELECOM_34]: esVodafoneOrangeUnlimitedKeyFeatures() };
}

export function esUnlimited41KeyFeaturesByCarrier() {
  return { [ES_TELECOM_41]: esMovistarVodafoneUnlimitedKeyFeatures() };
}

export function esUnlimited32KeyFeaturesByCarrier() {
  return { [ES_TELECOM_32]: esMovistarUnlimitedKeyFeatures() };
}

export function esOrangeMovistarTotalKeyFeatures() {
  return pack(
    [
      "本方案為西班牙總量型 eSIM，走 Orange／Movistar，適合想控管總流量的訪西行程。",
      "**基本介紹與特色**",
      "**市場地位：** Orange 與 Movistar 覆蓋西班牙主要城市與觀光路線。",
      "**覆蓋範圍：** 馬德里、巴塞隆納、塞維亞、瓦倫西亞與海岸線較穩。",
      "**網路速度：** 可選 1GB／2GB／3GB／5GB／10GB／20GB／30GB／50GB；高速用完後約 128kbps 續航。",
      "**本站方案：** 總量型。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_TOTAL,
  );
}

export function esTotalKeyFeaturesByCarrier() {
  return { [ES_TELECOM_32_OM]: esOrangeMovistarTotalKeyFeatures() };
}

export function esOrangeDailyKeyFeatures() {
  return pack(
    [
      "本方案為西班牙每日型 eSIM，走 Orange，適合想控管每日用量的旅客。",
      "**基本介紹與特色**",
      "**市場地位：** Orange 為西班牙主流電信之一，馬德里與主要城市較穩。",
      "**覆蓋範圍：** 馬德里、巴塞隆納等熱門目的地與觀光路線。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；高速用完後約 128kbps（每日重置）。",
      "**本站方案：** 每日型。",
      "**旅遊便利：** 支援熱點與 TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_DAILY,
  );
}

export function esDailyKeyFeaturesByCarrier() {
  return { [ES_TELECOM_32_OR]: esOrangeDailyKeyFeatures() };
}

export default {
  ES_TELECOM_34,
  ES_TELECOM_32,
  ES_TELECOM_32_OM,
  ES_TELECOM_32_OR,
  ES_TELECOM_41,
  esUnlimited34KeyFeaturesByCarrier,
  esUnlimited41KeyFeaturesByCarrier,
  esUnlimited32KeyFeaturesByCarrier,
  esTotalKeyFeaturesByCarrier,
  esDailyKeyFeaturesByCarrier,
};
