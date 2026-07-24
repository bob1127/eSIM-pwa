import crypto from "crypto";
import { generateMemberCouponCode } from "./memberCoupons";

/** 新會員首單禮：加入會員後下第一筆訂單折 50（官網／LINE 身份擇一，不可重複領券） */
export const WELCOME_AMOUNT = 50;
export const WELCOME_SOURCE = "welcome";
export const WELCOME_LABEL = "新會員首單 50 元折抵";

export const WELCOME_CHANNELS = ["web_signup", "line_login", "line_oa"];

/**
 * 查是否已領過歡迎禮（同一 email 或同一 LINE ID 任一命中即算已領）
 */
export async function hasClaimedWelcomeBenefit(supabaseAdmin, { email, lineUserId }) {
  const normalizedEmail = email ? String(email).toLowerCase() : null;
  const lineId = lineUserId ? String(lineUserId) : null;

  if (normalizedEmail) {
    const { data, error } = await supabaseAdmin
      .from("member_coupons")
      .select("id, code, status, created_at")
      .eq("source", WELCOME_SOURCE)
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (error) {
      if (/does not exist|schema cache/i.test(error.message || "")) {
        throw new Error(
          "資料庫尚未建立優惠券資料表，請先執行 migration：20260724_member_coupons_lottery.sql 與 20260724_member_welcome_50.sql",
        );
      }
      throw error;
    }
    if (data) return { claimed: true, coupon: data, match: "email" };
  }

  if (lineId) {
    const { data, error } = await supabaseAdmin
      .from("member_coupons")
      .select("id, code, status, created_at")
      .eq("source", WELCOME_SOURCE)
      .eq("line_user_id", lineId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return { claimed: true, coupon: data, match: "line" };
  }

  // 再查 claims 表（防券被刪仍留紀錄）
  if (normalizedEmail) {
    const { data } = await supabaseAdmin
      .from("member_welcome_claims")
      .select("id, channel, coupon_id, created_at")
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (data) return { claimed: true, claim: data, match: "email_claim" };
  }
  if (lineId) {
    const { data } = await supabaseAdmin
      .from("member_welcome_claims")
      .select("id, channel, coupon_id, created_at")
      .eq("line_user_id", lineId)
      .limit(1)
      .maybeSingle();
    if (data) return { claimed: true, claim: data, match: "line_claim" };
  }

  return { claimed: false };
}

/**
 * 發放歡迎禮 50 元（已領過則回傳 alreadyClaimed，不重發）
 * @param {object} member { email, userId?, lineUserId? }
 * @param {'web_signup'|'line_login'|'line_oa'} channel
 */
export async function claimWelcomeFifty(supabaseAdmin, member, channel) {
  const email = String(member?.email || "").toLowerCase();
  if (!email) {
    return { ok: false, status: 400, error: "缺少會員 Email" };
  }
  if (!WELCOME_CHANNELS.includes(channel)) {
    return { ok: false, status: 400, error: "無效的領取渠道" };
  }

  // LINE Login 的 id 不是 UUID，不可寫入 user_id（uuid 欄位）
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const userId =
    member.userId && uuidRe.test(String(member.userId))
      ? member.userId
      : null;
  const lineUserId = member.lineUserId
    ? String(member.lineUserId)
    : member.userId && !userId
      ? String(member.userId)
      : null;

  // 已有 LINE：若此 LINE 已領過（掛在別的 email），不可再發
  if (lineUserId) {
    const byLine = await hasClaimedWelcomeBenefit(supabaseAdmin, {
      email: null,
      lineUserId,
    });
    if (byLine.claimed) {
      return {
        ok: true,
        status: 200,
        alreadyClaimed: true,
        coupon: byLine.coupon || null,
        message:
          "此 LINE 帳號已領過新會員 50 元折抵（無法用其他 Google／Email 重複領取）",
      };
    }
  }

  const existing = await hasClaimedWelcomeBenefit(supabaseAdmin, {
    email,
    lineUserId: lineUserId || null,
  });
  if (existing.claimed) {
    return {
      ok: true,
      status: 200,
      alreadyClaimed: true,
      coupon: existing.coupon || null,
      message: "您已領過新會員 50 元折抵（官網／LINE 僅能擇一）",
    };
  }

  const code = generateMemberCouponCode(WELCOME_AMOUNT).replace(
    `JEKO-LOT-${WELCOME_AMOUNT}-`,
    `JEKO-WELCOME-${WELCOME_AMOUNT}-`,
  );

  const { data: coupon, error: insertErr } = await supabaseAdmin
    .from("member_coupons")
    .insert({
      user_id: userId,
      email,
      line_user_id: lineUserId,
      amount: WELCOME_AMOUNT,
      code,
      label: WELCOME_LABEL,
      source: WELCOME_SOURCE,
      status: "available",
    })
    .select("id, code, amount, label, status, created_at")
    .single();

  if (insertErr) {
    // unique index 撞到 → 視為已領過
    if (insertErr.code === "23505") {
      return {
        ok: true,
        status: 200,
        alreadyClaimed: true,
        message: "您已領過新會員 50 元折抵（官網／LINE 僅能擇一）",
      };
    }
    console.error("[welcome] 寫入優惠券失敗:", insertErr.message);
    return { ok: false, status: 500, error: "歡迎禮發放失敗" };
  }

  await supabaseAdmin.from("member_welcome_claims").insert({
    email,
    line_user_id: lineUserId,
    channel,
    coupon_id: coupon.id,
  });

  return {
    ok: true,
    status: 200,
    alreadyClaimed: false,
    coupon,
    message: `已獲得「${WELCOME_LABEL}」，折扣碼 ${coupon.code}`,
  };
}

/** 成本估算（給營運參考，純計算） */
export function estimatePromoCost({
  newMembers = 1000,
  firstOrderBuyers = 600,
  averageOrderValue = 800,
  welcomeAmount = WELCOME_AMOUNT,
  welcomeRedeemRate = 1,
  firstOrderDiscountRate = 0.05,
  lotteryExpectedTotal = 20000,
} = {}) {
  const welcomeCost = Math.round(
    newMembers * welcomeAmount * welcomeRedeemRate,
  );
  /** 若只有下單的人才用掉 50 元，用這個較贴近「實際核銷」 */
  const welcomeCostIfOnlyBuyersRedeem = firstOrderBuyers * welcomeAmount;
  const firstOrderPctCost = Math.round(
    firstOrderBuyers * averageOrderValue * firstOrderDiscountRate,
  );

  return {
    assumptions: {
      newMembers,
      firstOrderBuyers,
      averageOrderValue,
      welcomeAmount,
      welcomeRedeemRate,
      firstOrderDiscountRate,
      lotteryExpectedTotal,
    },
    welcome_50_if_all_redeem: welcomeCost,
    welcome_50_if_only_buyers_redeem: welcomeCostIfOnlyBuyersRedeem,
    first_order_5pct: firstOrderPctCost,
    lottery: lotteryExpectedTotal,
    /** 保守：歡迎禮全領全用 + 首購95折 + 拉霸 */
    total_conservative:
      welcomeCost + firstOrderPctCost + lotteryExpectedTotal,
    /** 贴近：只有下單 600 人用掉 50 + 首購95折 + 拉霸 */
    total_if_welcome_only_on_purchase:
      welcomeCostIfOnlyBuyersRedeem +
      firstOrderPctCost +
      lotteryExpectedTotal,
  };
}
