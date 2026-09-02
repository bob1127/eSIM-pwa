/**
 * LINE Pay 一站結帳：地址／運費準備 + 呼叫 Medusa linepay-checkout
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { prepareMedusaCartForCheckout, checkoutPrepHttpStatus } from "../../../lib/medusaCheckoutPrep";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { cartId, orderInfo } = req.body || {};
  if (!cartId) {
    return res.status(400).json({ success: false, message: "缺少 cartId" });
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  ).replace(/\/$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

  try {
    const prep = await prepareMedusaCartForCheckout({
      req,
      cartId,
      orderInfo: orderInfo || {},
      baseUrl,
      publishableKey,
      parallelPlanCheck: true,
      validatePlans: true,
      fetchFinalTotal: false,
    });

    if (!prep.ok) {
      return res.status(checkoutPrepHttpStatus(prep)).json({
        success: false,
        code: prep.code,
        message: prep.message,
        invalid: "invalid" in prep ? prep.invalid : undefined,
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
    };

    const backendRes = await fetch(`${baseUrl}/store/linepay-checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        cart_id: cartId,
        orderInfo: orderInfo || {},
      }),
    });
    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok || !data?.success || !data?.paymentUrl) {
      return res.status(backendRes.status || 400).json({
        success: false,
        message: data?.message || "LINE Pay 建單失敗",
        detail: data,
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    const status = error?.code === "CART_COMPLETED" ? 400 : 500;
    return res.status(status).json({
      success: false,
      code: error?.code || "CHECKOUT_ERROR",
      message: error?.message || "LINE Pay 結帳失敗",
    });
  }
}
