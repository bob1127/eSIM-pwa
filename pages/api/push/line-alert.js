import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import {
  resolveMemberEmail,
  expandMemberLookupEmails,
  fetchMemberEsimsForIdentity,
} from "./_memberAuth";
import { findOwnedEsim } from "../../../lib/esimOrderExtract";
import { getPublicSiteUrl } from "../../../lib/siteUrl";
import {
  resolveLineUserIdFromMemberLink,
  upsertLineTrafficAlert,
} from "../../../lib/lineTrafficAlert";
import {
  isLineOaFriend,
  LINE_OA_URL as SHARED_LINE_OA_URL,
} from "../../../lib/lineOaFriends";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const LINE_OA_URL = SHARED_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";

async function resolveLineUserId(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.id) return session.user.id;

  const member = await resolveMemberEmail(req, res);
  if (!member?.email) return null;
  return resolveLineUserIdFromMemberLink(supabaseAdmin, member.email);
}

/**
 * 好友判定：明確退追才擋；無 DB 列時再打 live API，失敗仍不硬擋開啟
 * （Login／Messaging 不同頻道時 profile 會 404，但使用者其實已加好友）
 */
async function getFriendFlag(lineUserId) {
  if (!lineUserId) return { isFriend: false, needsAddFriend: true };

  const { data } = await supabaseAdmin
    .from("line_oa_friends")
    .select("unfollowed_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (data?.unfollowed_at) {
    return { isFriend: false, needsAddFriend: true };
  }
  if (data && !data.unfollowed_at) {
    return { isFriend: true, needsAddFriend: false };
  }

  const live = await isLineOaFriend(supabaseAdmin, lineUserId);
  return {
    isFriend: live,
    needsAddFriend: false,
  };
}

/**
 * GET  — 查 LINE 流量提醒狀態
 * POST — { action: "enable"|"disable", topupId?, endpoint? }
 */
export default async function handler(req, res) {
  const lineUserId = await resolveLineUserId(req, res);
  const member = await resolveMemberEmail(req, res);
  const oaUrl = LINE_OA_URL;
  const oaQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=M&margin=12&data=${encodeURIComponent(oaUrl)}`;

  if (req.method === "GET") {
    if (!lineUserId) {
      return res.status(200).json({
        isLineLogin: false,
        oaUrl,
        oaQrUrl,
        hint: "使用 LINE 登入後可開啟 LINE 推播提醒",
      });
    }

    const friend = await getFriendFlag(lineUserId);

    const { data: lineAlert } = await supabaseAdmin
      .from("line_traffic_alerts")
      .select("topup_id, product_label, monitor_enabled, iccid")
      .eq("line_user_id", lineUserId)
      .eq("monitor_enabled", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const endpoint = req.query.endpoint
      ? String(req.query.endpoint)
      : null;

    let pushLineEnabled = false;
    if (endpoint) {
      const { data: sub } = await supabaseAdmin
        .from("push_subscriptions")
        .select("line_alert_enabled, topup_id, product_label")
        .eq("endpoint", endpoint)
        .maybeSingle();
      pushLineEnabled = !!sub?.line_alert_enabled;
    }

    return res.status(200).json({
      isLineLogin: true,
      lineUserId,
      oaUrl,
      oaQrUrl,
      isFriend: friend.isFriend,
      enabled: !!(lineAlert?.monitor_enabled || pushLineEnabled),
      topupId: lineAlert?.topup_id || null,
      productName: lineAlert?.product_label || null,
      iccid: lineAlert?.iccid || null,
      needsAddFriend: friend.needsAddFriend,
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  if (!lineUserId) {
    return res.status(401).json({
      error: "請使用 LINE 登入",
      hint: "LINE 推播需以 LINE 帳號登入本站",
      oaUrl,
      oaQrUrl,
    });
  }

  const { action, topupId, endpoint: bodyEndpoint } = req.body ?? {};

  if (action === "disable") {
    await supabaseAdmin
      .from("line_traffic_alerts")
      .update({ monitor_enabled: false, updated_at: new Date().toISOString() })
      .eq("line_user_id", lineUserId);

    if (bodyEndpoint) {
      await supabaseAdmin
        .from("push_subscriptions")
        .update({ line_alert_enabled: false })
        .eq("endpoint", bodyEndpoint);
    }

    return res.status(200).json({ success: true, enabled: false });
  }

  if (action !== "enable") {
    return res.status(400).json({ error: "action 需為 enable 或 disable" });
  }

  const friend = await getFriendFlag(lineUserId);
  if (friend.needsAddFriend) {
    return res.status(400).json({
      error: "請先加入 Jeko 官方 LINE 好友",
      oaUrl,
      oaQrUrl,
      needsAddFriend: true,
    });
  }

  let target = null;
  if (topupId && member?.email) {
    const emails = await expandMemberLookupEmails(member);
    const esims = await fetchMemberEsimsForIdentity({
      emails,
      lineUserId: member.lineUserId || lineUserId || null,
      supabaseUserId: member.userId || null,
    });
    target = findOwnedEsim(esims, topupId);
    if (!target) {
      return res.status(403).json({ error: "此 eSIM 不屬於您的帳戶" });
    }
  } else if (member?.email) {
    const emails = await expandMemberLookupEmails(member);
    const esims = await fetchMemberEsimsForIdentity({
      emails,
      lineUserId: member.lineUserId || lineUserId || null,
      supabaseUserId: member.userId || null,
    });
    target = esims[0] || null;
  }

  if (!target?.topupId && !target?.iccid) {
    const dataQueryUrl = `${getPublicSiteUrl()}/data-query`;
    return res.status(404).json({
      error: "找不到可監控的 eSIM 訂單",
      hint: `請先傳「一鍵綁定」連結 Google／FB 會員，或在官方 LINE 貼上 ICCID。也可至 ${dataQueryUrl} 查詢。`,
      dataQueryUrl,
      oaUrl,
      oaQrUrl,
    });
  }

  const rawOrderId = String(target.orderId || "").trim();
  const orderIdUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rawOrderId,
    )
      ? rawOrderId
      : null;

  const upsert = await upsertLineTrafficAlert(supabaseAdmin, {
    line_user_id: lineUserId,
    topup_id: target.topupId || null,
    iccid: target.iccid || null,
    product_label: target.productName || null,
    order_id: orderIdUuid,
    guest_email: member?.email || null,
  });

  if (!upsert.ok) {
    return res.status(500).json({
      error: "LINE 提醒設定失敗",
      detail: upsert.error,
      hint: "請稍後再試；若持續失敗請聯絡客服",
      oaUrl,
      oaQrUrl,
    });
  }

  const endpoint = bodyEndpoint || null;
  if (endpoint) {
    await supabaseAdmin
      .from("push_subscriptions")
      .update({ line_user_id: lineUserId, line_alert_enabled: true })
      .eq("endpoint", endpoint);
  }

  return res.status(200).json({
    success: true,
    enabled: true,
    topupId: target.topupId || null,
    productName: target.productName || upsert.productName,
    message: `已開啟 LINE 流量提醒，監控「${target.productName || "eSIM"}」`,
  });
}
