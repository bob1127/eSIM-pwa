/**
 * 中國大陸 eSIM — 下方 tab 內容（方案詳情／產品介紹／使用介紹／FAQ）
 * 規則：jeko 品牌、方案詳情卡、方案重點、比較表（黑點無 emoji）、不展示 API／SKU
 *
 * 電信對應（Medusa 選項值）：
 *   daily-jp 同型：china-daily-esim
 *     - 中國移動
 *     - 中國聯通 GPT + TikTok (CUCC)
 *   china-unlimited-esim
 *     - CMCC 70Mbps（較高速；ChatGPT／TikTok 不保證）
 *     - CUCC+（聯通・免 VPN 社群・TikTok／ChatGPT）
 *   china-total-esim
 *     - CMCC+
 *     - CUCC+
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

const expiryRoaming = `一旦 eSIM 連接到支援的網路並開始產生數據流量，有效期限即開始。我們建議您在到達目的地後添加 eSIM。您也可以提前安裝 eSIM，<span class="jeko-sum-warn">但請記得安裝後立即將其關閉</span>，以避免有效期提前開始。`;

const coverage =
  "北京、上海、廣州、深圳、成都、西安等中國大陸主要城市及旅遊目的地。";

const delivery =
  "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。";

const voiceSms =
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

/** 哪款中國 eSIM 最適合您？（各電信商共用） */
export function chinaCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>中國 eSIM 中國移動（標準）</strong>`,
        "中國移動<br>4G／LTE／5G",
        "覆蓋優先<br>一般旅遊上網",
        `${compareBullets([
          "走中國移動網路，熱門城市與偏遠地區覆蓋通常較廣。",
          "多數方案可免 VPN 使用 LINE、Instagram、Facebook、YouTube、WhatsApp 等（實際依當下路由）。",
          "支援熱點分享；僅數據，無門號／傳統通話／簡訊。",
          "TikTok／ChatGPT 不保證可用；若需要請改選下方專線。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/china/china-daily-esim/", "每日型")}、${link("/product/china/china-total-esim/", "總量型")}。</div>`,
      ],
      [
        `<strong>中國 eSIM 中國移動 70Mbps 吃到飽</strong>`,
        "中國移動<br>約 50～70 Mbps",
        "要較高速<br>一般社群上網",
        `${compareBullets([
          "吃到飽速度約落在 50～70 Mbps（實際依訊號與擁塞而定）。",
          "出網多為香港 IP；一般可免 VPN 使用 LINE／IG／FB。",
          "ChatGPT／TikTok <strong>不保證</strong>可用。",
          `若需要 ChatGPT／TikTok，請改選 ${link("/product/china/china-unlimited-esim?data_amount=%E5%90%83%E5%88%B0%E9%A3%BD&days=20&telecom=cucc", "CUCC+（中國聯通）")}。`,
        ])}<div style="margin-top:8px;">可參考 ${link("/product/china/china-unlimited-esim/?telecom=cmcc-70", "CMCC 70Mbps 吃到飽")}。</div>`,
      ],
      [
        `<strong>中國 eSIM 中國聯通 GPT + TikTok</strong>`,
        "中國聯通<br>國際 IP",
        "TikTok 重度用戶<br>遠端工作／ChatGPT",
        `${compareBullets([
          "專為 TikTok、ChatGPT 與全球常用 App 優化（免 VPN 社群）。",
          "聯通網路；中西部部分地區覆蓋表現佳。",
          "支援熱點；每日／吃到飽／總量皆有對應選項（選項名稱可能為 CUCC+ 或 GPT + TikTok）。",
          "TikTok 使用前請關閉定位、勿同時開 VPN，並將本 eSIM 設為主要行動數據。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/china/china-daily-esim/", "每日型")}、${link("/product/china/china-unlimited-esim/", "吃到飽")}、${link("/product/china/china-total-esim/", "總量型")}。</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款中國 eSIM 最適合您？</h4>${table}`;
}

function basePairs({
  carrierHtml,
  speedHtml,
  planTypeHtml,
  routeHtml = "漫遊",
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
      { iconName: "phone_in_talk", label: "通話", valueHtml: voiceSms },
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

function planCard(pairs) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: expiryRoaming },
  });
}

const tiktokSetupHtml = otherInfoBlock([
  {
    title: "TikTok／ChatGPT 使用提醒",
    html: `1. TikTok 可在 Apple 與 Android 使用（支援常見 iOS 版本）。<br>
2. ChatGPT 在 Apple 裝置上通常較完整；Android 建議改用網頁版。<br>
3. 本 eSIM 提供具國際 IP 的行動數據，可用於 TikTok 等應用；可用性仍可能因裝置與平台限制而異。`,
    marginBottom: 16,
  },
  {
    title: "為獲得最佳 TikTok 體驗，請先完成",
    html: `${compareBullets([
      "關閉定位功能（iOS／Android 設定）",
      "將本 eSIM 設為主要行動數據（避免切到中國 Wi‑Fi 或本地網路）",
      "請勿同時使用 VPN、代理或其他網路工具",
      "連接 eSIM 後重新啟動 TikTok",
    ])}`,
    marginBottom: 0,
  },
]);

/** 中國移動（標準：免 VPN 社群，TikTok 不保證） */
export function buildChinaCmccDetailed({
  planTypeLabel,
  speedHtml,
  trafficBullet,
  carrierHtml = "中國移動（CMCC）4G／LTE／5G",
  routeHtml = "漫遊",
  extraBullets = [],
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
    ${paragraph("jeko eSIM 提供中國旅遊最佳 eSIM。", 16)}
    ${paragraph(
      "透過我們的中國 eSIM 方案，讓您在中國大陸輕鬆保持連線，享有 5G／4G／LTE 速度。無論是 iPhone、iPad 或其他相容裝置，都能快速設定、省去昂貴漫遊費用。",
      16,
    )}
    ${paragraph(
      "本方案由中國大陸領先電信商中國移動（China Mobile）支援，無論繁忙城市或偏遠地區，都能提供穩定覆蓋，適合探索都市中心與鄉村美景。",
      16,
    )}
    ${paragraph(
      `告別實體 SIM 與漫遊煩惱。可將裝置變為個人熱點；無需 VPN 即可存取 Google、YouTube、Facebook、Instagram 和 WhatsApp 等熱門應用（實際依當下路由）。若您需要 TikTok／ChatGPT，請改選 ${link("/product/china/china-daily-esim/", "中國聯通 GPT + TikTok")} 或 ${link("/product/china/china-unlimited-esim?data_amount=%E5%90%83%E5%88%B0%E9%A3%BD&days=20&telecom=cucc", "CUCC+ 吃到飽")}。`,
      20,
    )}
    ${chinaCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "電信網路：中國移動（CMCC）4G／LTE／5G",
      "多數可免 VPN 使用社群（LINE／IG／FB 等，實際依路由）",
      "效期：抵達當地連網並開始使用數據後才開始計算",
      trafficBullet,
      "僅數據：無門號／傳統通話／簡訊；支援熱點；TikTok／ChatGPT 不保證",
      ...extraBullets,
    ])}
  `);

  return [planHtml, introHtml].join("\n");
}

