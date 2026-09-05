/**
 * 日本無限流量吃到飽 japan-unlimited-esim — 重點特色／實際體驗
 * 鍵＝前台電信商選項值（含舊名相容）
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

/** AU(KDDI) 真・不限速（高速數據）— 沿用既有文案與實測 */
export function auKddiHighSpeedKeyFeatures() {
  return pack(
    [
      "本方案由日本主要電信商 **au（KDDI）** 提供，走 **日本原生 IP**，高速數據吃到飽（真・不限速），實際速度依位置與網路環境而定。",
      "**為什麼選擇 AU(KDDI) 真不限速？**",
      "**日本原生 IP**：當地出口、延遲較接近在地體驗，適合導航、電子支付與社群。",
      "**真・不限速吃到飽**：公平使用政策為無限高速數據，不會刻意鎖在 10Mbps；適合整天導航、視訊與大量使用。",
      "**4G／5G 覆蓋**：AU／KDDI 在東京、大阪、京都等主要城市表現出色。",
      "**APN 提醒**：多數情況自動設定；**天數 10 天（含）以上**若無法上網，請依購買提醒手動設定 APN。",
      "**支援熱點與常用 App**：熱點分享；支援 Google、YouTube、Facebook、Instagram、ChatGPT、TikTok 等。",
    ],
    "福岡市區能達到600Mbps。排除掉一些特殊地點/機場，室內/景點 能維持在100Mbps up\n\n小編極限測試每天用量約20GB，速度並沒有降速",
  );
}

/** AU(KDDI) 10Mbps 吃到飽 */
export function auKddi10MbpsKeyFeatures() {
  return pack(
    [
      "本方案為 **AU(KDDI) 原生** 無限流量，公平使用政策約 **10Mbps** 吃到飽，走日本 IP，適合需要整天有網、但不需極限速的旅客。",
      "**為什麼選擇 AU(KDDI) 10Mbps？**",
      "**日本原生 IP**：當地網路與日本 IP，導航與在地服務通常更順。",
      "**約 10Mbps 吃到飽**：高速用完後仍可持續上網；實際速度可能因位置與擁塞波動。",
      "**4G／5G 覆蓋**：AU／KDDI 覆蓋熱門旅遊城市。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達日本後再安裝／啟用 eSIM。",
    ],
    "進入約 10Mbps 吃到飽後，測速多半落在約 7～12Mbps，不會剛好卡在 10.0。導航、傳訊、網頁通常沒問題；720p 影音多半可看，多人熱點或 1080p 可能卡。僅供參考。",
  );
}

/** SoftBank / KDDI 10Mbps（T+C 雙網漫遊・新加坡 IP） */
export function softbankKddi10MbpsKeyFeatures() {
  return pack(
    [
      "KDDI／SoftBank 雙網自動切換（漫遊），出網為**新加坡 IP**，無限流量。",
      "**每日 1GB 高速後約 10Mbps 吃到飽**：高速用完後可持續上網。",
      "**支援 4G／5G**，適合導航、傳訊與輕量影音。",
    ],
    "每日 1GB 高速內：都會區 4G／5G 測速常見可到數十 Mbps 以上（室內／擁塞時會下降）。進入約 10Mbps 吃到飽後，測速多半落在約 7～12Mbps，不會剛好卡在 10.0。導航、傳訊、網頁通常沒問題；720p 影音多半可看，多人熱點或 1080p 可能卡。僅供參考。",
  );
}

/** 舊 SoftBank / KDDI（若選項仍存在） */
export function softbankKddiUnlimitedKeyFeatures() {
  return pack(
    ["KDDI / SoftBank 雙網", "無限流量", "典型速度 8~20Mbps", "4G / 5G"],
    "雙網切換下，市區測速常見約 8～20Mbps（訊號佳時也可能更高）。導航、傳訊、網頁通常沒問題。僅供參考。",
  );
}

/** IIJ Docomo — 補上實際體驗 */
export function iijDocomoUnlimitedKeyFeatures() {
  return pack(
    [
      "隆重介紹日本 Docomo eSIM，您在日本輕鬆連結的終極旅伴。",
      "此 eSIM 是純數據 eSIM，具有日本本地 IP 位址，讓您無需設定漫遊即可保持連線。",
      "*注意：此日本eSIM IIJ NTT Docomo套餐需要手動設定APN。",
    ],
    "都會區測速常見可到數十 Mbps（視訊號而定）。若未手動設定 APN（vmobile.jp），常見狀況是有訊號但無法上網。僅供參考。",
  );
}

export function japanUnlimitedKeyFeaturesByCarrier() {
  const hs = auKddiHighSpeedKeyFeatures();
  return {
    "AU(KDDI) 真。吃到飽不降速": hs,
    "AU(KDDI) 高速數據": hs,
    // 舊鍵相容（選項改名前列）
    "AU(KDDI)": hs,
    "AU(KDDI) 10Mbps": auKddi10MbpsKeyFeatures(),
    "AU KDDI 10Mbps": auKddi10MbpsKeyFeatures(),
    "SoftBank / KDDI 10Mbps": softbankKddi10MbpsKeyFeatures(),
    "SoftBank / KDDI": softbankKddiUnlimitedKeyFeatures(),
    "IIJ Docomo": iijDocomoUnlimitedKeyFeatures(),
  };
}

export default {
  auKddiHighSpeedKeyFeatures,
  auKddi10MbpsKeyFeatures,
  softbankKddi10MbpsKeyFeatures,
  softbankKddiUnlimitedKeyFeatures,
  iijDocomoUnlimitedKeyFeatures,
  japanUnlimitedKeyFeaturesByCarrier,
};
