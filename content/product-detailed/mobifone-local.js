/**
 * Mobifone 當地號碼 — 產品介紹 HTML（detailed_content_by_carrier）
 * 對齊方案詳情／其他資訊（含啟用與查詢代碼）
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

const expiryPolicy = `有效期於 eSIM 下載到您的裝置後立即開始計算。<span style="color:#ca8a04;font-weight:700;background:#fef9c3;padding:1px 4px;border-radius:4px;">請在準備好使用時再安裝 eSIM。</span>`;

const callHtml = `<span style="color:#dc2626;font-weight:700;">僅限接聽來電 (免費)</span>`;
const smsHtml = `<span style="color:#dc2626;font-weight:700;">僅限接收 (免費)</span><div style="margin-top:6px;font-size:13px;color:#64748b;">請注意，由於這是一張旅遊 eSIM，可能無法完全保證應用程式註冊的簡訊接收。</div>`;

const whyBullets = [
  `<strong style="color:#1e293b;">越南本地號碼</strong>：附帶越南本地手機號碼。接聽來電與接收簡訊均免費，無需額外費用。`,
  `<strong style="color:#1e293b;">高速數據上網</strong>：涵蓋全越南的高速 4G/LTE 數據，適合用於影音串流、社群媒體、導航等用途。`,
  `<strong style="color:#1e293b;">像在地人一樣使用</strong>：可暢用 Facebook、Instagram、TikTok、LINE、WhatsApp、Zalo、Grab 等應用程式，無地區限制，與本地使用者相同體驗。`,
];

export const MOBIFONE_LOCAL_DETAILED_CONTENT_HTML = [
  planDetailsGrid(
    [
      [
        {
          iconName: "cell_tower",
          label: "訊號覆蓋範圍",
          valueHtml:
            "涵蓋胡志明市、河內、芽莊、富國島、峴港、下龍市及越南其他城市與地區",
        },
        {
          iconName: "network_cell",
          label: "電信業者",
          valueHtml: `<span>Mobifone</span> ${badge5G("4G")}`,
        },
      ],
      [
        {
          iconName: "speed",
          label: "速度",
          valueHtml: "4G / LTE",
        },
        {
          iconName: "sim_card",
          label: "方案類型",
          valueHtml: "數據 + 通話 + 簡訊",
        },
      ],
      [
        {
          iconName: "wifi_tethering",
          label: "網路共用 / 熱點功能",
          valueHtml: "支持",
        },
        {
          iconName: "phone_iphone",
          label: "電話號碼",
          valueHtml: "+84 越南本地手機號碼，撥打 *0# 查詢",
        },
      ],
      [
        {
          iconName: "call",
          label: "通話",
          valueHtml: callHtml,
        },
        {
          iconName: "sms",
          label: "簡訊",
          valueHtml: smsHtml,
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
    ],
    {
      iconName: "event",
      label: "效期政策",
      valueHtml: expiryPolicy,
    },
  ),

  otherInfoBlock([
    {
      title: "啟用方式",
      html: "抵達後請撥打 <strong style=\"color:#1e293b;\">900</strong>，接著按 <strong style=\"color:#1e293b;\">1</strong> 進行啟用。",
      marginBottom: 16,
    },
    {
      title: "查詢手機號碼",
      html: '撥打 <strong style="color:#1e293b;">*0#</strong>',
      marginBottom: 16,
    },
    {
      title: "查詢流量",
      html: '撥打 <strong style="color:#1e293b;">*090*5#</strong>，或發送簡訊 <strong style="color:#1e293b;">KT_ALL</strong> 至 <strong style="color:#1e293b;">999</strong>。',
      marginBottom: 16,
    },
    {
      title: "啟用期限",
      html: "兌換後請於 <strong style=\"color:#1e293b;\">30 天內</strong>掃描 QR Code 並完成啟用。",
      marginBottom: 16,
    },
    {
      title: "流量重置",
      html: "越南時間 00:00（UTC+7）。",
      marginBottom: 16,
    },
    {
      title: "APN",
      html: '多數裝置自動設定；若需手動請使用 <strong style="color:#1e293b;">m-wap</strong>。',
      marginBottom: 16,
    },
    {
      html: "這個 eSIM 由當地運營商提供，作為授權經銷商進行銷售。購買後，該方案是不可取消且不可退款。運營商保留修改方案細節的權利，經銷商可能無法即時通知客戶相關變更。",
      marginBottom: 0,
    },
  ]),

  productIntroSection(`
    ${paragraph(
      `Mobifone 越南 eSIM 為旅客提供本地手機號碼、高速行動數據與簡訊（僅限接收）功能。Mobifone 是越南領先的電信運營商之一，擁有廣泛的覆蓋範圍與穩定的網路連線，為旅程帶來便捷的溝通體驗。這款 eSIM 非常適合尋求無縫、實惠上網方案的遊客。`,
      24,
    )}
    ${subsectionTitle("為什麼選擇 Mobifone eSIM 來越南旅遊：", "star")}
    ${bulletList(whyBullets)}
  `),
].join("\n");

export default MOBIFONE_LOCAL_DETAILED_CONTENT_HTML;
