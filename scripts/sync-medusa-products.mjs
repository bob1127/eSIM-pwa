#!/usr/bin/env node
/**
 * 將 Medusa 商品池同步至 Supabase products + product_variations
 *
 * 用法：
 *   node scripts/sync-medusa-products.mjs
 *   node scripts/sync-medusa-products.mjs --handle japan-unlimited-esim
 *   node scripts/sync-medusa-products.mjs --dry-run
 *   node scripts/sync-medusa-products.mjs --backend https://esim-backend-eight.vercel.app
 *
 * 環境變數（.env.local）：
 *   NEXT_PUBLIC_MEDUSA_BACKEND_URL      預設 Medusa 來源
 *   MEDUSA_SYNC_BACKEND_URL             同步腳本專用覆寫（本機 9000 沒開時用正式站）
 *   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(__dirname, "../.env.local"));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const handleIdx = args.indexOf("--handle");
const backendIdx = args.indexOf("--backend");
const PRODUCT_HANDLE =
  handleIdx >= 0 ? args[handleIdx + 1] : "japan-unlimited-esim";

const MEDUSA_URL = (
  (backendIdx >= 0 ? args[backendIdx + 1] : null) ||
  process.env.MEDUSA_SYNC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PUBLISHABLE_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("缺少 Medusa / Supabase 環境變數");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function resolveMedusaImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  let backendOrigin;
  try {
    backendOrigin = new URL(MEDUSA_URL).origin;
  } catch {
    backendOrigin = "http://localhost:9000";
  }
  if (trimmed.startsWith("/static/")) return `${backendOrigin}${trimmed}`;
  return trimmed
    .replace(/^https?:\/\/localhost:9000/i, backendOrigin)
    .replace(/^https?:\/\/127\.0\.0\.1:9000/i, backendOrigin);
}

function parseVariantPrice(variant) {
  if (
    variant.calculated_price &&
    typeof variant.calculated_price.calculated_amount === "number"
  ) {
    return variant.calculated_price.calculated_amount;
  }
  if (typeof variant.calculated_price === "number") {
    return variant.calculated_price;
  }
  const twd = variant.prices?.find(
    (p) => p.currency_code?.toLowerCase() === "twd",
  );
  if (twd?.amount != null) return Number(twd.amount);
  if (variant.prices?.[0]?.amount != null) {
    return Number(variant.prices[0].amount);
  }
  return 0;
}

function parseVariantAttributes(variant) {
  let attrs = {};
  if (variant.metadata?.attributes) {
    try {
      attrs =
        typeof variant.metadata.attributes === "string"
          ? JSON.parse(variant.metadata.attributes)
          : variant.metadata.attributes;
    } catch {
      /* ignore */
    }
  }
  attrs = { ...variant.metadata, ...attrs };

  variant.options?.forEach((opt) => {
    const val = String(opt.value || "").trim();
    if (!val) return;
    const title = opt.option?.title || "";

    if (val.includes("天") || val.includes("Days") || title.includes("天數")) {
      attrs.days = parseInt(val, 10) || val.replace(/[^\d]/g, "");
    } else if (
      val.includes("流量") ||
      val.includes("GB") ||
      val.includes("MB") ||
      val.includes("吃到飽") ||
      title.includes("數據")
    ) {
      attrs.data = val;
      attrs.data_amount = val;
    } else {
      attrs.telecom = val;
    }
  });

  attrs.medusa_variant_id = variant.id;
  if (variant.metadata?.plan_id) attrs.plan_id = variant.metadata.plan_id;

  return attrs;
}

