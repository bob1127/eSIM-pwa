/**
 * 中港澳吃到飽 — 重點特色（AI 摘要風）
 */
export const CNHKMO_TELECOM_SHORT =
  "短天數｜中國電信／CSL／澳門電信";
export const CNHKMO_TELECOM_LONG =
  "長天數｜中國電信／聯通／CSL／澳門電訊";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export function cnhkmoShortCtKeyFeatures() {
  return pack(
    [
      "本線路走中國電信、香港 CSL／中國電信香港、澳門電信，一卡涵蓋中國大陸、香港與澳門，出網為香港 IP。",
      "**基本介紹與特色**",
      "**市場地位：** 短天數主力線路，適合 1～10 天行程。",
      "**覆蓋範圍：** 中國大陸、香港、澳門熱門城市。",
      "**網路速度：** 不限流量吃到飽（FUP）。",
      "**數據路由：** 香港 IP 漫遊。",
      "**本站方案：** 免 VPN 社群（LINE／IG／FB 多數可用）；支援熱點。",
      "**使用注意：** 建議抵達覆蓋範圍後再啟用。",
    ],
    "香港／澳門與大陸都會區訊號通常穩定。出網為香港 IP 時，LINE／IG／FB 多數可免 VPN。測速與 App 可用性僅供參考。",
  );
}

/** @deprecated 舊短天數（中國移動）文案，改用 cnhkmoShortCtKeyFeatures */
export function cnhkmoShortCmccKeyFeatures() {
  return cnhkmoShortCtKeyFeatures();
}

export function cnhkmoLongTcKeyFeatures() {
  return pack(
    [
      "本線路走中國電信、中國聯通、香港 CSL、澳門電訊（CTM），天數自 11 天起，出網為新加坡 IP。",
      "**基本介紹與特色**",
      "**市場地位：** 長天數主力線路，適合較長行程。",
      "**覆蓋範圍：** 中國大陸、香港、澳門熱門城市。",
      "**網路速度：** 約 10Mbps 吃到飽（FUP）。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 免 VPN 社群；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達覆蓋範圍後再啟用。",
    ],
    "進入 FUP 後測速多半約 7～12Mbps。導航、傳訊、社群通常沒問題；720p 影音多數可看。新加坡 IP 下 LINE／IG／FB／TikTok 一般可免 VPN，僅供參考。",
  );
}

export default {
  cnhkmoShortCtKeyFeatures,
  cnhkmoShortCmccKeyFeatures,
  cnhkmoLongTcKeyFeatures,
};
