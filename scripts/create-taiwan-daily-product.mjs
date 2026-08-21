/**
 * 建立「台灣 每日型 eSIM - 無需實名認證」
 *   1) 台灣大哥大 ← Taiwan(T+C)-Daily*-(A0|A1)（128kbps，缺 A0 用 A1）
 *   2) 台灣大哥大 5Mbps續航 ← Taiwan(T+C)-Daily1GB-*-5mbps-A0
 * 皆明文 No ekyc needed、e-ideas、新加坡 IP、利潤 95%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-taiwan-daily-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-taiwan-daily-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  TW_TELECOM_TWM,
  TW_TELECOM_TWM_5,
  taiwanDailyKeyFeaturesByCarrier,
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

const HANDLE = "taiwan-daily-esim";
const TITLE = "台灣 每日型 eSIM - 無需實名認證";
const TELECOM = TW_TELECOM_TWM;
const TELECOM_5 = TW_TELECOM_TWM_5;
const PROFIT = 95;
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

const SPEED_128 = "每日高速用完後降速約 128kbps 持續使用";
const SPEED_5 = "每日 1GB 高速後限速約 5Mbps 持續使用";

const DATA_ORDER = [
  "每日 500MB",
  "每日 1GB",
  "每日 1GB（5Mbps續航）",
  "每日 2GB",
  "每日 3GB",
];

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

function hasNoEkyc(p) {
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
  return /no\s*e-?kyc|no ekyc|無需\s*e-?kyc|不需\s*e-?kyc|無需.*實名|不需.*實名|not\s*(require|needed).*e-?kyc|ekyc not (required|needed)|no real[- ]?name/i.test(
    notes,
  );
}

function parseDailyLabel(name, is5Mbps) {
  if (is5Mbps) return "每日 1GB（5Mbps續航）";
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

function preferSku(prev, name, hkd) {
  if (!prev) return true;
  const prevA0 = /-A0$/i.test(prev.sku);
  const newA0 = /-A0$/i.test(name);
  if (newA0 && !prevA0) return true;
  if (prevA0 === newA0 && hkd < prev.price_hkd) return true;
  return false;
}

function collectFamily(raw, pred, telecom, is5Mbps) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!pred(name)) continue;
    if (!hasNoEkyc(p)) continue;
    const day = Number(p.day) || 0;
    const data = parseDailyLabel(name, is5Mbps);
    if (!day || !data) continue;
    const hkd = Number(p.price) || 0;
    const key = `${day}|${data}`;
    const prev = map.get(key);
    if (!preferSku(prev, name, hkd)) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    map.set(key, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom,
      kind: is5Mbps ? "5mbps" : "128kbps",
      day,
      daysLabel: `${day}天`,
      data,
      price_hkd: hkd,
      cost_twd: cost,
      retail_twd: retailFromCost(cost),
      apn: String(p.apn || "e-ideas").trim(),
      networks: p.networks || p.operator || "TW:Taiwan Mobile[4G;LTE;5G]|",
      rule_desc: p.rule_desc || (is5Mbps ? "unlimited 5mbps" : "unlimited 128kbps"),
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || "SG").trim(),
      speed_rule: is5Mbps ? SPEED_5 : SPEED_128,
    });
  }
  return [...map.values()];
}

function collectRows(raw) {
  const std = collectFamily(
    raw,
    (name) =>
      /^Taiwan\(T\+C\)-Daily\d+(?:GB|MB)-\d+-A[01]$/i.test(name) &&
      !/5mbps/i.test(name),
    TELECOM,
    false,
  );
  const fup5 = collectFamily(
    raw,
    (name) => /^Taiwan\(T\+C\)-Daily1GB-\d+-5mbps-A0$/i.test(name),
    TELECOM_5,
    true,
  );
  const dataRank = (label) => {
    const i = DATA_ORDER.indexOf(String(label || ""));
    return i >= 0 ? i : 99;
  };
  return [...std, ...fup5].sort(
    (a, b) =>
      (a.kind === "5mbps" ? 1 : 0) - (b.kind === "5mbps" ? 1 : 0) ||
      dataRank(a.data) - dataRank(b.data) ||
      a.day - b.day,
  );
}

function toVariant(r) {
  const is5 = r.kind === "5mbps";
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
      plan_kind: "daily",
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
      throttle_kind: is5 ? "5mbps" : "128kbps",
      ip: r.ip,
      ekyc: false,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: "台灣大哥大 4G/5G",
        ip_type: "新加坡 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        ekyc: false,
        speed_rule: `${r.data}；${r.speed_rule}`,
        coverage: "台灣",
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
  console.log(`  ${TELECOM} ← Taiwan(T+C)-Daily*-A0/A1（128kbps）`);
  console.log(`  ${TELECOM_5} ← Taiwan(T+C)-Daily1GB-*-5mbps-A0`);

  const rows = collectRows(await fetchPlans());
  const rowsStd = rows.filter((r) => r.kind === "128kbps");
  const rows5 = rows.filter((r) => r.kind === "5mbps");
  if (!rowsStd.length) throw new Error("找不到 Taiwan(T+C)-Daily* A0/A1（無需實名）");
  if (!rows5.length) throw new Error("找不到 Taiwan(T+C)-Daily1GB-*-5mbps-A0");

  const samples = [
    rows.find((r) => r.kind === "128kbps" && r.day === 1 && r.data === "每日 500MB"),
    rows.find((r) => r.kind === "128kbps" && r.day === 1 && r.data === "每日 1GB"),
    rows.find((r) => r.kind === "128kbps" && r.day === 1 && r.data === "每日 2GB"),
    rows.find((r) => r.kind === "5mbps" && r.day === 1),
  ].filter(Boolean);
  for (const r of samples) {
    console.log(
      `  [${r.telecom}] ${r.data} ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}`,
    );
  }
  console.log(`共 128kbps ${rowsStd.length} + 5Mbps ${rows5.length} = ${rows.length} 筆`);

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) => rows.some((r) => r.data === d));
  const telecomValues = [TELECOM, TELECOM_5];

  const productMeta = {
    type: "esim",
    country: "TW",
    is_native: false,
    plan_kind: "daily",
    no_ekyc: true,
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: {
      [TELECOM]: PROFIT,
      [TELECOM_5]: PROFIT,
    },
    seo_title: "台灣 eSIM 每日型｜台灣大哥大 5G｜無需實名認證｜Jeko eSIM",
    seo_description:
      "台灣每日型 eSIM，台灣大哥大 5G，無需實名認證。每日 500MB～3GB，高速後 128kbps 或 5Mbps 續航；新加坡 IP，支援 TikTok／ChatGPT。",
    seo_keywords:
      "台灣eSIM,每日型,台灣大哥大,5G,無需實名,TikTok,ChatGPT,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]: "台灣大哥大 5G｜無需實名｜每日高速後約 128kbps｜TikTok／GPT",
      [TELECOM_5]: "台灣大哥大 5G｜無需實名｜每日 1GB 高速後約 5Mbps｜TikTok／GPT",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊",
        network: "台灣大哥大 4G/5G",
        speed_rule: SPEED_128,
        apn: "e-ideas",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        coverage: "台灣",
        ekyc: "無需實名認證（API 明文 No ekyc needed）",
      },
      [TELECOM_5]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊",
        network: "台灣大哥大 4G/5G",
        speed_rule: SPEED_5,
        apn: "e-ideas",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        coverage: "台灣",
        ekyc: "無需實名認證（API 明文 No ekyc needed）",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "無需實名認證（API 明文 No ekyc needed）。每日高速用完後降速約 128kbps。台灣大哥大 4G／5G，新加坡 IP，支援 TikTok／ChatGPT。計日以台灣時間 00:00（UTC+8）為準。",
        activation_notice: "建議抵達台灣後再安裝／啟用 eSIM",
      },
      [TELECOM_5]: {
        fup_notice:
          "無需實名認證。每日 1GB 高速後約 5Mbps 續航。台灣大哥大 4G／5G，新加坡 IP，支援 TikTok／ChatGPT。計日以台灣時間 00:00（UTC+8）為準。",
        activation_notice: "建議抵達台灣後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: taiwanDailyKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "台灣大哥大 5G｜無需實名認證｜每日型｜95%",
    handle: HANDLE,
    description:
      "台灣每日型 eSIM，走台灣大哥大 4G／5G，無需實名認證（No eKYC）。可選每日 500MB／1GB／2GB／3GB（高速後約 128kbps），或每日 1GB 高速後約 5Mbps 續航。新加坡 IP，支援 TikTok／ChatGPT／Gemini。流量與天數以台灣時間 00:00 重置。建議抵達台灣後再啟用。",
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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-taiwan-daily-product.mjs --rebuild",
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
  console.log(`電信: ${telecomValues.join(" | ")}`);
  for (const r of samples) {
    console.log(
      `範例 ${r.telecom} ${r.data} ${r.day}天: HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（95%）`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
