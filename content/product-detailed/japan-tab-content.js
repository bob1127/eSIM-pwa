/**
 * 日本 eSIM — SoftBank / KDDI・AU(KDDI)・IIJ Docomo 下方 tab 內容
 * 依旅客文案規範（jeko eSIM、方案詳情卡、方案重點、不展示 API 術語）
 * 三種產品線：每日型 daily-jp／吃到飽 japan-unlimited*／總量型 japan-total-esim
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

const expiryLocalAu = expiryRoaming;

const expiryIij = `<span class="jeko-sum-warn">有效期於 eSIM 下載到您的裝置後立即開始計算。</span>請在準備好使用時再安裝 eSIM。`;

const coverage =
  "東京、京都、廣島、關東、長崎、大阪等日本各城市及旅遊目的地。";

const delivery =
  "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。";

const voiceSms =
  "不支持，只能透過應用程式（網路通話，即 VoIP）。";

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

function planCard(pairs, expiryHtml) {
  return planDetailsSummaryCard({
    title: "方案詳情",
    pairs,
    fullWidth: { label: "效期政策", valueHtml: expiryHtml },
  });
}

/** 三種日本線路比較表（每種電信商產品介紹皆顯示） */
function jpCompareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

function jpCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>日本 eSIM AU (KDDI) - 無限</strong>`,
        "KDDI 單一網絡<br>支援 5G<br>日本 IP<br>無限",
        "串流愛好者<br>遊戲玩家<br>大量數據用戶",
        `${jpCompareBullets([
          "連接到本地的 KDDI (au) 網絡，以獲得快速穩定的日本 IP 連接。",
          "享受無限、高速的 5G／4G 數據（實際速度依環境而定）。",
          "相容於 TikTok、ChatGPT 和 Google 等應用，以及日本獨有應用（例如 TVer、U-NEXT）。",
          "在極少數情況下，可能需要手動 APN 設定。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/japan/japan-unlimited-esim-nolimit/", "AU 吃到飽不降速")}。</div>`,
      ],
      [
        `<strong>日本 eSIM 5G SoftBank / KDDI</strong>`,
        "SoftBank／KDDI 雙重網絡",
        "多城市旅行<br>需要網絡穩定性的用戶",
        jpCompareBullets([
          "覆蓋日本全境的最廣泛 LTE／5G 網絡。",
          "雙重網絡切換，以實現最大信號穩定性。",
          "享受一致的高速 LTE／5G 連接。",
          "適合長期使用 — 最多支援 60 天。",
          "無法訪問 TikTok、ChatGPT 以及日本獨有應用（例如 TVer、U-NEXT）。",
        ]),
      ],
      [
        `<strong>日本 eSIM IIJ NTT Docomo</strong>`,
        "Docomo 附日本 IP",
        "訪問日本獨有內容",
        `${jpCompareBullets([
          "包含一個具有低延遲的真實日本 IP。",
          "完全訪問 TikTok、ChatGPT 和日本獨有應用，如 TVer、U-NEXT。",
          "無限數據，全速上網（實際速度依環境而定）。",
          "僅限於 4G／LTE 網絡；不支援 5G。",
          "需手動設定 APN（vmobile.jp）。",
        ])}`,
      ],
    ],
  );
  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款日本 eSIM 最適合您？</h4>${table}`;
}

