import { resolveMemberEmail } from "../push/_memberAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import {
  claimWelcomeFifty,
  WELCOME_CHANNELS,
} from "../../../lib/memberWelcomeBenefit";

/**
 * POST /api/promo/welcome-claim
 * body: { channel: 'web_signup' | 'line_login' | 'line_oa' }
 * 官網註冊 / LINE 登入 / 加官方 LINE → 擇一領 50，不可重複
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const member = await resolveMemberEmail(req, res);
    if (!member?.email) {
      return res.status(401).json({
        success: false,
        error: "請先登入會員",
        needLogin: true,
      });
    }

    const channel = String(req.body?.channel || "").trim();
    if (!WELCOME_CHANNELS.includes(channel)) {
      return res.status(400).json({
        success: false,
        error: `channel 須為：${WELCOME_CHANNELS.join(" / ")}`,
      });
    }

    const supabaseAdmin = getSupabaseAdminServer();
    const result = await claimWelcomeFifty(
      supabaseAdmin,
      {
        email: member.email,
        userId: member.userId,
        lineUserId: member.lineUserId || null,
      },
      channel,
    );

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      alreadyClaimed: result.alreadyClaimed,
      coupon: result.coupon,
      message: result.message,
    });
  } catch (err) {
    console.error("[api/promo/welcome-claim]", err);
    return res.status(500).json({
      success: false,
      error: err.message || "領取失敗",
    });
  }
}
