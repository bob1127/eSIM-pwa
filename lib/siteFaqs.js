/**
 * 全站常見問題（畫面 + FAQPage JSON-LD 共用）
 * 問句請寫完整可搜尋句，利於 AI／搜尋收錄；內容對齊本站實際功能。
 */
import { PRODUCTION_SITE_URL } from "./siteUrl";

/**
 * @typedef {{ question: string, answer: string }} SiteFaqItem
 * @typedef {{ id: string, title: string, items: SiteFaqItem[] }} SiteFaqCategory
 */

/** @type {SiteFaqCategory[]} */
export const SITE_FAQ_CATEGORIES = [
  {
    id: "basics",
    title: "認識 eSIM 與購買",
    items: [
      {
        question: "什麼是 eSIM？出國還需要換實體 SIM 卡嗎？",
        answer:
          "eSIM 是內建於手機的虛擬 SIM。在 Jeko eSIM 購買後，系統會寄送／於帳戶中心顯示 QR Code，用手機掃描即可加入行動方案，不必更換實體卡、也不必找當地門市。適合日本、韓國、東南亞、歐美及多國旅遊上網。",
      },
      {
        question: "如何在 Jeko eSIM 購買方案？",
        answer:
          "到首頁或「選購方案」依目的地挑選天數與流量（吃到飽／每日／總量），加入購物車後結帳。亦可使用手機底部「我的 eSIM → 快速購買」依國家一步步選規格下單。付款完成後，QR Code 會寄到您填寫的 Email，並可在帳戶中心「我的 eSIM 訂單」查看。",
      },
      {
        question: "支援哪些付款方式？",
        answer:
          "本站結帳支援信用卡（藍新金流）與 LINE Pay。所有收款進平台帳戶；若您是透過夥伴商店／推薦連結購買，流程與主站相同，仍由平台收款，夥伴事後分潤。",
      },
      {
        question: "購買前要怎麼確認手機支援 eSIM？",
        answer:
          "請先至「客服支援／相容機型」頁查詢 iPhone、Android 是否支援 eSIM，並確認手機已解鎖（非電信綁約鎖卡）。購買錯誤機型或不支援 eSIM 的裝置，原則上不在退款範圍，建議下單前先確認。",
      },
      {
        question: "原生 eSIM 和漫遊 eSIM 有什麼差別？",
        answer:
          "商品若標示「原生／當地 IP／本地線路」，多為當地電信原生網路；其餘常為漫遊或非原生線路。兩者安裝方式類似，但退換貨條件不同：原生 eSIM 售出後原則上不退不換；非原生／漫遊在未安裝或已安裝未激活時可申請全額退款。詳見退換貨政策。",
      },
    ],
  },
  {
    id: "invoice",
    title: "電子發票與訂單",
    items: [
      {
        question: "Jeko eSIM 有支援開立電子發票嗎？",
        answer:
          "有。付款完成後，系統會依結帳填寫的 Email 或會員資料開立電子發票。如需公司統編，請於結帳時正確填寫統一編號與發票抬頭。發票相關通知原則寄送至您提供的 Email。",
      },
      {
        question: "沒收到 eSIM QR Code 怎麼辦？",
        answer:
          "請先檢查 Email 垃圾郵件／促銷信件匣，並確認結帳信箱填寫正確。亦可登入帳戶中心 →「我的 eSIM 訂單」查看 QR Code。若訂單已顯示已發貨仍無 QR，請透過官方 LINE 或 support@jeko-esim.com.tw 提供訂單編號由客服協助。",
      },
      {
        question: "可以用 LINE 登入嗎？一定要有 Email 嗎？",
        answer:
          "可以。本站支援 LINE 登入進入帳戶中心。若使用 LINE 登入且尚未綁定真實 Email，結帳時請務必填寫可收信的 Email，eSIM QR Code 與訂單通知會寄到該信箱。建議於帳號設定綁定 Email，方便之後查單與退款。",
      },
      {
        question: "在哪裡查看我買過的 eSIM？",
        answer:
          "登入後進入帳戶中心 →「我的 eSIM 訂單」，可查看訂單狀態、付款資訊、QR Code、申請退款與再次購買。手機亦可從底部「我的 eSIM」面板快速查看方案與用量。",
      },
    ],
  },
  {
    id: "install",
    title: "安裝與連線",
    items: [
      {
        question: "iPhone 如何安裝 eSIM？",
        answer:
          "建議在有穩定 Wi-Fi 的環境操作：設定 → 行動服務（或蜂巢網路）→ 加入 eSIM → 使用 QR Code 掃描訂單中的安裝碼。安裝後抵達目的地再開啟該 eSIM 的數據漫遊（依方案說明）。圖文步驟請見安裝教學／帳戶中心「安裝與支援」。",
      },
      {
        question: "Android 如何安裝 eSIM？",
        answer:
          "路徑因品牌略有不同，常見為：設定 → 網路與網際網路 → SIM → 下載 SIM／新增 eSIM → 掃描 QR Code。部分機型需先開啟「下載 SIM 卡」或使用電信商 App。若手機不支援 eSIM，將無法完成安裝。",
      },
      {
        question: "可以一鍵安裝 eSIM 嗎？",
        answer:
          "在支援的裝置與瀏覽器上，訂單／「我的 eSIM」面板可能提供「一鍵安裝」連結（iOS／Android 安裝 URL）。若按鈕無法使用，請改以相機或系統設定掃描 QR Code。電腦瀏覽時請用手機開啟連結或掃碼。",
      },
      {
        question: "安裝後無法上網怎麼辦？",
        answer:
          "請確認：1) 已抵達方案適用國家／地區；2) 已選用該 eSIM 作為行動數據；3) 已開啟數據漫遊（若方案要求）；4) 飛航模式開關一次或重開機。若仍無法連線，請保留設定畫面截圖，透過官方 LINE 或客服協助排查（連線問題依個案處理，詳見退換貨政策）。",
      },
    ],
  },
  {
    id: "traffic",
    title: "流量查詢與提醒",
    items: [
      {
        question: "如何查詢 eSIM 剩餘流量？",
        answer:
          "登入帳戶中心 →「查詢流量」，系統會列出您本站購買的 eSIM，點「查詢流量」即可看剩餘／已用（供應商更新通常約有 30～60 分鐘延遲）。亦可使用公開「流量查詢」頁，或手機「我的 eSIM」面板查看用量圖表。吃到飽方案可能顯示為無固定額度／剩餘充足。",
      },
      {
        question: "流量監控提醒是什麼？怎麼開啟？",
        answer:
          "開啟後，當剩餘流量偏低時，系統可透過瀏覽器推播通知您。請在帳戶中心「查詢流量」右側開啟流量監控提醒，允許瀏覽器通知，並綁定一張 eSIM（一次僅監控一張）。iPhone 建議先將本站加入主畫面再開啟通知。手機底部「我的 eSIM」亦可開關流量通知，狀態會與帳戶中心同步。",
      },
      {
        question: "可以用官方 LINE 收流量提醒嗎？",
        answer:
          "可以。請先以 LINE 登入本站（或連結 LINE），並加入 Jeko 官方 LINE 好友。在「查詢流量」頁的 LINE 推播提醒區塊，可掃描官方 QR 或點連結加入，再按「開啟提醒」。低流量時會透過官方 LINE 推播（與瀏覽器推播可並存，仍建議先綁定要監控的 eSIM）。",
      },
      {
        question: "為什麼查到的用量跟實際感覺不一樣？",
        answer:
          "用量資料來自供應商，更新常有約 30～60 分鐘延遲；部分方案（如吃到飽）不以固定 MB 額度計費，畫面會以狀態說明為主。若長時間完全無法更新，請確認 ICCID／訂單是否為本站出貨，或洽客服協助。",
      },
    ],
  },
  {
    id: "refund",
    title: "退款與售後",
    items: [
      {
        question: "什麼情況可以申請退款？",
        answer:
          "非原生／漫遊 eSIM：未安裝，或已安裝但尚未激活，原則可申請全額退款；已激活原則不予退款。原生 eSIM：售出後概不退款或換貨。連線異常請先由客服協助排查，視情況更換或部分退款。完整條件見退換貨政策。",
      },
      {
        question: "如何在網站申請退款？",
        answer:
          "登入帳戶中心 →「我的 eSIM 訂單」→ 選擇訂單 →「申請退款」。系統會自動判斷是否為原生 eSIM（原生則無法申請），並向供應商查核開通狀態：未開通走簡化全額退款表單；已開通則改為售後爭議並需上傳舉證。申請後請等候審核通知。",
      },
      {
        question: "退款後電子發票怎麼處理？",
        answer:
          "若已開立電子發票，退款核准後會依規定辦理發票折讓或作廢。細節請見退換貨政策與服務條款「付款、發票與退款」；如有統編發票需求，請於申請時一併告知客服。",
      },
    ],
  },
  {
    id: "promo",
    title: "優惠與帳戶",
    items: [
      {
        question: "新會員 50 元折扣要怎麼領？一定要加入官方 LINE 嗎？",
        answer:
          "新會員完成註冊後系統會發放 NT$50 折價券；結帳使用前須加入並連結 Jeko 官方 LINE。僅加好友尚未註冊者，需完成註冊後才能領用，不會疊加為 100 元。優惠券可在帳戶中心「我的優惠券」或最新優惠／拉霸頁查看。詳見最新優惠頁活動規則。",
      },
      {
        question: "帳戶中心可以做哪些事？",
        answer:
          "帳戶中心可查看訂單與 QR Code、查詢流量與開啟監控提醒、追蹤創作者、管理帳號與登入安全、查看安裝支援。側欄亦可進入夥伴店鋪管理（若您是合作夥伴）或系統總控（管理員）。",
      },
      {
        question: "忘記如何登入怎麼辦？",
        answer:
          "若當初使用 Google／LINE 登入，請用同一方式進入。若已綁定 Email，可走網站登入流程重設或再次驗證。訂單查詢仍以結帳 Email 與登入身分對應；若對不上，請帶訂單編號洽官方 LINE 協助認領。",
      },
    ],
  },
  {
    id: "partner",
    title: "合作夥伴",
    items: [
      {
        question: "如何成為 Jeko eSIM 合作夥伴？",
        answer:
          "可至合作／聯絡頁提交夥伴申請（IG 網紅、團媽、部落客、旅行社、住宿等）。審核通過後可使用專屬推薦連結或專屬商店，依成交訂單計算分潤；消費者仍走平台藍新／LINE Pay 結帳，收款進平台帳戶。詳見合作說明與服務條款。",
      },
      {
        question: "夥伴商店買的 eSIM 和主站一樣嗎？",
        answer:
          "商品目錄與開通流程與主站相同，價格可能含夥伴加價。結帳仍使用平台金流；付款成功後一樣以 Email／帳戶中心取得 QR Code，退換貨與流量查詢規則與主站一致。",
      },
    ],
  },
  {
    id: "contact",
    title: "客服與其他",
    items: [
      {
        question: "如何聯絡客服？",
        answer:
          "建議加入官方 LINE 即時諮詢；亦可來信 support@jeko-esim.com.tw，或使用網站「聯絡我們」表單（一般諮詢／夥伴申請／退換款）。營業時間外也可先用網站智慧客服或查本頁 FAQ。",
      },
      {
        question: "可以把網站加到手機主畫面嗎？",
        answer:
          "可以。本站為 PWA：iPhone 請用 Safari「分享 → 加入主畫面」；Android／Chrome 可透過選單「安裝應用程式」或「加到主畫面」。加入後較容易啟用流量推播提醒，並有接近 App 的瀏覽體驗。",
      },
      {
        question: "Jeko eSIM 還有哪些旅遊相關服務？",
        answer:
          "除各國旅遊 eSIM 外，本站亦整合住宿推薦、租車包車與旅遊知識／專欄等資訊，協助規劃行程。eSIM 為核心商品；加值服務內容與條款請以各頁面說明為準。",
      },
    ],
  },
];

/** 扁平列表（JSON-LD／舊程式相容） */
export const SITE_FAQS = SITE_FAQ_CATEGORIES.flatMap((c) => c.items);

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
