/**
 * 韓國 eSIM 每日型 — 方案詳情／產品介紹
 * 兩變體內容分開（與總量型同一規範：旅客文案、不展示 API／SKU 術語）
 *   - LG U+ / SK電信 5G 雙切換 ← South Korea(T+C)-Daily*
 *   - SK電信 5G ← South Korea-Daily*-B0（商品變體為 SKT 單網）
 */
import {
  planDetailsSummaryCard,
  productIntroSection,
  paragraph,
  bulletList,
} from "../../lib/productContentHtmlTemplate.js";
import { koreaCompareTableSection } from "./korea-compare-table.js";

const expiryPolicy = `一旦 eSIM 連接到支援的網路並開始產生數據流量，有效期限即開始。建議抵達韓國後再啟用；若提前安裝，<span class="jeko-sum-warn">請記得安裝後立即關閉該線路</span>，避免效期提前開始。每日高速額度依方案於當地時間重置。`;

const dualPlanHtml = planDetailsSummaryCard({
  title: "方案詳情",
  pairs: [
    [
      {
        iconName: "cell_tower",
        label: "訊號覆蓋範圍",
        valueHtml: "首爾、釜山、濟州島等韓國旅遊目的地",
      },
      {
        iconName: "network_cell",
        label: "電信業者",
        valueHtml: "LG U+（4G／LTE／5G）、SKT（4G／LTE／5G）雙網",
      },
    ],
    [
      {
        iconName: "speed",
        label: "速度",
        valueHtml:
          "4G／LTE／5G（每日高速額度內）；標準方案用完後約 128 kbps；亦可選「5Mbps 續航」用完後約 5 Mbps 可持續使用",
      },
      {
        iconName: "sim_card",
        label: "方案類型",
        valueHtml: "僅數據流量・每日型（漫遊線路）",
      },
    ],
    [
      {
        iconName: "wifi_tethering",
        label: "網路共用／熱點功能",
        valueHtml: "支持",
      },
      {
        iconName: "public",
        label: "出網 IP／數據路由",
        valueHtml: "新加坡 IP・漫遊",
      },
    ],
    [
      {
        iconName: "settings_ethernet",
        label: "APN",
        valueHtml: "e-ideas（多數裝置可自動帶入）",
      },
      {
        iconName: "data_usage",
        label: "可選每日高速",
        valueHtml: "每日 500MB／1GB／1GB（5Mbps 續航）／2GB／3GB",
      },
    ],
    [
      {
        iconName: "calendar_month",
        label: "可選天數",
        valueHtml: "1～10／15／20／25／30 天",
      },
      {
        iconName: "call",
        label: "電話號碼／通話／簡訊",
        valueHtml: "無。不支援傳統語音與簡訊；請使用 LINE、WhatsApp 等 VoIP。",
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
          "付款完成後數分鐘內以 Email 寄送 eSIM QR Code；亦可至「我的 eSIM」查看。",
      },
    ],
    [
      {
        iconName: "payments",
        label: "充值選項",
        valueHtml: "無（請另購新方案）",
      },
      {
        iconName: "timer",
        label: "流量規則",
        valueHtml:
          "每日高速額度用完後可持續使用：標準約 <strong>128 kbps</strong>；若選 5Mbps 續航則約 <strong>5 Mbps</strong>。每日重置。",
      },
    ],
  ],
  fullWidth: {
    label: "效期政策",
    valueHtml: expiryPolicy,
  },
});

const dualIntroHtml = productIntroSection(`
  ${paragraph(
    "想要獲得終極旅行體驗，請選擇 jeko eSIM 的韓國每日型 eSIM — 最適合韓國的 eSIM。我們的 eSIM 讓您在全國各地以每日高速額度與 4G／LTE／5G 連線，釋放您的 iPhone 或 iPad 的強大功能。在幾分鐘內即可在韓國連線。",
    16,
  )}
  ${paragraph(
    "擺脫漫遊費用和實體 SIM 卡更換的麻煩 — 我們的韓國 eSIM 讓您在幾分鐘內連接上網，讓您的旅程無縫且無壓力。本方案支援將設備變成行動熱點，與旅伴分享連線，並從首爾到濟州島盡情探索，無需擔心昂貴漫遊費。每日高速用完後仍可持續連線，傳訊與輕量上網更安心。",
    20,
  )}
  ${koreaCompareTableSection()}
  <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
  ${bulletList([
    "電信網路：LG U+ 與 SKT（4G／LTE／5G）雙網自動切換",
    "APN：e-ideas（多數手機可自動設定）；出網為新加坡 IP",
    "效期：抵達當地連上網路並開始使用數據後才開始計算",
    "流量：每日高速用完後可持續使用（標準約 128 kbps；可選 5Mbps 續航）",
    "僅數據方案：無門號、無傳統通話／簡訊；支援熱點分享",
  ])}
`);

