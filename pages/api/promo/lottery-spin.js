import { resolveMemberEmail } from "../push/_memberAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { runMemberLotterySpin } from "../../../lib/memberCoupons";

/**
 * POST /api/promo/lottery-spin
 * 需登入（Supabase Bearer 或 LINE NextAuth cookie）
 * 伺服器抽獎；中獎寫入 member_coupons
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
        error: "請先登入會員才能參加拉霸抽獎",
        needLogin: true,
      });
    }

    const supabaseAdmin = getSupabaseAdminServer();
    const result = await runMemberLotterySpin(supabaseAdmin, member);

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error,
        alreadyPlayed: result.alreadyPlayed || false,
      });
    }

    return res.status(200).json({
      success: true,
      prize: result.prize,
      coupon: result.coupon,
      playDay: result.playDay,
      testUnlimited: result.testUnlimited,
    });
  } catch (err) {
    console.error("[api/promo/lottery-spin]", err);
    return res.status(500).json({
      success: false,
      error: err.message || "抽獎失敗",
    });
  }
}
