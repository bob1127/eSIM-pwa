/**
 * 台灣吃到飽 — 中華電信 5G（無需實名認證）
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

export function taiwanChunghwa5MbpsKeyFeatures() {
  return pack(
    [
      "本方案為 **中華電信 5G** 吃到飽 eSIM，**無需實名認證（No eKYC）**，開機即可上網。",
      "**為什麼選擇中華電信 5Mbps 吃到飽？**",
      "**無需實名**：不走台灣本地門號實名流程，免上傳證件、免審核等待，適合返台、來台短住與臨時上網。",
      "**中華電信 4G／5G**：覆蓋全台主要城市、高鐵、機場與熱門景點。",
      "**每日 2GB 高速後約 5Mbps 吃到飽**：高速額度用完後仍可持續上網，不會斷網。",
      "**流量／天數重置**：每日 00:00（台灣時間 UTC+8）重置高速額度與計日。",
      "**漫遊節點**：APN `mobile.three.com.hk`（3HK），出網為香港／新加坡 IP；ChatGPT／TikTok 可能受限。",
      "**安裝提醒**：建議抵達台灣覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_5,
  );
}

export function taiwanChunghwa10MbpsKeyFeatures() {
  return pack(
    [
      "本方案為 **中華電信 5G** 吃到飽 eSIM，**無需實名認證（No eKYC）**，開機即可上網。",
      "**為什麼選擇中華電信 10Mbps 吃到飽？**",
      "**無需實名**：不走台灣本地門號實名流程，免上傳證件、免審核等待，適合返台、來台短住與臨時上網。",
      "**中華電信 4G／5G**：覆蓋全台主要城市、高鐵、機場與熱門景點。",
      "**每日 1GB 高速後約 10Mbps 吃到飽**：高速額度用完後仍可持續上網，不會斷網。",
      "**流量／天數重置**：每日 00:00（台灣時間 UTC+8）重置高速額度與計日。",
      "**漫遊節點**：APN `mobile.three.com.hk`（3HK），出網為香港／新加坡 IP；ChatGPT／TikTok 可能受限。",
      "**安裝提醒**：建議抵達台灣覆蓋範圍後再啟用 eSIM。",
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

const EXP_TOTAL =
  "高速額度內：台北、台中、高雄都會區 4G／5G 測速常見可到數十 Mbps（室內／捷運／擁塞時會下降）。總量高速用完後會斷網，無法繼續使用，請依行程預留用量或改選吃到飽。僅供參考。";

const EXP_TOTAL_FUP =
  "高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速至約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，地圖即時導航、影音、熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

export function taiwanChunghwaTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **中華電信 5G** 總量型 eSIM，**無需實名認證（No eKYC）**，開機即可上網。",
      "**為什麼選擇中華電信總量型？**",
      "**無需實名**：不走台灣本地門號實名流程，免上傳證件、免審核等待，適合返台、來台短住與臨時上網。",
      "**中華電信 4G／5G**：覆蓋全台主要城市、高鐵、機場與熱門景點。",
      "**總量高速、用完斷網**：可選 3GB／5GB／10GB／20GB／30GB／50GB；高速額度用完即斷網（非降速吃到飽），請依行程預估用量。",
      "**天數彈性**：3／5／7／10／15／30 天可選；計日以台灣時間 00:00（UTC+8）為準。",
      "**漫遊節點**：APN `mobile.three.com.hk`（3HK），出網為香港／新加坡 IP；ChatGPT／TikTok 可能受限。",
      "**安裝提醒**：建議抵達台灣覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_TOTAL,
  );
}

export function taiwanDualTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **台灣大哥大／中華電信雙網** 總量型 eSIM，單一 eSIM 可在兩家網路間切換。",
      "**為什麼選擇雙網總量型？**",
      "**雙網自動切換**：台灣大哥大與中華電信互補，移動中較不易斷線。",
      "**總量高速後約 128kbps 吃到飽**：可選 1GB～60GB；高速用完後降速可持續使用（非斷網）。",
      "**支援 TikTok／ChatGPT**：供應商標示 Support Tiktok & GPT；新加坡 IP 漫遊（APN e-ideas）。",
      "**天數彈性**：3～60 天可選，適合短住到長住。",
      "**安裝提醒**：建議抵達台灣覆蓋範圍後再啟用 eSIM。",
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

const EXP_EKYC_TOTAL =
  "高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。總量高速用完後會斷網。啟用前須完成供應商實名認證。僅供參考。";

const EXP_EKYC_DAILY =
  "每日高速額度內都會區測速常見可到數十 Mbps。用完後降速約 384kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。流量與天數以台灣時間 00:00（UTC+8）重置。啟用前須完成實名認證。僅供參考。";

const EXP_EKYC_UNLIM =
  "吃到飽（依供應商 FUP）：都會區 4G／5G 測速常見可到數十 Mbps，擁塞時會下降。出網為香港 IP，ChatGPT／TikTok 可能受限。啟用前須完成實名認證。僅供參考。";

export function taiwanEkycTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **中華電信 5G** 總量型 eSIM，**需實名認證（eKYC required）**。",
      "**為什麼選擇需實名總量型？**",
      "**實名認證**：購買後請至供應商實名頁完成認證後再啟用（連結見商品說明）。",
      "**中華電信 4G／5G**：覆蓋全台主要城市、高鐵、機場與熱門景點。",
      "**總量高速、用完斷網**：可選 1GB～50GB；高速額度用完即斷網，請依行程預估用量。",
      "**漫遊節點**：APN `cmhk`，出網為香港 IP；ChatGPT／TikTok 可能受限。",
      "**安裝提醒**：建議先完成實名，抵達台灣覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_EKYC_TOTAL,
  );
}

export function taiwanEkycDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **中華電信 5G** 每日型 eSIM，**需實名認證（eKYC required）**。",
      "**為什麼選擇需實名每日型？**",
      "**實名認證**：購買後請至供應商實名頁完成認證後再啟用。",
      "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速約 **384kbps** 可持續使用。",
      "**流量／天數重置**：每日 00:00（台灣時間 UTC+8）重置高速額度與計日。",
      "**漫遊節點**：APN `cmhk`，出網為香港 IP；ChatGPT／TikTok 可能受限。",
      "**安裝提醒**：建議先完成實名，抵達台灣覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_EKYC_DAILY,
  );
}

export function taiwanEkycUnlimKeyFeatures() {
  return pack(
    [
      "本方案為 **中華電信 5G** 吃到飽 eSIM，**需實名認證（eKYC required）**。",
      "**為什麼選擇需實名吃到飽？**",
      "**實名認證**：購買後請至供應商實名頁完成認證後再啟用。",
      "**不限流量**：依供應商公平使用政策（FUP）使用；適合用量較大的行程。",
      "**中華電信 4G／5G**：覆蓋全台主要城市、高鐵、機場與熱門景點。",
      "**漫遊節點**：APN `cmhk`，出網為香港 IP；ChatGPT／TikTok 可能受限。",
      "**安裝提醒**：建議先完成實名，抵達台灣覆蓋範圍後再啟用 eSIM。",
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

const EXP_TWM_DAILY =
  "每日高速額度內：都會區 4G／5G 測速常見可到數十 Mbps。用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。新加坡 IP，標示支援 TikTok／ChatGPT／Gemini。流量與天數以台灣時間 00:00（UTC+8）重置。僅供參考。";

const EXP_TWM_DAILY_5 =
  "每日 1GB 高速後約 5Mbps 續航：都會區測速常見可到數十 Mbps；進入約 5Mbps 後導航、傳訊、網頁通常沒問題，720p 影音多數可看。新加坡 IP，標示支援 TikTok／ChatGPT／Gemini。流量與天數以台灣時間 00:00（UTC+8）重置。僅供參考。";

export function taiwanTwmDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **台灣大哥大 5G** 每日型 eSIM，**無需實名認證（No eKYC）**，開機即可上網。",
      "**為什麼選擇台灣大哥大每日型？**",
      "**無需實名**：API 明文 No ekyc needed，免上傳證件、免審核等待。",
      "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速約 **128kbps** 可持續使用。",
      "**支援 TikTok／ChatGPT／Gemini**：新加坡 IP 漫遊（APN e-ideas）。",
      "**流量／天數重置**：每日 00:00（台灣時間 UTC+8）重置高速額度與計日。",
      "**安裝提醒**：建議抵達台灣覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_TWM_DAILY,
  );
}

export function taiwanTwmDaily5MbpsKeyFeatures() {
  return pack(
    [
      "本方案為 **台灣大哥大 5G** 每日型 eSIM（**5Mbps 續航**），**無需實名認證（No eKYC）**。",
      "**為什麼選擇 5Mbps 續航？**",
      "**無需實名**：API 明文 No ekyc needed。",
      "**每日 1GB 高速後約 5Mbps**：高速用完後仍可持續上網，比 128kbps 更適導航與輕量影音。",
      "**支援 TikTok／ChatGPT／Gemini**：新加坡 IP 漫遊（APN e-ideas）。",
      "**流量／天數重置**：每日 00:00（台灣時間 UTC+8）重置。",
      "**安裝提醒**：建議抵達台灣覆蓋範圍後再啟用 eSIM。",
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
