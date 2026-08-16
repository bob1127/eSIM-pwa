/**
 * 美國本土／美加／北美 — 重點特色／實際體驗（key_features_by_carrier）
 * 寫法對齊香港／新加坡／馬來西亞：完整說明 +「為什麼選擇」+ 實際體驗（勿加「小編實測」）
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

const EXP_US_FUP =
  "都會區（紐約、洛杉磯、舊金山、芝加哥等）4G／5G 測速常見可到數十 Mbps，室內／地下室／擁塞與偏遠地區會明顯下降。本方案為不限流量 FUP，實際速度依位置與網路負載而定。導航、Uber、傳訊通常沒問題；重度影音／視訊視當下網路而定。阿拉斯加、夏威夷覆蓋不保證。僅供參考。";

const EXP_US_128 =
  "高速額度內：都會區測速常見可到數十 Mbps（視訊號而定）。高速用完後降速至約 128kbps，測速通常只有約 0.1Mbps 等級——傳訊息／輕量網頁勉強可以，地圖即時導航、影音、熱點會明顯困難。請依每日／總量額度規劃用量。阿拉斯加、夏威夷不保證。僅供參考。";

const EXP_US_TOTAL_FUP =
  "高速額度內：都會區測速常見可到數十 Mbps。進入 FUP 降速無限後仍可持續上網，但速度會明顯低於高速段，適合導航與傳訊，不適合長時間高畫質影音。僅供參考。";

const EXP_US_TERMINATE =
  "高速額度內：都會區測速常見可到數十 Mbps。總量用完後會斷網，無法繼續使用，請預留餘量或改選吃到飽／每日型。僅供參考。";

const EXP_ROAM_US_IP =
  "出口標示為美國 IP，但線路屬漫遊批發（非美國原生門號卡）。都會區上網體驗通常接近一般 4G／5G；社群、地圖、熱點多半可用。實際速度與 App 可用性依當下網路而定。僅供參考。";

/* ========== 美國本土 ========== */

/** 美國本土吃到飽｜Verizon / T-Mobile（供應商 IP=HK） */
export function usaMainlandUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 **Verizon／T-Mobile** 美國本土吃到飽 eSIM，覆蓋美國本土主要都會與交通沿線，適合訪美觀光、探親與短中期停留。",
      "**為什麼選擇 Verizon／T-Mobile 吃到飽？**",
      "**雙網覆蓋**：Verizon 與 T-Mobile 互補，市區與州際移動較不易遇到單一業者死角。",
      "**吃到飽不限流量（FUP）**：公平使用政策下可持續上網；典型實際速度約 **8–20Mbps**（視位置與擁塞而定），適合整天導航、傳訊與輕量影音。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**天數彈性**：提供 1–10、15、20、25、30 天等多種天數，依行程挑選。",
      "**重要提醒**：供應商閘道為**香港漫遊 IP**（非美國原生 IP）。**阿拉斯加、夏威夷使用不保證**。建議抵達美國後再新增／啟用 eSIM。",
    ],
    `${EXP_US_FUP} 本線路為香港漫遊 IP，若你需要「美國 IP」請改選美國 IP 總量／每日型方案。`,
  );
}

/** 美國本土每日型｜Verizon USA / AT&T USA（美國 IP） */
export function usaMainlandDailyUsipKeyFeatures() {
  return pack(
    [
      "本方案為 **Verizon USA／AT&T USA** 美國本土每日型 eSIM，出網標示為**美國 IP**，依天數提供每日高速額度。",
      "**為什麼選擇美國 IP 每日型？**",
      "**美國 IP 出口**：適合需要美國出口節點的網路服務與一般上網（仍為漫遊批發線路，非原生門號卡）。",
      "**Verizon + AT&T 雙網**：美國兩大主流業者，4G／5G 覆蓋熱門城市與公路沿線。",
      "**每日高速額度**：可選每日 500MB／1GB／2GB／3GB 等；高速用完後一般降速至約 **128 kbps**（每日重置）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：APN 多為 `bicsapn`（自動）；建議抵達美國後再新增／啟用。阿拉斯加／夏威夷不保證。",
    ],
    `${EXP_US_128} ${EXP_ROAM_US_IP}`,
  );
}

