import crypto from "crypto";
import { getPublicSiteUrl } from "./siteUrl";
import { getLiffEntryUrl } from "./liffClient";

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export function getLineMessagingConfig() {
  const channelSecret =
    process.env.LINE_MESSAGE_CHANNEL_SECRET ||
    process.env.LINE_MESSAGING_CHANNEL_SECRET ||
    "";
  const channelAccessToken =
    process.env.LINE_MESSAGE_CHANNEL_ACCESS_TOKEN ||
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ||
    "";
  return { channelSecret, channelAccessToken };
}

export function isLineBotConfigured() {
  const { channelSecret, channelAccessToken } = getLineMessagingConfig();
  return !!(channelSecret && channelAccessToken);
}

export function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  return hash === signature;
}

export async function replyLineMessage(replyToken, messages) {
  const { channelAccessToken } = getLineMessagingConfig();
  if (!channelAccessToken) {
    throw new Error("LINE Messaging API 未設定");
  }
  const res = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: Array.isArray(messages) ? messages : [messages],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE reply 失敗：${err}`);
  }
}

export async function pushLineMessage(userId, messages) {
  const { channelAccessToken } = getLineMessagingConfig();
  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: Array.isArray(messages) ? messages : [messages],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE push 失敗：${err}`);
  }
}

export const USAGE_KEYWORDS = [
  "用量",
  "查詢用量",
  "查用量",
  "流量",
  "剩餘流量",
  "查詢",
  "usage",
];

export function isUsageKeyword(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return false;
  return USAGE_KEYWORDS.some((kw) => t === kw.toLowerCase() || t.includes(kw));
}

export function extractIccidFromText(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  const match = compact.match(/\d{18,22}/);
  return match ? match[0] : null;
}

export function buildUsageHelpMessage() {
  const siteUrl = getPublicSiteUrl();
  return [
    "📱 eSIM 用量查詢",
    "",
    "請選擇以下方式：",
    "",
    "① 直接傳送 ICCID（19～20 碼數字）",
    "② 輸入「查詢用量」— 若您曾用 LINE 登入本站，可自動查最近一筆 eSIM",
    "",
    `🌐 也可至網站查詢：${siteUrl}/data-query`,
  ].join("\n");
}

/** 加好友歡迎訊息（含 Quick Reply 按鈕） */
export function buildWelcomeFollowMessage() {
  const siteUrl = getPublicSiteUrl();
  // 已加好友但尚未在網站啟用折價券的人，點這顆在 LINE 內用 LIFF 開會員中心，
  // 登入（或已登入）後按「連結 LINE 並啟用優惠」即可完成綁定，幾乎無感。
  const liffAccountUrl = getLiffEntryUrl("/account");
  const text = [
    "Jeko 旅伴您好！",
    "歡迎加入 Jeko eSIM 😊",
    "",
    "未來出國上網、eSIM 教學、流量優惠，我們都會在這裡第一時間通知您。",
    "讓 Jeko 陪您一路順暢連線 🌼",
    "",
    "未來我們不定時分享海外上網優惠、eSIM 教學與出國小提醒。",
    "",
    "目前加入 Jeko eSIM 官網會員，即可獲得會員專屬折扣",
    siteUrl,
    "",
    "詳細優惠內容請至官網查看。",
    "讓 Jeko 陪您一路順暢連線 ✈️",
    "",
    "────────",
    "快速功能（也可點下方按鈕）：",
    "• 傳「查詢用量」查最近 eSIM 流量",
    "• 傳「開啟流量提醒」綁定低流量推播",
    "• 直接貼上 ICCID（19～20 碼）查詢",
  ].join("\n");

  return {
    type: "text",
    text,
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "message",
            label: "查詢用量",
            text: "查詢用量",
          },
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "開啟流量提醒",
            text: "開啟流量提醒",
          },
        },
        {
          type: "action",
          action: {
            type: "uri",
            label: "點我啟用50元優惠",
            uri: liffAccountUrl || `${siteUrl}/account`,
          },
        },
        {
          type: "action",
          action: {
            type: "uri",
            label: "ICCID 查詢教學",
            uri: `${siteUrl}/data-query/`,
          },
        },
      ],
    },
  };
}
