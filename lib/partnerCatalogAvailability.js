/**
 * 主站目錄可用性：Medusa Store API 看不見＝下架／刪除 → 夥伴不可再賣。
 * 以 products.catalog_status + store_products.status 作快取閘門；
 * 結帳／賣場再可選擇即時 probe 補強。
 */

import { getMedusaBackendUrl, getMedusaPublishableKey } from "./medusaStoreApi";

export const CATALOG_STATUS = {
  ACTIVE: "active",
  UNAVAILABLE: "unavailable",
  DELETED: "deleted",
};

export const LISTING_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
};

/** 是否仍可對外販售（賣場列表／結帳） */
export function isListingSellable(listing) {
  const listingStatus = String(listing?.status || LISTING_STATUS.ACTIVE).toLowerCase();
  if (listingStatus === LISTING_STATUS.PAUSED) return false;

  const catalog =
    listing?.products?.catalog_status ||
    listing?.catalog_status ||
    CATALOG_STATUS.ACTIVE;
  const c = String(catalog).toLowerCase();
  if (c === CATALOG_STATUS.UNAVAILABLE || c === CATALOG_STATUS.DELETED) {
    return false;
  }
  return true;
}

/**
 * 輕量探測：Medusa Store API 是否仍回傳此商品（已下架／刪除通常回空）
 * @param {string[]} medusaProductIds
 * @returns {Promise<{ live: Set<string>, confirmedMissing: Set<string>, errors: Set<string> }>}
 */
export async function probeLiveMedusaProductIds(medusaProductIds = []) {
  const ids = [
    ...new Set((medusaProductIds || []).map(String).filter(Boolean)),
  ];
  const live = new Set();
  const confirmedMissing = new Set();
  const errors = new Set();
  if (!ids.length) return { live, confirmedMissing, errors };

  let backendUrl;
  let key;
  try {
    backendUrl = getMedusaBackendUrl();
    key = getMedusaPublishableKey();
  } catch {
    return { live, confirmedMissing, errors: new Set(ids) };
  }
  if (!key) return { live, confirmedMissing, errors: new Set(ids) };

  const headers = { "x-publishable-api-key": key };
  const chunkSize = 15;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const query = new URLSearchParams({
            id,
            fields: "id,handle",
            limit: "1",
          });
          const controller =
            typeof AbortSignal !== "undefined" && AbortSignal.timeout
              ? AbortSignal.timeout(8000)
              : undefined;
          const res = await fetch(`${backendUrl}/store/products?${query}`, {
            headers,
            signal: controller,
          });
          if (!res.ok) {
            // 4xx 明確找不到；5xx 視為暫時錯誤
            if (res.status >= 400 && res.status < 500) {
              confirmedMissing.add(id);
            } else {
              errors.add(id);
            }
            return;
          }
          const data = await res.json();
          const product = data.products?.[0];
          if (product?.id) live.add(String(product.id));
          else confirmedMissing.add(id);
        } catch {
          errors.add(id);
        }
      }),
    );
  }

  return { live, confirmedMissing, errors };
}

/**
 * 將探測結果寫回 DB，並把「主站已不可見」的夥伴上架列自動 paused。
 * @returns {Promise<{ checked: number, unavailable: string[], restored: string[], pausedListings: number }>}
 */
export async function syncCatalogAvailability(supabase, medusaProductIds = []) {
  const ids = [
    ...new Set((medusaProductIds || []).map(String).filter(Boolean)),
  ];
  const empty = {
    checked: 0,
    unavailable: [],
    restored: [],
    pausedListings: 0,
  };
  if (!supabase || !ids.length) return empty;

  const { live, confirmedMissing } = await probeLiveMedusaProductIds(ids);
  const now = new Date().toISOString();
  const unavailable = [];
  const restored = [];
  let pausedListings = 0;

  for (const id of ids) {
    if (live.has(id)) {
      restored.push(id);
      const { error } = await supabase
        .from("products")
        .update({
          catalog_status: CATALOG_STATUS.ACTIVE,
          catalog_unavailable_at: null,
        })
        .eq("medusa_product_id", id);
      if (
        error &&
        !/column|does not exist|schema cache/i.test(error.message || "")
      ) {
        console.warn("[catalogAvailability] restore product", id, error.message);
      }
      continue;
    }

    // 僅在 Store API 明確回空／4xx 時下架；暫時錯誤不誤殺
    if (!confirmedMissing.has(id)) continue;

    unavailable.push(id);
    const { error: pErr } = await supabase
      .from("products")
      .update({
        catalog_status: CATALOG_STATUS.UNAVAILABLE,
        catalog_unavailable_at: now,
      })
      .eq("medusa_product_id", id);
    if (
      pErr &&
      !/column|does not exist|schema cache/i.test(pErr.message || "")
    ) {
      console.warn("[catalogAvailability] mark product", id, pErr.message);
    }

    const { data: paused, error: sErr } = await supabase
      .from("store_products")
      .update({ status: LISTING_STATUS.PAUSED })
      .eq("medusa_product_id", id)
      .eq("status", LISTING_STATUS.ACTIVE)
      .select("id");
    if (
      sErr &&
      !/column|does not exist|schema cache/i.test(sErr.message || "")
    ) {
      console.warn("[catalogAvailability] pause listings", id, sErr.message);
    } else {
      pausedListings += (paused || []).length;
    }
  }

  return {
    checked: ids.length,
    unavailable,
    restored,
    pausedListings,
  };
}

/**
 * 明確事件（Medusa webhook / revalidate）：標記刪除或下架並暫停所有夥伴上架。
 */
export async function markMedusaProductOffCatalog(
  supabase,
  medusaProductId,
  { deleted = false } = {},
) {
  const id = String(medusaProductId || "").trim();
  if (!supabase || !id) return { ok: false };

  const status = deleted ? CATALOG_STATUS.DELETED : CATALOG_STATUS.UNAVAILABLE;
  const now = new Date().toISOString();

  const { error: pErr } = await supabase
    .from("products")
    .update({
      catalog_status: status,
      catalog_unavailable_at: now,
    })
    .eq("medusa_product_id", id);

  if (pErr && !/column|does not exist|schema cache/i.test(pErr.message || "")) {
    return { ok: false, error: pErr.message };
  }

  const { data: paused, error: sErr } = await supabase
    .from("store_products")
    .update({ status: LISTING_STATUS.PAUSED })
    .eq("medusa_product_id", id)
    .select("id");

  if (sErr && !/column|does not exist|schema cache/i.test(sErr.message || "")) {
    return { ok: false, error: sErr.message };
  }

  return {
    ok: true,
    status,
    pausedListings: (paused || []).length,
  };
}

/** 過濾可販售上架列（缺欄位時視為可售，相容未跑 migration） */
export function filterSellableListings(listings = []) {
  return (listings || []).filter((sp) => {
    // 無 status／catalog_status 欄時物件上不會有值 → isListingSellable 視為可售
    if (sp.status == null && sp.products?.catalog_status == null && sp.catalog_status == null) {
      return true;
    }
    return isListingSellable(sp);
  });
}
