/**
 * POST /api/admin/traffic-alert-line-test
 * Boss：送一則「流量偏低提醒」Flex 測試到指定 LINE 好友（不寫入 last_alert_at）
 *
 * Body: { lineUserId?, sku?, remainingMb?, totalMb? }
 * lineUserId 省略時用 env TRAFFIC_ALERT_LINE_TEST_USER_ID
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { enrichUsagePlanRules } from "../../../lib/trafficPlanCatalog";
import { buildLowTrafficLineMessages } from "../../../lib/trafficAlertCopy";
import { resolveTrafficUpsellOffers } from "../../../lib/trafficUpsellLink";
import { isLineBotConfigured, pushLineMessage } from "../../../lib/lineBot";

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  if (req.method === "GET") {
    try {
      const supabase = getSupabaseAdminServer();
      const { data: friends, error } = await supabase
        .from("line_oa_friends")
        .select("line_user_id, display_name, followed_at")
        .is("unfollowed_at", null)
        .order("followed_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return res.status(200).json({
        ok: true,
        defaultLineUserId:
          process.env.TRAFFIC_ALERT_LINE_TEST_USER_ID || null,
        friends: (friends || []).map((f) => ({
          lineUserId: f.line_user_id,
          displayName: f.display_name || null,
          followedAt: f.followed_at,
        })),
      });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "讀取失敗" });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  if (!isLineBotConfigured()) {
    return res.status(503).json({ error: "LINE Messaging API 未設定" });
  }

  const body = req.body || {};
  let lineUserId = String(
    body.lineUserId || process.env.TRAFFIC_ALERT_LINE_TEST_USER_ID || "",
  ).trim();

  if (!lineUserId) {
    try {
      const supabase = getSupabaseAdminServer();
      const { data: friends } = await supabase
        .from("line_oa_friends")
        .select("line_user_id, display_name, followed_at")
        .is("unfollowed_at", null)
        .order("followed_at", { ascending: false })
        .limit(5);
      return res.status(400).json({
        error: "請提供 lineUserId，或設定 TRAFFIC_ALERT_LINE_TEST_USER_ID",
        recentFriends: (friends || []).map((f) => ({
          lineUserId: f.line_user_id,
          displayName: f.display_name || null,
        })),
      });
    } catch {
      return res.status(400).json({
        error: "請提供 lineUserId，或設定 TRAFFIC_ALERT_LINE_TEST_USER_ID",
      });
    }
  }

  const remainingMb =
    body.remainingMb != null ? Number(body.remainingMb) : 180;
  const totalMb = body.totalMb != null ? Number(body.totalMb) : 1024;

  const enriched = enrichUsagePlanRules({
    productName:
      body.productName ||
      body.sku ||
      "South Korea-Promo-unlimited-5-A0",
    sku: body.sku || "South Korea-Promo-unlimited-5-A0",
    planId: body.planId || null,
    remainingMb,
    totalMb: Number.isFinite(totalMb) ? totalMb : null,
    ruleDesc: body.ruleDesc || null,
    specialDesc: body.specialDesc || null,
    speedDesc: body.speedDesc || null,
  });

  const target = {
    ...enriched,
    product_label: enriched.productName,
  };

  const upsellOffers = resolveTrafficUpsellOffers(enriched);

  try {
    const supabase = getSupabaseAdminServer();
    const { data: friend } = await supabase
      .from("line_oa_friends")
      .select("line_user_id, display_name, unfollowed_at")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    if (friend?.unfollowed_at) {
      return res.status(400).json({
        error: "此 LINE 已取消好友，無法推播",
        lineUserId,
      });
    }

    const messages = await buildLowTrafficLineMessages(target);
    await pushLineMessage(lineUserId, messages);

    return res.status(200).json({
      ok: true,
      lineUserId,
      displayName: friend?.display_name || null,
      upsellOffers,
      messageCount: messages.length,
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "LINE 推播失敗",
      lineUserId,
    });
  }
}
