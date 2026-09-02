/**
 * Medusa 結帳前 cart 準備（地址／運費／方案核對）。
 * LINE Pay 與藍新共用；可平行、可跳過已完成的步驟以縮短等待。
 */
import {
  linkCartToReferral,
  resolveActiveReferralPartner,
} from "./resolveReferralPartner";
import { getVerifiedReferralCodeFromRequest } from "./referralSignature";
import {
  cartItemsToPlanChecks,
  validatePlansAvailability,
} from "./esim/planAvailability";
import { applyPartnerCheckoutPricing } from "./applyPartnerCheckoutPricing";
import { PricingError } from "./partnerOrderPricing";

export const CART_CHECKOUT_FIELDS =
  "*items,*items.metadata,*items.variant,*items.variant.sku,*items.variant.metadata,*items.product,*shipping_methods,email,shipping_address,billing_address,total,subtotal,completed_at";

export function createMedusaClient(baseUrl, publishableKey) {
  const MEDUSA_URL = String(baseUrl || "http://localhost:9000").replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
  };

  const parseMedusaError = (data) => {
    if (!data) return "未知錯誤";
    if (data.message) return data.message;
    if (Array.isArray(data.errors) && data.errors[0]?.message) {
      return data.errors[0].message;
    }
    return JSON.stringify(data);
  };

  const fetchMedusa = async (stepName, url, options = {}) => {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      const err = new Error(`[${stepName}] Medusa 回傳格式錯誤。`);
      err.code = "MEDUSA_PARSE";
      throw err;
    }
    if (!response.ok) {
      const detail = parseMedusaError(data);
      const err = new Error(`[${stepName}] 失敗: ${detail}`);
      if (
        detail.toLowerCase().includes("already completed") ||
        detail.includes("已完成")
      ) {
        err.code = "CART_COMPLETED";
      }
      throw err;
    }
    return data;
  };

  return { MEDUSA_URL, headers, fetchMedusa };
}

export function assertOpenCartWithItems(cart) {
  if (cart?.completed_at) {
    return {
      ok: false,
      code: "CART_COMPLETED",
      message:
        "此購物車已完成結帳，請重新整理頁面後再試（系統會自動建立新購物車）。",
    };
  }
  const items = cart?.items || [];
  if (!items.length) {
    return {
      ok: false,
      code: "EMPTY_CART",
      message: "購物車內沒有商品，請重新加入方案後再結帳。",
    };
  }
  const total = Number(cart?.total ?? 0);
  if (total < 1) {
    return {
      ok: false,
      code: "EMPTY_CART",
      message: "購物車金額異常，請重新整理頁面後再試。",
    };
  }
  return { ok: true, items };
}

function buildAddressPayload(orderInfo) {
  return {
    first_name: orderInfo?.name || "eSIM",
    last_name: orderInfo?.name || "Customer",
    address_1:
      String(orderInfo?.address || "").trim() ||
      "eSIM digital delivery (no shipping)",
    city: String(orderInfo?.city || "").trim() || "Taipei",
    country_code: "tw",
    postal_code: String(orderInfo?.postalCode || "").trim() || "100",
    phone: orderInfo?.phone || "",
  };
}

function cartNeedsAddressUpdate(cart, orderInfo) {
  const email = String(orderInfo?.email || "").trim();
  const phone = String(orderInfo?.phone || "").trim();
  if (!email) return true;
  if (String(cart?.email || "").trim().toLowerCase() !== email.toLowerCase()) {
    return true;
  }
  if (String(cart?.shipping_address?.phone || "").trim() !== phone) {
    return true;
  }
  return false;
}

export async function ensureCartShipping({
  cart,
  cartId,
  fetchMedusa,
  MEDUSA_URL,
  headers,
}) {
  if ((cart?.shipping_methods || []).length > 0) {
    return { applied: false };
  }

  const shipOptionsData = await fetchMedusa(
    "取得運費選項",
    `${MEDUSA_URL}/store/shipping-options?cart_id=${cartId}`,
    { headers },
  );
  const optionId = shipOptionsData.shipping_options?.[0]?.id;
  if (!optionId) {
    const err = new Error(
      "無可用運費：請在 Medusa 後台為台灣區設定「eSIM Digital Delivery」免運方案。",
    );
    err.code = "NO_SHIPPING";
    throw err;
  }
  await fetchMedusa(
    "套用運費",
    `${MEDUSA_URL}/store/carts/${cartId}/shipping-methods`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ option_id: optionId }),
    },
  );
  return { applied: true };
}

