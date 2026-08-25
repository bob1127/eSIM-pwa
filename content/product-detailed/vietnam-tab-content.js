/**
 * 越南 eSIM — 下方 tab（方案詳情／產品介紹／使用介紹／FAQ）
 * 文案參考 MicroeSIM Viettel／Mobifone／Vinaphone，並以本站 Medusa＋供應商 API 為準。
 *
 * API／商品對齊（2026-08）：
 *   vietnam-vinaphone-esim｜Vinaphone
 *     Vietnam-local-unlimited-* · VN IP · m3-world · 每日約 1GB 高速後約 10Mbps 吃到飽
 *   vietnam-daily-local-esim｜Viettel
 *     Vietnam-Local-Daily5GB-{7,15,30}-* · VN IP · v-internet · rule=terminate（每日 5GB 用完斷網）
 *   vietnam-daily-local-esim｜Vinaphone
 *     Vietnam-local-Daily* · VN IP · m3-world · 多數高速後約 128kbps
 *   vietnam-total-local-esim｜Vinaphone
 *     Vietnam-local-Total* · VN IP · m3-world · 多數高速後約 128kbps
 *   vietnam-total-local-esim｜Wintel
 *     Vietnam-Local-Total* · VN IP · m9-wintel · terminate（用完斷網）
 *   vietnam-total-local-esim｜Mobifone 當地號碼
 *     Total30GB-5-D0／Total50GB-10-D0 · VN IP · m-wap · terminate · 附當地號碼（接聽／收簡訊免費）
 *     ※ 不含「15 天每日 11GB／胡志明市額度」等未上架方案
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

const expiryOnUse = `一旦 eSIM 連接到支援的網路並開始產生數據流量，有效期限即開始。我們建議您在到達越南後添加 eSIM。您也可以提前安裝 eSIM，<span class="jeko-sum-warn">但請記得安裝後立即將其關閉</span>，以避免有效期提前開始。`;

const delivery =
  "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。";

const voiceVoip =
  "不支持，只能透過應用程式（網路通話，即 VoIP）。";

const dealerNote =
  "此 eSIM 由當地運營商提供，jeko eSIM 作為授權通路銷售。數位商品退換依本站退換貨政策；發行運營商可能調整方案細節。感謝您的理解。";

const coverage =
  "涵蓋越南全境主要旅遊目的地，包括河內、胡志明市、峴港、會安、芽莊、下龍灣、富國島等（實際訊號依地區而定）。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

export function vietnamCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>Vinaphone 吃到飽</strong>`,
        "Vinaphone 5G<br>越南 IP",
        "要原生 IP 吃到飽",
        `${compareBullets([
          "每日約 1GB 高速後維持約 10Mbps 無限流量。",
          "越南本地 IP，Grab／Zalo／社群體驗接近在地。",
          "僅數據、支援熱點。",
        ])}<div style="margin-top:8px;">${link("/product/vietnam/vietnam-vinaphone-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>每日型 Viettel／Vinaphone</strong>`,
        "原生越南 IP",
        "短中行程、控每日用量",
        `${compareBullets([
          "Viettel：每日 5GB（7／15／30 天），高速用完後斷網。",
          "Vinaphone：多種每日額度，多數用完後約 128kbps 續航。",
        ])}<div style="margin-top:8px;">${link("/product/vietnam/vietnam-daily-local-esim/", "查看每日型")}</div>`,
      ],
      [
        `<strong>總量型／當地號碼</strong>`,
        "Vinaphone／Wintel／Mobifone",
        "預估總用量或要越南號碼",
        `${compareBullets([
          "Vinaphone：總量高速後多數約 128kbps。",
          "Wintel：總量用完斷網。",
          "Mobifone：附越南號碼（接聽／收簡訊免費）；目前 5 天 30GB、10 天 50GB。",
        ])}<div style="margin-top:8px;">${link("/product/vietnam/vietnam-total-local-esim/", "查看總量型")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款越南 eSIM 最適合您？</h4>${table}`;
}

function planCard(pairs, fullWidthHtml = expiryOnUse) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: fullWidthHtml },
  });
}

function basePairs({
  carrierHtml,
  speedHtml,
  planTypeHtml,
  routeHtml = "本地（越南 IP）",
  hotspotHtml = "支持",
  phoneHtml = "無",
  callHtml = voiceVoip,
  smsHtml = "無",
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
      { iconName: "call", label: "電話號碼", valueHtml: phoneHtml },
    ],
    [
      { iconName: "phone_in_talk", label: "通話", valueHtml: callHtml },
      { iconName: "sms", label: "簡訊", valueHtml: smsHtml },
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

function otherActivate(extraHtml = "") {
  return otherInfoBlock([
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">建議抵達越南覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。${extraHtml}`,
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);
}

function buildDetailed({
  carrierHtml,
  speedHtml,
  planTypeLabel,
  introParas,
  bullets,
  phoneHtml,
  callHtml,
  smsHtml,
  activateExtra = "",
  fullWidthHtml,
}) {
  const planHtml = planCard(
    basePairs({
      carrierHtml,
      speedHtml,
      planTypeHtml: planTypeLabel,
      phoneHtml,
      callHtml,
      smsHtml,
    }),
    fullWidthHtml,
  );
  const introHtml = productIntroSection(`
    ${introParas.map((t) => paragraph(t, 16)).join("\n")}
    ${vietnamCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(activateExtra), introHtml].join("\n");
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
      question: `我的手機是否支援在越南使用 eSIM？`,
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
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始（個別方案若標示「兌換後須於期限內掃描啟用」，請以該說明為準）。建議抵達越南後再啟用。`,
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

const usageDelivery = [
  {
    iconName: "qr_code_2",
    title: "快速交付",
    descHtml: "付款後數分鐘內以 Email 寄送 QR Code。",
  },
  {
    iconName: "flight_land",
    title: "抵達再啟用",
    descHtml: "建議抵達越南後再安裝／開啟行動數據。",
  },
];

/* ========== Vinaphone 吃到飽 ========== */

