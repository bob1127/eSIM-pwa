/**
 * Viettel 越南本地 IP — 產品介紹 HTML（detailed_content_by_carrier）
 * 方案詳情參考：https://microesim.com/zh/products/vietnam-esim-viettel
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

const expiryPolicy = `有效期於 eSIM 下載到您的裝置後立即開始計算。<span style="color:#ea580c;font-weight:700;">請在準備好使用時再安裝 eSIM。</span>`;

const introBullets = [
  `Viettel 是越南領先的行動營運商。Viettel 旅遊 Sim 卡是正在訪問或計劃前往越南的遊客中最受歡迎的 SIM 卡之一。`,
  `越南 Viettel 旅遊 eSIM 計劃多樣、價格實惠，並在越南提供高速 <strong style="color:#1e293b;">4G/LTE/5G</strong> 網路。`,
];

const whyBullets = [
  `<strong style="color:#1e293b;">最可靠、最廣泛的網路</strong>：Viettel 是越南最可靠、最廣泛的網路。`,
  `<strong style="color:#1e293b;">高速互聯網</strong>：此 eSIM 提供 4G/LTE，目前越南大多數城市都有 5G 網路。`,
  `<strong style="color:#1e293b;">靈活且實惠的數據計劃</strong>：您可以根據旅行計劃選擇 5 至 15 天等服務天數。`,
  `<strong style="color:#1e293b;">越南本地 IP</strong>：您可以像越南本地人一樣訪問本地和國際網站與應用程式。可使用 Facebook、Instagram、TikTok、LINE、WhatsApp 等。`,
  `<strong style="color:#1e293b;">每日 5GB 用量參考</strong>：能夠支援各種網路活動，例如約 10 小時 720P 影片觀看、數千條抖音短影片，或 1000–1200 首歌曲線上收聽。`,
];

export const VIETTEL_LOCAL_DETAILED_CONTENT_HTML = [
  planDetailsGrid(
    [
      [
        {
          iconName: "cell_tower",
          label: "訊號覆蓋範圍",
          valueHtml:
            "河內、胡志明市、峴港、會安、下龍灣、美奈、芽莊、富國島、順化、老街、大叻、富安及越南其他城市。",
        },
        {
          iconName: "network_cell",
          label: "電信業者",
          valueHtml: `<span>Viettel</span> ${badge5G("5G")}`,
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
          valueHtml: "僅數據流量",
        },
      ],
      [
        {
          iconName: "wifi_tethering",
          label: "網路共用／熱點功能",
          valueHtml: "支持",
        },
        {
          iconName: "call",
          label: "電話號碼",
          valueHtml: "無",
        },
      ],
      [
        {
          iconName: "phone_in_talk",
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
          iconName: "public",
          label: "數據路由",
          valueHtml: "本地",
        },
        {
          iconName: "payments",
          label: "充值選項",
          valueHtml: "無",
        },
      ],
      [
        {
          iconName: "settings_ethernet",
          label: "APN",
          valueHtml: "v-internet（多數裝置自動設定）",
        },
        {
          iconName: "timer",
          label: "啟用期限",
          valueHtml: "購買後請於 15 天內掃描 QR Code 並完成啟用。",
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
      html: "有效期於 eSIM 下載到您的裝置後立即開始計算。請在準備好使用時再安裝 eSIM。",
      marginBottom: 16,
    },
    {
      title: "其他資訊",
      html: "購買後請於 <strong style=\"color:#1e293b;\">15 天</strong>內掃描 QR Code 並完成啟用。",
      marginBottom: 16,
    },
    {
      html: "這個 eSIM 由當地運營商提供，作為授權經銷商進行銷售。購買後，該方案是不可取消且不可退款。發行運營商保留在不通知的情況下修改套餐細節的權利。感謝您的理解。",
      marginBottom: 0,
    },
  ]),

  productIntroSection(`
    ${bulletList(introBullets)}
    ${subsectionTitle("為何選擇 越南 Viettel 旅遊 eSIM", "star")}
    ${bulletList(whyBullets)}
    ${paragraph(
      "Viettel 原生當地 IP eSIM，適合需要穩定覆蓋與高速上網的越南行程。",
      0,
    )}
  `),
].join("\n");

export default VIETTEL_LOCAL_DETAILED_CONTENT_HTML;
