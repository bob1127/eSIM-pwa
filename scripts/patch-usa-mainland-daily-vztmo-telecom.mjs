/**
 * usa-mainland-daily-usip-esim 新增第二電信：
 *   Verizon / T-Mobile · Daily500MB/1GB/2GB/3GB · *-A1 · 80%
 *
 *   node scripts/patch-usa-mainland-daily-vztmo-telecom.mjs
 *   node scripts/patch-usa-mainland-daily-vztmo-telecom.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  usaMainlandDailyUsipKeyFeaturesByCarrier,
  usaMainlandDailyVztmoKeyFeatures,
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
const TELECOM = "Verizon / T-Mobile";
const LINE = "漫遊線路";
const PROFIT = 80;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 20;

const DATA_TO_SKU = {
  "每日 500MB": "Daily500MB",
  "每日 1GB": "Daily1GB",
  "每日 2GB": "Daily2GB",
  "每日 3GB": "Daily3GB",
};

/** A1 目錄標準每日型：14 天 × 4 流量（勿只鏡射 ATT A0 稀疏矩陣） */
const STANDARD_DAYS = [...Array.from({ length: 10 }, (_, i) => i + 1), 15, 20, 25, 30];
const STANDARD_DATA = ["每日 500MB", "每日 1GB", "每日 2GB", "每日 3GB"];

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
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

function buildStandardMatrix() {
  return STANDARD_DAYS.flatMap((day) =>
    STANDARD_DATA.map((data) => ({ day, data, daysLabel: `${day}天` })),
  );
}

