import crypto from "crypto";
import { getPublicSiteUrl } from "./siteUrl";
import { getLiffEntryUrl } from "./liffClient";
import { buildWelcomeFeaturedEsimCarouselMessage } from "./lineWelcomeFeatured";
import { getWelcomeQuickReplyLabels } from "./lineWelcomeCopy";
import { buildRoundedFlexCta } from "./lineBroadcastMessage";
import {
  loadLineWelcomeSettings,
  DEFAULT_LINE_WELCOME_SETTINGS,
} from "./lineWelcomeSettings";

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
    "① 點「開啟流量提醒」綁定 eSIM，或直接貼上 19～20 碼查目前用量",
    "② 輸入「查詢用量」— 已綁定本站會員可自動查最近一筆 eSIM",
    "③ 傳「一鍵綁定」— Google／FB／Email 會員連結此 LINE",
    "",
    "※ 貼 ICCID 只回覆目前流量狀態，不會自動開偏低提醒。",
    "※ 用量非即時，通常有約 30～60 分鐘延遲。",
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
    getLiffEntryUrl("/data-query?line_bind=start") ||
    `${siteUrl}/data-query?line_bind=start`
  );
}

/** LINE 內「開啟流量提醒」→ 官網 data-query */
export function getIccidFormUrl() {
  const siteUrl = getPublicSiteUrl();
  return (
    getLiffEntryUrl("/data-query?setup=traffic") ||
    `${siteUrl}/data-query?setup=traffic`
  );
}

export function buildIccidUsageFlexMessage(settings = null) {
  const uri = getIccidFormUrl();
  const iccid =
    settings?.iccid || DEFAULT_LINE_WELCOME_SETTINGS.iccid;
  const bodyLines = String(iccid.bodyText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    type: "flex",
    altText: iccid.headerTitle || "輸入 ICCID 查詢流量，並開啟偏低提醒",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: iccid.headerBg || "#3768C7",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: iccid.headerTitle || "開啟流量提醒",
            color: "#FFFFFF",
            weight: "bold",
            size: "lg",
          },
          {
            type: "text",
            text: iccid.headerSub || "",
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
        contents: bodyLines.map((text, idx) => ({
          type: "text",
          text,
          wrap: true,
          size: "sm",
          color: idx === 0 ? "#333333" : "#555555",
        })),
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          buildRoundedFlexCta({
            label: iccid.buttonLabel || "開啟流量提醒",
            uri,
            backgroundColor: iccid.buttonBg || "#3768C7",
          }),
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

/** 加好友歡迎訊息：主推 eSIM 輪播＋ICCID 卡片（不另發長文；新會員券仍由 webhook 背景發放） */
export async function buildWelcomeFollowMessage(welcomeState = {}) {
  const settings = await loadLineWelcomeSettings();
  const siteUrl = getPublicSiteUrl();
  const liffAccountUrl = getLiffEntryUrl("/account");
  const bindUrl = getMemberBindUrl();
  const iccidUrl = getIccidFormUrl();
  const registerUrl = `${siteUrl.replace(/\/$/, "")}/login/`;

  const coupon = welcomeState?.coupon || null;
  const code = coupon?.code ? String(coupon.code) : "";
  const alreadyRedeemed = Boolean(welcomeState?.alreadyRedeemed);

  const siteRoot =
    String(siteUrl || "").replace(/\/$/, "") || "https://www.jeko-esim.com.tw";

  const quickLabels = getWelcomeQuickReplyLabels({ code, alreadyRedeemed });
  const quickItems = quickLabels.map((label) => {
    let uri = iccidUrl;
    if (label === "註冊／會員中心") uri = liffAccountUrl || registerUrl;
    else if (label === "前往官網") uri = siteRoot;
    else if (label === "前往結帳使用") {
      uri = code
        ? `${siteRoot}/Cart/?code=${encodeURIComponent(code)}`
        : `${siteRoot}/Cart/`;
    } else if (label === "一鍵綁定會員") uri = bindUrl;
    return {
      type: "action",
      action: { type: "uri", label, uri },
    };
  });

  const iccidMsg = buildIccidUsageFlexMessage(settings);
  iccidMsg.quickReply = { items: quickItems };

  return [
    ...ensureArray(buildWelcomeFeaturedEsimCarouselMessage(settings)),
    iccidMsg,
  ];
}

function ensureArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * 非人工客服時段：引導至官網／PWA 智慧客服
 */
export function buildOffHoursAiGuideMessage(settings = null) {
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
  const chatUrl = `${siteUrl}/?openChat=1`;
  const dataQueryUrl = `${siteUrl}/data-query/`;
  const off =
    settings?.offHours || DEFAULT_LINE_WELCOME_SETTINGS.offHours;
  const bodyLines = String(off.bodyText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    type: "flex",
    altText: off.headerTitle || "目前非人工客服時段，可先開啟網站智慧客服",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: off.headerBg || "#0A6CD0",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: off.headerTitle || "目前為非人工客服時段",
            color: "#FFFFFF",
            weight: "bold",
            size: "lg",
            wrap: true,
          },
          {
            type: "text",
            text: off.headerSub || "",
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
        contents: bodyLines.map((text, idx) => ({
          type: "text",
          text,
          wrap: true,
          size: "sm",
          color: idx === 0 ? "#333333" : "#555555",
        })),
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          buildRoundedFlexCta({
            label: off.primaryLabel || "開啟智慧客服",
            uri: chatUrl,
            backgroundColor: off.buttonBg || "#0A6CD0",
          }),
          buildRoundedFlexCta({
            label: off.secondaryLabel || "查詢流量／提醒",
            uri: dataQueryUrl,
            backgroundColor: "#EEF2F7",
            textColor: "#334155",
          }),
        ],
      },
    },
  };
}
