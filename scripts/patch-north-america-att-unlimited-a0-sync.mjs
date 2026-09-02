/**
 * 北美 AT&T 美國號碼吃到飽：A1 → A0 同步（目錄現價 + 75% 利潤）
 *
 *   node scripts/patch-north-america-att-unlimited-a0-sync.mjs
 *   node scripts/patch-north-america-att-unlimited-a0-sync.mjs --days=10-30
 *   node scripts/patch-north-america-att-unlimited-a0-sync.mjs --days=10-88
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  northAmericaAttUnlimitedKeyFeaturesByCarrier,
  northAmericaAttUnlimitedOverviewNoticesByCarrier,
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

const HANDLE = "north-america-att-unlimited-esim";
const TELECOM = "AT&T 美國號碼";
const DATA = "吃到飽";
const LINE = "本地線路";
const PROFIT = 75;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 20;
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

function parseDayRange(arg) {
  const m = String(arg || "10-30").match(/^(\d+)-(\d+)$/);
  if (!m) throw new Error(`無效 --days=${arg}，請用 10-30 或 10-88`);
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  const days = [];
  for (let d = lo; d <= hi; d++) days.push(d);
  return days;
}

const dayArg = process.argv.find((a) => a.startsWith("--days="));
const TARGET_DAYS = parseDayRange(dayArg?.split("=")[1]);

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
        console.log(`目錄 ${data.result.length} 筆 ← ${url}`);
        return data.result;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }
  throw new Error("無法取得方案目錄");
}

function pickPlans(catalog) {
  const byName = new Map(
    catalog.map((p) => [(p.channel_dataplan_name || p.name || "").trim(), p]),
  );
  const rows = [];
  const missing = [];
  for (const day of TARGET_DAYS) {
    const sku = `USCAMX-Local-unlimited-${day}-A0`;
    const p = byName.get(sku);
    if (!p) {
      missing.push(sku);
      continue;
    }
    const price_hkd = Number(p.price) || 0;
    const cost_twd = Math.ceil(price_hkd * HKD_TO_TWD);
    rows.push({
      sku,
      plan_id: p.channel_dataplan_id || p.id,
      day,
      daysLabel: `${day}天`,
      price_hkd,
      cost_twd,
      retail_twd: retailFromCost(cost_twd),
      profit_percent: PROFIT,
      apn: String(p.apn || "ENHANCEDPHONE").trim(),
      networks: p.networks || "",
      rule_desc: p.rule_desc || "unlimited",
      speed_desc: p.speed_desc || p.special_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || "US").trim(),
    });
  }
  if (missing.length) {
    console.warn(`⚠️ 目錄缺 ${missing.length} 筆: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " …" : ""}`);
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
  return {
    title: `${TELECOM} · ${row.daysLabel} · ${DATA}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: TELECOM,
      數據量: DATA,
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: TELECOM,
      data: DATA,
      data_amount: DATA,
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
      has_us_number: true,
      voice_sms: true,
      hotspot: "us_only",
      attributes: {
        days: row.day,
        data: DATA,
        data_amount: DATA,
        telecom: TELECOM,
        line: LINE,
        network: "AT&T / Rogers / 4G·5G",
        ip_type: "美國原生 IP",
        route_type: LINE,
        hotspot: "僅限美國境內（不作保證）",
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: "美／墨無限；加拿大 25GB 後 512Kbps",
        apps: "無限通話／簡訊；熱點僅限美國",
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
  });
  await c.connect();
  const mdRes = await c.query(`SELECT metadata FROM product WHERE id = $1`, [
    productId,
  ]);
  const md = mdRes.rows[0]?.metadata || {};
  md.carrier_profit_by_carrier = { ...(md.carrier_profit_by_carrier || {}), [TELECOM]: PROFIT };
  md.key_features_by_carrier = Object.fromEntries(
    Object.entries(northAmericaAttUnlimitedKeyFeaturesByCarrier()).map(
      ([carrier, entry]) => [
        carrier,
        {
          bullets: entry.bullets || [],
          actual_experience: entry.actual_experience || "",
        },
      ],
    ),
  );
  md.overview_notices_by_carrier =
    northAmericaAttUnlimitedOverviewNoticesByCarrier();
  await c.query(
    `UPDATE product SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(md), productId],
  );

  const dayOpt = (
    await c.query(
      `SELECT id FROM product_option WHERE product_id = $1 AND title = '使用天數' AND deleted_at IS NULL`,
      [productId],
    )
  ).rows[0]?.id;
  if (dayOpt) {
    for (const d of dayLabels) {
      const exist = await c.query(
        `SELECT id FROM product_option_value WHERE option_id = $1 AND value = $2 AND deleted_at IS NULL`,
        [dayOpt, d],
      );
      if (!exist.rowCount) {
        await c.query(
          `INSERT INTO product_option_value (id, value, option_id, created_at, updated_at) VALUES ($1,$2,$3,NOW(),NOW())`,
          [genId("optval"), d, dayOpt],
        );
      }
    }
  }
  await c.end();
}

async function main() {
  console.log(
    `${HANDLE} A0 同步 · ${TARGET_DAYS[0]}-${TARGET_DAYS[TARGET_DAYS.length - 1]} 天 · ${PROFIT}%`,
  );
  const catalog = await fetchCatalog();
  const rows = pickPlans(catalog);
  if (!rows.length) throw new Error("無可用 A0 方案");

  fs.writeFileSync(
    path.join(__dirname, "data", "north-america-att-unlimited-plans.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hkd_to_twd: HKD_TO_TWD,
        profit_percent: PROFIT,
        telecom: TELECOM,
        data: DATA,
        note: "USCAMX-Local-unlimited-*-A0｜US IP｜美墨吃到飽＋加拿大25GB｜美加墨無限通話簡訊",
        plans: rows,
      },
      null,
      2,
    ),
  );

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,*variants`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);

  const expectedSkus = new Set(rows.map((r) => r.sku));
  const oldIds = (product.variants || [])
    .filter((v) => !expectedSkus.has(v.sku))
    .map((v) => v.id)
    .filter(Boolean);

  if (oldIds.length) {
    for (const batch of chunk(oldIds, BATCH)) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ delete: batch }),
      });
    }
    console.log(`🗑 刪除舊變體 ${oldIds.length}（含 A1）`);
  }

  const bySku = Object.fromEntries((product.variants || []).map((v) => [v.sku, v]));
  const create = [];
  const update = [];
  for (const row of rows) {
    const v = toVariant(row);
    const cur = bySku[row.sku];
    if (!cur) {
      create.push(v);
      continue;
    }
    const md = cur.metadata || {};
    const curProfit = Number(md.profit_percent);
    const curPrice = Number(cur.prices?.[0]?.amount);
    if (
      String(md.plan_id) !== String(row.plan_id) ||
      Number(md.cost_price) !== row.cost_twd ||
      curProfit !== PROFIT ||
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

  await ensureProductOptions(
    product.id,
    rows.map((r) => r.daysLabel),
  );

  for (const [i, batch] of chunk(create, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: batch }),
    });
    console.log(`  + create ${i + 1}: ${batch.length}`);
  }
  for (const [i, batch] of chunk(update, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ update: batch }),
    });
    console.log(`  ↻ update ${i + 1}: ${batch.length}`);
  }

  const check = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.metadata,*variants.prices`,
  );
  const p2 = check.products?.[0];
  const vs = p2?.variants || [];
  const s10 = vs.find((v) => v.sku === "USCAMX-Local-unlimited-10-A0");
  const s30 = vs.find((v) => v.sku === "USCAMX-Local-unlimited-30-A0");
  console.log(`\n完成 · 變體 ${vs.length} @${PROFIT}%`);
  if (s10) console.log(`10天: NT$${s10.prices?.[0]?.amount} ${s10.sku}`);
  if (s30) console.log(`30天: NT$${s30.prices?.[0]?.amount} ${s30.sku}`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
