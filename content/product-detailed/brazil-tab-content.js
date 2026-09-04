/**
 * 巴西 eSIM — 下方 tab（產品介紹／使用介紹／FAQ）
 * 電信商鍵須與 Medusa variant／key_features 一致：VIVO BRAZIL
 */
import {
  planDetailsSummaryCard,
  productIntroSection,
  paragraph,
  bulletList,
  otherInfoBlock,
  usageAdvantagesSection,
  faqAccordion,
} from "../../lib/productContentHtmlTemplate.js";
import { BR_TELECOM_VIVO } from "./brazil-key-features.js";

const expiryOnUse = `一旦 eSIM 連接到支援的網路並開始產生數據流量，有效期限即開始。我們建議您在到達目的地後添加 eSIM。您也可以提前安裝 eSIM，<span class="jeko-sum-warn">但請記得安裝後立即將其關閉</span>，以避免有效期提前開始。`;
const delivery =
  "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。";
const voiceVoip =
  "不支持，只能透過應用程式（網路通話，即 VoIP）。";
const dealerNote =
  "此 eSIM 由批發運營商提供，jeko eSIM 作為授權通路銷售。數位商品退換依本站退換貨政策；發行運營商可能調整方案細節。感謝您的理解。";
const coverage =
  "里約熱內盧、聖保羅、巴西利亞、薩爾瓦多、庫里奇巴等巴西主要都會區與熱門觀光城市。";

function planCard(pairs) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: expiryOnUse },
  });
}

function basePairs() {
  return [
    [
      { iconName: "cell_tower", label: "訊號覆蓋範圍", valueHtml: coverage },
      {
        iconName: "network_cell",
        label: "電信業者",
        valueHtml: "Vivo Brazil 4G／5G",
      },
    ],
    [
      {
        iconName: "speed",
        label: "速度",
        valueHtml: "不限流量吃到飽（依供應商 Fair Use）",
      },
      {
        iconName: "sim_card",
        label: "方案類型",
        valueHtml: "僅數據流量・吃到飽",
      },
    ],
    [
      {
        iconName: "wifi_tethering",
        label: "網路共用／熱點功能",
        valueHtml: "支持",
      },
      { iconName: "call", label: "電話號碼", valueHtml: "無" },
    ],
    [
      { iconName: "phone_in_talk", label: "通話", valueHtml: voiceVoip },
      { iconName: "sms", label: "簡訊", valueHtml: "無" },
    ],
    [
      { iconName: "badge", label: "eKYC (身分驗證)", valueHtml: "不需要" },
      { iconName: "mail", label: "交付", valueHtml: delivery },
    ],
    [
      {
        iconName: "public",
        label: "數據路由",
        valueHtml: "漫遊（波蘭 IP）",
      },
      { iconName: "payments", label: "充值選項", valueHtml: "無" },
    ],
  ];
}

function otherActivate() {
  return otherInfoBlock([
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">建議抵達巴西覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。亞馬遜偏遠區與部分室內訊號可能較弱。`,
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export const BR_UNLIM_DETAILED = [
  planCard(basePairs()),
  otherActivate(),
  productIntroSection(`
    ${paragraph(
      "jeko eSIM 巴西吃到飽，走 <strong>Vivo Brazil</strong> 4G／5G，出網為<strong>波蘭 IP</strong>。",
      16,
    )}
    ${paragraph(
      "不限流量吃到飽（依供應商 Fair Use）。支援熱點與 ChatGPT／TikTok／Gemini。僅數據，無當地門號。",
      16,
    )}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "運營商：Vivo Brazil・波蘭 IP",
      "流量：不限流量吃到飽（依供應商 Fair Use）",
      "天數：1／3／5／7／10／15／20／30 天可選",
      "支援熱點；支援 ChatGPT、TikTok、Gemini",
      "僅數據：無門號／傳統通話／簡訊",
      "效期：抵達當地連網並開始使用數據後才開始計算",
    ])}
  `),
].join("\n");

export const BR_USAGE = usageAdvantagesSection({
  title: "使用 jeko 巴西 Vivo eSIM 的優勢",
  subtitle: "都會區覆蓋・吃到飽",
  items: [
    {
      iconName: "cell_tower",
      title: "Vivo Brazil",
      descHtml: "里約、聖保羅等主要都會區 4G／5G 常見可用。",
    },
    {
      iconName: "speed",
      title: "不限流量吃到飽",
      descHtml: "依供應商 Fair Use；適合整天導航、社群與熱點分享。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    {
      iconName: "qr_code_2",
      title: "快速交付",
      descHtml: "付款後數分鐘內以 Email 寄送 QR Code。",
    },
    {
      iconName: "flight_land",
      title: "抵達再啟用",
      descHtml: "建議抵達巴西後再安裝／開啟行動數據。",
    },
  ],
});

export const BR_FAQ_UNLIM = faqAccordion(
  [
    {
      question: "我的手機是否支援在巴西使用 eSIM？",
      answerHtml: [
        p(
          `大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`,
        ),
        p(`亦請確認裝置已解鎖，且系統版本支援 eSIM。`, 0),
      ].join(""),
    },
    {
      question: "巴西吃到飽 eSIM 何時開始計算效期？",
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達巴西後再啟用。`,
        0,
      ),
    },
    {
      question: "如何安裝？",
      answerHtml: p(
        `付款完成後以 Email 寄送 QR Code。於設定中選擇「加入行動方案」掃描即可。`,
        0,
      ),
    },
    {
      question: "出網 IP 是哪一國？能用 ChatGPT／TikTok 嗎？",
      answerHtml: p(
        `本方案出網為<strong>波蘭 IP</strong>，並支援 ChatGPT、TikTok、Gemini（實際可用性仍視當地網路與服務商政策）。`,
        0,
      ),
    },
    {
      question: "可以用熱點嗎？",
      answerHtml: p(
        `可以，支援熱點分享；實際速度依供應商 Fair Use 與現場訊號而定。`,
        0,
      ),
    },
    {
      question: "偏遠地區訊號如何？",
      answerHtml: p(
        `都會區較穩定；亞馬遜偏遠區與部分室內訊號可能下降，不保證全程高速。`,
        0,
      ),
    },
    {
      question: "可以退換貨嗎？",
      answerHtml: p(
        `數位商品一經寄送 QR／啟用資料後，原則上不可退換；實際依本站退換貨政策為準。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export { BR_TELECOM_VIVO as BR_TELECOM };

export default {
  BR_UNLIM_DETAILED,
  BR_USAGE,
  BR_FAQ_UNLIM,
  BR_TELECOM: BR_TELECOM_VIVO,
};
