/**
 * 新加坡 — 重點特色（AI 摘要風）
 * 吃到飽：Singtel｜每日／總量：M1 / Starhub
 */

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

export const SG_TELECOM_SINGTEL = "Singtel";
export const SG_TELECOM_M1_STARHUB = "M1 / Starhub";

const EXP_FUP =
  "市區（烏節、濱海灣、樟宜等）4G 測速常見可到數十 Mbps，室內／捷運／擁塞時會下降。FUP 吃到飽不會鎖死固定 Mbps，繁忙時段可能變慢。僅供參考。";
const EXP_128 =
  "高速額度內：島內市區 4G 測速常見可到數十 Mbps。用完後約 128kbps——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function singtelKeyFeatures(planKind = "unlimited") {
  return pack(
    [
      "Singtel 是新加坡最大行動電信商之一，覆蓋樟宜機場、烏節、濱海灣與捷運沿線，適合短途出差與觀光。",
      "**基本介紹與特色**",
      "**市場地位：** 新加坡主流電信之一，全島熱門區域訊號穩定。",
      "**覆蓋範圍：** 商業區、樟宜機場、烏節路、聖淘沙與捷運沿線。",
      "**網路速度：** 不限流量吃到飽（FUP）。",
      "**數據路由：** 香港 IP 漫遊。",
      "**本站方案：** 吃到飽；支援熱點與 ChatGPT／TikTok／Gemini。",
      "**使用注意：** 建議抵達新加坡後再啟用。",
    ],
    planKind === "unlimited" ? EXP_FUP : EXP_128,
  );
}

export function m1StarhubKeyFeatures(planKind = "daily") {
  const speedLine =
    planKind === "total"
      ? "**網路速度：** 可選 1GB～50GB；高速用完後約 128kbps 續航。"
      : "**網路速度：** 可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）。";
  return pack(
    [
      "本方案為 M1／StarHub 雙網 eSIM，出網為香港 IP，適合全島移動與多日停留。",
      "**基本介紹與特色**",
      "**市場地位：** M1 與 StarHub 為新加坡兩大主流電信，雙網自動切換減少死角。",
      "**覆蓋範圍：** 商業區、機場、購物中心與捷運沿線。",
      speedLine,
      "**數據路由：** 香港 IP 漫遊。",
      "**本站方案：** 支援熱點與 ChatGPT／Gemini（TikTok 請依方案標示）。",
      "**使用注意：** 建議抵達後再啟用。",
    ],
    EXP_128,
  );
}

export default { singtelKeyFeatures, m1StarhubKeyFeatures };