/** CMCC 70Mbps 吃到飽（較高速；ChatGPT／TikTok 不保證） */
export function buildChinaCmcc70Detailed({
  planTypeLabel = "吃到飽（約 50～70 Mbps）",
  speedHtml = "4G／LTE／5G；約 50～70 Mbps 吃到飽（實際依環境而定）",
  trafficBullet = "流量：約 50～70 Mbps 吃到飽；支援熱點",
}) {
  const cuccHref =
    "/product/china/china-unlimited-esim?data_amount=%E5%90%83%E5%88%B0%E9%A3%BD&days=20&telecom=cucc";
  const planHtml = planCard(
    basePairs({
      carrierHtml: "中國移動（CMCC）4G／LTE／5G",
      speedHtml,
      planTypeHtml: `僅數據流量・${planTypeLabel}`,
      routeHtml: "漫遊（香港 IP）",
    }),
  );

  const introHtml = productIntroSection(`
    ${paragraph(
      "使用 jeko 專屬中國移動吃到飽 eSIM，自由連線中國大陸網路。出網多為香港 IP，實際測速常見約落在 50～70 Mbps 區間，適合導航、傳訊與一般社群。",
      16,
    )}
    ${paragraph(
      `本方案<strong>不保證</strong>可使用 ChatGPT／TikTok。若您需要 ChatGPT 或 TikTok，請改選 ${link(cuccHref, "CUCC+（中國聯通）吃到飽")}。`,
      20,
    )}
    ${chinaCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "電信網路：中國移動・約 50～70 Mbps 吃到飽",
      `ChatGPT／TikTok 不保證；需要請改選 ${link(cuccHref, "CUCC+")}`,
      "效期：抵達當地連網並開始使用數據後才開始計算",
      trafficBullet,
      "僅數據：無門號／傳統通話／簡訊；支援熱點；一般可免 VPN 使用 LINE／IG／FB（實際依路由）",
    ])}
  `);

  return [planHtml, introHtml].join("\n");
}

