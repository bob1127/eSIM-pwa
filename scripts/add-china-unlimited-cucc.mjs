/**
 * 中國吃到飽（china-unlimited-esim）：
 *   1) 標題改為免 VPN／LINE・IG・FB 訴求
 *   2) 新增電信變體 CUCC+（China(T+C)-unlimited-*）利潤 60%
 *   3) 寫入產品特色／實際體驗
 *
 * 正確性：CUCC+ 出網新加坡 IP → 一般可免 VPN 用 LINE／IG／FB
 * （實際依路由；非保證）。速度為每日 1GB 高速後約 10Mbps 吃到飽。
 *
 *   HKD_TO_TWD=4.5 node scripts/add-china-unlimited-cucc.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { Agent, setGlobalDispatcher } from "undici";
import {
  chinaUnlimitedKeyFeaturesByCarrier,
  CN_UNLIMITED_CUCC,
  CN_UNLIMITED_CMCC,
} from "../content/product-detailed/china-unlimited-key-features.js";

setGlobalDispatcher(
  new Agent({
    headersTimeout: 10 * 60 * 1000,
    bodyTimeout: 10 * 60 * 1000,
    connectTimeout: 60 * 1000,
  }),
);

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

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const HANDLE = "china-unlimited-esim";
const TITLE =
  "中國 吃到飽 不限流量eSIM ｜ 免vpn 翻牆 可用line ig fb";
const TELECOM = CN_UNLIMITED_CUCC;
const DATA_AMOUNT = "吃到飽";
const LINE = "漫遊線路";
const PROFIT = 60;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 40;
const CHINA_CATEGORY_ID = "pcat_01KZJNBVVHY3ZHNJ4MPS9ZZVFG";
const VPN_NOTICE =
  "新加坡 IP：一般可免 VPN 使用 LINE／IG／FB（實際依當下路由；非保證每位用戶／每個時段）";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

function loadCuccPlans() {
  const cache = ["/tmp/esim-full-plans.json", "/tmp/esim-list.json"].find((p) =>
    fs.existsSync(p),
  );
  if (!cache) throw new Error("找不到 /tmp/esim-full-plans.json");
  const data = JSON.parse(fs.readFileSync(cache, "utf8"));
  const plans = (data.result || []).filter((p) =>
    /^China\(T\+C\)-unlimited-\d+-A0$/i.test(p.name || ""),
  );
  return plans
    .map((p) => {
      const day = Number(p.day);
      const price_hkd = Number(p.price);
      const cost_twd = Math.ceil(price_hkd * HKD_TO_TWD);
      return {
        sku: p.name,
        plan_id: p.channel_dataplan_id || p.id,
        day,
        daysLabel: `${day}天`,
        price_hkd,
        cost_twd,
        retail_twd: retailFromCost(cost_twd),
        apn: p.apn || "e-ideas",
        networks: p.networks || "CN:CUCC[4G;LTE;5G]|",
        rule_desc: p.rule_desc || "unlimited 10mbps",
        speed_desc: p.speed_desc || "",
        special_desc: p.special_desc || "",
        ip: p.ip || "SG",
      };
    })
    .sort((a, b) => a.day - b.day);
}

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`登入失敗: ${data.message || res.status}`);
  }
  return data.token;
}

async function admin(token, apiPath, options = {}) {
  const res = await fetch(`${MEDUSA_URL}${apiPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${apiPath}] 非 JSON: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(
      `[${apiPath}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 500)}`,
    );
  }
  return data;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toVariant(row) {
  const speedRule =
    "每日 1GB 高速，用完後約 10Mbps 吃到飽（無限流量）";
  return {
    title: `${TELECOM} · ${row.daysLabel} · ${DATA_AMOUNT}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: TELECOM,
      數據量: DATA_AMOUNT,
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: TELECOM,
      data: DATA_AMOUNT,
      data_amount: DATA_AMOUNT,
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
      vpn_free: true,
      vpn_free_note: VPN_NOTICE,
      attributes: {
        days: row.day,
        data: DATA_AMOUNT,
        data_amount: DATA_AMOUNT,
        telecom: TELECOM,
        line: LINE,
        network: "CUCC 4G/5G",
        ip_type: "新加坡 IP",
        route_type: LINE,
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        line_app: true,
        instagram: true,
        facebook: true,
        vpn_free: true,
        speed_rule: speedRule,
        network_speed: "5G 漫遊｜約 10Mbps 吃到飽",
        fup: speedRule,
        apps: "免VPN：LINE／IG／FB；ChatGPT、TikTok、Gemini、熱點",
      },
    },
  };
}

function ulidLike() {
  const t = Date.now().toString(32).toUpperCase();
  const r = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `optval_${t}${r}`.slice(0, 30);
}

async function ensureOptionValue(c, productId, optionTitle, value) {
  const opt = await c.query(
    `SELECT id FROM product_option
     WHERE product_id = $1 AND title = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [productId, optionTitle],
  );
  const optionId = opt.rows[0]?.id;
  if (!optionId) throw new Error(`找不到選項「${optionTitle}」`);

  const exists = await c.query(
    `SELECT id FROM product_option_value
     WHERE option_id = $1 AND value = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [optionId, value],
  );
  if (exists.rows[0]) return exists.rows[0].id;

  const id = ulidLike();
  await c.query(
    `INSERT INTO product_option_value (id, value, option_id, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())`,
    [id, value, optionId],
  );
  console.log(`   + option value ${optionTitle}=${value}`);
  return id;
}

async function patchProductMeta(c, productId, rows) {
  const features = chinaUnlimitedKeyFeaturesByCarrier();
  const kf = {};
  for (const [k, entry] of Object.entries(features)) {
    kf[k] = {
      bullets: entry.bullets || [],
      actual_experience: entry.actual_experience || "",
    };
  }

  const r = await c.query(`SELECT metadata FROM product WHERE id = $1`, [
    productId,
  ]);
  const meta = { ...(r.rows[0]?.metadata || {}) };

  meta.hot_sale_telecoms = Array.from(
    new Set([TELECOM, ...(meta.hot_sale_telecoms || [])]),
  );
  meta.carrier_profit_by_carrier = {
    ...(meta.carrier_profit_by_carrier || {}),
    [TELECOM]: PROFIT,
  };
  meta.vpn_free = true;
  meta.vpn_free_note = VPN_NOTICE;
  meta.seo_title = `${TITLE}｜Jeko eSIM`;
  meta.seo_description =
    "中國吃到飽不限流量 eSIM：CUCC+ 聯通／新加坡 IP，一般可免 VPN 使用 LINE、IG、FB；每日 1GB 高速後約 10Mbps 吃到飽。另有 CMCC+ 可選。";
  meta.seo_keywords =
    "中國eSIM,吃到飽eSIM,不限流量,免VPN,翻牆,LINE,IG,FB,CUCC,中國聯通,ChatGPT,TikTok,Jeko eSIM";
  meta.subtitle_by_carrier = {
    ...(meta.subtitle_by_carrier || {}),
    [TELECOM]: "聯通 CUCC+｜新加坡IP｜免VPN LINE／IG／FB｜約10Mbps吃到飽",
    [CN_UNLIMITED_CMCC]:
      meta.subtitle_by_carrier?.[CN_UNLIMITED_CMCC] ||
      "移動 CMCC+｜新加坡IP｜無限流量",
  };
  meta.carrier_specs_by_carrier = {
    ...(meta.carrier_specs_by_carrier || {}),
    [TELECOM]: {
      ip_type: "新加坡 IP",
      route_type: "漫遊線路",
      network: "CUCC+ / 5G 漫遊",
      speed_rule: "每日 1GB 高速，用完後約 10Mbps 吃到飽",
      apn: "e-ideas",
      apps: "熱點分享、ChatGPT、TikTok、Gemini",
    },
  };
  // 既有 CMCC+ 若 apps 是物件，一併改成可顯示字串
  if (meta.carrier_specs_by_carrier?.[CN_UNLIMITED_CMCC]) {
    const cmcc = meta.carrier_specs_by_carrier[CN_UNLIMITED_CMCC];
    meta.carrier_specs_by_carrier[CN_UNLIMITED_CMCC] = {
      ...cmcc,
      apps:
        typeof cmcc.apps === "string" && cmcc.apps && cmcc.apps !== "[object Object]"
          ? cmcc.apps
          : "熱點分享、ChatGPT、TikTok、Gemini",
    };
  }
  meta.overview_notices_by_carrier = {
    ...(meta.overview_notices_by_carrier || {}),
    [TELECOM]: {
      fup_notice:
        "新加坡IP漫遊｜每日1GB高速，用完後維持約10Mbps吃到飽。一般可免VPN使用LINE／IG／FB（實際依路由；非保證）。",
      activation_notice: "建議抵達中國大陸後再啟用 eSIM；APN 多為自動設定（e-ideas）",
    },
  };
  meta.key_features_by_carrier = kf;

  await c.query(
    `UPDATE product
     SET title = $2,
         subtitle = $3,
         description = $4,
         metadata = $5::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [
      productId,
      TITLE,
      "CUCC+ 聯通｜新加坡 IP｜免 VPN 用 LINE／IG／FB｜每日1GB後約10Mbps吃到飽；另有 CMCC+",
      "中國吃到飽不限流量 eSIM。CUCC+（中國聯通／新加坡 IP）：一般可免 VPN 使用 LINE、Instagram、Facebook；每日 1GB 高速後約 10Mbps 無限流量，支援 ChatGPT／TikTok／Gemini 與熱點。另可選 CMCC+。實際社群可用性依當下路由而定。",
      JSON.stringify(meta),
    ],
  );

  // 另存方案快取，方便之後 rebuild
  const outFile = path.join(__dirname, "data", "china-unlimited-cucc-plans.json");
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hkd_to_twd: HKD_TO_TWD,
        profit_percent: PROFIT,
        telecom: TELECOM,
        note: "China(T+C)-unlimited-*-A0｜CUCC｜SG IP｜daily 1GB + 10Mbps",
        plans: rows,
      },
      null,
      2,
    ),
  );
  console.log("   wrote", outFile);
}

async function main() {
  const rows = loadCuccPlans();
  if (!rows.length) throw new Error("找不到 China(T+C)-unlimited 方案");

  console.log(`💱 HKD→TWD ${HKD_TO_TWD}｜利潤 ${PROFIT}%｜方案 ${rows.length}`);
  for (const s of [rows[0], rows[1], rows.find((r) => r.day === 5)].filter(Boolean)) {
    console.log(
      `   ${s.day}天 HKD ${s.price_hkd} → cost NT$${s.cost_twd} → 售價 NT$${s.retail_twd} (${s.sku})`,
    );
  }

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);
  console.log("♻️", product.id, product.title);

  // 刪除既有 CUCC+／同 SKU 變體（可重跑）
  const existingSkus = new Set(rows.map((r) => r.sku));
  const toDelete = (product.variants || [])
    .filter(
      (v) =>
        existingSkus.has(v.sku) ||
        String(v.title || "").startsWith(`${TELECOM} ·`) ||
        String(v.metadata?.carrier || "") === TELECOM,
    )
    .map((v) => v.id);
  if (toDelete.length) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ delete: toDelete }),
    });
    console.log(`🗑️ 刪舊 CUCC 變體 ${toDelete.length}`);
  }

  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // 確保天數／電信選項值存在
  const dayValues = [...new Set(rows.map((r) => r.daysLabel))];
  for (const d of dayValues) {
    await ensureOptionValue(c, product.id, "使用天數", d);
  }
  await ensureOptionValue(c, product.id, "電信商", TELECOM);
  await ensureOptionValue(c, product.id, "數據量", DATA_AMOUNT);
  await ensureOptionValue(c, product.id, "線路", LINE);

  await patchProductMeta(c, product.id, rows);

  // 確保掛在中國分類（不要混到中港澳）
  await c.query(`DELETE FROM product_category_product WHERE product_id=$1`, [
    product.id,
  ]);
  await c.query(
    `INSERT INTO product_category_product (product_id, product_category_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [product.id, CHINA_CATEGORY_ID],
  );

  await c.end();
  console.log("✅ 標題／metadata／選項值／中國分類已更新");

  const variants = rows.map(toVariant);
  for (const [i, batch] of chunk(variants, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: batch }),
    });
    console.log(`  + batch ${i + 1}: ${batch.length}`);
  }

  const check = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*options,*variants,title`,
  );
  const p2 = check.products?.[0];
  const tele = (p2.options || []).find((o) => o.title === "電信商");
  const cuccCount = (p2.variants || []).filter(
    (v) =>
      String(v.title || "").startsWith(`${TELECOM} ·`) ||
      String(v.sku || "").includes("T+C)-unlimited"),
  ).length;
  console.log("\n完成");
  console.log(" title:", p2.title);
  console.log(
    " telecoms:",
    (tele?.values || []).map((v) => v.value).join(" | "),
  );
  console.log(" CUCC+ variants:", cuccCount);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
