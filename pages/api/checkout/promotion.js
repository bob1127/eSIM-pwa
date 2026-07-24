// 檔案位置: pages/api/checkout/promotion.js
//
// 把「折扣碼」真正套用到 Medusa 購物車（不再是前端假算），
// 確保結帳頁顯示的折扣金額，跟最後藍新實際請款的金額一致。
//
// 規則：
//   - 一次只能套用一組折扣碼（不可與其他折扣／免運疊加）→ 套用新碼前，
//     一律先移除購物車上所有已套用的折扣碼。
//   - 特定「限新會員」折扣碼（見 lib/memberOnlyPromotions.js）：
//       必須登入，且該 email 過去沒有任何已完成付款訂單，才允許套用。
//   - 新會員 50／歡迎禮：須已加入官方 LINE，否則回 need_line_friend 供前端引導。
import { createClient } from "@supabase/supabase-js";
import { isMemberOnlyPromoCode } from "../../../lib/memberOnlyPromotions";
import { isSettledOrderStatus } from "../../../lib/refundPolicy";
import {
  isMemberLotteryCouponCode,
  isWelcomeMemberCouponCode,
  resolveLotteryPromoForCheckout,
} from "../../../lib/memberCoupons";
import {
  LINE_OA_URL,
} from "../../../lib/lineOaFriends";
import {
  assertWelcomeRedeemAllowed,
  bindWelcomeRedemption,
  isWelcomeRelatedCode,
} from "../../../lib/welcomeGuard";
import { resolveMemberEmail } from "../push/_memberAuth";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const medusaHeaders = () => ({
  "Content-Type": "application/json",
  ...(PUBLISHABLE_KEY && { "x-publishable-api-key": PUBLISHABLE_KEY }),
});

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

async function getAuthedMember(req, res) {
  try {
    return (await resolveMemberEmail(req, res)) || null;
  } catch {
    return null;
  }
}

