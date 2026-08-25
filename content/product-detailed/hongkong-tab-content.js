/**
 * 香港 eSIM — 下方 tab 內容（方案詳情／產品介紹／使用介紹／FAQ）
 * 規則：jeko 品牌、方案詳情卡、方案重點、比較表（黑點無 emoji）、不展示 API／SKU
 *
 * 電信對應（Medusa 選項值）：
 *   hongkong-unlimited-esim → CSL / China Telecom HK（香港 IP・每日 1GB＋10Mbps）
 *   hongkong-daily-esim     → 3HK（馬來西亞 IP・每日高速）
 *   hongkong-total-esim     → 3HK（馬來西亞 IP・總量高速）
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
  "香港島、九龍、新界、機場、迪士尼、昂坪／大嶼山等主要市區與旅遊景點。";

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

/** 哪款香港 eSIM 最適合您？ */
export function hongkongCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>香港 eSIM 吃到飽</strong>`,
        "CSL／China Telecom HK<br>香港 IP",
        "整天有網<br>要香港原生 IP",
        `${compareBullets([
          "每日約 1GB 高速後維持約 10Mbps 無限流量（實際速度依環境而定）。",
          "香港原生 IP，適合地圖、交通 App 與一般上網。",
          "本線路不標示熱點分享、ChatGPT、TikTok、Gemini（供應商未保證）。",
          "效期為抵達連網使用後開始計算；建議抵達香港覆蓋範圍後再安裝。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/hongkong/hongkong-unlimited-esim/", "香港吃到飽 eSIM")}。</div>`,
      ],
      [
        `<strong>香港 eSIM 吃到飽（多網約 10Mbps）</strong>`,
        "CUCC／China Telecom<br>+ CSL + CTM<br>新加坡 IP",
        "要熱點／TikTok<br>約 10Mbps 吃到飽",
        `${compareBullets([
          "約 10Mbps 無限流量；支援熱點、TikTok、Gemini。",
          "新加坡 IP，一般可免 VPN 使用 LINE／IG／FB。",
          "多網互補：聯通／中國電信、香港 CSL、澳門 CTM。",
          "效期為抵達連網使用後開始計算。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/hongkong/hongkong-unlimited-esim/", "香港吃到飽 eSIM")} 切換電信商。</div>`,
      ],
      [
        `<strong>香港 eSIM 每日型</strong>`,
        "3HK<br>馬來西亞 IP",
        "行程天數固定<br>要熱點／社群 App",
        `${compareBullets([
          "可選每日 500MB／1GB／2GB／3GB 高速；用完後約 128kbps，每日重置。",
          "3HK 覆蓋，熱門區域與交通沿線表現穩定。",
          "支援熱點分享；支援 ChatGPT、TikTok、Gemini。",
          "馬來西亞 IP 漫遊；效期為連網使用後開始計算。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/hongkong/hongkong-daily-esim/", "香港每日型 eSIM")}。</div>`,
      ],
      [
        `<strong>香港 eSIM 總量型</strong>`,
        "3HK<br>馬來西亞 IP",
        "總量控管<br>要熱點／社群 App",
        `${compareBullets([
          "有效天數內共用固定總流量；高速用完後約 128kbps 可持續使用。",
          "3HK 覆蓋；支援熱點與 ChatGPT／TikTok／Gemini。",
          "請預留流量緩衝，避免旅途中不夠用。",
          "馬來西亞 IP 漫遊；效期為連網使用後開始計算。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/hongkong/hongkong-total-esim/", "香港總量型 eSIM")}。</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款香港 eSIM 最適合您？</h4>${table}`;
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
      html: `<span class="jeko-sum-warn">建議抵達香港覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);
}

/** 吃到飽｜CSL / China Telecom HK */
export function buildHkUnlimitedDetailed() {
  const planHtml = planCard(
    basePairs({
      carrierHtml: "CSL／China Telecom HK（香港電信／中國電信香港）4G／LTE／5G",
      speedHtml:
        "4G／LTE／5G；每日約 1GB 高速後維持約 10Mbps 吃到飽（實際速度依環境而定）",
      planTypeHtml: "僅數據流量・吃到飽",
      routeHtml: "本地（香港 IP）",
      hotspotHtml: "不標示支援（供應商未保證）",
    }),
  );

  const introHtml = productIntroSection(`
    ${paragraph(
      "jeko eSIM 香港吃到飽方案，讓您在香港島、九龍、新界與機場沿線輕鬆保持連線，無需昂貴漫遊費。",
      16,
    )}
    ${paragraph(
      "由 CSL 與 China Telecom HK（中國電信香港）雙網互補，出網為<strong>香港 IP</strong>，適合地圖、交通 App 與一般上網。每日約 1GB 高速額度後，仍維持約 10Mbps 無限流量，適合整天有網的行程。",
      16,
    )}
    ${paragraph(
      "本方案為數據專用 eSIM，無門號／傳統通話／簡訊。供應商未標示熱點分享、ChatGPT、TikTok、Gemini；若您需要熱點與社群影音 App，請改選每日型或總量型（3HK），或同商品的多網約 10Mbps 線路。",
      20,
    )}
    ${hongkongCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "運營商：CSL／China Telecom HK・香港 IP・4G／LTE／5G",
      "流量：每日約 1GB 高速後約 10Mbps 吃到飽（實際速度依環境而定）",
      "僅數據：無門號／傳統通話／簡訊",
      "本線路不標示熱點／ChatGPT／TikTok／Gemini",
      "效期：抵達當地連網並開始使用數據後才開始計算",
      "建議抵達香港覆蓋範圍後再安裝／啟用",
    ])}
  `);

  return [planHtml, otherActivate(), introHtml].join("\n");
}

/** 吃到飽｜CUCC / China Telecom + CSL + CTM（不標中港澳通用） */
export function buildHkUnlimitedTcDetailed() {
  const planHtml = planCard(
    basePairs({
      carrierHtml:
        "CUCC／China Telecom + CSL + CTM（聯通／中國電信／香港電信／澳門電訊）4G／LTE／5G",
      speedHtml: "4G／LTE／5G；約 10Mbps 吃到飽（實際速度依環境而定）",
      planTypeHtml: "僅數據流量・吃到飽",
      routeHtml: "漫遊（新加坡 IP）",
      hotspotHtml: "支持",
    }),
  );

  const introHtml = productIntroSection(`
    ${paragraph(
      "jeko eSIM 香港吃到飽多網方案，約 10Mbps 無限流量，出網為<strong>新加坡 IP</strong>，適合需要熱點與社群影音 App 的旅客。",
      16,
    )}
    ${paragraph(
      "走 CUCC／China Telecom + CSL + CTM 多網互補，可在香港使用並涵蓋鄰近常用目的地網路。支援熱點分享，並支援 TikTok、Gemini（實際依裝置與平台）。",
      16,
    )}
    ${paragraph(
      "僅數據、無門號／傳統通話／簡訊。若您偏好香港原生 IP、且不需熱點／TikTok，可改選同商品的 CSL／China Telecom HK。",
      20,
    )}
    ${hongkongCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "運營商：CUCC／China Telecom + CSL + CTM・新加坡 IP・約 10Mbps",
      "支援熱點；支援 TikTok、Gemini",
      "一般可免 VPN 使用 LINE／IG／FB（實際依路由）",
      "僅數據：無門號／傳統通話／簡訊",
      "效期：抵達當地連網並開始使用數據後才開始計算",
      "建議抵達覆蓋範圍後再安裝／啟用",
    ])}
  `);

  return [planHtml, otherActivate(), introHtml].join("\n");
}

/** 每日型｜3HK */
export function buildHkDailyDetailed() {
  const planHtml = planCard(
    basePairs({
      carrierHtml: "3HK（香港電訊盈科／3）4G／5G",
      speedHtml:
        "4G／5G；每日高速額度用完後約 128kbps（每日重置，實際依環境而定）",
      planTypeHtml: "僅數據流量・每日型",
      routeHtml: "漫遊（馬來西亞 IP）",
      hotspotHtml: "支持",
    }),
  );

  const introHtml = productIntroSection(`
    ${paragraph(
      "jeko eSIM 香港每日型方案，走 <strong>3HK</strong> 網路，出網為<strong>馬來西亞 IP</strong>，適合行程天數固定、想控管每日用量的旅客。",
      16,
    )}
    ${paragraph(
      "可選每日 500MB／1GB／2GB／3GB 高速額度；高速用完後一般降速至約 128kbps，並於隔日重置。香港熱門區域與機場沿線覆蓋良好。",
      16,
    )}
    ${paragraph(
      "支援熱點分享，並支援 ChatGPT、TikTok、Gemini。僅數據、無門號／傳統通話／簡訊；效期為抵達連網使用後開始計算。",
      20,
    )}
    ${hongkongCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "運營商：3HK・馬來西亞 IP・4G／5G",
      "流量：可選每日 500MB／1GB／2GB／3GB；用完後約 128kbps（每日重置）",
      "支援熱點分享；支援 ChatGPT、TikTok、Gemini",
      "僅數據：無門號／傳統通話／簡訊",
      "效期：抵達當地連網並開始使用數據後才開始計算",
      "建議抵達香港覆蓋範圍後再安裝／啟用",
    ])}
  `);

  return [planHtml, otherActivate(), introHtml].join("\n");
}

/** 總量型｜3HK */
export function buildHkTotalDetailed() {
  const planHtml = planCard(
    basePairs({
      carrierHtml: "3HK（香港電訊盈科／3）4G／5G",
      speedHtml:
        "4G／5G；總量高速用完後約 128kbps 可持續使用（實際依環境而定）",
      planTypeHtml: "僅數據流量・總量型",
      routeHtml: "漫遊（馬來西亞 IP）",
      hotspotHtml: "支持",
    }),
  );

  const introHtml = productIntroSection(`
    ${paragraph(
      "jeko eSIM 香港總量型方案，走 <strong>3HK</strong> 網路，出網為<strong>馬來西亞 IP</strong>，於有效天數內共用固定總流量，適合想一次選好用量的旅客。",
      16,
    )}
    ${paragraph(
      "高速額度用完後一般降速至約 128kbps 可持續使用。請依行程預留流量緩衝。適合市區與機場移動。",
      16,
    )}
    ${paragraph(
      "支援熱點分享，並支援 ChatGPT、TikTok、Gemini。僅數據、無門號／傳統通話／簡訊；效期為抵達連網使用後開始計算。",
      20,
    )}
    ${hongkongCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "運營商：3HK・馬來西亞 IP・4G／5G",
      "流量：有效天數內共用總量高速；用完後約 128kbps",
      "支援熱點分享；支援 ChatGPT、TikTok、Gemini",
      "僅數據：無門號／傳統通話／簡訊",
      "效期：抵達當地連網並開始使用數據後才開始計算",
      "建議抵達香港覆蓋範圍後再安裝／啟用",
    ])}
  `);

  return [planHtml, otherActivate(), introHtml].join("\n");
}

export function buildHkUsage({ title, subtitle, items }) {
  return usageAdvantagesSection({ title, subtitle, items });
}

export function buildHkFaq(items) {
  return faqAccordion(items, { defaultOpenIndex: 0 });
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export function hongkongSharedFaqItems(productName = "香港 eSIM") {
  return [
    {
      question: `我的手機是否支援在香港使用 eSIM？`,
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
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達香港後再啟用；若提前安裝，請關閉該 eSIM 的行動數據。`,
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
    descHtml: "建議抵達香港覆蓋範圍後再安裝／開啟行動數據。",
  },
];

export const HK_UNLIMITED_DETAILED = buildHkUnlimitedDetailed();
export const HK_UNLIMITED_TC_DETAILED = buildHkUnlimitedTcDetailed();
export const HK_DAILY_DETAILED = buildHkDailyDetailed();
export const HK_TOTAL_DETAILED = buildHkTotalDetailed();

export const HK_USAGE_UNLIMITED = buildHkUsage({
  title: "使用 jeko 香港吃到飽 eSIM 的優勢",
  subtitle: "香港 IP・整天有網・雙網互補",
  items: [
    {
      iconName: "public",
      title: "香港原生 IP",
      descHtml: "連線接近在地用戶，適合地圖與交通 App。",
    },
    {
      iconName: "all_inclusive",
      title: "每日高速＋10Mbps",
      descHtml: "約 1GB 高速後仍可約 10Mbps 無限上網。",
    },
    {
      iconName: "cell_tower",
      title: "CSL／中國電信香港",
      descHtml: "雙網互補，市區與機場沿線表現穩定。",
    },
    ...usageCommon,
  ],
});

export const HK_USAGE_UNLIMITED_TC = buildHkUsage({
  title: "使用 jeko 香港多網吃到飽 eSIM 的優勢",
  subtitle: "約 10Mbps・熱點・新加坡 IP",
  items: [
    {
      iconName: "speed",
      title: "約 10Mbps 吃到飽",
      descHtml: "適合導航、社群與影音（實際依環境而定）。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線。",
    },
    {
      iconName: "apps",
      title: "TikTok／Gemini",
      descHtml: "新加坡 IP 下社群一般可免 VPN（實際依路由）。",
    },
    ...usageCommon,
  ],
});

export const HK_USAGE_SMARTONE = buildHkUsage({
  title: "使用 jeko 香港 3HK eSIM 的優勢",
  subtitle: "3HK 覆蓋・熱點・社群 App",
  items: [
    {
      iconName: "cell_tower",
      title: "3HK 網路",
      descHtml: "香港熱門區域與機場沿線覆蓋穩定。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線。",
    },
    {
      iconName: "apps",
      title: "ChatGPT／TikTok／Gemini",
      descHtml: "供應商標示支援常見影音與 AI App（實際依裝置與平台）。",
    },
    ...usageCommon,
  ],
});

export const HK_FAQ_UNLIMITED = buildHkFaq([
  ...hongkongSharedFaqItems("香港吃到飽 eSIM"),
  {
    question: "可以用熱點嗎？",
    answerHtml: p(
      `本 CSL／China Telecom HK 線路<strong>不標示</strong>熱點分享（供應商未保證）。若需要熱點，請改選同商品的「CUCC／China Telecom + CSL + CTM」，或 ${link("/product/hongkong/hongkong-daily-esim/", "每日型")}／${link("/product/hongkong/hongkong-total-esim/", "總量型")}（3HK）。`,
      0,
    ),
  },
  {
    question: "支援 TikTok／ChatGPT 嗎？",
    answerHtml: p(
      `本 CSL／China Telecom HK 線路<strong>不標示</strong> ChatGPT、TikTok、Gemini。若需要，請改選同商品的多網約 10Mbps 線路，或 3HK 每日／總量型。`,
      0,
    ),
  },
  {
    question: "10Mbps 夠用嗎？",
    answerHtml: p(
      `每日約 1GB 高速內都會區常見可到數十 Mbps；進入約 10Mbps 後，導航、傳訊、網頁通常沒問題，720p 影音多數可看（僅供參考）。`,
      0,
    ),
  },
]);

export const HK_FAQ_UNLIMITED_TC = buildHkFaq([
  ...hongkongSharedFaqItems("香港多網吃到飽 eSIM"),
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度依位置與網路環境而定。`, 0),
  },
  {
    question: "支援 TikTok 嗎？",
    answerHtml: p(
      `支援 TikTok、Gemini；新加坡 IP 下 LINE／IG／FB 一般可免 VPN（實際依路由與裝置）。`,
      0,
    ),
  },
  {
    question: "和 CSL／China Telecom HK 差在哪？",
    answerHtml: p(
      `多網線路為新加坡 IP、約 10Mbps，並標示熱點／TikTok。CSL／China Telecom HK 為香港原生 IP、每日約 1GB 高速後約 10Mbps，但不標示熱點與 TikTok。請依需求切換電信商。`,
      0,
    ),
  },
]);

export const HK_FAQ_SMARTONE = buildHkFaq([
  ...hongkongSharedFaqItems("香港 3HK eSIM"),
  {
    question: "高速用完會怎樣？",
    answerHtml: p(
      `每日型：當日高速用完後約 128kbps，隔日重置。總量型：總量高速用完後約 128kbps 可持續使用。128kbps 適合傳訊與輕量網頁。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
  {
    question: "為什麼是馬來西亞 IP？",
    answerHtml: p(
      `本每日／總量方案為漫遊線路，出網為馬來西亞 IP；一般社群／影音可正常使用。若您需要香港原生 IP，請改選 ${link("/product/hongkong/hongkong-unlimited-esim/", "吃到飽（CSL／China Telecom HK）")}。`,
      0,
    ),
  },
]);
