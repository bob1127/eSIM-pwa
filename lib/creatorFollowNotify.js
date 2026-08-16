import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { getPublicSiteUrl } from "./siteUrl";
import { pushLineMessage, isLineBotConfigured } from "./lineBot";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function ensureWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails("mailto:support@jeko-esim.com.tw", pub, priv);
    return true;
  } catch {
    return false;
  }
}

/**
 * 創作者新文：推播給已追蹤且開過網站通知的會員；有 LINE user 再補一則。
 * 同一篇文章網址只發一次。
 */
export async function notifyCreatorFollowers({
  creatorKey,
  creatorName,
  title,
  url,
}) {
  const admin = getAdmin();
  if (!admin || !creatorKey || !url) {
    return { ok: false, reason: "missing" };
  }

  const { data: logged } = await admin
    .from("creator_follow_notify_log")
    .select("post_url")
    .eq("post_url", url)
    .maybeSingle();
  if (logged) return { ok: true, skipped: true, reason: "already_sent" };

  const { error: logErr } = await admin
    .from("creator_follow_notify_log")
    .insert({ post_url: url, creator_key: creatorKey });
  if (logErr && !/duplicate|unique/i.test(logErr.message || "")) {
    return { ok: false, reason: logErr.message };
  }

  const { data: followers, error } = await admin
    .from("creator_follows")
    .select("user_id, member_email, line_user_id, notify_push")
    .eq("creator_key", creatorKey)
    .eq("notify_push", true);
  if (error) return { ok: false, reason: error.message };
  if (!followers?.length) return { ok: true, sent: 0 };

  const userIds = [...new Set(followers.map((f) => f.user_id).filter(Boolean))];
  const emails = [
    ...new Set(followers.map((f) => f.member_email).filter(Boolean)),
  ];
  const lineIds = [
    ...new Set(followers.map((f) => f.line_user_id).filter(Boolean)),
  ];

  let subs = [];
  if (userIds.length) {
    const { data } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id, guest_email, line_user_id")
      .in("user_id", userIds);
    subs = subs.concat(data || []);
  }
  if (emails.length) {
    const { data } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id, guest_email, line_user_id")
      .in("guest_email", emails);
    subs = subs.concat(data || []);
  }
  if (lineIds.length) {
    const { data } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id, guest_email, line_user_id")
      .in("line_user_id", lineIds);
    subs = subs.concat(data || []);
  }

  const seen = new Set();
  const uniqueSubs = subs.filter((s) => {
    if (!s?.endpoint || seen.has(s.endpoint)) return false;
    seen.add(s.endpoint);
    return true;
  });

  const site = getPublicSiteUrl();
  const logoUrl = `${site}/images/Logo/icon-192.png`;
  const name = creatorName || "追蹤中的創作者";
  const payload = JSON.stringify({
    title: `${name} 發了新文章`,
    body: title || "點開看看最新遊記",
    icon: logoUrl,
    badge: logoUrl,
    url,
  });

  let sent = 0;
  if (ensureWebPush()) {
    await Promise.allSettled(
      uniqueSubs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sent += 1;
        } catch {
          /* 過期訂閱略過 */
        }
      }),
    );
  }

  if (isLineBotConfigured()) {
    const lineText = `${name} 發了新文章\n${title || ""}\n${url.startsWith("http") ? url : `${site}${url}`}`;
    await Promise.allSettled(
      lineIds.map((id) => pushLineMessage(id, [{ type: "text", text: lineText }])),
    );
  }

  return { ok: true, sent, followers: followers.length };
}
