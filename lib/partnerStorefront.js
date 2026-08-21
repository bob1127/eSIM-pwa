/**
 * 夥伴賣場 SSR 用：取得 active store（domain = slug）
 * 優先 service role；缺 key／查詢失敗時退回 anon（依 public_read_active_stores RLS）
 *
 * 注意：Vercel 若設了錯誤的 SUPABASE_SERVICE_ROLE_KEY，createClient 仍會成功，
 * 但查詢會失敗。舊邏輯不會退回 anon → /p/{slug} 整頁 404。必須查詢失敗後再試 anon。
 */
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminServer } from "./supabaseAdminServer";
import { fetchMedusaProductById } from "./medusaStoreApi";
import { inferProductCountry } from "./partnerNavCountries";
import {
  resolvePartnerListingDisplayPrice,
  resolvePartnerVariantBasePrice,
} from "./partnerPricing";
import { applyPartnerB2BMarkup } from "./medusaPartnerPricing";
import { loadB2BMarkupMultiplier } from "./platformSettings";

function createAnonServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** 依序：service role → anon（缺 key 或不可用則略過） */
function listStorefrontClients() {
  const clients = [];
  try {
    clients.push({ name: "admin", db: getSupabaseAdminServer() });
  } catch (err) {
    console.warn(
      "[partnerStorefront] service role 不可用：",
      err?.message || err,
    );
  }
  const anon = createAnonServerClient();
  if (anon) clients.push({ name: "anon", db: anon });
  return clients;
}

/** 公開給其他 /p/* SSR 頁面使用（單一 client；查詢請優先用 withStorefrontDb） */
export function getPartnerStorefrontDb() {
  return listStorefrontClients()[0]?.db || null;
}

/**
 * 對 storefront DB 執行查詢；admin 失敗自動改試 anon。
 * @param {(db: import('@supabase/supabase-js').SupabaseClient) => Promise<{ data: any, error: any }>} queryFn
 */
export async function withStorefrontDb(queryFn) {
  const clients = listStorefrontClients();
  if (!clients.length) {
    return {
      data: null,
      error: { message: "No Supabase client (missing URL/keys)" },
    };
  }

  let lastError = null;
  for (const { name, db } of clients) {
    try {
      const result = await queryFn(db);
      if (!result?.error) return result;
      lastError = result.error;
      console.warn(
        `[partnerStorefront] ${name} query failed:`,
        result.error?.message || result.error,
      );
    } catch (err) {
      lastError = err;
      console.warn(
        `[partnerStorefront] ${name} threw:`,
        err?.message || err,
      );
    }
  }
  return { data: null, error: lastError };
}

export async function fetchActiveStoreByDomain(domain) {
  const slug = String(domain || "").trim().toLowerCase();
  if (!slug) return null;

  const { data, error } = await withStorefrontDb((db) =>
    db
      .from("stores")
      .select("*")
      .eq("domain", slug)
      .eq("status", "active")
      .maybeSingle(),
  );

  if (error) {
    console.error("[fetchActiveStoreByDomain]", slug, error?.message || error);
    return null;
  }
  return data || null;
}

import {
  filterSellableListings,
} from "./partnerCatalogAvailability";

/**
 * 分層 select：DB 可能尚未跑完 handle / medusa 欄位 migration。
 * 舊邏輯一遇到 products.handle 缺失就整段降級，連 store_products.medusa_product_id
 * 也丟掉 → 夥伴商品 URL 變成 /p/{domain}/{localId}/ 且變體空白。
 *
 * @param {number|string} storeId
 * @param {{ forSaleOnly?: boolean }} [opts] forSaleOnly 預設 true：排除 paused／主站已下架
 */
export async function fetchStoreListings(storeId, opts = {}) {
  const forSaleOnly = opts.forSaleOnly !== false;
  if (!storeId) return [];

  // 暖入 boss 後台設定的平台抽成倍率，讓後續同步的 applyPartnerB2BMarkup() 生效
  await loadB2BMarkupMultiplier();

  const selectAttempts = [
    `id, product_id, medusa_product_id, custom_prices, status,
     products ( id, name, description, image_url, handle, medusa_product_id, catalog_status,
       product_variations ( id, sku, b2b_price, medusa_variant_id, title, attributes ) )`,
    `id, product_id, medusa_product_id, custom_prices, status,
     products ( id, name, description, image_url, handle, medusa_product_id,
       product_variations ( id, sku, b2b_price, medusa_variant_id, title, attributes ) )`,
    `id, product_id, medusa_product_id, custom_prices,
     products ( id, name, description, image_url, handle, medusa_product_id,
       product_variations ( id, sku, b2b_price, medusa_variant_id, title, attributes ) )`,
    `id, product_id, medusa_product_id, custom_prices,
     products ( id, name, description, image_url, handle, medusa_product_id,
       product_variations ( id, sku, b2b_price, medusa_variant_id ) )`,
    // products.handle 尚未建欄時仍保留 store／products 的 medusa id
    `id, product_id, medusa_product_id, custom_prices,
     products ( id, name, description, image_url, medusa_product_id,
       product_variations ( id, sku, b2b_price, medusa_variant_id ) )`,
    `id, product_id, medusa_product_id, custom_prices,
     products ( id, name, description, image_url,
       product_variations ( id, sku, b2b_price ) )`,
    `id, product_id, custom_prices,
     products ( id, name, description, image_url,
       product_variations ( id, sku, b2b_price ) )`,
  ];

  let lastError = null;
  for (const select of selectAttempts) {
    const { data, error } = await withStorefrontDb((db) =>
      db.from("store_products").select(select).eq("store_id", storeId),
    );

    if (!error) {
      const rows = data || [];
      return forSaleOnly ? filterSellableListings(rows) : rows;
    }

    lastError = error;
    const retryable = /column|does not exist|schema cache/i.test(
      error.message || "",
    );
    if (!retryable) {
      console.error("[fetchStoreListings]", error.message);
      return [];
    }
  }

  console.error("[fetchStoreListings] all attempts failed", lastError?.message);
  return [];
}

