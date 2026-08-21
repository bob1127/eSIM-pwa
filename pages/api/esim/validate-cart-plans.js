/**
 * POST /api/esim/validate-cart-plans
 * body: { items: [{ sku, planId, name }] } 或 { cartId }
 * 給結帳前／除錯用；LINE Pay／藍新建單 API 內也會再擋一次。
 */
import {
  cartItemsToPlanChecks,
  validatePlansAvailability,
} from "../../../lib/esim/planAvailability";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    let items = Array.isArray(req.body?.items) ? req.body.items : null;

    if ((!items || !items.length) && req.body?.cartId) {
      const cartId = String(req.body.cartId);
      const MEDUSA_URL = (
        process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      ).replace(/\/$/, "");
      const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
      const cartRes = await fetch(
        `${MEDUSA_URL}/store/carts/${encodeURIComponent(cartId)}?fields=*items,*items.variant,*items.variant.sku,*items.product`,
        {
          headers: {
            ...(PUBLISHABLE_KEY
              ? { "x-publishable-api-key": PUBLISHABLE_KEY }
              : {}),
          },
        },
      );
      const cartData = await cartRes.json().catch(() => ({}));
      if (!cartRes.ok) {
        return res.status(cartRes.status).json({
          success: false,
          message: cartData?.message || "無法讀取購物車",
        });
      }
      items = cartItemsToPlanChecks(cartData.cart?.items || []);
    }

    if (!items?.length) {
      return res.status(400).json({
        success: false,
        code: "EMPTY",
        message: "沒有可檢查的方案",
      });
    }

    const result = await validatePlansAvailability(items);
    if (!result.ok) {
      return res.status(409).json({
        success: false,
        code: result.code || "PLAN_UNAVAILABLE",
        message: result.message,
        invalid: result.invalid,
        results: result.results,
      });
    }

    return res.status(200).json({
      success: true,
      results: result.results,
    });
  } catch (err) {
    console.error("[validate-cart-plans]", err?.message || err);
    return res.status(500).json({
      success: false,
      code: "VALIDATE_ERROR",
      message: err?.message || "方案檢查失敗",
    });
  }
}
