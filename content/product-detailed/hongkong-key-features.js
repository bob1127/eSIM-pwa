/**
 * 香港 — 重點特色（AI 摘要風）
 */
function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const HK_UNLIMITED_TELECOM = "CSL / China Telecom HK";
export const HK_DAILY_TOTAL_TELECOM = "3HK";
export const HK_UNLIMITED_TC_TELECOM = "CUCC / China Telecom + CSL + CTM";

export function hongkongUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 CSL／China Telecom HK（香港電信／中國電信香港）吃到飽 eSIM，出網為香港 IP，適合訪港觀光、商務與短中期停留。",
      "**基本介紹與特色**",
      "**市場地位：** CSL 與中國電信香港為本地主流網路，市區與機場沿線覆蓋穩定。",
      "**覆蓋範圍：** 港島、九龍、新界熱門區域與機場／交通沿線（實際訊號依地區而定）。",
      "**網路速度：** 每日約 1GB 高速後維持約 10Mbps 無限流量。",
      "**數據路由：** 香港原生 IP，連線接近在地用戶。",
      "**本站方案：** 吃到飽；雙網互補。本線路不標示支援熱點／ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達香港覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "每日 1GB 高速內都會區測速常見可到數十 Mbps；進入約 10Mbps 後多半約 7～12Mbps。僅供參考。",
  );
}

export function hongkongUnlimitedTcKeyFeatures() {
  return pack(
    [
      "本方案為 CUCC／China Telecom + CSL + CTM 吃到飽 eSIM，出網為新加坡 IP，約 10Mbps 無限流量，可在香港使用並涵蓋鄰近常用目的地網路。",
      "**基本介紹與特色**",
      "**市場地位：** 多網組合（聯通／中國電信、香港 CSL、澳門 CTM），熱門區域覆蓋良好。",
      "**覆蓋範圍：** 香港為主，並可涵蓋鄰近常用目的地網路（實際依方案標示）。",
      "**網路速度：** 約 10Mbps 吃到飽，適合導航、社群與影音。",
      "**數據路由：** 新加坡 IP；一般可免 VPN 使用 LINE／IG／FB。",
      "**本站方案：** 吃到飽；支援熱點與 TikTok／Gemini（實際依裝置與平台）。",
      "**使用注意：** 建議抵達覆蓋範圍後再啟用。",
    ],
    "約 10Mbps 時測速多半約 7～12Mbps。新加坡 IP 下 LINE／IG／FB／TikTok 一般可免 VPN。僅供參考。",
  );
}

export function hongkongDailyKeyFeatures() {
  return pack(
    [
      "本方案為 3HK（香港電訊盈科／3）每日型 eSIM，出網為馬來西亞 IP，適合想控管每日用量的訪港旅客。",
      "**基本介紹與特色**",
      "**市場地位：** 3HK 為香港主流電信之一，熱門區域與交通沿線表現穩定。",
      "**覆蓋範圍：** 港島、九龍、新界熱門區域與機場沿線。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；高速用完後約 128kbps（每日重置）。",
      "**數據路由：** 馬來西亞 IP 漫遊；社群／影音一般可正常使用。",
      "**本站方案：** 每日型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達香港後再啟用。",
    ],
    "高速額度內都會區測速常見可到數十 Mbps；降速至約 128kbps 後僅適合傳訊。僅供參考。",
  );
}

export function hongkongTotalKeyFeatures() {
  return pack(
    [
      "本方案為 3HK 總量型 eSIM，出網為馬來西亞 IP，於有效天數內共用固定總流量。",
      "**基本介紹與特色**",
      "**市場地位：** 3HK 主流覆蓋，市區與機場沿線移動較安心。",
      "**覆蓋範圍：** 香港熱門城市區域與交通沿線。",
      "**網路速度：** 多種 GB／天數可選；高速用完後多數約 128kbps 續航。",
      "**數據路由：** 馬來西亞 IP 漫遊。",
      "**本站方案：** 總量型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 請預留流量緩衝；建議抵達後再啟用。",
    ],
    "高速額度內都會區測速常見可到數十 Mbps；進入約 128kbps 後僅適合傳訊。僅供參考。",
  );
}

export function hongkongUnlimitedKeyFeaturesByCarrier() {
  return {
    [HK_UNLIMITED_TELECOM]: hongkongUnlimitedKeyFeatures(),
    [HK_UNLIMITED_TC_TELECOM]: hongkongUnlimitedTcKeyFeatures(),
  };
}

export function hongkongDailyKeyFeaturesByCarrier() {
  return { [HK_DAILY_TOTAL_TELECOM]: hongkongDailyKeyFeatures() };
}

export function hongkongTotalKeyFeaturesByCarrier() {
  return { [HK_DAILY_TOTAL_TELECOM]: hongkongTotalKeyFeatures() };
}

export default {
  hongkongUnlimitedKeyFeatures,
  hongkongUnlimitedTcKeyFeatures,
  hongkongDailyKeyFeatures,
  hongkongTotalKeyFeatures,
  hongkongUnlimitedKeyFeaturesByCarrier,
  hongkongDailyKeyFeaturesByCarrier,
  hongkongTotalKeyFeaturesByCarrier,
};
