/**
 * 西班牙 eSIM — 下方 tab
 * Medusa：spain-unlimited-esim（Movistar +）｜spain-daily-esim（Orange +）｜spain-total-esim（Orange / Movistar +）
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
  "馬德里、巴塞隆納、塞維亞、瓦倫西亞等西班牙主要城市與海岸／觀光路線。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

export function spainCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>西班牙吃到飽</strong>`,
        "Movistar＋<br>法國 IP",
        "傳訊導航、整天連線",
        `${compareBullets([
          "限速約 10Mbps 吃到飽。",
          "支援熱點與 ChatGPT／TikTok／Gemini。",
        ])}<div style="margin-top:8px;">${link("/product/spain/spain-unlimited-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>西班牙每日型</strong>`,
        "Orange＋",
        "控管每日用量",
        `${compareBullets([
          "可選每日 500MB／1GB／2GB／3GB。",
          "高速用完後約 128kbps；支援 TikTok／Gemini。",
        ])}<div style="margin-top:8px;">${link("/product/spain/spain-daily-esim/", "查看每日型")}</div>`,
      ],
      [
        `<strong>西班牙總量型</strong>`,
        "Orange／Movistar＋",
        "固定總流量",
        `${compareBullets([
          "可選 1GB～50GB；高速用完後約 128kbps。",
          "雙網覆蓋；法國 IP。",
        ])}<div style="margin-top:8px;">${link("/product/spain/spain-total-esim/", "查看總量型")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款西班牙 eSIM 最適合您？</h4>${table}`;
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
      html: `<span class="jeko-sum-warn">建議抵達西班牙覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
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
    ${spainCompareTableSection()}
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
      question: `我的手機是否支援在西班牙使用 eSIM？`,
      answerHtml: [
        p(`大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`),
        p(`亦請確認裝置已解鎖，且系統版本支援 eSIM。`, 0),
      ].join(""),
    },
    {
      question: `${productName} 何時開始計算效期？`,
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達西班牙後再啟用。`,
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

export const ES_UNLIM_DETAILED = buildDetailed({
  carrierHtml: "Movistar 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；限速約 10Mbps 吃到飽（實際依環境而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（法國 IP）",
  introParas: [
    "jeko eSIM 西班牙吃到飽方案，走 <strong>Movistar＋</strong>，出網為<strong>法國 IP</strong>，適合馬德里、巴塞隆納與主要城市觀光。",
    "方案限速約 10Mbps 吃到飽，適合傳訊、導航與社群。支援熱點與 ChatGPT／TikTok／Gemini。僅數據、無門號／傳統通話／簡訊。",
  ],
  bullets: [
    "運營商：Movistar・法國 IP・4G／LTE／5G",
    "流量：限速約 10Mbps 吃到飽",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const ES_DAILY_DETAILED = buildDetailed({
  carrierHtml: "Orange 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速用完後約 128kbps（每日重置，實際依環境而定）",
  planTypeLabel: "每日型",
  routeHtml: "漫遊（法國 IP）",
  introParas: [
    "jeko eSIM 西班牙每日型，走 <strong>Orange＋</strong>，適合想控管每日用量的旅客。",
    "可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps，隔日重置。支援熱點與 TikTok／Gemini。",
  ],
  bullets: [
    "運營商：Orange・法國 IP",
    "流量：可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）",
    "支援熱點；支援 TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const ES_TOTAL_DETAILED = buildDetailed({
  carrierHtml: "Orange／Movistar 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；總量高速用完後約 128kbps 可持續使用（實際依環境而定）",
  planTypeLabel: "總量型",
  routeHtml: "漫遊（法國 IP）",
  introParas: [
    "jeko eSIM 西班牙總量型，走 <strong>Orange／Movistar＋</strong>，於有效天數內共用固定總流量。",
    "可選 1GB～50GB；高速用完後約 128kbps 可持續使用。支援熱點與 ChatGPT／TikTok／Gemini。",
  ],
  bullets: [
    "運營商：Orange／Movistar・法國 IP",
    "流量：總量高速；用完後約 128kbps 續航",
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
    descHtml: "建議抵達西班牙覆蓋範圍後再安裝／開啟行動數據。",
  },
];

export const ES_USAGE_UNLIM = buildUsage({
  title: "使用 jeko 西班牙 Movistar＋ eSIM 的優勢",
  subtitle: "約 10Mbps 吃到飽・熱點與 App",
  items: [
    {
      iconName: "cell_tower",
      title: "Movistar 覆蓋",
      descHtml: "西班牙覆蓋最廣的傳統電信之一，熱門城市較穩。",
    },
    {
      iconName: "speed",
      title: "約 10Mbps 吃到飽",
      descHtml: "適合導航、傳訊與社群；高畫質影音會受上限影響。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    ...usageCommon,
  ],
});

export const ES_USAGE_DAILY = buildUsage({
  title: "使用 jeko 西班牙 Orange＋ 每日型的優勢",
  subtitle: "每日額度・用量可控",
  items: [
    {
      iconName: "cell_tower",
      title: "Orange 網路",
      descHtml: "馬德里與主要城市覆蓋穩定。",
    },
    {
      iconName: "timelapse",
      title: "每日重置",
      descHtml: "高速用完後約 128kbps，隔日恢復每日額度。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可分享連線；支援 TikTok／Gemini。",
    },
    ...usageCommon,
  ],
});

export const ES_USAGE_TOTAL = buildUsage({
  title: "使用 jeko 西班牙 Orange／Movistar＋ 總量型的優勢",
  subtitle: "雙網・固定總流量",
  items: [
    {
      iconName: "swap_horiz",
      title: "Orange／Movistar",
      descHtml: "雙網覆蓋主要城市與觀光路線。",
    },
    {
      iconName: "speed",
      title: "用完約 128kbps 續航",
      descHtml: "高速用完後仍可持續傳訊與輕量上網。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    ...usageCommon,
  ],
});

export const ES_FAQ_UNLIM = buildFaq([
  ...sharedFaq("西班牙吃到飽 eSIM"),
  {
    question: "為什麼是約 10Mbps？",
    answerHtml: p(
      `本方案為<strong>限速約 10Mbps</strong>吃到飽，適合傳訊、導航與社群；高畫質影音與多人熱點會變慢。`,
      0,
    ),
  },
]);

export const ES_FAQ_DAILY = buildFaq([
  ...sharedFaq("西班牙每日型 eSIM"),
  {
    question: "每日額度用完會怎樣？",
    answerHtml: p(
      `高速用完後一般降速至約 <strong>128kbps</strong>，隔日重置後恢復高速額度。`,
      0,
    ),
  },
]);

export const ES_FAQ_TOTAL = buildFaq([
  ...sharedFaq("西班牙總量型 eSIM"),
  {
    question: "總量用完會怎樣？",
    answerHtml: p(
      `高速用完後一般降速至約 <strong>128kbps</strong> 可持續使用。若需要整天高速，可改選吃到飽。`,
      0,
    ),
  },
]);

export default {
  ES_UNLIM_DETAILED,
  ES_DAILY_DETAILED,
  ES_TOTAL_DETAILED,
  ES_USAGE_UNLIM,
  ES_USAGE_DAILY,
  ES_USAGE_TOTAL,
  ES_FAQ_UNLIM,
  ES_FAQ_DAILY,
  ES_FAQ_TOTAL,
};
