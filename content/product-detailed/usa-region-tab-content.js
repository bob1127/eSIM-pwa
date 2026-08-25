/**
 * 美國本土／美加／北美（美加墨）— 下方 tab 內容
 * 規則：jeko 品牌、方案詳情卡、方案重點、比較表（黑點無 emoji）、不展示 API／SKU
 *
 * Medusa handles：
 *   usa-mainland-unlimited / daily-usip / total-usip
 *   us-canada-unlimited / daily / total
 *   north-america-att-unlimited / daily-usip / total-usip
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

const coverageUsa =
  "紐約、洛杉磯、舊金山、芝加哥、拉斯維加斯等美國本土主要城市與交通沿線。<span class=\"jeko-sum-warn\">阿拉斯加、夏威夷使用不保證。</span>";

const coverageUsCa =
  "美國與加拿大主要城市、州際公路與熱門滑雪／觀光區。不含墨西哥。";

const coverageNa =
  "美國、加拿大、墨西哥主要城市與熱門跨境路線（實際覆蓋依地區與電信訊號而定）。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

export function usaCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>美國本土吃到飽</strong>`,
        "Verizon／T-Mobile<br>香港 IP",
        "純訪美、要吃到飽",
        `${compareBullets([
          "雙網互補，市區與跨州移動較安心。",
          "不限流量 FUP；典型速度約 8–20Mbps（視位置而定）。",
          "閘道為香港漫遊 IP（非美國原生 IP）。",
          "阿拉斯加／夏威夷不保證。",
        ])}<div style="margin-top:8px;">${link("/product/usa/usa-mainland-unlimited-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>美國 IP 每日／總量</strong>`,
        "Verizon USA／AT&T USA<br>美國 IP",
        "需要美國 IP 出口",
        `${compareBullets([
          "出網標示為美國 IP（漫遊批發線路，非原生門號卡）。",
          "每日型：高速額度用完後約 128kbps（每日重置）。",
          "總量型：高速用完後降速約 128kbps 無限續航。",
          "另有長天數與 60 天 Verizon（新加坡 IP）選項。",
        ])}<div style="margin-top:8px;">${link("/product/usa/usa-mainland-daily-usip-esim/", "每日型")} · ${link("/product/usa/usa-mainland-total-usip-esim/", "總量型")}</div>`,
      ],
      [
        `<strong>美加／北美</strong>`,
        "多網或 AT&T 號碼",
        "跨國行程",
        `${compareBullets([
          "美加兩國：選美加方案（不含墨西哥）。",
          "美加墨三國：選北美方案；需要美國門號請選 AT&T 美國號碼。",
        ])}<div style="margin-top:8px;">${link("/product/us-canada/us-canada-unlimited-esim/", "美加")} · ${link("/product/north-america/north-america-att-unlimited-esim/", "北美 AT&T")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款美國相關 eSIM 最適合您？</h4>${table}`;
}

export function usCanadaCompareTableSection() {
  const table = dataTable(
    ["產品", "覆蓋", "最適合", "優點與注意事項"],
    [
      [
        `<strong>美加吃到飽</strong>`,
        "美國＋加拿大",
        "自駕／滑雪／商務來回",
        `${compareBullets([
          "純數據、多組電信網可選。",
          "不含墨西哥；出網多為波蘭 IP 漫遊節點。",
          "公平使用政策下可持續上網。",
        ])}<div style="margin-top:8px;">${link("/product/us-canada/us-canada-unlimited-esim/", "查看吃到飽")}</div>`,
      ],
      [
        `<strong>美加每日／總量</strong>`,
        "美國＋加拿大",
        "用量可控、短中行程",
        `${compareBullets([
          "每日型：高速用完後多數降速續航（約 128～512kbps，依線路）。",
          "總量型：高速 GB 用完後斷網，請預留餘量。",
          "不含墨西哥與美國門號。",
        ])}<div style="margin-top:8px;">${link("/product/us-canada/us-canada-daily-esim/", "每日型")} · ${link("/product/us-canada/us-canada-total-esim/", "總量型")}</div>`,
      ],
      [
        `<strong>北美美加墨</strong>`,
        "美＋加＋墨",
        "三國行程／要美國號碼",
        `${compareBullets([
          "純數據美國 IP：北美每日／總量。",
          "要 +1 美國號碼與通話簡訊：AT&T 美國號碼吃到飽。",
        ])}<div style="margin-top:8px;">${link("/product/north-america/north-america-att-unlimited-esim/", "AT&T 美國號碼")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款美加／北美 eSIM 最適合您？</h4>${table}`;
}

export function northAmericaCompareTableSection() {
  const table = dataTable(
    ["產品", "特色", "最適合", "優點與注意事項"],
    [
      [
        `<strong>AT&T 美國號碼</strong>`,
        "美國原生 IP<br>含門號通話簡訊",
        "要美國號碼、美加墨互撥",
        `${compareBullets([
          "附 +1 AT&T 美國號碼；美加墨無限通話／簡訊。",
          "美／墨無限數據；加拿大 25GB 高速後約 512kbps。",
          "熱點僅限美國境內且不作保證；加／墨無法熱點。",
          "開通日期以美西時間為準，建議至少提前一天預訂。",
          `加拿大要更多高速／吃到飽 → ${link("/product/canada/canada-unlimited-esim/", "加拿大吃到飽")}`,
        ])}<div style="margin-top:8px;">${link("/product/north-america/north-america-att-unlimited-esim/", "查看方案")}</div>`,
      ],
      [
        `<strong>北美每日／總量（美國 IP）</strong>`,
        "純數據<br>無門號",
        "三國上網、不需門號",
        `${compareBullets([
          "Rogers＋Movistar＋Verizon USA／AT&T USA。",
          "出網美國 IP（漫遊批發，非原生門號卡）。",
          "每日型用完後多數降速；總量請依標示預留用量。",
        ])}<div style="margin-top:8px;">${link("/product/north-america/north-america-daily-usip-esim/", "每日型")} · ${link("/product/north-america/north-america-total-usip-esim/", "總量型")}</div>`,
      ],
      [
        `<strong>僅美加</strong>`,
        "不含墨西哥",
        "只跑美國與加拿大",
        `${compareBullets([
          "行程不含墨西哥時可選美加方案，通常更具彈性。",
        ])}<div style="margin-top:8px;">${link("/product/us-canada/us-canada-unlimited-esim/", "美加吃到飽")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款北美 eSIM 最適合您？</h4>${table}`;
}

function planCard(pairs, fullWidthHtml = expiryOnUse) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: fullWidthHtml },
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
  ekycHtml = "不需要",
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
      { iconName: "badge", label: "eKYC (身分驗證)", valueHtml: ekycHtml },
      { iconName: "mail", label: "交付", valueHtml: delivery },
    ],
    [
      { iconName: "public", label: "數據路由", valueHtml: routeHtml },
      { iconName: "payments", label: "充值選項", valueHtml: "無" },
    ],
  ];
}

function otherActivate(regionLabel, extraHtml = "") {
  return otherInfoBlock([
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">建議抵達${regionLabel}覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。${extraHtml}`,
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
  compareSection,
  regionLabel,
  hotspotHtml,
  phoneHtml,
  callHtml,
  smsHtml,
  ekycHtml,
  activateExtra = "",
  fullWidthHtml,
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
      ekycHtml,
    }),
    fullWidthHtml,
  );
  const introHtml = productIntroSection(`
    ${introParas.map((t) => paragraph(t, 16)).join("\n")}
    ${compareSection}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(regionLabel, activateExtra), introHtml].join(
    "\n",
  );
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

function buildUsage({ title, subtitle, items }) {
  return usageAdvantagesSection({ title, subtitle, items });
}

function buildFaq(items) {
  return faqAccordion(items, { defaultOpenIndex: 0 });
}

function sharedFaqItems(productName, regionHint) {
  return [
    {
      question: `我的手機是否支援在${regionHint}使用 eSIM？`,
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
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達目的地後再啟用；若提前安裝，請關閉該 eSIM 的行動數據。`,
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
    descHtml: "建議抵達覆蓋範圍後再安裝／開啟行動數據。",
  },
];

/* ========== 美國本土 ========== */

