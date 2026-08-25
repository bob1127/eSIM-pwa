/**
 * 泰國 eSIM — 下方 tab 內容（方案詳情／產品介紹／使用介紹／FAQ）
 * 官方文案交叉對應（jeko 品牌、比較表黑點、不展示 API／SKU）：
 *
 * ① True-DTAC 僅數據・本地 TRUE → True 電信（吃到飽）／TRUE（總量）
 * ② Truemove H 當地號碼・數據+通話 → Truemove H 當地號碼（吃到飽）
 * ③ TRUE 5G 僅數據・漫遊 → DTAC / REAL FUTURE（每日／總量）；AIS／DTAC 原生另適配
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

const expiryOnInstall = `<span class="jeko-sum-warn">有效期於 eSIM 下載到您的裝置後立即開始計算。</span>請在準備好使用時再安裝 eSIM。我們建議您在抵達泰國後再安裝；在無訊號覆蓋的地區安裝可能導致方案啟用不正確。`;

const coverageTrue =
  "曼谷、清邁、普吉島、芭達雅、蘇梅島等泰國城市及旅遊景點。";

const coverageTourist =
  "曼谷、清邁、普吉島、蘇梅島、濤島等泰國主要城市及旅遊島。";

const coverageRoam =
  "曼谷、清萊、清邁、普吉島、蘇梅島等泰國城市及旅遊目的地。";

const delivery =
  "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。";

const voiceVoip =
  "不支持，只能透過應用程式（網路通話，即 VoIP）。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

/** 哪款泰國 eSIM 最適合您？ */
export function thailandCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>泰國 eSIM Truemove H 當地號碼</strong>`,
        "TRUE／Truemove H<br>泰國 IP<br>可含門號",
        "要真高速吃到飽<br>想要泰國門號／接聽",
        `${compareBullets([
          "TrueMove H 觀光原生 eSIM；TRUE 多次獲評泰國優質網路。",
          "真・高速吃到飽（實際速度依環境）；免費接聽（依方案）。",
          "效期自下載／安裝起算；請抵達泰國覆蓋範圍內再安裝。",
          "自 2026/5/22 起，撥出電話與簡訊需至 True 門店護照實名後才可恢復。",
          "刪除後不可重裝／轉讓；30 天內完成啟用。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/thailand/thailand-unlimited-esim/", "泰國吃到飽原生卡")}。</div>`,
      ],
      [
        `<strong>泰國 eSIM True 電信／TRUE 原生</strong>`,
        "TRUE 5G<br>泰國 IP<br>僅數據",
        "要泰國 IP<br>整天有網或總量控管",
        `${compareBullets([
          "TRUE 本地僅數據；吃到飽約 FUP 10Mbps，或總量高速用完後降速續航。",
          "支援熱點與常用 App；無門號／傳統通話／簡訊。",
          "效期多為連網使用後開始；購買後請於期限內啟用（吃到飽常見 180 天內）。",
          "適合不需門號、只要穩定上網的旅客。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/thailand/thailand-unlimited-esim/", "吃到飽")}、${link("/product/thailand/thailand-total-esim/", "總量型")}。</div>`,
      ],
      [
        `<strong>泰國 eSIM 漫遊（AIS／DTAC／RF）</strong>`,
        "AIS 或 DTAC／Real Future<br>漫遊",
        "預算優先<br>每日／總量好控管",
        `${compareBullets([
          "漫遊線路（新加坡或香港 IP），多數裝置 APN 自動帶入。",
          "僅數據、支援熱點；高速用完後多約 128 kbps 可持續使用。",
          "DTAC 原生每日另附當地號碼體驗（用完斷網規則依方案）。",
          "效期為抵達連網使用後開始計算。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/thailand/thailand-daily-esim/", "每日型")}、${link("/product/thailand/thailand-total-esim/", "總量型")}。</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款泰國 eSIM 最適合您？</h4>${table}`;
}

function planCard(pairs, expiryHtml) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: expiryHtml },
  });
}

function pairs({
  coverageHtml,
  carrierHtml,
  speedHtml,
  planTypeHtml,
  hotspotHtml = "支持",
  phoneHtml = "無",
  callHtml = voiceVoip,
  smsHtml = "無",
  ekycHtml = "不需要",
  routeHtml,
}) {
  return [
    [
      { iconName: "cell_tower", label: "訊號覆蓋範圍", valueHtml: coverageHtml },
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

const dealerNote =
  "此 eSIM 由當地運營商提供，jeko eSIM 作為授權通路銷售。數位商品退換依本站退換貨政策；發行運營商可能調整方案細節。感謝您的理解。";

/** ① True 電信 — 本地僅數據（吃到飽 FUP 10Mbps） */
export function buildThTrueLocalDataDetailed({
  planTypeLabel,
  speedHtml,
  trafficBullet,
  activateDays = "180",
}) {
  const planHtml = planCard(
    pairs({
      coverageHtml: coverageTrue,
      carrierHtml: "TRUE 5G",
      speedHtml,
      planTypeHtml: `僅數據流量・${planTypeLabel}（本地線路）`,
      routeHtml: "本地（泰國 IP）",
    }),
    expiryOnUse,
  );

  const otherHtml = otherInfoBlock([
    {
      html: `購買後請於 <strong>${activateDays} 天</strong>內掃描 QR Code 並完成啟用。`,
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);

  const introHtml = productIntroSection(`
    ${paragraph(
      "這款 True-DTAC Thailand Unlimited Data eSIM 為您提供無縫的互聯網體驗，非常適合需要穩定和高速數據連接的遊客。",
      16,
    )}
    ${paragraph(
      "由 True-DTAC（TRUE）提供服務，是泰國領先的移動運營商之一，確保在主要旅遊目的地與城市擁有穩定的網絡覆蓋。這是一張數據專用 SIM／eSIM，不提供語音和簡訊，僅為上網設計，適合需要大量數據的用戶。",
      16,
    )}
    ${paragraph(
      "享受無限數據上網（本站此變體為約 FUP 10Mbps 吃到飽，實際速度依位置與網路環境而定），讓您在瀏覽、串流和分享時無需擔心數據上限，是泰國旅行時保持連線的理想選擇。",
      20,
    )}
    ${thailandCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "無限數據：FUP 約 10Mbps 吃到飽（實際速度依環境而定）",
      "數據專用：無語音／簡訊；僅上網使用",
      "運營商：True-DTAC（TRUE）・泰國本地 IP・4G／LTE／5G",
      "支援熱點與常用 App；效期為連網使用後開始計算",
      trafficBullet,
      `請於購買後 ${activateDays} 天內完成啟用`,
    ])}
  `);

  return [planHtml, otherHtml, introHtml].join("\n");
}

/** ② Truemove H 當地號碼 */
export function buildThTruemoveHDetailed() {
  const planHtml = planCard(
    pairs({
      coverageHtml: coverageTourist,
      carrierHtml: "TRUE／Truemove H 5G",
      speedHtml: "4G／LTE／5G；真・高速吃到飽（實際速度依環境而定）",
      planTypeHtml: "數據 + 通話（觀光 eSIM）",
      phoneHtml:
        "+66 泰國當地手機號碼（撥打 <strong>*833#</strong> 查詢 eSIM 號碼）",
      callHtml:
        "有條件提供：免費接聽依方案；撥出／簡訊自 2026/5/22 起需門店護照實名後才可恢復",
      smsHtml: "無（需實名後依電信規定）",
      ekycHtml:
        "使用通話和簡訊需要實名認證；僅使用數據則不需要",
      routeHtml: "本地（泰國 IP）",
    }),
    expiryOnInstall,
  );

  const otherHtml = otherInfoBlock([
    {
      title: "常用查詢碼",
      html: `查詢電話號碼：<strong>*833#</strong><br>查詢數據用量：<strong>*900#</strong><br>查詢餘額：<strong>*123#</strong>`,
      marginBottom: 16,
    },
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">請在抵達泰國後再安裝此 eSIM。</span>在無訊號覆蓋的地區安裝可能導致方案啟用不正確或無法按預期運作。此 eSIM 只能在單一設備新增一次；一旦刪除，不可替換、不可轉讓、不可恢復。`,
      marginBottom: 16,
    },
    {
      html: "購買後請於 <strong>30 天</strong>內掃描 QR Code 並完成啟用。",
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);

  const introHtml = productIntroSection(`
    ${paragraph(
      "TrueMove H 提供的泰國觀光 eSIM。訊號覆蓋穩定且廣泛，內含當地數據流量以供上網，是泰國旅遊的理想電話卡。",
      16,
    )}
    ${paragraph(
      "True 連續多年獲得 nperf 等認證肯定為泰國優質網路供應商。使用此 eSIM，讓您在優質網路上保持連線，無需擔心額外費用，非常適合短期訪問泰國的旅客。",
      16,
    )}
    ${paragraph(
      "此 Truemove H 觀光 eSIM 只能在單一設備上新增一次。一旦刪除，不可替換、不可轉讓、不可恢復。不得在無網路覆蓋的地區安裝或啟用，否則方案將會失效且無法使用。",
      16,
    )}
    <h4 style="margin:8px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">本商品・無限流量方案</h4>
    ${dataTable(
      ["天數", "數據", "通話"],
      [
        [
          "<strong>8 天無限</strong>",
          "5G 網路上全速無限數據流量",
          `${compareBullets([
            "國內通話：無限免費撥打",
            "全球通話：內含 15 泰銖免費國際通話額度",
            "接聽來電：免費",
          ])}`,
        ],
        [
          "<strong>15 天無限</strong>",
          "5G 全速，無降速（No throttling）",
          `${compareBullets([
            "泰國當地無限通話",
            "內含 15 泰銖國際通話額度",
            "接聽來電：免費",
          ])}`,
        ],
      ],
    )}
    ${paragraph(
      `<span class="jeko-sum-warn">注意：</span>自 2026 年 5 月 22 日起，為配合泰國國家廣播和電信委員會（NBTC）的網路犯罪預防措施，旅客套餐將停用撥出電話與發送 SMS 功能。客戶可前往 True 門店並完成護照實名登記，以恢復通話功能。`,
      16,
    )}
    <h4 style="margin:8px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">同系列・總量型規格（另商品）</h4>
    ${paragraph(
      `若您需要總量高速＋用完降速續航，可選購 ${link("/product/thailand/thailand-total-esim/", "泰國總量型 eSIM（TRUE）")}，常見規格如下：`,
      12,
    )}
    ${dataTable(
      ["天數", "高速數據", "用完後", "通話"],
      [
        [
          "<strong>7 天</strong>",
          "總計 15GB",
          "可持續約 1Mbps 無限上網",
          "免費接聽；不含撥出／簡訊",
        ],
        [
          "<strong>10 天</strong>",
          "總計 50GB",
          "可持續約 384kbps 無限上網",
          "免費接聽；不含撥出／簡訊",
        ],
      ],
    )}
    ${thailandCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "電信網路：TRUE／Truemove H・泰國本地 IP・可含 +66 門號",
      "效期：下載／安裝後立即開始；請抵達覆蓋範圍內再安裝",
      "本商品：8／15 天真・高速吃到飽（實際速度依環境）",
      "通話：免費接聽；國內／國際撥打依方案；自 2026/5/22 起撥出與簡訊需門店實名後恢復",
      "刪除後無法重裝；請於 30 天內完成啟用",
    ])}
  `);

  return [planHtml, otherHtml, introHtml].join("\n");
}

