/**
 * 新加坡各電信商 — 重點特色文案（key_features_by_carrier）
 * planKind: "unlimited" | "daily" | "total"
 */
export const SG_TELECOM_SINGTEL = "Singtel";
export const SG_TELECOM_M1_STARHUB = "M1 / Starhub";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

const EXP_FUP_UNLIM =
  "市區（烏節、濱海灣、樟宜等）4G 測速常見可到數十 Mbps，室內／捷運／擁塞時會下降。本方案為不限流量 FUP，不會鎖死在固定 Mbps，但繁忙時段速度可能變慢。導航、Grab、傳訊通常沒問題；重度影音視訊視當下網路而定。僅供參考。";

const EXP_128 =
  "高速額度內：島內市區 4G 測速常見可到數十 Mbps（視訊號而定）。高速用完後降速至約 128kbps，測速通常只有約 0.1Mbps 等級——傳訊息／輕量網頁勉強可以，地圖即時導航、影音、熱點會明顯困難。請依每日／總量額度規劃用量。僅供參考。";

const SINGTEL_FUP = {
  unlimited:
    "**不限流量吃到飽（FUP）**：依公平使用政策提供不限流量上網，實際速度取決於位置與網路環境，適合整天導航、即時通訊與輕量影音。",
  daily:
    "**每日高速額度**：依所選方案提供每日高速流量，用完後降速可持續使用（每日重置）。",
  total:
    "**總量高速額度**：依所選方案提供總流量，高速額度用完後依方案規則降速或限制使用。",
};

export function singtelKeyFeatures(planKind = "unlimited") {
  const fup = SINGTEL_FUP[planKind] || SINGTEL_FUP.unlimited;
  return pack(
    [
      "Singtel 是新加坡最大行動電信商之一，網路覆蓋全島主要商業區、樟宜機場、烏節路、聖淘沙與捷運沿線。Singtel 旅遊 eSIM 讓旅客免換實體 SIM，抵達即可上網，適合短途出差、週末旅遊或轉機停留。",
      "**為什麼選擇 Singtel 旅遊 eSIM？**",
      "**新加坡主流網路**：走 Singtel 4G／LTE，市區與熱門景點訊號穩定，適合 Google Maps、Grab、視訊會議與社群即時分享。",
      fup,
      "**熱點與常用 App**：支援熱點分享，並可使用 ChatGPT、TikTok、Gemini 等常用工具（實際可用性依裝置與網路環境而定）。",
      "**天數彈性好選**：提供 1～15 天等多種方案，依停留天數挑選，預先下載安裝、抵達新加坡後啟用即可。",
      "**漫遊香港 IP**：本線路採香港 IP 漫遊節點（APN cmhk），自動設定，開機即可連線。",
    ],
    planKind === "unlimited" ? EXP_FUP_UNLIM : EXP_128,
  );
}

const M1_FUP = {
  unlimited:
    "**不限流量吃到飽（FUP）**：依公平使用政策提供不限流量上網，實際速度取決於位置與網路環境。",
  daily:
    "**每日高速額度**：依所選方案提供每日高速流量（500MB／1GB／2GB／3GB），用完後降速至約 128 kbps 可持續使用（每日重置）。",
  total:
    "**總量高速額度**：依所選方案提供總流量（1GB～50GB），高速用完後降速至約 128 kbps 可持續使用。",
};

export function m1StarhubKeyFeatures(planKind = "daily") {
  const fup = M1_FUP[planKind] || M1_FUP.daily;
  return pack(
    [
      "M1 與 StarHub 是新加坡兩大主流電信品牌，覆蓋島內商業區、機場、購物中心與捷運沿線。本方案採雙網自動切換，單一 eSIM 即可在兩家網路間切換，減少單一電信覆蓋死角，適合全島移動與多日停留的旅客。",
      "**為什麼選擇 M1／StarHub 雙網 eSIM？**",
      "**雙網自動切換**：單一 eSIM 使用 M1 與 StarHub，訊號較差時可改連另一業者，連線更有彈性。",
      "**4G／LTE 高速上網**：適合導航、Grab、即時翻譯、視訊通話與社群分享。",
      fup,
      "**熱點與常用 App**：支援熱點分享與 ChatGPT／Gemini 等常用工具；部分香港 IP 漫遊線路對 TikTok 可能有限制，請依方案標示為準。",
      "**漫遊香港 IP**：本線路採香港 IP 漫遊節點（APN smartone），自動設定，抵達新加坡後安裝啟用即可。",
    ],
    planKind === "unlimited" ? EXP_FUP_UNLIM : EXP_128,
  );
}

export default {
  singtelKeyFeatures,
  m1StarhubKeyFeatures,
};
