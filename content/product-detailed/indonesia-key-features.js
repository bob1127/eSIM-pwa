/**
 * 印尼 — 重點特色（AI 摘要風）
 * Telkomsel / XL；吃到飽 FUP；每日／總量 128kbps；新加坡 IP
 */
export const ID_TELECOM_TELKOMSEL_XL = "Telkomsel / XL";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

const EXP_FUP =
  "雅加達、峇里島（庫塔、烏布、水明漾）市區 4G／5G 測速常見可到數十 Mbps，偏遠島嶼或室內可能較慢。本方案為不限流量 FUP 吃到飽，繁忙時段速度可能下降。導航、Grab、WhatsApp、TikTok 與 ChatGPT 一般可用（依網路環境而定）。僅供參考。";

const EXP_128 =
  "高速額度內：雅加達、峇里島市區 4G／5G 測速常見可到數十 Mbps。高速用完後約 128kbps——傳訊／輕量網頁勉強可以，影音與熱點會明顯困難。僅供參考。";

export function telkomselXlKeyFeatures(planKind = "unlimited") {
  if (planKind === "daily") return telkomselXlDailyKeyFeatures();
  if (planKind === "total") return telkomselXlTotalKeyFeatures();
  return pack(
    [
      "Telkomsel 與 XL 是印尼兩大主流電信，覆蓋雅加達、峇里島、日惹、泗水等主要旅遊與商務城市。",
      "**基本介紹與特色**",
      "**市場地位：** 印尼主流雙網，單一 eSIM 可自動切換，減少死角。",
      "**覆蓋範圍：** 雅加達、峇里島、日惹、泗水與主要島嶼旅遊區。",
      "**網路速度：** 不限流量吃到飽（FUP）。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 吃到飽；支援熱點與 ChatGPT／TikTok。",
      "**使用注意：** 建議抵達印尼後再啟用。",
    ],
    EXP_FUP,
  );
}

export function telkomselXlTotalKeyFeatures() {
  return pack(
    [
      "本方案為 Telkomsel／XL 雙網總量型 eSIM，出網為新加坡 IP，適合多日行程與控管總用量。",
      "**基本介紹與特色**",
      "**市場地位：** 印尼兩大主流電信雙網互補。",
      "**覆蓋範圍：** 主要旅遊與商務城市。",
      "**網路速度：** 可選 1GB～50GB；高速用完後約 128kbps 續航。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 總量型；支援熱點與 ChatGPT／TikTok。",
      "**使用注意：** 建議抵達印尼後再啟用。",
    ],
    EXP_128,
  );
}

export function telkomselXlDailyKeyFeatures() {
  return pack(
    [
      "本方案為 Telkomsel／XL 雙網每日型 eSIM，出網為新加坡 IP，適合控管每日用量。",
      "**基本介紹與特色**",
      "**市場地位：** 印尼兩大主流電信雙網互補。",
      "**覆蓋範圍：** 主要旅遊與商務城市。",
      "**網路速度：** 可選每日 500MB～3GB；用完後約 128kbps（每日重置）。",
      "**數據路由：** 新加坡 IP 漫遊。",
      "**本站方案：** 每日型；支援熱點與 ChatGPT／TikTok。",
      "**使用注意：** 建議抵達印尼後再啟用。",
    ],
    EXP_128,
  );
}

export default {
  telkomselXlKeyFeatures,
  telkomselXlTotalKeyFeatures,
  telkomselXlDailyKeyFeatures,
};