/** TRUE 總量原生（15GB／7天、50GB／10天等・TrueMove H 觀光系列） */
export function buildThTrueTotalDetailed() {
  const planHtml = planCard(
    pairs({
      coverageHtml: coverageTourist,
      carrierHtml: "TRUE／Truemove H 5G",
      speedHtml:
        "4G／LTE／5G（總量高速額度內）；用完後依方案約 1 Mbps 或約 384 kbps 續航",
      planTypeHtml: "數據 + 通話（觀光總量型）",
      phoneHtml:
        "+66 泰國當地手機號碼（撥打 <strong>*833#</strong> 查詢）",
      callHtml: "免費接聽來電；不包含撥出電話或簡訊（實名後依電信規定）",
      smsHtml: "無",
      ekycHtml:
        "使用通話和簡訊需要實名認證；僅使用數據則不需要",
      routeHtml: "本地（泰國 IP）",
    }),
    expiryOnUse,
  );

  const otherHtml = otherInfoBlock([
    {
      title: "常用查詢碼",
      html: `查詢電話號碼：<strong>*833#</strong><br>查詢數據用量：<strong>*900#</strong><br>查詢餘額：<strong>*123#</strong>`,
      marginBottom: 16,
    },
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">建議抵達泰國覆蓋範圍內再安裝／啟用</span>；請勿在無覆蓋地區提前安裝，以免方案異常。`,
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);

  const introHtml = productIntroSection(`
    ${paragraph(
      "TrueMove H 提供的泰國觀光 eSIM（總量型）。訊號覆蓋穩定且廣泛，內含當地數據流量以供上網，是泰國旅遊的理想電話卡。",
      16,
    )}
    ${paragraph(
      "True 連續多年獲得 nperf 等認證肯定。使用此 eSIM，讓您在優質網路上保持連線，無需擔心額外費用，非常適合短期訪問泰國的旅客。",
      16,
    )}
    <h4 style="margin:8px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">本商品・總量方案</h4>
    ${dataTable(
      ["天數", "高速數據", "用完後", "通話"],
      [
        [
          "<strong>7 天</strong>",
          "總計 15GB",
          "可持續約 1Mbps 無限上網",
          `${compareBullets([
            "免費接聽來電",
            "不包含撥出電話或簡訊",
          ])}`,
        ],
        [
          "<strong>10 天</strong>",
          "總計 50GB",
          "可持續約 384kbps 無限上網",
          `${compareBullets([
            "免費接聽來電",
            "不包含撥出電話或簡訊",
          ])}`,
        ],
      ],
    )}
    ${paragraph(
      `<span class="jeko-sum-warn">注意：</span>自 2026 年 5 月 22 日起，為配合 NBTC 網路犯罪預防措施，上述旅客套餐將停用撥出電話與發送 SMS。客戶可前往 True 門店並完成護照實名登記，以恢復通話功能。`,
      16,
    )}
    ${paragraph(
      `若需要真・高速無限流量（8／15 天），請改選 ${link("/product/thailand/thailand-unlimited-esim/", "Truemove H 當地號碼吃到飽")}。`,
      20,
    )}
    ${thailandCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "電信網路：TRUE／Truemove H・泰國本地 IP・可含門號",
      "7 天 15GB：用完後約 1Mbps 續航；免費接聽、不含撥出／簡訊",
      "10 天 50GB：用完後約 384kbps 續航；免費接聽、不含撥出／簡訊",
      "效期：連網使用後開始計算；請於覆蓋範圍內啟用",
      "實際可售規格以結帳頁面為準",
    ])}
  `);

  return [planHtml, otherHtml, introHtml].join("\n");
}

/** ③ 漫遊僅數據（DTAC／RF、AIS） */
export function buildThRoamingDataDetailed({
  planTypeLabel,
  carrierHtml,
  routeHtml,
  speedHtml,
  trafficBullet,
  coverageHtml = coverageRoam,
  extraBullets = [],
}) {
  const planHtml = planCard(
    pairs({
      coverageHtml,
      carrierHtml,
      speedHtml,
      planTypeHtml: `僅數據流量・${planTypeLabel}（漫遊線路）`,
      routeHtml,
    }),
    expiryOnUse,
  );

  const introHtml = productIntroSection(`
    ${paragraph(
      "jeko eSIM 提供實惠的泰國漫遊數據方案：快速設定、支援熱點，讓您在曼谷到海島行程中保持連線，無需更換實體 SIM。",
      16,
    )}
    ${paragraph(
      "本方案為僅數據漫遊線路，適合預算敏感、想控管每日或總量用量的旅客。若需要泰國原生 IP 或當地門號，可改選 True 電信／Truemove H。",
      20,
    )}
    ${thailandCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      `電信網路：${carrierHtml}`,
      `數據路由：${routeHtml}`,
      "僅數據：無門號／傳統通話／簡訊；支援熱點與常用 App",
      "效期：抵達當地連網並開始使用數據後才開始計算",
      trafficBullet,
      ...extraBullets,
    ])}
  `);

  return [planHtml, introHtml].join("\n");
}

/** DTAC 原生每日（帶號碼、用完斷網） */
export function buildThDtacNativeDailyDetailed() {
  const planHtml = planCard(
    pairs({
      coverageHtml: coverageTourist,
      carrierHtml: "DTAC 4G／LTE／5G",
      speedHtml: "4G／LTE／5G（每日 5GB 高速額度內）；用完當日斷網，隔日重置",
      planTypeHtml: "僅數據流量・每日型（本地線路・可含門號體驗）",
      phoneHtml: "可取得 DTAC 當地號碼體驗（通話／簡訊依供應商與實名規定）",
      callHtml: voiceVoip,
      ekycHtml: "僅用數據不需要；通話／簡訊依電信規定可能需實名",
      routeHtml: "本地（泰國 IP）",
    }),
    expiryOnUse,
  );

  const otherHtml = otherInfoBlock([
    {
      title: "安裝提醒",
      html: `<span class="jeko-sum-warn">建議抵達泰國覆蓋範圍內再安裝／啟用</span>；請勿在覆蓋範圍外提前安裝。`,
      marginBottom: 12,
    },
    { html: dealerNote, marginBottom: 0 },
  ]);

  const introHtml = productIntroSection(`
    ${paragraph(
      "DTAC 原生每日型 eSIM，走泰國本地 IP，適合需要原生連線體驗與熱點分享的旅客。每日 5GB 高速額度；用完當日斷網，隔日再恢復（依供應商規則）。",
      20,
    )}
    ${thailandCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "電信網路：DTAC 原生・泰國 IP",
      "流量：每日 5GB，用完斷網、隔日重置",
      "可含當地號碼體驗；通話／簡訊依規定",
      "效期：連網使用後開始；請於覆蓋範圍內啟用",
    ])}
  `);

  return [planHtml, otherHtml, introHtml].join("\n");
}

export function buildThUsage({ title, subtitle, items }) {
  return usageAdvantagesSection({ title, subtitle, items });
}

export function buildThFaq(items) {
  return faqAccordion(items, { defaultOpenIndex: 0 });
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export function thSharedFaqItems(productName = "泰國 eSIM") {
  return [
    {
      question: `我的手機是否支援在泰國使用 eSIM？`,
      answerHtml: [
        p(`大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`),
        p(`請確認手機已解鎖。亦可參考 ${link("/support", "eSIM 相容裝置說明")}。`, 0),
      ].join(""),
    },
    {
      question: `如何安裝並啟用 ${productName}？`,
      answerHtml: [
        p(
          `建議在穩定 Wi‑Fi 下掃描 QR Code；抵達泰國後再開啟該 eSIM 並切換行動數據（漫遊方案請開啟數據漫遊）。含門號／觀光方案請務必在覆蓋範圍內安裝。`,
        ),
        p(
          `教學：${link("/operation-ios", "iPhone／iPad")}　·　${link("/operation-shopee", "Android")}`,
          0,
        ),
      ].join(""),
    },
    {
      question: "付款後多久會收到 eSIM？",
      answerHtml: [
        p(`通常付款完成後幾分鐘內以 Email 寄送 QR Code。`),
        p(
          `亦可至 ${link("/my-esim", "「我的 eSIM」")} 查看；未收到請 ${link("/contact", "聯絡我們")}。`,
          0,
        ),
      ].join(""),
    },
    {
      question: "安裝後還能用原本的 LINE、WhatsApp 嗎？",
      answerHtml: p(
        `可以。安裝 eSIM 不影響通訊軟體帳號；無傳統語音的方案請使用 VoIP。`,
        0,
      ),
    },
    {
      question: "如何查詢流量？",
      answerHtml: [
        p(`1. ${link("/my-esim", "「我的 eSIM」")}`),
        p(`2. ${link("/data-query", "數據使用查詢")}（輸入 ICCID）`, 0),
      ].join(""),
    },
    {
      question: "可以退貨或換方案嗎？",
      answerHtml: p(
        `jeko eSIM 為數位商品，退換依安裝與激活狀態適用本站 ${link("/refund-policy", "退換貨政策")}。`,
        0,
      ),
    },
  ];
}

// ——— 匯出 ———

export const TH_UNLIMITED_TRUEMOVE_DETAILED = buildThTruemoveHDetailed();

export const TH_UNLIMITED_TRUE_DETAILED = buildThTrueLocalDataDetailed({
  planTypeLabel: "吃到飽（約 FUP 10Mbps）",
  speedHtml: "4G／LTE／5G；約 10Mbps 吃到飽（實際速度依環境而定）",
  trafficBullet: "流量：FUP 約 10Mbps 無限流量；支援熱點",
  activateDays: "180",
});

export const TH_UNLIMITED_DTAC_RF_DETAILED = buildThRoamingDataDetailed({
  planTypeLabel: "吃到飽",
  carrierHtml: "DTAC／Real Future（TrueMove）4G／LTE／5G",
  routeHtml: "漫遊（香港 IP）",
  speedHtml: "4G／LTE／5G；不限流量吃到飽（FUP，實際依環境而定）",
  trafficBullet: "流量：吃到飽不限流量（FUP）；支援熱點",
});

export const TH_TOTAL_TRUE_DETAILED = buildThTrueTotalDetailed();

export const TH_TOTAL_AIS_DETAILED = buildThRoamingDataDetailed({
  planTypeLabel: "總量型",
  carrierHtml: "AIS Thailand 4G／LTE／5G",
  routeHtml: "漫遊（新加坡 IP）",
  speedHtml:
    "4G／LTE／5G（總量高速額度內）；高速用完後降速至約 128 kbps",
  trafficBullet: "流量：總量高速用完後約 128 kbps 可持續使用",
});

export const TH_TOTAL_DTAC_RF_DETAILED = buildThRoamingDataDetailed({
  planTypeLabel: "總量型",
  carrierHtml: "DTAC／Real Future（TrueMove）4G／LTE／5G",
  routeHtml: "漫遊（香港 IP）",
  speedHtml:
    "4G／LTE／5G（總量高速額度內）；高速用完後降速至約 128 kbps",
  trafficBullet: "流量：總量高速用完後約 128 kbps 可持續使用",
  extraBullets: ["高 CP 漫遊選項，適合預算敏感旅客"],
});

export const TH_DAILY_AIS_DETAILED = buildThRoamingDataDetailed({
  planTypeLabel: "每日型",
  carrierHtml: "AIS Thailand 4G／LTE／5G",
  routeHtml: "漫遊（新加坡 IP）",
  speedHtml:
    "4G／LTE／5G（每日高速額度內）；用完後約 128 kbps，隔日重置",
  trafficBullet: "流量：每日高速用完後約 128 kbps 可持續使用，隔日重置",
});

export const TH_DAILY_DTAC_RF_DETAILED = buildThRoamingDataDetailed({
  planTypeLabel: "每日型",
  carrierHtml: "DTAC／Real Future（TrueMove）4G／LTE／5G",
  routeHtml: "漫遊（香港 IP）",
  speedHtml:
    "4G／LTE／5G（每日高速額度內）；用完後約 128 kbps，隔日重置",
  trafficBullet: "流量：每日高速用完後約 128 kbps 可持續使用，隔日重置",
  extraBullets: ["高 CP 漫遊選項，適合預算敏感旅客"],
});

export const TH_DAILY_DTAC_DETAILED = buildThDtacNativeDailyDetailed();

const usageCommon = [
  {
    iconName: "mark_email_unread",
    title: "即時交付",
    descHtml: "付款後以 Email 寄送 QR Code；也可至「我的 eSIM」查看。",
  },
  {
    iconName: "payments",
    title: "無額外費用",
    descHtml: "用 jeko eSIM 出國更省；結帳金額即為方案費用，無漫遊隱藏費用。",
  },
  {
    iconName: "sim_card",
    title: "雙卡雙待",
    descHtml: "原 SIM 可照常使用；請以 LINE、WhatsApp 等 VoIP 通話。",
  },
  {
    iconName: "qr_code_2",
    title: "簡單易用",
    descHtml: "掃描 QR Code，幾分鐘內即可啟動 eSIM。",
  },
];

export const TH_USAGE_TRUEMOVE = buildThUsage({
  title: "使用 jeko Truemove H 觀光 eSIM 的優勢",
  subtitle: "泰國原生・真高速・可含門號",
  items: [
    {
      iconName: "cell_tower",
      title: "TRUE 優質網路",
      descHtml: "TrueMove H 覆蓋主要城市與熱門島嶼。",
    },
    {
      iconName: "call",
      title: "當地門號",
      descHtml: "可取得 +66 號碼；免費接聽依方案（撥出需實名）。",
    },
    {
      iconName: "rocket_launch",
      title: "真・高速吃到飽",
      descHtml: "適合導航、Grab、視訊與大量使用。",
    },
    ...usageCommon,
  ],
});

export const TH_USAGE_TRUE_LOCAL = buildThUsage({
  title: "使用 jeko True／TRUE 原生 eSIM 的優勢",
  subtitle: "泰國 IP・僅數據・支援熱點",
  items: [
    {
      iconName: "public",
      title: "泰國本地 IP",
      descHtml: "延遲低，適合 Grab、地圖與在地服務。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線（依方案額度）。",
    },
    {
      iconName: "speed",
      title: "4G／5G",
      descHtml: "熱門城市連線體驗佳。",
    },
    ...usageCommon,
  ],
});

export const TH_USAGE_ROAM = buildThUsage({
  title: "使用 jeko 泰國漫遊 eSIM 的優勢",
  subtitle: "好控管・高 CP・支援熱點",
  items: [
    {
      iconName: "savings",
      title: "用量好控",
      descHtml: "每日或總量方案，適合預算與行程規劃。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享數據。",
    },
    {
      iconName: "settings",
      title: "安裝即用",
      descHtml: "多數裝置 APN 自動帶入。",
    },
    ...usageCommon,
  ],
});

export const TH_FAQ_TRUEMOVE = buildThFaq([
  ...thSharedFaqItems("Truemove H 觀光 eSIM"),
  {
    question: "效期什麼時候開始？",
    answerHtml: p(
      `<span style="color:#ea580c;font-weight:700;">下載／安裝到手機後立即開始計算</span>，請抵達泰國覆蓋範圍內再安裝。`,
      0,
    ),
  },
  {
    question: "可以撥打電話嗎？",
    answerHtml: p(
      `免費接聽依方案提供。自 2026/5/22 起，撥出電話與簡訊需至 True 門店完成護照實名後才可恢復。`,
      0,
    ),
  },
  {
    question: "刪除後可以重裝嗎？",
    answerHtml: p(
      `<span style="color:#ea580c;font-weight:700;">不可以。</span>一旦刪除不可替換、不可轉讓、不可恢復。`,
      0,
    ),
  },
]);

export const TH_FAQ_TRUE_LOCAL = buildThFaq([
  ...thSharedFaqItems("True／TRUE 原生 eSIM"),
  {
    question: "有電話號碼嗎？",
    answerHtml: p(
      `本僅數據方案無門號。若需要當地號碼與真高速吃到飽，請改選 Truemove H 當地號碼。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
]);

export const TH_FAQ_ROAM = buildThFaq([
  ...thSharedFaqItems("泰國漫遊 eSIM"),
  {
    question: "高速用完會怎樣？",
    answerHtml: p(
      `多數漫遊方案高速用完後約 128 kbps 可持續使用（傳訊／輕量網頁）；DTAC 原生每日則可能用完斷網，請依方案標示為準。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
]);
