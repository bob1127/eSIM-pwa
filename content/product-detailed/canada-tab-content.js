/**
 * 加拿大 eSIM — 下方 tab 內容（方案詳情／產品介紹／使用介紹／FAQ）
 * Medusa：canada-unlimited-esim｜canada-daily-esim｜canada-total-esim
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

const coverageCa =
  "溫哥華、多倫多、蒙特婁、卡加利、Banff、魁北克等加拿大主要城市與熱門旅遊／滑雪路線。";

const coverageCaUs =
  "加拿大主要城市與交通沿線，並可延伸美國主流網路（不含墨西哥）。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

export function canadaCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>加拿大吃到飽</strong>`,
        "WIND／Bell／TELUS＋<br>亦可美國",
        "加／美來回、要吃到飽",
        `${compareBullets([
          "加拿大多網＋美國三網，跨境免再換卡。",
          "吃到飽 FUP；不含墨西哥。",
          "純數據；出網多為波蘭 IP。",
        ])}<div style="margin-top:8px;">${link("/product/canada/canada-unlimited-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>加拿大每日／總量</strong>`,
        "TELUS／Bell 或美加多網",
        "用量可控、短中行程",
        `${compareBullets([
          "TELUS／Bell：加拿大雙網，每日／總量後多數約 128kbps。",
          "美加多網：加＋美可用；每日後約 512kbps；總量用完斷網。",
          "總量另有 TELUS 原生（加拿大 IP、含通話簡訊）。",
        ])}<div style="margin-top:8px;">${link("/product/canada/canada-daily-esim/", "每日型")} · ${link("/product/canada/canada-total-esim/", "總量型")}</div>`,
      ],
      [
        `<strong>美加墨要美國號碼</strong>`,
        "AT&T 美國號碼",
        "三國＋門號通話",
        `${compareBullets([
          "美／墨無限；加拿大僅 25GB 高速後降速。",
          "若以加拿大吃到飽為主，優先選本站加拿大吃到飽。",
        ])}<div style="margin-top:8px;">${link("/product/north-america/north-america-att-unlimited-esim/", "北美 AT&T")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款加拿大 eSIM 最適合您？</h4>${table}`;
}

function planCard(pairs) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: expiryOnUse },
  });
}

function basePairs({
  coverage,
  carrierHtml,
  speedHtml,
  planTypeHtml,
  routeHtml,
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

function otherActivate(regionLabel = "加拿大") {
  return otherInfoBlock([
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">建議抵達${regionLabel}覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);
}

function buildDetailed({
  coverage,
  carrierHtml,
  speedHtml,
  planTypeLabel,
  routeHtml,
  introParas,
  bullets,
  regionLabel,
  hotspotHtml,
  phoneHtml,
  callHtml,
  smsHtml,
}) {
  const planHtml = planCard(
    basePairs({
      coverage,
      carrierHtml,
      speedHtml,
      planTypeHtml: planTypeLabel,
      routeHtml,
      hotspotHtml,
      phoneHtml,
      callHtml,
      smsHtml,
    }),
  );
  const introHtml = productIntroSection(`
    ${introParas.map((t) => paragraph(t, 16)).join("\n")}
    ${canadaCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(regionLabel), introHtml].join("\n");
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
      question: `我的手機是否支援在加拿大使用 eSIM？`,
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
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達加拿大後再啟用；若提前安裝，請關閉該 eSIM 的行動數據。`,
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
    descHtml: "建議抵達加拿大（或美加覆蓋）後再安裝／開啟行動數據。",
  },
];

/* ========== 吃到飽 ========== */

