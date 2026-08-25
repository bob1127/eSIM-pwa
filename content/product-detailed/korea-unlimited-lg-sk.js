/**
 * 韓國 eSIM 吃到飽 — LG U+ / SK電信（漫遊）產品介紹 HTML
 * 雙欄方案詳情 + 產品介紹；用 push-carrier-detailed-content.mjs 推送
 */
import {
  planDetailsSummaryCard,
  productIntroSection,
  paragraph,
} from "../../lib/productContentHtmlTemplate.js";
import { koreaCompareTableSection } from "./korea-compare-table.js";

const expiryPolicy = `一旦 eSIM 連接到支援的網路並開始產生數據訪問互聯網，有效期限即開始。我們建議您在到達目的地後添加 eSIM。您也可以提前安裝 eSIM，<span class="jeko-sum-warn">但請記得安裝後立即將其關閉</span>，以避免有效期提前開始。`;

const linkStyle =
  "color:#2D5BE3;font-weight:700;text-decoration:underline;";

const planDetailsHtml = planDetailsSummaryCard({
  title: "方案詳情",
  pairs: [
    [
      {
        iconName: "cell_tower",
        label: "訊號覆蓋範圍",
        valueHtml: "首爾、釜山、仁川、濟州島等韓國旅遊目的地。",
      },
      {
        iconName: "network_cell",
        label: "電信業者",
        valueHtml: "LG U+ 5G SKT 5G",
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
  ${paragraph(
    "想要獲得終極旅行體驗，請選擇 Microesim 的韓國 eSIM — 最適合韓國的 eSIM。我們的 eSIM 讓您在全國各地以無限數據和令人難以置信的 4G/LTE/5G 速度釋放您的 iPhone 或 iPad 的強大功能。在幾分鐘內即可在韓國連線。",
    16,
  )}
  ${paragraph(
    "擺脫漫遊費用和實體 SIM 卡更換的麻煩 — 我們的 韓國 eSIM 讓您在幾分鐘內連接上網，讓您的旅程無縫且無壓力。將您的設備變成行動熱點，與您的旅伴分享這些好處，並從首爾到濟州島盡情探索，無需擔心連線問題。",
    20,
  )}
  ${koreaCompareTableSection()}
  ${paragraph(
    `其他推薦：透過我們的 <a href="/product/japan/" style="${linkStyle}">日本與韓國 eSIM</a> 卡體驗 5G 連線的巔峰。在您的旅程中享受實惠的價格和穩定的網路，讓每一次旅行都輕鬆自如。`,
    16,
  )}
  ${paragraph(
    `其他推薦：透過我們的 <a href="/product/japan/japan-unlimited-esim-nolimit/" style="${linkStyle}">日本 eSIM 5G</a> 解鎖日本的數位世界。在全國範圍內享受實惠、高速的連線，非常適合您的下一次冒險。無縫且穩定，輕鬆體驗日本最棒的一切。`,
    0,
  )}
`);

export const KOREA_UNLIMITED_LG_SK_DETAILED_CONTENT_HTML = [
  planDetailsHtml,
  introHtml,
].join("\n");

export default KOREA_UNLIMITED_LG_SK_DETAILED_CONTENT_HTML;