/** 中國聯通 GPT + TikTok／CUCC+ */
export function buildChinaCuccTiktokDetailed({
  planTypeLabel,
  speedHtml,
  trafficBullet,
  carrierHtml = "中國聯通（CUCC）4G／LTE／5G",
  routeHtml = "漫遊（國際／新加坡 IP）",
  showSpeedNote = false,
  extraBullets = [],
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
    ${paragraph(
      "使用 jeko 專屬中國聯通 eSIM，自由連線中國大陸網路。無需 VPN，即可暢玩 TikTok、ChatGPT 及其他全球應用程式。高速資料與穩定訊號，適合旅行者與遠端工作者。",
      16,
    )}
    ${paragraph(
      "中國聯通是中國大陸三大運營商之一，尤其在中西部地區常有良好覆蓋。我們也提供由中國移動支援的 eSIM 供您選擇。",
      16,
    )}
    ${paragraph(
      "可透過熱點與親友分享數據；免 VPN 存取 Google、YouTube、Facebook、Instagram、WhatsApp，並支援 TikTok／ChatGPT（請依「其他資訊」完成 TikTok 設定）。",
      16,
    )}
    ${
      showSpeedNote
        ? paragraph(
            "實測參考：高速額度內都會區常見約數十 Mbps；進入約 10Mbps 吃到飽後，測速多半約 7～12Mbps——導航、傳訊、社群通常沒問題（僅供參考）。",
            20,
          )
        : ""
    }
    ${chinaCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "電信網路：中國聯通（CUCC）4G／LTE／5G",
      "支援 TikTok、ChatGPT；免 VPN 社群（實際依路由）",
      "效期：抵達當地連網並開始使用數據後才開始計算",
      trafficBullet,
      "僅數據：無門號／傳統通話／簡訊；支援熱點",
      ...extraBullets,
    ])}
  `);

  return [planHtml, tiktokSetupHtml, introHtml].join("\n");
}

export function buildChinaUsage({ title, subtitle, items }) {
  return usageAdvantagesSection({ title, subtitle, items });
}

export function buildChinaFaq(items) {
  return faqAccordion(items, { defaultOpenIndex: 0 });
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export function chinaSharedFaqItems(productName = "中國 eSIM") {
  return [
    {
      question: `我的手機是否支援在中國使用 eSIM？`,
      answerHtml: [
        p(
          `大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`,
        ),
        p(
          `請確認手機已解鎖。亦可參考 ${link("/support", "eSIM 相容裝置說明")}。`,
          0,
        ),
      ].join(""),
    },
    {
      question: `如何安裝並啟用 ${productName}？`,
      answerHtml: [
        p(
          `建議在穩定 Wi‑Fi 下掃描 QR Code 完成安裝；抵達中國大陸後再開啟該 eSIM 並切換行動數據（漫遊方案請一併開啟數據漫遊）。`,
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
      question: "需要 VPN 嗎？可以用 LINE／IG／FB 嗎？",
      answerHtml: p(
        `多數中國旅遊 eSIM 採國際出口 IP，一般可免 VPN 使用 LINE、Instagram、Facebook、YouTube、WhatsApp 等（實際依當下路由，非保證每位用戶／每個時段）。`,
        0,
      ),
    },
    {
      question: "安裝後還能用原本的 LINE、WhatsApp 嗎？",
      answerHtml: p(
        `可以。安裝 eSIM 不影響通訊軟體帳號；本方案無傳統語音／簡訊，請使用 VoIP。`,
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

// ——— 匯出：各商品 × 電信商 ———

export const CN_DAILY_CMCC_DETAILED = buildChinaCmccDetailed({
  planTypeLabel: "每日型",
  speedHtml:
    "4G／LTE／5G（每日高速額度內）；標準用完後約 128 kbps，亦可選 5Mbps 續航",
  trafficBullet:
    "流量：每日高速用完後可持續使用（標準約 128 kbps；可選 5Mbps 續航），隔日重置",
});

export const CN_DAILY_CUCC_TIKTOK_DETAILED = buildChinaCuccTiktokDetailed({
  planTypeLabel: "每日型",
  carrierHtml: "中國聯通（CUCC）4G／LTE／5G・GPT + TikTok",
  speedHtml:
    "4G／LTE／5G（每日高速額度內）；標準用完後約 128 kbps，亦可選 5Mbps 續航",
  trafficBullet:
    "流量：每日高速用完後可持續使用（標準約 128 kbps；可選 5Mbps 續航），隔日重置",
});

export const CN_UNLIMITED_CMCC_70_DETAILED = buildChinaCmcc70Detailed({});

export const CN_UNLIMITED_CUCC_DETAILED = buildChinaCuccTiktokDetailed({
  planTypeLabel: "吃到飽（每日高速後約 10Mbps）",
  speedHtml:
    "4G／LTE／5G；每日約 1GB 高速後約 10Mbps 吃到飽（實際依環境而定）",
  trafficBullet: "流量：每日約 1GB 高速後約 10Mbps 吃到飽；支援熱點",
  showSpeedNote: true,
});

export const CN_TOTAL_CMCC_DETAILED = buildChinaCmccDetailed({
  planTypeLabel: "總量型",
  carrierHtml: "中國移動（CMCC+）4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G（總量高速額度內）；多數方案用完後約 128 kbps，部分方案用完斷網",
  trafficBullet:
    "流量：多數用完後約 128 kbps 可持續使用；部分方案用完斷網，選購時請留意標示",
  extraBullets: ["若需穩定 TikTok／ChatGPT，建議改選 CUCC+ 總量型"],
});

export const CN_TOTAL_CUCC_DETAILED = buildChinaCuccTiktokDetailed({
  planTypeLabel: "總量型",
  carrierHtml: "中國聯通（CUCC+）4G／LTE／5G",
  speedHtml:
    "4G／LTE／5G（總量高速額度內）；多數方案用完後約 128 kbps，少數方案用完斷網",
  trafficBullet:
    "流量：多數用完後約 128 kbps 可持續使用；少數方案（如特定小流量）用完斷網，選購時請留意",
});

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

export const CN_USAGE_CMCC = buildChinaUsage({
  title: "使用 jeko 中國移動 eSIM 的優勢",
  subtitle: "覆蓋廣・免 VPN 社群・支援熱點",
  items: [
    {
      iconName: "cell_tower",
      title: "移動覆蓋",
      descHtml: "中國移動網路，熱門城市與交通沿線覆蓋佳。",
    },
    {
      iconName: "public",
      title: "免 VPN 社群",
      descHtml: "一般可直接使用 LINE、IG、FB、YouTube 等（實際依路由）。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線（實際速度與額度依方案而定）。",
    },
    ...usageCommon,
  ],
});

export const CN_USAGE_CUCC_TIKTOK = buildChinaUsage({
  title: "使用 jeko 中國聯通 GPT + TikTok eSIM 的優勢",
  subtitle: "TikTok／ChatGPT・免 VPN・聯通覆蓋",
  items: [
    {
      iconName: "apps",
      title: "TikTok／ChatGPT",
      descHtml: "專線優化；TikTok 請依產品說明完成設定。",
    },
    {
      iconName: "public",
      title: "免 VPN 社群",
      descHtml: "國際出口 IP，一般可直接使用全球常用 App。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享數據（依方案額度）。",
    },
    ...usageCommon,
  ],
});

export const CN_USAGE_CMCC_70 = buildChinaUsage({
  title: "使用 jeko 中國移動 70Mbps 吃到飽的優勢",
  subtitle: "較高速吃到飽・ChatGPT／TikTok 不保證",
  items: [
    {
      iconName: "speed",
      title: "約 50～70 Mbps",
      descHtml: "吃到飽速度區間適合導航、社群與影音。",
    },
    {
      iconName: "apps",
      title: "ChatGPT／TikTok",
      descHtml: `本線路<strong>不保證</strong>可用。若需要，請改選 <a href="/product/china/china-unlimited-esim?data_amount=%E5%90%83%E5%88%B0%E9%A3%BD&days=20&telecom=cucc" style="color:#2D5BE3;font-weight:700;text-decoration:underline;">CUCC+（中國聯通）</a>。`,
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線。",
    },
    ...usageCommon,
  ],
});

export const CN_FAQ_CMCC = buildChinaFaq([
  ...chinaSharedFaqItems("中國移動 eSIM"),
  {
    question: "支援 TikTok 嗎？",
    answerHtml: p(
      `本標準中國移動方案<strong>不保證</strong> TikTok／ChatGPT。若需要，請改選 ${link("/product/china/china-unlimited-esim?data_amount=%E5%90%83%E5%88%B0%E9%A3%BD&days=20&telecom=cucc", "CUCC+（中國聯通）吃到飽")}。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
]);

