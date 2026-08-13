/**
 * 建立「台灣 總量型 eSIM - 無需實名認證」
 *   1) 中華電信 ← Taiwan-Total*GB-*-D0（3HK、No eKYC 明文、用完斷網）
 *   2) 台灣大哥大 / 中華電信 ← Taiwan-Total*GB-*-A1/A2（e-ideas 雙網、高速後 128kbps）
 * 利潤 75%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-taiwan-total-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-taiwan-total-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  TW_TELECOM_CHT,
  TW_TELECOM_DUAL,
  taiwanTotalKeyFeaturesByCarrier,
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

const HANDLE = "taiwan-total-esim";
const TITLE = "台灣 總量型 eSIM - 無需實名認證";
const TELECOM_CHT = TW_TELECOM_CHT;
const TELECOM_DUAL = TW_TELECOM_DUAL;
const PROFIT = 75;
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
  `${SITE_ORIGIN}/images/${encodeURIComponent("分類eSIM-台灣.png")}`;

const SPEED_RULE_CHT = "總量高速額度用完斷網（非降速吃到飽）";
const SPEED_RULE_DUAL = "總量高速用完後降速約 128kbps 持續使用";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

function parseDataLabel(name) {
  const m = String(name || "").match(/Total(\d+)\s*GB/i);
  return m ? `${m[1]}GB` : "";
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

function collectFamily(raw, pred, telecom, defaults) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!pred(name)) continue;
    const day = Number(p.day) || 0;
    const data = parseDataLabel(name);
    if (!day || !data) continue;
    const hkd = Number(p.price) || 0;
    const key = `${telecom}|${day}|${data}`;
    const prev = map.get(key);
    if (prev && hkd >= prev.price_hkd) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    map.set(key, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom,
      kind: defaults.kind,
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
    });
  }
  return [...map.values()];
}

function collectRows(raw) {
  const cht = collectFamily(
    raw,
    (name) => /^Taiwan-Total\d+GB-\d+-D0$/i.test(name),
    TELECOM_CHT,
    {
      kind: "d0",
      apn: "mobile.three.com.hk",
      networks: "TW:Chunghwa[4G;5G]|",
      rule: "terminate",
      ip: "HK,SG",
    },
  );
  const dual = collectFamily(
    raw,
    (name) => /^Taiwan-Total\d+GB-\d+-A[12]$/i.test(name),
    TELECOM_DUAL,
    {
      kind: "dual",
      apn: "e-ideas",
      networks: "TW:Taiwan Mobile[4G;LTE;5G],Chunghwa[4G;LTE;5G]|",
      rule: "unlimited 128kbps",
      ip: "SG",
    },
  );
  return [...cht, ...dual].sort(
    (a, b) =>
      a.day - b.day ||
      parseInt(a.data, 10) - parseInt(b.data, 10) ||
      String(a.telecom).localeCompare(String(b.telecom), "zh-TW") ||
      String(a.sku).localeCompare(String(b.sku)),
  );
}

function toVariant(r) {
  const isDual = r.kind === "dual";
  const speedRule = isDual ? SPEED_RULE_DUAL : SPEED_RULE_CHT;
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
      plan_kind: "total",
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
      throttle_kind: isDual ? "128kbps" : "terminate",
      ip: r.ip,
      ekyc: !isDual,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: isDual ? "台灣大哥大 / 中華電信 4G/5G" : "中華電信 4G/5G",
        ip_type: isDual ? "新加坡 IP" : "香港／新加坡 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: isDual,
        tiktok: isDual,
        gemini: true,
        ekyc: !isDual,
        speed_rule: `${r.data}；${speedRule}`,
        coverage: "台灣",
        apps: isDual
          ? "支援熱點、ChatGPT、TikTok、Gemini"
          : "支援熱點；ChatGPT／TikTok 可能受限（香港 IP）",
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
  console.log(`  ${TELECOM_CHT} ← Taiwan-Total*-D0`);
  console.log(`  ${TELECOM_DUAL} ← Taiwan-Total*-A1/A2`);

  const rows = collectRows(await fetchPlans());
  const rowsCht = rows.filter((r) => r.kind === "d0");
  const rowsDual = rows.filter((r) => r.kind === "dual");
  if (!rowsCht.length) throw new Error("找不到 Taiwan-Total*GB-*-D0");
  if (!rowsDual.length) throw new Error("找不到 Taiwan-Total*GB-*-A1/A2");

  for (const r of rows.filter((x) => x.day === 3 && /^(3|5)GB$/.test(x.data))) {
    console.log(
      `  [${r.telecom}] ${r.data} ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}`,
    );
  }
  console.log(`共 ${rowsCht.length} + ${rowsDual.length} = ${rows.length} 筆`);

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = [...new Set(rows.map((r) => r.data))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [TELECOM_CHT, TELECOM_DUAL];

  const productMeta = {
    type: "esim",
    country: "TW",
    is_native: false,
    plan_kind: "total",
    no_ekyc: true,
    hot_sale_telecoms: [TELECOM_DUAL],
    carrier_profit_by_carrier: {
      [TELECOM_CHT]: PROFIT,
      [TELECOM_DUAL]: PROFIT,
    },
    seo_title: "台灣 eSIM 總量型｜中華電信／雙網｜無需實名認證｜Jeko eSIM",
    seo_description:
      "台灣總量型 eSIM：中華電信 5G（明文無需實名、用完斷網）或台灣大哥大／中華電信雙網（高速後 128kbps、支援 TikTok／GPT）。",
    seo_keywords:
      "台灣eSIM,總量型,中華電信,台灣大哥大,5G,無需實名,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_CHT]: "中華電信 5G｜無需實名（明文）｜總量高速用完斷網",
      [TELECOM_DUAL]: "雙網 5G｜台灣大哥大／中華電信｜高速後 128kbps｜TikTok／GPT",
    },
    carrier_specs_by_carrier: {
      [TELECOM_CHT]: {
        ip_type: "香港／新加坡 IP",
        route_type: "漫遊",
        network: "中華電信 4G/5G",
        speed_rule: SPEED_RULE_CHT,
        apn: "mobile.three.com.hk",
        apps: "支援熱點；ChatGPT／TikTok 可能受限",
        coverage: "台灣",
        ekyc: "無需實名認證（API 明文）",
      },
      [TELECOM_DUAL]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊",
        network: "台灣大哥大 / 中華電信 4G/5G",
        speed_rule: SPEED_RULE_DUAL,
        apn: "e-ideas",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        coverage: "台灣",
        ekyc: "供應商備註未標示實名（Support Tiktok & GPT）",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM_CHT]: {
        fup_notice:
          "無需實名認證（API 明文 No ekyc needed）。總量型：高速額度用完後斷網。中華電信 4G／5G。計日以台灣時間 00:00（UTC+8）為準。ChatGPT／TikTok 可能受限。",
        activation_notice: "建議抵達台灣後再安裝／啟用 eSIM",
      },
      [TELECOM_DUAL]: {
        fup_notice:
          "雙網（台灣大哥大／中華電信）。總量高速用完後降速約 128kbps 可持續使用。新加坡 IP，標示支援 TikTok／ChatGPT。供應商備註未另行標示實名。",
        activation_notice: "建議抵達台灣後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: taiwanTotalKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "中華電信｜台灣大哥大／中華電信雙網｜總量型｜75%",
    handle: HANDLE,
    description:
      "台灣總量型 eSIM，兩種電信可選：中華電信 5G（API 明文無需實名，高速用完斷網）；台灣大哥大／中華電信雙網（高速用完後約 128kbps，支援 TikTok／ChatGPT）。流量 1GB～60GB、天數 3～60 天依變體而定。建議抵達台灣後再啟用。",
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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-taiwan-total-product.mjs --rebuild",
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
  const sCht = rows.find(
    (r) => r.kind === "d0" && r.day === 3 && r.data === "3GB",
  );
  const sDual = rows.find(
    (r) => r.kind === "dual" && r.day === 3 && r.data === "3GB",
  );
  if (sCht) {
    console.log(
      `範例 中華電信 3GB 3天: HKD ${sCht.price_hkd} → cost NT$${sCht.cost_twd} → 售價 NT$${sCht.retail_twd}（75%）`,
    );
  }
  if (sDual) {
    console.log(
      `範例 雙網 3GB 3天: HKD ${sDual.price_hkd} → cost NT$${sDual.cost_twd} → 售價 NT$${sDual.retail_twd}（75%）`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