export const USA_UNLIM_DETAILED = buildDetailed({
  coverage: coverageUsa,
  carrierHtml: "Verizon／T-Mobile 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；吃到飽不限流量（FUP），典型約 8–20Mbps（視位置與擁塞而定）",
  planTypeLabel: "僅數據流量・吃到飽",
  routeHtml: "漫遊（香港 IP）",
  regionLabel: "美國",
  compareSection: usaCompareTableSection(),
  introParas: [
    "jeko eSIM 美國本土吃到飽方案，走 <strong>Verizon／T-Mobile</strong> 雙網，適合訪美觀光、探親與短中期停留。",
    "公平使用政策下可持續上網，導航、Uber、傳訊與輕量影音通常沒問題。支援熱點與 ChatGPT／TikTok／Gemini。",
    "出網為<strong>香港漫遊 IP</strong>（非美國原生 IP）。若您需要美國 IP 出口，請改選美國 IP 每日型或總量型。阿拉斯加、夏威夷使用不保證。",
  ],
  bullets: [
    "Verizon／T-Mobile 雙網互補，市區與州際移動較安心。",
    "吃到飽不限流量（FUP）；實際速度依位置與網路負載而定。",
    "支援熱點與常用 App（ChatGPT／TikTok／Gemini）。",
    "僅數據、無門號／傳統通話／簡訊。",
    "香港漫遊 IP；阿拉斯加／夏威夷不保證。建議抵達後再啟用。",
  ],
});

