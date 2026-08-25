/**
 * 馬來西亞 — 重點特色（AI 摘要風：短介紹 → 基本介紹與特色 → 粗體分類）
 * planKind: "unlimited" | "daily" | "total"
 */
export const MY_TELECOM_UMOBILE = "UMobile 5G 當地";
export const MY_TELECOM_DUAL = "Maxis / Celcom / Digi";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

const EXP_10MBPS =
  "高速額度內：吉隆坡等都會區 4G／5G 測速常見可到數十 Mbps 以上（室內／地下室／擁塞時會下降）。進入約 10Mbps 吃到飽後，測速多半落在約 7～12Mbps。導航、Grab、傳訊、網頁通常沒問題；720p 影音多半可看。僅供參考。";

const EXP_128 =
  "高速額度內：都會區常見可達數十 Mbps。高速用完後降速至約 128kbps，僅適合傳訊／輕量網頁；地圖即時導航、影音、熱點會明顯困難。僅供參考。";

const EXP_TERMINATE =
  "高速額度內：吉隆坡等都會區 5G／4G 測速常見可到數十 Mbps。總量高速用完後會斷網，請預留用量或改選吃到飽／每日型。僅供參考。";

const UMOBILE_PLAN = {
  unlimited:
    "**本站方案：** 吃到飽；每日約 1GB 高速後維持約 10Mbps 無限流量。",
  daily:
    "**本站方案：** 每日型；可選每日 500MB／1GB／2GB／3GB，用完後約 128kbps（每日重置）。",
  total:
    "**本站方案：** 總量型；可選 1GB～50GB，高速用完後斷網。",
};

const DUAL_PLAN = {
  unlimited:
    "**本站方案：** 吃到飽；每日約 1GB 高速後維持約 10Mbps 無限流量。",
  daily:
    "**本站方案：** 每日型；可選每日額度，用完後約 128kbps（每日重置）。",
  total:
    "**本站方案：** 總量型；多數高速用完後約 128kbps 續航。",
};

export function umobileKeyFeatures(planKind = "unlimited") {
  return pack(
    [
      "UMobile 是馬來西亞主要行動電信商之一，以高速數據與年輕用戶基礎著稱。本站方案走馬來西亞本地網路與原生馬來西亞 IP，適合吉隆坡、檳城、蘭卡威、沙巴、柔佛等行程。",
      "**基本介紹與特色**",
      "**市場地位：** 馬來西亞主流電信之一，都會區與熱門旅遊城市覆蓋穩定。",
      "**覆蓋範圍：** 吉隆坡、檳城、蘭卡威、柔佛、沙巴、砂拉越等主要城市與景點（實際訊號依地區而定）。",
      "**網路速度：** 支援 UMobile 5G／4G，適合導航、Grab、視訊與社群。",
      "**本地體驗：** 馬來西亞原生 IP，造訪本地網站與 App 較接近在地用戶。",
      UMOBILE_PLAN[planKind] || UMOBILE_PLAN.unlimited,
      "**旅遊便利：** 支援熱點；可使用 ChatGPT、TikTok、Gemini。建議抵達後再啟用。",
    ],
    planKind === "total"
      ? EXP_TERMINATE
      : planKind === "daily"
        ? EXP_128
        : EXP_10MBPS,
  );
}

export function maxisCelcomDigiKeyFeatures(planKind = "unlimited") {
  return pack(
    [
      "Maxis、Celcom 與 Digi 是馬來西亞三大主流電信品牌。本方案採三網自動切換，適合跨州移動、沿海與內陸景點並遊的旅客。",
      "**基本介紹與特色**",
      "**市場地位：** 三大主流電信組合，覆蓋都會、高速公路與多數旅遊熱點。",
      "**覆蓋範圍：** 吉隆坡進出、跨州公路與主要旅遊城市；三網互補可減少單一死角。",
      "**網路速度：** 支援三大電信 5G／4G，適合導航、Grab、視訊與社群。",
      "**數據路由：** 新加坡 IP 漫遊（非馬來西亞原生 IP）；多數裝置 APN 自動帶入。",
      DUAL_PLAN[planKind] || DUAL_PLAN.unlimited,
      "**旅遊便利：** 支援熱點；可使用 ChatGPT、TikTok、Gemini。建議抵達後再啟用。",
    ],
    planKind === "unlimited" ? EXP_10MBPS : EXP_128,
  );
}

export const UMOBILE_KEY_FEATURES = umobileKeyFeatures("unlimited");

export default {
  umobileKeyFeatures,
  maxisCelcomDigiKeyFeatures,
  UMOBILE_KEY_FEATURES,
};
