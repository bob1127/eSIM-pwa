/**
 * 韓國 eSIM 每日型 — 使用介紹（兩變體分開）
 */
import { usageAdvantagesSection } from "../../lib/productContentHtmlTemplate.js";

const sharedTail = [
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
      "用 jeko eSIM！出國省更多。預付每日型 eSIM，結帳金額即為方案費用，無漫遊隱藏費用。",
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

export const KOREA_DAILY_DUAL_USAGE_CONTENT_HTML = usageAdvantagesSection({
  title: "使用 jeko 韓國每日型 eSIM 的優勢",
  subtitle: "雙網漫遊・每日高速用完仍可持續連線",
  items: [
    {
      iconName: "wifi_tethering",
      title: "支援熱點共享",
      descHtml: "本方案支援行動熱點／網路共用，方便與旅伴分享連線。",
    },
    {
      iconName: "speed",
      title: "每日額度・用完續航",
      descHtml:
        "每日高速用完後可持續使用：標準約 128 kbps，亦可選約 5 Mbps 續航方案。",
    },
    {
      iconName: "rocket_launch",
      title: "可靠的網絡",
      descHtml:
        "jeko eSIM 走 LG U+ 與 SKT 雙網，於首爾、釜山、濟州等熱門地區提供穩定數據連線。",
    },
    ...sharedTail,
  ],
});

export const KOREA_DAILY_SKT_USAGE_CONTENT_HTML = usageAdvantagesSection({
  title: "使用 jeko 韓國每日型 eSIM 的優勢",
  subtitle: "SKT 單網・每日高速用完約 384 kbps 續航",
  items: [
    {
      iconName: "speed",
      title: "每日額度・用完續航",
      descHtml:
        "每日高速用完後降速至約 384 kbps，可持續傳訊與輕量上網，額度每日重置。",
    },
    {
      iconName: "data_usage",
      title: "明確每日控管",
      descHtml:
        "可選每日 500MB／1GB／2GB 高速額度，依行程用量挑選更安心。",
    },
    {
      iconName: "rocket_launch",
      title: "可靠的網絡",
      descHtml:
        "jeko eSIM 走 SKT（4G／LTE／5G）網路，於首爾、釜山、濟州等熱門地區提供穩定數據連線。",
    },
    ...sharedTail,
  ],
});

export default KOREA_DAILY_DUAL_USAGE_CONTENT_HTML;
