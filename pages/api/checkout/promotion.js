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
import { createClient } from "@supabase/supabase-js";
import { isMemberOnlyPromoCode } from "../../../lib/memberOnlyPromotions";
import { isSettledOrderStatus } from "../../../lib/refundPolicy";

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

async function getAuthedEmail(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || !supabaseAdmin) return null;
  try {
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);
    return user?.email ? user.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** 該 email 是否曾經有過已付款成立的訂單（用來判斷是否為「新會員」）
 *  訂單只要曾經付款成立（completed / pending 待發貨 / 已退款等），都代表不是第一次購買，
 *  沿用 lib/refundPolicy.js 的 isSettledOrderStatus 邏輯，與會員中心訂單頁一致。
 */
async function hasPriorSuccessfulOrder(email) {
  if (!email || !supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("customer_email", email);
  if (error) {
    console.error("[promotion] 查詢歷史訂單失敗:", error.message);
    // 查詢失敗時，保守起見視為「不符資格」，避免優惠被誤用
    return true;
  }
  return (data || []).some(
    (o) => isSettledOrderStatus(o.status) || ["refund_pending", "refunded"].includes(String(o.status || "").toLowerCase()),
  );
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

    // ── action === "apply" ──────────────────────────────────────
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) {
      return res.status(400).json({ success: false, error: "請輸入折扣碼" });
    }

    if (isMemberOnlyPromoCode(normalizedCode)) {
      const email = await getAuthedEmail(req);
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

    // 1) 先取得目前購物車，移除既有折扣碼 → 確保「一次只能套用一組，不可疊加」
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

    // 2) 套用新的折扣碼
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
      throw new Error(applyData?.message || "折扣碼無效或已過期");
    }

    const updatedCart = applyData.cart;
    const appliedCodes = (updatedCart?.promotions || [])
      .map((p) => p.code?.toUpperCase())
      .filter(Boolean);

    if (!appliedCodes.includes(normalizedCode)) {
      return res.status(400).json({
        success: false,
        error: "折扣碼無效或已過期",
      });
    }

    return res.status(200).json({
      success: true,
      code: normalizedCode,
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
