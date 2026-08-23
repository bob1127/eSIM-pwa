/**
 * 建立「印尼 eSIM 吃到飽」— 僅收 GPT✅／TikTok✅ 線路
 *   Telkomsel / XL ← Indonesia -unlimited-*-A0（SG IP、e-ideas、Support Tiktok ChatGPT）
 *   不含 Indonesia-unlimited-*-B0/B2（HK IP／cmhk，GPT❌ TikTok❌）
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-indonesia-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";
import {
  telkomselXlKeyFeatures,
  ID_TELECOM_TELKOMSEL_XL,
} from "../content/product-detailed/indonesia-key-features.js";

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

const HANDLE = "indonesia-unlimited-esim";
const TELECOM = ID_TELECOM_TELKOMSEL_XL;
const DATA_AMOUNT = "無限流量";
const PROFIT = 60;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const THUMB =
  process.env.INDONESIA_PRODUCT_THUMB ||
  "/images/sim/產品/印尼esim.png";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * (1 + PROFIT / 100)) / 10) * 10 - 1;
}

/** 供應商 SKU 正規化：Indonesia -unlimited-5-A0 → Indonesia-unlimited-5-A0 */
function normalizeSku(raw) {
  return String(raw || "")
    .trim()
    .replace(/^Indonesia\s+-/, "Indonesia-");
}

/** 僅收 A0：SG IP + e-ideas，備註含 TikTok／ChatGPT */
function isGptTikTokUnlimitedPlan(p) {
  const rawName = String(p.name || p.channel_dataplan_name || "").trim();
  if (!/^Indonesia\s+-unlimited-\d+-A0$/i.test(rawName)) return false;

  const notes = [
    p.special_desc,
    p.speed_desc,
    p.rule_desc,
    p.remark,
    p.note,
  ]
    .map((x) => String(x || ""))
    .join(" ")
    .toLowerCase();

  const hasAppNote =
    /tiktok/i.test(notes) && /(chatgpt|gpt)/i.test(notes);
  const ip = String(p.ip || "")
    .trim()
    .toUpperCase();
  const apn = String(p.apn || "").toLowerCase();
  const sgLine = ip === "SG" || apn.includes("e-ideas");

  return hasAppNote || sgLine;
}

