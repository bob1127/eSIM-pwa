/**
 * 中國吃到飽（china-unlimited-esim）新增：
 *   CMCC 70Mbps ← China-unlimited-*-B0（約 50–70 Mbps／香港 IP／cmhk）
 *   利潤 70%
 *
 *   HKD_TO_TWD=4.5 node scripts/add-china-unlimited-cmcc-70.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { Agent, setGlobalDispatcher } from "undici";
import {
  chinaUnlimitedKeyFeaturesByCarrier,
  CN_UNLIMITED_CMCC_70,
  CN_UNLIMITED_CUCC,
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
const TELECOM = CN_UNLIMITED_CMCC_70;
const DATA_AMOUNT = "吃到飽";
const LINE = "漫遊線路";
const PROFIT = 70;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 40;
const SPEED_RULE = "限速約 50–70 Mbps 吃到飽";
const APPS_LABEL = "熱點分享、ChatGPT、TikTok";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

function loadPlans() {
  const cache = ["/tmp/esim-full-plans.json", "/tmp/esim-list.json"].find((p) =>
    fs.existsSync(p),
  );
  if (!cache) throw new Error("找不到 /tmp/esim-full-plans.json");
  const data = JSON.parse(fs.readFileSync(cache, "utf8"));
  return (data.result || [])
    .filter((p) => /^China-unlimited-\d+-B0$/i.test(p.name || ""))
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
        apn: p.apn || "cmhk",
        networks: p.networks || "CN:CMCC[4G;LTE;5G]|",
        rule_desc: p.rule_desc || "unlimited",
        speed_desc: p.speed_desc || "",
        special_desc: p.special_desc || "",
        ip: p.ip || "HK",
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
      attributes: {
        days: row.day,
        data: DATA_AMOUNT,
        data_amount: DATA_AMOUNT,
        telecom: TELECOM,
        line: LINE,
        network: "CMCC 4G/5G",
        ip_type: "香港 IP",
        route_type: LINE,
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: false,
        speed_rule: SPEED_RULE,
        network_speed: "約 50–70 Mbps",
        fup: SPEED_RULE,
        apps: APPS_LABEL,
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
  if (exists.rows[0]) {
    // revive if soft-deleted elsewhere same value - already not deleted
    return exists.rows[0].id;
  }

  // revive soft-deleted same value
  const soft = await c.query(
    `SELECT id FROM product_option_value
     WHERE option_id = $1 AND value = $2 AND deleted_at IS NOT NULL
     LIMIT 1`,
    [optionId, value],
  );
  if (soft.rows[0]) {
    await c.query(
      `UPDATE product_option_value SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
      [soft.rows[0].id],
    );
    console.log(`   revive option value ${optionTitle}=${value}`);
    return soft.rows[0].id;
  }

  const id = ulidLike();
  await c.query(
    `INSERT INTO product_option_value (id, value, option_id, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())`,
    [id, value, optionId],
  );
  console.log(`   + option value ${optionTitle}=${value}`);
  return id;
}

async function patchMeta(c, productId, rows) {
  const features = chinaUnlimitedKeyFeaturesByCarrier();
  const kf = {};
  for (const [k, entry] of Object.entries(features)) {
    if (k === "CMCC+") continue; // 不下架舊鍵以外，前台只留現用鍵
    kf[k] = {
      bullets: entry.bullets || [],
      actual_experience: entry.actual_experience || "",
    };
  }

  const r = await c.query(`SELECT metadata, subtitle FROM product WHERE id=$1`, [
    productId,
  ]);
  const meta = { ...(r.rows[0]?.metadata || {}) };

  meta.hot_sale_telecoms = Array.from(
    new Set([TELECOM, CN_UNLIMITED_CUCC, ...(meta.hot_sale_telecoms || [])]),
  ).filter((x) => x && x !== "CMCC+");
  meta.carrier_profit_by_carrier = {
    ...(meta.carrier_profit_by_carrier || {}),
    [TELECOM]: PROFIT,
    [CN_UNLIMITED_CUCC]:
      meta.carrier_profit_by_carrier?.[CN_UNLIMITED_CUCC] ?? 60,
  };
  delete meta.carrier_profit_by_carrier?.["CMCC+"];

  meta.subtitle_by_carrier = {
    ...(meta.subtitle_by_carrier || {}),
    [TELECOM]: "移動 CMCC｜香港IP｜限速約50–70Mbps｜支援 TikTok／ChatGPT",
  };
  delete meta.subtitle_by_carrier?.["CMCC+"];

  meta.carrier_specs_by_carrier = {
    ...(meta.carrier_specs_by_carrier || {}),
    [TELECOM]: {
      ip_type: "香港 IP",
      route_type: "漫遊線路",
      network: "CMCC / 4G・5G",
      speed_rule: SPEED_RULE,
      apn: "cmhk",
      apps: APPS_LABEL,
    },
  };
  delete meta.carrier_specs_by_carrier?.["CMCC+"];

  meta.overview_notices_by_carrier = {
    ...(meta.overview_notices_by_carrier || {}),
    [TELECOM]: {
      fup_notice:
        "香港IP漫遊｜限速約 50–70 Mbps 吃到飽。TikTok 雙端可用；ChatGPT 於 Apple 較完整，Android 建議網頁版。",
      activation_notice: "建議抵達中國大陸後再啟用 eSIM；APN 多為自動設定（cmhk）",
    },
  };
  delete meta.overview_notices_by_carrier?.["CMCC+"];
  meta.key_features_by_carrier = kf;

  await c.query(
    `UPDATE product
     SET subtitle = $2,
         metadata = $3::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [
      productId,
      "CUCC+ 免VPN社群｜CMCC 70Mbps 吃到飽｜依電信商選購",
      JSON.stringify(meta),
    ],
  );

  const outFile = path.join(
    __dirname,
    "data",
    "china-unlimited-cmcc-70-plans.json",
  );
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hkd_to_twd: HKD_TO_TWD,
        profit_percent: PROFIT,
        telecom: TELECOM,
        note: "China-unlimited-*-B0｜CMCC｜HK IP｜50-70Mbps｜cmhk",
        plans: rows,
      },
      null,
      2,
    ),
  );
  console.log("   wrote", outFile);
}

async function main() {
  const rows = loadPlans();
  if (!rows.length) throw new Error("找不到 China-unlimited-*-B0");

  console.log(`💱 HKD→TWD ${HKD_TO_TWD}｜利潤 ${PROFIT}%｜方案 ${rows.length}`);
  for (const s of [rows[0], rows.find((r) => r.day === 5)].filter(Boolean)) {
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

  const existingSkus = new Set(rows.map((r) => r.sku));
  const toDelete = (product.variants || [])
    .filter(
      (v) =>
        existingSkus.has(v.sku) ||
        String(v.title || "").startsWith(`${TELECOM} ·`) ||
        String(v.metadata?.carrier || "") === TELECOM ||
        String(v.sku || "").match(/^China-unlimited-\d+-B0$/i),
    )
    .map((v) => v.id);
  if (toDelete.length) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ delete: toDelete }),
    });
    console.log(`🗑️ 刪舊 CMCC70 變體 ${toDelete.length}`);
  }

  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  for (const d of [...new Set(rows.map((r) => r.daysLabel))]) {
    await ensureOptionValue(c, product.id, "使用天數", d);
  }
  await ensureOptionValue(c, product.id, "電信商", TELECOM);
  await ensureOptionValue(c, product.id, "數據量", DATA_AMOUNT);
  await ensureOptionValue(c, product.id, "線路", LINE);
  await patchMeta(c, product.id, rows);
  await c.end();
  console.log("✅ metadata／選項值已更新");

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
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,title`,
  );
  const p2 = check.products?.[0];
  const by = {};
  for (const v of p2.variants || []) {
    const t =
      (v.options || []).find((o) => o.option?.title === "電信商")?.value ||
      v.title?.split(" · ")[0];
    by[t] = (by[t] || 0) + 1;
  }
  console.log("\n完成", p2.title);
  console.log(" variant counts:", by);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
