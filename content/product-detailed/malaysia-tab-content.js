/**
 * 馬來西亞 eSIM — 下方 tab 內容（方案詳情／產品介紹／使用介紹／FAQ）
 * 規則：jeko 品牌、方案詳情卡、方案重點、比較表（黑點無 emoji）、不展示 API／SKU
 *
 * API 對齊（test-list）：
 *   UMobile 5G 當地 → MY:UMobile · ip MY · apn my3g
 *     unlimited: unlimited 10mbps；daily: 多為 128kbps；total: terminate（用完斷網）
 *   Maxis / Celcom / Digi → MY:Maxis,Celcom,Digi · ip SG · apn e-ideas
 *     unlimited: unlimited 10mbps；daily: 多為 128kbps；total: 多為 128kbps
 *
 * Medusa 選項值：
 *   UMobile 5G 當地 | Maxis / Celcom / Digi
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

const coverage =
  "吉隆坡、檳城、蘭卡威、柔佛、沙巴、砂拉越等馬來西亞主要城市及旅遊景點。";

const delivery =
  "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。";

const voiceVoip =
  "不支持，只能透過應用程式（網路通話，即 VoIP）。";

const dealerNote =
  "此 eSIM 由當地運營商提供，jeko eSIM 作為授權通路銷售。數位商品退換依本站退換貨政策；發行運營商可能調整方案細節。感謝您的理解。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

/** 哪款馬來西亞 eSIM 最適合您？ */
export function malaysiaCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>馬來西亞 eSIM UMobile 5G 當地</strong>`,
        "UMobile<br>馬來西亞 IP",
        "要原生 IP<br>接近在地體驗",
        `${compareBullets([
          "馬來西亞原生 IP（APN my3g），延遲與連線接近在地用戶。",
          "吃到飽：每日約 1GB 高速後約 10Mbps；每日型用完後約 128kbps；總量型高速用完後斷網。",
          "支援熱點與 ChatGPT／TikTok／Gemini。",
          "效期為抵達連網使用後開始計算。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/malaysia/malaysia-unlimited-esim/", "吃到飽")}、${link("/product/malaysia/malaysia-daily-esim/", "每日型")}、${link("/product/malaysia/malaysia-total-esim/", "總量型")}。</div>`,
      ],
      [
        `<strong>馬來西亞 eSIM Maxis／Celcom／Digi</strong>`,
        "三網自動切換<br>新加坡 IP",
        "跨州移動<br>要覆蓋互補",
        `${compareBullets([
          "Maxis、Celcom、Digi 三網自動切換，減少單一電信死角。",
          "新加坡 IP 漫遊（APN e-ideas）；吃到飽約 10Mbps；每日／總量多數用完後約 128kbps。",
          "支援熱點與 ChatGPT／TikTok／Gemini。",
          "效期為抵達連網使用後開始計算。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/malaysia/malaysia-unlimited-esim/", "吃到飽")}、${link("/product/malaysia/malaysia-daily-esim/", "每日型")}、${link("/product/malaysia/malaysia-total-esim/", "總量型")} 切換電信商。</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款馬來西亞 eSIM 最適合您？</h4>${table}`;
}

function planCard(pairs) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: expiryOnUse },
  });
}

function basePairs({
  carrierHtml,
  speedHtml,
  planTypeHtml,
  routeHtml,
  hotspotHtml = "支持",
}) {
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
        valueHtml: hotspotHtml,
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
      html: `<span class="jeko-sum-warn">建議抵達馬來西亞覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
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
    ${malaysiaCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(), introHtml].join("\n");
}

/** UMobile 吃到飽 */
export const MY_UNLIMITED_UMOBILE_DETAILED = buildDetailed({
  carrierHtml: "UMobile 5G（馬來西亞本地）4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日約 1GB 高速後維持約 10Mbps 吃到飽（實際速度依環境而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "本地（馬來西亞 IP）",
  introParas: [
    "jeko eSIM 馬來西亞吃到飽方案，走 <strong>UMobile 5G 當地</strong>網路，出網為<strong>馬來西亞原生 IP</strong>，適合想接近在地連線體驗的旅客。",
    "每日約 1GB 高速後維持約 10Mbps 無限流量，適合整天導航、Grab、傳訊與社群。支援熱點與 ChatGPT／TikTok／Gemini。",
    "僅數據、無門號／傳統通話／簡訊。若您需要三網自動切換，可改選同商品的 Maxis／Celcom／Digi。",
  ],
  bullets: [
    "運營商：UMobile 5G 當地・馬來西亞 IP・4G／LTE／5G",
    "流量：每日約 1GB 高速後約 10Mbps 吃到飽",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
    "建議抵達馬來西亞覆蓋範圍後再安裝／啟用",
  ],
});

/** Maxis/Celcom/Digi 吃到飽 */
export const MY_UNLIMITED_DUAL_DETAILED = buildDetailed({
  carrierHtml: "Maxis／Celcom／Digi（三網自動切換）4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日約 1GB 高速後維持約 10Mbps 吃到飽（實際速度依環境而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 馬來西亞吃到飽方案，走 <strong>Maxis／Celcom／Digi</strong> 三網自動切換，出網為<strong>新加坡 IP</strong>，適合跨州移動、想減少覆蓋死角的旅客。",
    "每日約 1GB 高速後維持約 10Mbps 無限流量。支援熱點與 ChatGPT／TikTok／Gemini；多數裝置 APN（e-ideas）自動帶入。",
    "僅數據、無門號／傳統通話／簡訊。若您偏好馬來西亞原生 IP，可改選同商品的 UMobile 5G 當地。",
  ],
  bullets: [
    "運營商：Maxis／Celcom／Digi 三網・新加坡 IP・4G／LTE／5G",
    "流量：每日約 1GB 高速後約 10Mbps 吃到飽",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
    "建議抵達馬來西亞覆蓋範圍後再安裝／啟用",
  ],
});

