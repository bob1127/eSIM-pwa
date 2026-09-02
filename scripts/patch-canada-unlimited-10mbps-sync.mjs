/**
 * 加拿大吃到飽：新增 Bell / Telus / Verizon（10Mbps）電信
 * 供應商 SKU：US,CA-unlimited-*-A0/A1（rule_desc = unlimited 10mbps）｜45%
 *
 *   node scripts/patch-canada-unlimited-10mbps-sync.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  CA_TELECOM_UNLIM,
  CA_TELECOM_UNLIM_10M,
  canadaUnlimitedKeyFeaturesByCarrier,
} from "../content/product-detailed/canada-key-features.js";
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

const HANDLE = "canada-unlimited-esim";
const TELECOM = CA_TELECOM_UNLIM_10M;
const DATA = "吃到飽";
const PROFIT = 45;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 20;
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const PLAN_JSON = path.join(
  __dirname,
  "data",
  "canada-unlimited-10mbps-plans.json",
);

/** 與 B0 同天數；依 API 挑 unlimited 10mbps 的 A0/A1 */
const TEN_MBPS_SKU_BY_DAY = {
  1: "US,CA-unlimited-1-A0",
  3: "US,CA-unlimited-3-A1",
  5: "US,CA-unlimited-5-A0",
  7: "US,CA-unlimited-7-A1",
  10: "US,CA-unlimited-10-A0",
  15: "US,CA-unlimited-15-A0",
  20: "US,CA-unlimited-20-A1",
  30: "US,CA-unlimited-30-A0",
};

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
  for (const [dayStr, supplierSku] of Object.entries(TEN_MBPS_SKU_BY_DAY)) {
    const day = Number(dayStr);
    const p = byName.get(supplierSku);
    if (!p) {
      console.warn(`⚠️ 目錄缺 ${supplierSku}`);
      continue;
    }
    const rule = String(p.rule_desc || "").toLowerCase();
    if (!rule.includes("unlimited 10mbps")) {
      console.warn(`⚠️ 略過 ${supplierSku}（rule_desc=${p.rule_desc}，非 10mbps）`);
      continue;
    }
    const price_hkd = Number(p.price) || 0;
    const cost_twd = Math.ceil(price_hkd * HKD_TO_TWD);
    rows.push({
      sku: `${supplierSku}#canada-10m`,
      supplier_sku: supplierSku,
      plan_id: p.channel_dataplan_id || p.id,
      day,
      daysLabel: `${day}天`,
      price_hkd,
      cost_twd,
      retail_twd: retailFromCost(cost_twd),
      profit_percent: PROFIT,
      apn: String(p.apn || "internetipv6").trim(),
      networks: p.networks || "",
      rule_desc: p.rule_desc,
      speed_desc: p.speed_desc || p.special_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || "PL").trim(),
    });
  }
  return rows.sort((a, b) => a.day - b.day);
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
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: TELECOM,
      plan_kind: "unlimited",
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
      throttle_kind: "capped_unlimited",
      max_speed_mbps: 10,
      ip: row.ip,
      is_native: false,
      hotspot: true,
      attributes: {
        days: row.day,
        data: DATA,
        data_amount: DATA,
        telecom: TELECOM,
        line: "漫遊",
        network: "Bell / Telus / Verizon 4G/5G",
        ip_type: "波蘭 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: "吃到飽限速 10Mbps",
        coverage: "加拿大＋美國",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
      },
    },
  };
}

async function ensureProductOptions(productId, telecomLabels) {
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
  md.carrier_profit_by_carrier = {
    ...(md.carrier_profit_by_carrier || {}),
    [TELECOM]: PROFIT,
    [CA_TELECOM_UNLIM]: md.carrier_profit_by_carrier?.[CA_TELECOM_UNLIM] ?? 75,
  };
  md.hot_sale_telecoms = [CA_TELECOM_UNLIM, TELECOM];
  md.key_features_by_carrier = Object.fromEntries(
    Object.entries(canadaUnlimitedKeyFeaturesByCarrier()).map(
      ([carrier, entry]) => [
        carrier,
        {
          bullets: entry.bullets || [],
          actual_experience: entry.actual_experience || "",
        },
      ],
    ),
  );
  md.subtitle_by_carrier = {
    ...(md.subtitle_by_carrier || {}),
    [TELECOM]: "Bell／Telus／Verizon｜10Mbps 吃到飽｜加美雙國｜45%",
  };
  md.carrier_specs_by_carrier = {
    ...(md.carrier_specs_by_carrier || {}),
    [TELECOM]: {
      ip_type: "波蘭 IP",
      route_type: "漫遊",
      network: "Bell／Telus（加）＋ Verizon（美）4G/5G",
      speed_rule: "吃到飽限速 10Mbps",
      apn: "internetipv6",
      apps: "熱點分享,ChatGPT,TikTok,Gemini",
      coverage: "加拿大＋美國（不含墨西哥）",
    },
  };
  await c.query(
    `UPDATE product SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(md), productId],
  );

  const telOpt = (
    await c.query(
      `SELECT id FROM product_option WHERE product_id = $1 AND title = '電信商' AND deleted_at IS NULL`,
      [productId],
    )
  ).rows[0]?.id;
  if (telOpt) {
    for (const t of telecomLabels) {
      const exist = await c.query(
        `SELECT id FROM product_option_value WHERE option_id = $1 AND value = $2 AND deleted_at IS NULL`,
        [telOpt, t],
      );
      if (!exist.rowCount) {
        await c.query(
          `INSERT INTO product_option_value (id, value, option_id, created_at, updated_at) VALUES ($1,$2,$3,NOW(),NOW())`,
          [genId("optval"), t, telOpt],
        );
      }
    }
  }
  await c.end();
}

async function main() {
  console.log(`${HANDLE} + ${TELECOM} · ${PROFIT}%`);
  const catalog = await fetchCatalog();
  const rows = pickPlans(catalog);
  if (!rows.length) throw new Error("無可用 10Mbps 方案");

  fs.writeFileSync(
    PLAN_JSON,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hkd_to_twd: HKD_TO_TWD,
        profit_percent: PROFIT,
        telecom: TELECOM,
        data: DATA,
        note: "US,CA-unlimited-*-A0/A1 unlimited 10mbps",
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

  const telecomLabels = [
    ...new Set([
      CA_TELECOM_UNLIM,
      TELECOM,
      ...(product.variants || []).map(
        (v) => v.metadata?.carrier || v.options?.電信商,
      ),
    ]),
  ].filter(Boolean);

  await ensureProductOptions(product.id, telecomLabels);

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
  const vs = check.products?.[0]?.variants || [];
  const tenM = vs.filter((v) => String(v.sku || "").includes("#canada-10m"));
  const s5 = tenM.find((v) => v.sku?.includes("unlimited-5-"));
  console.log(`\n完成 · 10Mbps 變體 ${tenM.length} @${PROFIT}%`);
  if (s5) {
    console.log(
      `5天: NT$${s5.prices?.[0]?.amount} ${s5.sku} ← ${s5.metadata?.rule_desc}`,
    );
  }
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
