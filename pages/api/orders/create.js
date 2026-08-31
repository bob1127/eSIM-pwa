// 檔案位置: esim-store-front/pages/api/orders/create.js
//
// 這一步只負責「把地址/運費寫進 Medusa 購物車」，回傳的 orderId 其實是
// cartId（欄位名稱保留 orderId 是為了跟舊版前端呼叫的資料形狀相容，不用改
// shop.jsx / CheckoutForm.jsx）。真正的「建立付款 session + 完成訂單 + 產生
// 藍新表單」都移到 esim-backend 的 /store/newebpay-checkout 處理，
// 詳見 pages/api/newebpay-generate-form.ts。

import {
  linkCartToReferral,
  resolveActiveReferralPartner,
} from "../../../lib/resolveReferralPartner";
import { getVerifiedReferralCodeFromRequest } from "../../../lib/referralSignature";
import {
  cartItemsToPlanChecks,
  validatePlansAvailability,
} from "../../../lib/esim/planAvailability";
import { applyPartnerCheckoutPricing } from "../../../lib/applyPartnerCheckoutPricing";
import { PricingError } from "../../../lib/partnerOrderPricing";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method Not Allowed" });

  const { cartId, orderInfo } = req.body;
  if (!cartId) return res.status(400).json({ success: false, message: "缺少購物車 ID" });

  const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  const headers = { "Content-Type": "application/json", ...(PUBLISHABLE_KEY && { "x-publishable-api-key": PUBLISHABLE_KEY }) };

  const parseMedusaError = (data) => {
    if (!data) return "未知錯誤";
    if (data.message) return data.message;
    if (Array.isArray(data.errors) && data.errors[0]?.message) return data.errors[0].message;
    return JSON.stringify(data);
  };

  const fetchMedusa = async (stepName, url, options = {}) => {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { throw new Error(`[${stepName}] Medusa 回傳格式錯誤。`); }

    if (!response.ok) {
      const detail = parseMedusaError(data);
      const err = new Error(`[${stepName}] 失敗: ${detail}`);
      if (detail.toLowerCase().includes("already completed") || detail.includes("已完成")) {
        err.code = "CART_COMPLETED";
      }
      throw err;
    }
    return data;
  };

  try {
    const cartCheck = await fetchMedusa("取得購物車", `${MEDUSA_URL}/store/carts/${cartId}?fields=*items,*items.metadata,*items.variant,*items.variant.sku,*items.variant.metadata,*items.product`, { headers });
    if (cartCheck.cart?.completed_at) {
      return res.status(400).json({
        success: false,
        code: "CART_COMPLETED",
        message: "此購物車已完成結帳，請重新整理頁面後再試（系統會自動建立新購物車）。",
      });
    }

    const planCheck = await validatePlansAvailability(
      cartItemsToPlanChecks(cartCheck.cart?.items || []),
    );
    if (!planCheck.ok) {
      return res.status(409).json({
        success: false,
        code: planCheck.code || "PLAN_UNAVAILABLE",
        message: planCheck.message,
        invalid: planCheck.invalid,
      });
    }

    const addressPayload = {
      first_name: orderInfo?.name || "eSIM",
      last_name: orderInfo?.name || "Customer",
      // eSIM 數位交付：地址非必填，Medusa cart 仍需要 address 欄位
      address_1:
        String(orderInfo?.address || "").trim() ||
        "eSIM digital delivery (no shipping)",
      city: String(orderInfo?.city || "").trim() || "Taipei",
      country_code: "tw",
      postal_code: String(orderInfo?.postalCode || "").trim() || "100",
      phone: orderInfo?.phone || "",
    };

    // 專屬推薦連結：綁定 Medusa cart ↔ 夥伴。
    // 只信任伺服器簽章過的 Cookie（見 lib/referralSignature.js），
    // 不再信任前端傳來的 orderInfo.referral_code —— 那個值來自可被竄改的
    // 純文字 Cookie，使用者能在瀏覽器端偽造代碼或延長效期。
    const referralCode = getVerifiedReferralCodeFromRequest(req);
    if (referralCode) {
      const refPartner = await resolveActiveReferralPartner(referralCode);
      if (refPartner) {
        await linkCartToReferral(cartId, refPartner, referralCode);
      }
    }

    await fetchMedusa("更新地址", `${MEDUSA_URL}/store/carts/${cartId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: orderInfo.email,
        shipping_address: addressPayload,
        billing_address: addressPayload,
        ...(referralCode
          ? { metadata: { jeko_referral_code: referralCode } }
          : {}),
      }),
    });

    const shipOptionsData = await fetchMedusa("取得運費選項", `${MEDUSA_URL}/store/shipping-options?cart_id=${cartId}`, { headers });
    if (!shipOptionsData.shipping_options || shipOptionsData.shipping_options.length === 0) {
      throw new Error(
        "無可用運費：請在 Medusa 後台為台灣區設定「eSIM Digital Delivery」免運方案（或執行 ensure-tw-digital-shipping 腳本）。"
      );
    }
    await fetchMedusa("套用運費", `${MEDUSA_URL}/store/carts/${cartId}/shipping-methods`, { method: "POST", headers, body: JSON.stringify({ option_id: shipOptionsData.shipping_options[0].id }) });

    // 夥伴店統一結帳：帶 store_id 時，於伺服器端用權威定價把夥伴售價覆寫到
    // Medusa 購物車（is_custom_price），並把分潤歸屬寫進 cart.metadata。
    // 全程不信任前端傳來的任何金額。
    const storeId = orderInfo?.store_id || orderInfo?.storeId || null;
    if (storeId) {
      try {
        await applyPartnerCheckoutPricing({ cartId, storeId });
      } catch (pricingErr) {
        if (pricingErr instanceof PricingError) {
          return res.status(pricingErr.status || 400).json({
            success: false,
            code: pricingErr.code || "PARTNER_PRICING_ERROR",
            message: pricingErr.message,
          });
        }
        throw pricingErr;
      }
    }

    const cartData = await fetchMedusa("取得購物車", `${MEDUSA_URL}/store/carts/${cartId}`, { headers });
    const finalAmount = cartData.cart.total || 0;

    // orderId 這裡等於 cartId，藍新表單那一步（呼叫 esim-backend /store/newebpay-checkout）
    // 才會真正把 cart complete 成 Medusa order。
    return res.status(200).json({ success: true, orderId: cartId, amount: finalAmount });

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
