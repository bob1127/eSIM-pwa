/**
 * 奧地利吃到飽 — 歐36（Drei／A1、cmlink）與歐32（A1／Three、orange）
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const AT_TELECOM_36 = "Drei / A1 +";
export const AT_TELECOM_32 = "A1 / Three +";
export const AT_TELECOM_41 = "A1 / H3G +";

const EXP_36 =
  "維也納、薩爾斯堡、Innsbruck 等都會區 4G／5G 測速常見可到約 10Mbps 上限（方案限速）；地鐵、阿爾卑斯山區與室內會再下降。導航、傳訊、社群通常沒問題，高畫質影音與多人熱點會變慢。僅供參考。";

const EXP_32 =
  "維也納、薩爾斯堡、Innsbruck 等都會區 4G／5G 測速常見可到約 10Mbps 上限（方案限速）；地鐵、阿爾卑斯山區與室內會再下降。導航、傳訊通常沒問題。僅供參考。";

const AT_INTRO_A1_DREI =
  "A1 是奧地利覆蓋最廣的傳統電信，Drei（Hutchison，亦稱 3／H3G／Three）在維也納與都會區 5G 成長快。兩者互補，維也納、薩爾斯堡、Innsbruck 與阿爾卑斯觀光路線較穩；地鐵、山區與室內仍可能下降。抵達即可上網、免換實體 SIM。";

const AT_INTRO_A1_THREE =
  "A1 是奧地利覆蓋最廣的傳統電信，Three／Drei 屬 Hutchison 體系，都會區 5G 與熱點使用較靈活。維也納、薩爾斯堡、Innsbruck 等熱門行程較穩；地鐵與阿爾卑斯山區訊號會下降。";

export function atDreiA1UnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **奧地利吃到飽（限速約 10Mbps）** eSIM。",
      AT_INTRO_A1_DREI,
      "**為什麼選擇 Drei／A1＋？**",
      "**奧地利主流網路 4G／5G**：Drei（Hutchison）、A1，維也納與主要城市較穩。",
      "**限速約 10Mbps 吃到飽**：高速不另切額度，適合傳訊、導航與社群。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達奧地利覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_36,
  );
}

export function atA1ThreeUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **奧地利吃到飽（限速約 10Mbps）** eSIM。",
      AT_INTRO_A1_THREE,
      "**為什麼選擇 A1／Three＋？**",
      "**奧地利主流網路 4G／5G**：A1、Three，維也納與主要城市較穩。",
      "**限速約 10Mbps 吃到飽**：高速不另切額度，適合傳訊、導航與社群。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達奧地利覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_32,
  );
}

export function atUnlimited36KeyFeaturesByCarrier() {
  return {
    [AT_TELECOM_36]: atDreiA1UnlimitedKeyFeatures(),
  };
}

export function atUnlimited32KeyFeaturesByCarrier() {
  return {
    [AT_TELECOM_32]: atA1ThreeUnlimitedKeyFeatures(),
  };
}

const EXP_DAILY_41 =
  "每日高速額度內：維也納、薩爾斯堡、Innsbruck 等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

const EXP_DAILY_32 =
  "每日高速額度內：維也納、薩爾斯堡、Innsbruck 等都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function atA1H3gDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **奧地利每日型** eSIM。",
      AT_INTRO_A1_DREI,
      "**為什麼選擇 A1／H3G＋每日型？**",
      "**奧地利主流網路 4G／5G**：A1、H3G（Drei），維也納與主要城市較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達奧地利覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_DAILY_41,
  );
}

export function atA1ThreeDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **奧地利每日型** eSIM。",
      AT_INTRO_A1_THREE,
      "**為什麼選擇 A1／Three＋每日型？**",
      "**奧地利主流網路 4G／5G**：A1、Three，維也納與主要城市較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達奧地利覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_DAILY_32,
  );
}

export function atDaily41KeyFeaturesByCarrier() {
  return {
    [AT_TELECOM_41]: atA1H3gDailyKeyFeatures(),
  };
}

export function atDaily32KeyFeaturesByCarrier() {
  return {
    [AT_TELECOM_32]: atA1ThreeDailyKeyFeatures(),
  };
}

const EXP_TOTAL =
  "高速額度內：維也納、薩爾斯堡、Innsbruck 等都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。請依總量額度規劃用量。僅供參考。";

export function atA1ThreeTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **奧地利總量型** eSIM。",
      AT_INTRO_A1_THREE,
      "**為什麼選擇 A1／Three＋總量型？**",
      "**奧地利主流網路 4G／5G**：A1、Three，維也納與主要城市較穩。",
      "**總量高速後約 128kbps**：可選 1GB／2GB／3GB／5GB／10GB／20GB／30GB／50GB；高速用完後降速可持續使用。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達奧地利覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_TOTAL,
  );
}

export function atTotalKeyFeaturesByCarrier() {
  return {
    [AT_TELECOM_32]: atA1ThreeTotalKeyFeatures(),
  };
}