export const USA_DAILY_USIP_DETAILED = buildDetailed({
  coverage: coverageUsa,
  carrierHtml: "Verizon USA／AT&T USA 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速額度用完後約 128kbps（每日重置，實際依環境而定）",
  planTypeLabel: "僅數據流量・每日型",
  routeHtml: "漫遊（美國 IP）",
  regionLabel: "美國",
  compareSection: usaCompareTableSection(),
  introParas: [
    "jeko eSIM 美國本土每日型，走 <strong>Verizon USA／AT&T USA</strong>，出網標示為<strong>美國 IP</strong>（漫遊批發線路，非原生門號卡）。",
    "可選每日 500MB／1GB／2GB／3GB 等額度；高速用完後一般降速至約 128kbps，隔日重置。適合用量可控的短中行程。",
    "支援熱點與 ChatGPT／TikTok／Gemini。阿拉斯加、夏威夷不保證。",
  ],
  bullets: [
    "美國 IP 出口；Verizon＋AT&T 雙網覆蓋熱門城市與公路沿線。",
    "每日高速額度，用完後約 128kbps（每日重置）。",
    "支援熱點與常用 App。",
    "僅數據、無門號。需要吃到飽可改選美國本土吃到飽（香港 IP）。",
    "建議抵達後再啟用；阿拉斯加／夏威夷不保證。",
  ],
});

export const USA_TOTAL_USIP_DETAILED = buildDetailed({
  coverage: coverageUsa,
  carrierHtml: "Verizon USA／AT&T USA 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；高速額度用完後約 128kbps 無限續航（實際依環境而定）",
  planTypeLabel: "僅數據流量・總量型（高速後 FUP）",
  routeHtml: "漫遊（美國 IP）",
  regionLabel: "美國",
  compareSection: usaCompareTableSection(),
  introParas: [
    "jeko eSIM 美國總量型，走 <strong>Verizon USA／AT&T USA</strong>，出網<strong>美國 IP</strong>。於有效天數內提供高速總量，用完後降速約 128kbps 無限續航，比「用完斷網」更安心。",
    "適合跨州自駕與城市移動；支援熱點與常用 App。同商品另有長天數選項（含 60 天 Verizon）。",
  ],
  bullets: [
    "美國 IP＋Verizon／AT&T 雙網。",
    "高速 GB 用完後約 128kbps 無限續航。",
    "支援熱點與 ChatGPT／TikTok／Gemini。",
    "僅數據；阿拉斯加／夏威夷不保證。",
  ],
});

export const USA_TOTAL_LONG_USATT_DETAILED = buildDetailed({
  coverage: coverageUsa,
  carrierHtml: "長天數 Verizon USA／AT&T USA 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；高速約 30GB 後約 128kbps 無限續航",
  planTypeLabel: "僅數據流量・長天數總量型",
  routeHtml: "漫遊（美國 IP）",
  regionLabel: "美國",
  compareSection: usaCompareTableSection(),
  introParas: [
    "jeko eSIM <strong>長天數（約 15／20／30 天）</strong>美國總量型，走 Verizon USA／AT&T USA，出網<strong>美國 IP</strong>，高速約 30GB 後降速無限續航。",
    "適合打工度假、探親、商務短期派駐一次買足。請預估每月用量，避免高速段過早用完。",
  ],
  bullets: [
    "長天數一次覆蓋數週停留。",
    "美國 IP＋雙網；高速約 30GB 後約 128kbps 續航。",
    "支援熱點與常用 App。",
    "阿拉斯加／夏威夷不保證。",
  ],
});

