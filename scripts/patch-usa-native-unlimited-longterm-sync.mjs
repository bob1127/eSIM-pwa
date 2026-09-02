/**
 * 美國原生卡｜原生IP 吃到飽 eSIM（長天數、留學、出差）
 * SKU：USCAMX-Local-unlimited-*-A0（31–88 天）｜利潤 60%
 *
 *   node scripts/patch-usa-native-unlimited-longterm-sync.mjs
 *   node scripts/patch-usa-native-unlimited-longterm-sync.mjs --days=31-88
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  usaNativeUnlimitedLongtermKeyFeaturesByCarrier,
  usaNativeUnlimitedLongtermOverviewNoticesByCarrier,
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

const HANDLE = "usa-native-unlimited-longterm-esim";
const TITLE =
  "美國原生卡｜原生IP 吃到飽eSIM（長天數、留學、出差）";
const TELECOM = "AT&T 美國號碼";
const DATA = "吃到飽";
const LINE = "本地線路";
const PROFIT = 60;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 20;
const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");
const THUMB =
  process.env.US_ESIM_PRODUCT_THUMB ||
  `${SITE_ORIGIN}/images/${encodeURIComponent("美國esim.png")}`;
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const PLAN_JSON = path.join(
  __dirname,
  "data",
  "usa-native-unlimited-longterm-plans.json",
);

function parseDayRange(arg) {
  const m = String(arg || "31-88").match(/^(\d+)-(\d+)$/);
  if (!m) throw new Error(`無效 --days=${arg}，請用 31-88`);
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
    console.warn(
      `⚠️ 目錄缺 ${missing.length} 筆: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " …" : ""}`,
    );
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

function productMeta(dayLabels) {
  return {
    type: "esim",
    country: "US",
    region: "US,CA,MX",
    is_native: true,
    plan_kind: "unlimited",
    plan_range: "longterm",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title:
      "美國原生卡 eSIM 吃到飽｜長天數 31–88 天・留學出差・AT&T 美國號碼｜Jeko eSIM",
    seo_description:
      "美國原生 IP 長天數吃到飽 eSIM（31–88 天）：AT&T 美國號碼、美墨無限流量、加拿大 25GB，含無限通話與簡訊。適合留學、長期出差。",
    seo_keywords:
      "美國eSIM,長天數eSIM,留學eSIM,出差eSIM,AT&T,美國號碼,原生IP,吃到飽,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]:
        "長天數 31–88 天｜美國原生 IP｜美墨無限／加拿大25GB｜無限通話簡訊",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "美國原生 IP",
        route_type: LINE,
        network: "US: AT&T｜CA: Rogers｜MX: AT&T｜4G·5G",
        speed_rule:
          "美／墨無限流量；加拿大 25GB 高速後降速至 512Kbps 吃到飽",
        apn: "ENHANCEDPHONE",
        apps: "含無限通話／簡訊；熱點僅限美國境內且不作保證",
      },
    },
    overview_notices_by_carrier:
      usaNativeUnlimitedLongtermOverviewNoticesByCarrier(),
    key_features_by_carrier: usaNativeUnlimitedLongtermKeyFeaturesByCarrier(),
  };
}

async function ensureCategory(token, { handle, name, match }) {
  const { product_categories: cats } = await admin(
    token,
    "/admin/product-categories?limit=100",
  );
  const existing = (cats || []).find(
    (c) => c.handle === handle || match(c),
  );
  if (existing) return existing.id;
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name,
      handle,
      is_active: true,
      is_internal: false,
    }),
  });
  return created.product_category?.id;
}

async function ensureProductCategories(token) {
  const northAmericaId = await ensureCategory(token, {
    handle: "north-america",
    name: "北美",
    match: (c) =>
      c.handle === "north-america" ||
      (/北美/.test(String(c.name || "")) &&
        !/美加(?!墨)/.test(String(c.name || ""))),
  });
  const usaId = await ensureCategory(token, {
    handle: "usa",
    name: "美國",
    match: (c) =>
      c.handle === "usa" ||
      c.handle === "us" ||
      /^美國$/.test(String(c.name || "").trim()),
  });
  return { northAmericaId, usaId };
}

async function ensureProduct(token, rows) {
  const dayLabels = rows.map((r) => r.daysLabel);
  const dayValues = [...new Set(dayLabels)].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const { northAmericaId, usaId } = await ensureProductCategories(token);

  const payloadBase = {
    title: TITLE,
    subtitle:
      "長天數 31–88 天｜AT&T 美國號碼｜美國原生 IP｜美墨無限／加拿大25GB｜留學・長期出差",
    handle: HANDLE,
    description:
      "美國原生 IP 長天數吃到飽 eSIM（31–88 天），附 AT&T 美國號碼。美／墨無限流量；加拿大 25GB 高速後降速至 512Kbps。含三國無限通話與簡訊，適合留學、長期出差。30 天以內行程請改選北美 AT&T 短天數商品。熱點僅限美國境內且不作保證。開通日期以美西時間 (PT) 為準，建議至少提前一天預訂。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta(dayValues),
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: [DATA] },
      { title: "線路", values: [LINE] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: [{ id: northAmericaId }, { id: usaId }],
  };

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,*variants`,
  );
  let product = products?.[0];

  if (!product) {
    console.log("🆕 建立長天數商品…");
    const variants = rows.map(toVariant);
    const first = variants[0];
    const rest = variants.slice(1);
    const created = await admin(token, "/admin/products", {
      method: "POST",
      body: JSON.stringify({ ...payloadBase, variants: [first] }),
    });
    product = created.product;
    console.log("✅ 已建立", product.id, product.handle);
    for (const [i, batch] of chunk(rest, BATCH).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + create batch ${i + 1}: ${batch.length}`);
    }
    return product;
  }

  console.log("♻️ 更新商品資訊", product.id);
  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      title: payloadBase.title,
      subtitle: payloadBase.subtitle,
      description: payloadBase.description,
      status: "published",
      discountable: true,
      thumbnail: payloadBase.thumbnail,
      images: payloadBase.images,
      metadata: payloadBase.metadata,
      options: payloadBase.options,
      sales_channels: payloadBase.sales_channels,
      categories: payloadBase.categories,
    }),
  });
  return product;
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
  md.carrier_profit_by_carrier = {
    ...(md.carrier_profit_by_carrier || {}),
    [TELECOM]: PROFIT,
  };
  md.key_features_by_carrier = Object.fromEntries(
    Object.entries(usaNativeUnlimitedLongtermKeyFeaturesByCarrier()).map(
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
    usaNativeUnlimitedLongtermOverviewNoticesByCarrier();
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

async function syncVariants(token, product, rows) {
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
    console.log(`🗑 刪除多餘變體 ${oldIds.length}`);
  }

  const bySku = Object.fromEntries(
    (product.variants || []).map((v) => [v.sku, v]),
  );
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
}

async function main() {
  console.log(
    `${HANDLE} · ${TARGET_DAYS[0]}-${TARGET_DAYS[TARGET_DAYS.length - 1]} 天 · ${PROFIT}%`,
  );
  const catalog = await fetchCatalog();
  const rows = pickPlans(catalog);
  if (!rows.length) throw new Error("無可用 A0 長天數方案");

  fs.writeFileSync(
    PLAN_JSON,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hkd_to_twd: HKD_TO_TWD,
        profit_percent: PROFIT,
        telecom: TELECOM,
        data: DATA,
        note: "USCAMX-Local-unlimited-*-A0｜31–88 天｜US IP｜長天數留學出差",
        plans: rows,
      },
      null,
      2,
    ),
  );

  const token = await login();
  let product = await ensureProduct(token, rows);

  const refresh = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,*variants`,
  );
  product = refresh.products?.[0] || product;

  await syncVariants(token, product, rows);

  const check = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.metadata,*variants.prices`,
  );
  const p2 = check.products?.[0];
  const vs = p2?.variants || [];
  const s31 = vs.find((v) => v.sku === "USCAMX-Local-unlimited-31-A0");
  const s60 = vs.find((v) => v.sku === "USCAMX-Local-unlimited-60-A0");
  const s88 = vs.find((v) => v.sku === "USCAMX-Local-unlimited-88-A0");
  console.log(`\n完成 · 變體 ${vs.length} @${PROFIT}%`);
  console.log(`前台: /product/usa/${HANDLE}/`);
  if (s31) console.log(`31天: NT$${s31.prices?.[0]?.amount} ${s31.sku}`);
  if (s60) console.log(`60天: NT$${s60.prices?.[0]?.amount} ${s60.sku}`);
  if (s88) console.log(`88天: NT$${s88.prices?.[0]?.amount} ${s88.sku}`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