/** UMobile 每日 */
export const MY_DAILY_UMOBILE_DETAILED = buildDetailed({
  carrierHtml: "UMobile 5G（馬來西亞本地）4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速用完後約 128kbps（每日重置，實際依環境而定）",
  planTypeLabel: "每日型",
  routeHtml: "本地（馬來西亞 IP）",
  introParas: [
    "jeko eSIM 馬來西亞每日型，走 <strong>UMobile 5G 當地</strong>，出網為<strong>馬來西亞原生 IP</strong>，適合行程天數固定、想控管每日用量的旅客。",
    "可選每日 500MB／1GB／2GB／3GB 高速額度；用完後一般降速至約 128kbps，隔日重置。支援熱點與常用 App。",
  ],
  bullets: [
    "運營商：UMobile 5G 當地・馬來西亞 IP",
    "流量：可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

/** Dual 每日 */
export const MY_DAILY_DUAL_DETAILED = buildDetailed({
  carrierHtml: "Maxis／Celcom／Digi（三網自動切換）4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速用完後約 128kbps（每日重置；部分方案約 5Mbps 續航）",
  planTypeLabel: "每日型",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 馬來西亞每日型，走 <strong>Maxis／Celcom／Digi</strong> 三網，出網為<strong>新加坡 IP</strong>，適合跨州移動與預算控管。",
    "可選每日高速額度；多數方案用完後約 128kbps（每日重置）。支援熱點與常用 App。",
  ],
  bullets: [
    "運營商：Maxis／Celcom／Digi 三網・新加坡 IP",
    "流量：每日高速額度；多數用完後約 128kbps（每日重置）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

/** UMobile 總量 — terminate */
export const MY_TOTAL_UMOBILE_DETAILED = buildDetailed({
  carrierHtml: "UMobile 5G（馬來西亞本地）4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；總量高速額度內全速；<span class=\"jeko-sum-warn\">用完後斷網</span>（請預留用量）",
  planTypeLabel: "總量型",
  routeHtml: "本地（馬來西亞 IP）",
  introParas: [
    "jeko eSIM 馬來西亞總量型，走 <strong>UMobile 5G 當地</strong>，出網為<strong>馬來西亞原生 IP</strong>。於有效天數內共用固定總流量。",
    `<span class="jeko-sum-warn">注意：本 UMobile 總量方案高速用完後會斷網</span>，無法以降速續航，請依行程預估用量或改選吃到飽／每日型。支援熱點與常用 App。`,
  ],
  bullets: [
    "運營商：UMobile 5G 當地・馬來西亞 IP",
    "流量：總量高速；用完後斷網（非 128kbps 續航）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

/** Dual 總量 — mostly 128kbps */
export const MY_TOTAL_DUAL_DETAILED = buildDetailed({
  carrierHtml: "Maxis／Celcom／Digi（三網自動切換）4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；總量高速用完後多數約 128kbps 可持續使用（實際依方案與環境而定）",
  planTypeLabel: "總量型",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 馬來西亞總量型，走 <strong>Maxis／Celcom／Digi</strong> 三網，出網為<strong>新加坡 IP</strong>，於有效天數內共用固定總流量。",
    "多數方案高速用完後約 128kbps 可持續使用；請預留流量緩衝。支援熱點與常用 App。",
  ],
  bullets: [
    "運營商：Maxis／Celcom／Digi 三網・新加坡 IP",
    "流量：總量高速；多數用完後約 128kbps 續航",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export function buildMyUsage({ title, subtitle, items }) {
  return usageAdvantagesSection({ title, subtitle, items });
}

export function buildMyFaq(items) {
  return faqAccordion(items, { defaultOpenIndex: 0 });
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export function malaysiaSharedFaqItems(productName = "馬來西亞 eSIM") {
  return [
    {
      question: `我的手機是否支援在馬來西亞使用 eSIM？`,
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
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達馬來西亞後再啟用；若提前安裝，請關閉該 eSIM 的行動數據。`,
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
  ];
}

const usageCommon = [
  {
    iconName: "qr_code_2",
    title: "快速交付",
    descHtml: "付款後數分鐘內以 Email 寄送 QR Code。",
  },
  {
    iconName: "flight_land",
    title: "抵達再啟用",
    descHtml: "建議抵達馬來西亞覆蓋範圍後再安裝／開啟行動數據。",
  },
];

export const MY_USAGE_UMOBILE = buildMyUsage({
  title: "使用 jeko 馬來西亞 UMobile eSIM 的優勢",
  subtitle: "原生 IP・5G／4G・熱點與 App",
  items: [
    {
      iconName: "public",
      title: "馬來西亞原生 IP",
      descHtml: "連線接近在地用戶，適合地圖、Grab 與本地 App。",
    },
    {
      iconName: "speed",
      title: "UMobile 5G／4G",
      descHtml: "都會區與主要旅遊城市覆蓋穩定。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    ...usageCommon,
  ],
});

export const MY_USAGE_DUAL = buildMyUsage({
  title: "使用 jeko 馬來西亞三網 eSIM 的優勢",
  subtitle: "Maxis／Celcom／Digi・覆蓋互補",
  items: [
    {
      iconName: "swap_horiz",
      title: "三網自動切換",
      descHtml: "Maxis、Celcom、Digi 互補，跨州移動較安心。",
    },
    {
      iconName: "public",
      title: "新加坡 IP 漫遊",
      descHtml: "APN 多為自動（e-ideas）；社群一般可正常使用。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    ...usageCommon,
  ],
});

export const MY_FAQ_UMOBILE = buildMyFaq([
  ...malaysiaSharedFaqItems("馬來西亞 UMobile eSIM"),
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
  {
    question: "總量型用完會怎樣？",
    answerHtml: p(
      `UMobile 總量型高速用完後會<strong>斷網</strong>（非降速續航）。若需要用完仍可上網，請改選吃到飽或每日型，或改選 Maxis／Celcom／Digi 總量型（多數為約 128kbps 續航）。`,
      0,
    ),
  },
  {
    question: "和三網方案差在哪？",
    answerHtml: p(
      `UMobile 為馬來西亞原生 IP；Maxis／Celcom／Digi 為三網切換、新加坡 IP 漫遊。請依是否需要原生 IP 與覆蓋互補來選擇。`,
      0,
    ),
  },
]);

export const MY_FAQ_DUAL = buildMyFaq([
  ...malaysiaSharedFaqItems("馬來西亞 Maxis／Celcom／Digi eSIM"),
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
  {
    question: "為什麼是新加坡 IP？",
    answerHtml: p(
      `本三網方案為漫遊線路，出網為新加坡 IP；一般社群／影音可正常使用。若您需要馬來西亞原生 IP，請改選 UMobile 5G 當地。`,
      0,
    ),
  },
  {
    question: "高速用完會怎樣？",
    answerHtml: p(
      `吃到飽：每日約 1GB 高速後約 10Mbps。每日型：多數約 128kbps、每日重置。總量型：多數約 128kbps 可持續使用（少數方案可能不同，請以方案標示為準）。`,
      0,
    ),
  },
]);
