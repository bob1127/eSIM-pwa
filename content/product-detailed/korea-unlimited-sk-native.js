/**
 * 韓國 eSIM 吃到飽 — SK電信（韓國IP）產品介紹 HTML
 * 雙欄方案詳情 + 其他資訊 + 產品介紹；用 push-carrier-detailed-content.mjs 推送
 */
import {
  planDetailsSummaryCard,
  otherInfoBlock,
  productIntroSection,
  paragraph,
  bulletList,
} from "../../lib/productContentHtmlTemplate.js";
import { koreaCompareTableSection } from "./korea-compare-table.js";

const expiryPolicy = `一旦 eSIM 連接到支援的網路並開始產生數據訪問互聯網，有效期限即開始。我們建議您在到達目的地後添加 eSIM。您也可以提前安裝 eSIM，<span class="jeko-sum-warn">但請記得安裝後立即將其關閉</span>，以避免有效期提前開始。`;

const smsHtml = `完成 eKYC 後免費接收；儲值後可發送 SMS<span style="display:block;margin-top:6px;font-size:13px;color:#64748b;">請注意，由於這是一張旅遊 eSIM，可能無法完全保證應用程式註冊的簡訊接收。</span>`;

const linkStyle =
  'color:#2D5BE3;font-weight:700;text-decoration:underline;';

const planDetailsHtml = planDetailsSummaryCard({
  title: "方案詳情",
  pairs: [
    [
      {
        iconName: "cell_tower",
        label: "訊號覆蓋範圍",
        valueHtml: "首爾、釜山、濟州島以及韓國全國其他地區",
      },
      {
        iconName: "network_cell",
        label: "電信業者",
        valueHtml: "SKT 4G",
      },
    ],
    [
      {
        iconName: "speed",
        label: "速度",
        valueHtml: "4G / LTE",
      },
      {
        iconName: "sim_card",
        label: "方案類型",
        valueHtml: "數據 + 通話 + 簡訊",
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
        valueHtml: "+010 韓國本地號碼",
      },
    ],
    [
      {
        iconName: "phone_in_talk",
        label: "通話",
        valueHtml: "完成 eKYC 後免費接收；儲值後可撥打電話",
      },
      {
        iconName: "sms",
        label: "簡訊",
        valueHtml: smsHtml,
      },
    ],
    [
      {
        iconName: "badge",
        label: "eKYC (身分驗證)",
        valueHtml: "使用通話和簡訊需要實名認證，僅使用數據則不需要",
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
        valueHtml: "本地",
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

const otherInfoHtml = otherInfoBlock([
  {
    html: '<strong style="color:#1e293b;">僅使用數據</strong> 不需實名認證 (eKYC)',
    marginBottom: 16,
  },
  {
    html: `韓國以外的外國旅客，可透過護照在 <span style="${linkStyle}">此連結</span> 完成 eKYC，以開通語音與簡訊功能`,
    marginBottom: 16,
  },
  {
    html: "eKYC 僅能在抵達韓國並連接 eSIM 網路後完成",
    marginBottom: 16,
  },
  {
    html: '購買後請於 <strong style="color:#1e293b;">60 天</strong>內掃描 QR Code 並完成啟用。',
    marginBottom: 16,
  },
  {
    html: "這個 eSIM 由當地運營商提供，MicroEsim 作為授權經銷商進行銷售。購買後，該方案是不可取消且不可退款。發行運營商保留在不通知的情況下修改套餐細節的權利，MicroEsim 可能無法及時通知客戶這些變更。感謝您的理解。",
    marginBottom: 0,
  },
]);

const featureBullets = [
  "<strong style=\"color:#1e293b;\">真正無限高速數據</strong> – 無每日上限，無降速",
  "<strong style=\"color:#1e293b;\">全國覆蓋</strong> – 適用於首爾、釜山、濟州島等地",
  "<strong style=\"color:#1e293b;\">立即啟用</strong> – 購買後取得 QR Code，掃描即可啟用",
  "<strong style=\"color:#1e293b;\">SK Telecom 提供</strong> – 連接當地頂級電信商，享最佳穩定性與速度",
  "<strong style=\"color:#1e293b;\">熱點分享</strong> – 可與其他裝置分享數據（依手機相容性）",
  "<strong style=\"color:#1e293b;\">含韓國本地電話號碼</strong>",
];

const noticeBullets = [
  "請確認裝置支援 eSIM 並已解鎖",
  "無限數據使用不需實名認證，完成實名認證後可使用語音與簡訊。",
  "效期自安裝與啟用成功起算",
];

const updateBullets = [
  `用戶可透過 <span style="${linkStyle}">此連結</span>，使用電話號碼與租賃契約編號（可於 MicroEsim 郵件或訂單歷史查詢）完成實名認證。右上角可切換語言。無需親自前往門市。`,
  "<strong style=\"color:#1e293b;\">1 日方案</strong>不支援實名認證及語音／SMS 功能。",
  "eSIM 必須在抵達韓國並連網後才能完成實名認證，不支援提前認證。",
  `僅使用數據不需實名認證，完成認證後可免費接收語音與簡訊（不支援 APP 註冊）。如需撥打電話，可至 SKT 官網儲值：<span style="${linkStyle}">點此</span>。費率依 SKT 官網為準。`,
  "每人同時最多可註冊一張 eSIM。到期後可重新購買新卡並再次註冊。",
  "韓國與越南護照不支援實名認證。",
];

const introHtml = productIntroSection(`
  <h4 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1e293b;line-height:1.35;">SKT 韓國 旅客 eSIM</h4>
  <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#2D5BE3;line-height:1.5;">無限高速數據 · SK Telecom 網路 · 可使用語音與簡訊</p>
  ${paragraph(
    "在韓國各地均可使用最大且最可靠的行動網路 SK Telecom (SKT)。此 eSIM 提供無限高速數據，無降速限制，非常適合需要順暢網路使用的旅客，如導航、串流、上傳等。",
    20,
  )}
  ${koreaCompareTableSection()}
  <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">主要特色：</h4>
  ${bulletList(featureBullets)}
  <h4 style="margin:8px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">注意事項：</h4>
  ${bulletList(noticeBullets)}
  <h4 style="margin:8px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">更新：完成實名認證後可免費使用語音與簡訊</h4>
  ${bulletList(updateBullets)}
`);

export const KOREA_UNLIMITED_SK_NATIVE_DETAILED_CONTENT_HTML = [
  planDetailsHtml,
  otherInfoHtml,
  introHtml,
].join("\n");

export default KOREA_UNLIMITED_SK_NATIVE_DETAILED_CONTENT_HTML;
