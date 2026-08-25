/**
 * 英國 eSIM — 下方 tab（方案詳情／產品介紹／使用介紹／FAQ）
 * Medusa：uk-unlimited-esim（EE +｜EE / Three +）｜uk-daily-esim｜uk-total-esim
 * 前台單國頁勿寫歐包國數
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
  "倫敦、曼徹斯特、愛丁堡、伯明罕、湖區等英國主要城市與熱門觀光／交通沿線。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

export function ukCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>英國吃到飽（FUP）</strong>`,
        "EE／Three＋<br>波蘭 IP",
        "整天高速、自駕出差",
        `${compareBullets([
          "EE／Three／Vodafone／O2；FUP 不限流量。",
          "支援熱點與 ChatGPT／TikTok／Gemini。",
        ])}<div style="margin-top:8px;">${link("/product/uk/uk-unlimited-esim/", "查看吃到飽")}（選 EE／Three＋）</div>`,
      ],
      [
        `<strong>英國吃到飽（約 10Mbps）</strong>`,
        "EE＋<br>香港 IP",
        "傳訊導航為主",
        `${compareBullets([
          "限速約 10Mbps 吃到飽。",
          "支援熱點與常用 App。",
        ])}<div style="margin-top:8px;">${link("/product/uk/uk-unlimited-esim/", "查看吃到飽")}（選 EE＋）</div>`,
      ],
      [
        `<strong>英國每日／總量</strong>`,
        "EE／Three＋",
        "控管用量",
        `${compareBullets([
          "每日：用完後約 512kbps（每日重置）。",
          "總量：高速用完後斷網，請預留用量。",
        ])}<div style="margin-top:8px;">${link("/product/uk/uk-daily-esim/", "每日型")} · ${link("/product/uk/uk-total-esim/", "總量型")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款英國 eSIM 最適合您？</h4>${table}`;
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
      { iconName: "public", label: "數據路由", valueHtml: routeHtml },
      { iconName: "payments", label: "充值選項", valueHtml: "無" },
    ],
  ];
}

function otherActivate() {
  return otherInfoBlock([
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">建議抵達英國覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
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
    ${ukCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(), introHtml].join("\n");
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;
const buildUsage = (o) => usageAdvantagesSection(o);
const buildFaq = (items) => faqAccordion(items, { defaultOpenIndex: 0 });

function sharedFaq(productName) {
  return [
    {
      question: `我的手機是否支援在英國使用 eSIM？`,
      answerHtml: [
        p(
          `大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`,
        ),
        p(`亦請確認裝置已解鎖，且系統版本支援 eSIM。`, 0),
      ].join(""),
    },
    {
      question: `${productName} 何時開始計算效期？`,
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達英國後再啟用。`,
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

export const UK_UNLIM_34_DETAILED = buildDetailed({
  carrierHtml: "EE／Three／Vodafone／O2 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；吃到飽不限流量（FUP，實際速度依環境與擁塞而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（波蘭 IP）",
  introParas: [
    "jeko eSIM 英國吃到飽（FUP），走 <strong>EE／Three＋</strong>，出網為<strong>波蘭 IP</strong>，適合倫敦與主要城市觀光、自駕與出差。",
    "公平使用政策下可持續上網。支援熱點與 ChatGPT／TikTok／Gemini。僅數據、無門號／傳統通話／簡訊。",
  ],
  bullets: [
    "運營商：EE／Three／Vodafone／O2・波蘭 IP・4G／LTE／5G",
    "流量：吃到飽不限流量（FUP）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const UK_UNLIM_36_DETAILED = buildDetailed({
  carrierHtml: "EE／Three／Vodafone／O2 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；限速約 10Mbps 吃到飽（實際依環境而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（香港 IP）",
  introParas: [
    "jeko eSIM 英國吃到飽（約 10Mbps），走 <strong>EE＋</strong>，出網為<strong>香港 IP</strong>，適合傳訊、導航與社群為主的行程。",
    "方案限速約 10Mbps 吃到飽。支援熱點與 ChatGPT／TikTok／Gemini。僅數據、無門號／傳統通話／簡訊。",
  ],
  bullets: [
    "運營商：EE／Three／Vodafone／O2・香港 IP・4G／LTE／5G",
    "流量：限速約 10Mbps 吃到飽",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const UK_DAILY_DETAILED = buildDetailed({
  carrierHtml: "EE／Three／Vodafone／O2 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速用完後約 512kbps（每日重置，實際依環境而定）",
  planTypeLabel: "每日型",
  routeHtml: "漫遊（波蘭 IP）",
  introParas: [
    "jeko eSIM 英國每日型，走 <strong>EE／Three＋</strong>，適合想控管每日用量的旅客。",
    "可選每日 500MB／1GB／2GB／3GB；用完後約 512kbps，隔日重置。支援熱點與常用 App。",
  ],
  bullets: [
    "運營商：EE／Three／Vodafone／O2・波蘭 IP",
    "流量：可選每日 500MB／1GB／2GB／3GB；用完後約 512kbps（每日重置）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const UK_TOTAL_DETAILED = buildDetailed({
  carrierHtml: "EE／Three／Vodafone／O2 4G／LTE／5G",
  speedHtml:
    '4G／LTE／5G；總量高速額度內全速；<span class="jeko-sum-warn">用完後斷網</span>（請預留用量）',
  planTypeLabel: "總量型",
  routeHtml: "漫遊（波蘭 IP）",
  introParas: [
    "jeko eSIM 英國總量型，走 <strong>EE／Three＋</strong>，於有效天數內共用固定總流量。",
    `<span class="jeko-sum-warn">注意：本總量方案高速用完後會斷網</span>，無法以降速續航，請依行程預估用量或改選吃到飽／每日型。`,
  ],
  bullets: [
    "運營商：EE／Three／Vodafone／O2・波蘭 IP",
    "流量：總量高速；用完後斷網",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

const usageCommon = [
  {
    iconName: "qr_code_2",
    title: "快速交付",
    descHtml: "付款後數分鐘內以 Email 寄送 QR Code。",
  },
  {
    iconName: "flight_land",
    title: "抵達再啟用",
    descHtml: "建議抵達英國覆蓋範圍後再安裝／開啟行動數據。",
  },
];

export const UK_USAGE_34 = buildUsage({
  title: "使用 jeko 英國 EE／Three＋ eSIM 的優勢",
  subtitle: "四大電信・FUP／每日／總量",
  items: [
    {
      iconName: "cell_tower",
      title: "EE／Three／Vodafone／O2",
      descHtml: "英國四大主流電信，倫敦與主要城市較穩。",
    },
    {
      iconName: "speed",
      title: "吃到飽或控管用量",
      descHtml: "可選 FUP 吃到飽，或每日／總量方案。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    ...usageCommon,
  ],
});

export const UK_USAGE_36 = buildUsage({
  title: "使用 jeko 英國 EE＋ eSIM 的優勢",
  subtitle: "約 10Mbps 吃到飽",
  items: [
    {
      iconName: "cell_tower",
      title: "英國主流網路",
      descHtml: "EE／Three／Vodafone／O2，都會區覆蓋穩定。",
    },
    {
      iconName: "speed",
      title: "約 10Mbps 吃到飽",
      descHtml: "適合導航、傳訊與社群。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    ...usageCommon,
  ],
});

export const UK_FAQ_34 = buildFaq([
  ...sharedFaq("英國 EE／Three＋ eSIM"),
  {
    question: "總量型用完會怎樣？",
    answerHtml: p(
      `英國總量型高速用完後會<strong>斷網</strong>。若需要用完仍可上網，請改選吃到飽或每日型。`,
      0,
    ),
  },
  {
    question: "和 EE＋（約 10Mbps）差在哪？",
    answerHtml: p(
      `EE／Three＋ 為 FUP 不限流量（及每日／總量）；EE＋ 為限速約 10Mbps 吃到飽。請依用量與預算選擇。`,
      0,
    ),
  },
]);

export const UK_FAQ_36 = buildFaq([
  ...sharedFaq("英國 EE＋ eSIM"),
  {
    question: "為什麼是約 10Mbps？",
    answerHtml: p(
      `本方案為<strong>限速約 10Mbps</strong>吃到飽，適合傳訊、導航與社群；高畫質影音會受上限影響。`,
      0,
    ),
  },
]);

export const UK_FAQ_DAILY = buildFaq([
  ...sharedFaq("英國每日型 eSIM"),
  {
    question: "每日額度用完會怎樣？",
    answerHtml: p(
      `高速用完後一般降速至約 <strong>512kbps</strong>，隔日重置後恢復高速額度。`,
      0,
    ),
  },
]);

export const UK_FAQ_TOTAL = buildFaq([
  ...sharedFaq("英國總量型 eSIM"),
  {
    question: "總量用完會怎樣？",
    answerHtml: p(
      `高速用完後會<strong>斷網</strong>（非降速續航）。請預留用量，或改選吃到飽／每日型。`,
      0,
    ),
  },
]);

export default {
  UK_UNLIM_34_DETAILED,
  UK_UNLIM_36_DETAILED,
  UK_DAILY_DETAILED,
  UK_TOTAL_DETAILED,
  UK_USAGE_34,
  UK_USAGE_36,
  UK_FAQ_34,
  UK_FAQ_36,
  UK_FAQ_DAILY,
  UK_FAQ_TOTAL,
};