/** 僅套用免運（進入結帳步驟時預熱；不含地址／付款） */
export async function warmCartShippingOnly({ cartId, baseUrl, publishableKey }) {
  const { MEDUSA_URL, headers, fetchMedusa } = createMedusaClient(
    baseUrl,
    publishableKey,
  );
  const cartCheck = await fetchMedusa(
    "取得購物車",
    `${MEDUSA_URL}/store/carts/${cartId}?fields=completed_at,*shipping_methods,*items,*items.variant,*items.variant.sku,*items.variant.metadata,*items.product,total`,
    { headers },
  );
  const gate = assertOpenCartWithItems(cartCheck.cart);
  if (!gate.ok) return gate;

  const shipping = await ensureCartShipping({
    cart: cartCheck.cart,
    cartId,
    fetchMedusa,
    MEDUSA_URL,
    headers,
  });

  return {
    ok: true,
    shippingApplied: shipping.applied,
    itemCount: gate.items.length,
    items: gate.items,
  };
}

export async function prepareMedusaCartForCheckout({
  req,
  cartId,
  orderInfo,
  baseUrl,
  publishableKey,
  partnerStoreId = null,
  parallelPlanCheck = false,
  validatePlans = true,
  fetchFinalTotal = false,
}) {
  const { MEDUSA_URL, headers, fetchMedusa } = createMedusaClient(
    baseUrl,
    publishableKey,
  );

  const cartCheck = await fetchMedusa(
    "取得購物車",
    `${MEDUSA_URL}/store/carts/${cartId}?fields=${CART_CHECKOUT_FIELDS}`,
    { headers },
  );
  const gate = assertOpenCartWithItems(cartCheck.cart);
  if (!gate.ok) return gate;

  const cart = cartCheck.cart;
  const referralCode = getVerifiedReferralCodeFromRequest(req);
  const addressPayload = buildAddressPayload(orderInfo);

  const runAddressReferralAndShipping = async () => {
    const referralPromise = (async () => {
      if (!referralCode) return;
      const refPartner = await resolveActiveReferralPartner(referralCode);
      if (refPartner) await linkCartToReferral(cartId, refPartner, referralCode);
    })();

    const tasks = [referralPromise];

    if (cartNeedsAddressUpdate(cart, orderInfo)) {
      tasks.push(
        fetchMedusa("更新地址", `${MEDUSA_URL}/store/carts/${cartId}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: orderInfo?.email,
            shipping_address: addressPayload,
            billing_address: addressPayload,
            ...(referralCode
              ? { metadata: { jeko_referral_code: referralCode } }
              : {}),
          }),
        }),
      );
    }

    await Promise.all(tasks);
    await ensureCartShipping({
      cart,
      cartId,
      fetchMedusa,
      MEDUSA_URL,
      headers,
    });
  };

  if (validatePlans) {
    const planPromise = validatePlansAvailability(
      cartItemsToPlanChecks(cart.items || []),
    );

    let planCheck;
    if (parallelPlanCheck) {
      [planCheck] = await Promise.all([
        planPromise,
        runAddressReferralAndShipping(),
      ]);
    } else {
      planCheck = await planPromise;
      if (!planCheck.ok) {
        return {
          ok: false,
          code: planCheck.code || "PLAN_UNAVAILABLE",
          message: planCheck.message,
          invalid: planCheck.invalid,
        };
      }
      await runAddressReferralAndShipping();
    }

    if (!planCheck.ok) {
      return {
        ok: false,
        code: planCheck.code || "PLAN_UNAVAILABLE",
        message: planCheck.message,
        invalid: planCheck.invalid,
      };
    }
  } else {
    await runAddressReferralAndShipping();
  }

  const storeId =
    partnerStoreId || orderInfo?.store_id || orderInfo?.storeId || null;
  if (storeId) {
    try {
      await applyPartnerCheckoutPricing({ cartId, storeId });
    } catch (pricingErr) {
      if (pricingErr instanceof PricingError) {
        return {
          ok: false,
          code: pricingErr.code || "PARTNER_PRICING_ERROR",
          message: pricingErr.message,
          status: pricingErr.status || 400,
        };
      }
      throw pricingErr;
    }
  }

  if (fetchFinalTotal) {
    const cartData = await fetchMedusa(
      "取得購物車",
      `${MEDUSA_URL}/store/carts/${cartId}?fields=total`,
      { headers },
    );
    return {
      ok: true,
      orderId: cartId,
      amount: cartData.cart?.total || 0,
    };
  }

  return { ok: true, cartId };
}

/** 將 prepareMedusaCartForCheckout 失敗結果對應到 HTTP status */
export function checkoutPrepHttpStatus(result) {
  if (result?.ok) return 200;
  if (typeof result?.status === "number") return result.status;
  if (result?.code === "CART_COMPLETED") return 400;
  if (
    result?.code === "PLAN_UNAVAILABLE" ||
    String(result?.code || "").startsWith("PLAN_")
  ) {
    return 409;
  }
  return 400;
}