/** 美國總量型｜Verizon USA / AT&T USA（美國 IP） */
export function usaMainlandTotalUsipKeyFeatures() {
  return pack(
    [
      "本方案為 **Verizon USA／AT&T USA** 美國總量型 eSIM，出網標示為**美國 IP**，於有效天數內提供高速總量，用完後依方案進入 FUP 吃到飽。",
      "**為什麼選擇美國 IP 總量型？**",
      "**美國 IP 出口**：適合需要美國出口節點的旅客（漫遊批發線路，非原生門號卡）。",
      "**Verizon + AT&T 雙網**：都會與城際覆蓋穩定，適合跨州自駕與城市移動。",
      "**總量高速後 FUP**：高速 GB 用完後可持續上網（降速無限），比「用完斷網」更安心。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達美國後再新增／啟用 eSIM。阿拉斯加／夏威夷不保證。",
    ],
    `${EXP_US_TOTAL_FUP} ${EXP_ROAM_US_IP}`,
  );
}

/** 長天數 Verizon USA / AT&T USA｜美國 IP｜15–30 天 */
export function usaMainlandTotalLongUsAttKeyFeatures() {
  return pack(
    [
      "本方案為**長天數（15／20／30 天）**美國總量型，走 **Verizon USA／AT&T USA**，出網**美國 IP**，高速約 **30GB** 後 FUP 吃到飽。",
      "**為什麼選擇長天數美國 IP？**",
      "**較長停留一次買足**：適合打工度假、探親、商務短期派駐。",
      "**美國 IP + 雙網**：Verizon／AT&T 覆蓋；高速用完後仍可持續上網。",
      "**支援熱點**：可分享給筆電或其他裝置（實際依當下網路）。",
      "**安裝提醒**：建議抵達後再啟用；阿拉斯加／夏威夷不保證。",
    ],
    `${EXP_US_TOTAL_FUP} 長天數方案請預估每月用量，避免高速段過早用完。僅供參考。`,
  );
}

/** 長天數 Verizon｜60 天｜新加坡 IP */
export function usaMainlandTotalLongVzKeyFeatures() {
  return pack(
    [
      "本方案為**60 天長駐**總量型，走 **Verizon**，可選高速 **30GB／60GB** 後 FUP；閘道為**新加坡 IP**。",
      "**為什麼選擇 60 天 Verizon？**",
      "**超長效期**：一次覆蓋約兩個月停留，減少中途續購。",
      "**Verizon 覆蓋**：美國本土主要都會與公路沿線。",
      "**總量後 FUP**：高速用完後仍可持續上網。",
      "**注意**：出網為新加坡 IP（非美國 IP）。若你需要美國 IP，請改選美國 IP 系列。",
    ],
    `${EXP_US_TOTAL_FUP} 長駐請特別留意高速 GB 是否足夠日常熱點與影音。僅供參考。`,
  );
}

export function usaMainlandUnlimitedKeyFeaturesByCarrier() {
  return { "Verizon / T-Mobile": usaMainlandUnlimitedKeyFeatures() };
}

export function usaMainlandDailyUsipKeyFeaturesByCarrier() {
  return { "Verizon USA / AT&T USA": usaMainlandDailyUsipKeyFeatures() };
}

export function usaMainlandTotalUsipKeyFeaturesByCarrier() {
  return {
    "Verizon USA / AT&T USA": usaMainlandTotalUsipKeyFeatures(),
    "長天數 Verizon USA / AT&T USA": usaMainlandTotalLongUsAttKeyFeatures(),
    "長天數 Verizon": usaMainlandTotalLongVzKeyFeatures(),
  };
}

/* ========== 美加 ========== */

function usCanadaIntro(planKindLabel) {
  return `本方案為**美加（美國＋加拿大）**${planKindLabel} eSIM，單一方案跨兩國使用，**不含墨西哥**（美加墨請選北美方案）。`;
}

const US_CA_WHY = "**為什麼選擇美加雙國方案？**";

export function usCanadaUnlimitedKeyFeatures(telecomLabel = "美加多網") {
  return pack(
    [
      usCanadaIntro("吃到飽不限流量"),
      US_CA_WHY,
      `**電信組合：${telecomLabel}**：美國與加拿大主流網路，城際與跨境移動較有彈性。`,
      "**吃到飽不限流量（純數據）**：公平使用政策下可持續上網，適合美加自駕、滑雪、商務來回。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**不含墨西哥**：若行程含墨西哥或需要美國門號，請改選北美 AT&T 美國號碼方案。",
      "**安裝提醒**：建議抵達美加覆蓋範圍後再新增／啟用 eSIM。出網多為波蘭 IP 漫遊節點。",
    ],
    "美加主要城市 4G／5G 測速常見可到數十 Mbps，山區、邊境與室內會下降。吃到飽 FUP 不會固定鎖死某一 Mbps，但繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。",
  );
}

