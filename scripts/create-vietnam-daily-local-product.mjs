/**
 * 建立／更新「越南 eSIM 每日型」— 兩個原生當地 IP 電信：
 *   1) Viettel ← Vietnam-Local-Daily*（VN IP，APN v-internet）— 利潤 120%
 *   2) Vinaphone ← Vietnam-local-Daily*（VN IP，APN m3-world）— 利潤 120%・HOT SALE
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-vietnam-daily-local-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VINAPHONE_KEY_FEATURES } from "../content/product-detailed/vinaphone-local-key-features.js";
import { VINAPHONE_LOCAL_DETAILED_CONTENT_HTML } from "../content/product-detailed/vinaphone-local.js";
import { VIETTEL_KEY_FEATURES } from "../content/product-detailed/viettel-local-key-features.js";
import { VIETTEL_LOCAL_DETAILED_CONTENT_HTML } from "../content/product-detailed/viettel-local.js";

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

const HANDLE = "vietnam-daily-local-esim";
const TELECOM_VIETTEL = "Viettel";
const TELECOM_VINAPHONE = "Vinaphone";
const LINE = "原生線路";
const PROFIT = 120;

const DATA_ORDER = ["500MB", "1GB", "2GB", "3GB", "5GB", "7GB"];

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KPJKQCG9X3ZGDM5156KFW8HD";
const CATEGORY_IDS = ["pcat_01KW4FSWZ7S8BTE2WX4MRDB2GX"]; // vietnam
const THUMB =
  process.env.VIETNAM_PRODUCT_THUMB ||
  "https://www.jeko-esim.com.tw/images/about-marquee/vietnam.png";

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

function dataRank(label) {
  const i = DATA_ORDER.indexOf(String(label || ""));
  return i >= 0 ? i : 99;
}

function telecomRank(t) {
  if (t === TELECOM_VIETTEL) return 0;
  if (t === TELECOM_VINAPHONE) return 1;
  return 9;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "vietnam-daily-local-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, telecom) => {
    for (const p of list || []) {
      const hkd = Number(p.price_hkd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      rows.push({
        ...p,
        telecom,
        plan_kind: "daily",
        profit_percent: PROFIT,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost, PROFIT),
        daysLabel: `${p.day}天`,
      });
    }
  };
  push(raw.viettel, TELECOM_VIETTEL);
  push(raw.vinaphone, TELECOM_VINAPHONE);

  // 去重：同電信／天數／流量只留一檔（優先 A0、較低售價）
  const best = new Map();
  for (const r of rows) {
    const key = `${r.telecom}|${r.daysLabel}|${r.data_amount}`;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, r);
      continue;
    }
    const preferNew =
      (String(r.sku).includes("-A0") && !String(prev.sku).includes("-A0")) ||
      (String(r.sku).includes("-B0") &&
        !String(prev.sku).match(/-A0|-B0/)) ||
      r.retail_twd < prev.retail_twd;
    if (preferNew) best.set(key, r);
  }

  return [...best.values()].sort(
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
  const profit = row.profit_percent;
  const margin = 1 + profit / 100;
  const isViettel = row.telecom === TELECOM_VIETTEL;
  const speedRule =
    row.speed_rule || "每日高速用完後降速至約 128 kbps（可持續使用）";

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
      plan_kind: "daily",
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd || ""),
      cost_price: row.cost_twd,
      profit_rate: `${profit}%`,
      profit_percent: profit,
      margin,
      apn: row.apn || (isViettel ? "v-internet" : "m3-world"),
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: row.throttle_kind || "128kbps",
      ip: "VN",
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: row.telecom,
        line: LINE,
        network: isViettel ? "Viettel 4G/5G" : "Vinaphone 4G/LTE/5G",
        ip_type: "越南IP",
        route_type: "原生eSIM",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: speedRule,
        coverage: "越南",
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("vietnam-daily-local-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [TELECOM_VIETTEL, TELECOM_VINAPHONE];

  for (const t of telecomValues) {
    const sample = rows.find((r) => r.telecom === t);
    if (sample) {
      console.log(
        `核對 ${t}: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（${sample.profit_percent}%） (${sample.sku})`,
      );
    } else {
      console.warn(`⚠️ 無 ${t} 方案`);
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
    country: "VN",
    plan_kind: "daily",
    hot_sale_telecoms: [TELECOM_VIETTEL, TELECOM_VINAPHONE],
    carrier_profit_by_carrier: {
      [TELECOM_VIETTEL]: PROFIT,
      [TELECOM_VINAPHONE]: PROFIT,
    },
    seo_title: "越南 eSIM 每日型｜Viettel／Vinaphone 當地 IP｜Jeko eSIM",
    seo_description:
      "越南每日型原生 eSIM：Viettel、Vinaphone 當地 VN IP。依天數與每日流量選購，支援熱點與 TikTok／ChatGPT。",
    seo_keywords:
      "越南eSIM,每日型,Viettel,Vinaphone,原生卡,當地IP,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_VIETTEL]:
        "每日型・Viettel 原生・越南 IP・高速用完後降速約 128kbps",
      [TELECOM_VINAPHONE]:
        "每日型・Vinaphone 原生・越南 IP・高速用完後降速約 128kbps",
    },
    carrier_specs_by_carrier: {
      [TELECOM_VIETTEL]: {
        ip_type: "越南IP",
        route_type: "原生eSIM",
        network: "Viettel 4G/5G",
        speed_rule: "每日高速用完後降速至約 128 kbps（可持續使用）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "v-internet",
        coverage: "越南",
      },
      [TELECOM_VINAPHONE]: {
        ip_type: "越南IP",
        route_type: "原生eSIM",
        network: "Vinaphone 4G/LTE/5G",
        speed_rule: "每日高速用完後降速至約 128 kbps（可持續使用）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "m3-world",
        coverage: "越南",
      },
    },
    key_features_by_carrier: {
      [TELECOM_VIETTEL]: VIETTEL_KEY_FEATURES,
      [TELECOM_VINAPHONE]: VINAPHONE_KEY_FEATURES,
    },
    detailed_content_by_carrier: {
      [TELECOM_VIETTEL]: VIETTEL_LOCAL_DETAILED_CONTENT_HTML,
      [TELECOM_VINAPHONE]: VINAPHONE_LOCAL_DETAILED_CONTENT_HTML,
    },
    overview_notices_by_carrier: {
      [TELECOM_VIETTEL]: {
        fup_notice:
          "每日型依所選流量提供高速額度，用完後降速至約 128 kbps。Viettel 原生網路，越南當地 IP。",
        activation_notice:
          "有效期於 eSIM 下載後立即開始，請準備好使用時再安裝。購買後請於 15 天內啟用。",
      },
      [TELECOM_VINAPHONE]: {
        fup_notice:
          "每日型依所選流量提供高速額度，用完後降速至約 128 kbps。Vinaphone 原生網路，越南當地 IP。",
        activation_notice: "建議抵達越南後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "越南 eSIM 每日型 Viettel／Vinaphone 當地 IP",
    subtitle: "兩個原生電信：Viettel・Vinaphone・越南當地 IP",
    handle: HANDLE,
    description:
      "越南每日型原生 eSIM，可選 Viettel（APN v-internet）或 Vinaphone（APN m3-world），皆為越南當地 IP。依天數與每日流量選購，支援熱點與 TikTok／ChatGPT。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: dataValues },
      { title: "線路", values: [LINE] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: CATEGORY_IDS.map((id) => ({ id })),
  };

  const variants = rows.map(toVariant);
  const nVt = rows.filter((r) => r.telecom === TELECOM_VIETTEL).length;
  const nVp = rows.filter((r) => r.telecom === TELECOM_VINAPHONE).length;
  console.log(
    `📦 方案 ${rows.length} 筆（Viettel ${nVt} + Vinaphone ${nVp}）@${PROFIT}%・HOT SALE=兩者`,
  );

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
      console.log("（未加 --rebuild，僅更新商品資訊）");
      console.log(
        "重建變體：HKD_TO_TWD=4.5 node scripts/create-vietnam-daily-local-product.mjs --rebuild",
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
  console.log(`前台: /product/vietnam/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "電信商選項:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
