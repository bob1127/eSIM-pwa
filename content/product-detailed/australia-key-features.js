/**
 * 澳洲 — 重點特色（AI 摘要風）
 * 電信：OPTUS
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const AU_TELECOM_OPTUS = "OPTUS";

const EXP_UNLIM =
  "雪梨、墨爾本、布里斯本、黃金海岸等都會區 4G／5G 測速常見可到數十 Mbps，內陸、沙漠與偏遠地區會明顯下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

const EXP_TOTAL =
  "高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function australiaOptusUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 Optus 澳洲吃到飽 eSIM，覆蓋澳洲主要城市與交通沿線，適合自駕、打工度假與商務。",
      "**基本介紹與特色**",
      "**市場地位：** Optus 是澳洲三大行動電信之一（與 Telstra、Vodafone 並列），都會與觀光帶覆蓋穩定。",
      "**覆蓋範圍：** 雪梨、墨爾本、布里斯本、黃金海岸、珀斯等較穩；內陸、沙漠與偏遠地區訊號會下降。",
      "**網路速度：** 吃到飽不限流量（FUP），可持續上網。",
      "**本站方案：** 吃到飽；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_UNLIM,
  );
}

export function australiaUnlimitedKeyFeaturesByCarrier() {
  return { [AU_TELECOM_OPTUS]: australiaOptusUnlimitedKeyFeatures() };
}

export function australiaOptusTotalKeyFeatures() {
  return pack(
    [
      "本方案為 Optus 澳洲總量型 eSIM，適合想控管總流量的訪澳行程。",
      "**基本介紹與特色**",
      "**市場地位：** Optus 為澳洲三大電信之一，都會區覆蓋穩定。",
      "**覆蓋範圍：** 雪梨、墨爾本、布里斯本、黃金海岸、珀斯等熱門行程；內陸偏遠會下降。",
      "**網路速度：** 可選 1GB～50GB；高速用完後約 128kbps 續航。",
      "**本站方案：** 總量型；天數約 3～30 天，適合短訪到長住。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_TOTAL,
  );
}

export function australiaTotalKeyFeaturesByCarrier() {
  return { [AU_TELECOM_OPTUS]: australiaOptusTotalKeyFeatures() };
}

export function australiaOptusDailyKeyFeatures() {
  return pack(
    [
      "本方案為 Optus 澳洲每日型 eSIM，適合想控管每日用量的旅客。",
      "**基本介紹與特色**",
      "**市場地位：** Optus 為澳洲三大電信之一。",
      "**覆蓋範圍：** 雪梨、墨爾本、布里斯本、黃金海岸、珀斯等都會與觀光帶。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；高速用完後約 128kbps（每日重置）。",
      "**本站方案：** 每日型；天數可選 1～10、15、20、25、30 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_DAILY,
  );
}

export function australiaDailyKeyFeaturesByCarrier() {
  return { [AU_TELECOM_OPTUS]: australiaOptusDailyKeyFeatures() };
}

export default {
  AU_TELECOM_OPTUS,
  australiaOptusUnlimitedKeyFeatures,
  australiaUnlimitedKeyFeaturesByCarrier,
  australiaOptusTotalKeyFeatures,
  australiaTotalKeyFeaturesByCarrier,
  australiaOptusDailyKeyFeatures,
  australiaDailyKeyFeaturesByCarrier,
};
