/**
 * 中港澳 eSIM — 下方 tab
 * 吃到飽：短天數／長天數｜每日／總量：中國電信／聯通／CSL／澳門電訊
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
  "中國大陸、香港、澳門熱門城市與主要交通沿線。";

function compareBullets(items) {
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${items
    .map((t) => `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`)
    .join("")}</ul>`;
}

export function cnhkmoCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>中港澳吃到飽</strong>`,
        "短天數／長天數",
        "整天連線、免估流量",
        `${compareBullets([
          "短／長天數皆 T+C・約 10Mbps・新加坡 IP。",
          "免 VPN 社群；支援 ChatGPT／TikTok／Gemini（依路由而定）。",
        ])}<div style="margin-top:8px;">${link("/product/cnhkmo/cnhkmo-unlimited-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>中港澳每日／總量</strong>`,
        "電信／聯通／CSL／CTM",
        "控管用量、要 GPT／TikTok",
        `${compareBullets([
          "新加坡 IP；高速用完後約 128kbps。",
        ])}<div style="margin-top:8px;">${link("/product/cnhkmo/cnhkmo-daily-esim/", "每日型")} · ${link("/product/cnhkmo/cnhkmo-total-esim/", "總量型")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款中港澳 eSIM 最適合您？</h4>${table}`;
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
      html: `<span class="jeko-sum-warn">建議抵達中港澳覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
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
    ${cnhkmoCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(), introHtml].join("\n");
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export const CNHKMO_UNLIM_SHORT_DETAILED = buildDetailed({
  carrierHtml: "中國電信／聯通／CSL／澳門電訊（短天數・T+C）",
  speedHtml: "約 10Mbps 吃到飽（FUP）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 中港澳吃到飽（<strong>短天數・1～10 天</strong>），走中國電信／聯通／CSL／澳門電訊（T+C），出網為<strong>新加坡 IP</strong>。",
    "約 10Mbps FUP。支援 ChatGPT／TikTok／Gemini。僅數據。",
  ],
  bullets: [
    "運營商：中國電信／聯通／CSL／澳門電訊・新加坡 IP（T+C）",
    "流量：約 10Mbps 吃到飽（FUP）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const CNHKMO_UNLIM_LONG_DETAILED = buildDetailed({
  carrierHtml: "中國電信／聯通／CSL／澳門電訊（長天數）",
  speedHtml: "約 10Mbps 吃到飽（FUP）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 中港澳吃到飽（<strong>長天數・11 天起</strong>），走中國電信／聯通／CSL／澳門電訊，出網為<strong>新加坡 IP</strong>。",
    "約 10Mbps FUP。支援 ChatGPT／TikTok／Gemini。僅數據。",
  ],
  bullets: [
    "運營商：中國電信／聯通／CSL／澳門電訊・新加坡 IP",
    "流量：約 10Mbps 吃到飽（FUP）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const CNHKMO_DAILY_DETAILED = buildDetailed({
  carrierHtml: "中國電信／聯通／CSL／澳門電訊",
  speedHtml: "每日高速用完後約 128kbps（另有約 5Mbps 續航選項）",
  planTypeLabel: "每日型",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 中港澳每日型，走 <strong>中國電信／聯通／CSL／澳門電訊</strong>，出網為新加坡 IP。",
    "可選每日 500MB～3GB；用完後約 128kbps（或約 5Mbps 續航）。",
  ],
  bullets: [
    "運營商：中國電信／聯通／CSL／澳門電訊・新加坡 IP",
    "流量：每日額度；用完後約 128kbps（或 5Mbps 續航）",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const CNHKMO_TOTAL_DETAILED = buildDetailed({
  carrierHtml: "中國電信／聯通／CSL／澳門電訊",
  speedHtml: "總量高速用完後約 128kbps 可持續使用",
  planTypeLabel: "總量型",
  routeHtml: "漫遊（新加坡 IP）",
  introParas: [
    "jeko eSIM 中港澳總量型，走 <strong>中國電信／聯通／CSL／澳門電訊</strong>，於有效天數內共用固定總流量。",
    "高速用完後約 128kbps 可持續使用。支援 ChatGPT／TikTok／Gemini。",
  ],
  bullets: [
    "運營商：中國電信／聯通／CSL／澳門電訊・新加坡 IP",
    "流量：總量高速；用完後約 128kbps 續航",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達當地連網並開始使用數據後才開始計算",
  ],
});

export const CNHKMO_USAGE_SHORT = usageAdvantagesSection({
  title: "使用 jeko 中港澳短天數 eSIM 的優勢",
  subtitle: "T+C・約 10Mbps・新加坡 IP",
  items: [
    { iconName: "public", title: "一卡三地", descHtml: "中國大陸、香港、澳門同一張 eSIM。" },
    { iconName: "speed", title: "約 10Mbps 吃到飽", descHtml: "T+C 線路 FUP，適合短天數整天連線。" },
    { iconName: "forum", title: "免 VPN 社群", descHtml: "新加坡 IP 下 LINE／IG／FB／TikTok 多數可用（依路由而定）。" },
    { iconName: "smart_toy", title: "ChatGPT／Gemini", descHtml: "標示支援 ChatGPT、TikTok、Gemini。" },
    { iconName: "qr_code_2", title: "快速交付", descHtml: "付款後數分鐘內以 Email 寄送 QR Code。" },
    { iconName: "flight_land", title: "抵達再啟用", descHtml: "建議抵達覆蓋範圍後再安裝／開啟行動數據。" },
  ],
});

export const CNHKMO_USAGE_LONG = usageAdvantagesSection({
  title: "使用 jeko 中港澳長天數 eSIM 的優勢",
  subtitle: "約 10Mbps・新加坡 IP",
  items: [
    { iconName: "public", title: "一卡三地", descHtml: "電信／聯通／CSL／CTM 四網覆蓋。" },
    { iconName: "speed", title: "約 10Mbps 吃到飽", descHtml: "適合社群與輕量影音（依環境而定）。" },
    { iconName: "smart_toy", title: "支援 AI／短影音", descHtml: "標示支援 ChatGPT、TikTok、Gemini。" },
    { iconName: "qr_code_2", title: "快速交付", descHtml: "付款後數分鐘內以 Email 寄送 QR Code。" },
    { iconName: "flight_land", title: "抵達再啟用", descHtml: "建議抵達覆蓋範圍後再安裝／開啟行動數據。" },
  ],
});

export const CNHKMO_USAGE_TC = usageAdvantagesSection({
  title: "使用 jeko 中港澳電信／聯通 eSIM 的優勢",
  subtitle: "每日／總量・新加坡 IP",
  items: [
    { iconName: "swap_horiz", title: "四網互補", descHtml: "中國電信／聯通／CSL／澳門電訊自動切換。" },
    { iconName: "speed", title: "用量可控", descHtml: "每日或總量高速用完後約 128kbps 續航。" },
    { iconName: "smart_toy", title: "支援 AI／短影音", descHtml: "標示支援 ChatGPT、TikTok、Gemini。" },
    { iconName: "qr_code_2", title: "快速交付", descHtml: "付款後數分鐘內以 Email 寄送 QR Code。" },
    { iconName: "flight_land", title: "抵達再啟用", descHtml: "建議抵達覆蓋範圍後再安裝／開啟行動數據。" },
  ],
});

function sharedFaq(name) {
  return [
    {
      question: `我的手機是否支援在中港澳使用 eSIM？`,
      answerHtml: [
        p(`大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`),
        p(`亦請確認裝置已解鎖，且系統版本支援 eSIM。`, 0),
      ].join(""),
    },
    {
      question: `${name} 何時開始計算效期？`,
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達目的地後再啟用。`,
        0,
      ),
    },
    {
      question: "可以免 VPN 用社群嗎？",
      answerHtml: p(
        `出網為香港／新加坡 IP 時，LINE、Instagram、Facebook 多數可免 VPN（實際依當下路由，非保證每位用戶／每個時段）。`,
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

export const CNHKMO_FAQ_SHORT = faqAccordion(
  [
    ...sharedFaq("中港澳短天數吃到飽"),
    {
      question: "短天數與長天數差在哪？",
      answerHtml: p(
        `短天數（1～10 天）與長天數（11 天起）皆為同一 T+C 線路：新加坡 IP、約 10Mbps、電信／聯通／CSL／澳門電訊；差別主要在天數區間。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const CNHKMO_FAQ_LONG = faqAccordion(
  [
    ...sharedFaq("中港澳長天數吃到飽"),
    {
      question: "約 10Mbps 吃到飽會變慢嗎？",
      answerHtml: p(
        `本方案為約 10Mbps FUP，繁忙時段或弱訊號時速度可能下降，實際依環境而定。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const CNHKMO_FAQ_DAILY = faqAccordion(
  [
    ...sharedFaq("中港澳每日型"),
    {
      question: "每日額度用完會怎樣？",
      answerHtml: p(
        `高速用完後一般降速至約 <strong>128kbps</strong>（另有約 5Mbps 續航選項），隔日重置。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export const CNHKMO_FAQ_TOTAL = faqAccordion(
  [
    ...sharedFaq("中港澳總量型"),
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
  CNHKMO_UNLIM_SHORT_DETAILED,
  CNHKMO_UNLIM_LONG_DETAILED,
  CNHKMO_DAILY_DETAILED,
  CNHKMO_TOTAL_DETAILED,
  CNHKMO_USAGE_SHORT,
  CNHKMO_USAGE_LONG,
  CNHKMO_USAGE_TC,
  CNHKMO_FAQ_SHORT,
  CNHKMO_FAQ_LONG,
  CNHKMO_FAQ_DAILY,
  CNHKMO_FAQ_TOTAL,
};
