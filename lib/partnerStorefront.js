/**
 * 夥伴賣場 SSR 用：取得 active store（domain = slug）
 * 優先 service role；缺 key / 失敗時退回 anon（依 public_read_active_stores RLS）
 */
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminServer } from "./supabaseAdminServer";
import { fetchMedusaProductById } from "./medusaStoreApi";
import { inferProductCountry } from "./partnerNavCountries";

function createAnonServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** 公開給其他 /p/* SSR 頁面使用 */
export function getPartnerStorefrontDb() {
  try {
    return getSupabaseAdminServer();
  } catch (err) {
    console.warn(
      "[getPartnerStorefrontDb] service role 不可用，改用 anon：",
      err?.message || err,
    );
    return createAnonServerClient();
  }
}

export async function fetchActiveStoreByDomain(domain) {
  const slug = String(domain || "").trim().toLowerCase();
  if (!slug) return null;

  const db = getPartnerStorefrontDb();
  if (!db) return null;

  const { data, error } = await db
    .from("stores")
    .select("*")
    .eq("domain", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[fetchActiveStoreByDomain]", slug, error.message);
    return null;
  }
  return data || null;
}

export async function fetchStoreListings(storeId) {
  const db = getPartnerStorefrontDb();
  if (!db || !storeId) return [];

  const { data, error } = await db
    .from("store_products")
    .select(
      `
      id,
      product_id,
      medusa_product_id,
      custom_prices,
      products ( id, name, description, image_url, handle, medusa_product_id, product_variations ( id, b2b_price ) )
    `,
    )
    .eq("store_id", storeId);

  if (error) {
    // medusa 欄位可能尚未 migration — 降級查詢
    if (/medusa_product_id|handle|schema cache/i.test(error.message || "")) {
      const { data: legacy, error: legacyErr } = await db
        .from("store_products")
        .select(
          `
          id,
          product_id,
          custom_prices,
          products ( id, name, description, image_url, product_variations ( id, b2b_price ) )
        `,
        )
        .eq("store_id", storeId);
      if (legacyErr) {
        console.error("[fetchStoreListings legacy]", legacyErr.message);
        return [];
      }
      return legacy || [];
    }
    console.error("[fetchStoreListings]", error.message);
    return [];
  }
  return data || [];
}

export async function fetchStoreProductsForStorefront(store) {
  if (!store?.id) return [];

  const listings = await fetchStoreListings(store.id);
  const markup = Number(store.markup_rate) || 0;
  const out = [];

  for (const sp of listings) {
    const medusaId =
      sp.medusa_product_id || sp.products?.medusa_product_id || null;
    const p = sp.products;

    // 優先用本地 products 表（上架時會 sync）
    if (p) {
      let minPrice = 0;
      if (p.product_variations?.length) {
        const prices = p.product_variations.map((v) => {
          if (sp.custom_prices && sp.custom_prices[v.id] !== undefined) {
            return parseInt(sp.custom_prices[v.id], 10);
          }
          return Math.round((v.b2b_price || 0) * (1 + markup / 100));
        });
        minPrice = Math.min(...prices.filter((n) => n > 0));
      }
      out.push({
        id: medusaId || p.id,
        productId: p.id,
        medusaProductId: medusaId,
        handle: p.handle || null,
        name: p.name,
        description: p.description,
        displayPrice: minPrice > 0 ? minPrice : 0,
        image: p.image_url || null,
        customPrices: sp.custom_prices || {},
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
        const sell =
          mp.minB2B > 0 ? Math.round(mp.minB2B * (1 + markup / 100)) : mp.minRetail || 0;
        const c = inferProductCountry(mp);
        out.push({
          id: medusaId,
          productId: null,
          medusaProductId: medusaId,
          handle: mp.handle,
          name: mp.name,
          description: mp.description,
          displayPrice: sell,
          image: mp.image_url || null,
          customPrices: sp.custom_prices || {},
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
