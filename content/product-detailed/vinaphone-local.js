/**
 * Vinaphone 越南本地 IP — 產品介紹 HTML（detailed_content_by_carrier）
 */
import {
  planDetailsGrid,
  badge5G,
  otherInfoBlock,
  productIntroSection,
  bulletList,
  paragraph,
  subsectionTitle,
} from "../../lib/productContentHtmlTemplate.js";

const expiryPolicy = `一旦 eSIM 連接到支援的網路並開始產生數據訪問互聯網，有效期限即開始。我們建議您在到達越南後再安裝／啟用 eSIM。您也可以提前安裝，<span style="color:#ea580c;font-weight:700;">但請記得安裝後立即關閉行動數據</span>，以避免有效期提前開始。`;

const whyBullets = [
  `<strong style="color:#1e293b;">越南本地 IP</strong>：透過本地 IP 位址，享受快速穩定、延遲低的網路連線。更佳的隱私保護與更少的限制。`,
  `<strong style="color:#1e293b;">高速連線</strong>：支援 4G/LTE/5G 網路，越南全境順暢使用。更快訪問本地網站與應用，更佳的串流、遊戲與視訊通話體驗。`,
  `<strong style="color:#1e293b;">像在地用戶一樣自由使用</strong>：可使用您喜愛的應用程式，例如 Facebook、Instagram、TikTok、LINE、WhatsApp、Zalo、Grab 等，無地區限制，兼容性更高。`,
  `<strong style="color:#1e293b;">多樣且實惠的方案</strong>：提供各種數據方案，滿足不同旅程天數與使用需求。`,
];

export const VINAPHONE_LOCAL_DETAILED_CONTENT_HTML = [
  planDetailsGrid(
    [
      [
        {
          iconName: "cell_tower",
          label: "訊號覆蓋範圍",
          valueHtml: "河內、胡志明市、峴港、下龍灣、富國島等越南全境旅遊目的地。",
        },
        {
          iconName: "network_cell",
          label: "電信業者",
          valueHtml: `<span>Vinaphone</span> ${badge5G("5G")}`,
        },
      ],
      [
        {
          iconName: "speed",
          label: "速度",
          valueHtml: "4G / LTE / 5G",
        },
        {
          iconName: "sim_card",
          label: "方案類型",
          valueHtml: "僅數據流量（當地 IP）",
        },
      ],
      [
        {
          iconName: "wifi_tethering",
          label: "網路共用 / 熱點功能",
          valueHtml: "支持",
        },
        {
          iconName: "public",
          label: "數據路由",
          valueHtml: "越南本地 IP",
        },
      ],
      [
        {
          iconName: "call",
          label: "通話",
          valueHtml: "不支持，只能透過應用程式（網路通話，即 VoIP）。",
        },
        {
          iconName: "sms",
          label: "簡訊",
          valueHtml: "無",
        },
      ],
      [
        {
          iconName: "badge",
          label: "eKYC（身分驗證）",
          valueHtml: "不需要",
        },
        {
          iconName: "mail",
          label: "交付",
          valueHtml:
            "eSIM 的 QR 碼會在付款完成後的幾分鐘內透過電子郵件發送給您。",
        },
      ],
      [
        {
          iconName: "settings_ethernet",
          label: "APN",
          valueHtml: "m3-world（多數裝置自動設定）",
        },
        {
          iconName: "payments",
          label: "充值選項",
          valueHtml: "無",
        },
      ],
    ],
    {
      iconName: "event",
      label: "效期政策",
      valueHtml: expiryPolicy,
    },
  ),

  otherInfoBlock([
    {
      title: "⚠️ 重要",
      html: "一旦刪除，此 eSIM 無法重新安裝。",
      marginBottom: 16,
    },
    {
      title: "APN 設置",
      html: '大多數情況下 APN 會自動設定。若需手動設定，請使用 <strong style="color:#1e293b;">m3-world</strong>。',
      marginBottom: 16,
    },
    {
      html: "這個 eSIM 由當地運營商提供，作為授權經銷商進行銷售。購買後，該方案是不可取消且不可退款。",
      marginBottom: 0,
    },
  ]),

  productIntroSection(`
    ${paragraph(
      `Vinaphone 越南本地 IP 數據 eSIM 透過數位 SIM 卡，使用越南當地的網路基礎設施提供網路連線服務。不同於傳統的旅遊 eSIM 依賴漫遊 IP 和國際電信商，本產品由越南本地電信商直接運營，帶來真正的本地上網體驗。`,
      24,
    )}
    ${subsectionTitle("為什麼選擇 Vinaphone 本地 IP eSIM？", "star")}
    ${bulletList(whyBullets)}
  `),
].join("\n");

export default VINAPHONE_LOCAL_DETAILED_CONTENT_HTML;