export const USA_TOTAL_LONG_VZ_DETAILED = buildDetailed({
  coverage: coverageUsa,
  carrierHtml: "長天數 Verizon 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；高速 30GB／60GB 後約 128kbps 無限續航",
  planTypeLabel: "僅數據流量・60 天長駐總量型",
  routeHtml: "漫遊（新加坡 IP）",
  regionLabel: "美國",
  compareSection: usaCompareTableSection(),
  introParas: [
    "jeko eSIM <strong>約 60 天長駐</strong>總量型，走 <strong>Verizon</strong>，可選高速 30GB／60GB 後降速無限續航。出網為<strong>新加坡 IP</strong>（非美國 IP）。",
    "適合較長停留、減少中途續購。若您需要美國 IP，請改選同商品的 Verizon USA／AT&T USA 系列。",
  ],
  bullets: [
    "超長效期，適合約兩個月停留。",
    "Verizon 覆蓋美國本土主要都會與公路沿線。",
    "高速用完後約 128kbps 無限續航。",
    "新加坡 IP；需要美國 IP 請改選其他電信選項。",
  ],
});

export const USA_USAGE_UNLIM = buildUsage({
  title: "使用 jeko 美國本土吃到飽的優勢",
  subtitle: "Verizon／T-Mobile・不限流量",
  items: [
    {
      iconName: "swap_horiz",
      title: "雙網互補",
      descHtml: "Verizon 與 T-Mobile 覆蓋熱門城市與州際移動。",
    },
    {
      iconName: "all_inclusive",
      title: "吃到飽 FUP",
      descHtml: "公平使用政策下可持續上網，適合整天導航與傳訊。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享；支援 TikTok／ChatGPT／Gemini。",
    },
    ...usageDelivery,
  ],
});

export const USA_USAGE_USIP = buildUsage({
  title: "使用 jeko 美國 IP eSIM 的優勢",
  subtitle: "Verizon USA／AT&T・美國 IP 出口",
  items: [
    {
      iconName: "public",
      title: "美國 IP 出口",
      descHtml: "出網標示為美國 IP（漫遊批發線路，非原生門號卡）。",
    },
    {
      iconName: "network_cell",
      title: "雙網覆蓋",
      descHtml: "Verizon USA／AT&T USA，都會與公路沿線較穩定。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享；支援常用 AI／社群 App。",
    },
    ...usageDelivery,
  ],
});

export const USA_USAGE_LONG_VZ = buildUsage({
  title: "使用 jeko 美國長駐 Verizon 的優勢",
  subtitle: "約 60 天・新加坡 IP",
  items: [
    {
      iconName: "calendar_month",
      title: "長效一次買足",
      descHtml: "約兩個月停留，減少中途續購。",
    },
    {
      iconName: "network_cell",
      title: "Verizon 覆蓋",
      descHtml: "美國本土主要都會與公路沿線。",
    },
    {
      iconName: "speed",
      title: "高速後續航",
      descHtml: "高速 GB 用完後約 128kbps 無限續航。",
    },
    ...usageDelivery,
  ],
});

export const USA_FAQ_UNLIM = buildFaq([
  ...sharedFaqItems("美國本土吃到飽", "美國"),
  {
    question: "這是美國原生 IP 嗎？",
    answerHtml: p(
      `本吃到飽方案為<strong>香港漫遊 IP</strong>。若您需要美國 IP，請改選美國 IP 每日型或總量型。`,
      0,
    ),
  },
  {
    question: "阿拉斯加／夏威夷可以用嗎？",
    answerHtml: p(
      `受區域限制，<strong>阿拉斯加與夏威夷使用不保證</strong>。請以美國本土（美國大陸）為主要使用範圍。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度依當下網路與 FUP 而定。`, 0),
  },
]);

export const USA_FAQ_USIP = buildFaq([
  ...sharedFaqItems("美國 IP eSIM", "美國"),
  {
    question: "美國 IP 是原生門號卡嗎？",
    answerHtml: p(
      `出網標示為美國 IP，但仍屬<strong>漫遊批發線路</strong>，不附美國門號與傳統通話／簡訊。若需要美國號碼，請改選北美 AT&T 美國號碼方案。`,
      0,
    ),
  },
  {
    question: "每日型／總量型用完會怎樣？",
    answerHtml: p(
      `每日型：高速額度用完後約 <strong>128kbps</strong>，隔日重置。總量型：高速用完後約 <strong>128kbps 無限續航</strong>（非斷網）。實際以結帳頁標示為準。`,
      0,
    ),
  },
  {
    question: "阿拉斯加／夏威夷可以用嗎？",
    answerHtml: p(`不保證。請以美國本土為主要使用範圍。`, 0),
  },
]);

export const USA_FAQ_LONG_VZ = buildFaq([
  ...sharedFaqItems("美國長駐 Verizon", "美國"),
  {
    question: "為什麼是新加坡 IP？",
    answerHtml: p(
      `本長天數 Verizon 選項閘道為新加坡 IP。若您需要美國 IP，請在同商品切換至 Verizon USA／AT&T USA 系列。`,
      0,
    ),
  },
]);

