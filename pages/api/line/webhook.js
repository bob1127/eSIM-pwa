import { fetchEsimsByLineUserId } from "../../../lib/memberEsims";
import {
  queryEsimUsage,
  formatUsageForLine,
} from "../../../lib/esimUsageService";
import {
  verifyLineSignature,
  replyLineMessage,
  isUsageKeyword,
  extractIccidFromText,
  buildUsageHelpMessage,
  buildWelcomeFollowMessage,
  buildMemberBindMessage,
  buildIccidUsageFlexMessage,
  buildOffHoursAiGuideMessage,
  isBindKeyword,
  getLineMessagingConfig,
  isLineBotConfigured,
  pushLineMessage,
} from "../../../lib/lineBot";
import { getPublicSiteUrl } from "../../../lib/siteUrl";
import {
  enableLineTrafficAlertForLineUser,
  upsertLineTrafficAlert,
} from "../../../lib/lineTrafficAlert";
import { isSupportBusinessHours } from "../../../lib/supportHours";
import { buildLineFaqReplyMessage } from "../../../lib/lineFaqAutoReply";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const ALERT_KEYWORDS = [
  "開啟流量提醒",
  "流量提醒",
  "綁定推播",
  "推播提醒",
  "低流量提醒",
];

function isAlertKeyword(text) {
  const t = String(text || "").trim();
  return ALERT_KEYWORDS.some((kw) => t.includes(kw));
}

export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function upsertLineFriend(lineUserId, displayName) {
  await supabaseAdmin.from("line_oa_friends").upsert(
    {
      line_user_id: lineUserId,
      display_name: displayName || null,
      followed_at: new Date().toISOString(),
      unfollowed_at: null,
    },
    { onConflict: "line_user_id" },
  );
}

async function markLineUnfollow(lineUserId) {
  await supabaseAdmin
    .from("line_oa_friends")
    .update({ unfollowed_at: new Date().toISOString() })
    .eq("line_user_id", lineUserId);
}

function buildLineAlertNeedMemberMessage() {
  const dataQueryUrl = `${getPublicSiteUrl()}/data-query`;
  return [
    "⚠️ 尚無法對到本站 eSIM 訂單",
    "",
    "請擇一完成：",
    "① 傳「一鍵綁定」→ 用 Google／FB／Email 登入官網，連結此 LINE",
    "② 直接貼上 ICCID（19～20 碼）查詢並開啟偏低提醒",
    "",
    "也可至官網輸入 ICCID：",
    dataQueryUrl,
  ].join("\n");
}

