/**
 * usa-mainland-daily-usip-esim 雙電信變體同步：
 *   Verizon USA / AT&T USA · *-A0 · 95%（目錄有幾組就幾組，標準 41）
 *   Verizon / T-Mobile · *-A1 · 80%（標準 56）
 *
 *   node scripts/patch-usa-mainland-daily-usip-sync.mjs
 *   node scripts/patch-usa-mainland-daily-usip-sync.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  usaMainlandDailyUsipKeyFeaturesByCarrier,
} from "../content/product-detailed/usa-region-key-features.js";
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
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "usa-mainland-daily-usip-esim";
const LINE = "漫遊線路";
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 20;

const ATT = "Verizon USA / AT&T USA";
const VZT = "Verizon / T-Mobile";
const ATT_PROFIT = 95;
const VZT_PROFIT = 80;

const STANDARD_DAYS = [...Array.from({ length: 10 }, (_, i) => i + 1), 15, 20, 25, 30];
const STANDARD_DATA = ["每日 500MB", "每日 1GB", "每日 2GB", "每日 3GB"];
const DATA_TO_SKU = {
  "每日 500MB": "Daily500MB",
  "每日 1GB": "Daily1GB",
  "每日 2GB": "Daily2GB",
  "每日 3GB": "Daily3GB",
};

function retailFromCost(costTwd, profitPercent) {
  const margin = 1 + profitPercent / 100;
  return Math.ceil((costTwd * margin) / 10) * 10 - 1;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function genId(prefix) {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}_${t}${r}`.slice(0, 36);
}

function buildStandardMatrix() {
  return STANDARD_DAYS.flatMap((day) =>
    STANDARD_DATA.map((data) => ({ day, data, daysLabel: `${day}天` })),
  );
}

async function fetchCatalog() {
  for (const url of [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ].filter(Boolean)) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(120000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.result?.length) {
        console.log(`目錄: ${url} · ${data.result.length} 筆`);
        return data.result;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }
  throw new Error("無法取得方案目錄");
}

function pickPlans(catalog, matrix, suffix, telecom, profitPercent) {
  const byName = new Map(
    catalog.map((p) => [(p.channel_dataplan_name || p.name || "").trim(), p]),
  );
  const rows = [];
  for (const target of matrix) {
    const part = DATA_TO_SKU[target.data];
    if (!part) continue;
    const sku = `United States of America-${part}-${target.day}-${suffix}`;
    const p = byName.get(sku);
    if (!p) continue;
    const price_hkd = Number(p.price) || 0;
    const cost_twd = Math.ceil(price_hkd * HKD_TO_TWD);
    rows.push({
      sku,
      suffix,
      telecom,
      profit_percent: profitPercent,
      plan_id: p.channel_dataplan_id || p.id,
      day: target.day,
      daysLabel: target.daysLabel,
      data: target.data,
      price_hkd,
      cost_twd,
      retail_twd: retailFromCost(cost_twd, profitPercent),
      apn: String(p.apn || "bicsapn").trim(),
      networks: p.networks || "",
      rule_desc: p.rule_desc || "unlimited 128kbps",
      speed_desc: p.speed_desc || p.special_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || "US").trim(),
    });
  }
  return rows;
}

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(`登入失敗: ${data.message || res.status}`);
  }
  return data.token;
}

async function admin(token, apiPath, options = {}, retries = 4) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${MEDUSA_URL}${apiPath}`, {
        ...options,
        signal: AbortSignal.timeout(120000),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`[${apiPath}] 非 JSON: ${text.slice(0, 300)}`);
      }
      if (!res.ok) {
        throw new Error(
          `[${apiPath}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 400)}`,
        );
      }
      return data;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr;
}

function toVariant(row) {
  const profit = row.profit_percent;
  const margin = 1 + profit / 100;
  const network =
    row.telecom === ATT
      ? "Verizon USA / AT&T USA · 4G·5G"
      : "Verizon / T-Mobile · 4G·5G";
  return {
    title: `${row.telecom} · ${row.daysLabel} · ${row.data}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: row.telecom,
      數據量: row.data,
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: row.telecom,
      data: row.data,
      data_amount: row.data,
      days: String(row.day),
      cost_hkd: String(row.price_hkd),
      cost_price: row.cost_twd,
      profit_percent: profit,
      profit_margin: `${profit}%`,
      profit_rate: `${profit}%`,
      margin,
      apn: row.apn,
      networks: row.networks,
      rule_desc: row.rule_desc,
      speed_desc: row.speed_desc,
      special_desc: row.special_desc,
      ip: row.ip,
      hotspot: true,
      attributes: {
        days: row.day,
        data: row.data,
        data_amount: row.data,
        telecom: row.telecom,
        line: LINE,
        network,
        ip_type: "美國 IP",
        route_type: LINE,
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: `${row.data}；超量後降速 128kbps`,
        apps: "ChatGPT、TikTok、Gemini；支援熱點",
      },
    },
  };
}

async function ensureProductOptions(productId, telecoms, dayLabels) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing");
  const c = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60000,
  });
  await c.connect();

  const opts = await c.query(
    `SELECT id, title FROM product_option WHERE product_id = $1 AND deleted_at IS NULL`,
    [productId],
  );
  const byTitle = Object.fromEntries(opts.rows.map((r) => [r.title, r.id]));
  const telOpt = byTitle["電信商"];
  const dayOpt = byTitle["使用天數"];
  if (!telOpt || !dayOpt) {
    await c.end();
    throw new Error("找不到電信商／使用天數 option");
  }

  async function ensureValue(optionId, value) {
    const exist = await c.query(
      `SELECT id FROM product_option_value WHERE option_id = $1 AND value = $2 AND deleted_at IS NULL`,
      [optionId, value],
    );
    if (exist.rowCount) return;
    await c.query(
      `INSERT INTO product_option_value (id, value, option_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [genId("optval"), value, optionId],
    );
    console.log(`PG 新增 option: ${value}`);
  }

  for (const t of telecoms) await ensureValue(telOpt, t);
  for (const d of dayLabels) await ensureValue(dayOpt, d);

  const metaRes = await c.query(`SELECT metadata FROM product WHERE id = $1`, [
    productId,
  ]);
  const md = metaRes.rows[0]?.metadata || {};
  const kfByCarrier = usaMainlandDailyUsipKeyFeaturesByCarrier();
  md.carrier_profit_by_carrier = {
    ...(md.carrier_profit_by_carrier || {}),
    [ATT]: ATT_PROFIT,
    [VZT]: VZT_PROFIT,
  };
  md.hot_sale_telecoms = [...new Set([...(md.hot_sale_telecoms || []), ATT, VZT])];
  md.subtitle_by_carrier = {
    ...(md.subtitle_by_carrier || {}),
    [ATT]: "美國 IP｜Verizon USA / AT&T USA｜每日型｜支援熱點",
    [VZT]: "美國 IP｜Verizon / T-Mobile｜每日型｜支援熱點",
  };
  md.carrier_specs_by_carrier = {
    ...(md.carrier_specs_by_carrier || {}),
    [ATT]: {
      ip_type: "美國 IP",
      route_type: LINE,
      network: "US: Verizon USA｜AT&T USA｜4G·5G",
      speed_rule: "每日額度用完後降速 128kbps",
      apn: "bicsapn",
      apps: "ChatGPT、TikTok、Gemini；支援熱點",
    },
    [VZT]: {
      ip_type: "美國 IP",
      route_type: LINE,
      network: "US: Verizon｜T-Mobile｜4G·5G",
      speed_rule: "每日額度用完後降速 128kbps",
      apn: "bicsapn",
      apps: "ChatGPT、TikTok、Gemini；支援熱點",
    },
  };
  md.key_features_by_carrier = Object.fromEntries(
    Object.entries(kfByCarrier).map(([carrier, entry]) => [
      carrier,
      {
        bullets: entry.bullets || [],
        actual_experience: entry.actual_experience || "",
      },
    ]),
  );
  md.overview_notices_by_carrier = {
    ...(md.overview_notices_by_carrier || {}),
    [ATT]: {
      fup_notice:
        "每日流量額度用完後降速至 128kbps。阿拉斯加、夏威夷使用不保證。",
      activation_notice: "建議抵達美國後再新增／啟用 eSIM。",
    },
    [VZT]: {
      fup_notice:
        "每日流量額度用完後降速至 128kbps。阿拉斯加、夏威夷使用不保證。",
      activation_notice: "建議抵達美國後再新增／啟用 eSIM。",
    },
  };

  await c.query(
    `UPDATE product SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(md), productId],
  );
  await c.end();
}

function auditRows(rows, variants) {
  const bySku = Object.fromEntries((variants || []).map((v) => [v.sku, v]));
  const create = [];
  const update = [];

  for (const row of rows) {
    const v = toVariant(row);
    const cur = bySku[row.sku];
    if (!cur) {
      create.push(v);
      continue;
    }
    const curCarrier = cur.metadata?.carrier;
    const curProfit = Number(cur.metadata?.profit_percent);
    const curPrice = Number(cur.prices?.[0]?.amount);
    if (
      curCarrier !== row.telecom ||
      curProfit !== row.profit_percent ||
      curPrice !== row.retail_twd
    ) {
      update.push({
        id: cur.id,
        title: v.title,
        options: v.options,
        prices: v.prices,
        metadata: v.metadata,
      });
    }
  }

  return { create, update };
}

async function main() {
  console.log(`${HANDLE} 雙電信同步 · ATT ${ATT_PROFIT}% · Vz/Tmo ${VZT_PROFIT}% · dryRun=${dryRun}`);

  const matrix = buildStandardMatrix();
  const catalog = await fetchCatalog();
  const attRows = pickPlans(catalog, matrix, "A0", ATT, ATT_PROFIT);
  const vztRows = pickPlans(catalog, matrix, "A1", VZT, VZT_PROFIT);
  const allRows = [...attRows, ...vztRows];

  fs.writeFileSync(
    path.join(__dirname, "data", "usa-mainland-daily-usip-plans.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hkd_to_twd: HKD_TO_TWD,
        profit_percent: ATT_PROFIT,
        telecom: ATT,
        note: "Verizon USA/AT&T A0 標準每日型（目錄現有組合）",
        plans: attRows,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(__dirname, "data", "usa-mainland-daily-vztmo-plans.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hkd_to_twd: HKD_TO_TWD,
        profit_percent: VZT_PROFIT,
        telecom: VZT,
        note: "Verizon/T-Mobile A1 標準 56 組",
        plans: vztRows,
      },
      null,
      2,
    ),
  );
  console.log(`ATT 目標 ${attRows.length} · Vz/Tmo 目標 ${vztRows.length}`);

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,*variants,*variants.metadata,*variants.prices`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);

  const { create, update } = auditRows(allRows, product.variants);
  console.log(`將新建 ${create.length} · 將修正 ${update.length}`);

  if (dryRun) {
    for (const v of create) console.log(`  + ${v.sku} NT$${v.prices[0].amount}`);
    for (const v of update) console.log(`  ↻ ${v.metadata?.carrier || "?"} ${product.variants?.find(x=>x.id===v.id)?.sku}`);
    return;
  }

  await ensureProductOptions(
    product.id,
    [ATT, VZT],
    [...new Set(allRows.map((r) => r.daysLabel))].sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10),
    ),
  );

  for (const [i, batch] of chunk(create, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: batch }),
    });
    console.log(`  + create batch ${i + 1}: ${batch.length}`);
  }

  for (const [i, batch] of chunk(update, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ update: batch }),
    });
    console.log(`  ↻ update batch ${i + 1}: ${batch.length}`);
  }

  const check = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.metadata,*variants.prices`,
  );
  const p2 = check.products?.[0];
  const count = (carrier) =>
    (p2?.variants || []).filter((v) => v.metadata?.carrier === carrier).length;

  console.log(`\n完成 · 總變體 ${(p2?.variants || []).length}`);
  console.log(`${ATT}: ${count(ATT)} / ${attRows.length} @${ATT_PROFIT}%`);
  console.log(`${VZT}: ${count(VZT)} / ${vztRows.length} @${VZT_PROFIT}%`);

  for (const row of [
    attRows.find((r) => r.sku.includes("Daily3GB-25-A0")),
    vztRows.find((r) => r.sku.includes("Daily3GB-25-A1")),
  ].filter(Boolean)) {
    const v = (p2?.variants || []).find((x) => x.sku === row.sku);
    console.log(
      `核對 ${row.telecom} 25d3GB: ${v ? `NT$${v.prices?.[0]?.amount} profit=${v.metadata?.profit_percent}%` : "MISSING"}`,
    );
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
