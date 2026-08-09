/**
 * 建立／更新「馬來西亞 eSIM 總量型」— 兩個電信：
 *   1) UMobile 5G 當地 ← Malaysia-Total*（原生 MY IP，APN my3g，用完斷網）— 利潤 120%、HOT SALE
 *   2) Maxis / Celcom / Digi ← Malaysia(T+C)-Total*（漫遊 SG IP，APN e-ideas，多為 128kbps）— 利潤 80%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-malaysia-total-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  umobileKeyFeatures,
  maxisCelcomDigiKeyFeatures,
} from "../content/product-detailed/malaysia-key-features.js";

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

const HANDLE = "malaysia-total-esim";
const TELECOM_UMOBILE = "UMobile 5G 當地";
const TELECOM_DUAL = "Maxis / Celcom / Digi";
const PROFIT_BY_KIND = { umobile: 120, dual: 80 };
const DATA_ORDER = [
  "1GB",
  "2GB",
  "3GB",
  "5GB",
  "10GB",
  "20GB",
  "30GB",
  "50GB",
];

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CATEGORY_IDS = ["pcat_01KZJNBY9TVVRMVJ2YY7E679HM"]; // malaysia
const THUMB =
  process.env.MALAYSIA_PRODUCT_THUMB ||
  "https://www.jeko-esim.com.tw/images/malaysia-esim-banner.jpg";

function retailFromCost(costTwd, profitPercent) {
  const margin = 1 + profitPercent / 100;
  return Math.ceil((costTwd * margin) / 10) * 10 - 1;
}

async function resolveHkdToTwd() {
  if (Number.isFinite(HKD_TO_TWD_ENV) && HKD_TO_TWD_ENV > 0) {
    return { rate: HKD_TO_TWD_ENV, source: "env HKD_TO_TWD" };
  }
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/TWD");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = 1 / Number(data?.rates?.HKD);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("invalid HKD rate");
    return { rate, source: "exchangerate-api" };
  } catch (err) {
    console.warn(
      `⚠️ 匯率抓取失敗（${err.message}），改用 fallback ${HKD_TO_TWD_FALLBACK}`,
    );
    return { rate: HKD_TO_TWD_FALLBACK, source: "fallback" };
  }
}

function telecomRank(telecom) {
  if (telecom === TELECOM_UMOBILE) return 0;
  if (telecom === TELECOM_DUAL) return 1;
  return 9;
}

function dataRank(label) {
  const i = DATA_ORDER.indexOf(String(label || ""));
  return i >= 0 ? i : 99;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "malaysia-total-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, telecom, kind) => {
    const profit = PROFIT_BY_KIND[kind];
    for (const p of list || []) {
      const hkd = Number(p.price_hkd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      rows.push({
        ...p,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost, profit),
        profit_percent: profit,
        telecom,
        daysLabel: `${p.day}天`,
        kind,
      });
    }
  };
  push(raw.umobile, TELECOM_UMOBILE, "umobile");
  push(raw.dual, TELECOM_DUAL, "dual");
  return rows.sort(
    (a, b) =>
      telecomRank(a.telecom) - telecomRank(b.telecom) ||
      dataRank(a.data_amount) - dataRank(b.data_amount) ||
      Number(a.day) - Number(b.day),
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
  const isNative = row.kind === "umobile";
  const profit = row.profit_percent;
  const speedRule =
    row.speed_rule ||
    (isNative
      ? "總量高速用完後斷網"
      : "總量高速用完後降速至約 128 kbps");
  return {
    title: `${row.telecom} · ${row.daysLabel} · ${row.data_amount}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: row.telecom,
      數據量: row.data_amount,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: row.telecom,
      plan_kind: "total",
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd || ""),
      cost_price: row.cost_twd,
      profit_rate: `${profit}%`,
      profit_percent: profit,
      margin: 1 + profit / 100,
      apn: row.apn || (isNative ? "my3g" : "e-ideas"),
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: row.throttle_kind || (isNative ? "terminate" : "128kbps"),
      ip: isNative ? "MY" : "SG",
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: row.telecom,
        network: isNative
          ? "UMobile 5G/4G"
          : "Maxis / Celcom / Digi 5G/4G",
        ip_type: isNative ? "馬來西亞IP" : "新加坡IP",
        route_type: isNative ? "原生eSIM" : "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: speedRule,
        coverage: "馬來西亞",
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("malaysia-total-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [TELECOM_UMOBILE, TELECOM_DUAL];

  for (const telecom of telecomValues) {
    const sample = rows.find(
      (r) => r.telecom === telecom && r.day === 3 && r.data_amount === "3GB",
    );
    if (sample) {
      console.log(
        `核對 ${telecom} 3天 3GB: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（${sample.profit_percent}%） (${sample.sku})`,
      );
    }
  }

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];

  const productMeta = {
    type: "esim",
    country: "MY",
    plan_kind: "total",
    hot_sale_telecoms: [TELECOM_UMOBILE],
    carrier_profit_by_carrier: {
      [TELECOM_UMOBILE]: PROFIT_BY_KIND.umobile,
      [TELECOM_DUAL]: PROFIT_BY_KIND.dual,
    },
    seo_title:
      "馬來西亞 eSIM 總量型｜UMobile・Maxis / Celcom / Digi｜Jeko eSIM",
    seo_description:
      "馬來西亞總量型 eSIM：UMobile 原生馬來西亞 IP（熱銷，用完斷網），或 Maxis / Celcom / Digi 三網漫遊（多為高速用完後 128kbps）。依天數與總流量選購，支援熱點／ChatGPT／TikTok。",
    seo_keywords:
      "馬來西亞eSIM,總量型,UMobile,Maxis,Celcom,Digi,原生eSIM,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_UMOBILE]:
        "總量型・UMobile 5G 當地原生・馬來西亞 IP・高速用完後斷網",
      [TELECOM_DUAL]:
        "總量型・Maxis / Celcom / Digi・高速用完後多為降速約 128kbps",
    },
    carrier_specs_by_carrier: {
      [TELECOM_UMOBILE]: {
        ip_type: "馬來西亞IP",
        route_type: "原生eSIM",
        network: "UMobile 5G/4G",
        speed_rule: "總量高速用完後斷網",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "my3g",
        coverage: "馬來西亞",
      },
      [TELECOM_DUAL]: {
        ip_type: "新加坡IP",
        route_type: "漫遊",
        network: "Maxis / Celcom / Digi 5G/4G",
        speed_rule: "總量高速用完後降速至約 128 kbps（部分方案用完斷網）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
        coverage: "馬來西亞",
      },
    },
    key_features_by_carrier: {
      [TELECOM_UMOBILE]: umobileKeyFeatures("total"),
      [TELECOM_DUAL]: maxisCelcomDigiKeyFeatures("total"),
    },
    overview_notices_by_carrier: {
      [TELECOM_UMOBILE]: {
        fup_notice:
          "依所選方案提供總量高速流量（1GB～50GB）。用完後斷網，無法繼續使用。UMobile 5G 當地原生網路，馬來西亞 IP。支援熱點、TikTok 與 ChatGPT。",
        activation_notice: "建議抵達馬來西亞後再安裝／啟用 eSIM",
      },
      [TELECOM_DUAL]: {
        fup_notice:
          "依所選方案提供總量高速流量（1GB～50GB）。多數方案用完後降速至約 128 kbps 可持續使用；少數方案為用完斷網。Maxis／Celcom／Digi 三網自動切換。支援熱點、TikTok 與 ChatGPT。",
        activation_notice: "建議抵達馬來西亞後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "馬來西亞 eSIM 總量型  UMobile | Maxis / Celcom / Digi",
    subtitle:
      "UMobile 5G 當地（熱銷）・Maxis / Celcom / Digi 三網・總量流量型",
    handle: HANDLE,
    description:
      "馬來西亞 eSIM 總量型，兩種電信：UMobile 5G 當地原生（馬來西亞 IP，熱銷推薦，高速用完後斷網，利潤結構較高），以及 Maxis / Celcom / Digi 三網漫遊（新加坡 IP，多數方案用完後降速約 128kbps）。依天數與總流量選購，支援熱點與 ChatGPT／TikTok／Gemini。",
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
    categories: CATEGORY_IDS.map((id) => ({ id })),
  };

  const variants = rows.map(toVariant);
  const nU = rows.filter((r) => r.telecom === TELECOM_UMOBILE).length;
  const nD = rows.filter((r) => r.telecom === TELECOM_DUAL).length;
  console.log(
    `📦 方案 ${rows.length} 筆（UMobile ${nU} @120% HOT + 三網 ${nD} @80%）`,
  );
  console.log(`天數: ${dayValues.join(" | ")}`);
  console.log(`流量: ${dataValues.join(" | ")}`);

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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-malaysia-total-product.mjs --rebuild",
      );
      return;
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants,*options`,
  );
  const vs = check.product?.variants || [];
  const telecomOpt = (check.product?.options || []).find(
    (o) => o.title === "電信商",
  );
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`前台: /product/malaysia/${HANDLE}/`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "電信商選項:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
  const sU = rows.find(
    (r) =>
      r.telecom === TELECOM_UMOBILE && r.day === 3 && r.data_amount === "3GB",
  );
  const sD = rows.find(
    (r) => r.telecom === TELECOM_DUAL && r.day === 3 && r.data_amount === "3GB",
  );
  if (sU) {
    console.log(
      `範例 UMobile 3天3GB: HKD ${sU.price_hkd} → cost NT$${sU.cost_twd} → 售價 NT$${sU.retail_twd}（120% HOT）`,
    );
  }
  if (sD) {
    console.log(
      `範例 三網 3天3GB: HKD ${sD.price_hkd} → cost NT$${sD.cost_twd} → 售價 NT$${sD.retail_twd}（80%）`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
