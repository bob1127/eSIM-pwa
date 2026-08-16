/**
 * 紐澳（紐西蘭、澳洲雙切換）吃到飽 — Vodafone / Spark
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const ANZ_TELECOM_VF = "VODAFONE + NZ V";

const ANZ_CARRIER_INTRO =
  "澳洲段走 Vodafone（TPG／Vodafone），紐西蘭段走 Vodafone（One NZ）與 Spark 雙網切換。單一 eSIM 可在雪梨、墨爾本、布里斯本與奧克蘭、皇后鎮來回使用，適合澳紐連遊、打工度假與自駕；內陸與南島山區訊號仍會下降。";

const EXP_UNLIM =
  "雪梨、墨爾本、奧克蘭、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps，內陸、南島山區與偏遠公路會明顯下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

export function anzVfUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **紐澳雙切換** 吃到飽 eSIM，單一 eSIM 可在澳洲與紐西蘭使用。",
      ANZ_CARRIER_INTRO,
      "**為什麼選擇 VODAFONE＋NZ V？**",
      "**澳洲 Vodafone 4G／5G**：雪梨、墨爾本、布里斯本、黃金海岸等熱門行程較穩。",
      "**紐西蘭 Vodafone／Spark 4G／5G**：奧克蘭、威靈頓、基督城、皇后鎮與南北島自駕互補。",
      "**吃到飽不限流量（FUP）**：公平使用政策下可持續上網，適合澳紐來回、打工度假與自駕。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數**：目前提供 10 天、15 天。",
      "**安裝提醒**：建議抵達澳洲或紐西蘭後再啟用 eSIM。",
    ],
    EXP_UNLIM,
  );
}

export function anzUnlimitedKeyFeaturesByCarrier() {
  return {
    [ANZ_TELECOM_VF]: anzVfUnlimitedKeyFeatures(),
  };
}

export default {
  ANZ_TELECOM_VF,
  anzVfUnlimitedKeyFeatures,
  anzUnlimitedKeyFeaturesByCarrier,
};
