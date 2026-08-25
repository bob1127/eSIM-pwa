/**
 * 紐澳雙切換 eSIM — 下方 tab
 * Medusa：anz-unlimited-esim｜VODAFONE + NZ V
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
  "澳洲：雪梨、墨爾本、布里斯本、黃金海岸等；紐西蘭：奧克蘭、威靈頓、基督城、皇后鎮等南北島熱門路線。";

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

export function anzCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>紐澳吃到飽</strong>`,
        "VODAFONE＋NZ V<br>波蘭 IP",
        "澳紐連遊、一卡兩國",
        `${compareBullets([
          "澳洲 Vodafone；紐西蘭 Vodafone／Spark。",
          "FUP 吃到飽；目前 10／15 天。",
        ])}<div style="margin-top:8px;">${link("/product/anz/anz-unlimited-esim/", "查看紐澳吃到飽")}</div>`,
      ],
      [
        `<strong>僅澳洲／僅紐西蘭</strong>`,
        "OPTUS 或 VODAFONE＋",
        "單國長住、更多天數",
        `${compareBullets([
          "澳洲另有 Optus 吃到飽／每日／總量。",
          "紐西蘭另有 Vodafone 吃到飽／每日／總量。",
        ])}<div style="margin-top:8px;">${link("/product/australia/australia-unlimited-esim/", "澳洲")} · ${link("/product/new-zealand/new-zealand-unlimited-esim/", "紐西蘭")}</div>`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">紐澳連遊怎麼選？</h4>${table}`;
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
      html: `<span class="jeko-sum-warn">建議抵達澳洲或紐西蘭覆蓋範圍後再安裝／啟用 eSIM。</span>提前安裝請關閉行動數據，避免效期提前開始。`,
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
    ${anzCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList(bullets)}
  `);
  return [planHtml, otherActivate(), introHtml].join("\n");
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export const ANZ_UNLIM_DETAILED = buildDetailed({
  carrierHtml: "AU Vodafone + NZ Vodafone／Spark 4G／LTE／5G",
  speedHtml: "4G／LTE／5G；吃到飽不限流量（FUP，實際速度依環境與擁塞而定）",
  planTypeLabel: "吃到飽",
  routeHtml: "漫遊（波蘭 IP）",
  introParas: [
    "jeko eSIM <strong>紐澳雙切換</strong>吃到飽方案，單一 eSIM 可在澳洲與紐西蘭使用，走 <strong>VODAFONE＋NZ V</strong>，出網為<strong>波蘭 IP</strong>。",
    "澳洲段走 Vodafone，紐西蘭段走 Vodafone／Spark。FUP 可持續上網；目前提供 10、15 天。支援熱點與 ChatGPT／TikTok／Gemini。僅數據、無門號／傳統通話／簡訊。",
  ],
  bullets: [
    "運營商：AU Vodafone + NZ Vodafone／Spark・波蘭 IP・4G／LTE／5G",
    "流量：吃到飽不限流量（FUP）；目前 10／15 天",
    "支援熱點；支援 ChatGPT、TikTok、Gemini",
    "僅數據：無門號／傳統通話／簡訊",
    "效期：抵達澳／紐覆蓋範圍連網並開始使用數據後才開始計算",
  ],
});

export const ANZ_USAGE = usageAdvantagesSection({
  title: "使用 jeko 紐澳雙切換 eSIM 的優勢",
  subtitle: "一卡兩國・澳紐連遊",
  items: [
    {
      iconName: "public",
      title: "澳＋紐一卡",
      descHtml: "無需換卡即可在兩國上網，適合連遊與打工度假。",
    },
    {
      iconName: "cell_tower",
      title: "多網覆蓋",
      descHtml: "澳洲 Vodafone；紐西蘭 Vodafone／Spark 互補。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可分享連線；支援 TikTok／ChatGPT／Gemini。",
    },
    {
      iconName: "qr_code_2",
      title: "快速交付",
      descHtml: "付款後數分鐘內以 Email 寄送 QR Code。",
    },
    {
      iconName: "flight_land",
      title: "抵達再啟用",
      descHtml: "建議抵達澳洲或紐西蘭後再安裝／開啟行動數據。",
    },
  ],
});

export const ANZ_FAQ = faqAccordion(
  [
    {
      question: `我的手機是否支援在澳／紐使用 eSIM？`,
      answerHtml: [
        p(`大多數情況下，撥打 <strong>*#06#</strong> 若顯示 EID，即代表裝置支援 eSIM。`),
        p(`亦請確認裝置已解鎖，且系統版本支援 eSIM。`, 0),
      ].join(""),
    },
    {
      question: `紐澳吃到飽何時開始計算效期？`,
      answerHtml: p(
        `效期於 eSIM <strong>連接到支援的網路並開始產生數據流量</strong>後開始。建議抵達澳洲或紐西蘭後再啟用。`,
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
      answerHtml: p(`可以，支援熱點分享；實際速度與額度依當下網路而定。`, 0),
    },
    {
      question: "只有澳洲或只有紐西蘭怎麼辦？",
      answerHtml: p(
        `若僅單國長住或需要更多天數／方案類型，請改選 ${link("/product/australia/australia-unlimited-esim/", "澳洲 eSIM")} 或 ${link("/product/new-zealand/new-zealand-unlimited-esim/", "紐西蘭 eSIM")}。`,
        0,
      ),
    },
  ],
  { defaultOpenIndex: 0 },
);

export default {
  ANZ_UNLIM_DETAILED,
  ANZ_USAGE,
  ANZ_FAQ,
};
