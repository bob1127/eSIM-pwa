/**
 * 法國 — 重點特色（AI 摘要風：短介紹 → 基本介紹與特色 → 粗體分類）
 * 電信：ORANGE +
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const FR_TELECOM_ORANGE = "ORANGE +";

const EXP_UNLIM =
  "巴黎、里昂、尼斯、馬賽等都會區 4G／5G 測速常見可到數十 Mbps；地鐵、古蹟室內與鄉村會下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

const EXP_TOTAL =
  "高速額度內：巴黎、里昂、尼斯、馬賽等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_DAILY =
  "每日高速額度內：巴黎、里昂、尼斯、馬賽等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function frOrangeUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為法國吃到飽 eSIM，走 Orange／Bouygues／Free Mobile 等主流網路，適合巴黎與主要城市觀光、自駕與出差。",
      "**基本介紹與特色**",
      "**市場地位：** Orange 為法國覆蓋最廣的傳統電信之一，搭配 Bouygues、Free Mobile 都會區表現穩定。",
      "**覆蓋範圍：** 巴黎、里昂、尼斯、馬賽等主要城市與交通沿線（地鐵、古蹟室內與鄉村訊號會下降）。",
      "**網路速度：** 吃到飽不限流量（FUP），可持續上網。",
      "**本站方案：** 吃到飽；天數可選 1／3／5／7／10／15／20／30／60／90 天。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達法國後再啟用。",
    ],
    EXP_UNLIM,
  );
}

export function frUnlimitedKeyFeaturesByCarrier() {
  return { [FR_TELECOM_ORANGE]: frOrangeUnlimitedKeyFeatures() };
}

export function frOrangeTotalKeyFeatures() {
  return pack(
    [
      "本方案為法國總量型 eSIM，走 Orange／Bouygues 雙網，適合想控管總流量的訪法行程。",
      "**基本介紹與特色**",
      "**市場地位：** Orange France、Bouygues France 為法國主流電信，巴黎與主要城市較穩。",
      "**覆蓋範圍：** 巴黎、里昂、尼斯、馬賽等熱門目的地與交通沿線。",
      "**網路速度：** 可選 1GB／3GB／5GB／10GB／20GB／30GB／50GB；高速用完後約 128kbps 續航。",
      "**本站方案：** 總量型；天數 3／5／7／10／15／30 天（視流量組合）。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_TOTAL,
  );
}

export function frTotalKeyFeaturesByCarrier() {
  return { [FR_TELECOM_ORANGE]: frOrangeTotalKeyFeatures() };
}

export function frOrangeDailyKeyFeatures() {
  return pack(
    [
      "本方案為法國每日型 eSIM，走 Orange／Bouygues 雙網，適合想控管每日用量的旅客。",
      "**基本介紹與特色**",
      "**市場地位：** Orange France、Bouygues France 主流覆蓋，巴黎與主要城市較穩。",
      "**覆蓋範圍：** 巴黎、里昂、尼斯、馬賽等熱門目的地。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；高速用完後約 128kbps（每日重置）。",
      "**本站方案：** 每日型；天數 1／2／3／5／7／10／15／20／30 天（視流量組合）。",
      "**旅遊便利：** 支援熱點與 ChatGPT／TikTok／Gemini。建議抵達後再啟用。",
    ],
    EXP_DAILY,
  );
}

export function frDailyKeyFeaturesByCarrier() {
  return { [FR_TELECOM_ORANGE]: frOrangeDailyKeyFeatures() };
}

export default {
  FR_TELECOM_ORANGE,
  frOrangeUnlimitedKeyFeatures,
  frUnlimitedKeyFeaturesByCarrier,
  frOrangeTotalKeyFeatures,
  frTotalKeyFeaturesByCarrier,
  frOrangeDailyKeyFeatures,
  frDailyKeyFeaturesByCarrier,
};