/* ========== 美加 ========== */

function usCaDetailed({
  carrierHtml,
  speedHtml,
  planTypeLabel,
  introParas,
  bullets,
}) {
  return buildDetailed({
    coverage: coverageUsCa,
    carrierHtml,
    speedHtml,
    planTypeLabel,
    routeHtml: "漫遊（波蘭 IP）",
    regionLabel: "美加",
    compareSection: usCanadaCompareTableSection(),
    introParas,
    bullets,
  });
}

export const USCA_UNLIM_A0_DETAILED = usCaDetailed({
  carrierHtml: "US,CA 多網（Bell／Telus＋Verizon）4G／LTE／5G",
  speedHtml: "4G／LTE／5G；吃到飽（部分天數約 10Mbps 等級，實際依環境而定）",
  planTypeLabel: "僅數據流量・吃到飽",
  introParas: [
    "jeko eSIM <strong>美加（美國＋加拿大）</strong>吃到飽，走 US,CA 多網組合，純數據、不含墨西哥。",
    "適合美加自駕、滑雪與商務來回。出網多為波蘭 IP 漫遊節點。支援熱點與常用 App。",
  ],
  bullets: [
    "一卡暢遊美國與加拿大（不含墨西哥）。",
    "多網互補，跨境移動較有彈性。",
    "吃到飽可持續上網（實際速度依 FUP／位置而定）。",
    "支援熱點；無門號／傳統通話簡訊。",
  ],
});

export const USCA_UNLIM_VZ_BELL_DETAILED = usCaDetailed({
  carrierHtml: "Verizon＋Bell／Telus 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；吃到飽（實際速度依環境與方案規則而定）",
  planTypeLabel: "僅數據流量・吃到飽",
  introParas: [
    "jeko eSIM 美加吃到飽，走 <strong>Verizon＋Bell／Telus</strong>，覆蓋美國與加拿大主流網路。",
    "純數據方案，不含墨西哥。若行程含墨西哥或需要美國門號，請改選北美 AT&T 美國號碼。",
  ],
  bullets: [
    "美加雙國可用；Verizon 與加拿大 Bell／Telus 組合。",
    "適合跨國移動與城市觀光。",
    "支援熱點與 ChatGPT／TikTok／Gemini。",
    "不含墨西哥；波蘭 IP 漫遊節點。",
  ],
});

export const USCA_UNLIM_TM_DETAILED = usCaDetailed({
  carrierHtml: "T-Mobile／Verizon／AT&T＋加拿大多網 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；吃到飽不限流量（實際速度依環境而定）",
  planTypeLabel: "僅數據流量・吃到飽",
  introParas: [
    "jeko eSIM 美加吃到飽，走 <strong>美國三網＋加拿大多網</strong>，覆蓋面較廣，適合希望多網備援的旅客。",
    "純數據、不含墨西哥。支援熱點與常用 App。",
  ],
  bullets: [
    "美國 T-Mobile／Verizon／AT&T 與加拿大多網。",
    "吃到飽可持續上網。",
    "支援熱點；無門號。",
    "不含墨西哥；建議抵達後再啟用。",
  ],
});

export const USCA_DAILY_VZ_BELL_DETAILED = usCaDetailed({
  carrierHtml: "Verizon＋Bell／Telus 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；每日高速額度用完後請依方案標示（部分為斷網）",
  planTypeLabel: "僅數據流量・每日型",
  introParas: [
    "jeko eSIM 美加每日型，走 Verizon＋Bell／Telus。依天數提供每日高速額度，適合用量可控的美加行程。",
    "不含墨西哥。請依每日額度規劃地圖／熱點用量。",
  ],
  bullets: [
    "美加雙國每日額度。",
    "請留意高速用完後的規則（部分線路可能斷網）。",
    "支援熱點與常用 App。",
    "不含墨西哥與美國門號。",
  ],
});

export const USCA_DAILY_TM_DETAILED = usCaDetailed({
  carrierHtml: "T-Mobile／Verizon／AT&T＋加拿大 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；每日高速用完後約 384kbps 等級續航（實際依環境而定）",
  planTypeLabel: "僅數據流量・每日型",
  introParas: [
    "jeko eSIM 美加每日型，走美國三網＋加拿大，高速用完後多數可降速續航，適合仍想維持基本連線的旅客。",
  ],
  bullets: [
    "多網備援，移動中較安心。",
    "每日高速後降速續航（約 384kbps 等級）。",
    "支援熱點；不含墨西哥。",
  ],
});