export const VN_UNLIM_VINAPHONE_DETAILED = buildDetailed({
  carrierHtml: "Vinaphone 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日約 1GB 高速後維持約 10Mbps 吃到飽（實際速度依環境而定）",
  planTypeLabel: "僅數據流量・吃到飽",
  introParas: [
    "<strong>Vinaphone 越南本地 IP 數據 eSIM</strong>透過數位 SIM，使用越南當地網路基礎設施，帶來真正的本地上網體驗（非國際漫遊出口）。",
    "為什麼選擇 Vinaphone 本地 IP eSIM？越南本地 IP 延遲低、限制較少；支援 4G／LTE／5G；可暢用 Facebook、Instagram、TikTok、LINE、WhatsApp、Zalo、Grab 等。提供多種天數，滿足不同旅程。",
    "本商品為<strong>無限流量約 10Mbps</strong>（每日約 1GB 高速後進入約 10Mbps 續航）。若您需要 Viettel 或每日額度控管，請改選每日型。",
  ],
  bullets: [
    "越南本地 IP・Vinaphone 原生網路。",
    "吃到飽：每日約 1GB 高速後約 10Mbps。",
    "支援熱點與 ChatGPT／TikTok／Gemini。",
    "僅數據、無門號／傳統通話／簡訊。",
    "建議抵達越南後再啟用。",
  ],
});

export const VN_USAGE_VINAPHONE = buildUsage({
  title: "使用 jeko Vinaphone eSIM 的優勢",
  subtitle: "越南本地 IP・5G／4G",
  items: [
    {
      iconName: "public",
      title: "越南本地 IP",
      descHtml: "接近在地連線體驗，適合地圖、Grab、Zalo 與社群。",
    },
    {
      iconName: "speed",
      title: "4G／LTE／5G",
      descHtml: "都會與主要旅遊城市覆蓋穩定。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享；支援常用 App。",
    },
    ...usageDelivery,
  ],
});

export const VN_FAQ_VINAPHONE_UNLIM = buildFaq([
  ...sharedFaq("越南 Vinaphone 吃到飽"),
  {
    question: "吃到飽速度大概多少？",
    answerHtml: p(
      `每日約 <strong>1GB 高速</strong>後，維持約 <strong>10Mbps</strong> 無限流量（實際依位置與擁塞而定）。導航、傳訊與輕量影音通常沒問題。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享。`, 0),
  },
]);

