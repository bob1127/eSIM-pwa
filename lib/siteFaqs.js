/**
 * 全站常見問題（畫面 + FAQPage JSON-LD 共用）
 * 問句請寫完整可搜尋句，利於 AI／搜尋收錄。
 */
import { PRODUCTION_SITE_URL } from "./siteUrl";

export const SITE_FAQS = [
  {
    question: "Jeko eSIM 有支援開立電子發票嗎？",
    answer:
      "有。Jeko eSIM 支援開立電子發票。付款完成後，系統會依您結帳時填寫的 Email 或會員資料開立電子發票；如需公司統編發票，請於結帳時正確填寫統一編號與發票抬頭。電子發票相關通知原則寄送至您提供的 Email。",
  },
  {
    question: "什麼是 eSIM？出國需要換實體卡嗎？",
    answer:
      "eSIM 是內建於手機的虛擬 SIM 卡。購買 Jeko eSIM 後掃描 QR Code 即可開通，無需更換實體 SIM 卡，適合日本、韓國、東南亞及全球旅遊上網。",
  },
  {
    question: "Jeko eSIM 支援哪些服務？",
    answer:
      "Jeko eSIM 提供各國旅遊 eSIM 上網方案，並整合住宿推薦、租車包車服務與旅遊知識攻略，一站式協助您規劃出國行程。",
  },
  {
    question: "iPhone 如何安裝 eSIM？",
    answer:
      "於 iPhone 設定 > 行動服務 > 加入 eSIM，掃描 Jeko eSIM 提供的 QR Code 即可完成安裝。詳細圖解請參考本站安裝教學頁面。",
  },
  {
    question: "如何查詢 eSIM 剩餘流量？",
    answer:
      "可至 Jeko eSIM 流量查詢頁面輸入方案資訊查詢用量，亦可訂閱推播通知即時掌握剩餘流量與狀態。",
  },
  {
    question: "新會員 50 元折扣要怎麼領？一定要加入官方 LINE 嗎？",
    answer:
      "新會員完成註冊後系統會發放 NT$50 折價券；使用前須加入並連結 Jeko eSIM 官方 LINE。僅加好友、尚未註冊會員者，需完成會員註冊後才能領用同一張禮遇，不會疊加為 100 元。詳見最新優惠頁活動規則。",
  },
];

export function buildSiteFaqSchema() {
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL
  ).replace(/\/$/, "");
  return {
    "@type": "FAQPage",
    "@id": `${site}/qa#faq`,
    mainEntity: SITE_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}
