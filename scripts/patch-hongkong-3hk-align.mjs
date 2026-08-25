/**
 * 香港總量／每日：電信名 CSL / SmarTone → 3HK，並用目錄 API 覆寫 networks／ip／apn
 *
 *   HKD_TO_TWD=4.5 node scripts/patch-hongkong-3hk-align.mjs
 *   HKD_TO_TWD=4.5 node scripts/patch-hongkong-3hk-align.mjs --dry-run
 *   HKD_TO_TWD=4.5 node scripts/patch-hongkong-3hk-align.mjs --total-only
 *   HKD_TO_TWD=4.5 node scripts/patch-hongkong-3hk-align.mjs --daily-only
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  hongkongDailyKeyFeatures,
  hongkongTotalKeyFeatures,
} from "../content/product-detailed/hongkong-key-features.js";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..", "esim-backend");
const require = createRequire(path.join(backendRoot, "package.json"));
const { Client } = require("pg");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, "..", ".env.local"));
loadEnv(path.join(backendRoot, ".env"));

const dryRun = process.argv.includes("--dry-run");
const totalOnly = process.argv.includes("--total-only");
const dailyOnly = process.argv.includes("--daily-only");

const FROM = "CSL / SmarTone";
const TO = "3HK";
const EXPECT_NET = "HK:3HK[4G;5G]|";
const EXPECT_IP = "MY";
const EXPECT_APN = "e-ideas";

const PRODUCTS = [
  {
    handle: "hongkong-total-esim",
    kind: "total",
    skuPrefix: "Hong Kong(T+C)-Total",
    featuresFn: hongkongTotalKeyFeatures,
    profit: 60,
  },
  {
    handle: "hongkong-daily-esim",
    kind: "daily",
    skuPrefix: "Hong Kong(T+C)-Daily",
    featuresFn: hongkongDailyKeyFeatures,
    profit: 75,
  },
].filter((p) => {
  if (totalOnly) return p.kind === "total";
  if (dailyOnly) return p.kind === "daily";
  return true;
});

function remapMetaObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = { ...obj };
  if (Object.prototype.hasOwnProperty.call(out, FROM)) {
    if (!Object.prototype.hasOwnProperty.call(out, TO)) out[TO] = out[FROM];
    delete out[FROM];
  }
  return out;
}

async function fetchPlans() {
  for (const url of [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ].filter(Boolean)) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.result?.length) {
        console.log(`目錄 API: ${url} · ${data.result.length} 筆`);
        return data.result;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }
  throw new Error("無法取得方案目錄");
}

function indexBySku(raw, prefix) {
  const map = new Map();
  for (const p of raw) {
    const name = String(p.name || p.channel_dataplan_name || "").trim();
    if (!name.startsWith(prefix)) continue;
    map.set(name, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      networks: String(p.networks || ""),
      apn: String(p.apn || "").trim(),
      ip: String(p.ip || "").trim(),
      rule_desc: p.rule_desc || "",
      price_hkd: Number(p.price) || 0,
      day: Number(p.day) || 0,
      data: p.data || "",
    });
  }
  return map;
}

function assertApiShape(apiMap, label) {
  if (!apiMap.size) throw new Error(`API 無 ${label} 方案`);
  const bad = [];
  for (const r of apiMap.values()) {
    if (r.networks !== EXPECT_NET || r.ip !== EXPECT_IP || r.apn !== EXPECT_APN) {
      bad.push(`${r.sku} net=${r.networks} ip=${r.ip} apn=${r.apn}`);
    }
  }
  if (bad.length) {
    console.warn(`⚠️ API 與預期不完全一致（${bad.length}）:`);
    for (const b of bad.slice(0, 5)) console.warn("  ", b);
  } else {
    console.log(
      `✅ API ${label} ${apiMap.size} 筆皆為 networks=${EXPECT_NET} ip=${EXPECT_IP} apn=${EXPECT_APN}`,
    );
  }
}

async function alignProduct(c, productCfg, apiMap) {
  const { handle, featuresFn } = productCfg;
  const prod = await c.query(
    `SELECT id, title, metadata FROM product WHERE handle = $1 AND deleted_at IS NULL`,
    [handle],
  );
  if (!prod.rowCount) throw new Error(`找不到 ${handle}`);
  const productId = prod.rows[0].id;
  console.log(`\n=== ${handle} (${productId}) ===`);

  // 1) rename option value
  const opt = await c.query(
    `UPDATE product_option_value
     SET value = $1, updated_at = NOW()
     WHERE value = $2
       AND deleted_at IS NULL
       AND option_id IN (
         SELECT id FROM product_option
         WHERE product_id = $3 AND title = '電信商' AND deleted_at IS NULL
       )
     RETURNING id`,
    [TO, FROM, productId],
  );
  console.log(`option rename ${FROM} → ${TO}: ${opt.rowCount}`);

  // 2) variant titles
  const titles = await c.query(
    `UPDATE product_variant
     SET title = REPLACE(title, $1, $2), updated_at = NOW()
     WHERE product_id = $3 AND title LIKE $4 AND deleted_at IS NULL
     RETURNING id`,
    [FROM, TO, productId, `%${FROM}%`],
  );
  console.log(`variant titles: ${titles.rowCount}`);

  // 3) per-variant metadata from API
  const variants = await c.query(
    `SELECT id, sku, title, metadata
     FROM product_variant
     WHERE product_id = $1 AND deleted_at IS NULL`,
    [productId],
  );

  let matched = 0;
  let missing = 0;
  let updated = 0;
  for (const v of variants.rows) {
    const sku = String(v.sku || "").trim();
    const api = apiMap.get(sku);
    if (!api) {
      missing += 1;
      console.warn(`  ⚠ variant SKU 不在 API: ${sku}`);
      continue;
    }
    matched += 1;
    const md = { ...(v.metadata || {}) };
    md.carrier = TO;
    md.networks = api.networks;
    md.apn = api.apn;
    md.ip = api.ip;
    md.rule_desc = api.rule_desc || md.rule_desc;
    md.plan_id = api.plan_id || md.plan_id;
    md.supplier_sku = api.sku;
    if (md.attributes && typeof md.attributes === "object") {
      md.attributes = {
        ...md.attributes,
        telecom: TO,
        network: "3HK 4G/5G",
        ip_type: "馬來西亞IP",
        route_type: "漫遊",
        apn: api.apn,
        coverage: "香港",
      };
    }
    if (dryRun) continue;
    await c.query(
      `UPDATE product_variant
       SET metadata = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(md), v.id],
    );
    updated += 1;
  }
  console.log(
    `variants API match ${matched}/${variants.rowCount} · missing ${missing} · updated ${updated}`,
  );

  // 4) product metadata remap
  let meta = prod.rows[0].metadata || {};
  const keys = [
    "carrier_profit_by_carrier",
    "carrier_partner_rate_by_carrier",
    "carrier_referral_discount_by_carrier",
    "subtitle_by_carrier",
    "carrier_specs_by_carrier",
    "overview_notices_by_carrier",
    "key_features_by_carrier",
  ];
  for (const k of keys) {
    if (k in meta) meta[k] = remapMetaObject(meta[k]);
  }
  meta.hot_sale_telecoms = Array.isArray(meta.hot_sale_telecoms)
    ? meta.hot_sale_telecoms.map((t) => (t === FROM ? TO : t))
    : [TO];
  if (!meta.hot_sale_telecoms.includes(TO)) meta.hot_sale_telecoms.push(TO);

  const kf = featuresFn();
  meta.key_features_by_carrier = {
    ...(meta.key_features_by_carrier || {}),
    [TO]: {
      bullets: kf.bullets || [],
      actual_experience: kf.actual_experience || "",
    },
  };
  meta.subtitle_by_carrier = {
    ...(meta.subtitle_by_carrier || {}),
    [TO]:
      productCfg.kind === "total"
        ? "總量型・3HK・馬來西亞 IP・高速用完後約 128kbps"
        : "每日型・3HK・馬來西亞 IP・高速用完後約 128kbps",
  };
  meta.carrier_specs_by_carrier = {
    ...(meta.carrier_specs_by_carrier || {}),
    [TO]: {
      ip_type: "馬來西亞IP",
      route_type: "漫遊",
      network: "3HK 4G/5G",
      speed_rule:
        productCfg.kind === "total"
          ? "總量高速用完後降速至約 128 kbps"
          : "每日高速用完後降速至約 128 kbps",
      apps: "熱點分享,ChatGPT,TikTok,Gemini",
      apn: EXPECT_APN,
      coverage: "香港",
    },
  };
  meta.overview_notices_by_carrier = {
    ...(meta.overview_notices_by_carrier || {}),
    [TO]: {
      fup_notice:
        productCfg.kind === "total"
          ? "依所選方案提供總量高速流量。用完後降速至約 128 kbps。3HK，馬來西亞 IP 漫遊。支援熱點、TikTok 與 ChatGPT。"
          : "依所選方案提供每日高速流量。用完後降速至約 128 kbps（每日重置）。3HK，馬來西亞 IP 漫遊。支援熱點、TikTok 與 ChatGPT。",
      activation_notice: "建議抵達香港後再安裝／啟用 eSIM",
    },
  };
  meta.carrier_profit_by_carrier = {
    ...(meta.carrier_profit_by_carrier || {}),
    [TO]: productCfg.profit,
  };
  delete meta.carrier_profit_by_carrier?.[FROM];

  const newTitle =
    productCfg.kind === "total"
      ? "香港 eSIM 總量型  3HK"
      : "香港 eSIM 每日型  3HK";
  const newSubtitle =
    productCfg.kind === "total"
      ? "3HK・總量流量型・馬來西亞 IP・高速用完後約 128kbps"
      : "3HK・每日流量型・馬來西亞 IP・高速用完後約 128kbps";

  if (!dryRun) {
    await c.query(
      `UPDATE product
       SET title = $1, subtitle = $2, metadata = $3::jsonb, updated_at = NOW()
       WHERE id = $4`,
      [newTitle, newSubtitle, JSON.stringify(meta), productId],
    );
  }
  console.log(`product title → ${newTitle}`);

  // 5) verify against API
  const verify = await c.query(
    `SELECT sku, metadata->>'networks' AS networks, metadata->>'ip' AS ip, metadata->>'apn' AS apn,
            metadata->>'carrier' AS carrier, title
     FROM product_variant
     WHERE product_id = $1 AND deleted_at IS NULL
     ORDER BY sku`,
    [productId],
  );
  let ok = 0;
  let fail = 0;
  for (const row of verify.rows) {
    const api = apiMap.get(row.sku);
    const carrierOk = row.carrier === TO || String(row.title || "").includes(TO);
    const netOk = !api || row.networks === api.networks;
    const ipOk = !api || row.ip === api.ip;
    const apnOk = !api || row.apn === api.apn;
    if (carrierOk && netOk && ipOk && apnOk) ok += 1;
    else {
      fail += 1;
      if (fail <= 5) {
        console.warn(
          `  ✗ ${row.sku} carrier=${row.carrier} net=${row.networks} ip=${row.ip} apn=${row.apn} | API net=${api?.networks} ip=${api?.ip}`,
        );
      }
    }
  }
  console.log(`驗收 vs API: OK ${ok} / FAIL ${fail} / total ${verify.rows.length}`);
  if (fail) throw new Error(`${handle} 驗收失敗 ${fail} 筆`);

  const tel = await c.query(
    `SELECT value FROM product_option_value
     WHERE deleted_at IS NULL AND option_id IN (
       SELECT id FROM product_option WHERE product_id=$1 AND title='電信商' AND deleted_at IS NULL
     )`,
    [productId],
  );
  console.log(`telecom options: ${tel.rows.map((r) => r.value).join(" | ")}`);
}

async function refreshPlansJson(raw) {
  const file = path.join(__dirname, "data", "hongkong-plans.json");
  let dump = {};
  try {
    dump = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    /* optional */
  }
  const mapTotal = indexBySku(raw, "Hong Kong(T+C)-Total");
  const mapDaily = indexBySku(raw, "Hong Kong(T+C)-Daily");
  dump.sb_total = [...mapTotal.values()].map((r) => ({
    ...r,
    data_amount: String(r.data || "").replace(/^Total/i, "") || r.data,
    telecom: TO,
    speed_rule: "總量高速用完後降速至約 128 kbps",
    throttle_kind: "128kbps",
  }));
  dump.sb_daily = [...mapDaily.values()].map((r) => ({
    ...r,
    data_amount: String(r.data || "").replace(/^Daily/i, "") || r.data,
    telecom: TO,
    speed_rule: "每日高速用完後降速至約 128 kbps",
    throttle_kind: "128kbps",
  }));
  dump.fetched_at_3hk_align = new Date().toISOString();
  dump.note = `ct_hk_unlim; sb_total/sb_daily = Hong Kong(T+C) 3HK MY e-ideas（API 對齊 ${dump.fetched_at_3hk_align}）`;
  if (!dryRun) fs.writeFileSync(file, JSON.stringify(dump, null, 2));
  console.log(
    `plans.json sb_total=${dump.sb_total.length} sb_daily=${dump.sb_daily.length}`,
  );
}

async function main() {
  console.log(`dryRun=${dryRun} products=${PRODUCTS.map((p) => p.handle).join(",")}`);
  const raw = await fetchPlans();
  const maps = {
    total: indexBySku(raw, "Hong Kong(T+C)-Total"),
    daily: indexBySku(raw, "Hong Kong(T+C)-Daily"),
  };
  assertApiShape(maps.total, "Total");
  assertApiShape(maps.daily, "Daily");
  await refreshPlansJson(raw);

  if (dryRun) {
    console.log("dry-run 結束（未寫 DB）");
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing");
  const c = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 120000,
  });
  await c.connect();
  try {
    for (const p of PRODUCTS) {
      await alignProduct(c, p, maps[p.kind]);
    }
  } finally {
    await c.end();
  }
  console.log("\nDONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
