/**
 * 修復「商店掛到舊／空殼商品」：
 * - 舊 products 列常缺 handle／medusa_product_id，且 0 個方案
 * - 同步後會另建一筆有 Medusa ID＋方案的正確商品
 * - store_products 若仍指舊 id，定價頁會空白（legacy_8 案例）
 *
 * 對齊順序：listing.medusa_product_id → 同名且有方案的最新／方案數最多者
 */

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function loadProductIndex(supabase) {
  const tries = [
    "id, name, handle, medusa_product_id, hot_sale_telecoms",
    "id, name, handle, medusa_product_id",
    "id, name, handle",
    "id, name",
  ];
  let products = [];
  for (const cols of tries) {
    const { data, error } = await supabase.from("products").select(cols);
    if (!error) {
      products = data || [];
      break;
    }
  }

  const ids = products.map((p) => p.id).filter(Boolean);
  const planCountById = new Map();
  if (ids.length) {
    // 分批計數，避免一次 in 過大
    const chunk = 200;
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const { data: vars } = await supabase
        .from("product_variations")
        .select("product_id")
        .in("product_id", slice);
      for (const v of vars || []) {
        planCountById.set(
          v.product_id,
          (planCountById.get(v.product_id) || 0) + 1,
        );
      }
    }
  }

  const byMedusa = new Map();
  const byHandle = new Map();
  const byName = new Map();

  const prefer = (map, key, row) => {
    if (!key) return;
    const prev = map.get(key);
    const prevN = prev ? planCountById.get(prev.id) || 0 : -1;
    const nextN = planCountById.get(row.id) || 0;
    const prevHasMedusa = !!(prev && prev.medusa_product_id);
    const nextHasMedusa = !!row.medusa_product_id;
    if (
      !prev ||
      nextN > prevN ||
      (nextN === prevN && nextHasMedusa && !prevHasMedusa)
    ) {
      map.set(key, row);
    }
  };

  for (const row of products) {
    prefer(byMedusa, row.medusa_product_id, row);
    prefer(byHandle, row.handle, row);
    prefer(byName, normalizeName(row.name), row);
  }

  return { products, planCountById, byMedusa, byHandle, byName };
}

function findCanonicalProduct(listing, meta, index) {
  const { planCountById, byMedusa, byHandle, byName } = index;
  const currentId = listing.product_id;
  const currentCount = planCountById.get(currentId) || 0;
  const currentMeta = meta || {};

  // 已有方案且（有 medusa 或 listing 已綁 medusa 且一致）→ 不需修
  if (currentCount > 0 && (currentMeta.medusa_product_id || listing.medusa_product_id)) {
    return null;
  }
  // 有方案但缺 medusa：仍可嘗試補 medusa，但不必換 product_id
  if (currentCount > 0) {
    const twin =
      (listing.medusa_product_id && byMedusa.get(listing.medusa_product_id)) ||
      (currentMeta.handle && byHandle.get(currentMeta.handle)) ||
      byName.get(normalizeName(currentMeta.name));
    if (
      twin &&
      twin.id === currentId &&
      twin.medusa_product_id &&
      !listing.medusa_product_id
    ) {
      return { productId: twin.id, medusaProductId: twin.medusa_product_id, onlyMedusa: true };
    }
    return null;
  }

  const twin =
    (listing.medusa_product_id && byMedusa.get(listing.medusa_product_id)) ||
    (currentMeta.handle && byHandle.get(currentMeta.handle)) ||
    byName.get(normalizeName(currentMeta.name));

  if (!twin) return null;
  const twinCount = planCountById.get(twin.id) || 0;
  if (twinCount <= 0) return null;
  if (twin.id === currentId) {
    if (twin.medusa_product_id && !listing.medusa_product_id) {
      return {
        productId: twin.id,
        medusaProductId: twin.medusa_product_id,
        onlyMedusa: true,
      };
    }
    return null;
  }

  return {
    productId: twin.id,
    medusaProductId: twin.medusa_product_id || listing.medusa_product_id || null,
    onlyMedusa: false,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Array<{id:number, store_id:number, product_id:number, medusa_product_id?:string|null, custom_prices?:object}>} listings
 * @returns {Promise<{ healed: number, removed: number, listings: typeof listings }>}
 */
export async function healStoreProductListings(supabase, listings) {
  if (!supabase || !listings?.length) {
    return { healed: 0, removed: 0, listings: listings || [] };
  }

  const index = await loadProductIndex(supabase);
  const metaById = new Map(index.products.map((p) => [p.id, p]));

  let healed = 0;
  let removed = 0;
  const next = [];
  const occupied = new Map(); // storeId -> Set(productId) of surviving listings

  for (const row of listings) {
    const sid = row.store_id;
    if (!occupied.has(sid)) occupied.set(sid, new Set());
    occupied.get(sid).add(row.product_id);
  }

  for (const row of listings) {
    const meta = metaById.get(row.product_id);
    const fix = findCanonicalProduct(row, meta, index);
    if (!fix) {
      next.push(row);
      continue;
    }

    if (fix.onlyMedusa) {
      const patch = { medusa_product_id: fix.medusaProductId };
      const { error } = await supabase
        .from("store_products")
        .update(patch)
        .eq("id", row.id);
      if (!error) {
        healed += 1;
        next.push({ ...row, ...patch });
      } else {
        next.push(row);
      }
      continue;
    }

    const storeKeys = occupied.get(row.store_id) || new Set();
    if (storeKeys.has(fix.productId) && fix.productId !== row.product_id) {
      // 同店已有正確商品上架 → 刪空殼上架，避免 unique 衝突
      const { error } = await supabase
        .from("store_products")
        .delete()
        .eq("id", row.id);
      if (!error) {
        removed += 1;
        storeKeys.delete(row.product_id);
      } else {
        next.push(row);
      }
      continue;
    }

    const patch = {
      product_id: fix.productId,
      medusa_product_id: fix.medusaProductId,
    };
    const { error } = await supabase
      .from("store_products")
      .update(patch)
      .eq("id", row.id);

    if (error) {
      // unique 衝突：改刪空殼
      if (/duplicate|unique/i.test(error.message || "")) {
        const { error: delErr } = await supabase
          .from("store_products")
          .delete()
          .eq("id", row.id);
        if (!delErr) {
          removed += 1;
          storeKeys.delete(row.product_id);
        } else {
          next.push(row);
        }
      } else {
        console.warn("[healStoreProductListings]", row.id, error.message);
        next.push(row);
      }
      continue;
    }

    storeKeys.delete(row.product_id);
    storeKeys.add(fix.productId);
    healed += 1;
    next.push({
      ...row,
      ...patch,
    });
  }

  return { healed, removed, listings: next };
}

/**
 * 上架成功後：把同店「同名空殼」上架改指到這次同步的 productId
 */
export async function healEmptyListingsForProduct(
  supabase,
  { storeId, productId, medusaProductId, productName },
) {
  if (!supabase || !storeId || !productId) return { healed: 0, removed: 0 };

  const name = String(productName || "").trim();
  if (!name && !medusaProductId) return { healed: 0, removed: 0 };

  const { data: listings, error } = await supabase
    .from("store_products")
    .select("id, store_id, product_id, medusa_product_id, custom_prices, status")
    .eq("store_id", storeId);
  if (error || !listings?.length) return { healed: 0, removed: 0 };

  // 只處理「不是自己」的列，交給通用 heal
  return healStoreProductListings(supabase, listings);
}
