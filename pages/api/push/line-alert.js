import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import {
  resolveMemberEmail,
  fetchMemberEsims,
} from "./_memberAuth";
import { userOwnsTopupId } from "../../../lib/esimOrderExtract";
import { getPublicSiteUrl } from "../../../lib/siteUrl";
import { resolveLineUserIdFromMemberLink } from "../../../lib/lineTrafficAlert";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL ||
  "https://line.me/R/ti/p/@391huuts";

async function resolveLineUserId(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.id) return session.user.id;

  const member = await resolveMemberEmail(req, res);
  if (!member?.email) return null;
  return resolveLineUserIdFromMemberLink(supabaseAdmin, member.email);
}

async function isLineFriend(lineUserId) {
  if (!lineUserId) return false;
  const { data } = await supabaseAdmin
    .from("line_oa_friends")
    .select("unfollowed_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!data) return null; // unknown — table may not exist yet
  return !data.unfollowed_at;
}

/**
 * GET  — 查 LINE 流量提醒狀態
 * POST — { action: "enable"|"disable", topupId?, endpoint? }
 */
export default async function handler(req, res) {
  const lineUserId = await resolveLineUserId(req, res);
  const member = await resolveMemberEmail(req, res);
  const oaUrl = LINE_OA_URL;

  if (req.method === "GET") {
    if (!lineUserId) {
      return res.status(200).json({
        isLineLogin: false,
        oaUrl,
        hint: "使用 LINE 登入後可開啟 LINE 推播提醒",
      });
    }

    const friend = await isLineFriend(lineUserId);

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
      isFriend: friend,
      enabled: !!(lineAlert?.monitor_enabled || pushLineEnabled),
      topupId: lineAlert?.topup_id || null,
      productName: lineAlert?.product_label || null,
      iccid: lineAlert?.iccid || null,
      needsAddFriend: friend === false,
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

  const friend = await isLineFriend(lineUserId);
  if (friend === false) {
    return res.status(400).json({
      error: "請先加入 Jeko 官方 LINE 好友",
      oaUrl,
      needsAddFriend: true,
    });
  }
  // friend === null：資料表尚未建立或未追蹤，仍允許設定（Cron 推播時會再檢查）

  let target = null;
  if (topupId && member?.email) {
    const esims = await fetchMemberEsims(member.email);
    if (!userOwnsTopupId(esims, topupId)) {
      return res.status(403).json({ error: "此 eSIM 不屬於您的帳戶" });
    }
    target = esims.find((e) => e.topupId === String(topupId));
  } else if (member?.email) {
    const esims = await fetchMemberEsims(member.email);
    target = esims[0] || null;
  }

  if (!target?.topupId) {
    const dataQueryUrl = `${getPublicSiteUrl()}/data-query`;
    return res.status(404).json({
      error: "找不到可監控的 eSIM 訂單",
      hint: `請先傳「一鍵綁定」連結 Google／FB 會員，或在官方 LINE 貼上 ICCID。也可至 ${dataQueryUrl} 查詢。`,
      dataQueryUrl,
    });
  }

  const now = new Date().toISOString();
  const row = {
    line_user_id: lineUserId,
    topup_id: target.topupId,
    iccid: target.iccid || null,
    product_label: target.productName,
    order_id: target.orderId || null,
    guest_email: member?.email || null,
    monitor_enabled: true,
    updated_at: now,
  };

  await supabaseAdmin
    .from("line_traffic_alerts")
    .update({ monitor_enabled: false, updated_at: now })
    .eq("line_user_id", lineUserId);

  const { error: insertErr } = await supabaseAdmin
    .from("line_traffic_alerts")
    .insert(row);

  if (insertErr) {
    return res.status(500).json({
      error: "LINE 提醒設定失敗",
      detail: insertErr.message,
      hint: "請執行 supabase/migrations/20260621_traffic_monitor.sql",
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
    topupId: target.topupId,
    productName: target.productName,
    message: `已開啟 LINE 流量提醒，監控「${target.productName}」`,
  });
}
