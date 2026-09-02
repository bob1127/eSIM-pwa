/**
 * 建立「巴西 吃到飽 不限流量 eSIM」
 *   VIVO BRAZIL ← Brazil-unlimited-*-B0（波蘭 IP、plus、30%）
 *
 * 用法：
 *   node scripts/create-brazil-unlimited-product.mjs
 *   node scripts/create-brazil-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  BR_TELECOM_VIVO,
  brUnlimitedKeyFeaturesByCarrier,
} from "../content/product-detailed/brazil-key-features.js";
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

const HANDLE = "brazil-unlimited-esim";
const TITLE = "巴西 吃到飽 不限流量 eSIM";
const TELECOM = BR_TELECOM_VIVO;
const DATA = "吃到飽";
const PROFIT = 30;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(
  process.env.HKD_TO_TWD ||
    process.env.ESIM_FX_RATE_HKD ||
    process.env.NEXT_PUBLIC_ESIM_FX_RATE_HKD ||
    4.5,
);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");
const THUMB =
  process.env.BR_PRODUCT_THUMB ||
  `${SITE_ORIGIN}/images/${encodeURIComponent("分類eSIM-多國.png")}`;

const SPEED_RULE = "不限流量吃到飽（依供應商 Fair Use）";
const NETWORK_LABEL = "Vivo Brazil 4G/5G";
const COVERAGE = "巴西";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
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
    if (!/^Brazil-unlimited-\d+-B0$/i.test(name)) continue;
    const day = Number(p.day) || 0;
    if (!day) continue;
    const hkd = Number(p.price) || 0;
    const prev = map.get(day);
    if (prev && hkd >= prev.price_hkd) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    map.set(day, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom: TELECOM,
      day,
      daysLabel: `${day}天`,
      data: DATA,
      price_hkd: hkd,
      cost_twd: cost,
      profit_percent: PROFIT,
      retail_twd: retailFromCost(cost),
      apn: String(p.apn || "plus").trim(),
      networks: p.networks || p.operator || "BR:Vivo Brazil[4G;LTE;5G]|",
      rule_desc: p.rule_desc || "unlimited",
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || "PL").trim(),
    });
  }
  return [...map.values()].sort((a, b) => a.day - b.day);
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
      plan_kind: "unlimited",
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
      throttle_kind: "unlimited",
      ip: r.ip,
      is_native: false,
      ekyc: null,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: NETWORK_LABEL,
        ip_type: "波蘭 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        ekyc: null,
        speed_rule: SPEED_RULE,
        coverage: COVERAGE,
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
      c.handle === "brazil" ||
      c.handle === "br" ||
      c.handle === "brasil" ||
      /^巴西$/.test(String(c.name || "")),
  );
  if (existing) {
    console.log("📂 分類", existing.id, existing.handle, existing.name);
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: "巴西",
      handle: "brazil",
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  console.log("🆕 已建立分類", id, "brazil");
  return id;
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD} · ${TELECOM} ${PROFIT}%`);
  console.log(`  ${TELECOM} ← Brazil-unlimited-*-B0（PL IP · plus）`);

  const rows = collectRows(await fetchPlans());
  if (!rows.length) throw new Error("找不到 Brazil-unlimited-*-B0");

  for (const r of rows) {
    console.log(
      `  [${r.telecom}] ${r.data} ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（${r.profit_percent}%）`,
    );
  }
  console.log(`共 ${rows.length} 筆`);

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );

  const productMeta = {
    type: "esim",
    country: "BR",
    is_native: false,
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title: "巴西 eSIM 吃到飽｜Vivo Brazil｜里約聖保羅｜Jeko eSIM",
    seo_description:
      "巴西吃到飽 eSIM，Vivo Brazil 4G／5G，不限流量。波蘭 IP，支援 ChatGPT、TikTok、Gemini。1／3／5／7／10／15／20／30 天可選。",
    seo_keywords:
      "巴西eSIM,Brazil eSIM,里約eSIM,聖保羅eSIM,Vivo,吃到飽,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]: "Vivo 4G／5G｜不限流量｜波蘭 IP · GPT/Gemini",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "波蘭 IP",
        route_type: "漫遊",
        network: NETWORK_LABEL,
        speed_rule: SPEED_RULE,
        apn: "plus",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        coverage: COVERAGE,
        ekyc: "供應商備註未標示實名",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "Vivo Brazil 漫遊吃到飽。出網波蘭 IP，支援 ChatGPT／TikTok／Gemini。依供應商 Fair Use，偏遠地區收訊不保證。",
        activation_notice: "建議抵達巴西後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: brUnlimitedKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "VIVO BRAZIL｜吃到飽｜波蘭 IP · GPT/Gemini｜30%",
    handle: HANDLE,
    description:
      "巴西吃到飽不限流量 eSIM，走 Vivo Brazil 4G／5G。波蘭 IP（APN plus），支援 ChatGPT、TikTok、Gemini 與熱點。可選 1／3／5／7／10／15／20／30 天。建議抵達巴西後再啟用。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: [DATA] },
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
        "重建變體請執行：node scripts/create-brazil-unlimited-product.mjs --rebuild",
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
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`Handle: ${HANDLE}`);
  console.log(`前台: /product/brazil/${HANDLE}/`);
  console.log(`Admin: ${MEDUSA_URL}/app/products/${product.id}`);
  console.log(`變體數: ${(check.product?.variants || []).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
