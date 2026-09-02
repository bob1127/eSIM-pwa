// 檔案位置: esim-store-front/pages/api/orders/create.js
//
// 這一步只負責「把地址/運費寫進 Medusa 購物車」，回傳的 orderId 其實是
// cartId。藍新表單在 esim-backend /store/newebpay-checkout 才 complete order。

import { prepareMedusaCartForCheckout, checkoutPrepHttpStatus } from "../../../lib/medusaCheckoutPrep";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { cartId, orderInfo } = req.body;
  if (!cartId) {
    return res.status(400).json({ success: false, message: "缺少購物車 ID" });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
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
      fetchFinalTotal: true,
    });

    if (!prep.ok) {
      return res.status(checkoutPrepHttpStatus(prep)).json({
        success: false,
        code: prep.code,
        message: prep.message,
        invalid: prep.invalid,
      });
    }

    return res.status(200).json({
      success: true,
      orderId: prep.orderId,
      amount: prep.amount,
    });
  } catch (error) {
    console.error(`\n[Next.js API] 💥 結帳中斷: ${error.message}\n`);
    const status = error.code === "CART_COMPLETED" ? 400 : 500;
    return res.status(status).json({
      success: false,
      code: error.code || "CHECKOUT_ERROR",
      message: error.message,
    });
  }
}
