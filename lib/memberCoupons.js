import crypto from "crypto";
import {
  LOTTERY_PRIZES,
  LOTTERY_TEST_UNLIMITED,
  getLotteryWeightTotal,
} from "./promoLottery";

/** Medusa 後台需預建對應金額折扣碼；會員輸入個人碼後由 API 轉套此碼 */
export const LOTTERY_MEDUSA_PROMO_BY_AMOUNT = {
  30: process.env.LOTTERY_MEDUSA_PROMO_30 || "LOT30",
  50: process.env.LOTTERY_MEDUSA_PROMO_50 || "LOT50",
  100: process.env.LOTTERY_MEDUSA_PROMO_100 || "LOT100",
  200: process.env.LOTTERY_MEDUSA_PROMO_200 || "LOT200",
  300: process.env.LOTTERY_MEDUSA_PROMO_300 || "LOT300",
  999: process.env.LOTTERY_MEDUSA_PROMO_999 || "LOT999",
};

/** 伺服器端密碼學亂數抽獎（勿在客戶端呼叫） */
function drawSecureLotteryPrize(prizes = LOTTERY_PRIZES) {
  const total = getLotteryWeightTotal(prizes);
  if (total <= 0) return prizes[prizes.length - 1];
  let roll = crypto.randomInt(0, total);
  for (const prize of prizes) {
    roll -= prize.weight;
    if (roll < 0) return prize;
  }
  return prizes[prizes.length - 1];
}

export function taipeiPlayDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function generateMemberCouponCode(amount) {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `JEKO-LOT-${amount}-${suffix}`;
}

export function isMemberLotteryCouponCode(code) {
  const c = String(code || "").trim();
  return (
    /^JEKO-LOT-(50|100|200|300|999)-[A-F0-9]{6}$/i.test(c) ||
    /^JEKO-WELCOME-(30|50)-[A-F0-9]{6}$/i.test(c)
  );
}

export function isWelcomeMemberCouponCode(code) {
  return /^JEKO-WELCOME-(30|50)-[A-F0-9]{6}$/i.test(String(code || "").trim());
}

/** 結帳時歡迎禮／新會員 50 對應的 Medusa 碼 */
export function welcomeMedusaPromoCode() {
  return (
    process.env.WELCOME_MEDUSA_PROMO ||
    process.env.LOTTERY_MEDUSA_PROMO_50 ||
    "NEW50"
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeLotteryMember(memberOrEmail) {
  if (typeof memberOrEmail === "string") {
    return {
      email: String(memberOrEmail || "").toLowerCase(),
      userId: null,
      lineUserId: null,
    };
  }
  const email = String(memberOrEmail?.email || "").toLowerCase();
  const userId =
    memberOrEmail?.userId && UUID_RE.test(String(memberOrEmail.userId))
      ? memberOrEmail.userId
      : null;
  const lineUserId = memberOrEmail?.lineUserId
    ? String(memberOrEmail.lineUserId)
    : null;
  return { email, userId, lineUserId };
}

/** email / user_id / line_user_id 任一已抽過即擋（防換信箱／多身分） */
async function findExistingLotteryPlay(supabaseAdmin, { email, userId, lineUserId }) {
  const selectCols = "id, prize_id, amount, coupon_id, play_day, created_at";

  if (email) {
    const { data, error } = await supabaseAdmin
      .from("member_lottery_plays")
      .select(selectCols)
      .eq("email", email)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error };
    if (data) return { data, error: null };
  }

  if (userId) {
    const { data, error } = await supabaseAdmin
      .from("member_lottery_plays")
      .select(selectCols)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error };
    if (data) return { data, error: null };
  }

  if (lineUserId) {
    const { data, error } = await supabaseAdmin
      .from("member_lottery_plays")
      .select(selectCols)
      .eq("line_user_id", lineUserId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error };
    if (data) return { data, error: null };
  }

  return { data: null, error: null };
}

/**
 * 伺服器端抽獎並（中獎時）寫入 member_coupons
 * 每位會員終身限抽 1 次（email／user_id／LINE 任一已抽即擋）
 * 先佔位寫入 plays（unique 防競態），再開獎券，避免雙重發券
 */
