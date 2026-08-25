/**
 * 台灣 eSIM — 下方 tab
 * 吃到飽：中華 5／10Mbps｜每日：台哥大／5Mbps續航｜總量：中華／雙網
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
  "台北、台中、高雄、高鐵沿線、桃園／高雄機場與全台主要景點。";

function compareBullets(items) {
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${items
    .map((t) => `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`)
    .join("")}</ul>`;
}

export function taiwanCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>台灣吃到飽</strong>`,
        "中華電信<br>5／10Mbps",
        "整天連線、免估流量",
        `${compareBullets([
          "無需實名；每日高速後固定 Mbps 續航。",
          "出網香港／新加坡 IP；ChatGPT／TikTok 可能受限。",
        ])}<div style="margin-top:8px;">${link("/product/taiwan/taiwan-unlimited-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>台灣每日型</strong>`,
        "台灣大哥大",
        "控管每日用量、要 GPT／TikTok",
        `${compareBullets([
          "無需實名；新加坡 IP，支援 ChatGPT／TikTok／Gemini。",
          "可選 128kbps 或 5Mbps 續航。",
        ])}<div style="margin-top:8px;">${link("/product/taiwan/taiwan-daily-esim/", "查看每日型")}</div>`,
      ],
      [
        `<strong>台灣總量型</strong>`,
        "中華／雙網",
        "可預估總用量",
        `${compareBullets([
          "中華：用完斷網；雙網：用完約 128kbps。",
        ])}<div style="margin-top:8px;">${link("/product/taiwan/taiwan-total-esim/", "查看總量型")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款台灣 eSIM 最適合您？</h4>${table}`;
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
      html: `<span class="jeko-sum-warn">建議抵達台灣覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
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
    ${taiwanCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(), introHtml].join("\n");
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export const TW_UNLIM_5_DETAILED = buildDetailed({
  carrierHtml: "中華電信 4G／5G（約 5Mbps 續航）",
  speedHtml: "每日約 2GB 高速後約 5Mbps 吃到飽",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（香港／新加坡 IP）",
  introParas: [
    "jeko eSIM 台灣吃到飽，走 <strong>中華電信</strong>，無需實名，每日高速後約 <strong>5Mbps</strong> 續航。",
    "適合整天導航與傳訊。出網為香港／新加坡 IP；ChatGPT／TikTok 可能受限。僅數據。",
  ],
  bullets: [
    "運營商：中華電信・無需 eKYC",
    "流量：每日約 2GB 高速後約 5Mbps 吃到飽",
    "支援熱點；ChatGPT／TikTok 可能受限",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const TW_UNLIM_10_DETAILED = buildDetailed({
  carrierHtml: "中華電信 4G／5G（約 10Mbps 續航）",
  speedHtml: "每日約 1GB 高速後約 10Mbps 吃到飽",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（香港／新加坡 IP）",
  introParas: [
    "jeko eSIM 台灣吃到飽，走 <strong>中華電信</strong>，無需實名，每日高速後約 <strong>10Mbps</strong> 續航。",
    "適合用量較大的行程。出網為香港／新加坡 IP；ChatGPT／TikTok 可能受限。僅數據。",
  ],
  bullets: [
    "運營商：中華電信・無需 eKYC",
    "流量：每日約 1GB 高速後約 10Mbps 吃到飽",
    "支援熱點；ChatGPT／TikTok 可能受限",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const TW_DAILY_TWM_DETAILED = buildDetailed({
  carrierHtml: "台灣大哥大 4G／5G",
  speedHtml: "每日高速用完後約 128kbps（每日重置）",
  planTypeLabel: "每日型",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 台灣每日型，走 <strong>台灣大哥大</strong>，無需實名，出網為<strong>新加坡 IP</strong>。",
    "可選每日 500MB～3GB；用完後約 128kbps。支援 ChatGPT／TikTok／Gemini。",
  ],
  bullets: [
    "運營商：台灣大哥大・無需 eKYC・新加坡 IP",
    "流量：每日額度；用完後約 128kbps（每日重置）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const TW_DAILY_TWM5_DETAILED = buildDetailed({
  carrierHtml: "台灣大哥大 4G／5G（5Mbps 續航）",
  speedHtml: "每日約 1GB 高速後約 5Mbps 續航",
  planTypeLabel: "每日型",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 台灣每日型（<strong>5Mbps 續航</strong>），走 <strong>台灣大哥大</strong>，無需實名。",
    "每日約 1GB 高速後約 5Mbps 可持續上網，比 128kbps 更適導航與輕量影音。",
  ],
  bullets: [
    "運營商：台灣大哥大・無需 eKYC・新加坡 IP",
    "流量：每日約 1GB 高速後約 5Mbps 續航",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const TW_TOTAL_CHT_DETAILED = buildDetailed({
  carrierHtml: "中華電信 4G／5G",
  speedHtml: "總量高速用完即斷網",
  planTypeLabel: "總量型",
  routeHtml: "漫遊（香港／新加坡 IP）",
  introParas: [
    "jeko eSIM 台灣總量型，走 <strong>中華電信</strong>，無需實名。",
    "可選 3GB～50GB；高速用完即斷網（非降速），請預留用量。",
  ],
  bullets: [
    "運營商：中華電信・無需 eKYC",
    "流量：總量高速；用完斷網",
    "支援熱點；ChatGPT／TikTok 可能受限",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const TW_TOTAL_DUAL_DETAILED = buildDetailed({
  carrierHtml: "台灣大哥大／中華電信（雙網）",
  speedHtml: "總量高速用完後約 128kbps 可持續使用",
  planTypeLabel: "總量型",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 台灣總量型，走 <strong>台灣大哥大／中華電信</strong> 雙網，出網為新加坡 IP。",
    "可選 1GB～60GB；高速用完後約 128kbps 可持續使用。支援 ChatGPT／TikTok。",
  ],
  bullets: [
    "運營商：台灣大哥大／中華電信雙網・新加坡 IP",
    "流量：總量高速；用完後約 128kbps 續航",
    "支援熱點；支援 ChatGPT、TikTok",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const TW_USAGE_CHT = usageAdvantagesSection({
  title: "使用 jeko 台灣中華電信 eSIM 的優勢",
  subtitle: "無需實名・全台覆蓋",
  items: [
    { iconName: "cell_tower", title: "中華電信", descHtml: "全台城市、高鐵與機場覆蓋穩定。" },
    { iconName: "verified_user", title: "無需實名", descHtml: "開機即可上網，免上傳證件。" },
    { iconName: "speed", title: "吃到飽或總量", descHtml: "吃到飽採固定 Mbps 續航；總量請預留用量。" },
    { iconName: "qr_code_2", title: "快速交付", descHtml: "付款後數分鐘內以 Email 寄送 QR Code。" },
    { iconName: "flight_land", title: "抵達再啟用", descHtml: "建議抵達台灣後再安裝／開啟行動數據。" },
  ],
});

export const TW_USAGE_TWM = usageAdvantagesSection({
  title: "使用 jeko 台灣大哥大 eSIM 的優勢",
  subtitle: "新加坡 IP・支援 GPT／TikTok",
  items: [
    { iconName: "cell_tower", title: "台灣大哥大", descHtml: "都會區與熱門景點覆蓋良好。" },
    { iconName: "verified_user", title: "無需實名", descHtml: "開機即可上網，免上傳證件。" },
    { iconName: "smart_toy", title: "支援 AI／短影音", descHtml: "標示支援 ChatGPT、TikTok、Gemini。" },
    { iconName: "qr_code_2", title: "快速交付", descHtml: "付款後數分鐘內以 Email 寄送 QR Code。" },
    { iconName: "flight_land", title: "抵達再啟用", descHtml: "建議抵達台灣後再安裝／開啟行動數據。" },
  ],
});

export const TW_USAGE_DUAL = usageAdvantagesSection({
  title: "使用 jeko 台灣雙網 eSIM 的優勢",
  subtitle: "台哥大＋中華・自動切換",
  items: [
    { iconName: "swap_horiz", title: "雙網自動切換", descHtml: "台灣大哥大與中華電信互補，減少死角。" },
    { iconName: "speed", title: "總量可控", descHtml: "高速用完後約 128kbps 續航，不會立刻斷網。" },
    { iconName: "smart_toy", title: "支援 AI／短影音", descHtml: "新加坡 IP；標示支援 ChatGPT／TikTok。" },
    { iconName: "qr_code_2", title: "快速交付", descHtml: "付款後數分鐘內以 Email 寄送 QR Code。" },
    { iconName: "flight_land", title: "抵達再啟用", descHtml: "建議抵達台灣後再安裝／開啟行動數據。" },
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
      question: `${name} 何時開始計算效期？`,
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達台灣後再啟用。`,
        0,
      ),
    },
    {
      question: "需要實名嗎？",
      answerHtml: p(`本頁所列方案皆為<strong>無需實名（No eKYC）</strong>，開機即可上網。`, 0),
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

export const TW_FAQ_UNLIM_5 = faqAccordion(
  [
    ...sharedFaq("台灣中華電信 5Mbps 吃到飽"),
    {
      question: "5Mbps 吃到飽怎麼算？",
      answerHtml: p(
        `每日約 <strong>2GB</strong> 高速後進入約 <strong>5Mbps</strong> 續航；流量／天數以台灣時間 00:00 重置。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const TW_FAQ_UNLIM_10 = faqAccordion(
  [
    ...sharedFaq("台灣中華電信 10Mbps 吃到飽"),
    {
      question: "10Mbps 吃到飽怎麼算？",
      answerHtml: p(
        `每日約 <strong>1GB</strong> 高速後進入約 <strong>10Mbps</strong> 續航；流量／天數以台灣時間 00:00 重置。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const TW_FAQ_DAILY_TWM = faqAccordion(
  [
    ...sharedFaq("台灣大哥大每日型"),
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

export const TW_FAQ_DAILY_TWM5 = faqAccordion(
  [
    ...sharedFaq("台灣大哥大 5Mbps 續航每日型"),
    {
      question: "5Mbps 續航怎麼算？",
      answerHtml: p(
        `每日約 <strong>1GB</strong> 高速後進入約 <strong>5Mbps</strong> 續航，比 128kbps 更適導航與輕量影音。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const TW_FAQ_TOTAL_CHT = faqAccordion(
  [
    ...sharedFaq("台灣中華電信總量型"),
    {
      question: "總量用完會怎樣？",
      answerHtml: p(
        `中華電信總量型高速用完後會<strong>斷網</strong>，請預留用量或改選吃到飽。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const TW_FAQ_TOTAL_DUAL = faqAccordion(
  [
    ...sharedFaq("台灣雙網總量型"),
    {
      question: "總量用完會怎樣？",
      answerHtml: p(
        `雙網總量型高速用完後一般降速至約 <strong>128kbps</strong> 可持續使用。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export default {
  TW_UNLIM_5_DETAILED,
  TW_UNLIM_10_DETAILED,
  TW_DAILY_TWM_DETAILED,
  TW_DAILY_TWM5_DETAILED,
  TW_TOTAL_CHT_DETAILED,
  TW_TOTAL_DUAL_DETAILED,
  TW_USAGE_CHT,
  TW_USAGE_TWM,
  TW_USAGE_DUAL,
  TW_FAQ_UNLIM_5,
  TW_FAQ_UNLIM_10,
  TW_FAQ_DAILY_TWM,
  TW_FAQ_DAILY_TWM5,
  TW_FAQ_TOTAL_CHT,
  TW_FAQ_TOTAL_DUAL,
};
