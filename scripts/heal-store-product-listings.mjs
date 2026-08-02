#!/usr/bin/env node
/**
 * 掃描全部 store_products，把「0 方案空殼」改指到同名／同 Medusa 的正確商品。
 *
 *   node scripts/heal-store-product-listings.mjs
 *   node scripts/heal-store-product-listings.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { healStoreProductListings } from "../lib/healStoreProductListings.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[t.slice(0, eq).trim()]) {
      process.env[t.slice(0, eq).trim()] = v;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const selectTries = [
    "id, store_id, product_id, medusa_product_id, custom_prices, status",
    "id, store_id, product_id, medusa_product_id, custom_prices",
    "id, store_id, product_id, custom_prices",
  ];
  let listings = null;
  let lastErr = null;
  for (const cols of selectTries) {
    const { data, error } = await supabase.from("store_products").select(cols);
    if (!error) {
      listings = data || [];
      break;
    }
    lastErr = error;
  }
  if (!listings) throw new Error(lastErr?.message || "讀取 store_products 失敗");

  console.log(`掃描 ${listings.length} 筆上架`);
  if (dryRun) {
    // dry-run：只報告，不寫入 — 暫時複製後用唯讀判斷
    const { planCountById, byName, byMedusa } = await (async () => {
      // 輕量報告
      const { data: products } = await supabase
        .from("products")
        .select("id, name, handle, medusa_product_id");
      const ids = (products || []).map((p) => p.id);
      const planCountById = new Map();
      const { data: vars } = await supabase
        .from("product_variations")
        .select("product_id");
      for (const v of vars || []) {
        planCountById.set(
          v.product_id,
          (planCountById.get(v.product_id) || 0) + 1,
        );
      }
      const byName = new Map();
      const byMedusa = new Map();
      for (const p of products || []) {
        const n = String(p.name || "").trim().toLowerCase();
        const pc = planCountById.get(p.id) || 0;
        if (n && (!byName.has(n) || pc > (planCountById.get(byName.get(n)?.id) || 0))) {
          byName.set(n, p);
        }
        if (p.medusa_product_id) byMedusa.set(p.medusa_product_id, p);
      }
      return { planCountById, byName, byMedusa };
    })();

    let would = 0;
    for (const row of listings || []) {
      const count = planCountById.get(row.product_id) || 0;
      if (count > 0 && row.medusa_product_id) continue;
      const { data: p } = await supabase
        .from("products")
        .select("name, handle, medusa_product_id")
        .eq("id", row.product_id)
        .maybeSingle();
      const twin =
        (row.medusa_product_id && byMedusa.get(row.medusa_product_id)) ||
        byName.get(String(p?.name || "").trim().toLowerCase());
      const twinCount = twin ? planCountById.get(twin.id) || 0 : 0;
      if (twin && twin.id !== row.product_id && twinCount > 0) {
        would += 1;
        console.log(
          `  would heal listing#${row.id} store=${row.store_id}: product ${row.product_id}(${count}plans) → ${twin.id}(${twinCount}plans) ${twin.name}`,
        );
      } else if (count === 0) {
        console.log(
          `  EMPTY no twin listing#${row.id} product=${row.product_id} ${p?.name}`,
        );
      }
    }
    console.log(`dry-run: 約 ${would} 筆可修復`);
    return;
  }

  const result = await healStoreProductListings(supabase, listings || []);
  console.log(
    `完成 healed=${result.healed} removed=${result.removed} remaining=${result.listings.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
