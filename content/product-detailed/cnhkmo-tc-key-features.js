/**
 * 中港澳 T+C（cnhkmo-tc-esim）— 重點特色（AI 摘要風）
 * 電信選項：吃到飽｜每日型｜總量型
 */
function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CNHKMO_TC_DAILY = "每日型";
export const CNHKMO_TC_TOTAL = "總量型";
export const CNHKMO_TC_UNLIM = "吃到飽";

export const CNHKMO_TC_CARRIER_ZH =
  "中國電信／聯通／CSL／澳門電訊";
export const CNHKMO_TC_CARRIER_EN =
  "China Telecom / China Unicom / CSL / CTM";

export function cnhkmoTcDailyKeyFeatures() {
  return pack(
    [
      "本每日型方案走中國電信／聯通／CSL／澳門電訊，出網為新加坡 IP，一卡涵蓋中港澳。",
      "**基本介紹與特色**",
      "**市場地位：** 四網互補，熱門城市覆蓋良好。",
      "**覆蓋範圍：** 中國大陸、香港、澳門。",
      "**網路速度：** 可選每日 500MB～3GB；用完後約 128kbps（另有約 5Mbps 續航）。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 免 VPN 社群；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    "高速額度內都會區測速常見可到數十 Mbps。用完後約 128kbps 僅適合傳訊；5Mbps 續航較適導航。僅供參考。",
  );
}

export function cnhkmoTcTotalKeyFeatures() {
  return pack(
    [
      "本總量型方案走中國電信／聯通／CSL／澳門電訊，出網為新加坡 IP，於有效天數內共用固定總流量。",
      "**基本介紹與特色**",
      "**市場地位：** 四網互補，熱門城市覆蓋良好。",
      "**覆蓋範圍：** 中國大陸、香港、澳門。",
      "**網路速度：** 可選多種 GB／天數；高速用完後約 128kbps。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 免 VPN 社群；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議預留流量緩衝；抵達後再啟用。",
    ],
    "高速額度內都會區測速常見可到數十 Mbps；進入約 128kbps 後僅適合傳訊。僅供參考。",
  );
}

export function cnhkmoTcUnlimKeyFeatures() {
  return pack(
    [
      "本吃到飽方案：短／長天數皆走電信／聯通／CSL／澳門電訊（約 10Mbps・新加坡 IP・T+C）；短天數 1～10 天、長天數 11 天起。",
      "**基本介紹與特色**",
      "**市場地位：** 一卡三地，適合短住到長住。",
      "**覆蓋範圍：** 中國大陸、香港、澳門。",
      "**網路速度：** 約 10Mbps 吃到飽（FUP）。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 免 VPN 社群；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    "進入 FUP 後測速多半約 7～12Mbps。新加坡 IP 下 LINE／IG／FB／TikTok 一般可免 VPN。僅供參考。",
  );
}

export function cnhkmoTcKeyFeaturesByCarrier() {
  return {
    [CNHKMO_TC_DAILY]: cnhkmoTcDailyKeyFeatures(),
    [CNHKMO_TC_TOTAL]: cnhkmoTcTotalKeyFeatures(),
    [CNHKMO_TC_UNLIM]: cnhkmoTcUnlimKeyFeatures(),
  };
}

export default {
  cnhkmoTcDailyKeyFeatures,
  cnhkmoTcTotalKeyFeatures,
  cnhkmoTcUnlimKeyFeatures,
  cnhkmoTcKeyFeaturesByCarrier,
};