const sktPlanHtml = planDetailsSummaryCard({
  title: "方案詳情",
  pairs: [
    [
      {
        iconName: "cell_tower",
        label: "訊號覆蓋範圍",
        valueHtml: "首爾、釜山、濟州島等韓國旅遊目的地",
      },
      {
        iconName: "network_cell",
        label: "電信業者",
        valueHtml: "SKT（4G／LTE／5G）",
      },
    ],
    [
      {
        iconName: "speed",
        label: "速度",
        valueHtml:
          "4G／LTE／5G（每日高速額度內）；高速用完後降速至約 384 kbps 可持續使用",
      },
      {
        iconName: "sim_card",
        label: "方案類型",
        valueHtml: "僅數據流量・每日型（漫遊線路）",
      },
    ],
    [
      {
        iconName: "wifi_tethering",
        label: "網路共用／熱點功能",
        valueHtml: '<span class="jeko-sum-warn">不支援</span>',
      },
      {
        iconName: "public",
        label: "出網 IP／數據路由",
        valueHtml: "香港 IP・漫遊",
      },
    ],
    [
      {
        iconName: "settings_ethernet",
        label: "APN",
        valueHtml: "cmhk（多數裝置可自動帶入）",
      },
      {
        iconName: "data_usage",
        label: "可選每日高速",
        valueHtml: "每日 500MB／1GB／2GB",
      },
    ],
    [
      {
        iconName: "calendar_month",
        label: "可選天數",
        valueHtml: "1～10／12／15／20／30 天",
      },
      {
        iconName: "call",
        label: "電話號碼／通話／簡訊",
        valueHtml: "無。不支援傳統語音與簡訊；請使用 LINE、WhatsApp 等 VoIP。",
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
          "付款完成後數分鐘內以 Email 寄送 eSIM QR Code；亦可至「我的 eSIM」查看。",
      },
    ],
    [
      {
        iconName: "payments",
        label: "充值選項",
        valueHtml: "無（請另購新方案）",
      },
      {
        iconName: "timer",
        label: "流量規則",
        valueHtml:
          "每日高速額度用完後降速至約 <strong>384 kbps</strong>，可持續使用（傳訊／輕量網頁），每日重置。",
      },
    ],
  ],
  fullWidth: {
    label: "效期政策",
    valueHtml: expiryPolicy,
  },
});

const sktIntroHtml = productIntroSection(`
  ${paragraph(
    "想要獲得終極旅行體驗，請選擇 jeko eSIM 的韓國每日型 eSIM — 最適合韓國的 eSIM。我們的 eSIM 讓您在全國各地以每日高速額度與 4G／LTE／5G 連線，釋放您的 iPhone 或 iPad 的強大功能。在幾分鐘內即可在韓國連線。",
    16,
  )}
  ${paragraph(
    "擺脫漫遊費用和實體 SIM 卡更換的麻煩 — 我們的韓國 eSIM 讓您在幾分鐘內連接上網，讓您的旅程無縫且無壓力。依行程選擇每日高速額度，從首爾到濟州島盡情探索，無需擔心昂貴漫遊費。每日高速用完後仍約 384 kbps 可持續連線，建議依用量挑選合適額度。",
    20,
  )}
  ${koreaCompareTableSection()}
  <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
  ${bulletList([
    "電信網路：SKT（4G／LTE／5G）",
    "APN：cmhk（多數手機可自動設定）；出網為香港 IP",
    "效期：抵達當地連上網路並開始使用數據後才開始計算",
    "流量：每日高速用完後約 384 kbps 可持續使用，每日重置",
    "僅數據方案：無門號、無傳統通話／簡訊；不支援熱點分享",
  ])}
`);

export const KOREA_DAILY_DUAL_DETAILED_CONTENT_HTML = [
  dualPlanHtml,
  dualIntroHtml,
].join("\n");

export const KOREA_DAILY_SKT_DETAILED_CONTENT_HTML = [
  sktPlanHtml,
  sktIntroHtml,
].join("\n");

export default KOREA_DAILY_DUAL_DETAILED_CONTENT_HTML;
