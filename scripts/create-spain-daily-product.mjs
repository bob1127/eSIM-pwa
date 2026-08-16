/**
 * 建立「西班牙 每日型 eSIM」（單一電信變體）
 *   Orange + ← EU 32-Daily*-A0（FR IP、orange、每日高速後 128kbps、150%）
 *   支援 TikTok、Gemini
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-spain-daily-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ES_TELECOM_32_OR,
  esDailyKeyFeaturesByCarrier,
} from "../content/product-detailed/spain-key-features.js";
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

const HANDLE = "spain-daily-esim";
const TITLE = "西班牙 每日型 eSIM";
const TELECOM = ES_TELECOM_32_OR;
const PROFIT = 150;
const PROFIT_LONG = 150;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");
const THUMB =
  process.env.ES_PRODUCT_THUMB ||
  `${SITE_ORIGIN}/images/${encodeURIComponent("分類eSIM-西班牙.png")}`;

const SPEED_RULE = "每日高速用完後降速約 128kbps 持續使用，隔日重置";
const NETWORK_LABEL = "Orange 4G/5G";
const COVERAGE = "西班牙";
const DATA_ORDER = ["每日 500MB", "每日 1GB", "每日 2GB", "每日 3GB"];

function profitForDay(day) {
  return Number(day) >= 60 ? PROFIT_LONG : PROFIT;
}

function retailFromCost(costTwd, profit) {
  return Math.ceil((costTwd * (1 + profit / 100)) / 10) * 10 - 1;
}

function parseDailyLabel(name) {
  const m = String(name || "").match(/Daily(\d+)\s*(GB|MB)/i);
  if (!m) return "";
  return `每日 ${m[1]}${m[2].toUpperCase()}`;
}

function is128kbps(p) {
  const blob = `${p.rule_desc || ""} ${p.speed_desc || ""} ${p.special_desc || ""}`.toLowerCase();
  return /128\s*kbps/.test(blob);
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

function collectRows(raw) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!/^EU[\s-]*32-Daily\d+(?:GB|MB)-\d+-A0$/i.test(name)) continue;
    if (!is128kbps(p)) continue;
    const day = Number(p.day) || 0;
    const data = parseDailyLabel(name);
    if (!day || !data || !DATA_ORDER.includes(data)) continue;
    const hkd = Number(p.price) || 0;
    const prev = map.get(`${day}|${data}`);
    if (prev && hkd >= prev.price_hkd) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    const profit = profitForDay(day);
    map.set(`${day}|${data}`, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom: TELECOM,
      day,
      daysLabel: `${day}天`,
      data,
      price_hkd: hkd,
      cost_twd: cost,
      profit_percent: profit,
      retail_twd: retailFromCost(cost, profit),
      apn: String(p.apn || "orange").trim(),
      networks: p.networks || p.operator || "",
      rule_desc: p.rule_desc || "unlimited 128kbps",
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || "FR").trim(),
    });
  }
  const dataRank = (label) => {
    const i = DATA_ORDER.indexOf(String(label || ""));
    return i >= 0 ? i : 99;
  };
  return [...map.values()].sort(
    (a, b) => a.day - b.day || dataRank(a.data) - dataRank(b.data),
  );
}

function toVariant(r) {
  return {
    title: `${r.telecom} · ${r.daysLabel} · ${r.data}`,
    sku: `${r.sku}#esd32`,
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
      plan_kind: "daily",
      data: r.data,
      data_amount: r.data,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: r.cost_twd,
      profit_percent: r.profit_percent,
      profit_margin: `${r.profit_percent}%`,
      profit_rate: `${r.profit_percent}%`,
      margin: 1 + r.profit_percent / 100,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      speed_desc: r.speed_desc,
      special_desc: r.special_desc,
      throttle_kind: "128kbps",
      ip: r.ip,
      is_native: false,
      ekyc: null,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: NETWORK_LABEL,
        ip_type: "法國 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: false,
        tiktok: true,
        gemini: true,
        ekyc: null,
        speed_rule: `${r.data}；${SPEED_RULE}`,
        coverage: COVERAGE,
        apps: "熱點分享,TikTok,Gemini",
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
      c.handle === "spain" ||
      c.handle === "es" ||
      /^西班牙$/.test(String(c.name || "")),
  );
  if (existing) {
    console.log("📂 分類", existing.id, existing.handle, existing.name);
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: "西班牙",
      handle: "spain",
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  console.log("🆕 已建立分類", id, "spain");
  return id;
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD} · ${TELECOM} ${PROFIT}%`);
  console.log(`  ${TELECOM} ← EU-32-Daily*-A0（128kbps）`);

  const rows = collectRows(await fetchPlans());
  if (!rows.length) {
    throw new Error("找不到 EU-32-Daily*-A0（128kbps）");
  }

  const samples = [
    rows.find((r) => r.day === 3 && r.data === "每日 3GB"),
    rows.find((r) => r.day === 1 && r.data === "每日 500MB"),
    rows.find((r) => r.day === 7 && r.data === "每日 1GB"),
    rows.find((r) => r.day === 30 && r.data === "每日 1GB"),
  ].filter(Boolean);
  const seen = new Set();
  for (const r of samples) {
    const k = `${r.day}|${r.data}`;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(
      `  [${r.telecom}] ${r.data} ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（${r.profit_percent}%）`,
    );
  }
  console.log(`共 ${rows.length} 筆`);

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [TELECOM];
  const dataValues = DATA_ORDER.filter((d) => rows.some((r) => r.data === d));

  const productMeta = {
    type: "esim",
    country: "ES",
    is_native: false,
    plan_kind: "daily",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title: "西班牙 eSIM 每日型｜Orange｜Jeko eSIM",
    seo_description:
      "西班牙每日型 eSIM，Orange 4G／5G。可選每日 500MB／1GB／2GB／3GB，高速用完後約 128kbps，隔日重置。支援 TikTok、Gemini。建議抵達西班牙覆蓋範圍後再啟用。",
    seo_keywords:
      "西班牙eSIM,Madrid eSIM,Orange,每日型,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]: "Orange｜每日高速後約 128kbps｜法國 IP",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "法國 IP",
        route_type: "漫遊",
        network: NETWORK_LABEL,
        speed_rule: SPEED_RULE,
        apn: "orange",
        apps: "熱點分享,TikTok,Gemini",
        coverage: COVERAGE,
        ekyc: "供應商備註未標示實名",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "西班牙走 Orange。每日高速用完後降速約 128kbps，隔日重置。出網法國 IP（orange），支援 TikTok／Gemini。地鐵、古蹟室內與鄉村收訊不保證。",
        activation_notice: "建議抵達西班牙覆蓋範圍後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: esDailyKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "Orange｜每日型｜高速後約 128kbps",
    handle: HANDLE,
    description:
      "西班牙每日型 eSIM，走 Orange 4G／5G。可選每日 500MB／1GB／2GB／3GB。每日高速用完後約 128kbps 可持續使用，隔日重置。支援 TikTok、Gemini 與熱點。建議抵達西班牙覆蓋範圍後再啟用。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: dataValues },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
  };

  const variants = rows.map(toVariant);

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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-spain-daily-product.mjs --rebuild",
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
  console.log(`前台: /product/spain/${HANDLE}/`);
  console.log(`Admin: ${MEDUSA_URL}/app/products/${product.id}`);
  console.log(`變體數: ${vs.length}`);
  console.log(`天數: ${dayValues.join(" | ")}`);
  console.log(`流量: ${dataValues.join(" | ")}`);
  console.log(`電信: ${telecomValues.join(" | ")}`);
  for (const r of samples) {
    console.log(
      `範例 ${r.telecom} ${r.data} ${r.day}天: HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（${r.profit_percent}%）`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
