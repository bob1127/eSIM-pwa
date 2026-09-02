/**
 * 巴西 — 重點特色（吃到飽）
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const BR_TELECOM_VIVO = "VIVO BRAZIL";

const EXP_UNLIMITED =
  "里約、聖保羅等主要都會區 4G／5G 常見可用；亞馬遜偏遠區與部分室內訊號會下降。依供應商 Fair Use 吃到飽，僅供參考。";

export function brVivoUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為巴西吃到飽 eSIM，走 Vivo Brazil 4G／5G，出網波蘭 IP。",
      "**基本介紹與特色**",
      "**覆蓋範圍：** 里約、聖保羅、巴西利亞等主要都會區。",
      "**網路速度：** 不限流量吃到飽（依供應商 Fair Use）。",
      "**數據路由：** 波蘭 IP 漫遊，支援 ChatGPT、TikTok、Gemini。",
      "**本站方案：** 吃到飽；1／3／5／7／10／15／20／30 天可選，支援熱點。",
      "**使用注意：** 建議抵達巴西後再安裝／啟用。",
    ],
    EXP_UNLIMITED,
  );
}

export function brUnlimitedKeyFeaturesByCarrier() {
  return { [BR_TELECOM_VIVO]: brVivoUnlimitedKeyFeatures() };
}

export default {
  BR_TELECOM_VIVO,
  brUnlimitedKeyFeaturesByCarrier,
};
