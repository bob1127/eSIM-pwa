/** 會員優惠頁 — 內容規劃與設計 token */

export const MEMBER_OFFERS_UI = {
  brand: "#0A6CD0",
  brandDeep: "#084a9e",
  ink: "#0f2744",
  muted: "#64748b",
  line: "#06C755",
  soft: "#eef4fb",
  softAlt: "#f3f7fc",
  accent: "#F4596A",
  contentMax: "max-w-[1040px]",
};

export const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://lin.ee/y6tdx5q";

/** 頁面錨點導覽 */
export const MEMBER_OFFER_NAV = [
  { id: "new-member", label: "新會員優惠" },
  { id: "refer-friend", label: "介紹好朋友" },
  { id: "line-first", label: "LINE 策略" },
  { id: "more-offers", label: "更多優惠規劃" },
];

export const NEW_MEMBER_PLAN = {
  title: "新會員優惠",
  eyebrow: "Welcome",
  summary:
    "用「第一次出國」的甜蜜點打開信任：註冊完成後立刻拿到能用的折價，而不是空洞積分。",
  steps: [
    {
      step: "01",
      title: "註冊／登入會員",
      desc: "Email 或 LINE 登入皆可；綁定會員後才能領取歡迎折扣。",
    },
    {
      step: "02",
      title: "領取新會員折扣碼",
      desc: "建議：首次購買全站 eSIM 現折 NT$50～100，或指定熱門路線（日本／韓國）百分比折扣。",
    },
    {
      step: "03",
      title: "首次出遊完成購買",
      desc: "結帳套用折扣碼 → QR 幾分鐘到手。可限定「首購一張」防止刷碼。",
    },
  ],
  draftRules: [
    "僅限新註冊會員、首次成功付款訂單",
    "與其他會員／介紹碼擇一使用（可再調）",
    "有效期限：註冊後 30～60 天",
    "不適用已開通／已使用之 eSIM",
  ],
};

export const REFER_FRIEND_PLAN = {
  title: "介紹好朋友優惠",
  eyebrow: "Invite",
  summary:
    "會員分享專屬連結／推薦碼，好友註冊並完成首購後，雙方都拿到折扣；我們把「加官方 LINE」設成領獎必要條件，廣告轉換與客服觸達一次到位。",
  forInviter: [
    "會員中心產生專屬推薦碼與分享連結",
    "好友完成「加 LINE＋註冊＋首購」後，介紹人獲續購折扣／點數",
    "可設每月上限、或達成 N 位好友解鎖加碼",
  ],
  forInvitee: [
    "點推薦連結後優先導去加入官方 LINE",
    "以 LINE 登入或綁定會員，套用介紹人推薦碼",
    "首購完成後雙邊發券（新會員券可與介紹獎並存或擇一）",
  ],
};

/**
 * 建議的 LINE-first 介紹流程（規劃說明，尚未上線）
 */
export const LINE_FIRST_STRATEGY = {
  title: "為什麼要用「先加 LINE」？",
  why: [
    "分享連結 alone 容易被忽略；加 LINE 後你才有再溝通、再催買、用量提醒的管道。",
    "eSIM 售後（安裝失敗、訊號查詢）高度仰賴即時客服，LINE 是台灣旅人最自然的入口。",
    "防盜刷：只靠連結註冊很容易被濫用；LINE 好友狀態＋首購才發獎，成本可控。",
  ],
  flow: [
    {
      title: "分享",
      desc: "會員中心一鍵複製「推薦短連結」或轉傳 LINE 邀請訊息（含推薦碼）。",
    },
    {
      title: "加官方 LINE",
      desc: "好友開啟連結 → 第一步是加入 Jeko 官方帳號（可用 LIFF／深層連結帶入 ref）。",
    },
    {
      title: "登入綁定",
      desc: "LINE Login 註冊／綁定既有會員，系統寫入介紹人推薦碼。",
    },
    {
      title: "驗證後發獎",
      desc: "後端用 LINE「是否為好友」API 確認已加好友，且完成首購後，雙邊自動發折扣碼。",
    },
  ],
  tip: "推薦獎建議綁「好友首購成功」再發，而不是「只註冊就發」，可大幅降低作弊並提高真實出遊轉換。",
};

/** eSIM 產業延伸優惠構想 */
export const MORE_OFFERS_PLAN = [
  {
    id: "repeat",
    icon: "replay",
    title: "回購／再出國優惠",
    desc: "第二次、第三次出遊自動發「老朋友碼」。例如 90 天內再買折 5%，培養重複出國客。",
    status: "規劃中",
  },
  {
    id: "season",
    icon: "calendar_month",
    title: "連假旅遊季加碼",
    desc: "櫻花季、暑假、跨年、黃金周針對日本／韓國／泰國主推方案限時加碼或贈流量日數。",
    status: "規劃中",
  },
  {
    id: "multi",
    icon: "groups",
    title: "同行多人購",
    desc: "一次買 2 張以上（情侶／親友）享第二張折價，適合家庭與旅伴一起辦 eSIM。",
    status: "規劃中",
  },
  {
    id: "line-exclusive",
    icon: "chat",
    title: "LINE 好友限定碼",
    desc: "每月在官方 LINE 不定期放送限時碼；只有好友看得到，自然拉高加 LINE 動機。",
    status: "規劃中",
  },
  {
    id: "topup",
    icon: "bolt",
    title: "流量告急續購折價",
    desc: "用量查詢／LINE 低流量提醒後，提供當下續購折扣，把危機轉成第二次銷售。",
    status: "規劃中",
  },
  {
    id: "birthday",
    icon: "cake",
    title: "生日月旅遊禮",
    desc: "會員填生日後，當月出國購 eSIM 贈定額折價或加贈高速日，提升資料完整度。",
    status: "規劃中",
  },
  {
    id: "review",
    icon: "rate_review",
    title: "評價回饋",
    desc: "出行後留下真實評價（含照片）回饋小額折價，反哺商品頁社群信任。",
    status: "規劃中",
  },
  {
    id: "partner",
    icon: "handshake",
    title: "異業旅遊組合",
    desc: "與住宿／包車／景點票券合作（Klook 等），買 eSIM 送夥伴折價券，擴大生態系。",
    status: "規劃中",
  },
];
