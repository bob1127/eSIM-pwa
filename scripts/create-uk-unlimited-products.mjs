/**
 * 建立「英國 吃到飽 eSIM」（單一商品、兩個電信變體）
 *   1) EE + ｜歐36｜限速約 10Mbps｜cmlink／香港 IP｜90%
 *   2) EE / Three + ｜歐34｜FUP｜internet／波蘭 IP｜50%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-uk-unlimited-products.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  UK_TELECOM_EE36,
  UK_TELECOM_EE34,
  ukUnlimited10MbpsKeyFeaturesByCarrier,
  ukUnlimitedFupKeyFeaturesByCarrier,
} from "../content/product-detailed/uk-key-features.js";
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
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");
const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");
const THUMB =
  process.env.UK_PRODUCT_THUMB ||
  `${SITE_ORIGIN}/images/${encodeURIComponent("英國esim.png")}`;

const HANDLE = "uk-unlimited-esim";
const TITLE = "英國 吃到飽 eSIM";
const OLD_10MBPS_HANDLE = "uk-unlimited-10mbps-esim";
const UK_NETWORKS = "EE／Three／Vodafone／O2";

const LINES = [
  {
    telecom: UK_TELECOM_EE36,
    profit: 90,
    skuRe: /^EU[\s-]*36-unlimited-(\d+)-A0$/i,
    skuLabel: "EU-36-unlimited-*-A0",
    skuSuffix: "#uk10",
    defaultApn: "cmlink",
    defaultIp: "HK",
    ipType: "香港 IP",
    throttleKind: "capped",
    speedRule: "限速約 10Mbps 吃到飽",
    networkLabel: "EE／Three／Vodafone／O2 4G/5G",
    coverage: "英國為主，含歐包 36 國（法、德、義、西、瑞士、荷、比、奧等）",
    subtitle: `${UK_NETWORKS}｜限速約 10Mbps｜香港 IP`,
    fupNotice:
      "方案限速約 10Mbps 吃到飽。英國走 EE／Three／Vodafone／O2。出網香港 IP（cmlink），支援 ChatGPT／TikTok／Gemini。",
  },
  {
    telecom: UK_TELECOM_EE34,
    profit: 50,
    skuRe: /^Europe[\s-]+34[\s-]+countries-unlimited-(\d+)-B0$/i,
    skuLabel: "Europe 34 countries-unlimited-*-B0",
    skuSuffix: "#uk",
    defaultApn: "internet / internetipv6",
    defaultIp: "PL",
    ipType: "波蘭 IP",
    throttleKind: "fup",
    speedRule: "吃到飽不限流量（FUP，繁忙時段可能降速）",
    networkLabel: "EE／Three／Vodafone／O2 4G/5G",
    coverage: "英國為主，含歐包 34 國（法、德、義、西、瑞士、荷、比、奧等）",
    subtitle: `${UK_NETWORKS}｜FUP 不限流量｜波蘭 IP`,
    fupNotice:
      "吃到飽（FUP）。英國走 EE／Three／Vodafone／O2。出網波蘭 IP，支援 ChatGPT／TikTok／Gemini。古蹟室內與鄉村收訊不保證。",
  },
];

function retailFromCost(costTwd, margin) {
  return Math.ceil((costTwd * margin) / 10) * 10 - 1;
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

function collectRows(raw, spec) {
  const margin = 1 + spec.profit / 100;
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    const m = String(name).match(spec.skuRe);
    if (!m) continue;
    const day = Number(p.day) || Number(m[1]) || 0;
    if (!day) continue;
    const hkd = Number(p.price) || 0;
    const prev = map.get(day);
    if (prev && hkd >= prev.price_hkd) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    map.set(day, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom: spec.telecom,
      day,
      daysLabel: `${day}天`,
      data: "吃到飽",
      price_hkd: hkd,
      cost_twd: cost,
      profit_percent: spec.profit,
      retail_twd: retailFromCost(cost, margin),
      apn: String(p.apn || spec.defaultApn).trim(),
      networks: p.networks || p.operator || "",
      rule_desc: p.rule_desc || "unlimited",
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || spec.defaultIp).trim(),
    });
  }
  return [...map.values()].sort((a, b) => a.day - b.day);
}

function toVariant(r, spec) {
  const margin = 1 + spec.profit / 100;
  return {
    title: `${r.telecom} · ${r.daysLabel} · ${r.data}`,
    sku: spec.skuSuffix ? `${r.sku}${spec.skuSuffix}` : r.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: r.daysLabel,
      電信商: r.telecom,
      數據量: r.data,
    },
    prices: [{ currency_code: "twd", amount: r.retail_twd }],
    metadata: {
      plan_id: r.plan_id,
      type: "esim",
      carrier: r.telecom,
      plan_kind: "unlimited",
      data: r.data,
      data_amount: r.data,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: r.cost_twd,
      profit_percent: spec.profit,
      profit_margin: `${spec.profit}%`,
      profit_rate: `${spec.profit}%`,
      margin,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      speed_desc: r.speed_desc,
      special_desc: r.special_desc,
      throttle_kind: spec.throttleKind,
      ip: r.ip,
      is_native: false,
      ekyc: null,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: spec.networkLabel,
        ip_type: spec.ipType,
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        ekyc: null,
        speed_rule: spec.speedRule,
        coverage: spec.coverage,
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
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
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, size + i));
  return out;
}

async function ensureCategory(token) {
  const { product_categories: cats } = await admin(
    token,
    "/admin/product-categories?limit=200",
  );
  const existing = (cats || []).find(
    (c) =>
      c.handle === "uk" ||
      c.handle === "united-kingdom" ||
      c.handle === "gb" ||
      /^英國$/.test(String(c.name || "")),
  );
  if (existing) {
    console.log("📂 分類", existing.id, existing.handle, existing.name);
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: "英國",
      handle: "uk",
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  console.log("🆕 已建立分類", id, "uk");
  return id;
}

async function unpublishHandle(token, handle) {
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(handle)}&limit=1`,
  );
  const product = products?.[0];
  if (!product) return;
  if (product.status === "draft") {
    console.log("已下架", handle, product.id);
    return;
  }
  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({ status: "draft" }),
  });
  console.log("📦 已下架舊商品", handle, product.id);
}

async function upsertMergedProduct(token, categoryId, raw) {
  const lineRows = LINES.map((spec) => {
    const rows = collectRows(raw, spec);
    if (!rows.length) throw new Error(`找不到 ${spec.skuLabel}`);
    return { spec, rows };
  });

  for (const { spec, rows } of lineRows) {
    console.log(`\n—— ${spec.telecom} · ${spec.profit}% ——`);
    console.log(`  ← ${spec.skuLabel}（${rows.length} 筆）`);
    const sample = rows.find((r) => r.day === 1) || rows[0];
    if (sample) {
      console.log(
        `  範例 ${sample.day}天 HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}`,
      );
    }
  }

  const allRows = lineRows.flatMap(({ spec, rows }) =>
    rows.map((r) => ({ r, spec })),
  );
  const dayValues = [
    ...new Set(allRows.map(({ r }) => r.daysLabel)),
  ].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const telecomValues = LINES.map((s) => s.telecom);

  const productMeta = {
    type: "esim",
    country: "GB",
    is_native: false,
    plan_kind: "unlimited",
    hot_sale_telecoms: telecomValues,
    carrier_profit_by_carrier: Object.fromEntries(
      LINES.map((s) => [s.telecom, s.profit]),
    ),
    seo_title: "英國 eSIM 吃到飽｜EE／Three／Vodafone／O2｜歐包｜Jeko eSIM",
    seo_description:
      "英國吃到飽 eSIM，英國網路 EE、Three、Vodafone、O2。可選限速約 10Mbps（歐包 36 國、香港 IP）或 FUP 不限流量（歐包 34 國、波蘭 IP）。支援 ChatGPT、TikTok、Gemini。",
    seo_keywords:
      "英國eSIM,London eSIM,EE,Three,Vodafone,O2,吃到飽,FUP,10Mbps,歐洲eSIM,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: Object.fromEntries(
      LINES.map((s) => [s.telecom, s.subtitle]),
    ),
    carrier_specs_by_carrier: Object.fromEntries(
      LINES.map((s) => [
        s.telecom,
        {
          ip_type: s.ipType,
          route_type: "漫遊",
          network: s.networkLabel,
          speed_rule: s.speedRule,
          apn: s.defaultApn,
          apps: "熱點分享,ChatGPT,TikTok,Gemini",
          coverage: s.coverage,
          ekyc: "供應商備註未標示實名",
        },
      ]),
    ),
    overview_notices_by_carrier: Object.fromEntries(
      LINES.map((s) => [
        s.telecom,
        {
          fup_notice: s.fupNotice,
          activation_notice: "建議抵達英國覆蓋範圍後再安裝／啟用 eSIM",
        },
      ]),
    ),
    key_features_by_carrier: {
      ...ukUnlimited10MbpsKeyFeaturesByCarrier(),
      ...ukUnlimitedFupKeyFeaturesByCarrier(),
    },
  };

  const payloadBase = {
    title: TITLE,
    subtitle: `${UK_NETWORKS}｜吃到飽`,
    handle: HANDLE,
    description:
      "英國吃到飽 eSIM，英國可走 EE、Three、Vodafone、O2 4G／5G。兩種方案：限速約 10Mbps（歐包 36 國、香港 IP）與 FUP 不限流量（歐包 34 國、波蘭 IP）。支援 ChatGPT、TikTok、Gemini 與熱點。建議抵達英國覆蓋範圍後再啟用。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: ["吃到飽"] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: [{ id: categoryId }],
  };

  const variants = allRows.map(({ r, spec }) => toVariant(r, spec));

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
        "合併兩條線路變體請執行：HKD_TO_TWD=4.5 node scripts/create-uk-unlimited-products.mjs --rebuild",
      );
      return product;
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

  console.log(`前台: /product/uk/${HANDLE}/`);
  console.log(`變體數: ${variants.length}（電信 ${telecomValues.join("、")}）`);
  return product;
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD}`);
  const raw = await fetchPlans();
  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  const categoryId = await ensureCategory(token);
  await unpublishHandle(token, OLD_10MBPS_HANDLE);
  await upsertMergedProduct(token, categoryId, raw);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
