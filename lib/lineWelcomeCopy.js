/**
 * LINE 加好友歡迎文案（前後台共用，避免 Boss 預覽與 webhook 不一致）
 * 實際送出組裝見 lib/lineBot.js → buildWelcomeFollowMessage
 */

import { LINE_WELCOME_FEATURED_UNLIMITED } from "./lineWelcomeFeatured";

export const LINE_WELCOME_SCENARIOS = [
  {
    id: "first",
    label: "首次加好友",
    desc: "新好友＋發新會員 50 折扣碼",
  },
  {
    id: "refollow",
    label: "重加好友",
    desc: "曾封鎖再加回，券仍有效",
  },
  {
    id: "redeemed",
    label: "已用過 50 元",
    desc: "此 LINE 已核銷歡迎禮",
  },
  {
    id: "nocode",
    label: "發券失敗",
    desc: "無折扣碼時的後備文案",
  },
];

export function buildWelcomePromoBlock({
  code = "",
  isReFollow = false,
  alreadyRedeemed = false,
  alreadyClaimed = false,
} = {}) {
  if (alreadyRedeemed) {
    return [
      "新會員 50 元優惠",
      "此 LINE 已使用過新會員 50 元折抵，無法再次領取。",
      "您仍可查流量、使用客服與選購 eSIM。",
    ].join("\n");
  }
  if (code) {
    if (isReFollow || alreadyClaimed) {
      return [
        "歡迎回來！(´∀｀*)ゞ",
        "您的新會員 50 元折抵仍有效。",
        `折扣碼：${code}`,
        "",
        "結帳時輸入此碼即可（須維持官方 LINE 好友）。",
        "若尚未註冊會員，完成註冊後同一折扣碼會出現在會員中心。",
      ].join("\n");
    }
    return [
      "恭喜！已為您保留新會員 50 元折抵 (*´▽`*)",
      `折扣碼：${code}`,
      "",
      "結帳時輸入此碼即可（須維持官方 LINE 好友）。",
      "若尚未加入會員，請點下方「註冊／會員中心」；完成後同一折扣碼會出現在會員頁。",
    ].join("\n");
  }
  return [
    "新會員 50 元折抵",
    "請稍後再試，或至官網會員中心領取。",
  ].join("\n");
}

export const LINE_WELCOME_HOWTO_LINES = [
  "【怎麼查流量／開偏低提醒】",
  "① 點下方「開啟流量提醒」，依畫面綁定會員或輸入 ICCID 以開啟偏低提醒",
  "② 或直接在對話貼上 19～20 碼 ICCID，只會回覆目前使用流量狀態",
  "※ 用量非即時，供應商同步通常有約 30～60 分鐘延遲",
];

/**
 * @param {{
 *   siteUrl?: string,
 *   code?: string,
 *   isReFollow?: boolean,
 *   alreadyRedeemed?: boolean,
 *   alreadyClaimed?: boolean,
 * }} opts
 */
export function buildWelcomeFollowText({
  siteUrl = "https://www.jeko-esim.com.tw",
  code = "NEW50XXXX",
  isReFollow = false,
  alreadyRedeemed = false,
  alreadyClaimed = false,
} = {}) {
  const promoBlock = buildWelcomePromoBlock({
    code,
    isReFollow,
    alreadyRedeemed,
    alreadyClaimed,
  });

  return [
    "Jeko 旅伴您好～ ٩(●˙▿˙●)۶｜歡迎加入 Jeko eSIM",
    "",
    promoBlock,
    "",
    ...LINE_WELCOME_HOWTO_LINES,
    "",
    `官網：${String(siteUrl || "").replace(/\/$/, "") || "https://www.jeko-esim.com.tw"}`,
    "",
    "🌼🌻🌼",
  ].join("\n");
}

export function getWelcomeQuickReplyLabels({
  code = "",
  alreadyRedeemed = false,
} = {}) {
  const chips = ["開啟流量提醒", "註冊／會員中心", "前往官網"];
  if (code && !alreadyRedeemed) chips.push("前往結帳使用");
  else chips.push("一鍵綁定會員");
  return chips;
}

export function getWelcomeScenarioState(scenarioId) {
  switch (scenarioId) {
    case "refollow":
      return {
        code: "NEW50ABCD",
        isReFollow: true,
        alreadyRedeemed: false,
        alreadyClaimed: true,
      };
    case "redeemed":
      return {
        code: "",
        isReFollow: false,
        alreadyRedeemed: true,
        alreadyClaimed: true,
      };
    case "nocode":
      return {
        code: "",
        isReFollow: false,
        alreadyRedeemed: false,
        alreadyClaimed: false,
      };
    case "first":
    default:
      return {
        code: "NEW50WXYZ",
        isReFollow: false,
        alreadyRedeemed: false,
        alreadyClaimed: false,
      };
  }
}

export { LINE_WELCOME_FEATURED_UNLIMITED };

/** ICCID Flex 卡文案（與 lineBot.buildIccidUsageFlexMessage 對齊） */
export const LINE_ICCID_FLEX_PREVIEW = {
  headerTitle: "開啟流量提醒",
  headerSub: "綁定會員後選一張 eSIM 開提醒，或輸入 ICCID（一次一張）",
  body: [
    "點下方按鈕：可一鍵綁定官網會員，也可在欄位輸入 ICCID（19～20 碼）查流量並開啟偏低通知。",
    "系統會立刻回傳剩餘流量，並為這個 LINE 開啟偏低通知。",
  ],
  buttonLabel: "開啟流量提醒",
  headerBg: "#3768C7",
  buttonBg: "#3768C7",
};

/** 非營業時間引導（與 lineBot.buildOffHoursAiGuideMessage 對齊） */
export const LINE_OFFHOURS_FLEX_PREVIEW = {
  headerTitle: "目前為非人工客服時段",
  headerSub: "人工客服：每日 09:00–24:00（台灣時間）",
  body: [
    "現在是深夜／清晨時段，專人會在營業時間再回覆您。",
    "您可先開啟官網或已加入主畫面的 PWA，使用智慧客服（24 小時）。可問 eSIM 安裝、方案、流量，也可傳截圖請智慧客服判讀。",
  ],
  primaryLabel: "開啟智慧客服",
  secondaryLabel: "查詢流量／提醒",
  headerBg: "#0A6CD0",
  buttonBg: "#0A6CD0",
};