/** SoftBank / KDDI 雙網（漫遊） */
export function buildJpSoftBankKddiDetailed({
  planTypeLabel,
  speedHtml,
  trafficBullet,
  extraBullets = [],
  carrierHtml = "KDDI 5G、SoftBank 5G",
  routeHtml = "漫遊",
}) {
  const planHtml = planCard(
    basePairs({
      carrierHtml,
      speedHtml,
      planTypeHtml: `僅數據流量・${planTypeLabel}（漫遊線路）`,
      routeHtml,
    }),
    expiryRoaming,
  );

  const networkBullet =
    carrierHtml.includes("三網")
      ? "電信網路：KDDI／SoftBank／Docomo 三網切換（4G／LTE／5G）"
      : "電信網路：KDDI 與 SoftBank（4G／LTE／5G）雙網";

  const introHtml = productIntroSection(`
    ${paragraph(
      "在這裡尋找最佳日本旅遊 eSIM，為您的奇妙旅程帶來便利。jeko eSIM 的日本方案覆蓋大部分城市，並可在流暢網路下設置熱點，與朋友或家人分享。",
      16,
    )}
    ${paragraph(
      "這張日本 eSIM 即時透過電子郵件發送，並可透過 QR Code 快速啟動。在 iPhone 和 Android 上設置就像 ABC 一樣簡單。",
      16,
    )}
    ${paragraph(
      `此方案支援 Google、YouTube、Facebook、Instagram 和 WhatsApp 等應用，<span class="jeko-sum-warn">但不支援 TikTok</span>。若您重度使用 TikTok 或需要日本在地 App，請考慮 ${link("/product/japan/japan-unlimited-esim/", "IIJ Docomo")} 或 ${link("/product/japan/japan-unlimited-esim-nolimit/", "AU (KDDI)")}。`,
      20,
    )}
    ${jpCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      networkBullet,
      "數據路由：漫遊；多數裝置 APN 可自動帶入",
      "效期：抵達當地連網並開始使用數據後才開始計算",
      trafficBullet,
      "僅數據：無門號／傳統通話／簡訊；支援熱點；不支援 TikTok／部分日本在地 App",
      ...extraBullets,
    ])}
  `);

  return [planHtml, introHtml].join("\n");
}

const auApnHtml = `大多數情況下，APN 會自動設置。若需手動設定：

<strong>APN:</strong> uad5gn.au-net.ne.jp
<strong>用戶名:</strong> au@uad5gn.au-net.ne.jp
<strong>密碼:</strong> au
<strong>身份驗證類型:</strong> CHAP

或

<strong>APN:</strong> au.5g.au-net.ne.jp
<strong>用戶名:</strong> user@au.5g.au-net.ne.jp
<strong>密碼:</strong> au
<strong>身份驗證類型:</strong> CHAP

若仍無法連線，可試 4G 專用：

<strong>APN:</strong> uno.au-net.ne.jp
<strong>用戶名:</strong> 685840734641020@uno.au-net.ne.jp
<strong>密碼:</strong> KpyrR6BP
<strong>身份驗證類型:</strong> CHAP`;

/** AU (KDDI) 本地日本 IP */
export function buildJpAuKddiDetailed({
  planTypeLabel,
  speedHtml,
  trafficBullet,
  hotspotNote,
  showHotspotTable = false,
  isTrueUnlimited = false,
}) {
  const planHtml = planCard(
    basePairs({
      carrierHtml: "KDDI 5G",
      speedHtml,
      planTypeHtml: `僅數據流量・${planTypeLabel}（本地線路）`,
      routeHtml: "本地（日本 IP）",
    }),
    expiryLocalAu,
  );

  const otherHtml = otherInfoBlock([
    {
      title: "重要",
      html: "一旦刪除，此 eSIM 無法重新安裝。",
      marginBottom: 16,
    },
    {
      title: "服務天數",
      html: "以日本時間（UTC+9）計算，從啟動日開始。",
      marginBottom: 16,
    },
    {
      title: "APN 設置",
      html: auApnHtml,
      marginBottom: 16,
    },
    {
      html: "購買後請於 <strong>150 天</strong>內掃描 QR Code 並完成啟用。",
      marginBottom: 12,
    },
    {
      html: "此 eSIM 由當地運營商提供，jeko eSIM 作為授權通路銷售。數位商品退換依本站退換貨政策；發行運營商可能調整方案細節。感謝您的理解。",
      marginBottom: 0,
    },
  ]);

  const hotspotTable = showHotspotTable
    ? dataTable(
        ["方案", "描述", "熱點分享"],
        [
          [
            "<strong>總量型</strong>",
            "固定高速數據量，用完前維持高速。",
            "熱點消耗您的總 GB，無額外上限。",
          ],
          [
            "<strong>吃到飽 10Mbps</strong>",
            "約 10Mbps 無限數據。",
            "熱點額度約為「天數 − 1」GB（例：7 天可分享約 6GB）。",
          ],
          [
            "<strong>吃到飽不降速</strong>",
            "真正高速無限數據。",
            "熱點額度同樣約為「天數 − 1」GB。",
          ],
        ],
      )
    : "";

  const introHtml = productIntroSection(`
    ${paragraph(
      "本方案由日本主要電信商 au（KDDI）提供。作為日本領先電信之一，特別適合經常前往日本或短期旅客，並提供日本本地 IP 與低延遲連線。",
      16,
    )}
    ${paragraph(
      "遊客只需掃描 QR Code 即可輕鬆啟動，直接連接 KDDI 本地訊號。主要城市常見出色 5G／4G 表現；支援 Google、YouTube、Facebook、Instagram、ChatGPT 與 TikTok 等應用。",
      16,
    )}
    ${
      isTrueUnlimited
        ? paragraph(
            "本方案為真正高速吃到飽（實際速度依位置與網路環境而定），適合串流、遊戲與大量數據需求。",
            16,
          )
        : ""
    }
    ${hotspotTable}
    ${hotspotNote ? paragraph(hotspotNote, 16) : ""}
    ${paragraph(
      `若您在多個城市旅行、想要最穩定訊號，可考慮雙網路 ${link("/product/japan/daily-jp/", "SoftBank／KDDI")}。`,
      20,
    )}
    ${jpCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "電信網路：KDDI（au）4G／LTE／5G・日本本地 IP",
      "多數情況 APN 自動帶入；必要時依「其他資訊」手動設定",
      "效期：連網並開始使用數據後開始計算；請於 150 天內完成啟用",
      trafficBullet,
      "僅數據：無門號／傳統通話／簡訊；支援熱點；支援 TikTok／ChatGPT／在地 App",
      "刪除後無法重新安裝，請勿任意移除 eSIM",
    ])}
  `);

  return [planHtml, otherHtml, introHtml].join("\n");
}

