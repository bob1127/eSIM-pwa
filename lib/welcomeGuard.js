/**
 * 新會員 50 防濫用規則（單一真相：一個 LINE = 終身一次）
 *
 * 已知風險與對策：
 * 1) 多個 Google 帳號 → 各拿一張券（email 不同）
 *    → 核銷時強制綁 LINE；同一 LINE 只能核銷一次
 * 2) Google 帳號沒綁 LINE → 無法通過好友檢查，無法套用
 * 3) 先 Google 領券、再 LINE 登入另開帳號 → LINE unique / redemption 擋第二次
 * 4) 公開碼 NEW50 → 同樣要求 LINE 好友 + 該 LINE 未核銷過歡迎禮
 * 5) 券轉借他人 → 結帳時 email 必須與券擁有者一致
 * 6) 加好友後封鎖再下單 → API 即時查 profile，404 視為非好友
 * 7) Login 頻道 ≠ Messaging 頻道 → profile 404，會誤判；需同一 Provider
 */

import { WELCOME_SOURCE } from "./memberWelcomeBenefit";
import { getMemberLineFriendStatus } from "./lineOaFriends";
import { isWelcomeMemberCouponCode } from "./memberCoupons";

/**
 * 此 LINE 是否已核銷過歡迎禮／新會員 50
 */
export async function hasLineRedeemedWelcome(supabaseAdmin, lineUserId) {
  if (!lineUserId) return false;
  const { data, error } = await supabaseAdmin
    .from("member_welcome_redemptions")
    .select("id, email, coupon_code, created_at")
    .eq("line_user_id", String(lineUserId))
    .maybeSingle();
  if (error) {
    if (/does not exist|schema cache/i.test(error.message || "")) {
      console.warn("[welcomeGuard] redemptions 表尚未建立");
      return false;
    }
    throw error;
  }
  return !!data;
}

/**
 * 此 LINE 是否已領過／綁過任何 welcome 券（含其他 email）
 */
