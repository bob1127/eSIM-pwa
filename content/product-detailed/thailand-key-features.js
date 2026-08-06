/**
 * 泰國各電信商 — 重點特色文案（key_features_by_carrier）
 * planKind: "unlimited" | "total"（依商品）
 */
export const TH_TELECOM_TRUEMOVE = "Truemove H 當地號碼";
export const TH_TELECOM_DTAC = "TRRE 電信";
/** @deprecated 舊顯示名，請改用 TH_TELECOM_TRRE */
export const TH_TELECOM_TRRE = "TRRE 電信";
export const TH_TELECOM_AIS = "AIS";
export const TH_TELECOM_TRUE = "TRUE";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export function truemoveHKeyFeatures() {
  return pack(
    [
      "Truemove H（TRUE）是泰國領先的行動電信品牌之一，覆蓋曼谷、清邁、普吉、蘇梅與主要觀光城市。本方案為泰國原生 eSIM，走當地網路與泰國 IP，並可取得 Truemove H 當地號碼，適合需要穩定高速上網、熱點分享，或希望有當地門號體驗的旅客。",
      "**為什麼選擇 Truemove H 當地號碼 eSIM？**",
      "**泰國原生 IP**：使用當地電信基礎設施與泰國 IP，延遲更低、連線更穩，造訪本地網站與 App（如 Grab、Google Maps、銀行／訂餐）體驗更接近在地用戶。",
      "**真．不限速吃到飽**：公平使用政策為無限高速數據，實際速度取決於您的位置及網路環境，適合整天導航、視訊與大量使用。",
      "**4G／5G 高速覆蓋**：TRUE／Truemove H 網路在熱門旅遊城市覆蓋良好，適合跨府移動與海島行程。",
      "**支援熱點與常用 App**：可熱點分享給相機／筆電，並使用 ChatGPT、TikTok、Gemini 等工具。",
      "**啟用提醒**：建議抵達泰國後再安裝／啟用。自 2026 年 5 月 22 日起，撥出電話與發送 SMS 需於 True 門店完成護照實名登記，才能恢復通話功能（純上網方案仍可依數據方案使用）。",
    ],
    "曼谷／清邁／普吉等熱門城市 4G／5G 測速常見可到數十～上百 Mbps（室內、地下室、偏遠海島與擁塞時段會下降）。本方案標示為真．不限速，一般不會刻意鎖在 10Mbps；實際仍依位置與網路負載而定。導航、Grab、視訊、熱點通常比降速方案更從容。僅供參考，非保證每位旅客測速結果。",
  );
}

/** TRRE 電信（FUP 10Mbps 吃到飽）— 函式名保留相容舊引用 */
export function trueDtacKeyFeatures() {
  return pack(
    [
      "TRRE 電信走 TRUE 體系的泰國主流網路，泰國原生網路與泰國 IP。本方案以 FUP 10Mbps 無限流量為特色，天數選擇多（1～30 天等），適合需要整天有網、但不需極限速的旅客，價格與用量平衡、安裝即用。",
      "**為什麼選擇 TRRE 電信旅遊 eSIM？**",
      "**泰國原生 IP**：當地網路與泰國 IP，適合導航、Grab、社群與視訊，體驗接近在地用戶。",
      "**FUP 10Mbps 吃到飽**：公平使用政策為約 10 Mbps 的無限流量，實際速度可能因位置與網路環境變動，整天有網更安心。",
      "**4G／5G 覆蓋**：TRUE／TRRE 網路覆蓋曼谷與主要旅遊城市，適合短途與多日行程。",
      "**支援熱點與常用 App**：熱點分享、ChatGPT、TikTok、Gemini 等常用工具皆可使用。",
      "**天數彈性好選**：依停留天數挑選方案，建議抵達泰國後再安裝／啟用 eSIM。",
    ],
    "進入 FUP 後，測速多半落在約 7～12Mbps（約 10Mbps 等級），不會剛好顯示 10.0。導航、Grab、傳訊、網頁通常沒問題；720p 影音多半可看，多人熱點或 1080p 可能卡。訊號差或擁塞時可能低於 10Mbps。僅供參考。",
  );
}

export function aisKeyFeatures() {
  return pack(
    [
      "AIS 是泰國最大行動電信商之一，以覆蓋廣、訊號穩著稱，曼谷、清邁、普吉與高速公路沿線表現良好。本總量型方案採 AIS 網路漫遊（新加坡 IP），適合依行程預估總流量、想要明確額度控管的旅客。",
      "**為什麼選擇 AIS 總量型 eSIM？**",
      "**AIS 主流覆蓋**：走 AIS Thailand 網路，市區與熱門景點連線穩定，適合導航、Grab 與社群使用。",
      "**總量高速額度**：依所選方案提供 3～50GB 等總流量，高速用完後降速至約 128 kbps 可持續使用。",
      "**漫遊新加坡 IP**：本線路為新加坡 IP 漫遊（APN e-ideas），自動設定，抵達後安裝啟用即可。",
      "**支援熱點與常用 App**：熱點分享、ChatGPT、TikTok、Gemini 等皆可使用。",
      "**天數與流量好搭配**：可依停留天數與用量選擇總量方案，週末短途或雙週深度遊都能對應。",
    ],
    "高速額度內：曼谷等都會區測速常見可到數十 Mbps（視訊號而定）。高速用完後降速至約 128kbps，測速通常只有約 0.1Mbps 等級——傳訊息勉強可以，影音與即時導航會明顯困難。請依總量規劃用量。僅供參考。",
  );
}

export function trueLocalTotalKeyFeatures() {
  return pack(
    [
      "TRUE 泰國原生總量型 eSIM 走當地網路與泰國 IP，適合已預估用量、希望延遲更低、連線更接近在地體驗的旅客。方案以明確總流量為主，用完後依方案降速可持續使用。",
      "**為什麼選擇 TRUE 原生總量型？**",
      "**泰國原生 IP**：當地電信基礎設施與泰國 IP，造訪本地網站與 App 更順暢。",
      "**總量方案清晰**：例如 15GB／7 天、50GB／10 天等組合，高速用完後降速（約 1 Mbps 或約 384 kbps，依方案而定）可持續使用。",
      "**4G／5G 覆蓋**：TRUE 網路覆蓋主要旅遊城市，適合曼谷進出與熱門海島／古城行程。",
      "**支援熱點與常用 App**：熱點分享、ChatGPT、TikTok、Gemini 等皆可使用。",
      "**安裝提醒**：建議抵達泰國後、於覆蓋範圍內再安裝／啟用；請勿在覆蓋範圍外提前安裝，以免方案異常。",
    ],
    "高速額度內：熱門城市測速常見可到數十 Mbps。用完後依方案降速：約 1Mbps（仍可傳訊／輕量網頁，影音偏卡）或約 384kbps（更接近僅能傳訊息）。請依 15GB／50GB 等額度規劃。僅供參考。",
  );
}

export default {
  truemoveHKeyFeatures,
  trueDtacKeyFeatures,
  aisKeyFeatures,
  trueLocalTotalKeyFeatures,
};
