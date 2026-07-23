/**
 * 日本 eSIM 5G SoftBank / KDDI — 常見問題 HTML
 * （貼至 Medusa 前台編輯器 → 常見問題 → HTML 原始碼）
 * 設計規範見 lib/productContentHtmlTemplate.js（簡約 / 前衛風格 FAQ 手風琴）
 *
 * 內容已改為使用本站（Jeko）自身的資源與流程，取代原供應商站點的連結與說明。
 */
import { faqSectionHead, faqAccordion } from "../../lib/productContentHtmlTemplate.js";

const items = [
  {
    question: "我的手機是否支援在日本使用 eSIM？",
    answerHtml: `<p style="margin:0 0 12px;">大多數情況下，您可以撥打 <strong>*#06#</strong> 並按通話，如果畫面顯示 EID 號碼，代表您的裝置支援 eSIM。</p>
<p style="margin:0;">您也可以<a href="/support" style="color:#2D5BE3;font-weight:600;text-decoration:underline;">點擊查看完整的 eSIM 相容裝置清單</a>。</p>`,
  },
  {
    question: "如何在我的手機上安裝並啟用日本 eSIM 5G SoftBank / KDDI？",
    answerHtml: `<p style="margin:0 0 12px;">一旦 eSIM 連接到支援的網路並開始產生數據流量，效期即開始計算。建議您抵達目的地後再啟用 eSIM；若想提前安裝，<span style="color:#ea580c;font-weight:700;">請記得安裝後立即關閉該線路</span>，以避免效期提前開始。</p>
<p style="margin:0 0 8px;"><strong style="color:#1e293b;">安裝：</strong>請於訊號穩定的網路環境下，掃描訂單中提供的 QR Code 完成安裝。</p>
<p style="margin:0 0 20px;"><strong style="color:#1e293b;">啟用與上網：</strong>抵達日本後，開啟該 eSIM 線路、將行動數據切換至此 eSIM，並啟用<strong>該線路的數據漫遊</strong>。</p>
<p style="margin:0;">查看逐步安裝教學：<a href="/operation-ios" style="color:#2D5BE3;font-weight:600;text-decoration:underline;">iPhone / iPad 安裝教學</a>　·　<a href="/operation-shopee" style="color:#2D5BE3;font-weight:600;text-decoration:underline;">Android 裝置安裝教學</a></p>`,
  },
  {
    question: "我何時以及如何收到我的日本 eSIM 5G SoftBank / KDDI？",
    answerHtml: `<p style="margin:0 0 12px;">馬上！付款完成後，系統將在幾分鐘內以電子郵件將 eSIM QR Code 與啟用資訊寄送給您。</p>
<p style="margin:0;">您也可以隨時登入會員中心，於 <a href="/my-esim" style="color:#2D5BE3;font-weight:600;text-decoration:underline;">「我的 eSIM」</a> 或 <a href="/account" style="color:#2D5BE3;font-weight:600;text-decoration:underline;">訂單查詢</a> 頁面查看 eSIM 資訊與安裝狀態；如未收到信件，歡迎<a href="/contact" style="color:#2D5BE3;font-weight:600;text-decoration:underline;">聯絡我們</a>協助處理。</p>`,
  },
  {
    question: "如何查看我的日本 eSIM 流量使用情況？",
    answerHtml: `<p style="margin:0 0 8px;">您可以透過以下方式查看數據用量：</p>
<p style="margin:0 0 8px;">1. <strong style="color:#1e293b;">會員中心「我的 eSIM」（推薦）：</strong>登入後即可即時查看方案用量、效期與安裝狀態。</p>
<p style="margin:0 0 8px;">2. <strong style="color:#1e293b;">數據使用查詢：</strong>前往<a href="/data-query" style="color:#2D5BE3;font-weight:600;text-decoration:underline;">查詢數據使用情況</a>頁面，輸入訂單確認信中的 ICCID 號碼即可查詢。</p>
<p style="margin:0;">3. <strong style="color:#1e293b;">裝置設定：</strong>也可透過手機的行動數據設定查看用量（例如 iPhone：設定 &gt; 行動服務 &gt; 選擇此 eSIM 查看用量）。</p>`,
  },
  {
    question: "我可以保留原本的 LINE / WhatsApp 號碼嗎？",
    answerHtml: `<p style="margin:0;">可以，安裝 eSIM 不會影響原本的通訊軟體設定，您可以保留所有聯絡人與對話紀錄，並照常使用 LINE、WhatsApp 等應用程式。</p>`,
  },
  {
    question: "我可以用這張日本 eSIM 與其他裝置共用熱點嗎？",
    answerHtml: `<p style="margin:0;">可以，本方案支援熱點分享；實際可分享的流量會依所選方案（總量型 / 限速無限流量 / 真無限流量）而有不同，詳細規則請參考上方「產品介紹」分頁的說明。</p>`,
  },
];

export const JP_SOFTBANK_KDDI_FAQ_CONTENT_HTML = [
  faqSectionHead({
    title: "關於 日本 eSIM 5G SoftBank / KDDI 的常見問題",
    moreHref: "/support",
    moreLabel: "eSIM 相容裝置與使用教學",
  }),
  faqAccordion(items, { defaultOpenIndex: 0 }),
].join("\n");

export default JP_SOFTBANK_KDDI_FAQ_CONTENT_HTML;
