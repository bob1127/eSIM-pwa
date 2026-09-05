/**
 * 中國吃到飽 — 重點特色（AI 摘要風）
 */
function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CN_UNLIMITED_CUCC = "CUCC+";
/** @deprecated */
export const CN_UNLIMITED_CMCC = "CMCC+";
export const CN_UNLIMITED_CMCC_70 = "CMCC 70Mbps";

export function chinaCuccUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為中國聯通（CUCC+）漫遊吃到飽 eSIM，出網為新加坡 IP，適合在中國大陸希望免 VPN 使用社群的旅客。",
      "**基本介紹與特色**",
      "**市場地位：** 走中國聯通 4G／5G，熱門城市與交通沿線覆蓋佳。",
      "**覆蓋範圍：** 北京、上海、廣州、深圳等國內主要旅遊與商務目的地。",
      "**網路速度：** 每日約 1GB 高速後約 10Mbps 吃到飽。",
      "**數據路由：** 新加坡 IP；一般可免 VPN 使用 LINE、Instagram、Facebook（非保證每位用戶／每個時段）。",
      "**本站方案：** 吃到飽；支援熱點與 ChatGPT／TikTok／Gemini；APN e-ideas 多數自動。",
      "**使用注意：** 建議在台灣先安裝，抵達大陸覆蓋範圍再啟用。",
    ],
    "每日 1GB 高速內都會區測速常見可到數十 Mbps；進入約 10Mbps 後多半約 7～12Mbps。新加坡 IP 下社群一般可免 VPN。僅供參考。",
  );
}

export function chinaCmcc70MbpsKeyFeatures() {
  return pack(
    [
      "本方案為中國移動（CMCC）漫遊吃到飽 eSIM（約 50–70 Mbps），出網為香港 IP，適合需要較高速率的訪陸行程。",
      "**基本介紹與特色**",
      "**市場地位：** 走中國移動 4G／LTE／5G，覆蓋廣、熱門城市表現穩定。",
      "**覆蓋範圍：** 國內主要城市與交通沿線。",
      "**網路速度：** 約 50–70 Mbps 吃到飽（實際依訊號與擁塞而定）。",
      "**數據路由：** 香港 IP；一般可免 VPN 使用 LINE／IG／FB。",
      "**App 支援：** ChatGPT／TikTok **不保證**可用。若需要，請改選同頁 [CUCC+（中國聯通）](/product/china/china-unlimited-esim?data_amount=%E5%90%83%E5%88%B0%E9%A3%BD&days=20&telecom=cucc)。",
      "**本站方案：** 吃到飽；支援熱點；APN cmhk。建議抵達後再啟用。",
    ],
    "都會區測速多半約 50–70 Mbps。導航、社群與 720p～1080p 影音通常沒問題。僅供參考。",
  );
}

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
