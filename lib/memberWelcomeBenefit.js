import crypto from "crypto";
import { generateMemberCouponCode } from "./memberCoupons";

/** 新會員首單禮：加入會員後下第一筆訂單折 50（官網／LINE 身份擇一，不可重複領券） */
export const WELCOME_AMOUNT = 50;
export const WELCOME_SOURCE = "welcome";
export const WELCOME_LABEL = "新會員首單 50 元折抵";

export const WELCOME_CHANNELS = ["web_signup", "line_login", "line_oa"];

/** 加 LINE 先發券、尚未註冊會員時的 placeholder email（DB email NOT NULL） */
export const PENDING_LINE_EMAIL_DOMAIN = "@line-pending.jekoesim.com";

export function pendingLineEmail(lineUserId) {
  const id = String(lineUserId || "").trim();
  if (!id) return "";
  return `${id.toLowerCase()}${PENDING_LINE_EMAIL_DOMAIN}`;
}

export function isPendingWelcomeEmail(email) {
  return String(email || "")
    .toLowerCase()
    .endsWith(PENDING_LINE_EMAIL_DOMAIN);
}

async function fetchWelcomeCouponRow(supabaseAdmin, filters) {
  let q = supabaseAdmin
    .from("member_coupons")
    .select(
      "id, code, amount, label, status, email, line_user_id, source, created_at",
    )
    .eq("source", WELCOME_SOURCE);

  if (filters.email) {
    q = q.eq("email", String(filters.email).toLowerCase());
  }
  if (filters.lineUserId) {
    q = q.eq("line_user_id", String(filters.lineUserId));
  }

  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

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
 * 會員註冊／綁定 LINE 時：把 LINE 先領的券併入真實 email，或把 line_user_id 掛到已有 email 券上。
 * 防止「先加 LINE + 再註冊」或「先註冊 + 再加 LINE」拿到兩張。
 */
export async function mergeWelcomeCouponToMember(
  supabaseAdmin,
  { email, lineUserId, userId = null },
) {
  const normalizedEmail = String(email || "").toLowerCase();
  const lineId = lineUserId ? String(lineUserId) : null;
  if (!normalizedEmail || !lineId || isPendingWelcomeEmail(normalizedEmail)) {
    return { ok: true, merged: false };
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const safeUserId =
    userId && uuidRe.test(String(userId)) ? String(userId) : null;

  const lineCoupon = await fetchWelcomeCouponRow(supabaseAdmin, {
    lineUserId: lineId,
  });
  const emailCoupon = await fetchWelcomeCouponRow(supabaseAdmin, {
    email: normalizedEmail,
  });

  // 兩張不同券（異常／ race）：保留 email 券，作廢 LINE pending 券
  if (
    lineCoupon &&
    emailCoupon &&
    lineCoupon.id !== emailCoupon.id
  ) {
    if (
      isPendingWelcomeEmail(lineCoupon.email) &&
      ["available", "issued", "active"].includes(
        String(lineCoupon.status || "").toLowerCase(),
      )
    ) {
      await supabaseAdmin
        .from("member_coupons")
        .update({ status: "expired" })
        .eq("id", lineCoupon.id)
        .eq("status", "available");
    }
    if (!emailCoupon.line_user_id) {
      await supabaseAdmin
        .from("member_coupons")
        .update({ line_user_id: lineId })
        .eq("id", emailCoupon.id)
        .is("line_user_id", null);
      emailCoupon.line_user_id = lineId;
    }
    return {
      ok: true,
      merged: true,
      alreadyClaimed: true,
      coupon: { ...emailCoupon, line_user_id: lineId },
      message: "已合併新會員 50 元折抵至您的會員帳戶",
    };
  }

  // 僅 LINE 有券 → 併入 email
  if (lineCoupon && !emailCoupon) {
    const { data: updated, error } = await supabaseAdmin
      .from("member_coupons")
      .update({
        email: normalizedEmail,
        ...(safeUserId ? { user_id: safeUserId } : {}),
      })
      .eq("id", lineCoupon.id)
      .select("id, code, amount, label, status, created_at")
      .single();
    if (error) throw error;

    await supabaseAdmin
      .from("member_welcome_claims")
      .update({ email: normalizedEmail })
      .eq("coupon_id", lineCoupon.id);

    return {
      ok: true,
      merged: true,
      alreadyClaimed: String(lineCoupon.status) === "redeemed",
      coupon: updated,
      message: `已將 LINE 新會員優惠併入帳戶，折扣碼 ${updated.code}`,
    };
  }

  // 僅 email 有券 → 補掛 line_user_id
  if (emailCoupon && !lineCoupon && !emailCoupon.line_user_id) {
    const { data: updated, error } = await supabaseAdmin
      .from("member_coupons")
      .update({ line_user_id: lineId })
      .eq("id", emailCoupon.id)
      .is("line_user_id", null)
      .select("id, code, amount, label, status, created_at")
      .single();
    if (error) throw error;
    return {
      ok: true,
      merged: true,
      alreadyClaimed: true,
      coupon: updated || emailCoupon,
      message: "已將官方 LINE 綁定至您的新會員優惠",
    };
  }

  if (lineCoupon && emailCoupon && lineCoupon.id === emailCoupon.id) {
    return {
      ok: true,
      merged: true,
      alreadyClaimed: true,
      coupon: lineCoupon,
    };
  }

  return { ok: true, merged: false };
}

async function insertWelcomeCoupon(
  supabaseAdmin,
  { email, lineUserId, userId, channel },
) {
  const code = generateMemberCouponCode(WELCOME_AMOUNT).replace(
    `JEKO-LOT-${WELCOME_AMOUNT}-`,
    `JEKO-WELCOME-${WELCOME_AMOUNT}-`,
  );

  const { data: coupon, error: insertErr } = await supabaseAdmin
    .from("member_coupons")
    .insert({
      user_id: userId || null,
      email,
      line_user_id: lineUserId || null,
      amount: WELCOME_AMOUNT,
      code,
      label: WELCOME_LABEL,
      source: WELCOME_SOURCE,
      status: "available",
    })
    .select("id, code, amount, label, status, created_at")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      const existing = await hasClaimedWelcomeBenefit(supabaseAdmin, {
        email,
        lineUserId: lineUserId || null,
      });
      return {
        ok: true,
        status: 200,
        alreadyClaimed: true,
        coupon: existing.coupon || null,
        message: "您已領過新會員 50 元折抵（官網／LINE 僅能擇一）",
      };
    }
    console.error("[welcome] 寫入優惠券失敗:", insertErr.message);
    return { ok: false, status: 500, error: "歡迎禮發放失敗" };
  }

  await supabaseAdmin.from("member_welcome_claims").insert({
    email,
    line_user_id: lineUserId || null,
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

/**
 * 加官方 LINE（follow）時發券：僅綁 line_user_id，email 用 placeholder。
 * 已領過／已綁會員已有券 → 不重發。
 */
export async function ensureWelcomeForLineFollow(
  supabaseAdmin,
  lineUserId,
  { isReFollow = false } = {},
) {
  const lineId = String(lineUserId || "").trim();
  if (!lineId) {
    return { ok: false, error: "缺少 LINE userId" };
  }

  const byLine = await hasClaimedWelcomeBenefit(supabaseAdmin, {
    email: null,
    lineUserId: lineId,
  });
  if (byLine.claimed) {
    const coupon =
      byLine.coupon ||
      (await fetchWelcomeCouponRow(supabaseAdmin, { lineUserId: lineId }));
    return {
      ok: true,
      alreadyClaimed: true,
      isReFollow,
      coupon,
      alreadyRedeemed: String(coupon?.status || "") === "redeemed",
      message: isReFollow
        ? "歡迎回來，您的新會員優惠仍有效"
        : "您已領過新會員 50 元折抵",
    };
  }

  // 此 LINE 已綁定會員且會員已有 welcome 券 → 只掛 line_user_id，不新發
  try {
    const { data: link } = await supabaseAdmin
      .from("line_account_links")
      .select("email")
      .eq("line_user_id", lineId)
      .maybeSingle();
    if (link?.email) {
      const merged = await mergeWelcomeCouponToMember(supabaseAdmin, {
        email: link.email,
        lineUserId: lineId,
      });
      if (merged.merged && merged.coupon) {
        return {
          ok: true,
          alreadyClaimed: true,
          isReFollow,
          coupon: merged.coupon,
          alreadyRedeemed:
            String(merged.coupon?.status || "") === "redeemed",
          mergedFromMember: true,
          message: merged.message,
        };
      }
      const byEmail = await hasClaimedWelcomeBenefit(supabaseAdmin, {
        email: link.email,
        lineUserId: null,
      });
      if (byEmail.claimed && byEmail.coupon) {
        if (!byEmail.coupon.line_user_id) {
          await supabaseAdmin
            .from("member_coupons")
            .update({ line_user_id: lineId })
            .eq("id", byEmail.coupon.id)
            .is("line_user_id", null);
        }
        return {
          ok: true,
          alreadyClaimed: true,
          isReFollow,
          coupon: byEmail.coupon,
          alreadyRedeemed:
            String(byEmail.coupon?.status || "") === "redeemed",
          mergedFromMember: true,
        };
      }
    }
  } catch (e) {
    console.warn("[welcome] follow 查 line_account_links 略過:", e.message);
  }

  const pendingEmail = pendingLineEmail(lineId);
  const issued = await insertWelcomeCoupon(supabaseAdmin, {
    email: pendingEmail,
    lineUserId: lineId,
    userId: null,
    channel: "line_oa",
  });

  return {
    ...issued,
    isReFollow,
    alreadyRedeemed: false,
  };
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

  // 先併 LINE 預建券（先加好友、後註冊）
  if (lineUserId) {
    try {
      const merged = await mergeWelcomeCouponToMember(supabaseAdmin, {
        email,
        lineUserId,
        userId,
      });
      if (merged.merged && merged.coupon) {
        return {
          ok: true,
          status: 200,
          alreadyClaimed: true,
          coupon: merged.coupon,
          message:
            merged.message ||
            "已將 LINE 新會員優惠併入您的會員帳戶（官網／LINE 僅能擇一）",
        };
      }
    } catch (e) {
      console.warn("[welcome] merge LINE 券略過:", e.message);
    }
  } else if (supabaseAdmin && email) {
    // 尚未帶 lineUserId：查是否已綁 LINE
    try {
      const filterColumn = userId ? "user_id" : "email";
      const filterValue = userId || email;
      const { data: link } = await supabaseAdmin
        .from("line_account_links")
        .select("line_user_id")
        .eq(filterColumn, filterValue)
        .maybeSingle();
      if (link?.line_user_id) {
        const merged = await mergeWelcomeCouponToMember(supabaseAdmin, {
          email,
          lineUserId: link.line_user_id,
          userId,
        });
        if (merged.merged && merged.coupon) {
          return {
            ok: true,
            status: 200,
            alreadyClaimed: true,
            coupon: merged.coupon,
            message:
              merged.message ||
              "已將官方 LINE 優惠併入您的會員帳戶（官網／LINE 僅能擇一）",
          };
        }
      }
    } catch (e) {
      console.warn("[welcome] 查綁定 LINE 略過:", e.message);
    }
  }

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

  return insertWelcomeCoupon(supabaseAdmin, {
    email,
    lineUserId: lineUserId || null,
    userId,
    channel,
  });
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