export async function findWelcomeCouponByLine(supabaseAdmin, lineUserId) {
  if (!lineUserId) return null;
  const { data, error } = await supabaseAdmin
    .from("member_coupons")
    .select("id, code, email, status, line_user_id, created_at")
    .eq("source", WELCOME_SOURCE)
    .eq("line_user_id", String(lineUserId))
    .neq("status", "expired")
    .neq("status", "cancelled")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * 結帳套用歡迎禮／NEW50 前的守門
 * @returns {{ ok: true, lineUserId, lineOaUrl } | { ok: false, status, error, need_line_friend?, line_oa_url? }}
 */
export async function assertWelcomeRedeemAllowed(
  supabaseAdmin,
  member,
  { couponRow = null, isPublicNewMemberCode = false } = {},
) {
  const lineStatus = await getMemberLineFriendStatus(supabaseAdmin, member || {});
  const { lineUserId, isFriend, lineOaUrl } = lineStatus;

  if (!lineUserId) {
    return {
      ok: false,
      status: 403,
      need_line_friend: true,
      line_oa_url: lineOaUrl,
      error:
        "請先「連結 LINE」並加入官方帳號後，才能使用新會員 50 元優惠（Google／Email 會員不必改用 LINE 登入）",
      code: "NEED_LINE_BIND",
      checkedVia: lineStatus.checkedVia,
      reason: lineStatus.reason,
    };
  }

  if (!isFriend) {
    let error =
      "還未確認官方 LINE 好友狀態。請點「加入官方 LINE」後，再按「我已加入，重新檢查」";
    if (lineStatus.reason === "login_token_expired") {
      error =
        "登入狀態已過期，請先登出再重新用 LINE 登入後套用折扣";
    } else if (lineStatus.reason === "no_login_bot_linked") {
      error =
        "系統無法驗證好友：LINE Login 頻道尚未在 Developers 後台連結官方帳號。請到 LINE Developers → LINE Login → Linked LINE Official Account 連結後再試。";
    }
    return {
      ok: false,
      status: 403,
      need_line_friend: true,
      line_oa_url: lineOaUrl,
      error,
      code:
        lineStatus.reason === "no_login_bot_linked"
          ? "NEED_LINE_OA_LINK"
          : "NEED_LINE_FRIEND",
      checkedVia: lineStatus.checkedVia,
      reason: lineStatus.reason,
    };
  }

  // 同一 LINE 已核銷過 → 擋（防多 Google 帳號共用一個 LINE）
  if (await hasLineRedeemedWelcome(supabaseAdmin, lineUserId)) {
    return {
      ok: false,
      status: 400,
      error: "此 LINE 帳號已使用過新會員 50 元優惠，無法重複使用",
      code: "LINE_ALREADY_REDEEMED",
    };
  }

  // 個人券：必須屬於目前 email；若券已綁其他 LINE → 擋
  if (couponRow) {
    const ownerEmail = String(couponRow.email || "").toLowerCase();
    const memberEmail = String(member?.email || "").toLowerCase();
    if (ownerEmail && memberEmail && ownerEmail !== memberEmail) {
      return {
        ok: false,
        status: 403,
        error: "此優惠券不屬於目前登入的會員",
        code: "COUPON_EMAIL_MISMATCH",
      };
    }

    const boundLine = couponRow.line_user_id
      ? String(couponRow.line_user_id)
      : null;
    if (boundLine && boundLine !== String(lineUserId)) {
      return {
        ok: false,
        status: 403,
        error: "此優惠券已綁定其他 LINE 帳號，無法使用",
        code: "COUPON_LINE_MISMATCH",
      };
    }

    // 券尚未綁 LINE：確認此 LINE 沒有另一張 welcome 券掛在別的 email
    if (!boundLine) {
      const other = await findWelcomeCouponByLine(supabaseAdmin, lineUserId);
      if (other && other.id !== couponRow.id) {
        const otherEmail = String(other.email || "").toLowerCase();
        // 同一人先前用 LINE Login 領過券（幽靈帳 u…@line-login.com）：
        // 允許併回目前 Google／Email 會員，作廢幽靈帳未使用的券（防弊仍擋真的不同 email）
        const isSyntheticLineMailbox =
          /@line-login\.com$/i.test(otherEmail) ||
          /@line\.jekoesim\.com$/i.test(otherEmail);
        const otherUnused = ["available", "issued", "active"].includes(
          String(other.status || "").toLowerCase(),
        );

        if (isSyntheticLineMailbox && otherUnused) {
          await supabaseAdmin
            .from("member_coupons")
            .update({ status: "expired" })
            .eq("id", other.id)
            .eq("status", "available");
          // 繼續放行目前會員的券
        } else {
          return {
            ok: false,
            status: 400,
            error:
              "此 LINE 已在其他會員帳號領取過新會員優惠，無法再用另一個 Google／Email 帳號重複領用",
            code: "LINE_WELCOME_EXISTS_OTHER_EMAIL",
          };
        }
      }
    }
  }

  // 公開 NEW50：即使沒有個人券，也不許同一 LINE 再吃一次
  if (isPublicNewMemberCode) {
    const existing = await findWelcomeCouponByLine(supabaseAdmin, lineUserId);
    if (existing && existing.status === "redeemed") {
      return {
        ok: false,
        status: 400,
        error: "此 LINE 帳號已使用過新會員優惠",
        code: "LINE_ALREADY_REDEEMED",
      };
    }
  }

  return { ok: true, lineUserId, lineOaUrl };
}

/**
 * 套用成功後：把 LINE 綁到券上，並寫入核銷紀錄（同一 LINE 只能一筆）
 */
export async function bindWelcomeRedemption(
  supabaseAdmin,
  {
    lineUserId,
    email,
    couponId = null,
    couponCode = null,
    cartId = null,
  },
) {
  if (!supabaseAdmin || !lineUserId || !email) return { ok: false };

  // 綁定 line_user_id 到個人券（若尚未綁）
  if (couponId) {
    await supabaseAdmin
      .from("member_coupons")
      .update({ line_user_id: String(lineUserId) })
      .eq("id", couponId)
      .is("line_user_id", null);
  }

  const { error } = await supabaseAdmin.from("member_welcome_redemptions").upsert(
    {
      line_user_id: String(lineUserId),
      email: String(email).toLowerCase(),
      coupon_id: couponId,
      coupon_code: couponCode,
      cart_id: cartId || null,
    },
    { onConflict: "line_user_id" },
  );

  if (error) {
    if (/does not exist|schema cache/i.test(error.message || "")) {
      console.warn("[welcomeGuard] redemptions 表尚未建立，略過寫入");
      return { ok: false, missingTable: true };
    }
    // 23505：此 LINE 已核銷過
    if (error.code === "23505") {
      return { ok: false, already: true, error: error.message };
    }
    console.error("[welcomeGuard] 寫入核銷失敗:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export function isWelcomeRelatedCode(code) {
  const c = String(code || "").trim().toUpperCase();
  return (
    isWelcomeMemberCouponCode(c) ||
    c === "NEW50" ||
    c === "FIRST50"
  );
}
