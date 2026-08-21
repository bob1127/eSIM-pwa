/**
 * 建立「台灣 吃到飽 不限流量 eSIM 5G - 無需實名認證」
 *   1) 中華電信 5Mbps  ← Taiwan-unlimited-*-5mbps-D0（每日 2GB 高速後 5Mbps）
 *   2) 中華電信 10Mbps ← Taiwan-unlimited-*-D0（每日 1GB 高速後 10Mbps）
 * 皆為中華電信 5G、3HK 漫遊、無需實名（No eKYC），利潤 70%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-taiwan-unlimited-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-taiwan-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  TW_TELECOM_5,
  TW_TELECOM_10,
  taiwanUnlimitedKeyFeaturesByCarrier,
} from "../content/product-detailed/taiwan-key-features.js";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    const env = fs.readFileSync(envPath, "utf8");
    for (const line of env.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      let k = t.slice(0, i);
      let v = t.slice(i + 1);
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const HANDLE = "taiwan-unlimited-esim";
const TITLE = "台灣 吃到飽 不限流量 eSIM 5G - 無需實名認證";
const DATA = "無限流量";
const PROFIT = 70;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");
const THUMB =
  process.env.TAIWAN_PRODUCT_THUMB ||
  `${SITE_ORIGIN}/images/${encodeURIComponent("台灣esim.png")}`;

const FUP_5 = "每日約 2GB 高速後限速約 5Mbps 吃到飽（台灣時間 00:00 重置）";
const FUP_10 = "每日約 1GB 高速後限速約 10Mbps 吃到飽（台灣時間 00:00 重置）";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * (1 + PROFIT / 100)) / 10) * 10 - 1;
}

function is5MbpsD0(p) {
  const name = String(p.name || p.channel_dataplan_name || "");
  return /^Taiwan-unlimited-\d+-5mbps-D0$/i.test(name);
}

function is10MbpsD0(p) {
  const name = String(p.name || p.channel_dataplan_name || "");
  return /^Taiwan-unlimited-\d+-D0$/i.test(name) && !/5mbps/i.test(name);
}

async function fetchPlans() {
  const localCache = "/tmp/esim-full-plans.json";
  const urls = [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.result || [];
      if (list.length) {
        fs.writeFileSync(localCache, JSON.stringify(data));
        console.log(`📥 方案目錄 ${list.length} 筆（${url}）`);
        return list;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }

  try {
    const { fetchMicroesimCatalog } = await import(
      "../lib/esim/microesimClient.js"
    );
    const list = await fetchMicroesimCatalog();
    if (list?.length) {
      fs.writeFileSync(localCache, JSON.stringify({ result: list }));
      console.log(`📥 方案目錄 ${list.length} 筆（MicroeSIM 直連）`);
      return list;
    }
  } catch (e) {
    console.warn(`⚠️ MicroeSIM 直連: ${e.message}`);
  }

  if (fs.existsSync(localCache)) {
    const data = JSON.parse(fs.readFileSync(localCache, "utf8"));
    console.log("📥 使用快取 /tmp/esim-full-plans.json");
    return data.result || [];
  }
  throw new Error("無法取得方案目錄");
}

function pickByDay(raw, pred) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!pred({ ...p, name })) continue;
    const day = Number(p.day) || 0;
    if (!day) continue;
    const hkd = Number(p.price) || 0;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    const prev = map.get(day);
    if (!prev || hkd < prev.price_hkd) {
      map.set(day, {
        sku: name,
        plan_id: p.channel_dataplan_id || p.id,
        day,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost),
        apn: String(p.apn || "mobile.three.com.hk").trim(),
        networks: p.networks || p.operator || "TW:Chunghwa[4G;5G]|",
        rule_desc: p.rule_desc || "",
        speed_desc: p.speed_desc || p.special_desc || "",
        special_desc: p.special_desc || "",
        ip: String(p.ip || "HK,SG").trim(),
      });
    }
  }
  return [...map.values()].sort((a, b) => a.day - b.day);
}

function toVariant(r, telecom, kind) {
  const fup = kind === "5" ? FUP_5 : FUP_10;
  return {
    title: `${telecom} · ${r.day}天 · ${DATA}`,
    sku: r.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: `${r.day}天`,
      電信商: telecom,
      數據量: DATA,
    },
    prices: [{ currency_code: "twd", amount: r.retail_twd }],
    metadata: {
      plan_id: r.plan_id,
      type: "esim",
      carrier: telecom,
      plan_kind: "unlimited",
      data: DATA,
      data_amount: DATA,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: r.cost_twd,
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: 1 + PROFIT / 100,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      speed_desc: r.speed_desc,
      special_desc: r.special_desc,
      throttle_kind: kind === "5" ? "5mbps" : "10mbps",
      ip: r.ip,
      ekyc: false,
      attributes: {
        days: r.day,
        data: DATA,
        data_amount: DATA,
        telecom,
        network: "中華電信 4G/5G",
        ip_type: "香港／新加坡 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: false,
        tiktok: false,
        gemini: true,
        ekyc: false,
        speed_rule: fup,
        coverage: "台灣",
        apps: "支援熱點；ChatGPT／TikTok 可能受限（香港 IP）",
      },
    },
  };
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

async function admin(token, apiPath, options = {}, retries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
    } catch (e) {
      lastErr = e;
      console.warn(
        `⚠️ admin ${apiPath} 失敗 (${attempt}/${retries}): ${e.message}`,
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  throw lastErr;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function ensureCategory(token) {
  const { product_categories: cats } = await admin(
    token,
    "/admin/product-categories?limit=200",
  );
  const existing = (cats || []).find(
    (c) =>
      c.handle === "taiwan" ||
      c.handle === "tw" ||
      /^台灣$/.test(String(c.name || "")),
  );
  if (existing) {
    console.log("📂 分類", existing.id, existing.handle, existing.name);
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: "台灣",
      handle: "taiwan",
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  console.log("🆕 已建立分類", id, "taiwan");
  return id;
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD} · 利潤 ${PROFIT}%`);
  console.log(`  ${TW_TELECOM_5}  ← Taiwan-unlimited-*-5mbps-D0`);
  console.log(`  ${TW_TELECOM_10} ← Taiwan-unlimited-*-D0`);

  const raw = await fetchPlans();
  const rows5 = pickByDay(raw, is5MbpsD0);
  const rows10 = pickByDay(raw, is10MbpsD0);
  if (!rows5.length) throw new Error("找不到 Taiwan-unlimited-*-5mbps-D0");
  if (!rows10.length) throw new Error("找不到 Taiwan-unlimited-*-D0");

  for (const r of [rows5.find((x) => x.day === 1), rows5.find((x) => x.day === 7)].filter(Boolean)) {
    console.log(
      `  [5Mbps] ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}`,
    );
  }
  for (const r of [rows10.find((x) => x.day === 1), rows10.find((x) => x.day === 7)].filter(Boolean)) {
    console.log(
      `  [10Mbps] ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}`,
    );
  }
  console.log(`共 5Mbps ${rows5.length} + 10Mbps ${rows10.length}`);

  const dayValues = [
    ...new Set([...rows5, ...rows10].map((r) => `${r.day}天`)),
  ].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const telecomValues = [TW_TELECOM_5, TW_TELECOM_10];

  const keyFeatures = taiwanUnlimitedKeyFeaturesByCarrier();
  const productMeta = {
    type: "esim",
    country: "TW",
    is_native: false,
    plan_kind: "unlimited",
    no_ekyc: true,
    hot_sale_telecoms: [TW_TELECOM_10],
    carrier_profit_by_carrier: {
      [TW_TELECOM_5]: PROFIT,
      [TW_TELECOM_10]: PROFIT,
    },
    seo_title: "台灣 eSIM 吃到飽 5G｜無需實名認證｜中華電信｜Jeko eSIM",
    seo_description:
      "台灣吃到飽 eSIM 5G，中華電信網路，無需實名認證。每日高速後 5Mbps／10Mbps 無限流量，適合返台與來台旅客。",
    seo_keywords: "台灣eSIM,吃到飽,中華電信,5G,無需實名,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TW_TELECOM_5]: "中華電信 5G｜無需實名｜每日 2GB 高速後約 5Mbps 吃到飽",
      [TW_TELECOM_10]: "中華電信 5G｜無需實名｜每日 1GB 高速後約 10Mbps 吃到飽",
    },
    carrier_specs_by_carrier: {
      [TW_TELECOM_5]: {
        ip_type: "香港／新加坡 IP",
        route_type: "漫遊",
        network: "中華電信 4G/5G",
        speed_rule: FUP_5,
        apn: "mobile.three.com.hk",
        apps: "支援熱點；ChatGPT／TikTok 可能受限",
        coverage: "台灣",
        ekyc: "無需實名認證",
      },
      [TW_TELECOM_10]: {
        ip_type: "香港／新加坡 IP",
        route_type: "漫遊",
        network: "中華電信 4G/5G",
        speed_rule: FUP_10,
        apn: "mobile.three.com.hk",
        apps: "支援熱點；ChatGPT／TikTok 可能受限",
        coverage: "台灣",
        ekyc: "無需實名認證",
      },
    },
    overview_notices_by_carrier: {
      [TW_TELECOM_5]: {
        fup_notice:
          "無需實名認證。每日約 2GB 高速後限速約 5Mbps 吃到飽；流量與天數以台灣時間 00:00（UTC+8）重置。中華電信 4G／5G。ChatGPT／TikTok 可能受限。",
        activation_notice: "建議抵達台灣後再安裝／啟用 eSIM",
      },
      [TW_TELECOM_10]: {
        fup_notice:
          "無需實名認證。每日約 1GB 高速後限速約 10Mbps 吃到飽；流量與天數以台灣時間 00:00（UTC+8）重置。中華電信 4G／5G。ChatGPT／TikTok 可能受限。",
        activation_notice: "建議抵達台灣後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: keyFeatures,
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "中華電信 5G｜無需實名認證｜5Mbps／10Mbps 吃到飽",
    handle: HANDLE,
    description:
      "台灣吃到飽不限流量 eSIM 5G，走中華電信 4G／5G，無需實名認證（No eKYC）。兩種速度可選：每日約 2GB 高速後 5Mbps，或每日約 1GB 高速後 10Mbps。流量與天數以台灣時間 00:00 重置。建議抵達台灣後再啟用。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: [DATA] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
  };

  const variants = [
    ...rows5.map((r) => toVariant(r, TW_TELECOM_5, "5")),
    ...rows10.map((r) => toVariant(r, TW_TELECOM_10, "10")),
  ];

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  const categoryId = await ensureCategory(token);
  payloadBase.categories = [{ id: categoryId }];

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];

  if (!product) {
    console.log("🆕 建立商品…");
    const first = variants[0];
    const rest = variants.slice(1);
    const created = await admin(token, "/admin/products", {
      method: "POST",
      body: JSON.stringify({ ...payloadBase, variants: [first] }),
    });
    product = created.product;
    console.log("✅ 已建立", product.id, product.handle);

    for (const [i, batch] of chunk(rest, BATCH_SIZE).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + batch ${i + 1}: ${batch.length} variants`);
    }
  } else {
    console.log("♻️ 更新既有商品", product.id);
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

    if (!REBUILD) {
      console.log("（未加 --rebuild，僅更新商品資訊；變體不變）");
      console.log(
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-taiwan-unlimited-product.mjs --rebuild",
      );
      return;
    }

    const oldIds = [];
    let offset = 0;
    for (;;) {
      const page = await admin(
        token,
        `/admin/products/${product.id}/variants?limit=${BATCH_SIZE}&offset=${offset}&fields=id`,
      );
      const pageRows = page.variants || [];
      oldIds.push(...pageRows.map((v) => v.id).filter(Boolean));
      if (pageRows.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }
    if (oldIds.length) {
      for (const batch of chunk(oldIds, BATCH_SIZE)) {
        await admin(token, `/admin/products/${product.id}/variants/batch`, {
          method: "POST",
          body: JSON.stringify({ delete: batch }),
        });
      }
      console.log(`🗑 已刪 ${oldIds.length} 舊變體`);
    }
    for (const [i, batch] of chunk(variants, BATCH_SIZE).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + batch ${i + 1}: ${batch.length} variants`);
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants,*options`,
  );
  const vs = check.product?.variants || [];
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`Handle: ${check.product?.handle}`);
  console.log(`前台: /product/taiwan/${HANDLE}/`);
  console.log(`Admin: ${MEDUSA_URL}/app/products/${product.id}`);
  console.log(`變體數: ${vs.length}`);
  const s5 = rows5.find((r) => r.day === 1);
  const s10 = rows10.find((r) => r.day === 1);
  if (s5) {
    console.log(
      `範例 5Mbps 1天: HKD ${s5.price_hkd} → cost NT$${s5.cost_twd} → 售價 NT$${s5.retail_twd}（70%）`,
    );
  }
  if (s10) {
    console.log(
      `範例 10Mbps 1天: HKD ${s10.price_hkd} → cost NT$${s10.cost_twd} → 售價 NT$${s10.retail_twd}（70%）`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