export function usCanadaDailyKeyFeatures(telecomLabel = "美加多網") {
  return pack(
    [
      usCanadaIntro("每日型"),
      US_CA_WHY,
      `**電信組合：${telecomLabel}**：雙國多網，移動中較不易卡在單一死角。`,
      "**每日高速額度**：依方案提供每日流量；高速用完後一般降速至約 **128 kbps**（每日重置）。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**不含墨西哥**：美加墨請另選北美方案。",
      "**安裝提醒**：建議抵達後再啟用；請依每日額度規劃地圖／熱點用量。",
    ],
    EXP_US_128,
  );
}

export function usCanadaTotalKeyFeatures(telecomLabel = "美加多網") {
  return pack(
    [
      usCanadaIntro("總量型"),
      US_CA_WHY,
      `**電信組合：${telecomLabel}**：美國＋加拿大雙國可用。`,
      "**總量高速、用完斷網**：高速 GB 用完後會斷網（非降速 FUP），請預留餘量。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**不含墨西哥**：美加墨請另選北美方案。",
      "**安裝提醒**：建議抵達後再啟用 eSIM。",
    ],
    EXP_US_TERMINATE,
  );
}

export function usCanadaUnlimitedKeyFeaturesByCarrier() {
  return {
    "US,CA 多網 A0": usCanadaUnlimitedKeyFeatures("US,CA 多網 A0"),
    "Verizon + Bell / Telus": usCanadaUnlimitedKeyFeatures(
      "Verizon + Bell / Telus",
    ),
    "T-Mobile / Verizon / AT&T + 加拿大": usCanadaUnlimitedKeyFeatures(
      "T-Mobile / Verizon / AT&T + 加拿大",
    ),
  };
}

export function usCanadaDailyKeyFeaturesByCarrier() {
  return {
    "Verizon + Bell / Telus": usCanadaDailyKeyFeatures(
      "Verizon + Bell / Telus",
    ),
    "T-Mobile / Verizon / AT&T + 加拿大": usCanadaDailyKeyFeatures(
      "T-Mobile / Verizon / AT&T + 加拿大",
    ),
    "Verizon / AT&T / T-Mobile + 加拿大多網": usCanadaDailyKeyFeatures(
      "Verizon / AT&T / T-Mobile + 加拿大多網",
    ),
  };
}

export function usCanadaTotalKeyFeaturesByCarrier() {
  return {
    "Bell/Telus + Verizon（A0）": usCanadaTotalKeyFeatures(
      "Bell/Telus + Verizon（A0）",
    ),
    "US&Canada Total B（T-Mobile/AT&T/Verizon + 加拿大多網）":
      usCanadaTotalKeyFeatures(
        "US&Canada Total B（T-Mobile/AT&T/Verizon + 加拿大多網）",
      ),
  };
}

/* ========== 北美（美加墨） ========== */

/** AT&T 美國號碼｜產品核心特色＋實際體驗 */
export function northAmericaAttUnlimitedKeyFeatures() {
  return pack(
    [
      "**【產品核心特色】**",
      "**正宗美國電話號碼**：包含一組 **+1 AT&T** 電話號碼，可用於接聽通話與收發簡訊。",
      "**美國 IP**：在美國境內使用本地數據，並使用**美國的 IP 地址**。",
      "**加拿大與墨西哥漫遊**：要在加拿大和墨西哥使用數據，請**啟用此 eSIM 的數據漫遊**功能。",
      "**高速 5G／LTE**：在北美全境享受可靠的網路覆蓋（實際覆蓋依地區而定）。",
      "**無限通話與簡訊**：在美國、加拿大和墨西哥境內及跨國互撥／互傳**完全免費**。",
      "**無限數據流量**：在**美國和墨西哥**享有無限流量。在**加拿大**境內，提供 **25GB 高速流量**（用盡後降速至 **512 Kbps** 吃到飽）。",
      "**無縫漫遊**：一張 eSIM 暢遊美加墨，跨境時無需額外設定。",
      "**支援熱點分享（僅限美國境內）**：可用性與剩餘數據流量不作保證；在某些情況下熱點可能完全無法使用。熱點可用性可能因分配到的號碼線路及其使用狀態而有所不同。**加拿大與墨西哥境內無法使用熱點。**",
    ],
    "美墨主要城市上網與收發簡訊通常穩定；加拿大請留意 25GB 高速額度，用完後約 512Kbps 仍可傳訊／輕量上網。熱點僅建議在美國境內嘗試，且不作保證。開通請依美西時間預約，建議至少提前一天。僅供參考。",
  );
}