export async function runMemberLotterySpin(supabaseAdmin, member) {
  const { email, userId, lineUserId } = normalizeLotteryMember(member);
  if (!email) {
    return { ok: false, status: 400, error: "無法辨識會員 Email" };
  }

  const playDay = taipeiPlayDay();

  if (!LOTTERY_TEST_UNLIMITED) {
    const { data: existing, error: existErr } = await findExistingLotteryPlay(
      supabaseAdmin,
      { email, userId, lineUserId },
    );

    if (existErr) {
      console.error("[lottery] 查詢抽獎紀錄失敗:", existErr.message);
      return { ok: false, status: 500, error: "查詢抽獎紀錄失敗" };
    }
    if (existing) {
      return {
        ok: false,
        status: 429,
        error: "每位會員限抽一次，您已參加過本活動。",
        alreadyPlayed: true,
        play: existing,
      };
    }
  }

  const prize = drawSecureLotteryPrize(LOTTERY_PRIZES);

  // 先佔位抽獎紀錄（unique 衝突 = 競態／已抽），再開券，避免重複發券
  const { data: playRow, error: playErr } = await supabaseAdmin
    .from("member_lottery_plays")
    .insert({
      user_id: userId,
      email,
      line_user_id: lineUserId,
      play_day: playDay,
      prize_id: prize.id,
      amount: prize.amount,
      coupon_id: null,
    })
    .select("id")
    .single();

  if (playErr) {
    console.error("[lottery] 寫入抽獎紀錄失敗:", playErr.message);
    if (/duplicate|unique/i.test(playErr.message || "")) {
      return {
        ok: false,
        status: 429,
        error: "每位會員限抽一次，您已參加過本活動。",
        alreadyPlayed: true,
      };
    }
    return { ok: false, status: 500, error: "抽獎失敗，請稍後再試" };
  }

  let coupon = null;

  if (prize.amount > 0) {
    const code = generateMemberCouponCode(prize.amount);
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("member_coupons")
      .insert({
        user_id: userId,
        email,
        line_user_id: lineUserId,
        amount: prize.amount,
        code,
        label: prize.label,
        source: "lottery",
        status: "available",
        lottery_day: playDay,
      })
      .select("id, code, amount, label, status, created_at")
      .single();

    if (insertErr) {
      console.error("[lottery] 寫入優惠券失敗:", insertErr.message);
      const missing =
        /Could not find the table|relation .* does not exist/i.test(
          insertErr.message || "",
        );
      return {
        ok: false,
        status: 500,
        error: missing
          ? "資料庫尚未建立優惠券資料表，請先在 Supabase 執行 migration：20260724_member_coupons_lottery.sql"
          : "優惠券寫入失敗，請聯絡客服（抽獎資格已使用）",
        alreadyPlayed: true,
      };
    }
    coupon = inserted;

    if (playRow?.id && coupon?.id) {
      const { error: linkErr } = await supabaseAdmin
        .from("member_lottery_plays")
        .update({ coupon_id: coupon.id })
        .eq("id", playRow.id);
      if (linkErr) {
        console.error("[lottery] 連結優惠券失敗:", linkErr.message);
      }
    }
  }

  return {
    ok: true,
    status: 200,
    prize: {
      id: prize.id,
      label: prize.label,
      amount: prize.amount,
    },
    coupon,
    playDay,
    testUnlimited: LOTTERY_TEST_UNLIMITED,
  };
}

/** 查詢會員是否已抽過（終身）；可傳 email 字串或 member 物件 */
export async function getMemberLotteryPlayStatus(supabaseAdmin, memberOrEmail) {
  const identity = normalizeLotteryMember(memberOrEmail);
  if (!identity.email && !identity.userId && !identity.lineUserId) {
    return { ok: false, played: false };
  }
  if (LOTTERY_TEST_UNLIMITED) {
    return { ok: true, played: false, testUnlimited: true };
  }
  const { data, error } = await findExistingLotteryPlay(supabaseAdmin, identity);
  if (error) {
    console.error("[lottery] 查詢狀態失敗:", error.message);
    return { ok: false, played: false, error: error.message };
  }
  return {
    ok: true,
    played: Boolean(data),
    play: data || null,
    testUnlimited: false,
  };
}

export async function listMemberCoupons(supabaseAdmin, email) {
  const { data, error } = await supabaseAdmin
    .from("member_coupons")
    .select("id, code, amount, label, status, source, created_at, redeemed_at")
    .eq("email", String(email).toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 結帳時：用個人 JEKO-LOT / JEKO-WELCOME 碼換對應 Medusa 促銷碼
 */
export async function resolveLotteryPromoForCheckout(
  supabaseAdmin,
  { code, email, lineUserId = null, guestLineVerify = false },
) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!isMemberLotteryCouponCode(normalized)) return null;

  const { data: row, error } = await supabaseAdmin
    .from("member_coupons")
    .select("id, code, amount, status, email, source, line_user_id")
    .eq("code", normalized)
    .maybeSingle();

  if (error) {
    console.error("[lottery] 查券失敗:", error.message);
    return { error: "查詢優惠券失敗", status: 500 };
  }
  if (!row) {
    return { error: "優惠券不存在", status: 400 };
  }
  if (row.status !== "available") {
    return { error: "此優惠券已使用或已失效", status: 400 };
  }

  const isWelcome =
    isWelcomeMemberCouponCode(normalized) || row.source === "welcome";

  const verifiedLineId = lineUserId ? String(lineUserId) : null;

  // 訪客：LINE 驗證通過 + welcome 券須綁同一 line_user_id
  if (isWelcome && guestLineVerify && verifiedLineId) {
    const boundLine = row.line_user_id ? String(row.line_user_id) : null;
    if (!boundLine || boundLine !== verifiedLineId) {
      return {
        error: "此折扣碼與您驗證的 LINE 帳號不符，請確認使用加好友時收到的折扣碼",
        status: 403,
        code: "COUPON_LINE_MISMATCH",
      };
    }
    return {
      memberCoupon: row,
      medusaCode: String(welcomeMedusaPromoCode()).toUpperCase(),
      isWelcome: true,
      guestCheckout: true,
    };
  }

  if (!email) {
    if (isWelcome) {
      return {
        error: "請先以 LINE 驗證身分後才能套用新會員折扣碼",
        status: 403,
        need_line_verify: true,
      };
    }
    return {
      error: "登入後才能套用折扣碼",
      status: 401,
      need_login: true,
    };
  }

  if (String(row.email).toLowerCase() !== String(email).toLowerCase()) {
    return { error: "此優惠券不屬於目前登入的會員", status: 403 };
  }

  if (isWelcome) {
    return {
      memberCoupon: row,
      medusaCode: String(welcomeMedusaPromoCode()).toUpperCase(),
      isWelcome: true,
    };
  }

  const medusaCode = LOTTERY_MEDUSA_PROMO_BY_AMOUNT[row.amount];
  if (!medusaCode) {
    return { error: "優惠券金額設定異常", status: 500 };
  }

  return {
    memberCoupon: row,
    medusaCode: String(medusaCode).toUpperCase(),
    isWelcome: false,
  };
}
