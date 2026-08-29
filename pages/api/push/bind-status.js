/**
 * GET /api/push/bind-status?endpoint=
 *
 * 回傳本機推播訂閱／eSIM 綁定狀態。
 * 若帶登入（Bearer 或 NextAuth cookie），會做帳號防呆：
 * - 綁定不屬於目前會員 → 清綁定後回傳 unbound（避免 A→B 洩漏）
 * - 綁定屬於本人 → 正常回傳，必要時補上 user_id
 */
import {
  resolveMemberEmail,
  getSupabasePushAdmin,
  loadSubscriptionByEndpoint,
  memberOwnsBind,
  isBindActive,
  claimEndpointForMember,
  CLEAR_BIND_FIELDS,
} from "../../../lib/pushAccountSync";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  const endpoint = req.query.endpoint;
  if (!endpoint) {
    return res.status(400).json({ error: "缺少 endpoint" });
  }

  const admin = getSupabasePushAdmin();
  const { data, error } = await loadSubscriptionByEndpoint(admin, endpoint);

  if (error) {
    const missing =
      error.message?.includes("does not exist") || error.code === "42P01";
    return res.status(500).json({
      error: "查詢失敗",
      hint: missing
        ? "請執行 supabase/migrations/20260608_push_esim_bind.sql"
        : error.message,
    });
  }

  if (!data) {
    return res.status(200).json({
      subscribed: false,
      bound: false,
      needsIccid: false,
      generalPushEnabled: true,
    });
  }

  let row = data;
  let clearedForeignBind = false;
  const member = await resolveMemberEmail(req, res);

  if (member && isBindActive(row)) {
    const owns = await memberOwnsBind(member, row);
    if (!owns) {
      const claim = await claimEndpointForMember(admin, endpoint, member);
      clearedForeignBind = Boolean(claim.clearedBind);
      const reloaded = await loadSubscriptionByEndpoint(admin, endpoint);
      row = reloaded.data || { ...row, ...CLEAR_BIND_FIELDS };
    } else if (
      member.userId &&
      member.source === "supabase" &&
      String(row.user_id || "") !== String(member.userId)
    ) {
      await admin
        .from("push_subscriptions")
        .update({ user_id: member.userId })
        .eq("endpoint", endpoint);
      row = { ...row, user_id: member.userId };
    }
  }

  const bound = isBindActive(row);

  return res.status(200).json({
    subscribed: true,
    bound,
    needsIccid: !bound,
    generalPushEnabled: row.general_push_enabled !== false,
    iccid: bound ? row.iccid || null : null,
    guestEmail: bound ? row.guest_email || null : null,
    topupId: bound ? row.topup_id || null : null,
    productName: bound ? row.product_label || null : null,
    bindMethod: bound ? row.bind_method || null : null,
    orderId: bound ? row.order_id || null : null,
    boundAt: bound ? row.iccid_bound_at || null : null,
    clearedForeignBind,
  });
}
