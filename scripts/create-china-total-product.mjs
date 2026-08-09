/**
 * 建立／更新「中國 總量型 eSIM」(china-total-esim)
 *   1) CMCC+ ← China-Total*-A0（用完降速 128kbps）+ China-Total*-B0（用完斷網）
 *   2) CUCC+ ← China-Total*-A1（用完降速 128kbps｜GPT／TikTok／Gemini）
 * 利潤 70%
 *
 *   HKD_TO_TWD=4.5 node scripts/create-china-total-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { Agent, setGlobalDispatcher } from "undici";
import {
  chinaTotalKeyFeaturesByCarrier,
  CN_TOTAL_CMCC,
  CN_TOTAL_CUCC,
} from "../content/product-detailed/china-total-key-features.js";

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

const HANDLE = "china-total-esim";
const TITLE = "中國 總量型 eSIM";
const LINE = "漫遊線路";
const TELECOM_CMCC = CN_TOTAL_CMCC;
const TELECOM_CUCC = CN_TOTAL_CUCC;
const PROFIT = 70;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 40;
const REBUILD = process.argv.includes("--rebuild");
const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CHINA_CATEGORY_ID = "pcat_01KZJNBVVHY3ZHNJ4MPS9ZZVFG";

const DATA_ORDER = [
  "1GB",
  "1GB（用完斷網）",
  "2GB",
  "2GB（用完斷網）",
  "3GB",
  "3GB（用完斷網）",
  "5GB",
  "5GB（用完斷網）",
  "10GB",
  "10GB（用完斷網）",
  "20GB",
  "20GB（用完斷網）",
  "30GB",
  "30GB（用完斷網）",
  "50GB",
  "50GB（用完斷網）",
  "60GB",
  "60GB（用完斷網）",
];

// 中國每日／吃到飽／總量型共用同一組商品圖（每日型為基準）
const CHINA_GALLERY = [
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KYBQ3HHZADQNWFGG6F02YKSP.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZC1M2RHG9FSSJ2MSA2.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZF9FN2EBHG0VWQZYE4.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZHTR543PGYNDFCWZ4P.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZKDF8KNBEG5E6AN6FZ.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZMD55C80GTZT5AQ3J1.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZPY1MSRTSRJFAV1TDE.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZQ6J4G2W5T7ST73922.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZRTNQSN4J0N42DP5FW.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZTSBEM0042MDCPPKFP.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK7PKZV4V5W95ECE4A9EYAA.jpg",
];
const THUMB = process.env.CHINA_PRODUCT_THUMB || CHINA_GALLERY[0];
const PRODUCT_IMAGES = CHINA_GALLERY.map((url) => ({ url }));

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

function dataRank(label) {
  const i = DATA_ORDER.indexOf(String(label || ""));
  return i >= 0 ? i : 99;
}

function parseGb(name) {
  const m = String(name || "").match(/Total(\d+)\s*GB/i);
  return m ? `${m[1]}GB` : "";
}

function loadPlans() {
  const cache = ["/tmp/esim-full-plans.json", "/tmp/esim-list.json"].find((p) =>
    fs.existsSync(p),
  );
  if (!cache) throw new Error("找不到 /tmp/esim-full-plans.json");
  const all = JSON.parse(fs.readFileSync(cache, "utf8")).result || [];
  const rows = [];

  for (const p of all) {
    const name = p.name || "";
    const gb = parseGb(name);
    if (!gb) continue;
    const day = Number(p.day);
    const price_hkd = Number(p.price);
    const cost_twd = Math.ceil(price_hkd * HKD_TO_TWD);
    const networks = String(p.networks || "");
    const isCmcc = /CN:CMCC/i.test(networks);
    const isCucc = /CN:CUCC/i.test(networks);

    let telecom = "";
    let kind = "";
    // 以供應商 rule_desc 為準（勿只靠 A0/A1/B0 後綴：CUCC 有 A1=Terminate、A0=Terminate）
    const ruleTerminate = /terminat/i.test(String(p.rule_desc || ""));

    if (isCmcc && /^China-Total\d+GB-\d+-A0$/i.test(name)) {
      telecom = TELECOM_CMCC;
      kind = ruleTerminate ? "cmcc_terminate" : "cmcc_128";
    } else if (isCmcc && /^China-Total\d+GB-\d+-B0$/i.test(name)) {
      telecom = TELECOM_CMCC;
      kind = "cmcc_terminate";
    } else if (
      isCucc &&
      (/^China-Total\d+GB-\d+-A1$/i.test(name) ||
        /^China-Total\d+GB-\d+-A0$/i.test(name))
    ) {
      telecom = TELECOM_CUCC;
      kind = ruleTerminate ? "cucc_terminate" : "cucc_128";
    } else {
      continue;
    }

    const terminate =
      kind.endsWith("_terminate") ||
      ruleTerminate ||
      /terminat/i.test(String(p.rule_desc || ""));

    const data_amount = terminate ? `${gb}（用完斷網）` : gb;
    rows.push({
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      day,
      daysLabel: `${day}天`,
      data_amount,
      base_gb: gb,
      price_hkd,
      cost_twd,
      retail_twd: retailFromCost(cost_twd),
      profit_percent: PROFIT,
      telecom,
      kind,
      terminate,
      apn: p.apn || (isCucc ? "e-ideas" : terminate ? "cmhk" : "cmlink"),
      networks,
      rule_desc: p.rule_desc || (terminate ? "terminate" : "unlimited 128kbps"),
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: p.ip || (isCucc ? "SG" : terminate ? "HK" : "HK,SG"),
    });
  }

  return rows.sort(
    (a, b) =>
      a.telecom.localeCompare(b.telecom, "zh") ||
      dataRank(a.data_amount) - dataRank(b.data_amount) ||
      a.day - b.day,
  );
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
  const isCucc = row.telecom === TELECOM_CUCC;
  const terminate = !!row.terminate;
  const speedRule = terminate
    ? "流量用完即斷網"
    : "高速用完後降速至約 128 kbps";
  const apps = isCucc
    ? "熱點分享、ChatGPT、TikTok、Gemini"
    : terminate
      ? "熱點分享"
      : "熱點分享、ChatGPT";

  return {
    title: `${row.telecom} · ${row.daysLabel} · ${row.data_amount}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: row.telecom,
      數據量: row.data_amount,
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: row.telecom,
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd),
      cost_price: row.cost_twd,
      profit_percent: PROFIT,
      profit_rate: `${PROFIT}%`,
      margin: MARGIN,
      apn: row.apn,
      networks: row.networks,
      rule_desc: row.rule_desc,
      speed_desc: row.speed_desc,
      special_desc: row.special_desc,
      throttle_kind: terminate ? "terminate" : "128kbps",
      ip: row.ip,
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: row.telecom,
        line: LINE,
        network: isCucc ? "CUCC 4G/5G" : "CMCC 4G/5G",
        ip_type: isCucc
          ? "新加坡 IP"
          : terminate
            ? "香港 IP"
            : "香港／新加坡 IP",
        route_type: LINE,
        hotspot: true,
        gpt: isCucc || !terminate,
        tiktok: isCucc,
        gemini: isCucc,
        speed_rule: speedRule,
        apps,
      },
    },
  };
}

function ulidLike(prefix = "optval") {
  const t = Date.now().toString(32).toUpperCase();
  const r = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}_${t}${r}`.slice(0, 30);
}

async function ensureOptionValue(c, productId, optionTitle, value) {
  const opt = await c.query(
    `SELECT id FROM product_option
     WHERE product_id=$1 AND title=$2 AND deleted_at IS NULL LIMIT 1`,
    [productId, optionTitle],
  );
  const optionId = opt.rows[0]?.id;
  if (!optionId) throw new Error(`找不到選項 ${optionTitle}`);
  const exists = await c.query(
    `SELECT id FROM product_option_value
     WHERE option_id=$1 AND value=$2 AND deleted_at IS NULL LIMIT 1`,
    [optionId, value],
  );
  if (exists.rows[0]) return exists.rows[0].id;
  const soft = await c.query(
    `SELECT id FROM product_option_value
     WHERE option_id=$1 AND value=$2 AND deleted_at IS NOT NULL LIMIT 1`,
    [optionId, value],
  );
  if (soft.rows[0]) {
    await c.query(
      `UPDATE product_option_value SET deleted_at=NULL, updated_at=NOW() WHERE id=$1`,
      [soft.rows[0].id],
    );
    return soft.rows[0].id;
  }
  const id = ulidLike();
  await c.query(
    `INSERT INTO product_option_value (id, value, option_id, created_at, updated_at)
     VALUES ($1,$2,$3,NOW(),NOW())`,
    [id, value, optionId],
  );
  return id;
}

async function ensureCategory(c, productId) {
  await c.query(`DELETE FROM product_category_product WHERE product_id=$1`, [
    productId,
  ]);
  await c.query(
    `INSERT INTO product_category_product (product_id, product_category_id)
     VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [productId, CHINA_CATEGORY_ID],
  );
}

async function main() {
  const rows = loadPlans();
  if (!rows.length) throw new Error("無 China-Total 方案");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [TELECOM_CMCC, TELECOM_CUCC];

  console.log(
    `💱 HKD→TWD ${HKD_TO_TWD}｜利潤 ${PROFIT}%｜方案 ${rows.length}（CMCC ${rows.filter((r) => r.telecom === TELECOM_CMCC).length}／CUCC ${rows.filter((r) => r.telecom === TELECOM_CUCC).length}｜斷網 ${rows.filter((r) => r.terminate).length}）`,
  );
  for (const s of [
    rows.find((r) => r.sku === "China-Total1GB-3-A0"),
    rows.find((r) => r.sku === "China-Total1GB-3-B0"),
    rows.find((r) => r.sku === "China-Total3GB-3-A1"),
  ].filter(Boolean)) {
    console.log(
      `   ${s.sku}: HKD ${s.price_hkd} → NT$${s.cost_twd} → 售價 NT$${s.retail_twd}｜${s.data_amount}`,
    );
  }

  fs.writeFileSync(
    path.join(__dirname, "data", "china-total-plans.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        hkd_to_twd: HKD_TO_TWD,
        profit_percent: PROFIT,
        plans: rows,
      },
      null,
      2,
    ),
  );

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];

  const features = chinaTotalKeyFeaturesByCarrier();
  const kf = {};
  for (const [k, entry] of Object.entries(features)) {
    kf[k] = {
      bullets: entry.bullets || [],
      actual_experience: entry.actual_experience || "",
    };
  }

  const productMeta = {
    type: "esim",
    country: "CN",
    plan_kind: "total",
    hot_sale_telecoms: [TELECOM_CUCC, TELECOM_CMCC],
    carrier_profit_by_carrier: {
      [TELECOM_CMCC]: PROFIT,
      [TELECOM_CUCC]: PROFIT,
    },
    seo_title: "中國 總量型 eSIM｜中國移動 CMCC+／中國聯通 CUCC+｜Jeko eSIM",
    seo_description:
      "中國總量型 eSIM：CMCC+（降速 128kbps 或用完斷網）、CUCC+（降速 128kbps，支援 ChatGPT／TikTok／Gemini）。依天數與總量選購。",
    seo_keywords:
      "中國eSIM,總量型eSIM,中國移動,中國聯通,CMCC,CUCC,用完斷網,128kbps,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_CMCC]:
        "中國移動｜總量型｜降速128kbps或用完斷網（購買前會提醒）",
      [TELECOM_CUCC]:
        "中國聯通｜總量型｜降速128kbps｜支援 ChatGPT／TikTok／Gemini",
    },
    carrier_specs_by_carrier: {
      [TELECOM_CMCC]: {
        ip_type: "香港／新加坡 IP",
        route_type: "漫遊線路",
        network: "中國移動 / 4G・5G",
        speed_rule: "依方案：降速約 128kbps，或用完斷網",
        apps: "熱點分享、ChatGPT（部分方案）",
        apn: "cmlink／cmhk",
      },
      [TELECOM_CUCC]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊線路",
        network: "中國聯通 / 4G・5G",
        speed_rule: "高速用完後降速至約 128 kbps",
        apps: "熱點分享、ChatGPT、TikTok、Gemini",
        apn: "e-ideas",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM_CMCC]: {
        fup_notice:
          "依所選方案：多數為高速用完後降速至約 128kbps；標示「用完斷網」者流量歸零即無法上網（結帳前會再提醒）。",
        activation_notice: "建議抵達中國大陸後再啟用 eSIM",
      },
      [TELECOM_CUCC]: {
        fup_notice:
          "多數方案高速用完後降速至約 128kbps；少數方案（如 7天1GB、15天2GB）為用完斷網，結帳前會再提醒。新加坡 IP，一般可免 VPN 用 LINE／IG／FB。",
        activation_notice: "建議抵達中國大陸後再啟用 eSIM",
      },
    },
    key_features_by_carrier: kf,
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "CMCC+ 中國移動｜CUCC+ 中國聯通｜總量型，依天數與流量選購",
    handle: HANDLE,
    description:
      "中國總量型 eSIM。CMCC+（中國移動）：可選用完降速約 128kbps，或用完斷網方案。CUCC+（中國聯通）：用完降速約 128kbps，支援 ChatGPT／TikTok／Gemini 與熱點。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: PRODUCT_IMAGES,
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: dataValues },
      { title: "線路", values: [LINE] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: [{ id: CHINA_CATEGORY_ID }],
  };

  const variants = rows.map(toVariant);

  if (!product) {
    console.log("🆕 建立商品…");
    const created = await admin(token, "/admin/products", {
      method: "POST",
      body: JSON.stringify({ ...payloadBase, variants: [variants[0]] }),
    });
    product = created.product;
    console.log("✅", product.id);
    for (const [i, batch] of chunk(variants.slice(1), BATCH).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + batch ${i + 1}: ${batch.length}`);
    }
  } else {
    console.log("♻️ 更新", product.id);
    if (REBUILD && (product.variants || []).length) {
      const ids = product.variants.map((v) => v.id);
      for (const batch of chunk(ids, BATCH)) {
        await admin(token, `/admin/products/${product.id}/variants/batch`, {
          method: "POST",
          body: JSON.stringify({ delete: batch }),
        });
      }
      console.log(`🗑️ 刪舊變體 ${ids.length}`);
    }

    // 輕量更新標題／描述／縮圖（避免整包 metadata POST timeout）
    try {
      await admin(token, `/admin/products/${product.id}`, {
        method: "POST",
        body: JSON.stringify({
          title: payloadBase.title,
          subtitle: payloadBase.subtitle,
          description: payloadBase.description,
          status: "published",
          thumbnail: THUMB,
        }),
      });
    } catch (e) {
      console.warn("Admin POST 標題更新略過:", e.message);
    }

    const c = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query(
      `UPDATE product SET metadata=$2::jsonb, title=$3, subtitle=$4, description=$5, updated_at=NOW() WHERE id=$1`,
      [
        product.id,
        JSON.stringify(productMeta),
        TITLE,
        payloadBase.subtitle,
        payloadBase.description,
      ],
    );
    await ensureCategory(c, product.id);
    for (const d of dayValues) await ensureOptionValue(c, product.id, "使用天數", d);
    for (const t of telecomValues)
      await ensureOptionValue(c, product.id, "電信商", t);
    for (const d of dataValues) await ensureOptionValue(c, product.id, "數據量", d);
    await ensureOptionValue(c, product.id, "線路", LINE);
    await c.end();

    const existingSkus = new Set(
      (product.variants || []).map((v) => v.sku).filter(Boolean),
    );
    const toCreate = REBUILD
      ? variants
      : variants.filter((v) => !existingSkus.has(v.sku));
    for (const [i, batch] of chunk(toCreate, BATCH).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + batch ${i + 1}: ${batch.length}`);
    }
  }

  // 確保分類（新建時也補）
  const c2 = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c2.connect();
  await ensureCategory(c2, product.id);
  await c2.end();

  console.log(`\n完成 ${TITLE}`);
  console.log(`前台: /product/china/${HANDLE}`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
