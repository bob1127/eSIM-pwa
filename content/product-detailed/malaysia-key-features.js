/**
 * 馬來西亞各電信商 — 重點特色文案（key_features_by_carrier）
 * planKind: "unlimited" | "daily" | "total"
 */
export const MY_TELECOM_UMOBILE = "UMobile 5G 當地";
export const MY_TELECOM_DUAL = "Maxis / Celcom / Digi";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

const EXP_10MBPS =
  "高速額度內：吉隆坡等都會區 4G／5G 測速常見可到數十 Mbps 以上（室內／地下室／擁塞時會下降）。進入約 10Mbps 吃到飽後，測速多半落在約 7～12Mbps，不會剛好卡在 10.0。導航、Grab、傳訊、網頁通常沒問題；720p 影音多半可看，多人熱點或 1080p 可能卡。僅供參考，實際依訊號與當下網路而定。";

const EXP_128 =
  "高速額度內：都會區常見可達數十 Mbps（視訊號而定）。高速用完後降速至約 128kbps，測速通常只有約 0.1Mbps 等級——傳訊息／輕量網頁勉強可以，地圖即時導航、影音、熱點會明顯困難。請依每日／總量額度規劃用量。僅供參考。";

const EXP_TERMINATE =
  "高速額度內：原生 UMobile 在吉隆坡等都會區 5G／4G 測速常見可到數十 Mbps 以上（室內與景點死角會下降）。總量高速用完後會斷網，無法繼續使用，請預留用量或改選吃到飽／每日型。僅供參考，非保證每位旅客測速結果。";

const UMOBILE_FUP = {
  unlimited:
    "**吃到飽好安心**：每日提供 1GB 高速流量，用完後維持約 10Mbps 可持續吃到飽，整天逛景點、查資訊也不必擔心突然斷網。",
  daily:
    "**每日高速額度**：依所選方案提供每日高速流量（500MB／1GB／2GB／3GB），用完後降速至約 128 kbps 可持續使用（每日重置）。",
  total:
    "**總量高速額度**：依所選方案提供總流量（1GB～50GB），高速用完後斷網，請依行程預估用量選購。",
};

const UMOBILE_EXP = {
  unlimited: EXP_10MBPS,
  daily: EXP_128,
  total: EXP_TERMINATE,
};

export function umobileKeyFeatures(planKind = "unlimited") {
  const fup = UMOBILE_FUP[planKind] || UMOBILE_FUP.unlimited;
  return pack(
    [
      "UMobile 是馬來西亞主要行動電信商之一，以高速行動數據與廣大年輕用戶基礎著稱。UMobile 旅遊 eSIM 走馬來西亞本地網路與原生馬來西亞 IP，適合造訪吉隆坡、檳城、蘭卡威、沙巴、柔佛等熱門景點的旅客，開機即可上網，免換實體 SIM。",
      "**為什麼選擇 UMobile 旅遊 eSIM？**",
      "**馬來西亞原生 IP**：使用當地電信基礎設施與馬來西亞 IP，延遲更低、連線更穩，造訪本地網站與 App 的體驗更接近在地用戶，有別於依賴新加坡等中繼 IP 的漫遊卡。",
      "**5G／4G 高速上網**：支援 UMobile 5G／4G，吉隆坡都會區與主要旅遊城市訊號覆蓋穩定，適合 Google Maps 導航、Grab 叫車、即時翻譯、視訊通話與社群即時分享。",
      fup,
      "**旅遊常用服務暢行**：支援熱點分享，並可使用 ChatGPT、TikTok、Gemini 等常用工具，方便規劃行程與備份網路給相機或筆電。",
      "**天數彈性好選**：提供多種天數方案，週末短途或馬來西亞長途深度遊都能依行程挑選，預先下載安裝、抵達後啟用即可。",
    ],
    UMOBILE_EXP[planKind] || UMOBILE_EXP.unlimited,
  );
}

const DUAL_FUP = {
  unlimited:
    "**吃到飽好安心**：每日提供 1GB 高速流量，用完後維持約 10Mbps 可持續吃到飽，長途移動也不必擔心突然斷網。",
  daily:
    "**每日高速額度**：依所選方案提供每日高速流量（500MB／1GB／2GB／3GB），用完後降速至約 128 kbps 可持續使用（每日重置）。",
  total:
    "**總量高速額度**：依所選方案提供總流量（1GB～50GB），多數方案高速用完後降速至約 128 kbps 可持續使用。",
};

const DUAL_EXP = {
  unlimited: EXP_10MBPS,
  daily: EXP_128,
  total: EXP_128,
};

export function maxisCelcomDigiKeyFeatures(planKind = "unlimited") {
  const fup = DUAL_FUP[planKind] || DUAL_FUP.unlimited;
  return pack(
    [
      "Maxis、Celcom 與 Digi 是馬來西亞三大主流行動電信品牌，覆蓋都會、高速公路與多數旅遊熱點。本方案採三網自動切換，訊號較差時可改連其他業者，適合吉隆坡進出、跨州移動與海岸／內陸景點並遊的旅客。",
      "**為什麼選擇 Maxis／Celcom／Digi 三網 eSIM？**",
      "**三網自動切換**：單一 eSIM 即可使用 Maxis、Celcom、Digi，減少單一電信覆蓋死角造成的斷線困擾。",
      "**5G／4G 高速上網**：支援三大電信 5G／4G，適合導航、Grab、視訊通話與社群分享。",
      fup,
      "**漫遊新加坡 IP**：本線路由新加坡 IP 漫遊（APN e-ideas），連線穩定、設定自動，抵達馬來西亞後安裝啟用即可。",
      "**旅遊常用服務暢行**：支援熱點分享，並可使用 ChatGPT、TikTok、Gemini 等常用工具。",
    ],
    DUAL_EXP[planKind] || DUAL_EXP.unlimited,
  );
}

/** 相容舊腳本：預設吃到飽文案 */
export const UMOBILE_KEY_FEATURES = umobileKeyFeatures("unlimited");

export default {
  umobileKeyFeatures,
  maxisCelcomDigiKeyFeatures,
  UMOBILE_KEY_FEATURES,
};
