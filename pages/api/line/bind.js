import { resolveMemberEmail } from "../push/_memberAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { performLineAccountBind } from "../../../lib/lineAccountBind";
import { getClientIp } from "../../../lib/couponRateLimit";

const WINDOW_MS = 10 * 60 * 1000; // 10 分鐘
const MAX_ATTEMPTS = 10; // 同 IP 10 分鐘內最多 10 次綁定嘗試

/**
 * POST /api/line/bind
 *
 * 讓「非 LINE 登入」的會員（Google／FB／Email）把自己的 LINE 帳號
 * 綁定到目前登入的會員身分，藉此啟用新會員 50 折價券（須加官方好友）。
 *
 * 安全設計：
 * 1) 目前登入身分一律由 resolveMemberEmail() 驗證
 * 2) LINE 身分一律由 verifyLineIdToken() 向 LINE 官方伺服器驗證
 * 3) 一個 LINE ↔ 一個會員，衝突時明確拒絕
 * 4) IP 綁定嘗試頻率限制
 */

async function isBindRateLimited(supabaseAdmin, ip) {
  if (!supabaseAdmin || !ip || ip === "unknown") return false;
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error } = await supabaseAdmin
    .from("line_bind_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  if (error) return false;
  return (count || 0) >= MAX_ATTEMPTS;
}

async function logBindAttempt(supabaseAdmin, { ip, email, success }) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from("line_bind_attempts").insert([
      { ip: ip || null, email: email || null, success: !!success },
    ]);
  } catch {
    /* ignore */
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, error: "Method Not Allowed" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdminServer();
  } catch (e) {
    console.error("[api/line/bind] Supabase admin 初始化失敗:", e.message);
    return res.status(500).json({ success: false, error: "伺服器設定異常" });
  }

  const ip = getClientIp(req);

  try {
    const member = await resolveMemberEmail(req, res);
    if (!member?.email) {
      return res.status(401).json({
        success: false,
        error: "請先登入會員",
        needLogin: true,
      });
    }

    if (await isBindRateLimited(supabaseAdmin, ip)) {
      return res.status(429).json({
        success: false,
        error: "嘗試次數過多，請稍後再試",
      });
    }

    const idToken = req.body?.idToken;
    const result = await performLineAccountBind(
      supabaseAdmin,
      member,
      idToken,
      {
        logAttempt: ({ success }) =>
          logBindAttempt(supabaseAdmin, {
            ip,
            email: member.email,
            success,
          }),
      },
    );

    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[api/line/bind]", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "綁定失敗，請稍後再試",
    });
  }
}
