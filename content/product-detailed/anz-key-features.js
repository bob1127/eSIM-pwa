/**
 * 紐澳（澳洲＋紐西蘭）— 重點特色（AI 摘要風）
 * 電信：VODAFONE + NZ V
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const ANZ_TELECOM_VF = "VODAFONE + NZ V";

const EXP_UNLIM =
  "雪梨、墨爾本、奧克蘭、皇后鎮等都會區 4G／5G 測速常見可到數十 Mbps，內陸、南島山區與偏遠公路會明顯下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

export function anzVfUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為紐澳雙切換吃到飽 eSIM，單一 eSIM 可在澳洲與紐西蘭使用，適合澳紐連遊、打工度假與自駕。",
      "**基本介紹與特色**",
      "**市場地位：** 澳洲段走 Vodafone（TPG／Vodafone），紐西蘭段走 Vodafone（One NZ）與 Spark 雙網切換。",
      "**覆蓋範圍：** 雪梨、墨爾本、布里斯本、黃金海岸與奧克蘭、威靈頓、基督城、皇后鎮等；內陸與南島山區會下降。",
      "**網路速度：** 吃到飽不限流量（FUP），可持續上網。",
      "**本站方案：** 吃到飽；目前提供 10 天、15 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達澳洲或紐西蘭後再啟用。",
    ],
    EXP_UNLIM,
  );
}

export function anzUnlimitedKeyFeaturesByCarrier() {
  return { [ANZ_TELECOM_VF]: anzVfUnlimitedKeyFeatures() };
}

export default {
  ANZ_TELECOM_VF,
  anzVfUnlimitedKeyFeatures,
  anzUnlimitedKeyFeaturesByCarrier,
};
