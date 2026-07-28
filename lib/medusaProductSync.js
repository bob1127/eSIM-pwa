import { createClient } from "@supabase/supabase-js";
import { fetchMedusaProductById } from "./medusaStoreApi";

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

  let productId = null;

  const { data: byMedusaCol, error: medusaColErr } = await supabase
    .from("products")
    .select("id")
    .eq("medusa_product_id", medusaProductId)
    .maybeSingle();

  if (!medusaColErr && byMedusaCol?.id) {
    productId = byMedusaCol.id;
  } else if (formatted.handle) {
    const { data: byHandle, error: handleErr } = await supabase
      .from("products")
      .select("id")
      .eq("handle", formatted.handle)
      .maybeSingle();
    if (!handleErr && byHandle?.id) productId = byHandle.id;
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

  const hasVarMedusaCol = !(
    await supabase.from("product_variations").select("medusa_variant_id").limit(1)
  ).error;

  const rows = formatted.variants.map((v) => {
    const row = {
      product_id: productId,
      sku: v.sku,
      // DB 存 API 原始底價；夥伴可見價在讀取時 × PARTNER_B2B_COST_RATE
      b2b_price: v.api_b2b_price ?? v.b2b_price,
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