async function fetchPlans() {
  const urls = [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/list",
    "https://www.jeko-esim.com.tw/api/esim/list",
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(120000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.result || [];
      if (list.length) {
        console.log(`📥 方案目錄 ${list.length} 筆（${url}）`);
        return list;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }
  throw new Error("無法取得方案目錄");
}

function collectRows(raw) {
  const map = new Map();
  for (const p of raw) {
    if (!isGptTikTokUnlimitedPlan(p)) continue;
    const day = Number(p.day) || 0;
    if (!day) continue;

    const rawName = String(p.name || p.channel_dataplan_name || "").trim();
    const sku = normalizeSku(rawName);
    const hkd = Number(p.price) || 0;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    const row = {
      sku,
      plan_id: p.channel_dataplan_id || p.id,
      day,
      price_hkd: hkd,
      cost_twd: cost,
      retail_twd: retailFromCost(cost),
      profit_percent: PROFIT,
      daysLabel: `${day}天`,
      apn: String(p.apn || "e-ideas").trim(),
      networks: String(p.networks || "ID:Telkomsel[4G;LTE;5G],XL[4G;LTE]|"),
      rule_desc: String(p.rule_desc || "unlimited"),
      speed_desc: String(p.speed_desc || p.special_desc || ""),
      ip: String(p.ip || "SG").trim().toUpperCase(),
    };
    map.set(day, row);
  }
  return [...map.values()].sort((a, b) => a.day - b.day);
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

async function ensureCategory(token) {
  const { product_categories: cats } = await admin(
    token,
    "/admin/product-categories?limit=200",
  );
  const existing = (cats || []).find(
    (c) =>
      c.handle === "indonesia" ||
      c.handle === "id" ||
      /^印尼/.test(String(c.name || "")),
  );
  if (existing) {
    console.log("📂 分類", existing.id, existing.handle, existing.name);
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: "印尼",
      handle: "indonesia",
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  console.log("🆕 已建立分類", id, "indonesia");
  return id;
}

function toVariant(row) {
  const speedRule =
    row.speed_desc ||
    "不限流量吃到飽（FUP），支援 ChatGPT／TikTok（新加坡 IP 漫遊）";
  const is5g = /5G/i.test(row.networks || "");
  return {
    title: `${TELECOM} · ${row.daysLabel} · ${DATA_AMOUNT}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: TELECOM,
      數據量: DATA_AMOUNT,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: TELECOM,
      plan_kind: "unlimited",
      data: DATA_AMOUNT,
      data_amount: DATA_AMOUNT,
      days: String(row.day),
      cost_hkd: String(row.price_hkd || ""),
      cost_price: row.cost_twd,
      profit_rate: `${PROFIT}%`,
      profit_percent: PROFIT,
      margin: 1 + PROFIT / 100,
      apn: row.apn,
      networks: row.networks,
      rule_desc: row.rule_desc,
      speed_desc: speedRule,
      throttle_kind: "unlimited",
      ip: row.ip,
      attributes: {
        days: row.day,
        data: DATA_AMOUNT,
        data_amount: DATA_AMOUNT,
        telecom: TELECOM,
        network: is5g
          ? "Telkomsel / XL 4G／5G"
          : "Telkomsel / XL 4G/LTE",
        ip_type: "新加坡IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: speedRule,
        coverage: "印尼",
      },
    },
  };
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD} · ${TELECOM} 利潤 ${PROFIT}%`);
  console.log("  篩選：Indonesia -unlimited-*-A0（GPT✅ TikTok✅）");

  const rows = collectRows(await fetchPlans());
  if (!rows.length) {
    throw new Error(
      "找不到 Indonesia -unlimited-*-A0（GPT/TikTok 線路）；請確認供應商目錄",
    );
  }

  for (const r of [rows[0], rows.find((x) => x.day === 5), rows.at(-1)].filter(
    Boolean,
  )) {
    console.log(
      `  ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}`,
    );
  }
  console.log(`共 ${rows.length} 款`);

  const dayValues = rows.map((r) => r.daysLabel);
  const token = await login();
  const categoryId = await ensureCategory(token);

  const productMeta = {
    type: "esim",
    country: "ID",
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title: "印尼 eSIM 吃到飽｜Telkomsel / XL｜GPT・TikTok 可用",
    seo_description:
      "印尼吃到飽 eSIM：Telkomsel／XL 雙網，不限流量（FUP），支援 ChatGPT、TikTok 與熱點分享。",
    seo_keywords:
      "印尼eSIM,峇里島eSIM,吃到飽,Telkomsel,XL,TikTok,ChatGPT,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]: "吃到飽・Telkomsel／XL・GPT／TikTok 可用",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "新加坡IP",
        route_type: "漫遊",
        network: "Telkomsel / XL 4G／5G",
        speed_rule: "不限流量吃到飽（FUP）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
        coverage: "印尼",
      },
    },
    key_features_by_carrier: {
      [TELECOM]: telkomselXlKeyFeatures(),
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "不限流量吃到飽（FUP）：實際速度依位置與網路環境而定。本線路支援 ChatGPT 與 TikTok（新加坡 IP 漫遊）。",
        activation_notice: "建議抵達印尼後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "印尼 eSIM 吃到飽｜GPT・TikTok 可用",
    subtitle: "Telkomsel／XL・不限流量・支援 ChatGPT／TikTok",
    handle: HANDLE,
    description:
      "印尼吃到飽 eSIM，走 Telkomsel／XL 雙網（新加坡 IP 漫遊）。僅收支援 ChatGPT 與 TikTok 的 A0 線路，不含香港 IP 方案。支援熱點，1～30 天可選。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: [DATA_AMOUNT] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: [{ id: categoryId }],
  };

  const variants = rows.map(toVariant);
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

    if (REBUILD) {
      const oldIds = (product.variants || []).map((v) => v.id).filter(Boolean);
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
    } else {
      console.log("（未加 --rebuild，僅更新商品資訊；變體不變）");
      console.log(
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-indonesia-unlimited-product.mjs --rebuild",
      );
      return;
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants`,
  );
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`前台: /product/indonesia/${HANDLE}/`);
  console.log(`變體數: ${(check.product?.variants || []).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
