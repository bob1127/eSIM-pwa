/**
 * 韓國 eSIM 總量型 — 方案詳情／產品介紹
 * 資料來源：/api/esim/list（內部核對用，前台不展示 API／SKU 術語）
 *   - LG U+ / SK電信 5G 雙切換 ← South Korea(T+C)-Total*（unlimited 128kbps）
 *   - SK電信 5G ← South Korea-Total*-B0（terminate）
 */
import {
  planDetailsSummaryCard,
  productIntroSection,
  paragraph,
  bulletList,
} from "../../lib/productContentHtmlTemplate.js";
import { koreaCompareTableSection } from "./korea-compare-table.js";

const expiryPolicy = `一旦 eSIM 連接到支援的網路並開始產生數據流量，有效期限即開始。建議抵達韓國後再啟用；若提前安裝，<span class="jeko-sum-warn">請記得安裝後立即關閉該線路</span>，避免效期提前開始。`;

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
        valueHtml: "4G／LTE／5G（高速額度內）；高速用完後降速至約 128 kbps 可持續使用",
      },
      {
        iconName: "sim_card",
        label: "方案類型",
        valueHtml: "僅數據流量・總量型（漫遊線路）",
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
        label: "可選總量",
        valueHtml: "3GB／5GB／10GB／20GB／30GB／50GB",
      },
    ],
    [
      {
        iconName: "calendar_month",
        label: "可選天數",
        valueHtml: "3／5／7／10／15／20／25／30 天",
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
          "總量高速用完後降速至約 <strong>128 kbps</strong>，可繼續傳訊／輕量上網，不適合影音。",
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
    "想要獲得終極旅行體驗，請選擇 jeko eSIM 的韓國總量型 eSIM — 最適合韓國的 eSIM。我們的 eSIM 讓您在全國各地以明確總量的高速數據與 4G／LTE／5G 連線，釋放您的 iPhone 或 iPad 的強大功能。在幾分鐘內即可在韓國連線。",
    16,
  )}
  ${paragraph(
    "擺脫漫遊費用和實體 SIM 卡更換的麻煩 — 我們的韓國 eSIM 讓您在幾分鐘內連接上網，讓您的旅程無縫且無壓力。本方案支援將設備變成行動熱點，與旅伴分享連線，並從首爾到濟州島盡情探索，無需擔心昂貴漫遊費。高速額度用完後仍可約 128 kbps 續航，傳訊與輕量上網更安心。",
    20,
  )}
  ${koreaCompareTableSection()}
  <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
  ${bulletList([
    "電信網路：LG U+ 與 SKT（4G／LTE／5G）雙網自動切換",
    "APN：e-ideas（多數手機可自動設定）；出網為新加坡 IP",
    "效期：抵達當地連上網路並開始使用數據後才開始計算",
    "流量：總量高速用完後降速至約 128 kbps，可持續使用（不會斷網）",
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
        valueHtml: "4G／LTE／5G（總量高速額度內）",
      },
      {
        iconName: "sim_card",
        label: "方案類型",
        valueHtml: "僅數據流量・總量型（漫遊線路）",
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
        label: "可選總量",
        valueHtml: "1GB／3GB／5GB／10GB／20GB／30GB／50GB",
      },
    ],
    [
      {
        iconName: "calendar_month",
        label: "可選天數",
        valueHtml: "3／5／7／10／15／30 天",
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
          '<span class="jeko-sum-warn">流量用完即斷網</span>，無法再上網或傳訊。請預留餘量或改選「雙切換」（用完降速至約 128 kbps）。',
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
    "想要獲得終極旅行體驗，請選擇 jeko eSIM 的韓國總量型 eSIM — 最適合韓國的 eSIM。我們的 eSIM 讓您在全國各地以明確總量的高速數據與 4G／LTE／5G 連線，釋放您的 iPhone 或 iPad 的強大功能。在幾分鐘內即可在韓國連線。",
    16,
  )}
  ${paragraph(
    "擺脫漫遊費用和實體 SIM 卡更換的麻煩 — 我們的韓國 eSIM 讓您在幾分鐘內連接上網，讓您的旅程無縫且無壓力。依行程預估用量選擇總量，從首爾到濟州島盡情探索，無需擔心昂貴漫遊費。請留意本方案流量用完即斷網，建議預留餘量，讓旅程更安心。",
    20,
  )}
  ${koreaCompareTableSection()}
  <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
  ${bulletList([
    "電信網路：SKT（4G／LTE／5G）",
    "APN：cmhk（多數手機可自動設定）；出網為香港 IP",
    "效期：抵達當地連上網路並開始使用數據後才開始計算",
    "流量：總量用完即斷網，無法再上網或傳訊，請預留餘量",
    "僅數據方案：無門號、無傳統通話／簡訊；不支援熱點分享",
  ])}
`);

export const KOREA_TOTAL_DUAL_DETAILED_CONTENT_HTML = [
  dualPlanHtml,
  dualIntroHtml,
].join("\n");

export const KOREA_TOTAL_SKT_DETAILED_CONTENT_HTML = [
  sktPlanHtml,
  sktIntroHtml,
].join("\n");

export default KOREA_TOTAL_DUAL_DETAILED_CONTENT_HTML;
