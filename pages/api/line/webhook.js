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
  getLineMessagingConfig,
  isLineBotConfigured,
} from "../../../lib/lineBot";
import { getPublicSiteUrl } from "../../../lib/siteUrl";
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
  const loginUrl = `${getPublicSiteUrl()}/login`;
  return [
    "⚠️ 無法開啟 LINE 流量提醒",
    "",
    "此功能僅限「以 LINE 登入本站」並以該身分購買／綁定 eSIM 的會員使用。",
    "訪客購買、Email／Google 會員訂單，目前無法自動對應到此 LINE 帳號。",
    "",
    "── 若要使用 LINE 自動提醒 ──",
    `① 請至官網以 LINE 登入：${loginUrl}`,
    "② 登入後購買，或確認會員中心看得到您的 eSIM",
    "③ 再回這裡傳「開啟流量提醒」",
    "",
    "── 若只想立刻查流量 ──",
    "不必是 LINE 會員，在官網輸入 ICCID 即可查詢：",
    dataQueryUrl,
    "",
    "也可直接在此對話貼上 ICCID（19～20 碼）查詢。",
  ].join("\n");
}

async function enableLineTrafficAlert(lineUserId) {
  const esims = await fetchEsimsByLineUserId(lineUserId);
  const target = esims[0];
  if (!target?.topupId) {
    return {
      ok: false,
      message: buildLineAlertNeedMemberMessage(),
    };
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("line_traffic_alerts").upsert(
    {
      line_user_id: lineUserId,
      topup_id: target.topupId,
      iccid: target.iccid || null,
      product_label: target.productName,
      order_id: target.orderId || null,
      guest_email: `${lineUserId}@line-login.com`,
      monitor_enabled: true,
      updated_at: now,
    },
    { onConflict: "line_user_id,topup_id" },
  );

  if (error) {
    const { error: insertErr } = await supabaseAdmin
      .from("line_traffic_alerts")
      .insert({
        line_user_id: lineUserId,
        topup_id: target.topupId,
        iccid: target.iccid || null,
        product_label: target.productName,
        order_id: target.orderId || null,
        guest_email: `${lineUserId}@line-login.com`,
        monitor_enabled: true,
        updated_at: now,
      });
    if (insertErr) {
      return { ok: false, message: "設定失敗，請稍後再試或至網站會員中心操作。" };
    }
  }

  return {
    ok: true,
    message: [
      "✅ 已開啟 LINE 流量偏低提醒",
      "",
      `監控方案：${target.productName}`,
      "剩餘流量偏低時，我們會主動推播通知您。",
      "",
      "💡 也可隨時傳「查詢用量」查最新流量。",
    ].join("\n"),
  };
}

async function handleTextMessage(event) {
  const text = event.message?.text || "";
  const replyToken = event.replyToken;
  const lineUserId = event.source?.userId;

  const iccid = extractIccidFromText(text);

  if (isAlertKeyword(text)) {
    if (!lineUserId) {
      await replyLineMessage(replyToken, {
        type: "text",
        text: "無法識別 LINE 帳號，請稍後再試。",
      });
      return;
    }
    const result = await enableLineTrafficAlert(lineUserId);
    await replyLineMessage(replyToken, {
      type: "text",
      text: result.message,
    });
    return;
  }

  if (iccid) {
    const result = await queryEsimUsage({ iccid });
    const message = result.ok
      ? formatUsageForLine(result.data)
      : `❌ ${result.error || "查詢失敗"}`;
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
      const dataQueryUrl = `${getPublicSiteUrl()}/data-query`;
      extra = [
        "",
        "",
        "💡 此 LINE 帳號尚無對應的本站訂單（需以 LINE 登入購買才會自動對應）。",
        "可直接貼上 ICCID 查詢，或至官網手動輸入：",
        dataQueryUrl,
      ].join("\n");
    }

    await replyLineMessage(replyToken, {
      type: "text",
      text: help + extra,
    });
    return;
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
          await replyLineMessage(event.replyToken, buildWelcomeFollowMessage());
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