export const CA_UNLIM_DETAILED = buildDetailed({
  coverage: coverageCaUs,
  carrierHtml: "WIND／Bell／TELUS＋（加拿大）＋美國三網 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；吃到飽不限流量（FUP，實際速度依位置與擁塞而定）",
  planTypeLabel: "僅數據流量・吃到飽",
  routeHtml: "漫遊（波蘭 IP）",
  regionLabel: "加拿大或美國",
  introParas: [
    "jeko eSIM <strong>加拿大吃到飽</strong>，走 WIND／Bell／TELUS＋ 等多網，並可延伸美國 T-Mobile／Verizon／AT&T，適合加／美來回、自駕與滑雪。",
    "公平使用政策下可持續上網；純數據、不含墨西哥。若您需要美加墨三國與美國門號，請改選北美 AT&T 美國號碼（加拿大僅 25GB 高速）。",
    "支援熱點與 ChatGPT／TikTok／Gemini。",
  ],
  bullets: [
    "加拿大多網＋美國三網，跨境免再換卡。",
    "吃到飽 FUP；不含墨西哥。",
    "支援熱點與常用 App。",
    "純數據、無門號；出網多為波蘭 IP。",
    "建議抵達覆蓋範圍後再啟用。",
  ],
});

export const CA_USAGE_UNLIM = buildUsage({
  title: "使用 jeko 加拿大吃到飽的優勢",
  subtitle: "加／美多網・不限流量",
  items: [
    {
      iconName: "all_inclusive",
      title: "吃到飽 FUP",
      descHtml: "公平使用政策下可持續上網，適合整天導航與傳訊。",
    },
    {
      iconName: "public",
      title: "加美可用",
      descHtml: "加拿大多網並可延伸美國三網（不含墨西哥）。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享；支援常用 App。",
    },
    ...usageDelivery,
  ],
});

export const CA_FAQ_UNLIM = buildFaq([
  ...sharedFaq("加拿大吃到飽"),
  {
    question: "可以用在美國嗎？含墨西哥嗎？",
    answerHtml: p(
      `可以在美國使用（美國三網）。<strong>不含墨西哥</strong>。若需要美加墨與美國號碼，請改選 ${link("/product/north-america/north-america-att-unlimited-esim/", "北美 AT&T 美國號碼")}（加拿大為 25GB 高速）。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以；實際速度依當下網路與 FUP 而定。`, 0),
  },
]);

/* ========== 每日型 ========== */

export const CA_DAILY_ROAM_DETAILED = buildDetailed({
  coverage: coverageCa,
  carrierHtml: "TELUS／Bell 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速額度用完後約 128kbps（每日重置，實際依環境而定）",
  planTypeLabel: "僅數據流量・每日型",
  routeHtml: "漫遊（香港／新加坡 IP）",
  introParas: [
    "jeko eSIM 加拿大每日型，走 <strong>TELUS／Bell</strong> 雙網：西岸與東岸都會互補，適合城市、滑雪與跨省移動。",
    "可選每日 500MB／1GB／2GB／3GB；高速用完後約 128kbps，隔日重置。ChatGPT／TikTok 不保證。",
  ],
  bullets: [
    "TELUS＋Bell 雙網，溫哥華／多倫多／Banff 等行程較穩。",
    "每日高速後約 128kbps 續航。",
    "僅數據；建議抵達後再啟用。",
    "若需加美雙國，可改選同商品美加多網或吃到飽。",
  ],
});

export const CA_DAILY_MULTI_DETAILED = buildDetailed({
  coverage: coverageCaUs,
  carrierHtml: "Rogers／Bell／TELUS＋（加拿大）＋美國三網 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速額度用完後約 512kbps（每日重置，實際依環境而定）",
  planTypeLabel: "僅數據流量・每日型",
  routeHtml: "漫遊（波蘭 IP）",
  regionLabel: "加拿大或美國",
  introParas: [
    "jeko eSIM 加拿大每日型<strong>美加多網</strong>：加拿大六網＋美國三網，單一 eSIM 加／美可用，不含墨西哥。",
    "每日高速用完後約 512kbps 續航；支援熱點與 ChatGPT／TikTok／Gemini。",
  ],
  bullets: [
    "加美一卡，跨境自駕較方便。",
    "每日高速後約 512kbps。",
    "支援熱點與常用 App。",
    "不含墨西哥；波蘭 IP 漫遊節點。",
  ],
});

