/**
 * hongkong-unlimited-esim 補第二電信變體：
 *   CN,HK,MO(T+C)-unlimited-* @ 50%
 *   前台電信名：CUCC / China Telecom + CSL + CTM（不標「中港澳通用」）
 *
 *   HKD_TO_TWD=4.5 node scripts/patch-hongkong-unlimited-tc.mjs
 *   HKD_TO_TWD=4.5 node scripts/patch-hongkong-unlimited-tc.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  HK_UNLIMITED_TC_TELECOM,
  hongkongUnlimitedTcKeyFeatures,
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
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const HANDLE = "hongkong-unlimited-esim";
const TELECOM = HK_UNLIMITED_TC_TELECOM;
const DATA = "無限流量 10Mbps";
const PROFIT = Number(process.env.HK_TC_UNLIMITED_PROFIT || 50);
const PARTNER = Number(process.env.HK_TC_UNLIMITED_PARTNER || 25);
const REFERRAL = Number(process.env.HK_TC_UNLIMITED_REFERRAL || 5);
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 8;
const FUP = "公平使用政策 (FUP)：約 10 Mbps 無限流量；實際速度依位置與網路環境而定。";

function retail(costTwd, profitPercent = PROFIT) {
  return Math.ceil((costTwd * (1 + profitPercent / 100)) / 10) * 10 - 1;
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
        console.log(`目錄: ${url} · ${data.result.length} 筆`);
        return data.result;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }
  throw new Error("無法取得方案目錄");
}

function pickTcUnlimited(raw) {
  const map = new Map();
  for (const p of raw) {
    const name = String(p.name || p.channel_dataplan_name || "").trim();
    if (!/^CN,\s*HK,\s*MO\(T\+C\)-unlimited-\d+-[AB]\d$/i.test(name)) continue;
    const day = Number(p.day) || 0;
    if (!day) continue;
    const hkd = Number(p.price) || 0;
    const prev = map.get(day);
    if (!prev || hkd < prev.price_hkd) {
      map.set(day, {
        sku: name,
        plan_id: p.channel_dataplan_id || p.id,
        day,
        price_hkd: hkd,
        apn: String(p.apn || "e-ideas").trim(),
        networks: p.networks || "",
        rule_desc: p.rule_desc || "unlimited 10mbps",
        ip: String(p.ip || "SG").trim(),
      });
    }
  }
  return [...map.values()].sort((a, b) => a.day - b.day);
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

function toVariant(r) {
  const cost = Math.ceil(r.price_hkd * HKD_TO_TWD);
  const daysLabel = `${r.day}天`;
  return {
    title: `${TELECOM} · ${daysLabel} · ${DATA}`,
    sku: `${r.sku}-HKUNLIM`,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: daysLabel,
      電信商: TELECOM,
      數據量: DATA,
    },
    prices: [{ currency_code: "twd", amount: retail(cost) }],
    metadata: {
      plan_id: r.plan_id,
      type: "esim",
      carrier: TELECOM,
      plan_kind: "unlimited",
      data: DATA,
      data_amount: DATA,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: cost,
      profit_percent: PROFIT,
      profit_rate: `${PROFIT}%`,
      margin: 1 + PROFIT / 100,
      supplier_sku: r.sku,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      throttle_kind: "10mbps",
      ip: r.ip,
      attributes: {
        days: r.day,
        data: DATA,
        data_amount: DATA,
        telecom: TELECOM,
        network: "CUCC / China Telecom + CSL + CTM 4G/5G",
        ip_type: "新加坡IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: FUP,
        coverage: "香港",
        apps: "熱點分享,TikTok,Gemini,ChatGPT",
        apn: r.apn,
      },
    },
  };
}

async function ensureOptionValues(productId, dayLabels) {
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
  const dayOpt = byTitle["使用天數"];
  const telOpt = byTitle["電信商"];
  if (!dayOpt || !telOpt) {
    await c.end();
    throw new Error("找不到使用天數／電信商 option");
  }

  async function ensureValue(optionId, value) {
    const exist = await c.query(
      `SELECT id FROM product_option_value
       WHERE option_id = $1 AND value = $2 AND deleted_at IS NULL`,
      [optionId, value],
    );
    if (exist.rowCount) return exist.rows[0].id;
    const id = genId("optval");
    await c.query(
      `INSERT INTO product_option_value (id, value, option_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [id, value, optionId],
    );
    return id;
  }

  await ensureValue(telOpt, TELECOM);
  for (const d of dayLabels) await ensureValue(dayOpt, d);
  console.log(`PG option values OK · telecom + ${dayLabels.length} days`);

  // merge metadata (avoid heavy admin product POST)
  const metaRes = await c.query(`SELECT metadata FROM product WHERE id = $1`, [
    productId,
  ]);
  const md = metaRes.rows[0]?.metadata || {};
  const kf = hongkongUnlimitedTcKeyFeatures();
  md.carrier_profit_by_carrier = {
    ...(md.carrier_profit_by_carrier || {}),
    [TELECOM]: PROFIT,
  };
  md.carrier_partner_rate_by_carrier = {
    ...(md.carrier_partner_rate_by_carrier || {}),
    [TELECOM]: PARTNER,
  };
  md.carrier_referral_discount_by_carrier = {
    ...(md.carrier_referral_discount_by_carrier || {}),
    [TELECOM]: REFERRAL,
  };
  const hot = new Set(md.hot_sale_telecoms || []);
  hot.add(TELECOM);
  md.hot_sale_telecoms = [...hot];
  md.subtitle_by_carrier = {
    ...(md.subtitle_by_carrier || {}),
    [TELECOM]:
      "吃到飽・CUCC／China Telecom + CSL + CTM・新加坡 IP・約 10Mbps",
  };
  md.carrier_specs_by_carrier = {
    ...(md.carrier_specs_by_carrier || {}),
    [TELECOM]: {
      ip_type: "新加坡IP",
      route_type: "漫遊",
      network: "CUCC / China Telecom + CSL + CTM 4G/5G",
      speed_rule: FUP,
      apps: "熱點分享,TikTok,Gemini,ChatGPT",
      apn: "e-ideas",
      coverage: "香港",
    },
  };
  md.key_features_by_carrier = {
    ...(md.key_features_by_carrier || {}),
    [TELECOM]: {
      bullets: kf.bullets || [],
      actual_experience: kf.actual_experience || "",
    },
  };
  md.overview_notices_by_carrier = {
    ...(md.overview_notices_by_carrier || {}),
    [TELECOM]: {
      fup_notice:
        "約 10Mbps 吃到飽。CUCC／China Telecom + CSL + CTM，新加坡 IP。支援熱點、TikTok、Gemini。",
      activation_notice: "建議抵達覆蓋範圍後再安裝／啟用 eSIM",
    },
  };

  await c.query(
    `UPDATE product SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(md), productId],
  );
  console.log("PG metadata merged");
  await c.end();
}

async function main() {
  console.log(
    `Medusa: ${MEDUSA_URL} · ${HANDLE} · ${TELECOM} @${PROFIT}% · dryRun=${dryRun}`,
  );
  const raw = await fetchPlans();
  const rows = pickTcUnlimited(raw);
  if (!rows.length) throw new Error("找不到 CN,HK,MO(T+C)-unlimited 方案");

  const outFile = path.join(__dirname, "data", "hongkong-plans.json");
  let dump = {};
  try {
    dump = JSON.parse(fs.readFileSync(outFile, "utf8"));
  } catch {
    /* optional */
  }
  dump.tc_multi_unlim = rows.map((r) => ({
    ...r,
    cost_twd: Math.ceil(r.price_hkd * HKD_TO_TWD),
    retail_twd: retail(Math.ceil(r.price_hkd * HKD_TO_TWD)),
    telecom: TELECOM,
    source_kind: "tc_multi",
  }));
  dump.fetched_at_tc_multi = new Date().toISOString();
  dump.note = `${dump.note || ""} | tc_multi_unlim=CN,HK,MO(T+C)-unlimited @${PROFIT}%`.trim();
  fs.writeFileSync(outFile, JSON.stringify(dump, null, 2));
  console.log(`已更新 ${outFile}`);

  const sample = rows.find((r) => r.day === 1) || rows[0];
  const cost1 = Math.ceil(sample.price_hkd * HKD_TO_TWD);
  console.log(
    `方案 ${rows.length} 天 · 範例 ${sample.day}天 ${sample.sku} HKD ${sample.price_hkd} → cost NT$${cost1} → 售價 NT$${retail(cost1)}`,
  );

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,handle,*variants.sku,*variants.title`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);

  const existingSkus = new Set(
    (product.variants || []).map((v) => String(v.sku || "")),
  );
  // also soft-delete old TC variants first? skip if none
  const variants = rows.map(toVariant);
  const toCreate = variants.filter((v) => !existingSkus.has(v.sku));
  const dayLabels = [...new Set(rows.map((r) => `${r.day}天`))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );

  console.log(`將建 ${toCreate.length} · 已存在 ${variants.length - toCreate.length}`);
  if (dryRun) {
    for (const v of toCreate.slice(0, 5)) {
      console.log(`  + ${v.sku} → NT$${v.prices[0].amount}`);
    }
    return;
  }

  await ensureOptionValues(product.id, dayLabels);

  for (const [i, batch] of chunk(toCreate, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
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
  const telecom = (p2?.options || []).find((o) => o.title === "電信商");
  console.log(
    "telecoms:",
    (telecom?.values || []).map((v) => v.value).join(" | "),
  );
  console.log(
    "variants:",
    (p2?.variants || []).length,
    "· TC:",
    (p2?.variants || []).filter((v) => String(v.sku || "").includes("-HKUNLIM"))
      .length,
  );
  console.log(`前台: /product/hongkong/${HANDLE}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