/* ========== 每日型 Viettel ========== */

const viettelActivateExtra = `<div style="margin-top:8px;">部分方案兌換 QR 後須於期限內掃描啟用（例如約 15 天內）；掃描後可能立即啟用。用量查詢可依說明傳送 <strong>KTTK</strong> 至 191。</div>`;

export const VN_DAILY_VIETTEL_DETAILED = buildDetailed({
  carrierHtml: "Viettel 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日 5GB 高速，用完後斷網（實際以方案標示為準）",
  planTypeLabel: "僅數據流量・每日型（每日 5GB）",
  activateExtra: viettelActivateExtra,
  introParas: [
    "<strong>Viettel</strong> 是越南領先的行動營運商之一，覆蓋廣泛，為訪越旅客常用的選擇。本站 Viettel 每日型為<strong>越南本地 IP</strong>，提供高速 4G／LTE／5G。",
    "為何選擇 Viettel？網路覆蓋可靠、本地 IP 可暢用 Facebook、Instagram、TikTok、LINE、WhatsApp 等。本商品目前為<strong>每日 5GB</strong>，可選 <strong>7／15／30 天</strong>。每日 5GB 約可支援多小時 720p 影音或大量短影片（僅供參考）。",
    "<span class=\"jeko-sum-warn\">供應商規則為每日額度用完後斷網</span>（非降速續航）。若需要用完仍可上網，請改選 Vinaphone 每日型或吃到飽。",
  ],
  bullets: [
    "Viettel 原生・越南 IP・4G／5G。",
    "每日 5GB；天數 7／15／30 天。",
    "每日額度用完後斷網（請預留用量或改選其他電信）。",
    "支援熱點與常用 App。",
    "僅數據、無門號。",
  ],
});

export const VN_USAGE_VIETTEL = buildUsage({
  title: "使用 jeko Viettel eSIM 的優勢",
  subtitle: "覆蓋廣・越南本地 IP・每日 5GB",
  items: [
    {
      iconName: "cell_tower",
      title: "覆蓋可靠",
      descHtml: "Viettel 為越南主流電信，主要城市與旅遊路線覆蓋佳。",
    },
    {
      iconName: "public",
      title: "越南本地 IP",
      descHtml: "造訪本地與國際網站／App，體驗接近在地用戶。",
    },
    {
      iconName: "today",
      title: "每日 5GB",
      descHtml: "適合導航、社群與中度影音；請留意用完後會斷網。",
    },
    ...usageDelivery,
  ],
});

export const VN_FAQ_VIETTEL = buildFaq([
  ...sharedFaq("越南 Viettel 每日型"),
  {
    question: "每日 5GB 用完會怎樣？",
    answerHtml: p(
      `本站 Viettel 每日型依供應商規則，每日高速額度用完後會<strong>斷網</strong>。若需要降速續航或吃到飽，請改選 ${link("/product/vietnam/vietnam-daily-local-esim/?telecom=vinaphone", "Vinaphone 每日型")} 或 ${link("/product/vietnam/vietnam-vinaphone-esim/", "Vinaphone 吃到飽")}。`,
      0,
    ),
  },
  {
    question: "有哪些天數？",
    answerHtml: p(
      `目前 Viettel 為每日 5GB，可選 <strong>7／15／30 天</strong>（以結帳頁為準）。`,
      0,
    ),
  },
]);

/* ========== 每日型 Vinaphone ========== */

export const VN_DAILY_VINAPHONE_DETAILED = buildDetailed({
  carrierHtml: "Vinaphone 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速額度用完後多數約 128kbps（每日重置，實際依方案而定）",
  planTypeLabel: "僅數據流量・每日型",
  introParas: [
    "Vinaphone 每日型同樣為<strong>越南本地 IP</strong>，支援 4G／LTE／5G。可依行程選擇每日 500MB／1GB／2GB／3GB／5GB 等多種額度與天數。",
    "多數方案高速用完後降速約 128kbps 可持續使用（隔日重置）。適合想控管每日用量、又希望用完仍可傳訊的旅客。",
  ],
  bullets: [
    "越南本地 IP・Vinaphone 5G／4G。",
    "多種每日額度與天數可選。",
    "多數高速後約 128kbps 續航。",
    "支援熱點與常用 App。",
  ],
});