async function hasPriorSuccessfulOrder(email) {
  if (!email || !supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("customer_email", email);
  if (error) {
    console.error("[promotion] 查詢歷史訂單失敗:", error.message);
    return true;
  }
  return (data || []).some(
    (o) =>
      isSettledOrderStatus(o.status) ||
      ["refund_pending", "refunded"].includes(
        String(o.status || "").toLowerCase(),
      ),
  );
}

function lineFriendBlockedResponse(res, lineOaUrl, error, extra = {}) {
  return res.status(403).json({
    success: false,
    need_line_friend: true,
    line_oa_url: lineOaUrl || LINE_OA_URL,
    error:
      error ||
      "還未加入官方 LINE？加入官方 LINE 即可立即使用優惠折扣",
    ...extra,
  });
}

async function fetchCart(cartId) {
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}`, {
    headers: medusaHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "無法取得購物車");
  }
  return data.cart;
}

function pickTotals(cart) {
  return {
    subtotal: cart?.subtotal ?? 0,
    discount_total: cart?.discount_total ?? 0,
    shipping_total: cart?.shipping_total ?? 0,
    total: cart?.total ?? 0,
    applied_codes: (cart?.promotions || []).map((p) => p.code).filter(Boolean),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const { cartId, code, action = "apply" } = req.body || {};

  if (!cartId) {
    return res.status(400).json({ success: false, error: "缺少購物車 ID" });
  }

  try {
    if (action === "remove") {
      const cart = await fetchCart(cartId);
      const existingCodes = (cart?.promotions || [])
        .map((p) => p.code)
        .filter(Boolean);

      if (existingCodes.length) {
        const delRes = await fetch(
          `${MEDUSA_URL}/store/carts/${cartId}/promotions`,
          {
            method: "DELETE",
            headers: medusaHeaders(),
            body: JSON.stringify({ promo_codes: existingCodes }),
          },
        );
        const delData = await delRes.json().catch(() => ({}));
        if (!delRes.ok) {
          throw new Error(delData?.message || "移除折扣碼失敗");
        }
        return res.status(200).json({ success: true, ...pickTotals(delData.cart) });
      }

      return res.status(200).json({ success: true, ...pickTotals(cart) });
    }

    let normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) {
      return res.status(400).json({ success: false, error: "請輸入折扣碼" });
    }

    const member = await getAuthedMember(req, res);
    const email = member?.email || null;
    let memberCouponId = null;
    let memberCouponRow = null;
    let displayCode = normalizedCode;
    let isWelcomeFlow = false;

    if (isMemberLotteryCouponCode(normalizedCode)) {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: "優惠券系統尚未設定完成",
        });
      }
      const resolved = await resolveLotteryPromoForCheckout(supabaseAdmin, {
        code: normalizedCode,
        email,
      });
      if (resolved?.error) {
        return res.status(resolved.status || 400).json({
          success: false,
          error: resolved.error,
        });
      }
      displayCode = normalizedCode;
      normalizedCode = resolved.medusaCode;
      memberCouponId = resolved.memberCoupon?.id || null;
      memberCouponRow = resolved.memberCoupon || null;
      if (resolved.isWelcome || isWelcomeMemberCouponCode(displayCode)) {
        isWelcomeFlow = true;
      }
    }

    if (isMemberOnlyPromoCode(normalizedCode)) {
      isWelcomeFlow = true;
      if (!email) {
        return res.status(401).json({
          success: false,
          error: "此優惠僅限已登入會員使用，請先登入或註冊會員",
        });
      }
      const alreadyOrdered = await hasPriorSuccessfulOrder(email);
      if (alreadyOrdered) {
        return res.status(400).json({
          success: false,
          error: "此優惠僅限尚未購買過的新會員使用，您已有訂單記錄",
        });
      }
    }

    let welcomeLineUserId = null;
    if (isWelcomeFlow || isWelcomeRelatedCode(displayCode)) {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: "優惠券系統尚未設定完成",
        });
      }
      const gate = await assertWelcomeRedeemAllowed(supabaseAdmin, member, {
        couponRow: memberCouponRow,
        isPublicNewMemberCode: isMemberOnlyPromoCode(normalizedCode),
      });
      if (!gate.ok) {
        if (gate.need_line_friend) {
          return lineFriendBlockedResponse(
            res,
            gate.line_oa_url,
            gate.error,
            {
              code: gate.code,
              checkedVia: gate.checkedVia,
              reason: gate.reason,
            },
          );
        }
        return res.status(gate.status || 400).json({
          success: false,
          error: gate.error,
          code: gate.code,
        });
      }
      welcomeLineUserId = gate.lineUserId;
    }

    const currentCart = await fetchCart(cartId);
    const existingCodes = (currentCart?.promotions || [])
      .map((p) => p.code)
      .filter(Boolean)
      .filter((c) => c.toUpperCase() !== normalizedCode);

    if (existingCodes.length) {
      await fetch(`${MEDUSA_URL}/store/carts/${cartId}/promotions`, {
        method: "DELETE",
        headers: medusaHeaders(),
        body: JSON.stringify({ promo_codes: existingCodes }),
      });
    }

    const applyRes = await fetch(
      `${MEDUSA_URL}/store/carts/${cartId}/promotions`,
      {
        method: "POST",
        headers: medusaHeaders(),
        body: JSON.stringify({ promo_codes: [normalizedCode] }),
      },
    );
    const applyData = await applyRes.json().catch(() => ({}));
    if (!applyRes.ok) {
      throw new Error(
        applyData?.message ||
          `折扣碼無效或已過期（Medusa 碼：${normalizedCode}）`,
      );
    }

    const updatedCart = applyData.cart;
    const appliedCodes = (updatedCart?.promotions || [])
      .map((p) => p.code?.toUpperCase())
      .filter(Boolean);

    if (!appliedCodes.includes(normalizedCode)) {
      return res.status(400).json({
        success: false,
        error: `折扣碼無效或已過期（Medusa 後台需有啟用中的「${normalizedCode}」）`,
        medusa_code: normalizedCode,
      });
    }

    // 套用成功：綁定 LINE 核銷（一個 LINE 終身一次）
    if (welcomeLineUserId && email) {
      const bound = await bindWelcomeRedemption(supabaseAdmin, {
        lineUserId: welcomeLineUserId,
        email,
        couponId: memberCouponId,
        couponCode: displayCode,
        cartId,
      });
      if (bound?.already) {
        // 競態：幾乎同時用兩個帳號套用 → 撤銷本次 Medusa 折扣
        await fetch(`${MEDUSA_URL}/store/carts/${cartId}/promotions`, {
          method: "DELETE",
          headers: medusaHeaders(),
          body: JSON.stringify({ promo_codes: [normalizedCode] }),
        });
        return res.status(400).json({
          success: false,
          error: "此 LINE 帳號已使用過新會員 50 元優惠，無法重複使用",
          code: "LINE_ALREADY_REDEEMED",
        });
      }
    }

    return res.status(200).json({
      success: true,
      code: displayCode,
      medusa_code: normalizedCode,
      member_coupon_id: memberCouponId,
      ...pickTotals(updatedCart),
    });
  } catch (error) {
    console.error("[api/checkout/promotion] 失敗:", error.message);
    return res.status(400).json({
      success: false,
      error: error.message || "折扣碼套用失敗",
    });
  }
}