export const CA_USAGE_DAILY_ROAM = buildUsage({
  title: "使用 jeko 加拿大 TELUS／Bell 每日型的優勢",
  subtitle: "雙網互補・額度可控",
  items: [
    {
      iconName: "swap_horiz",
      title: "雙網互補",
      descHtml: "TELUS 西岸、Bell 東岸都會，跨省移動較安心。",
    },
    {
      iconName: "today",
      title: "每日額度",
      descHtml: "高速用完後約 128kbps，隔日重置。",
    },
    {
      iconName: "downhill_skiing",
      title: "城市與滑雪",
      descHtml: "適合溫哥華、多倫多、Banff 等熱門行程。",
    },
    ...usageDelivery,
  ],
});

export const CA_USAGE_DAILY_MULTI = buildUsage({
  title: "使用 jeko 加拿大美加多網每日型的優勢",
  subtitle: "加＋美・每日額度",
  items: [
    {
      iconName: "public",
      title: "加美一卡",
      descHtml: "加拿大與美國共用，不含墨西哥。",
    },
    {
      iconName: "speed",
      title: "降速續航",
      descHtml: "每日高速後約 512kbps，導航與傳訊通常仍可用。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享；支援常用 App。",
    },
    ...usageDelivery,
  ],
});

export const CA_FAQ_DAILY_ROAM = buildFaq([
  ...sharedFaq("加拿大 TELUS／Bell 每日型"),
  {
    question: "高速用完會斷網嗎？",
    answerHtml: p(
      `多數為降速至約 <strong>128kbps</strong> 可持續使用，並於隔日重置。實際以結帳頁標示為準。`,
      0,
    ),
  },
  {
    question: "可以用在美國嗎？",
    answerHtml: p(
      `本電信選項以加拿大為主。若需要加美雙國，請改選同商品的美加多網，或 ${link("/product/canada/canada-unlimited-esim/", "加拿大吃到飽")}。`,
      0,
    ),
  },
]);

export const CA_FAQ_DAILY_MULTI = buildFaq([
  ...sharedFaq("加拿大美加多網每日型"),
  {
    question: "含墨西哥嗎？",
    answerHtml: p(
      `不含。若需要美加墨，請改選 ${link("/product/north-america/north-america-att-unlimited-esim/", "北美 AT&T")} 或北美每日／總量。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以；請依每日額度規劃熱點用量。`, 0),
  },
]);

/* ========== 總量型 ========== */

export const CA_TOTAL_ROAM_DETAILED = buildDetailed({
  coverage: coverageCa,
  carrierHtml: "TELUS／Bell 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；總量高速用完後多數約 128kbps 續航（部分小額度可能斷網）",
  planTypeLabel: "僅數據流量・總量型",
  routeHtml: "漫遊",
  introParas: [
    "jeko eSIM 加拿大總量型，走 <strong>TELUS／Bell</strong>。可選多種 GB 與天數；多數高速用完後約 128kbps 可持續使用。",
    "25 天以上長天數較適合打工度假與長住。建議抵達後再啟用。",
  ],
  bullets: [
    "TELUS／Bell 雙網覆蓋熱門城市與滑雪區。",
    "總量高速後多數約 128kbps 續航。",
    "僅數據；長天數選項較適合長住。",
  ],
});

export const CA_TOTAL_MULTI_DETAILED = buildDetailed({
  coverage: coverageCaUs,
  carrierHtml: "Rogers／Bell／TELUS＋（加拿大）＋美國三網 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；總量高速用完後斷網",
  planTypeLabel: "僅數據流量・總量型（用完斷網）",
  routeHtml: "漫遊（波蘭 IP）",
  regionLabel: "加拿大或美國",
  introParas: [
    "jeko eSIM 加拿大總量型<strong>美加多網</strong>：加／美可用，高速 GB 用完後會<strong>斷網</strong>，請預留餘量。",
    "支援熱點與常用 App。不含墨西哥。",
  ],
  bullets: [
    "加美一卡；美國三網備援。",
    "總量用完斷網（非降速 FUP）。",
    "支援熱點；請依總 GB 規劃用量。",
  ],
});