/** IIJ Docomo 本地日本 IP・僅 LTE */
export function buildJpIijDocomoDetailed({
  planTypeLabel,
  speedHtml,
  trafficBullet,
  showUnlimitedFupNote = false,
}) {
  const planHtml = planCard(
    basePairs({
      carrierHtml: "IIJ（Docomo）LTE",
      speedHtml,
      planTypeHtml: `僅數據流量・${planTypeLabel}（本地線路）`,
      routeHtml: "本地（日本 IP）",
    }),
    expiryIij,
  );

  const otherHtml = otherInfoBlock([
    {
      title: "APN 設置",
      html: '請手動將 APN 設為 <strong>vmobile.jp</strong>，才能在日本上網。',
      marginBottom: 0,
    },
  ]);

  const introHtml = productIntroSection(`
    ${paragraph(
      "隆重介紹 jeko 日本 Docomo eSIM（IIJ），旅行時保持順暢連線的好夥伴。此方案僅數據、提供日本本地 IP，無需漫遊設定即可連線，適合探索東京街頭、分享旅遊動態或與親友聯繫。",
      16,
    )}
    ${paragraph(
      `<span class="jeko-sum-warn">注意：</span>本方案需手動設定 APN（vmobile.jp）。若不想手動設定，可考慮 ${link("/product/japan/japan-unlimited-esim-nolimit/", "AU (KDDI)")} 或其他日本 eSIM。`,
      16,
    )}
    ${
      showUnlimitedFupNote
        ? paragraph(
            `<span class="jeko-sum-warn">注意：</span>根據電信業者說明，吃到飽方案在正常使用下沒有流量上限；部分用戶回報大量使用時可能被降速（常見約每日 10GB），每日用量重置後通常會自動恢復。感謝您的理解。`,
            20,
          )
        : ""
    }
    ${jpCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "電信網路：Docomo（經 IIJ）・僅 4G／LTE，不支援 5G",
      "日本本地 IP；需手動 APN：vmobile.jp",
      "效期：下載／安裝到裝置後立即開始計算，請準備使用時再安裝",
      trafficBullet,
      "僅數據：無門號／傳統通話／簡訊；支援熱點；支援 TikTok／ChatGPT／在地 App",
    ])}
  `);

  return [planHtml, otherHtml, introHtml].join("\n");
}

export function buildJpUsage({ title, subtitle, items }) {
  return usageAdvantagesSection({ title, subtitle, items });
}

export function buildJpFaq(items) {
  return faqAccordion(items, { defaultOpenIndex: 0 });
}

const p = (text, mb = 12) =>
  `<p style="margin:0 0 ${mb}px;">${text}</p>`;

