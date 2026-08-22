// 夥伴店統一結帳：伺服器端「權威定價 + 覆寫到 Medusa 購物車」。
//
// 只在 Next.js 伺服器端（/api/orders/create）執行：
//  1. 用 computeAuthoritativeStoreOrder 依「當下商店設定」重算夥伴售價（不信任前端金額）。
//  2. 把每個 line item 的單價 HMAC 簽章後送到 Medusa 後端 /store/apply-partner-pricing
//     覆寫（is_custom_price），並把分潤歸屬寫進 cart.metadata。
//  3. 回傳套用後的總額與分潤，供結帳流程使用。
import { getSupabaseAdminServer } from "./supabaseAdminServer";
import {
  computeAuthoritativeStoreOrder,
  PricingError,
} from "./partnerOrderPricing";
import { signPartnerPricing } from "./partnerCheckoutSignature";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

function medusaHeaders() {
  return {
    "Content-Type": "application/json",
    ...(PUBLISHABLE_KEY && { "x-publishable-api-key": PUBLISHABLE_KEY }),
  };
}

/** 依商店解析對應的 partner_id（partners.slug 或 referral_code = stores.domain） */
async function resolvePartnerIdForStore(supabase, store) {
  if (!store) return null;
  const domain = store.domain;
  if (!domain) return null;
  const { data } = await supabase
    .from("partners")
    .select("id, slug, referral_code, status")
    .or(`slug.eq.${domain},referral_code.eq.${domain}`)
    .limit(5);
  const rows = data || [];
  return (
    rows.find((r) => r.status === "active")?.id || rows[0]?.id || null
  );
}

/**
 * @param {{ cartId: string, storeId: string|number }} args
 * @returns {Promise<{ amount:number, b2bCost:number, partnerProfit:number, partnerId:number|null }>}
 */
export async function applyPartnerCheckoutPricing({ cartId, storeId }) {
  if (!cartId) throw new PricingError("缺少購物車 ID");
  if (!storeId) throw new PricingError("缺少商店 ID");

  const supabase = getSupabaseAdminServer();

  // 商店設定（加成）— 相容舊 DB 無 markup_mode / markup_fixed 欄位
  let store = null;
  {
    const full = await supabase
      .from("stores")
      .select("id, domain, status, markup_rate, markup_mode, markup_fixed")
      .eq("id", storeId)
      .maybeSingle();
    if (full.error && /markup_mode|markup_fixed|column|schema cache/i.test(full.error.message || "")) {
      const legacy = await supabase
        .from("stores")
        .select("id, domain, status, markup_rate")
        .eq("id", storeId)
        .maybeSingle();
      store = legacy.data
        ? { ...legacy.data, markup_mode: "percent", markup_fixed: 0 }
        : null;
    } else {
      store = full.data;
    }
  }
  if (!store) throw new PricingError("找不到該商店", 404);
  if (store.status !== "active") {
    throw new PricingError("此商店目前無法下單", 403);
  }

  // 取 Medusa 購物車 line items（需要 line item id + sku + 數量）
  const cartRes = await fetch(
    `${MEDUSA_URL}/store/carts/${cartId}?fields=id,completed_at,*items,*items.variant,*items.variant.sku`,
    { headers: medusaHeaders() },
  );
  if (!cartRes.ok) throw new PricingError("無法取得購物車", 400);
  const { cart } = await cartRes.json();
  if (!cart) throw new PricingError("找不到購物車", 404);
  if (cart.completed_at) {
    const e = new PricingError("此購物車已結帳", 400);
    e.code = "CART_COMPLETED";
    throw e;
  }

  const cartItems = cart.items || [];
  if (!cartItems.length) throw new PricingError("購物車是空的");

  // 權威重算（依 SKU + 數量）；金額／底價／分潤全部由伺服器算，不信任前端
  const pricingItems = cartItems.map((it) => ({
    sku: it.variant_sku || it.variant?.sku || "",
    variant_id: it.variant_id || it.variant?.id || null,
    quantity: it.quantity,
    name: it.product_title || it.title,
  }));

  const priced = await computeAuthoritativeStoreOrder({
    storeId: store.id,
    storeMarkupRate: store.markup_rate,
    storeMarkupMode: store.markup_mode || "percent",
    storeMarkupFixed: Number(store.markup_fixed) || 0,
    items: pricingItems,
  });

  // 以 SKU 對應「權威單價」→ Medusa line item id
  const priceBySku = new Map();
  for (const it of priced.items) {
    priceBySku.set(String(it.sku), Math.round(Number(it.price) || 0));
  }

  const lines = [];
  for (const it of cartItems) {
    const sku = String(it.variant_sku || it.variant?.sku || "");
    const unit = priceBySku.get(sku);
    if (!(unit > 0)) {
      throw new PricingError(
        `無法為商品定價（SKU ${sku || "未知"}），請重新整理購物車`,
      );
    }
    lines.push({ item_id: String(it.id), unit_price: unit });
  }

  const partnerId = await resolvePartnerIdForStore(supabase, store);

  const payload = {
    cartId: String(cartId),
    storeId: String(store.id),
    partnerId: partnerId != null ? String(partnerId) : null,
    lines,
    total: priced.total_amount,
    b2bCost: priced.b2b_cost,
    partnerProfit: priced.partner_profit,
    ts: Date.now(),
  };
  const signature = signPartnerPricing(payload);

  const applyRes = await fetch(`${MEDUSA_URL}/store/apply-partner-pricing`, {
    method: "POST",
    headers: medusaHeaders(),
    body: JSON.stringify({ payload, signature }),
  });
  const applyData = await applyRes.json().catch(() => ({}));
  if (!applyRes.ok || !applyData?.ok) {
    throw new PricingError(
      applyData?.message || "套用夥伴定價失敗，請稍後再試",
      applyRes.status || 500,
    );
  }

  return {
    amount: Math.round(Number(applyData.total) || priced.total_amount),
    b2bCost: priced.b2b_cost,
    partnerProfit: priced.partner_profit,
    partnerId,
  };
}