/** 夥伴商品路徑：優先 Medusa handle，其次 medusa id，最後本地 id */
export function partnerProductPath(domain, product) {
  const slug = String(domain || "").trim();
  const key =
    product?.handle ||
    product?.medusaProductId ||
    product?.medusa_product_id ||
    product?.id;
  if (!slug || key == null || key === "") return "#";
  return `/p/${slug}/${encodeURIComponent(String(key))}/`;
}

export async function fetchStoreProductsForStorefront(store) {
  if (!store?.id) return [];

  const listings = await fetchStoreListings(store.id);
  const storeMarkup = Number(store.markup_rate) || 0;
  const storeMarkupMode = store.markup_mode || "percent";
  const storeMarkupFixed = Number(store.markup_fixed) || 0;
  const out = [];

  for (const sp of listings) {
    const medusaId =
      sp.medusa_product_id || sp.products?.medusa_product_id || null;
    const p = sp.products;
    const customPrices = sp.custom_prices || {};

    // 優先用本地 products 表（上架時會 sync）
    if (p) {
      const variantPrices = (p.product_variations || []).map((v) =>
        resolvePartnerVariantBasePrice({
          b2bCost: applyPartnerB2BMarkup(v.b2b_price),
          markupRate: storeMarkup,
          markupMode: storeMarkupMode,
          markupFixed: storeMarkupFixed,
          customPrices,
          variantId: v.medusa_variant_id || v.attributes?.medusa_variant_id || v.id,
          altVariantIds: [
            v.id,
            v.medusa_variant_id,
            v.attributes?.medusa_variant_id,
            v.sku,
          ].filter(Boolean),
        }),
      );
      const displayPrice = resolvePartnerListingDisplayPrice({
        variantSellPrices: variantPrices,
        customPrices,
      });

      const handle = p.handle || null;
      out.push({
        // URL 優先 handle；無 handle 時用 medusa id（勿用本地數字 id）
        id: handle || medusaId || p.id,
        productId: p.id,
        medusaProductId: medusaId,
        handle,
        name: p.name,
        description: p.description,
        displayPrice: displayPrice > 0 ? displayPrice : 0,
        image: p.image_url || null,
        customPrices,
        ...(() => {
          const c = inferProductCountry(p);
          return c
            ? { countryKey: c.key, countryLabel: c.label }
            : { countryKey: null, countryLabel: null };
        })(),
      });
      continue;
    }

    // 僅有 medusa_product_id 時補抓
    if (medusaId) {
      try {
        const mp = await fetchMedusaProductById(medusaId);
        const variantPrices = (mp.variants || []).map((v) =>
          resolvePartnerVariantBasePrice({
            b2bCost: v.b2b_price,
            retailPrice: v.retail_price,
            markupRate: storeMarkup,
            markupMode: storeMarkupMode,
            markupFixed: storeMarkupFixed,
            customPrices,
            variantId: v.medusa_variant_id,
            altVariantIds: [v.medusa_variant_id].filter(Boolean),
          }),
        );
        const strategyValue =
          storeMarkupMode === "fixed" ? storeMarkupFixed : storeMarkup;
        const sell = resolvePartnerListingDisplayPrice({
          variantSellPrices: variantPrices.length
            ? variantPrices
            : [
                mp.minB2B > 0
                  ? storeMarkupMode === "fixed"
                    ? Math.round(mp.minB2B + strategyValue)
                    : Math.round(mp.minB2B * (1 + strategyValue / 100))
                  : mp.minRetail || 0,
              ],
          customPrices,
        });
        const c = inferProductCountry(mp);
        out.push({
          id: mp.handle || medusaId,
          productId: null,
          medusaProductId: medusaId,
          handle: mp.handle,
          name: mp.name,
          description: mp.description,
          displayPrice: sell,
          image: mp.image_url || null,
          customPrices,
          countryKey: c?.key || null,
          countryLabel: c?.label || null,
        });
      } catch (err) {
        console.warn("[fetchStoreProductsForStorefront] medusa", medusaId, err.message);
      }
    }
  }

  return out;
}

/**
 * 依 URL productId（medusa id / local id / handle）解析上架列
 */
export async function resolveStoreListing(store, productId) {
  if (!store?.id || !productId) return null;
  const listings = await fetchStoreListings(store.id);
  const key = String(productId);

  return (
    listings.find((sp) => String(sp.medusa_product_id) === key) ||
    listings.find((sp) => String(sp.product_id) === key) ||
    listings.find((sp) => String(sp.products?.handle) === key) ||
    listings.find((sp) => String(sp.products?.medusa_product_id) === key) ||
    null
  );
}