async function enableLineTrafficAlert(lineUserId) {
  const result = await enableLineTrafficAlertForLineUser(
    supabaseAdmin,
    lineUserId,
  );
  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      message: buildLineAlertNeedMemberMessage(),
    };
  }

  return {
    ok: true,
    message: [
      "✅ 已開啟 LINE 流量偏低提醒",
      "",
      result.productName ? `監控方案：${result.productName}` : null,
      "剩餘流量偏低時，我們會主動推播通知您。",
      "",
      "💡 也可隨時傳「查詢用量」或貼上 ICCID。",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function isUserIdLookupKeyword(text) {
  const raw = String(text || "").trim();
  const t = raw.toLowerCase().replace(/\s+/g, "");
  return (
    t === "userid" ||
    t === "lineuserid" ||
    t === "查userid" ||
    t === "查詢userid" ||
    t === "查詢我的id" ||
    t === "我的userid" ||
    raw === "查詢我的ID"
  );
}

async function handleTextMessage(event) {
  const text = event.message?.text || "";
  const replyToken = event.replyToken;
  const lineUserId = event.source?.userId;

  const iccid = extractIccidFromText(text);

  if (isBindKeyword(text)) {
    await replyLineMessage(replyToken, buildMemberBindMessage());
    return;
  }

  // 用 Push（不用 replyToken），避免 LINE OA「AI 聊天機器人」先吃掉 reply 導致無回覆
  if (lineUserId && isUserIdLookupKeyword(text)) {
    const msg = {
      type: "text",
      text: `您的 LINE userId（供 Boss 新訂單推播設定）：\n\n${lineUserId}\n\n請複製後填入 ORDER_NOTIFY_ADMIN_LINE_USER_IDS`,
    };
    try {
      await pushLineMessage(lineUserId, msg);
    } catch (pushErr) {
      console.warn("[LINE Bot] userid push failed, try reply:", pushErr?.message);
      if (replyToken) await replyLineMessage(replyToken, msg);
    }
    return;
  }

  if (isAlertKeyword(text)) {
    if (!lineUserId) {
      await replyLineMessage(replyToken, {
        type: "text",
        text: "無法識別 LINE 帳號，請稍後再試。",
      });
      return;
    }
    const result = await enableLineTrafficAlert(lineUserId);
    if (!result.ok) {
      if (result.code === "need_select") {
        await replyLineMessage(replyToken, [
          {
            type: "text",
            text: "您有多張 eSIM。為節省推播費用，同時只監控一張。請點下方按鈕選擇要提醒的卡。",
          },
          buildIccidUsageFlexMessage(),
        ]);
        return;
      }
      await replyLineMessage(replyToken, buildMemberBindMessage());
      return;
    }
    await replyLineMessage(replyToken, {
      type: "text",
      text: result.message,
    });
    return;
  }

  if (iccid) {
    const result = await queryEsimUsage({ iccid });
    let message = result.ok
      ? formatUsageForLine(result.data)
      : `❌ ${result.error || "查詢失敗"}`;

    if (lineUserId && result.ok) {
      const bind = await upsertLineTrafficAlert(supabaseAdmin, {
        line_user_id: lineUserId,
        topup_id: result.data?.topupId || null,
        iccid,
        product_label: result.data?.productName || null,
        guest_email: null,
      });
      if (bind.ok) {
        message += [
          "",
          "",
          "✅ 已用此 ICCID 開啟 LINE 流量偏低提醒。",
          "剩餘偏低時會主動通知您（約每日檢查一次）。",
        ].join("\n");
      }
    }

    await replyLineMessage(replyToken, { type: "text", text: message });
    return;
  }

  if (isUsageKeyword(text)) {
    let autoResult = null;
    let hasMemberOrders = false;

    if (lineUserId) {
      try {
        const esims = await fetchEsimsByLineUserId(lineUserId);
        hasMemberOrders = esims.length > 0;
        const latest = esims[0];
        if (latest?.topupId) {
          autoResult = await queryEsimUsage({
            topupId: latest.topupId,
            iccid: latest.iccid,
          });
        }
      } catch (err) {
        console.error("[LINE Bot] 自動查詢失敗", err.message);
      }
    }

    if (autoResult?.ok && autoResult.data?.remainingMb != null) {
      await replyLineMessage(replyToken, {
        type: "text",
        text: formatUsageForLine(autoResult.data),
      });
      return;
    }

    const help = buildUsageHelpMessage();
    let extra = "";
    if (autoResult?.ok === false) {
      extra = `\n\n⚠️ ${autoResult.error}`;
    } else if (lineUserId && !hasMemberOrders) {
      extra = [
        "",
        "",
        "💡 此 LINE 尚無對應的本站訂單。",
        "可傳「一鍵綁定」連結 Google／FB／Email 會員，或直接貼上 ICCID。",
      ].join("\n");
    }

    await replyLineMessage(replyToken, [
      {
        type: "text",
        text: help + extra,
      },
      buildIccidUsageFlexMessage(),
    ]);
    return;
  }

  // FAQ 關鍵字自動回覆（CSV → lineFaqEntries.js，含顏文字 + 🌼🌻；Reply 不佔推播額度）
  // 設 LINE_FAQ_WEBHOOK_DISABLED=1 可暫時關閉，改交給後台 AI／自動回應
  if (process.env.LINE_FAQ_WEBHOOK_DISABLED !== "1") {
    const faqMsg = buildLineFaqReplyMessage(text);
    if (faqMsg) {
      await replyLineMessage(replyToken, faqMsg);
      return;
    }
  }

  // 未命中 FAQ：非營業時間引導至網站／PWA 智慧客服；營業時間不回，留給後台 AI／人工
  if (!isSupportBusinessHours()) {
    await replyLineMessage(replyToken, buildOffHoursAiGuideMessage());
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "jeko-line-esim-bot",
      configured: isLineBotConfigured(),
      hint: "POST LINE webhook events to this URL",
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const { channelSecret } = getLineMessagingConfig();
  if (!channelSecret) {
    return res.status(503).json({ error: "LINE Messaging API 未設定" });
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-line-signature"];

  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let body;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const events = body.events || [];

  try {
    for (const event of events) {
      if (event.type === "follow" && event.source?.userId) {
        await upsertLineFriend(
          event.source.userId,
          event.source?.displayName,
        );
        if (event.replyToken) {
          const welcome = buildWelcomeFollowMessage();
          if (!isSupportBusinessHours()) {
            await replyLineMessage(event.replyToken, [
              ...(Array.isArray(welcome) ? welcome : [welcome]),
              buildOffHoursAiGuideMessage(),
            ]);
          } else {
            await replyLineMessage(event.replyToken, welcome);
          }
        }
        continue;
      }

      if (event.type === "unfollow" && event.source?.userId) {
        await markLineUnfollow(event.source.userId);
        continue;
      }

      if (event.type === "message" && event.message?.type === "text") {
        await handleTextMessage(event);
      }
    }
  } catch (err) {
    console.error("[LINE Bot] webhook error", err);
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ ok: true });
}
