/**
 * 中國大陸 eSIM 每日型 — 產品介紹 HTML（detailed_content_by_carrier）
 * 雙欄方案詳情 + 純文字產品介紹；用 push-carrier-detailed-content.mjs 推送
 */
import {
  planDetailsSummaryCard,
  productIntroSection,
  paragraph,
} from "../../lib/productContentHtmlTemplate.js";

const expiryPolicy = `一旦 eSIM 連接到支援的網路並開始產生數據訪問互聯網，有效期限即開始。我們建議您在到達目的地後添加 eSIM。您也可以提前安裝 eSIM，<span class="jeko-sum-warn">但請記得安裝後立即將其關閉</span>，以避免有效期提前開始。`;

const planDetailsHtml = planDetailsSummaryCard({
  title: "方案詳情",
  pairs: [
    [
      {
        iconName: "cell_tower",
        label: "訊號覆蓋範圍",
        valueHtml: "北京、上海、廣州、深圳等國內旅遊目的地。",
      },
      {
        iconName: "network_cell",
        label: "電信業者",
        valueHtml: "CMCC 5G",
      },
    ],
    [
      {
        iconName: "speed",
        label: "速度",
        valueHtml: "4G / LTE / 5G",
      },
      {
        iconName: "sim_card",
        label: "方案類型",
        valueHtml: "僅數據流量",
      },
    ],
    [
      {
        iconName: "wifi_tethering",
        label: "網路共用／熱點功能",
        valueHtml: "支持",
      },
      {
        iconName: "call",
        label: "電話號碼",
        valueHtml: "無",
      },
    ],
    [
      {
        iconName: "phone_in_talk",
        label: "通話",
        valueHtml: "不支持，只能透過應用程式（網路通話，即 VoIP）。",
      },
      {
        iconName: "sms",
        label: "簡訊",
        valueHtml: "無",
      },
    ],
    [
      {
        iconName: "badge",
        label: "eKYC (身分驗證)",
        valueHtml: "不需要",
      },
      {
        iconName: "mail",
        label: "交付",
        valueHtml:
          "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。",
      },
    ],
    [
      {
        iconName: "public",
        label: "數據路由",
        valueHtml: "漫遊",
      },
      {
        iconName: "payments",
        label: "充值選項",
        valueHtml: "無",
      },
    ],
  ],
  fullWidth: {
    label: "效期政策",
    valueHtml: expiryPolicy,
  },
});

const introHtml = productIntroSection(`
  ${paragraph("Microesim 提供中國旅遊最佳 eSIM。", 16)}
  ${paragraph(
    "透過我們的 中國 eSIM 方案，讓您在中國大陸輕鬆保持連線，享有 5G/4G/LTE 速度和無限數據。無論是 iPhone、iPad，還是其他兼容裝置，我們的 中國 eSIM 都能確保您擁有無憂的旅程。只需幾分鐘的快速設定，即可連接到中國大陸的網路，省去昂貴的漫遊費用。",
    16,
  )}
  ${paragraph(
    "我們的中國 eSIM 由中國大陸領先的電信供應商 中國移動 (China Mobile) 支援，無論是繁忙的城市還是偏遠地區，都能提供無與倫比的信號覆蓋。不論您是探索都市中心還是鄉村美景，這款 中國 eSIM 都能為您的所有需求提供可靠的網路連線。",
    16,
  )}
  ${paragraph(
    "告別實體 SIM 卡和漫遊的煩惱。我們的中國 eSIM 數據方案能將您的裝置變為個人熱點，提供數位自由與便利。無需 VPN 即可存取 Google、YouTube、Facebook、Instagram 和 WhatsApp 等熱門應用程式。對於 TikTok 用戶，我們還提供專門的支援 TikTok 的中國 eSIM 5G，讓您順暢使用。",
    0,
  )}
`);

export const CHINA_DAILY_CMCC_DETAILED_CONTENT_HTML = [
  planDetailsHtml,
  introHtml,
].join("\n");

export default CHINA_DAILY_CMCC_DETAILED_CONTENT_HTML;
