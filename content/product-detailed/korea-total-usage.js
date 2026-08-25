/**
 * 韓國 eSIM 總量型 — 使用介紹
 * 雙切換：可熱點；SK電信 5G：不寫「支援熱點」（Medusa hotspot=false）
 */
import { usageAdvantagesSection } from "../../lib/productContentHtmlTemplate.js";

const sharedBase = [
  {
    iconName: "rocket_launch",
    title: "可靠的網絡",
    descHtml:
      "jeko eSIM 採用供應商提供的韓國網路列表（LG U+／SKT），於首爾、釜山、濟州等熱門地區提供穩定數據連線。",
  },
  {
    iconName: "mark_email_unread",
    title: "即時交付",
    descHtml:
      "下單後，透過電子郵件接收 eSIM 資訊以即時連線；也可至「我的 eSIM」查看 QR Code。",
  },
  {
    iconName: "payments",
    title: "無額外費用",
    descHtml:
      "用 jeko eSIM！出國省更多。預付總量型 eSIM，結帳金額即為方案費用，無漫遊隱藏費用。",
  },
  {
    iconName: "sim_card",
    title: "享受雙卡雙待",
    descHtml:
      "原來的 SIM 卡將照常工作。您可以使用 WhatsApp、Skype 和 LINE 等 VoIP 應用程式。",
  },
  {
    iconName: "qr_code_2",
    title: "簡單易用",
    descHtml:
      "透過掃描簡單的二維碼，在幾分鐘內輕鬆啟動您的 eSIM 數據計劃。",
  },
];

export const KOREA_TOTAL_DUAL_USAGE_CONTENT_HTML = usageAdvantagesSection({
  title: "使用 jeko 韓國總量型 eSIM 的優勢",
  subtitle: "雙網漫遊・高速用完後約 128 kbps 續航",
  items: [
    {
      iconName: "wifi_tethering",
      title: "支援熱點共享",
      descHtml:
        "本電信商變體支援行動熱點／網路共用（以本店規格標示為準）。",
    },
    {
      iconName: "speed",
      title: "用完降速不斷網",
      descHtml:
        "總量高速用完後降速至約 128 kbps，仍可傳訊與輕量上網。",
    },
    ...sharedBase,
  ],
});

export const KOREA_TOTAL_SKT_USAGE_CONTENT_HTML = usageAdvantagesSection({
  title: "使用 jeko 韓國總量型 eSIM 的優勢",
  subtitle: "明確總量・請留意用完即斷網",
  items: [
    {
      iconName: "warning",
      title: "流量用完即斷網",
      descHtml:
        "本方案流量用完即斷網，無法繼續上網，請預留餘量。",
    },
    {
      iconName: "data_usage",
      title: "明確總量控管",
      descHtml:
        "可依行程選 1GB～50GB 等總量（以商品頁可選規格為準），方便預算與用量管理。",
    },
    {
      iconName: "rocket_launch",
      title: "可靠的網絡",
      descHtml:
        "jeko eSIM 走 SKT（4G／LTE／5G）網路，於首爾、釜山、濟州等熱門地區提供穩定數據連線。",
    },
    {
      iconName: "mark_email_unread",
      title: "即時交付",
      descHtml:
        "下單後，透過電子郵件接收 eSIM 資訊以即時連線；也可至「我的 eSIM」查看 QR Code。",
    },
    {
      iconName: "payments",
      title: "無額外費用",
      descHtml:
        "用 jeko eSIM！出國省更多。預付總量型 eSIM，結帳金額即為方案費用，無漫遊隱藏費用。",
    },
    {
      iconName: "sim_card",
      title: "享受雙卡雙待",
      descHtml:
        "原來的 SIM 卡將照常工作。您可以使用 WhatsApp、Skype 和 LINE 等 VoIP 應用程式。",
    },
    {
      iconName: "qr_code_2",
      title: "簡單易用",
      descHtml:
        "透過掃描簡單的二維碼，在幾分鐘內輕鬆啟動您的 eSIM 數據計劃。",
    },
  ],
});

export default KOREA_TOTAL_DUAL_USAGE_CONTENT_HTML;
