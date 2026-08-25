/**
 * 義大利 eSIM — 下方 tab
 * Medusa：italy-unlimited-esim（Iliad / TIM +｜Iliad / WindTre +）
 *         italy-daily-esim｜italy-total-esim（Iliad / TIM +）
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
  "羅馬、米蘭、佛羅倫斯、威尼斯、拿坡里等義大利主要城市與熱門觀光路線。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

export function italyCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>義大利吃到飽（Iliad／TIM＋）</strong>`,
        "法國 IP<br>約 10Mbps",
        "主流三網、熱門行程",
        `${compareBullets([
          "Iliad／TIM／WindTre；限速約 10Mbps 吃到飽。",
          "支援熱點與 ChatGPT／TikTok／Gemini。",
        ])}<div style="margin-top:8px;">${link("/product/italy/italy-unlimited-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>義大利吃到飽（Iliad／WindTre＋）</strong>`,
        "德國 IP<br>約 10Mbps",
        "都會數據用量",
        `${compareBullets([
          "Iliad／WindTre；限速約 10Mbps。",
          "德國 IP 漫遊。",
        ])}<div style="margin-top:8px;">${link("/product/italy/italy-unlimited-esim/", "切換電信商")}</div>`,
      ],
      [
        `<strong>義大利每日／總量</strong>`,
        "Iliad／TIM＋",
        "控管用量",
        `${compareBullets([
          "每日／總量高速用完後約 128kbps。",
        ])}<div style="margin-top:8px;">${link("/product/italy/italy-daily-esim/", "每日型")} · ${link("/product/italy/italy-total-esim/", "總量型")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款義大利 eSIM 最適合您？</h4>${table}`;
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
      html: `<span class="jeko-sum-warn">建議抵達義大利覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
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
    ${italyCompareTableSection()}
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
      question: `我的手機是否支援在義大利使用 eSIM？`,
      answerHtml: [
        p(`大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`),
        p(`亦請確認裝置已解鎖，且系統版本支援 eSIM。`, 0),
      ].join(""),
    },
    {
      question: `${productName} 何時開始計算效期？`,
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達義大利後再啟用。`,
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

export const IT_UNLIM_32_DETAILED = buildDetailed({
  carrierHtml: "Iliad／TIM／WindTre 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；限速約 10Mbps 吃到飽（實際依環境而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（法國 IP）",
  introParas: [
    "jeko eSIM 義大利吃到飽（約 10Mbps），走 <strong>Iliad／TIM＋</strong>，出網為<strong>法國 IP</strong>，適合羅馬、米蘭與主要城市觀光。",
    "方案限速約 10Mbps 吃到飽。支援熱點與 ChatGPT／TikTok／Gemini。僅數據、無門號／傳統通話／簡訊。",
  ],
  bullets: [
    "運營商：Iliad／TIM／WindTre・法國 IP・4G／LTE／5G",
    "流量：限速約 10Mbps 吃到飽",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const IT_UNLIM_41_DETAILED = buildDetailed({
  carrierHtml: "Iliad／WindTre 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；限速約 10Mbps 吃到飽（實際依環境而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（德國 IP）",
  introParas: [
    "jeko eSIM 義大利吃到飽（約 10Mbps），走 <strong>Iliad／WindTre＋</strong>，出網為<strong>德國 IP</strong>。",
    "方案限速約 10Mbps 吃到飽。支援熱點與 ChatGPT／TikTok／Gemini。僅數據、無門號／傳統通話／簡訊。",
  ],
  bullets: [
    "運營商：Iliad／WindTre・德國 IP・4G／LTE／5G",
    "流量：限速約 10Mbps 吃到飽",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const IT_DAILY_DETAILED = buildDetailed({
  carrierHtml: "Iliad／TIM／WindTre 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速用完後約 128kbps（每日重置，實際依環境而定）",
  planTypeLabel: "每日型",
  routeHtml: "漫遊（法國 IP）",
  introParas: [
    "jeko eSIM 義大利每日型，走 <strong>Iliad／TIM＋</strong>，適合想控管每日用量的旅客。",
    "可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps，隔日重置。支援熱點與常用 App。",
  ],
  bullets: [
    "運營商：Iliad／TIM／WindTre・法國 IP",
    "流量：可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const IT_TOTAL_DETAILED = buildDetailed({
  carrierHtml: "Iliad／TIM／WindTre 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；總量高速用完後約 128kbps 可持續使用（實際依環境而定）",
  planTypeLabel: "總量型",
  routeHtml: "漫遊（法國 IP）",
  introParas: [
    "jeko eSIM 義大利總量型，走 <strong>Iliad／TIM＋</strong>，於有效天數內共用固定總流量。",
    "可選 1GB～50GB；高速用完後約 128kbps 可持續使用。支援熱點與常用 App。",
  ],
  bullets: [
    "運營商：Iliad／TIM／WindTre・法國 IP",
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
    descHtml: "建議抵達義大利覆蓋範圍後再安裝／開啟行動數據。",
  },
];

export const IT_USAGE_32 = buildUsage({
  title: "使用 jeko 義大利 Iliad／TIM＋ eSIM 的優勢",
  subtitle: "三網・約 10Mbps／每日／總量",
  items: [
    {
      iconName: "cell_tower",
      title: "Iliad／TIM／WindTre",
      descHtml: "主要城市與觀光路線覆蓋穩定。",
    },
    {
      iconName: "speed",
      title: "吃到飽或控管用量",
      descHtml: "可選約 10Mbps 吃到飽，或每日／總量方案。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    ...usageCommon,
  ],
});

export const IT_USAGE_41 = buildUsage({
  title: "使用 jeko 義大利 Iliad／WindTre＋ eSIM 的優勢",
  subtitle: "約 10Mbps 吃到飽・德國 IP",
  items: [
    {
      iconName: "cell_tower",
      title: "Iliad／WindTre",
      descHtml: "都會區數據用量較靈活。",
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

export const IT_FAQ_32 = buildFaq([
  ...sharedFaq("義大利 Iliad／TIM＋ eSIM"),
  {
    question: "為什麼是約 10Mbps？",
    answerHtml: p(
      `本吃到飽方案為<strong>限速約 10Mbps</strong>，適合傳訊、導航與社群；高畫質影音會受上限影響。`,
      0,
    ),
  },
]);

export const IT_FAQ_41 = buildFaq([
  ...sharedFaq("義大利 Iliad／WindTre＋ eSIM"),
  {
    question: "和 Iliad／TIM＋ 差在哪？",
    answerHtml: p(
      `兩者皆為約 10Mbps 吃到飽；Iliad／TIM＋ 為法國 IP（三網），Iliad／WindTre＋ 為德國 IP。請依覆蓋與偏好選擇。`,
      0,
    ),
  },
]);

export const IT_FAQ_DAILY = buildFaq([
  ...sharedFaq("義大利每日型 eSIM"),
  {
    question: "每日額度用完會怎樣？",
    answerHtml: p(
      `高速用完後一般降速至約 <strong>128kbps</strong>，隔日重置後恢復高速額度。`,
      0,
    ),
  },
]);

export const IT_FAQ_TOTAL = buildFaq([
  ...sharedFaq("義大利總量型 eSIM"),
  {
    question: "總量用完會怎樣？",
    answerHtml: p(
      `高速用完後一般降速至約 <strong>128kbps</strong> 可持續使用。若需要整天高速，可改選吃到飽。`,
      0,
    ),
  },
]);

export default {
  IT_UNLIM_32_DETAILED,
  IT_UNLIM_41_DETAILED,
  IT_DAILY_DETAILED,
  IT_TOTAL_DETAILED,
  IT_USAGE_32,
  IT_USAGE_41,
  IT_FAQ_32,
  IT_FAQ_41,
  IT_FAQ_DAILY,
  IT_FAQ_TOTAL,
};
