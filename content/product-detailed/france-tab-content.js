/**
 * 法國 eSIM — 下方 tab（方案詳情／產品介紹／使用介紹／FAQ）
 * Medusa：france-unlimited-esim｜france-daily-esim｜france-total-esim
 * 電信選項：ORANGE +
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
  "巴黎、里昂、尼斯、馬賽等法國主要城市與熱門觀光／交通沿線。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

export function franceCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>法國吃到飽</strong>`,
        "ORANGE＋<br>波蘭 IP",
        "整天上網、自駕出差",
        `${compareBullets([
          "Orange／Bouygues／Free Mobile 4G／5G。",
          "吃到飽（FUP），可持續上網。",
          "支援熱點與 ChatGPT／TikTok／Gemini。",
        ])}<div style="margin-top:8px;">${link("/product/france/france-unlimited-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>法國每日型</strong>`,
        "ORANGE＋",
        "控管每日用量",
        `${compareBullets([
          "可選每日 500MB／1GB／2GB／3GB。",
          "高速用完後約 128kbps（每日重置）。",
        ])}<div style="margin-top:8px;">${link("/product/france/france-daily-esim/", "查看每日型")}</div>`,
      ],
      [
        `<strong>法國總量型</strong>`,
        "ORANGE＋",
        "固定總流量",
        `${compareBullets([
          "可選 1GB～50GB；高速用完後約 128kbps 續航。",
          "英國／波蘭 IP 漫遊。",
        ])}<div style="margin-top:8px;">${link("/product/france/france-total-esim/", "查看總量型")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款法國 eSIM 最適合您？</h4>${table}`;
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
      html: `<span class="jeko-sum-warn">建議抵達法國覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
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
    ${franceCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(), introHtml].join("\n");
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

function buildUsage({ title, subtitle, items }) {
  return usageAdvantagesSection({ title, subtitle, items });
}

function buildFaq(items) {
  return faqAccordion(items, { defaultOpenIndex: 0 });
}

function sharedFaq(productName) {
  return [
    {
      question: `我的手機是否支援在法國使用 eSIM？`,
      answerHtml: [
        p(
          `大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`,
        ),
        p(
          `亦請確認裝置已解鎖（非電信綁定），且系統版本支援 eSIM。購買前可於本站查詢相容裝置清單。`,
          0,
        ),
      ].join(""),
    },
    {
      question: `${productName} 何時開始計算效期？`,
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達法國後再啟用；若提前安裝，請關閉該 eSIM 的行動數據。`,
        0,
      ),
    },
    {
      question: "如何安裝？",
      answerHtml: p(
        `付款完成後，系統會以 Email 寄送 QR Code 與安裝說明。於設定中選擇「加入行動方案」掃描即可；多數裝置 APN 會自動帶入。`,
        0,
      ),
    },
    {
      question: "可以退換貨嗎？",
      answerHtml: p(
        `數位商品一經寄送 QR／啟用資料後，原則上不可退換；實際依本站退換貨政策與個別方案標示為準。`,
        0,
      ),
    },
    {
      question: "可以用熱點嗎？",
      answerHtml: p(
        `可以，支援熱點分享；實際速度與額度依所選方案而定。`,
        0,
      ),
    },
  ];
}

export const FR_UNLIM_DETAILED = buildDetailed({
  carrierHtml: "Orange／Bouygues／Free Mobile 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；吃到飽不限流量（FUP，實際速度依環境與擁塞而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（波蘭 IP）",
  introParas: [
    "jeko eSIM 法國吃到飽方案，走 <strong>ORANGE＋</strong>（Orange／Bouygues／Free Mobile），出網為<strong>波蘭 IP</strong>，適合巴黎與主要城市觀光、自駕與出差。",
    "公平使用政策（FUP）下可持續上網。支援熱點與 ChatGPT／TikTok／Gemini。僅數據、無門號／傳統通話／簡訊。",
  ],
  bullets: [
    "運營商：Orange／Bouygues／Free・波蘭 IP・4G／LTE／5G",
    "流量：吃到飽不限流量（FUP）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
    "建議抵達法國覆蓋範圍後再安裝／啟用",
  ],
});

export const FR_DAILY_DETAILED = buildDetailed({
  carrierHtml: "Orange／Bouygues 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速用完後約 128kbps（每日重置，實際依環境而定）",
  planTypeLabel: "每日型",
  routeHtml: "漫遊（波蘭 IP）",
  introParas: [
    "jeko eSIM 法國每日型，走 <strong>ORANGE＋</strong>，適合行程天數固定、想控管每日用量的旅客。",
    "可選每日 500MB／1GB／2GB／3GB；用完後一般降速至約 128kbps，隔日重置。支援熱點與常用 App。",
  ],
  bullets: [
    "運營商：Orange／Bouygues・波蘭 IP",
    "流量：可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const FR_TOTAL_DETAILED = buildDetailed({
  carrierHtml: "Orange／Bouygues 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；總量高速用完後約 128kbps 可持續使用（實際依環境而定）",
  planTypeLabel: "總量型",
  routeHtml: "漫遊（英國／波蘭 IP）",
  introParas: [
    "jeko eSIM 法國總量型，走 <strong>ORANGE＋</strong>，出網為<strong>英國／波蘭 IP</strong>，於有效天數內共用固定總流量。",
    "可選 1GB／3GB／5GB／10GB／20GB／30GB／50GB；高速用完後約 128kbps 可持續使用。支援熱點與常用 App。",
  ],
  bullets: [
    "運營商：Orange／Bouygues・英國／波蘭 IP",
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
    descHtml: "建議抵達法國覆蓋範圍後再安裝／開啟行動數據。",
  },
];

export const FR_USAGE = buildUsage({
  title: "使用 jeko 法國 ORANGE＋ eSIM 的優勢",
  subtitle: "Orange／Bouygues／Free・熱點與 App",
  items: [
    {
      iconName: "cell_tower",
      title: "法國主流網路",
      descHtml: "Orange、Bouygues、Free Mobile，巴黎與主要城市較穩。",
    },
    {
      iconName: "speed",
      title: "吃到飽／每日／總量可選",
      descHtml: "依行程選 FUP 吃到飽，或控管每日／總量用量。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    ...usageCommon,
  ],
});

export const FR_FAQ_UNLIM = buildFaq([
  ...sharedFaq("法國吃到飽 eSIM"),
  {
    question: "吃到飽會限速嗎？",
    answerHtml: p(
      `本方案為 FUP 吃到飽，不會固定鎖死某一 Mbps，但繁忙時段可能變慢。導航、傳訊通常沒問題。`,
      0,
    ),
  },
]);

export const FR_FAQ_DAILY = buildFaq([
  ...sharedFaq("法國每日型 eSIM"),
  {
    question: "每日額度用完會怎樣？",
    answerHtml: p(
      `高速用完後一般降速至約 <strong>128kbps</strong>，隔日重置後恢復高速額度。`,
      0,
    ),
  },
]);

export const FR_FAQ_TOTAL = buildFaq([
  ...sharedFaq("法國總量型 eSIM"),
  {
    question: "總量用完會怎樣？",
    answerHtml: p(
      `高速用完後一般降速至約 <strong>128kbps</strong> 可持續使用（非斷網）。若需要整天高速，可改選吃到飽。`,
      0,
    ),
  },
]);

export default {
  FR_UNLIM_DETAILED,
  FR_DAILY_DETAILED,
  FR_TOTAL_DETAILED,
  FR_USAGE,
  FR_FAQ_UNLIM,
  FR_FAQ_DAILY,
  FR_FAQ_TOTAL,
};
