import { resolveMemberEmail } from "../push/_memberAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import {
  getMemberLotteryPlayStatus,
  runMemberLotterySpin,
} from "../../../lib/memberCoupons";

/**
 * GET  /api/promo/lottery-spin — 查詢是否已抽過（終身一次）
 * POST /api/promo/lottery-spin — 抽獎；需登入
 */
export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const member = await resolveMemberEmail(req, res);
      if (!member?.email) {
        return res.status(200).json({
          success: true,
          loggedIn: false,
          played: false,
          canSpin: false,
        });
      }
      const supabaseAdmin = getSupabaseAdminServer();
      const status = await getMemberLotteryPlayStatus(
        supabaseAdmin,
        member.email,
      );
      return res.status(200).json({
        success: true,
        loggedIn: true,
        played: Boolean(status.played),
        canSpin: !status.played,
        play: status.play || null,
        testUnlimited: Boolean(status.testUnlimited),
      });
    } catch (err) {
      console.error("[api/promo/lottery-spin GET]", err);
      return res.status(500).json({
        success: false,
        error: err.message || "查詢失敗",
      });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
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
