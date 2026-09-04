import { resolveMemberEmail } from "../push/_memberAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { listMemberCoupons } from "../../../lib/memberCoupons";
import { claimWelcomeFifty } from "../../../lib/memberWelcomeBenefit";
import { getMemberLineFriendStatus, LINE_OA_URL } from "../../../lib/lineOaFriends";
import { syncWelcomeCouponsAfterOrders } from "../../../lib/welcomeFirstOrder";

/**
 * GET /api/promo/member-coupons
 * 列出會員優惠券；若尚未領過歡迎禮 50 則自動發放
 * 回傳 line_friend 狀態供結帳頁顯示「加 LINE」引導
 * 已有成功訂單者：自動將首單／welcome 券標為 expired（不再出現在可用列表）
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const member = await resolveMemberEmail(req, res);
    if (!member?.email) {
      return res.status(401).json({
        success: false,
        error: "請先登入",
        needLogin: true,
      });
    }

    const supabaseAdmin = getSupabaseAdminServer();

    const channel =
      member.source === "line" || member.lineUserId
        ? "line_login"
        : "web_signup";

    let welcome = null;
    try {
      welcome = await claimWelcomeFifty(
        supabaseAdmin,
        {
          email: member.email,
          userId: member.userId,
          lineUserId: member.lineUserId || null,
        },
        channel,
      );
      if (welcome && !welcome.ok) {
        console.warn("[member-coupons] 歡迎禮發放失敗:", welcome.error);
      }
    } catch (e) {
      console.warn("[member-coupons] 自動發放歡迎禮略過:", e.message);
    }

    let hasPriorOrder = false;
    try {
      const sync = await syncWelcomeCouponsAfterOrders(
        supabaseAdmin,
        member.email,
      );
      hasPriorOrder = Boolean(sync.hasPrior);
    } catch (e) {
      console.warn("[member-coupons] 首單券同步略過:", e.message);
    }

    const coupons = await listMemberCoupons(supabaseAdmin, member.email);
    const lineStatus = await getMemberLineFriendStatus(supabaseAdmin, member);

    const welcomeCoupon =
      coupons.find(
        (c) =>
          c.source === "welcome" &&
          c.status === "available" &&
          Number(c.amount) === 50,
      ) ||
      (welcome?.ok && !hasPriorOrder ? welcome.coupon : null) ||
      null;

    const needLine =
      Boolean(welcomeCoupon && !lineStatus.isFriend) ||
      Boolean(
        welcome?.ok &&
          welcome.coupon &&
          !lineStatus.isFriend &&
          !hasPriorOrder,
      );

    return res.status(200).json({
      success: true,
      email: member.email,
      coupons,
      welcome: welcome?.ok
        ? {
            alreadyClaimed: welcome.alreadyClaimed,
            coupon: hasPriorOrder ? null : welcome.coupon || welcomeCoupon,
            message: welcome.message,
          }
        : welcome && !welcome.ok
          ? { error: welcome.error }
          : null,
      welcome_coupon: welcomeCoupon,
      has_prior_order: hasPriorOrder,
      line_friend: lineStatus.isFriend,
      line_user_id: lineStatus.lineUserId,
      line_oa_url: lineStatus.lineOaUrl || LINE_OA_URL,
      line_checked_via: lineStatus.checkedVia,
      line_check_reason: lineStatus.reason || null,
      can_use_welcome: Boolean(welcomeCoupon && lineStatus.isFriend),
      need_line_for_welcome: needLine,
    });
  } catch (err) {
    console.error("[api/promo/member-coupons]", err);
    const msg = err?.message || String(err);
    const missingTable = /Could not find the table|PGRST205|schema cache/i.test(
      msg,
    );
    return res.status(500).json({
      success: false,
      error: missingTable
        ? "資料表尚未被 API 讀到。請在 SQL Editor 執行：NOTIFY pgrst, 'reload schema'; 後再重新整理結帳頁"
        : msg || "讀取優惠券失敗",
      need_schema_reload: missingTable,
    });
  }
}