export const CN_FAQ_CUCC_TIKTOK = buildChinaFaq([
  ...chinaSharedFaqItems("中國聯通 GPT + TikTok eSIM"),
  {
    question: "TikTok 開不起來怎麼辦？",
    answerHtml: p(
      `請關閉定位、勿開 VPN，並將本 eSIM 設為主要行動數據後重啟 TikTok。ChatGPT 在 Android 請改用網頁版。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
]);

export const CN_FAQ_CMCC_70 = buildChinaFaq([
  ...chinaSharedFaqItems("中國移動 70Mbps 吃到飽"),
  {
    question: "可以用 ChatGPT／TikTok 嗎？",
    answerHtml: p(
      `本 CMCC 70Mbps 線路<strong>不保證</strong>可使用 ChatGPT／TikTok。若需要，請改選 ${link("/product/china/china-unlimited-esim?data_amount=%E5%90%83%E5%88%B0%E9%A3%BD&days=20&telecom=cucc", "CUCC+（中國聯通）吃到飽")}。`,
      0,
    ),
  },
  {
    question: "速度一定是 70Mbps 嗎？",
    answerHtml: p(
      `實際速度依位置、訊號與擁塞而定，常見約落在 50～70 Mbps 區間，僅供參考。`,
      0,
    ),
  },
]);

/** 相容舊 push slug */
export const CHINA_DAILY_CMCC_DETAILED_CONTENT_HTML = CN_DAILY_CMCC_DETAILED;
