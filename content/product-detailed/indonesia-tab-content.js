/**
 * 印尼 eSIM — 下方 tab
 */
import {
  planDetailsSummaryCard,
  productIntroSection,
  paragraph,
  bulletList,
  otherInfoBlock,
  dataTable,
  usageAdvantagesSection,
  faqAccordion,
} from "../../lib/productContentHtmlTemplate.js";

const link = (href, label) =>
  `<a href="${href}" style="color:#2D5BE3;font-weight:700;text-decoration:underline;">${label}</a>`;
const expiryOnUse = `一旦 eSIM 連接到支援的網路並開始產生數據流量，有效期限即開始。我們建議您在到達目的地後添加 eSIM。您也可以提前安裝 eSIM，<span class="jeko-sum-warn">但請記得安裝後立即將其關閉</span>，以避免有效期提前開始。`;
const delivery =
  "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。";
const voiceVoip =
  "不支持，只能透過應用程式（網路通話，即 VoIP）。";
const dealerNote =
  "此 eSIM 由當地運營商提供，jeko eSIM 作為授權通路銷售。數位商品退換依本站退換貨政策；發行運營商可能調整方案細節。感謝您的理解。";
const coverage =
  "雅加達、峇里島、日惹、泗水與印尼主要旅遊／商務城市。";

function compareBullets(items) {
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${items
    .map((t) => `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`)
    .join("")}</ul>`;
}

export function indonesiaCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>印尼吃到飽</strong>`,
        "Telkomsel／XL<br>新加坡 IP",
        "整天連線、島嶼間移動",
        `${compareBullets([
          "FUP 不限流量。",
          "雙網自動切換；支援熱點與 ChatGPT／TikTok。",
        ])}<div style="margin-top:8px;">${link("/product/indonesia/indonesia-unlimited-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>印尼每日／總量</strong>`,
        "Telkomsel／XL",
        "控管用量、輕量上網",
        `${compareBullets([
          "雙網自動切換；高速用完後約 128kbps。",
        ])}<div style="margin-top:8px;">${link("/product/indonesia/indonesia-daily-esim/", "每日型")} · ${link("/product/indonesia/indonesia-total-esim/", "總量型")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款印尼 eSIM 最適合您？</h4>${table}`;
}

function planCard(pairs) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: expiryOnUse },
  });
}

function basePairs({ carrierHtml, speedHtml, planTypeHtml, routeHtml }) {
  return [
    [
      { iconName: "cell_tower", label: "訊號覆蓋範圍", valueHtml: coverage },
      { iconName: "network_cell", label: "電信業者", valueHtml: carrierHtml },
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
      { iconName: "badge", label: "eKYC (身分驗證)", valueHtml: "不需要" },
      { iconName: "mail", label: "交付", valueHtml: delivery },
    ],
    [
      { iconName: "public", label: "數據路由", valueHtml: routeHtml },
      { iconName: "payments", label: "充值選項", valueHtml: "無" },
    ],
  ];
}

