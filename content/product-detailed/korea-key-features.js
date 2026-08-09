/**
 * 韓國三產品 — 重點特色／實際體驗（key_features_by_carrier）
 * 鍵＝前台電信商選項值（含舊名相容）
 */

export const KR_UNLIMITED_SK_NATIVE = "SK電信（韓國IP）";
export const KR_UNLIMITED_LG_SK = "LG U+ / SK電信";
export const KR_DAILY_TOTAL_DUAL = "LG U+ / SK電信 5G 雙切換";
export const KR_DAILY_TOTAL_SKT = "SK電信 5G";

/** 舊選項值（改名前） */
export const KR_DAILY_TOTAL_DUAL_LEGACY = "LG U+ / SKT 5G 雙切換";
export const KR_DAILY_TOTAL_SKT_LEGACY = "SKT 5G";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

/** 吃到飽｜原生 SK電信（韓國 IP）真高速 */
export function koreaSkNativeUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **SK電信（SKT）原生 eSIM**，走韓國當地網路、出網為**韓國 IP**，高速數據吃到飽（真・不限速，依供應商規則）。",
      "**為什麼選擇 SK電信原生？**",
      "**韓國原生 IP**：延遲低、連線接近在地用戶，適合導航、地圖、韓流搶票、直播與在地 App。",
      "**真高速吃到飽**：公平使用政策為無限高速數據，不會刻意鎖在 10Mbps；適合整天導航、視訊與大量使用。",
      "**SKT 4G／LTE 覆蓋**：韓國三大電信之一，首爾、釜山、濟州等熱門城市與交通沿線表現穩定。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok。",
      "**安裝提醒**：建議在台灣機場先安裝設定好，抵達韓國再啟用 eSIM。部分天數方案若需語音／簡訊可能另需實名（KYC），純數據一般可直接使用。",
    ],
    "首爾／釜山等都會區測速常見可到數十～百 Mbps 等級（視訊號與負載而定）。小編實測整天導航＋社群＋影音，未遇到刻意降速到 10Mbps 的狀況。韓國 IP 下在地 App／搶票通常較順。僅供參考。",
  );
}

/** 吃到飽｜LG U+ / SK電信 漫遊（新加坡 IP）每日 1GB 後約 10Mbps */
export function koreaLgSkUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **LG U+／SK電信 雙網漫遊** 吃到飽 eSIM，出網為**新加坡 IP**，每日 **1GB 高速**後維持約 **10Mbps** 無限流量。",
      "**為什麼選擇 LG U+／SK電信漫遊？**",
      "**雙網自動切換**：LG U+ 與 SKT 5G／4G 互補，移動中較不易斷線。",
      "**每日 1GB 高速＋10Mbps 吃到飽**：高速用完後仍可持續上網，適合需要整天有網、但不需極限速的旅客。",
      "**安裝即用**：多數手機可自動帶入 APN（e-ideas）。建議在台灣機場先安裝設定好，抵達當地再啟用。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
      "**適合誰**：行程較長、預算較省、接受新加坡 IP 與約 10Mbps 續航的旅客。",
    ],
    "每日 1GB 高速內：都會區測速常見可到數十 Mbps。進入約 10Mbps 吃到飽後，測速多半落在約 7～12Mbps——導航、傳訊、網頁通常沒問題；720p 影音多半可看，多人熱點或 1080p 可能卡。僅供參考。",
  );
}