export const VN_FAQ_VINAPHONE_DAILY = buildFaq([
  ...sharedFaq("越南 Vinaphone 每日型"),
  {
    question: "高速用完會斷網嗎？",
    answerHtml: p(
      `多數 Vinaphone 每日型為降速約 <strong>128kbps</strong> 可持續使用並隔日重置；實際以結帳頁標示為準。`,
      0,
    ),
  },
]);

/* ========== 總量型 Vinaphone ========== */

export const VN_TOTAL_VINAPHONE_DETAILED = buildDetailed({
  carrierHtml: "Vinaphone 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；總量高速用完後多數約 128kbps 續航（實際依方案而定）",
  planTypeLabel: "僅數據流量・總量型",
  introParas: [
    "Vinaphone 總量型：越南本地 IP、5G／4G，依所選總 GB 與天數提供高速流量。多數方案高速用完後約 128kbps 可持續使用，比「用完斷網」更安心。",
  ],
  bullets: [
    "越南本地 IP・Vinaphone。",
    "總量高速後多數約 128kbps 續航。",
    "支援熱點與常用 App。",
    "僅數據。",
  ],
});

export const VN_FAQ_VINAPHONE_TOTAL = buildFaq([
  ...sharedFaq("越南 Vinaphone 總量型"),
  {
    question: "總量用完會斷網嗎？",
    answerHtml: p(
      `多數為降速約 <strong>128kbps</strong> 可持續；少數可能不同，請以結帳頁為準。若需要用完斷網價位方案，可比較 Wintel。`,
      0,
    ),
  },
]);

/* ========== 總量型 Wintel ========== */

export const VN_TOTAL_WINTEL_DETAILED = buildDetailed({
  carrierHtml: "Wintel 4G／LTE",
  speedHtml: "4G／LTE；總量高速用完後斷網",
  planTypeLabel: "僅數據流量・總量型（用完斷網）",
  introParas: [
    "Wintel 總量型走越南當地網路與<strong>越南本地 IP</strong>，適合已預估用量、價格取向的旅客。可選多種總流量與天數。",
    "<span class=\"jeko-sum-warn\">高速總量用完後會斷網</span>，請預留餘量，或改選 Vinaphone 總量／吃到飽。",
  ],
  bullets: [
    "越南本地 IP・Wintel 4G／LTE。",
    "總量用完斷網，請預留用量。",
    "支援熱點與常用 App。",
    "僅數據、無門號。",
  ],
});

export const VN_USAGE_WINTEL = buildUsage({
  title: "使用 jeko Wintel eSIM 的優勢",
  subtitle: "越南 IP・總量可控",
  items: [
    {
      iconName: "public",
      title: "越南本地 IP",
      descHtml: "造訪 Grab、Zalo、地圖等體驗接近在地。",
    },
    {
      iconName: "data_usage",
      title: "總量一次選好",
      descHtml: "適合已預估用量的短途或深度遊。",
    },
    {
      iconName: "warning",
      title: "用完斷網",
      descHtml: "請預留緩衝，或改選降速續航／吃到飽。",
    },
    ...usageDelivery,
  ],
});

export const VN_FAQ_WINTEL = buildFaq([
  ...sharedFaq("越南 Wintel 總量型"),
  {
    question: "總量用完會怎樣？",
    answerHtml: p(
      `會<strong>斷網</strong>。若需要用完仍可上網，請改選 ${link("/product/vietnam/vietnam-total-local-esim/?telecom=vinaphone", "Vinaphone 總量型")} 或 ${link("/product/vietnam/vietnam-vinaphone-esim/", "吃到飽")}。`,
      0,
    ),
  },
]);

/* ========== Mobifone 當地號碼 ========== */

const mobiCall =
  `<span style="color:#dc2626;font-weight:700;">僅限接聽來電（免費）</span>`;