export const CA_TOTAL_NATIVE_DETAILED = buildDetailed({
  coverage: coverageCa,
  carrierHtml: "TELUS 原生 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；總量高速用完後約 128kbps 續航",
  planTypeLabel: "數據＋通話＋簡訊・總量型",
  routeHtml: "本地（加拿大 IP）",
  phoneHtml: "有（本地門號能力，依開通）",
  callHtml: "本地無限通話；含部分國際通話分鐘（請加國碼）",
  smsHtml: "本地無限簡訊",
  introParas: [
    "jeko eSIM <strong>TELUS 原生</strong>：加拿大 IP、接近在地體驗，並含本地通話／簡訊與部分國際通話分鐘。",
    "目前以 30 天 50GB／75GB 為主；高速用完後約 128kbps 續航。eSIM 僅能安裝一次，請勿刪除；用量可依說明以簡訊查詢。",
  ],
  bullets: [
    "加拿大原生 IP，延遲較接近在地用戶。",
    "含本地通話／簡訊與部分國際通話。",
    "總量高速後約 128kbps 續航。",
    "僅能安裝一次；建議抵達後再啟用。",
  ],
});

export const CA_USAGE_TOTAL_ROAM = buildUsage({
  title: "使用 jeko 加拿大 TELUS／Bell 總量型的優勢",
  subtitle: "雙網・總量可控",
  items: [
    {
      iconName: "swap_horiz",
      title: "雙網互補",
      descHtml: "西岸 TELUS、東岸 Bell，跨省移動較穩。",
    },
    {
      iconName: "data_usage",
      title: "總量一次選好",
      descHtml: "多數高速後約 128kbps 續航，比斷網更安心。",
    },
    ...usageDelivery,
  ],
});

export const CA_USAGE_TOTAL_MULTI = buildUsage({
  title: "使用 jeko 加拿大美加多網總量型的優勢",
  subtitle: "加＋美・用完斷網請預留",
  items: [
    {
      iconName: "public",
      title: "加美一卡",
      descHtml: "跨境自駕／飛往美國不必再換卡。",
    },
    {
      iconName: "warning",
      title: "用完斷網",
      descHtml: "高速 GB 用完後無法繼續，請預留餘量或改選吃到飽。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "熱點會消耗額度，請特別留意。",
    },
    ...usageDelivery,
  ],
});

export const CA_USAGE_TOTAL_NATIVE = buildUsage({
  title: "使用 jeko TELUS 原生的優勢",
  subtitle: "加拿大 IP・含通話簡訊",
  items: [
    {
      iconName: "public",
      title: "加拿大原生 IP",
      descHtml: "連線體驗接近在地用戶。",
    },
    {
      iconName: "call",
      title: "通話與簡訊",
      descHtml: "本地無限通話／簡訊，並含部分國際通話分鐘。",
    },
    {
      iconName: "network_cell",
      title: "TELUS 覆蓋",
      descHtml: "西岸與主要旅遊城市覆蓋強。",
    },
    ...usageDelivery,
  ],
});

export const CA_FAQ_TOTAL_ROAM = buildFaq([
  ...sharedFaq("加拿大 TELUS／Bell 總量型"),
  {
    question: "總量用完會斷網嗎？",
    answerHtml: p(
      `多數方案高速用完後降速約 <strong>128kbps</strong> 可持續使用；少數小額度天數可能為斷網，請以結帳頁標示為準。`,
      0,
    ),
  },
]);

export const CA_FAQ_TOTAL_MULTI = buildFaq([
  ...sharedFaq("加拿大美加多網總量型"),
  {
    question: "總量用完會怎樣？",
    answerHtml: p(
      `本選項高速用完後會<strong>斷網</strong>。若需要用完仍可上網，請改選 ${link("/product/canada/canada-unlimited-esim/", "加拿大吃到飽")} 或每日型。`,
      0,
    ),
  },
]);

export const CA_FAQ_TOTAL_NATIVE = buildFaq([
  ...sharedFaq("TELUS 原生"),
  {
    question: "可以打國際電話嗎？",
    answerHtml: p(
      `含部分國際通話分鐘（如中港澳台、美國等；請加國碼）。實際分鐘與可用地區以開通說明為準。`,
      0,
    ),
  },
  {
    question: "可以刪除後重裝嗎？",
    answerHtml: p(
      `eSIM <strong>僅能安裝一次</strong>，請勿刪除。可提前安裝，建議抵達後再啟用行動數據。`,
      0,
    ),
  },
]);