function pickVztmoDailyPlans(catalog, matrix) {
  const byName = new Map(
    catalog.map((p) => [(p.channel_dataplan_name || p.name || "").trim(), p]),
  );
  const rows = [];
  for (const target of matrix) {
    const part = DATA_TO_SKU[target.data];
    if (!part) continue;
    const sku = `United States of America-${part}-${target.day}-A1`;
    const p = byName.get(sku);
    if (!p) {
      console.warn(`⚠️ 目錄缺 ${sku}`);
      continue;
    }
    const price_hkd = Number(p.price) || 0;
    const cost_twd = Math.ceil(price_hkd * HKD_TO_TWD);
    rows.push({
      sku,
      plan_id: p.channel_dataplan_id || p.id,
      day: target.day,
      daysLabel: `${target.day}天`,
      data: target.data,
      price_hkd,
      cost_twd,
      retail_twd: retailFromCost(cost_twd),
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
      console.warn(`  retry ${attempt}/${retries}: ${e.message}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr;
}

function toVariant(row) {
  return {
    title: `${TELECOM} · ${row.daysLabel} · ${row.data}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: TELECOM,
      數據量: row.data,
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: TELECOM,
      data: row.data,
      data_amount: row.data,
      days: String(row.day),
      cost_hkd: String(row.price_hkd),
      cost_price: row.cost_twd,
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: MARGIN,
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
        telecom: TELECOM,
        line: LINE,
        network: "Verizon / T-Mobile · 4G·5G",
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

async function ensureProductOptions(productId, dayLabels) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing");
  const c = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60000,
  });
  await c.connect();

  const opts = await c.query(
    `SELECT id, title FROM product_option
     WHERE product_id = $1 AND deleted_at IS NULL`,
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
      `SELECT id FROM product_option_value
       WHERE option_id = $1 AND value = $2 AND deleted_at IS NULL`,
      [optionId, value],
    );
    if (exist.rowCount) return;
    await c.query(
      `INSERT INTO product_option_value (id, value, option_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [genId("optval"), value, optionId],
    );
    console.log(`PG 新增 option value: ${value}`);
  }

  await ensureValue(telOpt, TELECOM);
  for (const d of dayLabels) await ensureValue(dayOpt, d);

  const metaRes = await c.query(`SELECT metadata FROM product WHERE id = $1`, [
    productId,
  ]);
  const md = metaRes.rows[0]?.metadata || {};
  const kf = usaMainlandDailyVztmoKeyFeatures();
  md.carrier_profit_by_carrier = {
    ...(md.carrier_profit_by_carrier || {}),
    [TELECOM]: PROFIT,
  };
  const hot = new Set(md.hot_sale_telecoms || []);
  hot.add(TELECOM);
  md.hot_sale_telecoms = [...hot];
  md.subtitle_by_carrier = {
    ...(md.subtitle_by_carrier || {}),
    [TELECOM]: "美國 IP｜Verizon / T-Mobile｜每日型｜支援熱點",
  };
  md.carrier_specs_by_carrier = {
    ...(md.carrier_specs_by_carrier || {}),
    [TELECOM]: {
      ip_type: "美國 IP",
      route_type: LINE,
      network: "US: Verizon｜T-Mobile｜4G·5G",
      speed_rule: "每日額度用完後降速 128kbps",
      apn: "bicsapn",
      apps: "ChatGPT、TikTok、Gemini；支援熱點",
    },
  };
  md.overview_notices_by_carrier = {
    ...(md.overview_notices_by_carrier || {}),
    [TELECOM]: {
      fup_notice:
        "每日流量額度用完後降速至 128kbps。阿拉斯加、夏威夷使用不保證。",
      activation_notice: "建議抵達美國後再新增／啟用 eSIM。",
    },
  };
  md.key_features_by_carrier = Object.fromEntries(
    Object.entries(usaMainlandDailyUsipKeyFeaturesByCarrier()).map(
      ([carrier, entry]) => [
        carrier,
        {
          bullets: entry.bullets || [],
          actual_experience: entry.actual_experience || "",
        },
      ],
    ),
  );
  if (!md.key_features_by_carrier[TELECOM]) {
    md.key_features_by_carrier[TELECOM] = {
      bullets: kf.bullets || [],
      actual_experience: kf.actual_experience || "",
    };
  }

  await c.query(
    `UPDATE product SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(md), productId],
  );
  console.log("PG metadata merged");
  await c.end();
}

async function relabelMislabeledAttA1(token, productId, rows, existingVariants) {
  const bySku = Object.fromEntries(rows.map((r) => [r.sku, r]));
  const ATT = "Verizon USA / AT&T USA";
  const fixes = (existingVariants || []).filter((v) => {
    const sku = String(v.sku || "");
    return sku.endsWith("-A1") && bySku[sku] && v.metadata?.carrier === ATT;
  });
  if (!fixes.length) return 0;

  const updates = fixes.map((v) => {
    const row = bySku[v.sku];
    const variant = toVariant(row);
    return {
      id: v.id,
      title: variant.title,
      options: variant.options,
      prices: variant.prices,
      metadata: variant.metadata,
    };
  });

  if (dryRun) {
    console.log(`dry-run 修正誤標 ATT 的 A1：${updates.length} 筆`);
    return updates.length;
  }

  for (const [i, batch] of chunk(updates, BATCH).entries()) {
    await admin(token, `/admin/products/${productId}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ update: batch }),
    });
    console.log(`  ↻ 修正誤標 batch ${i + 1}: ${batch.length}`);
  }
  return updates.length;
}

async function main() {
  console.log(
    `${HANDLE} · 新增 ${TELECOM} @${PROFIT}% · dryRun=${dryRun}`,
  );

  const matrix = buildStandardMatrix();
  const catalog = await fetchCatalog();
  const rows = pickVztmoDailyPlans(catalog, matrix);
  if (!rows.length) throw new Error("無可用 A1 每日型方案");
  if (rows.length !== matrix.length) {
    const got = new Set(rows.map((r) => `${r.day}|${r.data}`));
    const missing = matrix.filter((m) => !got.has(`${m.day}|${m.data}`));
    throw new Error(
      `目錄缺 ${missing.length} 筆：${missing
        .slice(0, 5)
        .map((m) => `${m.day}天 ${m.data}`)
        .join("、")}${missing.length > 5 ? "…" : ""}`,
    );
  }

  const outFile = path.join(__dirname, "data", "usa-mainland-daily-vztmo-plans.json");
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hkd_to_twd: HKD_TO_TWD,
        profit_percent: PROFIT,
        telecom: TELECOM,
        note: "Verizon/T-Mobile 每日型 A1 · 標準 14 天×4 流量（目錄全系列）",
        plans: rows,
      },
      null,
      2,
    ),
  );
  console.log(`已寫入 ${outFile} · ${rows.length} 筆`);

  const sample = rows.find((r) => r.sku.includes("Daily500MB-1-A1")) || rows[0];
  console.log(
    `範例 ${sample.sku}: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}`,
  );

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,handle,*variants.sku,*variants.metadata`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);

  await ensureProductOptions(
    product.id,
    [...new Set(rows.map((r) => r.daysLabel))].sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10),
    ),
  );

  const relabeled = await relabelMislabeledAttA1(
    token,
    product.id,
    rows,
    product.variants,
  );
  if (relabeled) {
    console.log(`已將 ${relabeled} 筆 A1 從 ATT 改標為 ${TELECOM}`);
  }

  const { products: products2 } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,handle,*variants.sku,*variants.metadata`,
  );
  const product2 = products2?.[0];

  const existingSkus = new Set(
    (product2.variants || []).map((v) => String(v.sku || "")),
  );
  const variants = rows.map(toVariant);
  const toCreate = variants.filter((v) => !existingSkus.has(v.sku));

  console.log(`將建 ${toCreate.length} · 已存在 ${variants.length - toCreate.length}`);
  if (dryRun) {
    for (const v of toCreate.slice(0, 6)) {
      console.log(`  + ${v.sku} → NT$${v.prices[0].amount}`);
    }
    return;
  }

  for (const [i, batch] of chunk(toCreate, BATCH).entries()) {
    await admin(token, `/admin/products/${product2.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: batch }),
    });
    console.log(`  + batch ${i + 1}: ${batch.length}`);
  }

  const check = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants.sku,*options`,
  );
  const p2 = check.products?.[0];
  const telecomOpt = (p2?.options || []).find((o) => o.title === "電信商");
  console.log(
    "telecoms:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
  console.log("variants:", (p2?.variants || []).length);
  const vztCount = (p2?.variants || []).filter(
    (v) => v.metadata?.carrier === TELECOM,
  ).length;
  console.log(`${TELECOM}:`, vztCount, `(預期 ${rows.length})`);
  const vztSet = new Set(
    (p2?.variants || [])
      .filter((v) => v.metadata?.carrier === TELECOM)
      .map((v) => `${v.metadata?.days}|${v.metadata?.data_amount || v.metadata?.data}`),
  );
  for (const day of [25, 4]) {
    for (const data of STANDARD_DATA) {
      const ok = vztSet.has(`${day}|${data}`);
      if (!ok) console.log(`⚠️ 仍缺 ${day}天 ${data}`);
    }
  }
  console.log(`前台: /product/usa/${HANDLE}?telecom=verizon-tmobile`);
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