export const USCA_DAILY_MULTI_DETAILED = usCaDetailed({
  carrierHtml: "Verizon／AT&T／T-Mobile＋加拿大多網 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；每日高速用完後約 512kbps 等級續航（實際依環境而定）",
  planTypeLabel: "僅數據流量・每日型",
  introParas: [
    "jeko eSIM 美加每日型，美國三網＋加拿大多網，高速用完後約 512kbps 等級續航，適合跨城市與較長天數行程。",
  ],
  bullets: [
    "覆蓋組合較廣。",
    "每日高速後約 512kbps 續航。",
    "支援熱點；不含墨西哥。",
  ],
});

export const USCA_TOTAL_A0_DETAILED = usCaDetailed({
  carrierHtml: "Bell／Telus＋Verizon（A0）4G／LTE／5G",
  speedHtml: "4G／LTE／5G；總量高速用完後斷網",
  planTypeLabel: "僅數據流量・總量型（用完斷網）",
  introParas: [
    "jeko eSIM 美加總量型，走 Bell／Telus＋Verizon。高速 GB 用完後會<strong>斷網</strong>，請預留餘量或改選吃到飽／每日型。",
  ],
  bullets: [
    "美加雙國共用總流量。",
    "用完斷網（非降速 FUP）。",
    "支援熱點；不含墨西哥。",
  ],
});

export const USCA_TOTAL_B_DETAILED = usCaDetailed({
  carrierHtml: "T-Mobile／AT&T／Verizon＋加拿大多網 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；總量高速用完後斷網",
  planTypeLabel: "僅數據流量・總量型（用完斷網）",
  introParas: [
    "jeko eSIM 美加總量型 B 線，美國三網＋加拿大多網，覆蓋較廣。高速用完後斷網，請依總 GB 規劃兩國用量。",
  ],
  bullets: [
    "多網覆蓋，適合跨州／跨境自駕。",
    "總量用完斷網，請預留緩衝。",
    "支援熱點；不含墨西哥。",
  ],
});

export const USCA_USAGE_UNLIM = buildUsage({
  title: "使用 jeko 美加吃到飽的優勢",
  subtitle: "美國＋加拿大・純數據",
  items: [
    {
      iconName: "public",
      title: "雙國一卡",
      descHtml: "美國與加拿大共用，跨境不必換卡（不含墨西哥）。",
    },
    {
      iconName: "swap_horiz",
      title: "多網可選",
      descHtml: "依需求選擇多網組合，移動中較有備援。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享；支援常用 App。",
    },
    ...usageDelivery,
  ],
});

export const USCA_USAGE_DAILY = buildUsage({
  title: "使用 jeko 美加每日型的優勢",
  subtitle: "額度可控・雙國可用",
  items: [
    {
      iconName: "today",
      title: "每日額度",
      descHtml: "依行程選擇每日流量，好掌握用量。",
    },
    {
      iconName: "public",
      title: "美加雙國",
      descHtml: "自駕、滑雪、城市觀光一卡搞定。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "請依每日額度規劃熱點與地圖用量。",
    },
    ...usageDelivery,
  ],
});

