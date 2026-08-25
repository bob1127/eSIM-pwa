/**
 * 韓國 eSIM 總量型 — 常見問題（accordion）
 * 內容僅依即時 API／本店變體標示；雙切換 vs SKT 規則差異寫清楚，降低客服爭議。
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
        `請確認手機已解鎖且支援 eSIM。完整清單可參考${link("/support", "eSIM 相容裝置說明")}。`,
        0,
      ),
    ].join(""),
  },
  {
    question: "如何安裝並啟用 jeko 韓國總量型 eSIM？",
    answerHtml: [
      p(
        `建議在穩定 Wi‑Fi 下掃描 QR Code 完成安裝；抵達韓國後再開啟該 eSIM、切換行動數據至此線路（連網後效期才會開始計算）。`,
      ),
      p(
        `教學：${link("/operation-ios", "iPhone／iPad")}　·　${link("/operation-shopee", "Android")}`,
        0,
      ),
    ].join(""),
  },
  {
    question: "付款後多久會收到 eSIM？如何取得 QR Code？",
    answerHtml: [
      p(`通常付款完成後幾分鐘內，jeko eSIM 會以 Email 寄送 QR Code 與啟用資訊。`),
      p(
        `亦可登入 ${link("/my-esim", "「我的 eSIM」")} 查看；若未收到信件請${link("/contact", "聯絡我們")}。`,
        0,
      ),
    ].join(""),
  },
  {
    question: "效期什麼時候開始計算？",
    answerHtml: p(
      `一旦 eSIM 連上支援的網路並開始產生數據流量，有效期限即開始。建議抵達目的地後再啟用；若提前安裝，<span style="color:#ea580c;font-weight:700;">請記得安裝後立即關閉該線路</span>。`,
      0,
    ),
  },
  {
    question: "安裝後還能用原本的 LINE、WhatsApp 嗎？",
    answerHtml: p(
      `可以。安裝 eSIM 不影響通訊軟體帳號；本方案無傳統語音／簡訊，請以 VoIP 應用通話。`,
      0,
    ),
  },
  {
    question: "如何查詢流量使用情況？",
    answerHtml: [
      p(`1. 會員中心 ${link("/my-esim", "「我的 eSIM」")}：查看用量、效期與狀態。`),
      p(
        `2. ${link("/data-query", "數據使用查詢")}：輸入訂單確認信中的 ICCID。`,
        0,
      ),
    ].join(""),
  },
  {
    question: "可以退貨或換方案嗎？",
    answerHtml: p(
      `jeko eSIM 為數位商品，退換依安裝與激活狀態適用本站${link("/refund-policy", "退換貨政策")}。`,
      0,
    ),
  },
];

const dualExtra = [
  {
    question: "高速流量用完後還能上網嗎？",
    answerHtml: p(
      `可以。總量高速用完後會降速至約 <strong>128 kbps</strong> 可持續使用（適合傳訊／輕量網頁，不適合影音）。`,
      0,
    ),
  },
  {
    question: "這個方案的電信、APN 與出網 IP 是什麼？",
    answerHtml: p(
      `網路為 <strong>LG U+ 與 SKT（4G／LTE／5G）</strong>；APN <strong>e-ideas</strong>；出網 IP 為 <strong>新加坡</strong>；線路為漫遊。`,
      0,
    ),
  },
  {
    question: "可以用熱點分享嗎？可選哪些總量／天數？",
    answerHtml: p(
      `支援熱點。可選總量為 3／5／10／20／30／50GB；天數 3／5／7／10／15／20／25／30 天，實際以商品頁可選規格為準。`,
      0,
    ),
  },
];

const sktExtra = [
  {
    question: "流量用完後還能上網嗎？",
    answerHtml: p(
      `<span style="color:#ea580c;font-weight:700;">不能。</span>本方案<strong>流量用完即斷網</strong>，無法再傳訊或上網。若擔心超量，請改選「LG U+／SK電信 5G 雙切換」（用完後約 128 kbps 續航）。`,
      0,
    ),
  },
  {
    question: "這個方案的電信、APN 與出網 IP 是什麼？",
    answerHtml: p(
      `網路為 <strong>SKT（4G／LTE／5G）</strong>；APN <strong>cmhk</strong>；出網 IP 為 <strong>香港</strong>；線路為漫遊。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？可選哪些總量／天數？",
    answerHtml: p(
      `不支援熱點。可選總量為 1／3／5／10／20／30／50GB；天數 3／5／7／10／15／30 天，實際以商品頁可選規格為準。`,
      0,
    ),
  },
];

export const KOREA_TOTAL_DUAL_FAQ_CONTENT_HTML = faqAccordion(
  [...sharedItems, ...dualExtra],
  { defaultOpenIndex: 0 },
);

export const KOREA_TOTAL_SKT_FAQ_CONTENT_HTML = faqAccordion(
  [...sharedItems, ...sktExtra],
  { defaultOpenIndex: 0 },
);

export default KOREA_TOTAL_DUAL_FAQ_CONTENT_HTML;
