/**
 * 中國吃到飽 — CUCC+／CMCC 70Mbps 重點特色／實際體驗
 */
function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CN_UNLIMITED_CUCC = "CUCC+";
/** @deprecated 舊名（已下架通用 CMCC+） */
export const CN_UNLIMITED_CMCC = "CMCC+";
export const CN_UNLIMITED_CMCC_70 = "CMCC 70Mbps";

/** CUCC+：China(T+C)-unlimited｜聯通／新加坡 IP／約 10Mbps */
export function chinaCuccUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **中國聯通（CUCC+）** 漫遊吃到飽 eSIM，出網為**新加坡 IP**，適合在中國大陸希望**免 VPN** 使用社群的旅客。",
      "**為什麼選擇中國聯通 CUCC+？**",
      "**免 VPN 翻牆（社群）**：新加坡出口 IP，一般可直接使用 **LINE、Instagram、Facebook**（實際依當下路由；非保證每位用戶／每個時段）。",
      "**每日 1GB 高速後約 10Mbps 吃到飽**：高速用完後仍可持續上網；實際速度可能因位置與擁塞波動。",
      "**聯通 4G／5G**：走中國聯通網路；APN **e-ideas** 多數手機自動設定。",
      "**支援常用 App**：支援 ChatGPT、TikTok、Gemini；可熱點分享。",
      "**安裝提醒**：建議在台灣先安裝設定好，抵達大陸覆蓋範圍再啟用 eSIM。",
    ],
    "每日 1GB 高速內：都會區測速常見可到數十 Mbps。進入約 10Mbps 吃到飽後，測速多半約 7～12Mbps——導航、傳訊、LINE／IG／FB 通常沒問題；720p 影音多半可看。新加坡 IP 下社群一般可免 VPN，僅供參考。",
  );
}

/**
 * CMCC 70Mbps：China-unlimited-*-B0
 * 香港 IP、APN cmhk、約 50–70 Mbps；TikTok 雙端；GPT iOS 完整／Android 網頁版
 */
export function chinaCmcc70MbpsKeyFeatures() {
  return pack(
    [
      "本方案為 **中國移動（CMCC）** 漫遊吃到飽 eSIM（**約 50–70 Mbps**），出網為**香港 IP**，APN **cmhk**。",
      "**為什麼選擇中國移動 70Mbps？**",
      "**約 50–70 Mbps 吃到飽**：速度約落在此區間，適合導航、社群與影音（實際依訊號與擁塞而定）。",
      "**TikTok**：Apple 與 Android 手機均可使用 TikTok。",
      "**ChatGPT（GPT）**：在 Apple 裝置上不受限制；Android 裝置則僅能透過網頁版使用。",
      "**移動覆蓋**：走中國移動 4G／LTE／5G，熱門城市與交通沿線覆蓋佳；支援熱點分享。",
      "**香港 IP**：一般可免 VPN 使用 LINE／IG／FB（實際依當下路由；非保證每位用戶／每個時段）。",
      "**安裝提醒**：建議抵達大陸覆蓋範圍後再啟用 eSIM。",
    ],
    "都會區測速多半落在約 50–70 Mbps 區間（訊號佳時也可能更高／更低）。導航、傳訊、社群與 720p～1080p 影音通常沒問題。TikTok：Apple／Android 皆可。ChatGPT：Apple 較完整，Android 請改用網頁版。僅供參考。",
  );
}

/** @deprecated 舊通用 CMCC+ 文案 */
export function chinaCmccUnlimitedKeyFeatures() {
  return chinaCmcc70MbpsKeyFeatures();
}

export function chinaUnlimitedKeyFeaturesByCarrier() {
  return {
    [CN_UNLIMITED_CUCC]: chinaCuccUnlimitedKeyFeatures(),
    [CN_UNLIMITED_CMCC_70]: chinaCmcc70MbpsKeyFeatures(),
    [CN_UNLIMITED_CMCC]: chinaCmcc70MbpsKeyFeatures(),
  };
}

export default {
  chinaCuccUnlimitedKeyFeatures,
  chinaCmcc70MbpsKeyFeatures,
  chinaCmccUnlimitedKeyFeatures,
  chinaUnlimitedKeyFeaturesByCarrier,
};
