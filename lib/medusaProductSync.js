import { createClient } from "@supabase/supabase-js";
import { fetchMedusaProductById } from "./medusaStoreApi";
import { parseHotSaleTelecoms } from "./productHotSale";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("缺少 Supabase service role");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 夥伴上架時 lazy sync：將單一 Medusa 商品寫入 Supabase products + product_variations
 */
export async function upsertMedusaProductToSupabase(medusaProductId) {
  const supabase = getAdmin();
  const formatted = await fetchMedusaProductById(medusaProductId);

  const productPayload = {
    name: formatted.name,
    description: formatted.description,
    image_url: formatted.image_url,
    updated_at: new Date().toISOString(),
  };

  const hotSale = parseHotSaleTelecoms(formatted.hot_sale_telecoms);

  let productId = null;

  // 用 .limit(1) 取代 .maybeSingle()，避免歷史重複資料造成
  // 「查到多筆 → error → 判斷成查無資料 → 又插入一筆新重複」的滾雪球式重複 bug。
  const { data: byMedusaCol, error: medusaColErr } = await supabase
    .from("products")
    .select("id")
    .eq("medusa_product_id", medusaProductId)
    .order("id", { ascending: true })
    .limit(1);

  if (!medusaColErr && byMedusaCol?.[0]?.id) {
    productId = byMedusaCol[0].id;
  } else if (formatted.handle) {
    const { data: byHandle, error: handleErr } = await supabase
      .from("products")
      .select("id")
      .eq("handle", formatted.handle)
      .order("id", { ascending: true })
      .limit(1);
    if (!handleErr && byHandle?.[0]?.id) productId = byHandle[0].id;
  }

  const hasMedusaCol = !(
    await supabase.from("products").select("medusa_product_id").limit(1)
  ).error;

  if (hasMedusaCol) {
    productPayload.medusa_product_id = medusaProductId;
    productPayload.handle = formatted.handle;
    productPayload.medusa_synced_at = new Date().toISOString();
  }

  if (productId) {
    const { error } = await supabase
      .from("products")
      .update(productPayload)
      .eq("id", productId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();
    if (error) throw error;
    productId = data.id;
  }

  // hot_sale_telecoms 欄位為可選 migration；失敗不擋上架
  if (hotSale) {
    const { error: hotErr } = await supabase
      .from("products")
      .update({ hot_sale_telecoms: hotSale })
      .eq("id", productId);
    if (hotErr && !/column|does not exist|schema cache/i.test(hotErr.message || "")) {
      console.warn("[medusaProductSync] hot_sale_telecoms:", hotErr.message);
    }
  }

  const hasVarMedusaCol = !(
    await supabase.from("product_variations").select("medusa_variant_id").limit(1)
  ).error;

  const skus = formatted.variants.map((v) => v.sku).filter(Boolean);
  const existingBySku = {};
  if (skus.length) {
    const { data: existing } = await supabase
      .from("product_variations")
      .select("sku, b2b_price")
      .in("sku", skus);
    for (const row of existing || []) {
      existingBySku[row.sku] = Number(row.b2b_price) || 0;
    }
  }

  const rows = formatted.variants.map((v) => {
    const liveOrMeta = Number(v.api_b2b_price);
    const reliable =
      liveOrMeta > 0 &&
      v.b2bPriceSource &&
      v.b2bPriceSource !== "unavailable";
    // 抓不到可靠成本時：保留舊快照，絕不用零售價覆寫
    const b2b_price = reliable
      ? Math.round(liveOrMeta)
      : existingBySku[v.sku] > 0
        ? existingBySku[v.sku]
        : 0;

    const row = {
      product_id: productId,
      sku: v.sku,
      b2b_price,
      attributes: v.attributes,
    };
    if (hasVarMedusaCol) {
      row.medusa_variant_id = v.medusa_variant_id;
      row.title = v.title;
    }
    return row;
  });

  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await supabase
      .from("product_variations")
      .upsert(chunk, { onConflict: "sku" });
    if (error) throw error;
  }

  const medusaSkus = new Set(rows.map((r) => r.sku));
  const { data: oldVars } = await supabase
    .from("product_variations")
    .select("id, sku")
    .eq("product_id", productId);

  const staleIds = (oldVars || [])
    .filter((v) => !medusaSkus.has(v.sku))
    .map((v) => v.id);

  if (staleIds.length) {
    await supabase.from("product_variations").delete().in("id", staleIds);
  }

  return { productId, medusaProductId, formatted };
}

/**
 * 已同步且有方案的商品：直接回傳 product_id，略過再打 Medusa（批次上架加速）。
 * @returns {Map<string, string>} medusaProductId → supabase product id
 */
export async function resolveSyncedProductIds(medusaProductIds = []) {
  const ids = [
    ...new Set(
      (medusaProductIds || [])
        .map((id) => (id != null ? String(id).trim() : ""))
        .filter(Boolean),
    ),
  ];
  const map = new Map();
  if (!ids.length) return map;

  const supabase = getAdmin();
  const chunk = 80;
  const localRows = [];

  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { data, error } = await supabase
      .from("products")
      .select("id, medusa_product_id")
      .in("medusa_product_id", slice);
    if (error) {
      if (/column|does not exist|schema cache/i.test(error.message || "")) {
        return map;
      }
      throw error;
    }
    localRows.push(...(data || []));
  }

  if (!localRows.length) return map;

  const productIds = localRows.map((r) => r.id);
  const withPlans = new Set();
  for (let i = 0; i < productIds.length; i += chunk) {
    const slice = productIds.slice(i, i + chunk);
    const { data: vars } = await supabase
      .from("product_variations")
      .select("product_id")
      .in("product_id", slice);
    for (const v of vars || []) {
      if (v.product_id) withPlans.add(v.product_id);
    }
  }

  for (const row of localRows) {
    if (!row.medusa_product_id || !withPlans.has(row.id)) continue;
    map.set(String(row.medusa_product_id), row.id);
  }
  return map;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) || 0 },
    async () => {
      while (next < items.length) {
        const i = next;
        next += 1;
        results[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/**
 * 批次確保 Medusa 商品已在 Supabase（已同步有方案者跳過 Medusa）。
 */
export async function ensureMedusaProductsInSupabase(
  medusaProductIds = [],
  { syncConcurrency = 4 } = {},
) {
  const ids = [
    ...new Set(
      (medusaProductIds || [])
        .map((id) => (id != null ? String(id).trim() : ""))
        .filter(Boolean),
    ),
  ];
  const resolved = await resolveSyncedProductIds(ids);
  const missing = ids.filter((id) => !resolved.has(id));

  if (missing.length) {
    const synced = await mapPool(missing, syncConcurrency, async (id) => {
      const { productId } = await upsertMedusaProductToSupabase(id);
      return [id, productId];
    });
    for (const pair of synced) {
      if (pair?.[0] && pair?.[1]) resolved.set(String(pair[0]), pair[1]);
    }
  }

  return resolved;
}
