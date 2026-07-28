/**
 * 專屬商店訂單金額「伺服器端權威重算」。
 *
 * 安全原則：/api/create-order 絕不信任前端送來的 total_amount / b2b_cost /
 * partner_profit —— 這三個欄位直接寫進 DB 又牽動夥伴分潤與金流入帳，
 * 一旦被竄改就是實質的金錢損失。這裡只信任「SKU + 數量」，其餘一律用
 * DB 目前的商店設定（markup_rate／custom_prices／product_variations.b2b_price
 * ／PARTNER_B2B_COST_RATE）重新算一次，與前台顯示邏輯完全同源
 * （applyPartnerMarkupToVariations／applyPartnerB2BMarkup）。
 */
import { fetchStoreListings } from "./partnerStorefront";
import {
  applyPartnerMarkupToVariations,
} from "./partnerPricing";
import { applyPartnerB2BMarkup } from "./medusaPartnerPricing";

export class PricingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PricingError";
    this.status = status;
  }
}

const MAX_ITEMS = 50;
const MAX_QTY_PER_ITEM = 20;
/** 金流手續費估算率，需與後台分潤說明（PricingTab／dashboard）保持一致 */
const PAYMENT_FEE_RATE = 0.028;

function buildSkuIndex(listings) {
  const index = new Map();
  for (const listing of listings) {
    const variations = listing.products?.product_variations || [];
    if (!variations.length) continue;
    for (const v of variations) {
      if (!v.sku) continue;
      // 同一 SKU 若被上架多次，以最先出現者為準（不應發生，但防禦性處理）
      if (!index.has(v.sku)) {
        index.set(v.sku, { listing, variantId: v.id, allVariations: variations });
      }
    }
  }
  return index;
}

/**
 * @param {{
 *   storeId: number|string,
 *   storeMarkupRate: number,
 *   items: Array<{sku?: string, variant_id?: string|number, quantity?: number, name?: string}>,
 * }} params
 * @returns {Promise<{ total_amount: number, b2b_cost: number, partner_profit: number, items: Array }>}
 */
export async function computeAuthoritativeStoreOrder({
  storeId,
  storeMarkupRate,
  storeMarkupMode = "percent",
  storeMarkupFixed = 0,
  items,
}) {
  if (!storeId) throw new PricingError("缺少商店 ID");
  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingError("購物車是空的");
  }
  if (items.length > MAX_ITEMS) {
    throw new PricingError("單筆訂單商品項目過多，請分批下單");
  }

  const listings = await fetchStoreListings(storeId);
  if (!listings.length) {
    throw new PricingError("本店尚無上架商品，無法結帳");
  }

  const skuIndex = buildSkuIndex(listings);

  let totalAmount = 0;
  let totalCost = 0;
  const resolvedItems = [];

  for (const rawItem of items) {
    const sku = String(rawItem?.sku || "").trim();
    if (!sku) {
      throw new PricingError(
        `商品缺少方案編號（SKU），請重新整理購物車後再試：${rawItem?.name || ""}`,
      );
    }

    const entry = skuIndex.get(sku);
    if (!entry) {
      throw new PricingError(
        `商品「${rawItem?.name || sku}」已下架或不在本店上架清單中，請重新整理購物車`,
      );
    }

    const { listing, variantId, allVariations } = entry;
    const customPrices = listing.custom_prices || {};

    // 用與前台一致的邏輯，對「這個商品」的所有方案重新定價一次
    const pricedVariants = allVariations.map((v) => {
      const partnerCost = applyPartnerB2BMarkup(v.b2b_price);
      return {
        id: String(
          v.medusa_variant_id || v.attributes?.medusa_variant_id || v.id,
        ),
        local_id: v.id,
        medusa_variant_id:
          v.medusa_variant_id || v.attributes?.medusa_variant_id || null,
        sku: v.sku || null,
        price: partnerCost,
        retail_price: partnerCost,
        b2b_price: partnerCost,
      };
    });
    const applied = applyPartnerMarkupToVariations(pricedVariants, {
      markupRate: storeMarkupRate,
      markupMode: storeMarkupMode,
      markupFixed: storeMarkupFixed,
      customPrices,
    });
    const matched = applied.find(
      (v) =>
        String(v.local_id) === String(variantId) ||
        String(v.id) === String(variantId),
    );
    const unitPrice = matched ? Math.round(Number(matched.price) || 0) : 0;
    const rawVariant = allVariations.find(
      (v) => String(v.id) === String(variantId),
    );
    const unitCost = applyPartnerB2BMarkup(rawVariant?.b2b_price);

    if (unitPrice <= 0) {
      throw new PricingError(`方案「${sku}」定價異常，請聯絡客服`);
    }

    const qty = Math.max(
      1,
      Math.min(MAX_QTY_PER_ITEM, Math.round(Number(rawItem?.quantity)) || 1),
    );

    totalAmount += unitPrice * qty;
    totalCost += unitCost * qty;

    resolvedItems.push({
      sku,
      name: rawItem?.name || null,
      image: rawItem?.image || null,
      specLabel: rawItem?.specLabel || rawItem?.options || null,
      planId: rawItem?.planId || null,
      quantity: qty,
      price: unitPrice,
      b2b_cost: unitCost,
    });
  }

  totalAmount = Math.round(totalAmount);
  totalCost = Math.round(totalCost);
  const fee = Math.round(totalAmount * PAYMENT_FEE_RATE);
  const partnerProfit = Math.max(0, totalAmount - totalCost - fee);

  return {
    total_amount: totalAmount,
    b2b_cost: totalCost,
    partner_profit: partnerProfit,
    items: resolvedItems,
  };
}