function otherActivate() {
  return otherInfoBlock([
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">建議抵達印尼覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);
}

function buildDetailed({
  carrierHtml,
  speedHtml,
  planTypeLabel,
  routeHtml,
  introParas,
  bullets,
}) {
  const planHtml = planCard(
    basePairs({
      carrierHtml,
      speedHtml,
      planTypeHtml: `僅數據流量・${planTypeLabel}`,
      routeHtml,
    }),
  );
  const introHtml = productIntroSection(`
    ${introParas.map((t) => paragraph(t, 16)).join("\n")}
    ${indonesiaCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(), introHtml].join("\n");
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export const ID_UNLIM_DETAILED = buildDetailed({
  carrierHtml: "Telkomsel／XL 4G／5G（雙網）",
  speedHtml: "4G／5G；不限流量吃到飽（FUP，實際依環境而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 印尼吃到飽，走 <strong>Telkomsel／XL</strong> 雙網，出網為<strong>新加坡 IP</strong>。",
    "FUP 不限流量。支援熱點與 ChatGPT／TikTok。僅數據。",
  ],
  bullets: [
    "運營商：Telkomsel／XL 雙網・新加坡 IP・4G／5G",
    "流量：吃到飽不限流量（FUP）",
    "支援熱點；支援 ChatGPT、TikTok",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const ID_DAILY_DETAILED = buildDetailed({
  carrierHtml: "Telkomsel／XL 4G／5G（雙網）",
  speedHtml: "4G／5G；每日高速用完後約 128kbps（每日重置）",
  planTypeLabel: "每日型",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 印尼每日型，走 <strong>Telkomsel／XL</strong> 雙網，適合控管每日用量。",
    "可選每日 500MB～3GB；用完後約 128kbps，隔日重置。",
  ],
  bullets: [
    "運營商：Telkomsel／XL 雙網・新加坡 IP",
    "流量：每日額度；用完後約 128kbps（每日重置）",
    "支援熱點；支援 ChatGPT、TikTok",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const ID_TOTAL_DETAILED = buildDetailed({
  carrierHtml: "Telkomsel／XL 4G／5G（雙網）",
  speedHtml: "4G／5G；總量高速用完後約 128kbps 可持續使用",
  planTypeLabel: "總量型",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 印尼總量型，走 <strong>Telkomsel／XL</strong> 雙網，於有效天數內共用固定總流量。",
    "可選 1GB～50GB；高速用完後約 128kbps 可持續使用。",
  ],
  bullets: [
    "運營商：Telkomsel／XL 雙網・新加坡 IP",
    "流量：總量高速；用完後約 128kbps 續航",
    "支援熱點；支援 ChatGPT、TikTok",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const ID_USAGE = usageAdvantagesSection({
  title: "使用 jeko 印尼 Telkomsel／XL eSIM 的優勢",
  subtitle: "雙網切換・雅加達／峇里島",
  items: [
    {
      iconName: "swap_horiz",
      title: "雙網自動切換",
      descHtml: "Telkomsel 與 XL 互補，島嶼間移動也較安心。",
    },
    {
      iconName: "speed",
      title: "吃到飽或控用量",
      descHtml: "吃到飽採 FUP；每日／總量高速用完後約 128kbps 續航。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可分享連線；支援 ChatGPT／TikTok。",
    },
    {
      iconName: "qr_code_2",
      title: "快速交付",
      descHtml: "付款後數分鐘內以 Email 寄送 QR Code。",
    },
    {
      iconName: "flight_land",
      title: "抵達再啟用",
      descHtml: "建議抵達印尼後再安裝／開啟行動數據。",
    },
  ],
});

function sharedFaq(name) {
  return [
    {
      question: `我的手機是否支援在印尼使用 eSIM？`,
      answerHtml: [
        p(`大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`),
        p(`亦請確認裝置已解鎖，且系統版本支援 eSIM。`, 0),
      ].join(""),
    },
    {
      question: `${name} 何時開始計算效期？`,
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達印尼後再啟用。`,
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

export const ID_FAQ_UNLIM = faqAccordion(
  [
    ...sharedFaq("印尼吃到飽 eSIM"),
    {
      question: "吃到飽會限速嗎？",
      answerHtml: p(
        `本方案為 FUP，不會固定鎖死某一 Mbps，但繁忙時段可能變慢。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const ID_FAQ_DAILY = faqAccordion(
  [
    ...sharedFaq("印尼每日型 eSIM"),
    {
      question: "每日額度用完會怎樣？",
      answerHtml: p(
        `高速用完後一般降速至約 <strong>128kbps</strong>，隔日重置。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const ID_FAQ_TOTAL = faqAccordion(
  [
    ...sharedFaq("印尼總量型 eSIM"),
    {
      question: "總量用完會怎樣？",
      answerHtml: p(
        `高速用完後一般降速至約 <strong>128kbps</strong> 可持續使用。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export default {
  ID_UNLIM_DETAILED,
  ID_DAILY_DETAILED,
  ID_TOTAL_DETAILED,
  ID_USAGE,
  ID_FAQ_UNLIM,
  ID_FAQ_DAILY,
  ID_FAQ_TOTAL,
};