export function jpSharedFaqItems(productName = "日本 eSIM") {
  return [
    {
      question: `我的手機是否支援在日本使用 eSIM？`,
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
          `建議在穩定 Wi‑Fi 下掃描 QR Code 完成安裝；抵達日本後再開啟該 eSIM 並切換行動數據（漫遊方案請一併開啟數據漫遊）。`,
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

// SoftBank / KDDI
export const JP_DAILY_SOFTBANK_KDDI_DETAILED = buildJpSoftBankKddiDetailed({
  planTypeLabel: "每日型",
  speedHtml:
    "4G／LTE／5G（每日高速額度內）；高速用完後降速可持續使用，隔日重置",
  trafficBullet:
    "流量：每日高速用完後降速可持續使用（隔日重置）；適合多城市、要訊號穩定的旅客",
});

/** SoftBank 單網（每日型；Android 多半需手動 APN plus.4g） */
export const JP_DAILY_SOFTBANK_ONLY_DETAILED = (() => {
  const planHtml = planCard(
    basePairs({
      carrierHtml: "SoftBank 5G",
      speedHtml:
        "4G／LTE／5G（每日高速額度內）；高速用完後降速可持續使用，隔日重置",
      planTypeHtml: "僅數據流量・每日型（漫遊線路・日本 IP）",
      routeHtml: "漫遊（日本 IP）",
    }),
    expiryRoaming,
  );
  const otherHtml = otherInfoBlock([
    {
      title: "APN 設置（Android 常見需手動）",
      html: `iPhone 多半會自動帶入。大部分 Android 請手動設定：
<strong>APN:</strong> plus.4g
<strong>用戶名:</strong> plus
<strong>密碼:</strong> 4g
<strong>身份驗證類型:</strong> CHAP`,
      marginBottom: 0,
    },
  ]);
  const introHtml = productIntroSection(`
    ${paragraph(
      "本方案為 SoftBank 單網每日型 eSIM（漫遊線路、日本 IP），適合偏好 SoftBank 覆蓋、需要日本出口 IP 的旅客。",
      16,
    )}
    ${paragraph(
      `<span class="jeko-sum-warn">注意：</span>大部分 Android 通常需手動設定 APN（plus.4g）。若不想手動設定，可改選 ${link("/product/japan/daily-jp/", "SoftBank／KDDI 雙網")}。`,
      20,
    )}
    ${jpCompareTableSection()}
    <h4 style="margin:24px 0 12px;font-size:16px;font-weight:700;color:#1e293b;">方案重點</h4>
    ${bulletList([
      "電信網路：SoftBank 單網（4G／LTE／5G）・日本 IP",
      "APN：plus.4g（Android 多半需手動；用戶名 plus／密碼 4g／CHAP）",
      "效期：抵達當地連網並開始使用數據後才開始計算",
      "流量：每日高速用完後降速可持續使用（隔日重置）",
      "僅數據：無門號／傳統通話／簡訊；支援熱點",
    ])}
  `);
  return [planHtml, otherHtml, introHtml].join("\n");
})();

/** KDDI／SoftBank／Docomo 三網（每日型） */
export const JP_DAILY_TRIPLE_DETAILED = buildJpSoftBankKddiDetailed({
  planTypeLabel: "每日型",
  carrierHtml: "KDDI、SoftBank、Docomo（三網切換）",
  routeHtml: "漫遊",
  speedHtml:
    "4G／LTE／5G（每日高速額度內）；高速用完後降速可持續使用，隔日重置",
  trafficBullet:
    "流量：每日高速用完後降速可持續使用（隔日重置）；三網切換提升覆蓋與穩定度",
  extraBullets: [
    "三網自動切換：KDDI／SoftBank／Docomo，適合跨區移動多的行程",
  ],
});

export const JP_UNLIMITED_SOFTBANK_KDDI_DETAILED = buildJpSoftBankKddiDetailed({
  planTypeLabel: "吃到飽",
  speedHtml: "4G／LTE／5G；高速吃到飽（實際速度依環境而定）",
  trafficBullet: "流量：高速吃到飽；雙網切換提升穩定性",
});

export const JP_UNLIMITED_SOFTBANK_KDDI_10MBPS_DETAILED =
  buildJpSoftBankKddiDetailed({
    planTypeLabel: "吃到飽（約 10Mbps）",
    speedHtml: "4G／LTE／5G；約 10Mbps 吃到飽（實際速度依環境而定）",
    trafficBullet: "流量：約 10Mbps 吃到飽；雙網切換提升穩定性",
  });

export const JP_TOTAL_KDDI_SOFTBANK_DETAILED = buildJpSoftBankKddiDetailed({
  planTypeLabel: "總量型",
  speedHtml: "4G／LTE／5G（總量高速額度內）；高速用完後降速至約 128 kbps",
  trafficBullet:
    "流量：總量高速用完後約 128 kbps 可持續使用；請依行程預估總 GB",
});

// AU(KDDI)
export const JP_TOTAL_AU_KDDI_DETAILED = buildJpAuKddiDetailed({
  planTypeLabel: "總量型",
  speedHtml: "4G／LTE／5G（總量高速額度內）；高速用完後降速至約 128 kbps",
  trafficBullet: "流量：總量高速用完後約 128 kbps 可持續使用",
  hotspotNote: "總量型熱點分享會消耗您購買的總 GB，無額外熱點上限。",
  showHotspotTable: true,
});

export const JP_UNLIMITED_AU_10MBPS_DETAILED = buildJpAuKddiDetailed({
  planTypeLabel: "吃到飽（約 10Mbps）",
  speedHtml: "4G／LTE／5G；約 10Mbps 吃到飽（實際速度依環境而定）",
  trafficBullet: "流量：約 10Mbps 吃到飽；熱點額度約為「天數 − 1」GB",
  hotspotNote:
    "吃到飽 10Mbps 的熱點可分享量約為「天數 − 1」GB（例如 7 天約 6GB）。",
  showHotspotTable: true,
});

export const JP_UNLIMITED_AU_NOLIMIT_DETAILED = buildJpAuKddiDetailed({
  planTypeLabel: "吃到飽不降速",
  speedHtml: "4G／LTE／5G；真正高速吃到飽（實際速度依位置與網路環境）",
  trafficBullet: "流量：真・高速吃到飽不刻意限速；熱點額度約為「天數 − 1」GB",
  hotspotNote:
    "吃到飽不降速方案的熱點可分享量約為「天數 − 1」GB（例如 7 天約 6GB）。",
  showHotspotTable: true,
  isTrueUnlimited: true,
});

// IIJ
export const JP_DAILY_IIJ_DETAILED = buildJpIijDocomoDetailed({
  planTypeLabel: "每日型",
  speedHtml: "4G／LTE（每日高速額度內）；高速用完後降速可持續使用，隔日重置",
  trafficBullet: "流量：每日高速用完後降速可持續使用（隔日重置）",
});

export const JP_UNLIMITED_IIJ_DETAILED = buildJpIijDocomoDetailed({
  planTypeLabel: "吃到飽",
  speedHtml: "4G／LTE；高速吃到飽（僅 LTE，無 5G）",
  trafficBullet: "流量：吃到飽；大量使用時可能觸發公平使用降速",
  showUnlimitedFupNote: true,
});

export const JP_TOTAL_IIJ_DETAILED = buildJpIijDocomoDetailed({
  planTypeLabel: "總量型",
  speedHtml: "4G／LTE（總量高速額度內）；高速用完後降速至約 200 kbps",
  trafficBullet: "流量：總量高速用完後約 200 kbps 可持續使用",
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

export const JP_USAGE_SOFTBANK_KDDI = buildJpUsage({
  title: "使用 jeko 日本 SoftBank／KDDI eSIM 的優勢",
  subtitle: "雙網漫遊・覆蓋廣、訊號穩定",
  items: [
    {
      iconName: "cell_tower",
      title: "雙網穩定",
      descHtml: "KDDI 與 SoftBank 雙網切換，適合多城市移動。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線（實際速度與額度依方案而定）。",
    },
    {
      iconName: "rocket_launch",
      title: "4G／5G",
      descHtml: "支援 4G／LTE／5G，主要城市連線體驗佳。",
    },
    ...usageCommon,
  ],
});

export const JP_USAGE_SOFTBANK_ONLY = buildJpUsage({
  title: "使用 jeko 日本 SoftBank eSIM 的優勢",
  subtitle: "SoftBank 單網・日本 IP・Android 請注意 APN",
  items: [
    {
      iconName: "public",
      title: "日本 IP",
      descHtml: "漫遊線路、日本出口 IP，在地服務通常較順。",
    },
    {
      iconName: "settings",
      title: "Android APN",
      descHtml: "多數 Android 請手動設定 APN：plus.4g。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線（依方案額度）。",
    },
    ...usageCommon,
  ],
});

export const JP_USAGE_TRIPLE = buildJpUsage({
  title: "使用 jeko 日本三網切換 eSIM 的優勢",
  subtitle: "KDDI／SoftBank／Docomo・覆蓋互補",
  items: [
    {
      iconName: "cell_tower",
      title: "三網切換",
      descHtml: "單一 eSIM 在三大網路間找訊號，適合跨區移動。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享連線（實際速度與額度依方案而定）。",
    },
    {
      iconName: "rocket_launch",
      title: "4G／5G",
      descHtml: "支援 4G／LTE／5G（視當下連上的網路而定）。",
    },
    ...usageCommon,
  ],
});

export const JP_USAGE_AU_KDDI = buildJpUsage({
  title: "使用 jeko 日本 AU（KDDI）eSIM 的優勢",
  subtitle: "日本本地 IP・低延遲・支援 TikTok",
  items: [
    {
      iconName: "public",
      title: "日本本地 IP",
      descHtml: "直連 KDDI，延遲低，適合在地 App 與串流。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可分享熱點；吃到飽方案熱點額度約為天數減 1 GB。",
    },
    {
      iconName: "apps",
      title: "App 相容佳",
      descHtml: "支援 TikTok、ChatGPT 與多數日本在地影音服務。",
    },
    ...usageCommon,
  ],
});

export const JP_USAGE_IIJ = buildJpUsage({
  title: "使用 jeko 日本 IIJ Docomo eSIM 的優勢",
  subtitle: "日本 IP・Docomo 覆蓋・需手動 APN",
  items: [
    {
      iconName: "public",
      title: "日本本地 IP",
      descHtml: "適合 TikTok、ChatGPT 與日本在地內容。",
    },
    {
      iconName: "settings",
      title: "手動 APN",
      descHtml: "請將 APN 設為 vmobile.jp 後再上網。",
    },
    {
      iconName: "wifi_tethering",
      title: "支援熱點",
      descHtml: "可與旅伴分享數據（依方案額度）。",
    },
    ...usageCommon,
  ],
});

export const JP_FAQ_SOFTBANK_KDDI = buildJpFaq([
  ...jpSharedFaqItems("日本 SoftBank／KDDI eSIM"),
  {
    question: "支援 TikTok 嗎？",
    answerHtml: p(
      `本雙網漫遊方案<strong>不支援 TikTok</strong>及部分日本在地 App。若需要，請改選 AU（KDDI）或 IIJ Docomo。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
]);

export const JP_FAQ_SOFTBANK_ONLY = buildJpFaq([
  ...jpSharedFaqItems("日本 SoftBank eSIM"),
  {
    question: "為什麼 Android 有訊號但不能上網？",
    answerHtml: p(
      `請手動設定 APN 為 <strong>plus.4g</strong>（用戶名 plus／密碼 4g／CHAP），再重試行動數據。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
]);

export const JP_FAQ_TRIPLE = buildJpFaq([
  ...jpSharedFaqItems("日本三網切換 eSIM"),
  {
    question: "三網是什麼意思？",
    answerHtml: p(
      `同一張 eSIM 可在 KDDI、SoftBank、Docomo 之間切換找訊號，適合多城市、長距離移動。`,
      0,
    ),
  },
  {
    question: "可以用熱點嗎？",
    answerHtml: p(`可以，支援熱點分享；實際速度與額度依所選方案而定。`, 0),
  },
]);

export const JP_FAQ_AU_KDDI = buildJpFaq([
  ...jpSharedFaqItems("日本 AU（KDDI）eSIM"),
  {
    question: "需要手動設定 APN 嗎？",
    answerHtml: p(
      `多數情況會自動設定。若無法上網，請依產品介紹「其他資訊」中的 AU APN 步驟手動設定。`,
      0,
    ),
  },
  {
    question: "刪除 eSIM 後可以重裝嗎？",
    answerHtml: p(
      `<span style="color:#ea580c;font-weight:700;">不可以。</span>一旦刪除無法重新安裝，請勿任意移除。`,
      0,
    ),
  },
]);

export const JP_FAQ_IIJ = buildJpFaq([
  ...jpSharedFaqItems("日本 IIJ Docomo eSIM"),
  {
    question: "為什麼裝好還不能上網？",
    answerHtml: p(
      `本方案需手動設定 APN 為 <strong>vmobile.jp</strong>。設定完成後再開啟行動數據。`,
      0,
    ),
  },
  {
    question: "效期什麼時候開始？",
    answerHtml: p(
      `<span style="color:#ea580c;font-weight:700;">下載／安裝到手機後立即開始計算</span>，請準備使用時再安裝。`,
      0,
    ),
  },
]);
