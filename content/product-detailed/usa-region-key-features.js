/**
 * 美國本土／美加／北美 — 重點特色（AI 摘要風：短介紹 → 基本介紹與特色 → 粗體分類）
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

export function usaMainlandUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 Verizon／T-Mobile 美國本土吃到飽 eSIM，覆蓋美國本土主要都會與交通沿線，適合訪美觀光、探親與短中期停留。",
      "**基本介紹與特色**",
      "**市場地位：** Verizon 與 T-Mobile 為美國兩大主流電信，市區與州際移動較不易遇到單一死角。",
      "**覆蓋範圍：** 美國本土主要都會與公路沿線（阿拉斯加、夏威夷不保證）。",
      "**網路速度：** 吃到飽不限流量（FUP）；典型實際速度約 8–20Mbps（視位置與擁塞而定）。",
      "**數據路由：** 香港漫遊 IP（非美國原生 IP）。若需要美國 IP，請改選美國 IP 總量／每日型。",
      "**本站方案：** 吃到飽；支援熱點與 ChatGPT／TikTok／Gemini；天數可選 1–10、15、20、25、30 天。",
      "**使用注意：** 建議抵達美國後再新增／啟用 eSIM。",
    ],
    `${EXP_US_FUP} 本線路為香港漫遊 IP。`,
  );
}

export function usaMainlandDailyUsipKeyFeatures() {
  return pack(
    [
      "本方案為 Verizon USA／AT&T USA 美國本土每日型 eSIM，出網標示為美國 IP，依天數提供每日高速額度。",
      "**基本介紹與特色**",
      "**市場地位：** Verizon 與 AT&T 雙網，美國主流覆蓋熱門城市與公路沿線。",
      "**覆蓋範圍：** 美國本土主要都會（阿拉斯加、夏威夷不保證）。",
      "**網路速度：** 可選每日 500MB／1GB／2GB／3GB 等；高速用完後一般約 128kbps（每日重置）。",
      "**數據路由：** 美國 IP 出口（漫遊批發線路，非原生門號卡）；APN 多為 bicsapn（自動）。",
      "**本站方案：** 每日型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達美國後再啟用。",
    ],
    `${EXP_US_128} ${EXP_ROAM_US_IP}`,
  );
}

export function usaMainlandTotalUsipKeyFeatures() {
  return pack(
    [
      "本方案為 Verizon USA／AT&T USA 美國總量型 eSIM，出網標示為美國 IP，於有效天數內提供高速總量，用完後依方案進入 FUP 吃到飽。",
      "**基本介紹與特色**",
      "**市場地位：** Verizon + AT&T 雙網，都會與城際覆蓋穩定。",
      "**覆蓋範圍：** 美國本土主要城市與跨州自駕沿線（阿拉斯加、夏威夷不保證）。",
      "**網路速度：** 總量高速後 FUP 降速無限，比「用完斷網」更安心。",
      "**數據路由：** 美國 IP 出口（漫遊批發線路，非原生門號卡）。",
      "**本站方案：** 總量型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達美國後再啟用。",
    ],
    `${EXP_US_TOTAL_FUP} ${EXP_ROAM_US_IP}`,
  );
}

export function usaMainlandTotalLongUsAttKeyFeatures() {
  return pack(
    [
      "本方案為長天數（15／20／30 天）美國總量型，走 Verizon USA／AT&T USA，出網美國 IP，高速約 30GB 後 FUP 吃到飽。",
      "**基本介紹與特色**",
      "**市場地位：** Verizon／AT&T 覆蓋美國本土主要都會。",
      "**覆蓋範圍：** 適合打工度假、探親、商務短期派駐（阿拉斯加、夏威夷不保證）。",
      "**網路速度：** 高速約 30GB 後進入 FUP，仍可持續上網。",
      "**數據路由：** 美國 IP + 雙網。",
      "**本站方案：** 長天數總量型；支援熱點（實際依當下網路）。",
      "**使用注意：** 建議抵達後再啟用；請預估每月用量。",
    ],
    `${EXP_US_TOTAL_FUP} 長天數方案請預估每月用量，避免高速段過早用完。僅供參考。`,
  );
}

export function usaMainlandTotalLongVzKeyFeatures() {
  return pack(
    [
      "本方案為 60 天長駐總量型，走 Verizon，可選高速 30GB／60GB 後 FUP；閘道為新加坡 IP。",
      "**基本介紹與特色**",
      "**市場地位：** Verizon 覆蓋美國本土主要都會與公路沿線。",
      "**覆蓋範圍：** 一次約兩個月停留，減少中途續購。",
      "**網路速度：** 總量高速後 FUP，仍可持續上網。",
      "**數據路由：** 新加坡 IP（非美國 IP）。若需要美國 IP，請改選美國 IP 系列。",
      "**本站方案：** 60 天長駐總量型。",
      "**使用注意：** 長駐請特別留意高速 GB 是否足夠日常熱點與影音。",
    ],
    `${EXP_US_TOTAL_FUP} 長駐請特別留意高速 GB。僅供參考。`,
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
  return `本方案為美加（美國＋加拿大）${planKindLabel} eSIM，單一方案跨兩國使用，不含墨西哥（美加墨請選北美方案）。`;
}

export function usCanadaUnlimitedKeyFeatures(telecomLabel = "美加多網") {
  return pack(
    [
      usCanadaIntro("吃到飽不限流量"),
      "**基本介紹與特色**",
      `**市場地位：** ${telecomLabel}，美國與加拿大主流網路，城際與跨境移動較有彈性。`,
      "**覆蓋範圍：** 美加主要城市與自駕／滑雪／商務來回路線（不含墨西哥）。",
      "**網路速度：** 吃到飽不限流量（FUP），可持續上網。",
      "**數據路由：** 出網多為波蘭 IP 漫遊節點。",
      "**本站方案：** 吃到飽；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 若行程含墨西哥或需要美國門號，請改選北美 AT&T 美國號碼。建議抵達後再啟用。",
    ],
    "美加主要城市 4G／5G 測速常見可到數十 Mbps，山區、邊境與室內會下降。吃到飽 FUP 不會固定鎖死某一 Mbps，但繁忙時段可能變慢。導航、傳訊通常沒問題。僅供參考。",
  );
}

export function usCanadaDailyKeyFeatures(telecomLabel = "美加多網") {
  return pack(
    [
      usCanadaIntro("每日型"),
      "**基本介紹與特色**",
      `**市場地位：** ${telecomLabel}，雙國多網移動中較不易卡在單一死角。`,
      "**覆蓋範圍：** 美國＋加拿大（不含墨西哥）。",
      "**網路速度：** 依方案提供每日流量；高速用完後一般約 128kbps（每日重置）。",
      "**數據路由：** 漫遊線路；請依每日額度規劃地圖／熱點用量。",
      "**本站方案：** 每日型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 美加墨請另選北美方案。建議抵達後再啟用。",
    ],
    EXP_US_128,
  );
}

export function usCanadaTotalKeyFeatures(telecomLabel = "美加多網") {
  return pack(
    [
      usCanadaIntro("總量型"),
      "**基本介紹與特色**",
      `**市場地位：** ${telecomLabel}，美國＋加拿大雙國可用。`,
      "**覆蓋範圍：** 美加兩國（不含墨西哥）。",
      "**網路速度：** 總量高速、用完斷網（非降速 FUP），請預留餘量。",
      "**數據路由：** 漫遊線路。",
      "**本站方案：** 總量型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 美加墨請另選北美方案。建議抵達後再啟用。",
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

export function northAmericaAttUnlimitedKeyFeatures() {
  return pack(
    [
      "本方案為 AT&T 美國號碼吃到飽 eSIM，含一組 +1 美國電話號碼，可在美加墨使用數據、通話與簡訊，適合需要美國門號的北美行程。",
      "**基本介紹與特色**",
      "**市場地位：** 正宗 AT&T 美國門號線路，美加墨覆蓋可靠（實際依地區而定）。",
      "**覆蓋範圍：** 美國、加拿大、墨西哥；跨境時請啟用此 eSIM 的數據漫遊。",
      "**網路速度：** 美墨無限數據；加拿大 25GB 高速（用盡後約 512Kbps 吃到飽）。若加拿大需要更多高速／吃到飽，可改選 [加拿大吃到飽](/product/canada/canada-unlimited-esim/)。",
      "**通話簡訊：** 美加墨境內及跨國互撥／互傳完全免費。",
      "**數據路由：** 美國境內使用本地數據與美國 IP。",
      "**本站方案：** 含美國號碼；熱點僅限美國境內且不作保證，加拿大與墨西哥無法使用熱點。",
      "**使用注意：** 開通日期以美西時間 (PT) 為準，建議至少提前一天預訂。裝置須已解鎖並支援 eSIM。",
    ],
    "美墨主要城市上網與收發簡訊通常穩定；加拿大請留意 25GB 高速額度，用完後約 512Kbps 仍可傳訊／輕量上網。若加拿大用量較大，可改選加拿大吃到飽。熱點僅建議在美國境內嘗試，且不作保證。開通請依美西時間預約，建議至少提前一天。僅供參考。",
  );
}

export function northAmericaAttUnlimitedOverviewNotices() {
  return {
    fup_notice:
      "美國與墨西哥無限數據流量；加拿大 25GB 高速（用盡後降速至 512 Kbps 吃到飽）。若加拿大需要更多高速／吃到飽，可改選 [加拿大吃到飽](/product/canada/canada-unlimited-esim/)。美加墨境內及跨國無限通話與簡訊免費。網路高度擁塞期間，AT&T 可能暫時降低數據速度。",
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
      "本方案為北美（美國＋加拿大＋墨西哥）每日型 eSIM，出網標示為美國 IP，三國一卡。",
      "**基本介紹與特色**",
      `**市場地位：** ${telecomLabel}，美加墨多網，跨境自駕／飛機往返較安心。`,
      "**覆蓋範圍：** 美國、加拿大、墨西哥。",
      "**網路速度：** 依方案選擇每日流量；用完後一般約 128kbps。",
      "**數據路由：** 美國 IP 出口（漫遊批發，APN 多為 bicsapn），非原生門號卡。",
      "**本站方案：** 每日型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 若需要美國號碼通話簡訊，請改選 AT&T 美國號碼。建議抵達後再啟用。",
    ],
    `${EXP_US_128} ${EXP_ROAM_US_IP}`,
  );
}

export function northAmericaTotalUsipKeyFeatures(telecomLabel) {
  return pack(
    [
      "本方案為北美（美國＋加拿大＋墨西哥）總量型 eSIM，出網標示為美國 IP，三國共用總流量。",
      "**基本介紹與特色**",
      `**市場地位：** ${telecomLabel}，美加墨多網覆蓋。`,
      "**覆蓋範圍：** 美國、加拿大、墨西哥。",
      "**網路速度：** 總量高速；用完後依方案規則限制使用，請預留緩衝。",
      "**數據路由：** 美國 IP 出口（漫遊批發線路）。",
      "**本站方案：** 總量型；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 需要美國號碼請改選 AT&T 美國號碼。建議抵達後再啟用。",
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
