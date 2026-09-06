import { resolveMemberEmail } from "../push/_memberAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import {
  getMemberLotteryPlayStatus,
  runMemberLotterySpin,
} from "../../../lib/memberCoupons";
import { guardAuthRateLimit } from "../../../lib/authRateLimit";
import {
  applyLotterySecurityHeaders,
  assertSameSiteRequest,
  authFailureDelay,
  getClientIp,
  hasForbiddenLotteryClientFields,
  isHoneypotTriggered,
} from "../../../lib/promoLotterySecurity";

/**
 * GET  /api/promo/lottery-spin — 查詢是否已抽過（終身一次）
 * POST /api/promo/lottery-spin — 抽獎；需登入 + 同源 + 限流
 */
export default async function handler(req, res) {
  applyLotterySecurityHeaders(res);

  if (req.method === "GET") {
    try {
      if (!assertSameSiteRequest(req)) {
        return res.status(403).json({
          success: false,
          error: "來源不受信任",
          code: "FORBIDDEN_ORIGIN",
        });
      }

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
      const status = await getMemberLotteryPlayStatus(supabaseAdmin, member);
      return res.status(200).json({
        success: true,
        loggedIn: true,
        played: Boolean(status.played),
        canSpin: !status.played,
        play: status.play
          ? {
              prize_id: status.play.prize_id,
              amount: status.play.amount,
              play_day: status.play.play_day,
              created_at: status.play.created_at,
            }
          : null,
      });
    } catch (err) {
      console.error("[api/promo/lottery-spin GET]", err);
      return res.status(500).json({
        success: false,
        error: "查詢失敗",
      });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    if (!assertSameSiteRequest(req)) {
      await authFailureDelay(400);
      return res.status(403).json({
        success: false,
        error: "來源不受信任，請由官網優惠頁重新操作",
        code: "FORBIDDEN_ORIGIN",
      });
    }

    if (isHoneypotTriggered(req.body)) {
      await authFailureDelay(900);
      return res.status(429).json({
        success: false,
        error: "操作過於頻繁，請稍候再試",
        code: "RATE_LIMIT",
        retryAfter: 60,
      });
    }

    if (hasForbiddenLotteryClientFields(req.body)) {
      await authFailureDelay(500);
      return res.status(400).json({
        success: false,
        error: "無效的請求",
        code: "INVALID_PAYLOAD",
      });
    }

    const member = await resolveMemberEmail(req, res);
    if (!member?.email) {
      return res.status(401).json({
        success: false,
        error: "請先登入會員才能參加拉霸抽獎",
        needLogin: true,
      });
    }

    const ip = getClientIp(req);
    const rl = await guardAuthRateLimit({
      action: "lottery-spin",
      identifier: String(member.email).toLowerCase(),
      ip,
      windowMs: 15 * 60 * 1000,
      maxAttempts: 8,
      countAll: true,
    });
    if (rl.limited) {
      return res.status(429).json({
        success: false,
        error: `操作過於頻繁，請稍候 ${rl.retryAfterSec} 秒後再試`,
        code: "RATE_LIMIT",
        retryAfter: rl.retryAfterSec,
      });
    }

    const supabaseAdmin = getSupabaseAdminServer();
    const result = await runMemberLotterySpin(supabaseAdmin, member);

    await rl.record(Boolean(result.ok));

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
      coupon: result.coupon
        ? {
            id: result.coupon.id,
            code: result.coupon.code,
            amount: result.coupon.amount,
            label: result.coupon.label,
            status: result.coupon.status,
          }
        : null,
      playDay: result.playDay,
    });
  } catch (err) {
    console.error("[api/promo/lottery-spin]", err);
    return res.status(500).json({
      success: false,
      error: "抽獎失敗，請稍後再試",
    });
  }
}
