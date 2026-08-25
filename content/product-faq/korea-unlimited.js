/**
 * 韓國 eSIM 吃到飽 — 常見問題（accordion）
 * SK電信（韓國IP）／LG U+ / SK電信 共用基礎題，並各補電信商差異題。
 * FAQPage JSON-LD 會從 HTML 抽出 Q&A（見 lib/productFaqContent.js）。
 */
import { faqAccordion } from "../../lib/productContentHtmlTemplate.js";

const link = (href, label) =>
  `<a href="${href}" style="color:#2D5BE3;font-weight:600;text-decoration:underline;">${label}</a>`;

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

const sharedItems = [
  {
    question: "我的手機是否支援韓國 eSIM？",
    answerHtml: [
      p(
        `大多數情況下，您可以撥打 <strong>*#06#</strong> 並按通話；若畫面顯示 EID 號碼，代表裝置支援 eSIM。`,
      ),
      p(
        `您也可以${link("/support", "查看完整的 eSIM 相容裝置清單")}，確認手機已解鎖且支援 eSIM 後再購買。`,
        0,
      ),
    ].join(""),
  },
  {
    question: "如何安裝並啟用 jeko 韓國 eSIM？",
    answerHtml: [
      p(
        `建議在<strong>訊號穩定的 Wi‑Fi</strong>環境掃描訂單中的 QR Code 完成安裝。抵達韓國後再開啟該 eSIM 線路、將行動數據切換至此 eSIM，並依方案啟用數據漫遊（若系統提示）。`,
      ),
      p(
        `查看逐步教學：${link("/operation-ios", "iPhone / iPad 安裝教學")}　·　${link("/operation-shopee", "Android 裝置安裝教學")}`,
        0,
      ),
    ].join(""),
  },
  {
    question: "付款後多久會收到 eSIM？如何取得 QR Code？",
    answerHtml: [
      p(
        `通常付款完成後幾分鐘內，jeko eSIM 會以電子郵件寄送 QR Code 與啟用資訊。`,
      ),
      p(
        `您也可登入會員中心，於 ${link("/my-esim", "「我的 eSIM」")} 或訂單查詢查看；若未收到信件，請${link("/contact", "聯絡我們")}協助。`,
        0,
      ),
    ].join(""),
  },
  {
    question: "效期什麼時候開始計算？",
    answerHtml: p(
      `一旦 eSIM 連上支援的網路並開始產生數據流量，有效期限即開始。建議抵達目的地後再啟用；若提前安裝，<span style="color:#ea580c;font-weight:700;">請記得安裝後立即關閉該線路</span>，避免效期提前開始。`,
      0,
    ),
  },
  {
    question: "可以用熱點分享給其他裝置嗎？",
    answerHtml: p(
      `可以。jeko 韓國 eSIM 支援行動熱點／網路共用，方便與旅伴分享連線。實際可分享流量與速度仍依所選方案與現場訊號而定。`,
      0,
    ),
  },
  {
    question: "安裝後還能用原本的 LINE、WhatsApp 嗎？",
    answerHtml: p(
      `可以。安裝 eSIM 不會影響原本通訊軟體帳號；您可保留聯絡人與對話，並繼續使用 LINE、WhatsApp、Skype 等 VoIP 應用。搭配雙卡雙待時，原 SIM 仍可照常接收簡訊與來電（視手機與電信設定）。`,
      0,
    ),
  },
  {
    question: "如何查詢韓國 eSIM 的流量使用情況？",
    answerHtml: [
      p(`您可以透過以下方式查看用量：`),
      p(
        `1. <strong style="color:#1e293b;">會員中心「我的 eSIM」：</strong>登入後即可查看方案用量、效期與安裝狀態。`,
      ),
      p(
        `2. <strong style="color:#1e293b;">數據使用查詢：</strong>前往${link("/data-query", "查詢數據使用情況")}，輸入訂單確認信中的 ICCID 即可查詢。`,
        0,
      ),
    ].join(""),
  },
  {
    question: "jeko 韓國 eSIM 可以退貨或換方案嗎？",
    answerHtml: p(
      `jeko eSIM 為數位商品。標示為原生 eSIM 者售出後原則上不退款；非原生／漫遊方案依安裝與激活狀態適用退換貨政策。詳見本站${link("/refund-policy", "退換貨政策")}。`,
      0,
    ),
  },
];

const skNativeExtra = [
  {
    question: "SK電信（韓國 IP）方案需要 eKYC 實名認證嗎？",
    answerHtml: p(
      `若您<strong>僅使用數據</strong>，通常不需要 eKYC。若要使用語音通話與簡訊，需完成實名認證（eKYC）。完成認證後可免費接收來電／簡訊；撥打與發送簡訊則需依供應商規則儲值。`,
      0,
    ),
  },
  {
    question: "什麼是韓國原生 IP？和漫遊方案有什麼不同？",
    answerHtml: p(
      `本方案為 SK電信原生 eSIM，出網為<strong>韓國 IP</strong>，延遲較接近在地用戶，適合導航、搶票、直播與在地 App。漫遊方案則多為境外 IP（例如新加坡／香港），連線方式與部分服務體驗可能不同。`,
      0,
    ),
  },
];

const lgSkExtra = [
  {
    question: "LG U+／SK電信漫遊方案需要實名認證嗎？",
    answerHtml: p(
      `不需要。本方案為僅數據流量的漫遊 eSIM，一般可安裝後直接使用數據，無需 eKYC。`,
      0,
    ),
  },
  {
    question: "LG U+／SK 方案支援通話與簡訊嗎？",
    answerHtml: p(
      `本方案<strong>不支援傳統語音與簡訊</strong>。如需通話，請使用 LINE、WhatsApp、Skype 等網路通話（VoIP）應用程式。`,
      0,
    ),
  },
];

export const KOREA_UNLIMITED_SK_NATIVE_FAQ_ITEMS = [
  ...sharedItems,
  ...skNativeExtra,
];

export const KOREA_UNLIMITED_LG_SK_FAQ_ITEMS = [
  ...sharedItems,
  ...lgSkExtra,
];

export const KOREA_UNLIMITED_SK_NATIVE_FAQ_CONTENT_HTML = faqAccordion(
  KOREA_UNLIMITED_SK_NATIVE_FAQ_ITEMS,
  { defaultOpenIndex: 0 },
);

export const KOREA_UNLIMITED_LG_SK_FAQ_CONTENT_HTML = faqAccordion(
  KOREA_UNLIMITED_LG_SK_FAQ_ITEMS,
  { defaultOpenIndex: 0 },
);

export default KOREA_UNLIMITED_SK_NATIVE_FAQ_CONTENT_HTML;
