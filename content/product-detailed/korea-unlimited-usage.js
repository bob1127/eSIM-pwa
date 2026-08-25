/**
 * 韓國 eSIM 吃到飽 — 使用介紹（優勢卡片）
 * 兩電信商共用；用 push-carrier-detailed-content.mjs 推送 contentType=usage
 */
import { usageAdvantagesSection } from "../../lib/productContentHtmlTemplate.js";

export const KOREA_UNLIMITED_USAGE_CONTENT_HTML = usageAdvantagesSection({
  title: "使用 jeko 韓國 eSIM 的優勢",
  subtitle: "隨時隨地保持聯繫",
  items: [
    {
      iconName: "wifi_tethering",
      title: "支援熱點共享",
      descHtml:
        "透過我們的 eSIM 自由使用行動熱點。輕鬆共享您的數據流量。",
    },
    {
      iconName: "rocket_launch",
      title: "可靠的網絡",
      descHtml:
        "jeko eSIM 與值得信賴的營運商合作，提供韓國最好的網路。",
    },
    {
      iconName: "mark_email_unread",
      title: "即時交付",
      descHtml:
        "下單後，透過電子郵件接收 eSIM 資訊以即時連線。",
    },
    {
      iconName: "payments",
      title: "無額外費用",
      descHtml:
        "用 jeko eSIM！出國省更多。最划算的預付 eSIM，無任何隱藏費用。",
    },
    {
      iconName: "sim_card",
      title: "享受雙卡雙待",
      descHtml:
        "原來的 SIM 卡將照常工作。您可以使用 Whatsapp、Skype 和 Line 等 VoIP 應用程式。",
    },
    {
      iconName: "qr_code_2",
      title: "簡單易用",
      descHtml:
        "透過掃描簡單的二維碼，在幾分鐘內輕鬆啟動您的 eSIM 數據計劃。",
    },
  ],
});

export default KOREA_UNLIMITED_USAGE_CONTENT_HTML;
