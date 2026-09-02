/**
 * 加拿大總量／每日／吃到飽 — TELUS / BELL、美加多網、TELUS 原生
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const CA_TELECOM_ROAM = "TELUS / BELL";
export const CA_TELECOM_MULTI = "Rogers / Bell / TELUS +";
export const CA_TELECOM_UNLIM = "WIND / Bell / TELUS +";
export const CA_TELECOM_UNLIM_10M = "Bell / Telus / Verizon（10Mbps）";
export const CA_TELECOM_NATIVE = "TELUS 原生";

const CA_INTRO_TELUS_BELL =
  "TELUS 與 Bell 是加拿大三大電信中的兩家：TELUS 西岸（溫哥華、Banff、卡加利）覆蓋強，Bell 在安大略、魁北克與東岸都會較完整。兩者互補，適合城市、滑雪與跨省移動；抵達即可上網、免換實體 SIM。";

const CA_INTRO_MULTI =
  "Rogers、Bell、TELUS 是加拿大三大電信；FIDO（Rogers 子品牌）、Videotron（魁北克）、SaskTel（薩省）補齊各省。美國段可走 Verizon、AT&T、T-Mobile，跨境自駕或飛往美國不必再換卡。";

const CA_INTRO_NATIVE =
  "TELUS 是加拿大西岸覆蓋最強的電信之一。本方案走當地網路與加拿大 IP，延遲較低、體驗接近在地用戶，並含本地通話／簡訊。";

const CA_INTRO_WIND =
  "WIND（Freedom Mobile）在溫哥華、多倫多等都會區性價比高，並搭配 Bell、TELUS 與 SaskTel。美國段走 T-Mobile、Verizon、AT&T，適合美加來回。";

const EXP_ROAM =
  "高速額度內：溫哥華、多倫多、蒙特婁都會區 4G／5G 測速常見可到數十 Mbps。高速用完後降速約 128kbps 可持續使用——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。ChatGPT／TikTok 不保證。僅供參考。";

const EXP_MULTI =
  "高速額度內：加拿大與美國都會區 4G／5G 測速常見可到數十 Mbps。總量用完後會斷網，無法繼續使用，請預留餘量。支援 ChatGPT、TikTok、Gemini。僅供參考。";

const EXP_NATIVE =
  "TELUS 當地線路、加拿大 IP。高速額度內都會區測速常見可到數十 Mbps；用完後約 128kbps 可持續使用。含本地通話／簡訊與部分國際通話分鐘。僅供參考。";

const EXP_DAILY_ROAM =
  "每日高速額度內：溫哥華、多倫多、蒙特婁都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 128kbps，隔日重置——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。ChatGPT／TikTok 不保證。僅供參考。";

const EXP_DAILY_MULTI =
  "每日高速額度內：加拿大與美國都會區 4G／5G 測速常見可到數十 Mbps。額度用完後降速約 512kbps，隔日重置；導航與傳訊通常仍可用。支援 ChatGPT、TikTok、Gemini。僅供參考。";

const EXP_UNLIM =
  "美加主要城市 4G／5G 測速常見可到數十 Mbps，山區、邊境與室內會下降。吃到飽為 FUP，不會固定鎖死某一 Mbps，繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。";

export function canadaRoamTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **TELUS／Bell** 加拿大總量型 eSIM，覆蓋加拿大主要城市與交通沿線。",
      CA_INTRO_TELUS_BELL,
      "**為什麼選擇 TELUS／Bell 總量型？**",
      "**雙網 4G／5G**：TELUS 與 Bell 互補，溫哥華、多倫多、 Banff、魁北克等熱門行程較穩。",
      "**總量高速後約 128kbps**：可選 1GB～50GB；多數方案高速用完後降速可持續使用（1GB／2GB 部分天數為用完斷網）。",
      "**天數彈性**：3～30 天；**25 天以上**長天數方案較適合打工度假與長住。",
      "**安裝提醒**：建議抵達加拿大後再啟用 eSIM。",
    ],
    EXP_ROAM,
  );
}

export function canadaMultiTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **美加多網** 總量型 eSIM，單一 eSIM 可在加拿大與美國使用，**不含墨西哥**。",
      CA_INTRO_MULTI,
      "**為什麼選擇 Rogers／Bell／TELUS＋？**",
      "**加拿大 6 網**：Rogers、FIDO、Bell、Telus、Videotron、SaskTel（多數 5G；SaskTel 為 LTE）。",
      "**美國 3 網**：Verizon、AT&T、T-Mobile 4G／5G，跨境自駕／飛往美國免再換卡。",
      "**總量高速、用完斷網**：可選 1GB～50GB、3～30 天；高速額度用完即斷網（非降速吃到飽），請依行程預估用量。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**漫遊出口**：APN `internet / internetipv6`，出網波蘭 IP。",
      "**安裝提醒**：建議抵達加拿大或美國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_MULTI,
  );
}

export function canadaNativeTotalKeyFeatures() {
  return pack(
    [
      "本方案為 **TELUS 原生** 加拿大總量型 eSIM，加拿大 IP、當地 APN `sp.telus.com`。",
      CA_INTRO_NATIVE,
      "**為什麼選擇 TELUS 原生？**",
      "**加拿大原生 IP**：延遲較低，體驗接近在地用戶（非香港／新加坡漫遊出口）。",
      "**含通話／簡訊**：本地無限通話與簡訊，並含部分國際通話分鐘（中港澳台、美國等；請加國碼）。",
      "**總量高速後約 128kbps**：目前提供 30 天 50GB／75GB；高速用完後降速可持續使用。",
      "**安裝提醒**：eSIM 僅能安裝一次，請勿刪除；可提前安裝，建議抵達後再啟用。用量可發 SMS Check 至 1888 查詢。",
    ],
    EXP_NATIVE,
  );
}

export function canadaTotalKeyFeaturesByCarrier() {
  return {
    [CA_TELECOM_ROAM]: canadaRoamTotalKeyFeatures(),
    [CA_TELECOM_MULTI]: canadaMultiTotalKeyFeatures(),
    [CA_TELECOM_NATIVE]: canadaNativeTotalKeyFeatures(),
  };
}

export function canadaRoamDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **TELUS／Bell** 加拿大每日型 eSIM，覆蓋加拿大主要城市與交通沿線。",
      CA_INTRO_TELUS_BELL,
      "**為什麼選擇 TELUS／Bell 每日型？**",
      "**雙網 4G／5G**：TELUS 與 Bell 互補，溫哥華、多倫多、Banff、魁北克等熱門行程較穩。",
      "**每日高速後約 128kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**天數彈性**：1～30 天，適合短訪與長住。",
      "**漫遊出口**：APN `internetipv6`，出網香港／新加坡 IP；ChatGPT／TikTok 不保證。",
      "**安裝提醒**：建議抵達加拿大後再啟用 eSIM。",
    ],
    EXP_DAILY_ROAM,
  );
}

export function canadaMultiDailyKeyFeatures() {
  return pack(
    [
      "本方案為 **美加多網** 每日型 eSIM，單一 eSIM 可在加拿大與美國使用，**不含墨西哥**。",
      CA_INTRO_MULTI,
      "**為什麼選擇 Rogers／Bell／TELUS＋？**",
      "**加拿大 6 網**：Rogers、FIDO、Bell、Telus、Videotron、SaskTel（多數 5G；SaskTel 為 LTE）。",
      "**美國 3 網**：Verizon、AT&T、T-Mobile 4G／5G，跨境自駕／飛往美國免再換卡。",
      "**每日高速後約 512kbps**：可選每日 500MB／1GB／2GB／3GB；高速用完後降速可持續使用，隔日重置。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**漫遊出口**：APN `internet / internetipv6`，出網波蘭 IP。",
      "**安裝提醒**：建議抵達加拿大或美國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_DAILY_MULTI,
  );
}

export function canadaDailyKeyFeaturesByCarrier() {
  return {
    [CA_TELECOM_ROAM]: canadaRoamDailyKeyFeatures(),
    [CA_TELECOM_MULTI]: canadaMultiDailyKeyFeatures(),
  };
}

export function canadaUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **美加吃到飽** eSIM，單一 eSIM 可在加拿大與美國使用，**不含墨西哥**。",
      CA_INTRO_WIND,
      "**為什麼選擇 WIND／Bell／TELUS＋？**",
      "**加拿大多網**：WIND、Bell、Telus、SaskTel 4G／5G。",
      "**美國三網**：T-Mobile、Verizon、AT&T 4G／5G，跨境自駕／飛往美國免再換卡。",
      "**吃到飽不限流量（FUP）**：公平使用政策下可持續上網，適合自駕、滑雪與商務來回。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**漫遊出口**：APN `plus`，出網波蘭 IP。",
      "**安裝提醒**：建議抵達加拿大或美國覆蓋範圍後再啟用 eSIM。",
    ],
    EXP_UNLIM,
  );
}

export function canadaUnlimited10MbpsKeyFeatures() {
  return pack(
    [
      "本方案為 **Bell／Telus／Verizon 10Mbps 吃到飽** eSIM，加拿大＋美國可用，**不含墨西哥**。",
      "Bell 與 Telus 互補加拿大東西岸；美國段走 Verizon。",
      "**為什麼選 10Mbps 吃到飽？**",
      "**限速 10Mbps**：比 FUP 真吃到飽更省，日常導航、傳訊、社群通常足夠。",
      "**加拿大多網＋美國 Verizon**：跨境自駕／飛往美國免再換卡。",
      "**支援熱點與常用 App**：ChatGPT、TikTok、Gemini。",
      "**漫遊出口**：APN `internetipv6`，出網波蘭 IP。",
      "**安裝提醒**：建議抵達加拿大或美國覆蓋範圍後再啟用 eSIM。",
    ],
    "10Mbps 吃到飽在都會區通常可穩定傳訊與導航；影音與大檔傳輸可能較慢。僅供參考。",
  );
}

export function canadaUnlimitedKeyFeaturesByCarrier() {
  return {
    [CA_TELECOM_UNLIM]: canadaUnlimitedKeyFeatures(),
    [CA_TELECOM_UNLIM_10M]: canadaUnlimited10MbpsKeyFeatures(),
  };
}

export default {
  CA_TELECOM_ROAM,
  CA_TELECOM_MULTI,
  CA_TELECOM_UNLIM,
  CA_TELECOM_UNLIM_10M,
  CA_TELECOM_NATIVE,
  canadaRoamTotalKeyFeatures,
  canadaMultiTotalKeyFeatures,
  canadaNativeTotalKeyFeatures,
  canadaTotalKeyFeaturesByCarrier,
  canadaRoamDailyKeyFeatures,
  canadaMultiDailyKeyFeatures,
  canadaDailyKeyFeaturesByCarrier,
  canadaUnlimitedKeyFeatures,
  canadaUnlimitedKeyFeaturesByCarrier,
};
