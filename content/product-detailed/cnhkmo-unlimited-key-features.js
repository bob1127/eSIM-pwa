/**
 * 中港澳吃到飽 — 重點特色（key_features_by_carrier）
 */
export const CNHKMO_TELECOM_SHORT =
  "短天數｜中國電信／CSL／澳門電信";
export const CNHKMO_TELECOM_LONG =
  "長天數｜中國電信／聯通／CSL／澳門電訊";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export function cnhkmoShortCtKeyFeatures() {
  return pack(
    [
      "本線路走中國電信、香港 CSL／中國電信香港、澳門電信覆蓋中國大陸、香港與澳門，出網為**香港 IP**，適合短天數行程、希望免 VPN 使用社群通訊的旅客。",
      "**為什麼選擇短天數・中國電信線路？**",
      "**免 VPN 社群**：香港出口 IP，一般可直接使用 LINE、Instagram、Facebook（實際依當下路由；非保證每位用戶／每個時段）。",
      "**一卡三地**：中國／香港／澳門同一張 eSIM，抵達後安裝即可切換使用。",
      "**吃到飽不限流量**：公平使用政策下無限流量，實際速度依訊號與擁塞而定。",
      "**熱點分享**：可分享給相機／筆電輕量使用。",
      "**安裝提醒**：建議抵達目的地後再安裝／啟用 eSIM。",
    ],
    "香港／澳門與大陸都會區訊號通常穩定。出網為香港 IP 時，LINE／IG／FB 多數可免 VPN。測速與 App 可用性僅供參考。",
  );
}

/** @deprecated 舊短天數（中國移動）文案，改用 cnhkmoShortCtKeyFeatures */
export function cnhkmoShortCmccKeyFeatures() {
  return cnhkmoShortCtKeyFeatures();
}

export function cnhkmoLongTcKeyFeatures() {
  return pack(
    [
      "本線路走中國電信、中國聯通、香港 CSL、澳門電訊（CTM），出網為**新加坡 IP**，天數選擇最齊（最長可至約 30 天），適合較長行程。",
      "**為什麼選擇長天數・中國電信線路？**",
      "**免 VPN 社群**：新加坡出口 IP，一般可直接使用 LINE、Instagram、Facebook（實際依當下路由；非保證每位用戶／每個時段）。",
      "**約 10Mbps 吃到飽**：公平使用政策為約 10 Mbps 無限流量，實際速度可能波動。",
      "**一卡三地＋TikTok**：中國／香港／澳門可用；選品標示支援 ChatGPT、TikTok、Gemini 與熱點。",
      "**4G／5G 覆蓋**：大陸電信／聯通、香港 CSL、澳門 CTM，熱門城市覆蓋良好。",
      "**安裝提醒**：建議抵達覆蓋範圍後再安裝／啟用 eSIM。",
    ],
    "進入 FUP 後測速多半約 7～12Mbps。導航、傳訊、社群通常沒問題；720p 影音多數可看。新加坡 IP 下 LINE／IG／FB／TikTok 一般可免 VPN，僅供參考。",
  );
}

export default {
  cnhkmoShortCtKeyFeatures,
  cnhkmoShortCmccKeyFeatures,
  cnhkmoLongTcKeyFeatures,
};
