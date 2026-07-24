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
    "新加入會員完成第一筆訂單，現折 NT$50（每人限一次）。",
  steps: [
    {
      step: "01",
      title: "註冊／登入會員",
      desc: "Email 或 LINE 登入皆可。",
    },
    {
      step: "02",
      title: "選購 eSIM 並結帳",
      desc: "首筆訂單自動符合新會員折 50 資格（或套用專屬折扣碼）。",
    },
    {
      step: "03",
      title: "完成付款即折抵",
      desc: "每人僅限首購一次；可與拉霸中獎券依結帳規則擇一／先後使用。",
    },
  ],
  draftRules: [
    "僅限新註冊會員、首次成功付款訂單",
    "每人限用一次新會員首單 50",
    "若由推薦連結加入：好友端的 50 與新會員 50 合併為同一張（不疊加）",
    "有效期限：註冊後 60 天",
  ],
};

export const REFER_FRIEND_PLAN = {
  title: "介紹好朋友優惠",
  eyebrow: "Invite",
  summary:
    "分享專屬連結，好友註冊並完成首購後：介紹人獲 50 元折抵、好友獲 50 元折抵（好友端與新會員首單 50 合併，不重複疊加）。",
  forInviter: [
    "會員中心產生專屬推薦碼與分享連結（一鍵複製）",
    "好友完成「註冊＋首購」後，介紹人自動入帳 50 元折抵金",
    "可設每月邀請上限，避免濫用",
  ],
  forInvitee: [
    "點推薦連結註冊／登入",
    "完成第一筆訂單後獲得 50 元折抵（即新會員首單禮，不再另發第二張 50）",
    "介紹人同步獲得 50 元折抵",
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
