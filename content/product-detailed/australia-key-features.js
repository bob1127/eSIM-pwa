/**
 * 澳洲吃到飽／總量／每日型 — Optus
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const AU_TELECOM_OPTUS = "OPTUS";

const AU_CARRIER_INTRO =
  "Optus 是澳洲三大行動電信之一（與 Telstra、Vodafone 並列），雪梨、墨爾本、布里斯本、黃金海岸、珀斯等都會與觀光帶 4G／5G 覆蓋穩定；內陸、沙漠與偏遠地區訊號會明顯下降。抵達即可上網、免換實體 SIM。";

const EXP_UNLIM =
  "雪梨、墨爾本、布里斯本、黃金海岸等都會區 4G／5G 測速常見可到數十 Mbps，內陸、沙漠與偏遠地區會明顯下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

const EXP_TOTAL =
  "高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function australiaOptusUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **Optus** 澳洲吃到飽 eSIM，覆蓋澳洲主要城市與交通沿線。",
      AU_CARRIER_INTRO,
      "**為什麼選擇 Optus 吃到飽？**",
      "**Optus 4G／5G**：澳洲主流電信之一，雪梨、墨爾本、布里斯本、黃金海岸、珀斯等熱門行程較穩。",
      "**吃到飽不限流量（FUP）**：公平使用政策下可持續上網，適合自駕、打工度假與商務。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數彈性**：1～10、15、20、25、30 天可選。",
      "**安裝提醒**：建議抵達澳洲後再啟用 eSIM。",
    ],
    EXP_UNLIM,
  );
}

export function australiaUnlimitedKeyFeaturesByCarrier() {
  return {
    [AU_TELECOM_OPTUS]: australiaOptusUnlimitedKeyFeatures(),
  };
}

export function australiaOptusTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **Optus** 澳洲總量型 eSIM，覆蓋澳洲主要城市與交通沿線。",
      AU_CARRIER_INTRO,
      "**為什麼選擇 Optus 總量型？**",
      "**Optus 4G／5G**：澳洲主流電信之一，雪梨、墨爾本、布里斯本、黃金海岸、珀斯等熱門行程較穩。",
      "**總量高速後約 128kbps**：可選 1GB～50GB；高速用完後降速可持續使用。",
      "**天數彈性**：3～30 天，適合短訪到長住。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達澳洲後再啟用 eSIM。",
    ],
    EXP_TOTAL,
  );
}

export function australiaTotalKeyFeaturesByCarrier() {
  return {
    [AU_TELECOM_OPTUS]: australiaOptusTotalKeyFeatures(),
  };
}

export function australiaOptusDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **Optus** 澳洲每日型 eSIM，覆蓋澳洲主要城市與交通沿線。",
      AU_CARRIER_INTRO,
      "**為什麼選擇 Optus 每日型？**",
      "**Optus 4G／5G**：澳洲主流電信之一，雪梨、墨爾本、布里斯本、黃金海岸、珀斯等熱門行程較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**天數彈性**：1～10、15、20、25、30 天可選。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達澳洲後再啟用 eSIM。",
    ],
    EXP_DAILY,
  );
}

export function australiaDailyKeyFeaturesByCarrier() {
  return {
    [AU_TELECOM_OPTUS]: australiaOptusDailyKeyFeatures(),
  };
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
