/**
 * 台灣 — 重點特色（AI 摘要風）
 * 吃到飽：中華 5／10Mbps｜每日：台哥大／5Mbps續航｜總量：中華／雙網
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const TW_TELECOM_5 = "中華電信 5Mbps";
export const TW_TELECOM_10 = "中華電信 10Mbps";
export const TW_TELECOM_CHT = "中華電信";
export const TW_TELECOM_DUAL = "台灣大哥大 / 中華電信";
export const TW_TELECOM_TWM = "台灣大哥大";
export const TW_TELECOM_TWM_5 = "台灣大哥大 5Mbps續航";
export const TW_EKYC_TOTAL = "總量型";
export const TW_EKYC_DAILY = "每日型";
export const TW_EKYC_UNLIM = "吃到飽";
export const TW_EKYC_URL =
  "https://glcm.gloableconnect.com/prepaid/realname";

const EXP_5 =
  "高速額度內（每日約 2GB）：台北、台中、高雄都會區 4G／5G 測速常見可到數十 Mbps（室內／捷運／擁塞時會下降）。進入約 5Mbps 吃到飽後，測速多半約 4～7Mbps——導航、傳訊、網頁通常沒問題；720p 影音多數可看。流量與天數以台灣時間 00:00（UTC+8）重置。僅供參考。";

const EXP_10 =
  "高速額度內（每日約 1GB）：都會區 4G／5G 測速常見可到數十 Mbps。進入約 10Mbps 吃到飽後，測速多半約 7～12Mbps——導航、傳訊、網頁通常沒問題；720p 影音多數可看，1080p／多人熱點可能卡。流量與天數以台灣時間 00:00（UTC+8）重置。僅供參考。";

const EXP_TOTAL =
  "高速額度內：台北、台中、高雄都會區 4G／5G 測速常見可到數十 Mbps（室內／捷運／擁塞時會下降）。總量高速用完後會斷網，無法繼續使用，請依行程預留用量或改選吃到飽。僅供參考。";

const EXP_TOTAL_FUP =
  "高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速至約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，地圖即時導航、影音、熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

const EXP_TWM_DAILY =
  "每日高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。新加坡 IP，標示支援 TikTok／ChatGPT／Gemini。流量與天數以台灣時間 00:00（UTC+8）重置。僅供參考。";

const EXP_TWM_DAILY_5 =
  "每日 1GB 高速後約 5Mbps 續航：都會區測速常見可到數十 Mbps；進入約 5Mbps 後導航、傳訊、網頁通常沒問題，720p 影音多數可看。新加坡 IP，標示支援 TikTok／ChatGPT／Gemini。流量與天數以台灣時間 00:00（UTC+8）重置。僅供參考。";

const EXP_EKYC_TOTAL =
  "高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。總量高速用完後會斷網。啟用前須完成供應商實名認證。僅供參考。";

const EXP_EKYC_DAILY =
  "每日高速額度內都會區測速常見可到數十 Mbps。用完後降速約 384kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。流量與天數以台灣時間 00:00（UTC+8）重置。啟用前須完成實名認證。僅供參考。";

const EXP_EKYC_UNLIM =
  "吃到飽（依供應商 FUP）：都會區 4G／5G 測速常見可到數十 Mbps，擁塞時會下降。出網為香港 IP，ChatGPT／TikTok 可能受限。啟用前須完成實名認證。僅供參考。";

export function taiwanChunghwa5MbpsKeyFeatures() {
  return pack(
    [
      "中華電信是台灣覆蓋最廣的行動電信之一，本方案為 5G 吃到飽、無需實名，適合返台與來台短住。",
      "**基本介紹與特色**",
      "**市場地位：** 台灣最大電信，全台城市／高鐵／機場訊號穩定。",
      "**覆蓋範圍：** 台北、台中、高雄、高鐵沿線與熱門景點。",
      "**網路速度：** 每日約 2GB 高速後約 5Mbps 吃到飽。",
      "**數據路由：** 香港／新加坡 IP 漫遊（3HK）。",
      "**本站方案：** 無需 eKYC；支援熱點（ChatGPT／TikTok 可能受限）。",
      "**使用注意：** 流量／天數以台灣時間 00:00 重置；建議抵達後再啟用。",
    ],
    EXP_5,
  );
}

export function taiwanChunghwa10MbpsKeyFeatures() {
  return pack(
    [
      "中華電信是台灣覆蓋最廣的行動電信之一，本方案為 5G 吃到飽、無需實名，適合用量較大的行程。",
      "**基本介紹與特色**",
      "**市場地位：** 台灣最大電信，全台城市／高鐵／機場訊號穩定。",
      "**覆蓋範圍：** 台北、台中、高雄、高鐵沿線與熱門景點。",
      "**網路速度：** 每日約 1GB 高速後約 10Mbps 吃到飽。",
      "**數據路由：** 香港／新加坡 IP 漫遊（3HK）。",
      "**本站方案：** 無需 eKYC；支援熱點（ChatGPT／TikTok 可能受限）。",
      "**使用注意：** 流量／天數以台灣時間 00:00 重置；建議抵達後再啟用。",
    ],
    EXP_10,
  );
}

export function taiwanUnlimitedKeyFeaturesByCarrier() {
  return {
    [TW_TELECOM_5]: taiwanChunghwa5MbpsKeyFeatures(),
    [TW_TELECOM_10]: taiwanChunghwa10MbpsKeyFeatures(),
  };
}

export function taiwanChunghwaTotalKeyFeatures() {
  return pack(
    [
      "本方案為中華電信 5G 總量型 eSIM，無需實名，適合可預估用量的短住。",
      "**基本介紹與特色**",
      "**市場地位：** 台灣最大電信，覆蓋穩定。",
      "**覆蓋範圍：** 全台主要城市、高鐵、機場與熱門景點。",
      "**網路速度：** 可選 3GB～50GB；高速用完即斷網。",
      "**數據路由：** 香港／新加坡 IP 漫遊（3HK）。",
      "**本站方案：** 無需 eKYC；支援熱點（ChatGPT／TikTok 可能受限）。",
      "**使用注意：** 建議抵達後再啟用；用量用完請改選吃到飽或加購。",
    ],
    EXP_TOTAL,
  );
}

export function taiwanDualTotalKeyFeatures() {
  return pack(
    [
      "本方案為台灣大哥大／中華電信雙網總量型 eSIM，單一 eSIM 可雙網切換。",
      "**基本介紹與特色**",
      "**市場地位：** 雙網互補，移動中較不易斷線。",
      "**覆蓋範圍：** 全台主要城市與交通沿線。",
      "**網路速度：** 可選 1GB～60GB；高速用完後約 128kbps 續航。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 支援熱點與 TikTok／ChatGPT。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_TOTAL_FUP,
  );
}

export function taiwanTotalKeyFeaturesByCarrier() {
  return {
    [TW_TELECOM_CHT]: taiwanChunghwaTotalKeyFeatures(),
    [TW_TELECOM_DUAL]: taiwanDualTotalKeyFeatures(),
  };
}

export function taiwanEkycTotalKeyFeatures() {
  return pack(
    [
      "本方案為中華電信 5G 總量型 eSIM，需完成供應商實名認證後再啟用。",
      "**基本介紹與特色**",
      "**市場地位：** 中華電信 4G／5G 覆蓋穩定。",
      "**覆蓋範圍：** 全台主要城市、高鐵、機場。",
      "**網路速度：** 可選 1GB～50GB；高速用完即斷網。",
      "**數據路由：** 香港 IP 漫遊（cmhk）。",
      "**本站方案：** 需 eKYC；支援熱點。",
      "**使用注意：** 請先完成實名，抵達後再啟用。",
    ],
    EXP_EKYC_TOTAL,
  );
}

export function taiwanEkycDailyKeyFeatures() {
  return pack(
    [
      "本方案為中華電信 5G 每日型 eSIM，需完成供應商實名認證後再啟用。",
      "**基本介紹與特色**",
      "**市場地位：** 中華電信 4G／5G 覆蓋穩定。",
      "**覆蓋範圍：** 全台主要城市、高鐵、機場。",
      "**網路速度：** 可選每日 500MB～3GB；用完後約 384kbps。",
      "**數據路由：** 香港 IP 漫遊（cmhk）。",
      "**本站方案：** 需 eKYC；支援熱點。",
      "**使用注意：** 請先完成實名；流量以台灣時間 00:00 重置。",
    ],
    EXP_EKYC_DAILY,
  );
}

export function taiwanEkycUnlimKeyFeatures() {
  return pack(
    [
      "本方案為中華電信 5G 吃到飽 eSIM，需完成供應商實名認證後再啟用。",
      "**基本介紹與特色**",
      "**市場地位：** 中華電信 4G／5G 覆蓋穩定。",
      "**覆蓋範圍：** 全台主要城市、高鐵、機場。",
      "**網路速度：** 不限流量（FUP）。",
      "**數據路由：** 香港 IP 漫遊（cmhk）。",
      "**本站方案：** 需 eKYC；支援熱點。",
      "**使用注意：** 請先完成實名，抵達後再啟用。",
    ],
    EXP_EKYC_UNLIM,
  );
}

export function taiwanEkycKeyFeaturesByCarrier() {
  return {
    [TW_EKYC_TOTAL]: taiwanEkycTotalKeyFeatures(),
    [TW_EKYC_DAILY]: taiwanEkycDailyKeyFeatures(),
    [TW_EKYC_UNLIM]: taiwanEkycUnlimKeyFeatures(),
  };
}

export function taiwanTwmDailyKeyFeatures() {
  return pack(
    [
      "台灣大哥大是台灣主流電信之一，本每日型方案無需實名，出網為新加坡 IP。",
      "**基本介紹與特色**",
      "**市場地位：** 台灣三大電信之一，都會區覆蓋良好。",
      "**覆蓋範圍：** 全台主要城市、機場與熱門景點。",
      "**網路速度：** 可選每日 500MB～3GB；用完後約 128kbps。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 無需 eKYC；支援熱點與 TikTok／ChatGPT／Gemini。",
      "**使用注意：** 流量／天數以台灣時間 00:00 重置；建議抵達後再啟用。",
    ],
    EXP_TWM_DAILY,
  );
}

export function taiwanTwmDaily5MbpsKeyFeatures() {
  return pack(
    [
      "台灣大哥大每日型（5Mbps 續航）無需實名，高速用完後仍可持續上網。",
      "**基本介紹與特色**",
      "**市場地位：** 台灣三大電信之一。",
      "**覆蓋範圍：** 全台主要城市、機場與熱門景點。",
      "**網路速度：** 每日約 1GB 高速後約 5Mbps 續航。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 無需 eKYC；支援熱點與 TikTok／ChatGPT／Gemini。",
      "**使用注意：** 流量／天數以台灣時間 00:00 重置；建議抵達後再啟用。",
    ],
    EXP_TWM_DAILY_5,
  );
}

export function taiwanDailyKeyFeaturesByCarrier() {
  return {
    [TW_TELECOM_TWM]: taiwanTwmDailyKeyFeatures(),
    [TW_TELECOM_TWM_5]: taiwanTwmDaily5MbpsKeyFeatures(),
  };
}

export default {
  TW_TELECOM_5,
  TW_TELECOM_10,
  TW_TELECOM_CHT,
  TW_TELECOM_DUAL,
  TW_TELECOM_TWM,
  TW_TELECOM_TWM_5,
  TW_EKYC_TOTAL,
  TW_EKYC_DAILY,
  TW_EKYC_UNLIM,
  TW_EKYC_URL,
  taiwanChunghwa5MbpsKeyFeatures,
  taiwanChunghwa10MbpsKeyFeatures,
  taiwanChunghwaTotalKeyFeatures,
  taiwanDualTotalKeyFeatures,
  taiwanUnlimitedKeyFeaturesByCarrier,
  taiwanTotalKeyFeaturesByCarrier,
  taiwanEkycKeyFeaturesByCarrier,
  taiwanDailyKeyFeaturesByCarrier,
};
