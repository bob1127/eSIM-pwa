/**
 * 印尼吃到飽 eSIM — 重點特色（key_features_by_carrier）
 */
export const ID_TELECOM_TELKOMSEL_XL = "Telkomsel / XL";

function pack(bullets, actual_experience = "") {
  return { bullets, actual_experience };
}

const EXP_FUP =
  "雅加達、峇里島（庫塔、烏布、水明漾）市區 4G／5G 測速常見可到數十 Mbps，偏遠島嶼或室內可能較慢。本方案為不限流量 FUP 吃到飽，繁忙時段速度可能下降。導航、Grab、WhatsApp、TikTok 與 ChatGPT 一般可用（依網路環境而定）。僅供參考。";

export function telkomselXlKeyFeatures() {
  return pack(
    [
      "Telkomsel 與 XL 是印尼兩大主流電信，覆蓋雅加達、峇里島、日惹、泗水等主要旅遊與商務城市。單一 eSIM 可在兩家網路間自動切換，減少死角，適合島嶼間移動與多日行程。",
      "**為什麼選這條印尼吃到飽線路？**",
      "**支援 ChatGPT 與 TikTok**：供應商標示支援 TikTok、ChatGPT（新加坡 IP 漫遊節點），適合需要社群、短影音與 AI 工具的旅客。",
      "**4G／5G 不限流量（FUP）**：依公平使用政策提供吃到飽上網，實際速度取決於位置與網路環境，支援熱點分享。",
      "**天數彈性**：提供 1～30 天等多種方案，依停留天數選購，建議抵達印尼後再安裝啟用。",
      "**漫遊新加坡 IP**：本線路採新加坡 IP（APN e-ideas），自動設定，開機即可連線。",
    ],
    EXP_FUP,
  );
}

const EXP_TOTAL_128 =
  "高速額度內：雅加達、峇里島市區 4G／5G 測速常見可到數十 Mbps。高速用完後降速至約 128kbps，僅適合輕量訊息；地圖即時導航、影音與熱點會明顯困難。請依總量規劃用量。僅供參考。";

export function telkomselXlTotalKeyFeatures() {
  return pack(
    [
      "Telkomsel 與 XL 雙網總量型 eSIM，覆蓋印尼主要旅遊城市。依所選方案提供固定高速流量，用完後降速至約 128kbps 可持續使用（不會直接斷網）。",
      "**為什麼選這條印尼總量線路？**",
      "**支援 ChatGPT 與 TikTok**：新加坡 IP 漫遊節點（APN e-ideas），供應商標示支援 TikTok、ChatGPT。",
      "**1GB～50GB 多種容量**：依行程天數與用量選擇，高速額度用完後降速，適合輕度上網或搭配 Wi‑Fi 使用。",
      "**4G／5G 高速額度**：市區與熱門景點訊號穩定，支援熱點分享。",
      "**漫遊新加坡 IP**：自動設定，建議抵達印尼後再安裝啟用。",
    ],
    EXP_TOTAL_128,
  );
}

const EXP_DAILY_128 =
  "每日高速額度內：市區 4G／5G 測速常見可到數十 Mbps。當日高速用完後降速至約 128kbps，隔日重置。128kbps 僅適合輕量訊息，影音與熱點會明顯困難。僅供參考。";

export function telkomselXlDailyKeyFeatures() {
  return pack(
    [
      "Telkomsel 與 XL 雙網每日型 eSIM，覆蓋印尼主要旅遊城市。依所選方案提供「每日」高速流量，當日用完後降速至約 128kbps，隔日自動重置高速額度。",
      "**為什麼選這條印尼每日線路？**",
      "**支援 ChatGPT 與 TikTok**：新加坡 IP 漫遊節點（APN e-ideas），供應商標示支援 TikTok、ChatGPT。",
      "**每日 500MB～3GB 可選**：輕量到中度用量都適合，依天數與每日額度搭配選購。",
      "**4G／5G 高速額度**：支援熱點分享，適合導航、Grab、即時通訊。",
      "**漫遊新加坡 IP**：自動設定，建議抵達印尼後再安裝啟用。",
    ],
    EXP_DAILY_128,
  );
}

export default {
  telkomselXlKeyFeatures,
  telkomselXlTotalKeyFeatures,
  telkomselXlDailyKeyFeatures,
};