/** AT&T 美國號碼｜概覽重要資訊（FUP／啟用／特別說明） */
export function northAmericaAttUnlimitedOverviewNotices() {
  return {
    fup_notice:
      "美國與墨西哥無限數據流量；加拿大 25GB 高速（用盡後降速至 512 Kbps 吃到飽）。美加墨境內及跨國無限通話與簡訊免費。網路高度擁塞期間，AT&T 可能暫時降低數據速度。",
    activation_notice:
      "開通政策：您所選擇的日期以美西時間 (PT) 為準。服務將於該日期的上午 9:00 前自動啟用。為確保服務準時開通，建議您至少提前一天預訂。",
    special_notice: [
      "【重要資訊 — 請務必閱讀】",
      "熱點限制：熱點分享／網路共享僅限美國境內，且可用性不作保證；加拿大與墨西哥境內無法使用熱點。",
      "裝置相容性：手機必須為「已解鎖 (Unlocked)」且支援 eSIM，並支援美國 4G／5G 頻段。建議僅限 iPhone 使用；部分 Android 仍可能可用，但受限於電信商規範無法保證相容，Android 用戶請自行評估購買風險。",
      "網路覆蓋圖：5G 覆蓋並非所有區域皆有，可查閱 AT&T 預付覆蓋圖 att.com/prepaidmap。",
      "加拿大／墨西哥使用數據時，請啟用此 eSIM 的數據漫遊功能。",
    ].join("\n"),
  };
}

export function northAmericaDailyUsipKeyFeatures(telecomLabel) {
  return pack(
    [
      "本方案為**北美（美國＋加拿大＋墨西哥）**每日型 eSIM，出網標示為**美國 IP**，三國一卡。",
      "**為什麼選擇北美每日型？**",
      `**電信組合：${telecomLabel}**：美加墨多網，跨境自駕／飛機往返較安心。`,
      "**美國 IP 出口**：漫遊批發線路（APN 多為 `bicsapn`），非原生門號卡。",
      "**每日高速額度**：依方案選擇每日流量；用完後一般降速至約 **128 kbps**。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達北美覆蓋後再啟用。若需要美國號碼通話簡訊，請改選 AT&T 美國號碼方案。",
    ],
    `${EXP_US_128} ${EXP_ROAM_US_IP}`,
  );
}

export function northAmericaTotalUsipKeyFeatures(telecomLabel) {
  return pack(
    [
      "本方案為**北美（美國＋加拿大＋墨西哥）**總量型 eSIM，出網標示為**美國 IP**，三國共用總流量。",
      "**為什麼選擇北美總量型？**",
      `**電信組合：${telecomLabel}**：美加墨多網覆蓋。`,
      "**美國 IP 出口**：漫遊批發線路；請依總 GB 規劃三國用量。",
      "**總量高速**：高速用完後依方案規則限制使用，請預留緩衝。",
      "**支援熱點與常用 App**：熱點分享；支援 ChatGPT、TikTok、Gemini。",
      "**安裝提醒**：建議抵達後再啟用。需要美國號碼請改選 AT&T 美國號碼方案。",
    ],
    `${EXP_US_128} ${EXP_ROAM_US_IP}`,
  );
}

export function northAmericaAttUnlimitedKeyFeaturesByCarrier() {
  return { "AT&T 美國號碼": northAmericaAttUnlimitedKeyFeatures() };
}

export function northAmericaAttUnlimitedOverviewNoticesByCarrier() {
  return { "AT&T 美國號碼": northAmericaAttUnlimitedOverviewNotices() };
}

export function northAmericaDailyUsipKeyFeaturesByCarrier() {
  const a0 = "Rogers + Movistar + Verizon USA / AT&T USA";
  const a1 = "Rogers + Movistar + Verizon USA / AT&T USA（A1）";
  return {
    [a0]: northAmericaDailyUsipKeyFeatures(a0),
    [a1]: northAmericaDailyUsipKeyFeatures(a1),
  };
}

export function northAmericaTotalUsipKeyFeaturesByCarrier() {
  const t = "Rogers + Movistar + Verizon USA / AT&T USA";
  return { [t]: northAmericaTotalUsipKeyFeatures(t) };
}

export default {
  usaMainlandUnlimitedKeyFeaturesByCarrier,
  usaMainlandDailyUsipKeyFeaturesByCarrier,
  usaMainlandTotalUsipKeyFeaturesByCarrier,
  usCanadaUnlimitedKeyFeaturesByCarrier,
  usCanadaDailyKeyFeaturesByCarrier,
  usCanadaTotalKeyFeaturesByCarrier,
  northAmericaAttUnlimitedKeyFeaturesByCarrier,
  northAmericaAttUnlimitedOverviewNoticesByCarrier,
  northAmericaDailyUsipKeyFeaturesByCarrier,
  northAmericaTotalUsipKeyFeaturesByCarrier,
};