/** 每日型／總量型｜LG U+ / SK電信 5G 雙切換（新加坡 IP） */
export function koreaLgSkDualKeyFeatures({ kind = "daily" } = {}) {
  const isDaily = kind === "daily";
  return pack(
    [
      `本方案為 **LG U+／SK電信 5G 雙切換** ${isDaily ? "每日型" : "總量型"} eSIM（漫遊線路），出網為**新加坡 IP**，雙電信自動切換找訊號。`,
      "**為什麼選擇雙切換？**",
      "**雙網備援**：LG U+ 與 SKT 5G／4G 互補，市區與移動中較穩定。",
      isDaily
        ? "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB；標準方案用完後約 128kbps，亦可選「5Mbps續航」用完後約 5Mbps 可持續使用（每日重置）。"
        : "**總量高速流量**：可選 3GB～50GB；高速用完後降速至約 128kbps 可持續使用。",
      "**安裝即用**：多數手機可自動帶入 APN（e-ideas）。建議在台灣機場先安裝設定好，抵達韓國再啟用。",
      "**支援熱點與常用 App**：熱點分享；選品標示支援 ChatGPT、TikTok、Gemini。",
    ],
    isDaily
      ? "高速額度內：首爾等都會區測速常見可到數十 Mbps。標準降速約 128kbps 後僅適合傳訊；若選 5Mbps 續航，傳訊／輕量網頁／低畫質影音通常仍可用。僅供參考。"
      : "總量高速內：都會區測速常見可到數十 Mbps。用完後約 128kbps 等級，僅適合傳訊。新加坡 IP 下多數社群可正常使用。僅供參考。",
  );
}

/** 每日型／總量型｜SK電信 5G 單網（香港 IP） */
export function koreaSkt5gKeyFeatures({ kind = "daily" } = {}) {
  const isDaily = kind === "daily";
  return pack(
    [
      `本方案為 **SK電信（SKT）5G** ${isDaily ? "每日型" : "總量型"} eSIM（漫遊線路），出網為**香港 IP**，走 SKT 單網。`,
      "**為什麼選擇 SK電信 5G？**",
      "**SKT 單網**：韓國最大電信之一，熱門城市 5G／4G 覆蓋佳。",
      isDaily
        ? "**每日高速額度**：可選每日 500MB／1GB／2GB；用完後降速至約 384kbps 可持續使用（每日重置）。"
        : "**總量高速流量**：可選 1GB～50GB；**流量用完即斷網**（無法繼續使用），請依行程預估用量。",
      "**安裝提醒**：APN 多為 cmhk；建議在台灣機場先安裝設定好，抵達韓國再啟用。",
      "**適合誰**：偏好 SKT 覆蓋、接受香港 IP；總量型請特別注意用完斷網。",
    ],
    isDaily
      ? "高速額度內：都會區測速常見可到數十 Mbps。用完後約 384kbps，傳訊／輕量網頁通常仍可用，影音會吃力。僅供參考。"
      : "總量高速內：都會區測速常見可到數十 Mbps。流量歸零後會斷網，無法再傳訊——建議預留餘量或改選雙切換（用完降速）方案。僅供參考。",
  );
}

export function koreaUnlimitedKeyFeaturesByCarrier() {
  return {
    [KR_UNLIMITED_SK_NATIVE]: koreaSkNativeUnlimitedKeyFeatures(),
    [KR_UNLIMITED_LG_SK]: koreaLgSkUnlimitedKeyFeatures(),
  };
}

export function koreaDailyKeyFeaturesByCarrier() {
  const dual = koreaLgSkDualKeyFeatures({ kind: "daily" });
  const skt = koreaSkt5gKeyFeatures({ kind: "daily" });
  return {
    [KR_DAILY_TOTAL_DUAL]: dual,
    [KR_DAILY_TOTAL_SKT]: skt,
    // 舊名相容（改名前／快取）
    [KR_DAILY_TOTAL_DUAL_LEGACY]: dual,
    [KR_DAILY_TOTAL_SKT_LEGACY]: skt,
  };
}

export function koreaTotalKeyFeaturesByCarrier() {
  const dual = koreaLgSkDualKeyFeatures({ kind: "total" });
  const skt = koreaSkt5gKeyFeatures({ kind: "total" });
  return {
    [KR_DAILY_TOTAL_DUAL]: dual,
    [KR_DAILY_TOTAL_SKT]: skt,
    [KR_DAILY_TOTAL_DUAL_LEGACY]: dual,
    [KR_DAILY_TOTAL_SKT_LEGACY]: skt,
  };
}

export default {
  koreaUnlimitedKeyFeaturesByCarrier,
  koreaDailyKeyFeaturesByCarrier,
  koreaTotalKeyFeaturesByCarrier,
};
