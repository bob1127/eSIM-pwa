/**
 * 進入結帳步驟時背景預熱：套用免運 + 暖供應商方案快取。
 * 不含地址更新（等客人填完再寫），不建 order。
 */
import { warmCartShippingOnly } from "../../../lib/medusaCheckoutPrep";
import {
  cartItemsToPlanChecks,
  validatePlansAvailability,
} from "../../../lib/esim/planAvailability";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { cartId } = req.body || {};
  if (!cartId) {
    return res.status(400).json({ success: false, message: "缺少 cartId" });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

  try {
    const warm = await warmCartShippingOnly({
      cartId,
      baseUrl,
      publishableKey,
    });
    if (!warm.ok) {
      return res.status(400).json({ success: false, ...warm });
    }

    if (warm.items?.length) {
      void validatePlansAvailability(
        cartItemsToPlanChecks(warm.items),
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      shippingApplied: warm.shippingApplied,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "prepare-cart 失敗",
    });
  }
}
