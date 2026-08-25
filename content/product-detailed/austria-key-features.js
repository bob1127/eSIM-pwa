/**
 * 奧地利 — 重點特色（AI 摘要風）
 * 吃到飽：Drei / A1 +（德國 IP）｜A1 / Three +（法國 IP）皆約 10Mbps
 * 每日：A1 / H3G +｜A1 / Three +；總量：A1 / Three +
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const AT_TELECOM_36 = "Drei / A1 +";
export const AT_TELECOM_32 = "A1 / Three +";
export const AT_TELECOM_41 = "A1 / H3G +";

const EXP_10 =
  "維也納、薩爾斯堡、Innsbruck 等都會區 4G／5G 測速常見可到約 10Mbps 上限；地鐵、阿爾卑斯山區與室內會再下降。導航、傳訊通常沒問題。僅供參考。";
const EXP_128 =
  "高速額度內：維也納、薩爾斯堡、Innsbruck 等都會區測速常見可到數十 Mbps。用完後約 128kbps——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function atDreiA1UnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為奧地利吃到飽（約 10Mbps）eSIM，走 Drei／A1，出網為德國 IP。",
      "**基本介紹與特色**",
      "**市場地位：** A1 覆蓋最廣，Drei（Hutchison）都會區 5G 成長快。",
      "**覆蓋範圍：** 維也納、薩爾斯堡、Innsbruck 與阿爾卑斯觀光路線；山區與地鐵會下降。",
      "**網路速度：** 限速約 10Mbps 吃到飽。",
      "**數據路由：** 德國 IP 漫遊。",
      "**本站方案：** 吃到飽；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_10,
  );
}

export function atA1ThreeUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為奧地利吃到飽（約 10Mbps）eSIM，走 A1／Three，出網為法國 IP。",
      "**基本介紹與特色**",
      "**市場地位：** A1 與 Three（Hutchison）互補，都會區較穩。",
      "**覆蓋範圍：** 維也納、薩爾斯堡、Innsbruck 等熱門行程。",
      "**網路速度：** 限速約 10Mbps 吃到飽。",
      "**數據路由：** 法國 IP 漫遊。",
      "**本站方案：** 吃到飽；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_10,
  );
}

export function atUnlimited36KeyFeaturesByCarrier() {
  return { [AT_TELECOM_36]: atDreiA1UnlimitedKeyFeatures() };
}
export function atUnlimited32KeyFeaturesByCarrier() {
  return { [AT_TELECOM_32]: atA1ThreeUnlimitedKeyFeatures() };
}

export function atA1H3gDailyKeyFeatures() {
  return pack(
    [
      "本方案為奧地利每日型 eSIM，走 A1／H3G（Drei），出網為英國／波蘭 IP。",
      "**基本介紹與特色**",
      "**市場地位：** A1 與 H3G（Drei）主流覆蓋。",
      "**覆蓋範圍：** 維也納、薩爾斯堡、Innsbruck 等。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）。",
      "**數據路由：** 英國／波蘭 IP 漫遊。",
      "**本站方案：** 每日型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_128,
  );
}

export function atA1ThreeDailyKeyFeatures() {
  return pack(
    [
      "本方案為奧地利每日型 eSIM，走 A1／Three，出網為法國 IP。",
      "**基本介紹與特色**",
      "**市場地位：** A1／Three 都會區覆蓋穩定。",
      "**覆蓋範圍：** 維也納、薩爾斯堡、Innsbruck 等。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）。",
      "**數據路由：** 法國 IP 漫遊。",
      "**本站方案：** 每日型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_128,
  );
}

export function atDaily41KeyFeaturesByCarrier() {
  return { [AT_TELECOM_41]: atA1H3gDailyKeyFeatures() };
}
export function atDaily32KeyFeaturesByCarrier() {
  return { [AT_TELECOM_32]: atA1ThreeDailyKeyFeatures() };
}

export function atA1ThreeTotalKeyFeatures() {
  return pack(
    [
      "本方案為奧地利總量型 eSIM，走 A1／Three，出網為法國 IP。",
      "**基本介紹與特色**",
      "**市場地位：** A1／Three 主流覆蓋。",
      "**覆蓋範圍：** 維也納、薩爾斯堡、Innsbruck 等熱門目的地。",
      "**網路速度：** 可選 1GB～50GB；高速用完後約 128kbps 續航。",
      "**數據路由：** 法國 IP 漫遊。",
      "**本站方案：** 總量型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_128,
  );
}

export function atTotalKeyFeaturesByCarrier() {
  return { [AT_TELECOM_32]: atA1ThreeTotalKeyFeatures() };
}

export default {
  AT_TELECOM_36,
  AT_TELECOM_32,
  AT_TELECOM_41,
  atUnlimited36KeyFeaturesByCarrier,
  atUnlimited32KeyFeaturesByCarrier,
  atDaily41KeyFeaturesByCarrier,
  atDaily32KeyFeaturesByCarrier,
  atTotalKeyFeaturesByCarrier,
};
