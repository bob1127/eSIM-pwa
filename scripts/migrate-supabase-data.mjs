/**
 * 舊 Supabase → 新 Supabase 資料搬移（含 ID 對照）
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEW_PROJECT_URL = "https://fxwwyqkowdmhofctrhjs.supabase.co";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
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

loadEnvFile(resolve(__dirname, "../.env.migrate.local"));
loadEnvFile(resolve(__dirname, "../.env.local"));

const OLD_URL =
  process.env.OLD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const OLD_KEY =
  process.env.OLD_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL || NEW_PROJECT_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_KEY) {
  console.error("缺少 OLD / NEW Supabase credentials");
  process.exit(1);
}
if (OLD_URL === NEW_URL) {
  console.error("OLD 與 NEW URL 相同");
  process.exit(1);
}

const oldDb = createClient(OLD_URL, OLD_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const newDb = createClient(NEW_URL, NEW_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const idMaps = {
  partners: new Map(),
  stores: new Map(),
  products: new Map(),
  product_variations: new Map(),
  store_products: new Map(),
  coupons: new Map(),
  orders: new Map(),
};

function pick(row, keys) {
  const out = {};
  for (const k of keys) if (row[k] !== undefined) out[k] = row[k];
  return out;
}

function remapFk(val, map) {
  if (val == null) return null;
  return map.has(val) ? map.get(val) : val;
}

const BATCH = 200;

async function migrateAuthUsers() {
  console.log("  ·  auth.users…");
  const { data, error } = await oldDb.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`讀取舊 auth.users 失敗: ${error.message}`);

  const users = data?.users || [];
  if (!users.length) {
    console.log("  ·  auth.users：0 筆");
    return 0;
  }

  let ok = 0;
  for (const u of users) {
    const { error: createErr } = await newDb.auth.admin.createUser({
      id: u.id,
      email: u.email,
      email_confirm: true,
      user_metadata: u.user_metadata || {},
      app_metadata: u.app_metadata || {},
    });
    if (createErr) {
      const msg = createErr.message.toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("duplicate") ||
        msg.includes("exists")
      ) {
        ok += 1;
        continue;
      }
      throw new Error(`auth.users ${u.email} 寫入失敗: ${createErr.message}`);
    }
    ok += 1;
  }
  console.log(`  ✓  auth.users：${ok} 筆`);
  return ok;
}

async function clearNewProject() {
  console.log("🧹 清空新專案既有資料…");
  const tables = [
    "blog_review_likes",
    "blog_review_media",
    "blog_reviews",
    "contact_submissions",
    "line_oa_friends",
    "line_traffic_alerts",
    "push_subscriptions",
    "refund_requests",
    "orders",
    "coupons",
    "store_products",
    "product_variations",
    "products",
    "stores",
    "partners",
  ];
  for (const t of tables) {
    const { error } = await newDb.from(t).delete().gte("id", 0);
    if (error && !String(error.message).includes("does not exist")) {
      await newDb.from(t).delete().not("id", "is", null);
    }
  }
  await newDb.from("line_oa_friends").delete().not("line_user_id", "is", null);
}

async function fetchAll(table) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await oldDb
      .from(table)
      .select("*")
      .range(from, from + BATCH - 1);
    if (error) {
      if (
        error.message?.includes("does not exist") ||
        error.message?.includes("schema cache") ||
        error.code === "42P01"
      ) {
        return { skip: true, rows: [] };
      }
      throw new Error(`${table} 讀取失敗: ${error.message}`);
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < BATCH) break;
    from += BATCH;
  }
  return { skip: false, rows };
}

async function migratePartners() {
  const { skip, rows } = await fetchAll("partners");
  if (skip) return console.log("  ⏭  partners（舊專案無此表）"), 0;
  if (!rows.length) return console.log("  ·  partners：0 筆"), 0;

  for (const r of rows) {
    const payload = pick(r, ["slug", "name", "email", "status", "description", "created_at"]);

    const { data: existing } = await newDb
      .from("partners")
      .select("id")
      .eq("email", payload.email)
      .maybeSingle();

    if (existing) {
      idMaps.partners.set(r.id, existing.id);
      continue;
    }

    const { data, error } = await newDb.from("partners").insert(payload).select("id").single();
    if (error) throw new Error(`partners 寫入失敗: ${error.message}`);
    idMaps.partners.set(r.id, data.id);
  }
  console.log(`  ✓  partners：${rows.length} 筆`);
  return rows.length;
}

async function migrateStores() {
  const { skip, rows } = await fetchAll("stores");
  if (skip) return console.log("  ⏭  stores"), 0;
  if (!rows.length) return console.log("  ·  stores：0 筆"), 0;

  for (const r of rows) {
    const payload = {
      domain: r.domain,
      store_name: r.store_name || r.domain || "Store",
      status: r.status || "active",
      markup_rate: r.markup_rate ?? 20,
      user_id: r.user_id ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at || r.created_at,
    };
    const { data, error } = await newDb.from("stores").insert(payload).select("id").single();
    if (error) throw new Error(`stores 寫入失敗: ${error.message}`);
    idMaps.stores.set(r.id, data.id);
  }
  console.log(`  ✓  stores：${rows.length} 筆`);
  return rows.length;
}

async function migrateProducts() {
  const { skip, rows } = await fetchAll("products");
  if (skip) return 0;
  if (!rows.length) return console.log("  ·  products：0 筆"), 0;

  for (const r of rows) {
    const payload = pick(r, ["name", "description", "image_url", "created_at"]);
    const { data, error } = await newDb.from("products").insert(payload).select("id").single();
    if (error) throw new Error(`products 寫入失敗: ${error.message}`);
    idMaps.products.set(r.id, data.id);
  }
  console.log(`  ✓  products：${rows.length} 筆`);
  return rows.length;
}

async function migrateProductVariations() {
  const { skip, rows } = await fetchAll("product_variations");
  if (skip) return 0;
  if (!rows.length) return console.log("  ·  product_variations：0 筆"), 0;

  for (const r of rows) {
    const payload = {
      product_id: remapFk(r.product_id, idMaps.products),
      sku: r.sku,
      b2b_price:
        r.b2b_price != null && Number(r.b2b_price) > 0
          ? r.b2b_price
          : (r.price ?? 0),
      attributes: r.attributes ?? {},
      created_at: r.created_at,
    };
    const { data, error } = await newDb
      .from("product_variations")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(`product_variations 寫入失敗: ${error.message}`);
    idMaps.product_variations.set(r.id, data.id);
  }
  console.log(`  ✓  product_variations：${rows.length} 筆`);
  return rows.length;
}

async function migrateStoreProducts() {
  const { skip, rows } = await fetchAll("store_products");
  if (skip) return 0;
  if (!rows.length) return console.log("  ·  store_products：0 筆"), 0;

  for (const r of rows) {
    const payload = {
      store_id: remapFk(r.store_id, idMaps.stores),
      product_id: remapFk(r.product_id, idMaps.products),
      custom_prices: r.custom_prices ?? {},
      created_at: r.created_at,
    };
    const { data, error } = await newDb
      .from("store_products")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(`store_products 寫入失敗: ${error.message}`);
    idMaps.store_products.set(r.id, data.id);
  }
  console.log(`  ✓  store_products：${rows.length} 筆`);
  return rows.length;
}

async function migrateCoupons() {
  const { skip, rows } = await fetchAll("coupons");
  if (skip) return console.log("  ⏭  coupons（舊專案無此表）"), 0;
  if (!rows.length) return console.log("  ·  coupons：0 筆"), 0;

  for (const r of rows) {
    const payload = { ...r, partner_id: remapFk(r.partner_id, idMaps.partners) };
    delete payload.id;
    const { data, error } = await newDb.from("coupons").insert(payload).select("id").single();
    if (error) throw new Error(`coupons 寫入失敗: ${error.message}`);
    idMaps.coupons.set(r.id, data.id);
  }
  console.log(`  ✓  coupons：${rows.length} 筆`);
  return rows.length;
}

async function migrateOrders() {
  const { skip, rows } = await fetchAll("orders");
  if (skip) return 0;
  if (!rows.length) return console.log("  ·  orders：0 筆"), 0;

  for (const r of rows) {
    const payload = {
      store_id: remapFk(r.store_id, idMaps.stores),
      partner_id: remapFk(r.partner_id, idMaps.partners),
      coupon_id: remapFk(r.coupon_id, idMaps.coupons),
      customer_email: r.customer_email,
      customer_name: r.customer_name,
      total_amount: r.total_amount,
      total_price: r.total_price,
      b2b_cost: r.b2b_cost,
      partner_profit: r.partner_profit,
      status: r.status,
      item_details: r.item_details,
      items: r.items,
      qrcode_data: r.qrcode_data,
      payment_info: r.payment_info,
      esim_activation_status: r.esim_activation_status,
      refunded_at: r.refunded_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
    const { data, error } = await newDb.from("orders").insert(payload).select("id").single();
    if (error) throw new Error(`orders 寫入失敗: ${error.message}`);
    idMaps.orders.set(r.id, data.id);
  }
  console.log(`  ✓  orders：${rows.length} 筆`);
  return rows.length;
}

async function migrateSimple(table, { conflict, mapRow, skipId = false }) {
  const { skip, rows } = await fetchAll(table);
  if (skip) return console.log(`  ⏭  ${table}（舊專案無此表）`), 0;
  if (!rows.length) return console.log(`  ·  ${table}：0 筆`), 0;

  const mapped = rows.map(mapRow);
  for (let i = 0; i < mapped.length; i += BATCH) {
    const chunk = mapped.slice(i, i + BATCH).map((row) => {
      const r = { ...row };
      if (skipId) delete r.id;
      return r;
    });
    let q = conflict
      ? newDb.from(table).upsert(chunk, { onConflict: conflict })
      : newDb.from(table).insert(chunk);
    const { error } = await q;
    if (error) throw new Error(`${table} 寫入失敗: ${error.message}`);
  }
  console.log(`  ✓  ${table}：${rows.length} 筆`);
  return rows.length;
}

async function main() {
  console.log("舊專案:", OLD_URL);
  console.log("新專案:", NEW_URL);

  await clearNewProject();
  console.log("開始搬移…\n");

  let total = 0;
  total += await migrateAuthUsers();
  total += await migratePartners();
  total += await migrateStores();
  total += await migrateProducts();
  total += await migrateProductVariations();
  total += await migrateStoreProducts();
  total += await migrateCoupons();
  total += await migrateOrders();

  total += await migrateSimple("refund_requests", {
    conflict: "id",
    skipId: false,
    mapRow: (r) => ({
      ...r,
      order_id: remapFk(r.order_id, idMaps.orders),
    }),
  });

  total += await migrateSimple("push_subscriptions", {
    conflict: "endpoint",
    skipId: false,
    mapRow: (r) => ({
      ...pick(r, [
        "id",
        "endpoint",
        "p256dh",
        "auth",
        "created_at",
        "iccid",
        "guest_email",
        "topup_id",
        "iccid_bound_at",
        "monitor_enabled",
        "user_id",
        "line_user_id",
      ]),
    }),
  });

  total += await migrateSimple("line_traffic_alerts", {
    conflict: "id",
    mapRow: (r) => r,
  });
  total += await migrateSimple("line_oa_friends", {
    conflict: "line_user_id",
    mapRow: (r) => r,
  });
  total += await migrateSimple("contact_submissions", {
    conflict: "id",
    skipId: true,
    mapRow: (r) => r,
  });

  // blog 評論需 auth.users；user_id 保留，若新專案無對應 user 可能失敗
  try {
    total += await migrateSimple("blog_reviews", {
      conflict: "id",
      mapRow: (r) => r,
    });
    total += await migrateSimple("blog_review_media", {
      conflict: "id",
      mapRow: (r) => r,
    });
    total += await migrateSimple("blog_review_likes", {
      conflict: null,
      mapRow: (r) => r,
    });
  } catch (e) {
    console.warn(`  ⚠  部落格評論略過: ${e.message}`);
  }

  console.log(`\n完成，共 ${total} 筆資料。`);
  if (idMaps.orders.size) {
    console.log("\n訂單 ID 對照（舊→新）:");
    for (const [oldId, newId] of idMaps.orders) {
      console.log(`  #${oldId} → #${newId}`);
    }
  }
}

main().catch((e) => {
  console.error("\n搬移失敗:", e.message);
  process.exit(1);
});
