/**
 * 建立「台灣 eSIM - 需實名認證」
 * 同一商品用「電信商」選項承載三種方案（皆 70%、中華電信 cmhk、明文 eKYC）：
 *   1) 總量型 ← Taiwan-Total*GB-*-B0（缺檔時補 B1，用完斷網）
 *   2) 每日型 ← Taiwan-Daily*-B0（高速後約 384kbps）
 *   3) 吃到飽 ← Taiwan-unlimited-*-B0
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-taiwan-ekyc-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-taiwan-ekyc-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  TW_EKYC_DAILY,
  TW_EKYC_TOTAL,
  TW_EKYC_UNLIM,
  TW_EKYC_URL,
  taiwanEkycKeyFeaturesByCarrier,
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

const HANDLE = "taiwan-ekyc-esim";
const TITLE = "台灣 eSIM - 需實名認證";
const TYPE_TOTAL = TW_EKYC_TOTAL;
const TYPE_DAILY = TW_EKYC_DAILY;
const TYPE_UNLIM = TW_EKYC_UNLIM;
const PROFIT = 70;
const MARGIN = 1 + PROFIT / 100;
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

const SPEED_TOTAL = "總量高速額度用完斷網（非降速吃到飽）";
const SPEED_DAILY = "每日高速用完後降速約 384kbps 持續使用";
const SPEED_UNLIM = "吃到飽（依供應商公平使用政策 FUP）";
const DATA_UNLIM = "無限流量";

const DATA_ORDER_TOTAL = [
  "總量 1GB",
  "總量 3GB",
  "總量 5GB",
  "總量 10GB",
  "總量 20GB",
  "總量 30GB",
  "總量 50GB",
];
const DATA_ORDER_DAILY = ["每日 500MB", "每日 1GB", "每日 2GB", "每日 3GB"];
const DATA_ORDER_UNLIM = [DATA_UNLIM];

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

function hasEkycRequired(p) {
  const notes = [
    p.speed_desc,
    p.special_desc,
    p.rule_desc,
    p.tags,
    p.remark,
    p.note,
    p.desc,
  ]
    .map((x) => String(x || ""))
    .join(" ");
  const noHit =
    /no\s*e-?kyc|no ekyc|無需\s*e-?kyc|不需\s*e-?kyc|無需.*實名|不需.*實名|not\s*(require|needed).*e-?kyc|ekyc not (required|needed)|no real[- ]?name/i.test(
      notes,
    );
  const yesHit =
    /e-?kyc required|require[ds]?\s*e-?kyc|實名認[證証]|real[- ]?name authentication|ekyc required/i.test(
      notes,
    );
  return yesHit && !noHit;
}

function parseTotalLabel(name) {
  const m = String(name || "").match(/Total(\d+)\s*GB/i);
  return m ? `總量 ${m[1]}GB` : "";
}

function parseDailyLabel(name) {
  const m = String(name || "").match(/Daily(\d+)\s*(GB|MB)/i);
  if (!m) return "";
  return `每日 ${m[1]}${m[2].toUpperCase()}`;
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

function betterThan(prev, name, hkd) {
  if (!prev) return true;
  const prevB0 = /-B0$/i.test(prev.sku);
  const newB0 = /-B0$/i.test(name);
  if (newB0 && !prevB0) return true;
  if (prevB0 === newB0 && hkd < prev.price_hkd) return true;
  return false;
}

function collectKind(raw, pred, parseData, telecom, planKind, defaults) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!pred(name)) continue;
    if (!hasEkycRequired(p)) continue;
    const day = Number(p.day) || 0;
    const data = parseData(name) || defaults.data;
    if (!day || !data) continue;
    const hkd = Number(p.price) || 0;
    const key = `${day}|${data}`;
    const prev = map.get(key);
    if (!betterThan(prev, name, hkd)) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    map.set(key, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom,
      plan_kind: planKind,
      day,
      daysLabel: `${day}天`,
      data,
      price_hkd: hkd,
      cost_twd: cost,
      retail_twd: retailFromCost(cost),
      apn: String(p.apn || defaults.apn).trim(),
      networks: p.networks || p.operator || defaults.networks,
      rule_desc: p.rule_desc || defaults.rule,
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || defaults.ip).trim(),
      speed_rule: defaults.speed_rule,
    });
  }
  return [...map.values()];
}

function collectRows(raw) {
  const total = collectKind(
    raw,
    (name) => /^Taiwan-Total\d+GB-\d+-B[01]$/i.test(name),
    parseTotalLabel,
    TYPE_TOTAL,
    "total",
    {
      apn: "cmhk",
      networks: "TW:Chunghwa[4G;LTE;5G]|",
      rule: "terminate",
      ip: "HK",
      speed_rule: SPEED_TOTAL,
    },
  );
  const daily = collectKind(
    raw,
    (name) => /^Taiwan-Daily\d+(?:GB|MB)-\d+-B0$/i.test(name),
    parseDailyLabel,
    TYPE_DAILY,
    "daily",
    {
      apn: "cmhk",
      networks: "TW:Chunghwa[4G;LTE;5G]|",
      rule: "unlimited 384kbps",
      ip: "HK",
      speed_rule: SPEED_DAILY,
    },
  );
  const unlim = collectKind(
    raw,
    (name) => /^Taiwan-unlimited-\d+-B0$/i.test(name) && !/5mbps/i.test(name),
    () => DATA_UNLIM,
    TYPE_UNLIM,
    "unlimited",
    {
      data: DATA_UNLIM,
      apn: "cmhk",
      networks: "TW:Chunghwa[4G;LTE;5G]|",
      rule: "unlimited",
      ip: "HK",
      speed_rule: SPEED_UNLIM,
    },
  );

  const typeRank = (t) =>
    t === TYPE_TOTAL ? 0 : t === TYPE_DAILY ? 1 : t === TYPE_UNLIM ? 2 : 9;
  const dataRank = (label) => {
    const all = [...DATA_ORDER_TOTAL, ...DATA_ORDER_DAILY, ...DATA_ORDER_UNLIM];
    const i = all.indexOf(String(label || ""));
    return i >= 0 ? i : 99;
  };

  return [...total, ...daily, ...unlim].sort(
    (a, b) =>
      typeRank(a.telecom) - typeRank(b.telecom) ||
      dataRank(a.data) - dataRank(b.data) ||
      a.day - b.day,
  );
}

function toVariant(r) {
  return {
    title: `${r.telecom} · ${r.daysLabel} · ${r.data}`,
    sku: r.sku,
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
      plan_kind: r.plan_kind,
      data: r.data,
      data_amount: r.data,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: r.cost_twd,
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: MARGIN,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      speed_desc: r.speed_desc,
      special_desc: r.special_desc,
      throttle_kind:
        r.plan_kind === "total"
          ? "terminate"
          : r.plan_kind === "daily"
            ? "384kbps"
            : "unlimited",
      ip: r.ip,
      ekyc: true,
      ekyc_url: TW_EKYC_URL,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: "中華電信 4G/5G",
        ip_type: "香港 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: false,
        tiktok: false,
        gemini: true,
        ekyc: true,
        speed_rule: `${r.data}；${r.speed_rule}`,
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
  console.log(`  ${TYPE_TOTAL} ← Taiwan-Total*-B0（缺檔補 B1）`);
  console.log(`  ${TYPE_DAILY} ← Taiwan-Daily*-B0`);
  console.log(`  ${TYPE_UNLIM} ← Taiwan-unlimited-*-B0`);

  const rows = collectRows(await fetchPlans());
  const rowsTotal = rows.filter((r) => r.plan_kind === "total");
  const rowsDaily = rows.filter((r) => r.plan_kind === "daily");
  const rowsUnlim = rows.filter((r) => r.plan_kind === "unlimited");
  if (!rowsTotal.length) throw new Error("找不到 Taiwan-Total*-B0/B1（需實名）");
  if (!rowsDaily.length) throw new Error("找不到 Taiwan-Daily*-B0（需實名）");
  if (!rowsUnlim.length) throw new Error("找不到 Taiwan-unlimited-*-B0（需實名）");

  const samples = [
    rows.find((r) => r.plan_kind === "total" && r.day === 3 && r.data === "總量 3GB"),
    rows.find((r) => r.plan_kind === "daily" && r.day === 7 && r.data === "每日 1GB"),
    rows.find((r) => r.plan_kind === "unlimited" && r.day === 7),
  ].filter(Boolean);
  for (const r of samples) {
    console.log(
      `  [${r.telecom}] ${r.data} ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}`,
    );
  }
  console.log(
    `共 總量 ${rowsTotal.length} + 每日 ${rowsDaily.length} + 吃到飽 ${rowsUnlim.length} = ${rows.length} 筆`,
  );

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = [
    ...DATA_ORDER_TOTAL,
    ...DATA_ORDER_DAILY,
    ...DATA_ORDER_UNLIM,
  ].filter((d) => rows.some((r) => r.data === d));
  const telecomValues = [TYPE_TOTAL, TYPE_DAILY, TYPE_UNLIM];

  const productMeta = {
    type: "esim",
    country: "TW",
    is_native: false,
    plan_kind: "mixed",
    no_ekyc: false,
    requires_ekyc: true,
    ekyc_url: TW_EKYC_URL,
    hot_sale_telecoms: [TYPE_UNLIM],
    carrier_profit_by_carrier: {
      [TYPE_TOTAL]: PROFIT,
      [TYPE_DAILY]: PROFIT,
      [TYPE_UNLIM]: PROFIT,
    },
    seo_title: "台灣 eSIM 需實名認證｜總量／每日／吃到飽｜中華電信 5G｜Jeko eSIM",
    seo_description:
      "台灣需實名 eSIM（API 明文 eKYC required），中華電信 5G。可選總量型（用完斷網）、每日型（高速後 384kbps）或吃到飽。",
    seo_keywords:
      "台灣eSIM,需實名,實名認證,中華電信,5G,總量型,每日型,吃到飽,Jeko eSIM",
    subtitle_by_carrier: {
      [TYPE_TOTAL]: "中華電信 5G｜需實名｜總量高速用完斷網",
      [TYPE_DAILY]: "中華電信 5G｜需實名｜每日高速後約 384kbps",
      [TYPE_UNLIM]: "中華電信 5G｜需實名｜吃到飽",
    },
    carrier_specs_by_carrier: {
      [TYPE_TOTAL]: {
        ip_type: "香港 IP",
        route_type: "漫遊",
        network: "中華電信 4G/5G",
        speed_rule: SPEED_TOTAL,
        apn: "cmhk",
        apps: "支援熱點；ChatGPT／TikTok 可能受限",
        coverage: "台灣",
        ekyc: "需實名認證（API 明文 eKYC required）",
        ekyc_url: TW_EKYC_URL,
      },
      [TYPE_DAILY]: {
        ip_type: "香港 IP",
        route_type: "漫遊",
        network: "中華電信 4G/5G",
        speed_rule: SPEED_DAILY,
        apn: "cmhk",
        apps: "支援熱點；ChatGPT／TikTok 可能受限",
        coverage: "台灣",
        ekyc: "需實名認證（API 明文 eKYC required）",
        ekyc_url: TW_EKYC_URL,
      },
      [TYPE_UNLIM]: {
        ip_type: "香港 IP",
        route_type: "漫遊",
        network: "中華電信 4G/5G",
        speed_rule: SPEED_UNLIM,
        apn: "cmhk",
        apps: "支援熱點；ChatGPT／TikTok 可能受限",
        coverage: "台灣",
        ekyc: "需實名認證（API 明文 eKYC required）",
        ekyc_url: TW_EKYC_URL,
      },
    },
    overview_notices_by_carrier: {
      [TYPE_TOTAL]: {
        fup_notice:
          "需實名認證（API 明文 ekyc required）。總量型：高速額度用完後斷網。中華電信 4G／5G，APN cmhk，香港 IP。ChatGPT／TikTok 可能受限。",
        activation_notice: `請先完成實名再啟用：${TW_EKYC_URL}`,
      },
      [TYPE_DAILY]: {
        fup_notice:
          "需實名認證。每日高速用完後降速約 384kbps。計日以台灣時間 00:00（UTC+8）為準。中華電信 4G／5G，APN cmhk。",
        activation_notice: `請先完成實名再啟用：${TW_EKYC_URL}`,
      },
      [TYPE_UNLIM]: {
        fup_notice:
          "需實名認證。吃到飽依供應商 FUP。中華電信 4G／5G，APN cmhk，香港 IP。ChatGPT／TikTok 可能受限。",
        activation_notice: `請先完成實名再啟用：${TW_EKYC_URL}`,
      },
    },
    key_features_by_carrier: taiwanEkycKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "中華電信 5G｜需實名認證｜總量／每日／吃到飽｜70%",
    handle: HANDLE,
    description:
      "台灣需實名 eSIM，走中華電信 4G／5G（API 明文 ekyc required）。三種方案可選：總量型（高速用完斷網）、每日型（高速用完後約 384kbps）、吃到飽。出網為香港 IP（APN cmhk）。購買後請先完成供應商實名認證再啟用。",
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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-taiwan-ekyc-product.mjs --rebuild",
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
  console.log(`天數: ${dayValues.join(" | ")}`);
  console.log(`流量: ${dataValues.join(" | ")}`);
  console.log(`方案: ${telecomValues.join(" | ")}`);
  for (const r of samples) {
    console.log(
      `範例 ${r.telecom} ${r.data} ${r.day}天: HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（70%）`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
