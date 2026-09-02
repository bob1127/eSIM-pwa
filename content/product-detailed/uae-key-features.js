/**
 * 杜拜、阿布達比 — 重點特色
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const UAE_TELECOM_DU = "DU UAE";
export const UAE_TELECOM_DUAL = "Etisalat / DU UAE";

const EXP_DAILY_TOTAL =
  "杜拜、阿布達比市區與主要幹道 4G／5G 常見可用；沙漠行程、Outlet 與部分室內訊號會下降。高速額度用完後約 128kbps——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";
const EXP_UNLIMITED =
  "杜拜、阿布達比市區漫遊吃到飽；偏遠或室內可能降速。出網香港 IP，ChatGPT 可能受限，Gemini 通常可用。僅供參考。";

export function uaeDuDailyKeyFeatures() {
  return pack(
    [
      "本方案為杜拜、阿布達比每日型 eSIM，走 DU UAE 4G／5G，出網波蘭 IP。",
      "**基本介紹與特色**",
      "**覆蓋範圍：** 杜拜、阿布達比、Sharjah 等主要都會區。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）。",
      "**數據路由：** 波蘭 IP 漫遊，支援 ChatGPT 與 Gemini。",
      "**本站方案：** 每日型；1～30 天可選，支援熱點。",
      "**使用注意：** 建議抵達杜拜／阿布達比後再安裝／啟用。",
    ],
    EXP_DAILY_TOTAL,
  );
}

export function uaeDailyKeyFeaturesByCarrier() {
  return { [UAE_TELECOM_DU]: uaeDuDailyKeyFeatures() };
}

export function uaeDuTotalKeyFeatures() {
  return pack(
    [
      "本方案為杜拜、阿布達比總量型 eSIM，走 DU UAE 4G／5G，出網波蘭 IP。",
      "**基本介紹與特色**",
      "**覆蓋範圍：** 杜拜、阿布達比等主要都會區。",
      "**網路速度：** 可選 1GB～50GB；高速用完後約 128kbps 續航。",
      "**數據路由：** 波蘭 IP 漫遊，支援 ChatGPT 與 Gemini。",
      "**本站方案：** 總量型；支援熱點。",
      "**使用注意：** 建議抵達杜拜／阿布達比後再安裝／啟用。",
    ],
    EXP_DAILY_TOTAL,
  );
}

export function uaeTotalKeyFeaturesByCarrier() {
  return { [UAE_TELECOM_DU]: uaeDuTotalKeyFeatures() };
}

export function uaeDualUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為杜拜、阿布達比吃到飽 eSIM，Etisalat／DU 雙網自動，出網香港 IP。",
      "**基本介紹與特色**",
      "**覆蓋範圍：** 杜拜、阿布達比等主要都會區。",
      "**網路速度：** 不限流量吃到飽（依供應商 Fair Use）。",
      "**數據路由：** 香港 IP 漫遊；Gemini 通常可用，ChatGPT 可能受限。",
      "**本站方案：** 吃到飽；1／3／5／7／10／15／20／30 天。",
      "**使用注意：** 建議抵達杜拜／阿布達比後再安裝／啟用。",
    ],
    EXP_UNLIMITED,
  );
}

export function uaeUnlimitedKeyFeaturesByCarrier() {
  return { [UAE_TELECOM_DUAL]: uaeDualUnlimitedKeyFeatures() };
}

export default {
  UAE_TELECOM_DU,
  UAE_TELECOM_DUAL,
  uaeDailyKeyFeaturesByCarrier,
  uaeTotalKeyFeaturesByCarrier,
  uaeUnlimitedKeyFeaturesByCarrier,
};
