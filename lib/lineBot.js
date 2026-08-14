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
    "① 點「輸入 ICCID」在欄位填寫，或直接貼上 19～20 碼",
    "② 輸入「查詢用量」— 已綁定本站會員可自動查最近一筆 eSIM",
    "③ 傳「一鍵綁定」— Google／FB／Email 會員連結此 LINE",
    "",
    `🌐 也可至網站查詢：${siteUrl}/data-query`,
  ].join("\n");
}

const BIND_KEYWORDS = ["一鍵綁定", "綁定會員", "綁定LINE", "綁定 line"];

export function isBindKeyword(text) {
  const t = String(text || "").trim().toLowerCase();
  return BIND_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()));
}

export function getMemberBindUrl() {
  const siteUrl = getPublicSiteUrl();
  return (
    getLiffEntryUrl("/line/iccid?line_bind=start") ||
    `${siteUrl}/line/iccid?line_bind=start`
  );
}

/** LINE 內 ICCID 輸入頁（查詢用量＋開啟偏低提醒） */
export function getIccidFormUrl() {
  const siteUrl = getPublicSiteUrl();
  return getLiffEntryUrl("/line/iccid") || `${siteUrl}/line/iccid`;
}

export function buildIccidUsageFlexMessage() {
  const uri = getIccidFormUrl();
  return {
    type: "flex",
    altText: "輸入 ICCID 查詢流量，並開啟偏低提醒",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#3768C7",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "開啟流量提醒",
            color: "#FFFFFF",
            weight: "bold",
            size: "lg",
          },
          {
            type: "text",
            text: "一鍵綁定會員，或輸入 ICCID 查流量並開提醒",
            color: "#D6E4FF",
            size: "xs",
            margin: "sm",
            wrap: true,
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "點下方按鈕：可一鍵綁定官網會員，也可在欄位輸入 ICCID（19～20 碼）查流量並開啟偏低通知。",
            wrap: true,
            size: "sm",
            color: "#333333",
          },
          {
            type: "text",
            text: "系統會立刻回傳剩餘流量，並為這個 LINE 開啟偏低通知。",
            wrap: true,
            size: "sm",
            color: "#555555",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#3768C7",
            action: {
              type: "uri",
              label: "開啟流量提醒",
              uri,
            },
          },
        ],
      },
    },
  };
}

export function buildMemberBindMessage() {
  const bindUrl = getMemberBindUrl();
  return {
    type: "text",
    text: [
      "🔗 一鍵綁定官網會員",
      "",
      "若您是用 Google、Facebook 或 Email 註冊，請點下方按鈕：",
      "在 LINE 內登入官網會員 → 自動連結此 LINE，並開啟流量偏低提醒。",
      "",
      "沒有會員、或其他通路購買：直接貼上 ICCID（19～20 碼）即可查詢並監控。",
      "",
      bindUrl,
    ].join("\n"),
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "uri",
            label: "一鍵綁定會員",
            uri: bindUrl,
          },
        },
        {
          type: "action",
          action: {
            type: "uri",
            label: "輸入 ICCID",
            uri: getIccidFormUrl(),
          },
        },
      ],
    },
  };
}

/** 加好友歡迎訊息：說明＋ICCID 輸入卡片 */
export function buildWelcomeFollowMessage() {
  const siteUrl = getPublicSiteUrl();
  const liffAccountUrl = getLiffEntryUrl("/account");
  const bindUrl = getMemberBindUrl();
  const iccidUrl = getIccidFormUrl();
  const text = [
    "Jeko 旅伴您好！歡迎加入 Jeko eSIM 😊",
    "",
    "加好友就能查流量、開偏低提醒，不必先成為官網會員。",
    "請點下方「開啟流量提醒」：可一鍵綁定會員，或輸入 ICCID 查流量。",
    "",
    "也可直接在對話貼上 ICCID。",
    "",
    "官網會員折扣：",
    siteUrl,
  ].join("\n");

  return [
    {
      type: "text",
      text,
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "uri",
              label: "開啟流量提醒",
              uri: iccidUrl,
            },
          },
          {
            type: "action",
            action: {
              type: "uri",
              label: "一鍵綁定會員",
              uri: bindUrl,
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
        ],
      },
    },
    buildIccidUsageFlexMessage(),
  ];
}
