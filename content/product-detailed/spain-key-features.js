/**
 * 西班牙吃到飽／總量／每日
 *   吃到飽：EU-32 unlimited（Movistar、orange 法國 IP）
 *   總量：EU-32 Total（Orange／Movistar、orange 法國 IP、128kbps）
 *   每日：EU-32 Daily（Orange、orange 法國 IP、128kbps）
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

const ES_INTRO_VF =
  "Vodafone 與 Orange 是西班牙都會與觀光路線常用的行動電信，Yoigo 補齊部分城市。馬德里、巴塞隆納、塞維亞、瓦倫西亞與海岸線較穩；地鐵、古蹟室內與內陸鄉村仍可能下降。抵達即可上網、免換實體 SIM。";

const ES_INTRO_ORANGE =
  "Orange 與 Movistar 覆蓋西班牙主要城市與觀光路線。馬德里、巴塞隆納、塞維亞、瓦倫西亞與海岸線較穩；地鐵、古蹟室內與內陸鄉村仍可能下降。抵達即可上網、免換實體 SIM。";

const ES_INTRO_MOVISTAR =
  "Movistar（Telefónica）是西班牙覆蓋最廣的傳統電信。馬德里、巴塞隆納等熱門行程較穩；地鐵與古蹟室內訊號會下降。";

const EXP_TOTAL =
  "高速額度內：馬德里、巴塞隆納、塞維亞、瓦倫西亞等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：馬德里、巴塞隆納、塞維亞、瓦倫西亞等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function esVodafoneOrangeUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **西班牙吃到飽（FUP）** eSIM。",
      ES_INTRO_VF,
      "**為什麼選擇 Vodafone／Orange＋？**",
      "**西班牙主流網路 4G／5G**：Vodafone、Orange、Yoigo，馬德里與主要城市較穩。",
      "**吃到飽不限流量（FUP）**：公平使用政策下可持續上網，適合自駕、城市走跳與出差。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：1／3／5／7／10／15／20／30／60／90 天。",
      "**安裝提醒**：建議抵達西班牙覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_FUP,
  );
}

export function esMovistarVodafoneUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **西班牙吃到飽（限速約 10Mbps）** eSIM。",
      ES_INTRO_MOVISTAR,
      "**為什麼選擇 Movistar／Vodafone＋？**",
      "**西班牙主流網路 4G／5G**：Movistar、Vodafone、Yoigo，馬德里與主要城市較穩。",
      "**限速約 10Mbps 吃到飽**：高速不另切額度，適合傳訊、導航與社群；高畫質影音會受上限影響。",
      "**支援熱點與常用 App**：熱點分享；支援 Gemini。",
      "**天數**：1／2／3／4／5／6／7／8／9／10／15／20／25／30 天。",
      "**安裝提醒**：建議抵達西班牙覆蓋範圍後再啟用 eSIM。",
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

export function esMovistarUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **西班牙吃到飽（限速約 10Mbps）** eSIM。",
      ES_INTRO_MOVISTAR,
      "**為什麼選擇 Movistar＋？**",
      "**西班牙主流網路 4G／5G**：Movistar，馬德里、巴塞隆納與主要城市較穩。",
      "**限速約 10Mbps 吃到飽**：高速不另切額度，適合傳訊、導航與社群；高畫質影音會受上限影響。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：1／2／3／4／5／6／7／8／9／10／15／20／25／30 天。",
      "**安裝提醒**：建議抵達西班牙覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_10MBPS,
  );
}

export function esUnlimited32KeyFeaturesByCarrier() {
  return { [ES_TELECOM_32]: esMovistarUnlimitedKeyFeatures() };
}

export function esOrangeMovistarTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **西班牙總量型** eSIM。",
      ES_INTRO_ORANGE,
      "**為什麼選擇 Orange／Movistar＋總量型？**",
      "**西班牙主流網路 4G／5G**：Orange、Movistar，馬德里與主要城市較穩。",
      "**總量高速後約 128kbps**：可選 1GB／2GB／3GB／5GB／10GB／20GB／30GB／50GB；高速用完後降速可持續使用。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達西班牙覆蓋範圍後再啟用 eSIM。",
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
      "本方案為 **西班牙每日型** eSIM。",
      ES_INTRO_ORANGE,
      "**為什麼選擇 Orange＋每日型？**",
      "**西班牙主流網路 4G／5G**：Orange，馬德里與主要城市較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**支援熱點與常用 App**：熱點分享；支援 TikTok、Gemini。",
      "**安裝提醒**：建議抵達西班牙覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_DAILY,
  );
}

export function esDailyKeyFeaturesByCarrier() {
  return { [ES_TELECOM_32_OR]: esOrangeDailyKeyFeatures() };
}
