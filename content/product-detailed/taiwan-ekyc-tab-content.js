/**
 * 台灣需實名（taiwan-ekyc-esim）— 下方 tab
 * 電信選項：吃到飽｜每日型｜總量型（中華電信・需 eKYC）
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
import { TW_EKYC_URL } from "./taiwan-key-features.js";

const expiryOnUse = `一旦 eSIM 連接到支援的網路並開始產生數據流量，有效期限即開始。我們建議您在到達目的地後添加 eSIM。您也可以提前安裝 eSIM，<span class="jeko-sum-warn">但請記得安裝後立即將其關閉</span>，以避免有效期提前開始。`;
const delivery =
  "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。";
const voiceVoip =
  "不支持，只能透過應用程式（網路通話，即 VoIP）。";
const dealerNote =
  "此 eSIM 由當地運營商提供，jeko eSIM 作為授權通路銷售。數位商品退換依本站退換貨政策；發行運營商可能調整方案細節。感謝您的理解。";
const coverage =
  "台北、台中、高雄、高鐵沿線、桃園／高雄機場與全台主要景點。";
const ekycNote = `本方案<strong>需完成供應商實名認證（eKYC）</strong>後再啟用。請至 <a href="${TW_EKYC_URL}" style="color:#2D5BE3;font-weight:700;text-decoration:underline;" target="_blank" rel="noopener noreferrer">實名認證頁</a> 完成後再開啟行動數據。`;

function planCard(pairs) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: expiryOnUse },
  });
}

function basePairs({ speedHtml, planTypeHtml }) {
  return [
    [
      { iconName: "cell_tower", label: "訊號覆蓋範圍", valueHtml: coverage },
      { iconName: "network_cell", label: "電信業者", valueHtml: "中華電信 4G／5G" },
    ],
    [
      { iconName: "speed", label: "速度", valueHtml: speedHtml },
      { iconName: "sim_card", label: "方案類型", valueHtml: planTypeHtml },
    ],
    [
      { iconName: "wifi_tethering", label: "網路共用／熱點功能", valueHtml: "支持" },
      { iconName: "call", label: "電話號碼", valueHtml: "無" },
    ],
    [
      { iconName: "phone_in_talk", label: "通話", valueHtml: voiceVoip },
      { iconName: "sms", label: "簡訊", valueHtml: "無" },
    ],
    [
      { iconName: "badge", label: "eKYC (身分驗證)", valueHtml: "需要（啟用前完成）" },
      { iconName: "mail", label: "交付", valueHtml: delivery },
    ],
    [
      { iconName: "public", label: "數據路由", valueHtml: "漫遊（香港 IP）" },
      { iconName: "payments", label: "充值選項", valueHtml: "無" },
    ],
  ];
}

function otherActivate() {
  return otherInfoBlock([
    {
      title: "實名認證",
      html: ekycNote,
      marginBottom: 12,
    },
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">請先完成實名，再於台灣覆蓋範圍內啟用 eSIM。</span>提前安裝請關閉行動數據。`,
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);
}

function buildDetailed({ speedHtml, planTypeLabel, introParas, bullets }) {
  const planHtml = planCard(
    basePairs({
      speedHtml,
      planTypeHtml: `僅數據流量・${planTypeLabel}`,
    }),
  );
  const introHtml = productIntroSection(`
    ${introParas.map((t) => paragraph(t, 16)).join("\n")}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(), introHtml].join("\n");
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export const TW_EKYC_UNLIM_DETAILED = buildDetailed({
  speedHtml: "4G／5G；不限流量吃到飽（FUP，實際依環境而定）",
  planTypeLabel: "吃到飽",
  introParas: [
    "jeko eSIM 台灣中華電信吃到飽（<strong>需實名</strong>），出網為香港 IP。",
    "請先完成供應商 eKYC 再啟用。僅數據。",
  ],
  bullets: [
    "運營商：中華電信・需 eKYC・香港 IP",
    "流量：吃到飽不限流量（FUP）",
    "支援熱點；ChatGPT／TikTok 可能受限",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const TW_EKYC_DAILY_DETAILED = buildDetailed({
  speedHtml: "每日高速用完後約 384kbps（每日重置）",
  planTypeLabel: "每日型",
  introParas: [
    "jeko eSIM 台灣中華電信每日型（<strong>需實名</strong>），出網為香港 IP。",
    "可選每日 500MB～3GB；用完後約 384kbps。請先完成 eKYC。",
  ],
  bullets: [
    "運營商：中華電信・需 eKYC・香港 IP",
    "流量：每日額度；用完後約 384kbps（每日重置）",
    "支援熱點；ChatGPT／TikTok 可能受限",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const TW_EKYC_TOTAL_DETAILED = buildDetailed({
  speedHtml: "總量高速用完即斷網",
  planTypeLabel: "總量型",
  introParas: [
    "jeko eSIM 台灣中華電信總量型（<strong>需實名</strong>），出網為香港 IP。",
    "可選 1GB～50GB；高速用完即斷網。請先完成 eKYC。",
  ],
  bullets: [
    "運營商：中華電信・需 eKYC・香港 IP",
    "流量：總量高速；用完斷網",
    "支援熱點；ChatGPT／TikTok 可能受限",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const TW_EKYC_USAGE = usageAdvantagesSection({
  title: "使用 jeko 台灣需實名 eSIM 的優勢",
  subtitle: "中華電信・完成 eKYC 後啟用",
  items: [
    { iconName: "cell_tower", title: "中華電信", descHtml: "全台城市、高鐵與機場覆蓋穩定。" },
    { iconName: "badge", title: "需實名認證", descHtml: "購買後請至供應商頁完成 eKYC 再啟用。" },
    { iconName: "speed", title: "吃到飽／每日／總量", descHtml: "依電信選項選擇方案類型與用量。" },
    { iconName: "qr_code_2", title: "快速交付", descHtml: "付款後數分鐘內以 Email 寄送 QR Code。" },
    { iconName: "flight_land", title: "抵達再啟用", descHtml: "完成實名後，建議抵達台灣再開啟行動數據。" },
  ],
});

function sharedFaq(name) {
  return [
    {
      question: `我的手機是否支援在台灣使用 eSIM？`,
      answerHtml: [
        p(`大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`),
        p(`亦請確認裝置已解鎖，且系統版本支援 eSIM。`, 0),
      ].join(""),
    },
    {
      question: "需要實名嗎？",
      answerHtml: p(
        `需要。請至 <a href="${TW_EKYC_URL}" style="color:#2D5BE3;font-weight:700;" target="_blank" rel="noopener noreferrer">實名認證頁</a> 完成後再啟用。`,
        0,
      ),
    },
    {
      question: `${name} 何時開始計算效期？`,
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議完成實名並抵達台灣後再啟用。`,
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
      question: "可以退換貨嗎？",
      answerHtml: p(
        `數位商品一經寄送 QR／啟用資料後，原則上不可退換；實際依本站退換貨政策為準。`,
        0,
      ),
    },
    {
      question: "可以用熱點嗎？",
      answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
    },
  ];
}

export const TW_EKYC_FAQ_UNLIM = faqAccordion(
  [
    ...sharedFaq("台灣需實名吃到飽"),
    {
      question: "吃到飽會限速嗎？",
      answerHtml: p(`本方案為 FUP，繁忙時段可能變慢，實際依環境而定。`, 0),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const TW_EKYC_FAQ_DAILY = faqAccordion(
  [
    ...sharedFaq("台灣需實名每日型"),
    {
      question: "每日額度用完會怎樣？",
      answerHtml: p(
        `高速用完後一般降速至約 <strong>384kbps</strong>，隔日重置。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const TW_EKYC_FAQ_TOTAL = faqAccordion(
  [
    ...sharedFaq("台灣需實名總量型"),
    {
      question: "總量用完會怎樣？",
      answerHtml: p(`高速用完後會<strong>斷網</strong>，請預留用量。`, 0),
    },
  ],
  { defaultOpenIndex: 0 },
);

export default {
  TW_EKYC_UNLIM_DETAILED,
  TW_EKYC_DAILY_DETAILED,
  TW_EKYC_TOTAL_DETAILED,
  TW_EKYC_USAGE,
  TW_EKYC_FAQ_UNLIM,
  TW_EKYC_FAQ_DAILY,
  TW_EKYC_FAQ_TOTAL,
};