export const USCA_USAGE_TOTAL = buildUsage({
  title: "使用 jeko 美加總量型的優勢",
  subtitle: "總 GB・用完斷網請預留",
  items: [
    {
      iconName: "data_usage",
      title: "總量一次選好",
      descHtml: "適合可預估用量的短中行程。",
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

export const USCA_FAQ = buildFaq([
  ...sharedFaqItems("美加 eSIM", "美國或加拿大"),
  {
    question: "包含墨西哥嗎？",
    answerHtml: p(
      `不含。美加方案僅美國＋加拿大。若行程含墨西哥，請改選${link("/product/north-america/north-america-att-unlimited-esim/", "北美 AT&T 美國號碼")}或北美每日／總量方案。`,
      0,
    ),
  },
  {
    question: "總量型用完會怎樣？",
    answerHtml: p(
      `美加總量型高速用完後會<strong>斷網</strong>。若需要用完仍可上網，請改選吃到飽或每日型（多數可降速續航）。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以；實際速度與剩餘額度依所選方案而定。`, 0),
  },
]);

/* ========== 北美（美加墨） ========== */

const attActivationPolicy = `開通日期以<strong>美西時間 (PT)</strong>為準，服務將於該日上午 9:00 前自動啟用。<span class="jeko-sum-warn">建議至少提前一天預訂</span>，以確保準時開通。`;

export const NA_ATT_DETAILED = buildDetailed({
  coverage: coverageNa,
  carrierHtml: "AT&T（美國）／Rogers（加拿大）／AT&T（墨西哥）",
    speedHtml:
    "4G／5G；美／墨無限流量；加拿大 25GB 高速後約 512kbps 吃到飽",
  planTypeLabel: "數據＋通話＋簡訊・吃到飽",
  routeHtml: "本地（美國原生 IP）",
  regionLabel: "北美（美加墨）",
  compareSection: northAmericaCompareTableSection(),
  hotspotHtml:
    "僅限美國境內，且可用性不作保證；加拿大與墨西哥境內無法使用熱點",
  phoneHtml: "有（+1 AT&T 美國號碼）",
  callHtml: "美加墨境內及跨國互撥免費（無限）",
  smsHtml: "美加墨境內及跨國互傳免費（無限）",
  ekycHtml: "依開通流程（請依說明完成）",
  activateExtra: `<div style="margin-top:8px;">${attActivationPolicy}</div>`,
  fullWidthHtml: `${expiryOnUse}<div style="margin-top:10px;">${attActivationPolicy}</div>`,
  introParas: [
    "jeko eSIM <strong>北美 AT&T 美國號碼</strong>方案：附一組 <strong>+1 AT&T</strong> 電話號碼，美國原生 IP，一卡暢遊美國、加拿大、墨西哥。",
    `美／墨無限數據；加拿大提供 <strong>25GB 高速</strong>（用盡後約 512kbps 吃到飽）。若您在加拿大需要更多高速或吃到飽，可改選 ${link("/product/canada/canada-unlimited-esim/", "加拿大吃到飽")}。三國境內及跨國<strong>無限通話與簡訊免費</strong>。`,
    "熱點僅限美國境內且不作保證；加拿大與墨西哥無法使用熱點。建議以已解鎖 iPhone 為主；部分 Android 可能可用但不保證相容。",
  ],
  bullets: [
    "正宗美國電話號碼，可接聽通話與收發簡訊。",
    "美國原生 IP；加拿大／墨西哥使用數據時請開啟此 eSIM 的數據漫遊。",
    `美墨無限數據；加拿大 25GB 高速後降速續航。加拿大要更多高速／吃到飽 → ${link("/product/canada/canada-unlimited-esim/", "加拿大吃到飽")}。`,
    "美加墨無限通話與簡訊。",
    "熱點僅限美國且不作保證；開通請依美西時間預約。",
  ],
});

export const NA_DAILY_A0_DETAILED = buildDetailed({
  coverage: coverageNa,
  carrierHtml: "Rogers＋Movistar＋Verizon USA／AT&T USA 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；每日高速用完後多數約 128kbps（部分方案約 5／10Mbps，以選項標示為準）",
  planTypeLabel: "僅數據流量・每日型",
  routeHtml: "漫遊（美國 IP）",
  regionLabel: "北美（美加墨）",
  compareSection: northAmericaCompareTableSection(),
  introParas: [
    "jeko eSIM <strong>北美（美加墨）每日型</strong>，純數據、美國 IP 出口，三國一卡。適合不需要美國門號、只要穩定上網的跨境行程。",
    "電信為 Rogers（加）＋Movistar（墨）＋Verizon USA／AT&T USA。支援熱點與常用 App。若需要美國號碼，請改選 AT&T 美國號碼方案。",
  ],
  bullets: [
    "美國＋加拿大＋墨西哥一卡。",
    "美國 IP 出口（漫遊批發，非原生門號卡）。",
    "每日高速額度；用完後多數降速續航。",
    "支援熱點；無門號／傳統通話簡訊。",
  ],
});

export const NA_DAILY_A1_DETAILED = buildDetailed({
  coverage: coverageNa,
  carrierHtml: "Rogers＋Movistar＋Verizon USA／AT&T USA（A1）",
  speedHtml:
    "4G／LTE／5G；每日高速用完後約 128kbps 或約 10Mbps（以選項標示為準）",
  planTypeLabel: "僅數據流量・每日型",
  routeHtml: "漫遊（美國 IP）",
  regionLabel: "北美（美加墨）",
  compareSection: northAmericaCompareTableSection(),
  introParas: [
    "jeko eSIM 北美每日型 A1 線路，同樣覆蓋美加墨、美國 IP。部分額度選項高速用完後維持較高續航速度，請以結帳頁標示為準。",
  ],
  bullets: [
    "三國覆蓋；美國 IP。",
    "每日額度，適合可控用量。",
    "支援熱點；需要門號請選 AT&T 美國號碼。",
  ],
});

export const NA_TOTAL_DETAILED = buildDetailed({
  coverage: coverageNa,
  carrierHtml: "Rogers＋Movistar＋Verizon USA／AT&T USA 4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G；高速用完後多數約 128kbps 續航（部分可能斷網，以選項標示為準）",
  planTypeLabel: "僅數據流量・總量型",
  routeHtml: "漫遊（美國 IP）",
  regionLabel: "北美（美加墨）",
  compareSection: northAmericaCompareTableSection(),
  introParas: [
    "jeko eSIM <strong>北美總量型</strong>，美加墨三國共用總流量，出網美國 IP。適合可預估用量的跨境自駕或多國觀光。",
    "請依總 GB 規劃三國用量並預留緩衝。需要美國號碼請改選 AT&T 美國號碼吃到飽。",
  ],
  bullets: [
    "三國一卡、美國 IP。",
    "總量高速；用完後規則依選項標示（多數降速續航）。",
    "支援熱點與常用 App。",
    "純數據、無門號。",
  ],
});

export const NA_USAGE_ATT = buildUsage({
  title: "使用 jeko 北美 AT&T 美國號碼的優勢",
  subtitle: "美國號碼・美加墨通話簡訊",
  items: [
    {
      iconName: "call",
      title: "+1 美國號碼",
      descHtml: "可接聽通話與收發簡訊，方便訂車、餐廳與雙重驗證。",
    },
    {
      iconName: "public",
      title: "三國漫遊",
      descHtml: "美加墨一卡；加／墨請開啟數據漫遊。",
    },
    {
      iconName: "all_inclusive",
      title: "無限通話簡訊",
      descHtml: "三國境內及跨國互撥／互傳免費。",
    },
    {
      iconName: "schedule",
      title: "預約開通",
      descHtml: "依美西時間預約啟用日，建議提前一天預訂。",
    },
    ...usageDelivery.slice(0, 1),
  ],
});

export const NA_USAGE_USIP = buildUsage({
  title: "使用 jeko 北美美國 IP eSIM 的優勢",
  subtitle: "美加墨純數據・無門號",
  items: [
    {
      iconName: "public",
      title: "三國一卡",
      descHtml: "美國、加拿大、墨西哥共用，跨境自駕較方便。",
    },
    {
      iconName: "language",
      title: "美國 IP 出口",
      descHtml: "漫遊批發線路，適合一般上網與社群。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享；支援常用 App。",
    },
    ...usageDelivery,
  ],
});

export const NA_FAQ_ATT = buildFaq([
  ...sharedFaqItems("北美 AT&T 美國號碼", "北美"),
  {
    question: "開通要等多久？可以當天用嗎？",
    answerHtml: p(
      `開通日期以<strong>美西時間 (PT)</strong>為準，並建議<strong>至少提前一天</strong>預訂。請勿假設下單後可立即啟用當地門號服務。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(
      `熱點<strong>僅限美國境內</strong>，且可用性不作保證；<strong>加拿大與墨西哥無法使用熱點</strong>。`,
      0,
    ),
  },
  {
    question: "在加拿大／墨西哥要開什麼設定？",
    answerHtml: p(
      `請啟用此 eSIM 的<strong>數據漫遊</strong>，才能在加拿大與墨西哥使用數據。加拿大高速額度為 25GB，用盡後約 512kbps。若加拿大需要更多高速／吃到飽，可改選 ${link("/product/canada/canada-unlimited-esim/", "加拿大吃到飽")}。`,
      0,
    ),
  },
  {
    question: "加拿大只有 25GB 高速，有其他選擇嗎？",
    answerHtml: p(
      `有。本方案在加拿大為 25GB 高速後降速續航。若您主要以加拿大上網、需要吃到飽，建議改選 ${link("/product/canada/canada-unlimited-esim/", "加拿大吃到飽")}（亦可在美國使用，不含墨西哥）。`,
      0,
    ),
  },
  {
    question: "Android 可以用嗎？",
    answerHtml: p(
      `建議以已解鎖 <strong>iPhone</strong> 為主。部分 Android 可能可用，但受限於電信商規範無法保證相容，請自行評估。`,
      0,
    ),
  },
]);

export const NA_FAQ_USIP = buildFaq([
  ...sharedFaqItems("北美美國 IP eSIM", "北美"),
  {
    question: "有美國電話號碼嗎？",
    answerHtml: p(
      `本系列為純數據、無門號。若需要 +1 美國號碼與通話簡訊，請改選${link("/product/north-america/north-america-att-unlimited-esim/", "AT&T 美國號碼")}方案。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以；實際速度與額度依所選每日／總量方案而定。`, 0),
  },
]);