function isLocalMedusa(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

async function medusaFetch(path, options = {}) {
  const url = `${MEDUSA_URL}${path}`;
  try {
    return await fetch(url, options);
  } catch (err) {
    const cause = err.cause?.code || err.code || err.message;
    const lines = [
      `無法連線 Medusa：${url}`,
      `原因：${cause}`,
    ];
    if (isLocalMedusa(MEDUSA_URL)) {
      lines.push(
        "",
        "本機 Medusa (localhost:9000) 似乎沒有啟動。可選其一：",
        "  1) 在本機目錄啟動 Medusa 後再跑同步",
        "  2) 用正式站同步：",
        "     npm run sync:medusa-products -- --backend https://esim-backend-eight.vercel.app",
        "  3) 在 .env.local 加：",
        "     MEDUSA_SYNC_BACKEND_URL=https://esim-backend-eight.vercel.app",
      );
    }
    throw new Error(lines.join("\n"));
  }
}

async function fetchMedusaProduct(handle) {
  const headers = { "x-publishable-api-key": PUBLISHABLE_KEY };
  const regionRes = await medusaFetch("/store/regions", { headers });
  if (!regionRes.ok) {
    throw new Error(`Medusa regions ${regionRes.status}`);
  }
  const regionData = await regionRes.json();
  const region =
    regionData.regions?.find((r) => r.currency_code?.toLowerCase() === "twd") ||
    regionData.regions?.[0];

  const query = new URLSearchParams({
    handle,
    fields:
      "+metadata,*variants,*variants.prices,*variants.calculated_price,*variants.options",
  });
  if (region?.id) query.set("region_id", region.id);

  const res = await medusaFetch(`/store/products?${query}`, { headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Medusa products ${res.status}: ${JSON.stringify(data)}`);
  }
  const product = data.products?.[0];
  if (!product) throw new Error(`找不到 handle=${handle}`);
  return product;
}

async function hasColumn(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

async function findOrCreateProduct(medusaProduct) {
  const handle = medusaProduct.handle;
  const medusaId = medusaProduct.id;
  const payload = {
    name: medusaProduct.title,
    description: medusaProduct.description || "",
    image_url: resolveMedusaImageUrl(medusaProduct.thumbnail),
    updated_at: new Date().toISOString(),
  };

  const hasMedusaCol = await hasColumn("products", "medusa_product_id");
  const hasHandleCol = await hasColumn("products", "handle");

  if (hasMedusaCol) payload.medusa_product_id = medusaId;
  if (hasHandleCol) payload.handle = handle;
  if (hasMedusaCol) payload.medusa_synced_at = new Date().toISOString();

  // 1) medusa_product_id
  if (hasMedusaCol) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("medusa_product_id", medusaId)
      .maybeSingle();
    if (data?.id) return { id: data.id, action: "update" };
  }

  // 2) handle
  if (hasHandleCol) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("handle", handle)
      .maybeSingle();
    if (data?.id) return { id: data.id, action: "update" };
  }

  // 3) 既有日本商品（遷移遺留）
  const { data: legacy } = await supabase
    .from("products")
    .select("id, name")
    .or(`name.ilike.%日本%,name.ilike.%japan%`)
    .limit(5);
  if (legacy?.length === 1) {
    return { id: legacy[0].id, action: "update" };
  }

  return { id: null, action: "insert" };
}

async function remapStoreProductPrices(productId, oldVariations, newBySku) {
  const { data: storeProducts } = await supabase
    .from("store_products")
    .select("id, custom_prices")
    .eq("product_id", productId);

  if (!storeProducts?.length) return;

  const idToSku = new Map(oldVariations.map((v) => [String(v.id), v.sku]));

  for (const sp of storeProducts) {
    const cp = sp.custom_prices || {};
    if (!cp || typeof cp !== "object" || !Object.keys(cp).length) continue;

    const remapped = {};
    let changed = false;
    for (const [key, price] of Object.entries(cp)) {
      const sku = idToSku.get(String(key));
      const newVar = sku ? newBySku.get(sku) : null;
      if (newVar) {
        remapped[String(newVar.id)] = price;
        if (String(key) !== String(newVar.id)) changed = true;
      } else {
        remapped[key] = price;
      }
    }

    if (changed && !dryRun) {
      await supabase
        .from("store_products")
        .update({ custom_prices: remapped })
        .eq("id", sp.id);
      console.log(`  ↻ remapped custom_prices for store_product #${sp.id}`);
    }
  }
}

async function main() {
  console.log(`\n🔄 Medusa → Supabase 同步`);
  console.log(`   backend: ${MEDUSA_URL}`);
  console.log(`   handle: ${PRODUCT_HANDLE}`);
  console.log(`   dry-run: ${dryRun}\n`);

  const medusaProduct = await fetchMedusaProduct(PRODUCT_HANDLE);
  const variants = medusaProduct.variants || [];
  console.log(
    `📦 Medusa: ${medusaProduct.title} (${variants.length} variants)`,
  );

  const { id: productId, action } = await findOrCreateProduct(medusaProduct);
  const productPayload = {
    name: medusaProduct.title,
    description: medusaProduct.description || "",
    image_url: resolveMedusaImageUrl(medusaProduct.thumbnail),
    updated_at: new Date().toISOString(),
  };

  const hasMedusaCol = await hasColumn("products", "medusa_product_id");
  const hasHandleCol = await hasColumn("products", "handle");
  if (hasMedusaCol) productPayload.medusa_product_id = medusaProduct.id;
  if (hasHandleCol) productPayload.handle = medusaProduct.handle;
  if (hasMedusaCol) productPayload.medusa_synced_at = new Date().toISOString();

  let finalProductId = productId;

  if (dryRun) {
    console.log(`\n[DRY] product ${action} →`, productPayload);
  } else if (productId) {
    const { error } = await supabase
      .from("products")
      .update(productPayload)
      .eq("id", productId);
    if (error) throw error;
    console.log(`✅ 更新 product #${productId}`);
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();
    if (error) throw error;
    finalProductId = data.id;
    console.log(`✅ 新增 product #${finalProductId}`);
  }

  const { data: oldVariations } = await supabase
    .from("product_variations")
    .select("id, sku")
    .eq("product_id", finalProductId);

  const hasVarMedusaCol = await hasColumn(
    "product_variations",
    "medusa_variant_id",
  );
  const hasTitleCol = await hasColumn("product_variations", "title");

  const rows = variants.map((v) => {
    const row = {
      product_id: finalProductId,
      sku: v.sku,
      b2b_price: parseVariantPrice(v),
      attributes: parseVariantAttributes(v),
    };
    if (hasVarMedusaCol) row.medusa_variant_id = v.id;
    if (hasTitleCol) row.title = v.title;
    return row;
  });

  const medusaSkus = new Set(rows.map((r) => r.sku));
  const stale = (oldVariations || []).filter((v) => !medusaSkus.has(v.sku));

  if (dryRun) {
    console.log(`\n[DRY] upsert ${rows.length} variations`);
    console.log(`[DRY] delete ${stale.length} stale variations`);
    console.log("\nSample rows:");
    rows.slice(0, 3).forEach((r) =>
      console.log(
        `  ${r.sku} NT$${r.b2b_price}`,
        r.attributes.telecom,
        `${r.attributes.days}天`,
      ),
    );
    const prices = rows.map((r) => r.b2b_price).filter((p) => p > 0);
    console.log(
      `\n價格範圍: NT$${Math.min(...prices)} ~ NT$${Math.max(...prices)}`,
    );
    return;
  }

  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("product_variations")
      .upsert(chunk, { onConflict: "sku" });
    if (error) throw error;
  }
  console.log(`✅ upsert ${rows.length} variations`);

  if (stale.length) {
    const staleIds = stale.map((v) => v.id);
    const { error } = await supabase
      .from("product_variations")
      .delete()
      .in("id", staleIds);
    if (error) throw error;
    console.log(`🗑  刪除 ${stale.length} 舊變體`);
  }

  const { data: syncedVars } = await supabase
    .from("product_variations")
    .select("id, sku, b2b_price, attributes")
    .eq("product_id", finalProductId);

  const newBySku = new Map((syncedVars || []).map((v) => [v.sku, v]));
  await remapStoreProductPrices(finalProductId, oldVariations || [], newBySku);

  const prices = (syncedVars || [])
    .map((v) => Number(v.b2b_price))
    .filter((p) => p > 0);

  console.log(`\n🎉 同步完成`);
  console.log(`   product_id: ${finalProductId}`);
  console.log(`   variations: ${syncedVars?.length || 0}`);
  if (prices.length) {
    console.log(
      `   底價範圍: NT$${Math.min(...prices)} ~ NT$${Math.max(...prices)}`,
    );
  }
  console.log(
    `\n💡 若尚未執行 migration，請到 Supabase SQL Editor 執行:\n   supabase/migrations/00002_medusa_sync_columns.sql\n`,
  );
}

main().catch((err) => {
  console.error("\n❌ 同步失敗:\n" + (err.message || err));
  process.exit(1);
});