const mobiSms =
  `<span style="color:#dc2626;font-weight:700;">僅限接收簡訊（免費）</span><div style="margin-top:6px;font-size:13px;color:#64748b;">旅遊 eSIM 可能無法完全保證 App 註冊簡訊接收。</div>`;

const mobiActivate = `<div style="margin-top:8px;">抵達越南後請依說明撥打 <strong>900</strong> 啟用。查詢門號：<strong>*0#</strong>；查詢流量：依說明撥碼或傳送 <strong>KT_ALL</strong> 至 999。兌換 QR 後通常須於約 30 天內掃描啟用。</div>`;

const mobiExpiry = `${expiryOnUse}<div style="margin-top:10px;">${mobiActivate}</div>`;

export const VN_TOTAL_MOBIFONE_DETAILED = buildDetailed({
  carrierHtml: "Mobifone 4G／LTE",
  speedHtml: "4G／LTE；總量高速用完後斷網",
  planTypeLabel: "數據＋接聽／收簡訊・總量型",
  phoneHtml: "+84 越南本地手機號碼（可撥 *0# 查詢）",
  callHtml: mobiCall,
  smsHtml: mobiSms,
  activateExtra: mobiActivate,
  fullWidthHtml: mobiExpiry,
  introParas: [
    "Mobifone 越南 eSIM 為旅客提供<strong>本地手機號碼</strong>、高速行動數據與簡訊（僅限接收）功能。Mobifone 是越南領先電信之一，覆蓋與穩定性佳，適合需要本地門號接聽／收簡訊的旅客。",
    "為什麼選擇 Mobifone：越南本地號碼（接聽與收簡訊免費）；高速 4G／LTE；可暢用 Facebook、Instagram、TikTok、LINE、WhatsApp、Zalo、Grab 等。",
    "本站目前上架方案為<strong>5 天 30GB</strong>與<strong>10 天 50GB</strong>（總量用完斷網）。其他市面「每日型／分區流量」方案若未列於結帳頁，即不在本商品範圍。",
  ],
  bullets: [
    "附越南本地號碼；接聽來電與接收簡訊免費。",
    "越南本地 IP・Mobifone 4G／LTE。",
    "目前：5 天 30GB、10 天 50GB；用完斷網。",
    "抵達後撥 900 啟用；可 *0# 查門號。",
    "支援熱點；無法保證 App 註冊簡訊。",
  ],
});

export const VN_USAGE_MOBIFONE = buildUsage({
  title: "使用 jeko Mobifone 當地號碼的優勢",
  subtitle: "越南門號・接聽／收簡訊",
  items: [
    {
      iconName: "call",
      title: "本地號碼",
      descHtml: "方便訂車、餐廳與雙重驗證（收簡訊；寄送不保證）。",
    },
    {
      iconName: "public",
      title: "越南本地 IP",
      descHtml: "數據體驗接近在地用戶。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線。",
    },
    ...usageDelivery,
  ],
});

export const VN_FAQ_MOBIFONE = buildFaq([
  ...sharedFaq("越南 Mobifone 當地號碼"),
  {
    question: "有哪些方案？是每日 11GB 嗎？",
    answerHtml: p(
      `本站目前為總量型：<strong>5 天 30GB</strong>、<strong>10 天 50GB</strong>。並非「15 天每日 11GB」或其他分區額度方案；請以結帳頁為準。`,
      0,
    ),
  },
  {
    question: "如何啟用與查詢門號／流量？",
    answerHtml: p(
      `抵達後依說明撥打 <strong>900</strong> 啟用。查門號 <strong>*0#</strong>；查流量依說明撥碼或傳送 <strong>KT_ALL</strong> 至 999。`,
      0,
    ),
  },
  {
    question: "可以撥出電話或寄簡訊嗎？",
    answerHtml: p(
      `本方案以<strong>接聽來電</strong>與<strong>接收簡訊</strong>為主（免費）。撥出／寄送可能不支援或需另購，請以開通說明為準。`,
      0,
    ),
  },
]);

/** 總量型 Vinaphone 亦可共用 Vinaphone usage */
export const VN_USAGE_VINAPHONE_TOTAL = VN_USAGE_VINAPHONE;
export const VN_USAGE_VINAPHONE_DAILY = VN_USAGE_VINAPHONE;
