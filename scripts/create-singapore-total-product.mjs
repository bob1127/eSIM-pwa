/**
 * 建立／更新「新加坡 eSIM 總量型」— 單一電信：
 *   M1 / Starhub ← Singapore-Total*（smartone／HK IP，128kbps）— 利潤 80%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-singapore-total-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { m1StarhubKeyFeatures } from "../content/product-detailed/singapore-key-features.js";

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

const HANDLE = "singapore-total-esim";
const TELECOM = "M1 / Starhub";
const PROFIT = 80;
const DATA_ORDER = ["1GB", "3GB", "5GB", "10GB", "20GB", "30GB", "50GB"];

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KPJKQCG9X3ZGDM5156KFW8HD";
const CATEGORY_IDS = ["pcat_01KW4FR5A0ES0TFPKPXXCG51N2"]; // singapore
const THUMB =
  process.env.SINGAPORE_PRODUCT_THUMB ||
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

function dataRank(label) {
  const i = DATA_ORDER.indexOf(String(label || ""));
  return i >= 0 ? i : 99;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "singapore-total-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return (raw.plans || [])
    .map((p) => {
      const hkd = Number(p.price_hkd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      return {
        ...p,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost, PROFIT),
        profit_percent: PROFIT,
        telecom: TELECOM,
        daysLabel: `${p.day}天`,
      };
    })
    .sort(
      (a, b) =>
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
  const speedRule =
    row.speed_rule || "總量高速用完後降速至約 128 kbps";
  return {
    title: `${TELECOM} · ${row.daysLabel} · ${row.data_amount}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: TELECOM,
      數據量: row.data_amount,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: TELECOM,
      plan_kind: "total",
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd || ""),
      cost_price: row.cost_twd,
      profit_rate: `${profit}%`,
      profit_percent: profit,
      margin: 1 + profit / 100,
      apn: row.apn || "smartone",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: row.throttle_kind || "128kbps",
      ip: "HK",
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: TELECOM,
        network: "M1 / Starhub 4G/LTE",
        ip_type: "香港IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: false,
        gemini: true,
        speed_rule: speedRule,
        coverage: "新加坡",
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("singapore-total-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );

  const sample = rows.find((r) => r.day === 3 && r.data_amount === "1GB");
  if (sample) {
    console.log(
      `核對 ${TELECOM} 3天 1GB: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（${sample.profit_percent}%） (${sample.sku})`,
    );
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
    country: "SG",
    plan_kind: "total",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title: "新加坡 eSIM 總量型｜M1 / Starhub｜Jeko eSIM",
    seo_description:
      "新加坡總量型 eSIM：M1／Starhub 雙網，依天數與總流量選購，高速用完後降速約 128kbps，支援熱點與 ChatGPT。",
    seo_keywords:
      "新加坡eSIM,總量型,M1,Starhub,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]:
        "總量型・M1 / Starhub・高速用完後降速約 128kbps",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "香港IP",
        route_type: "漫遊",
        network: "M1 / Starhub 4G/LTE",
        speed_rule: "總量高速用完後降速至約 128 kbps",
        apps: "熱點分享,ChatGPT,Gemini",
        apn: "smartone",
        coverage: "新加坡",
      },
    },
    key_features_by_carrier: {
      [TELECOM]: m1StarhubKeyFeatures("total"),
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "依所選方案提供總量高速流量（1GB～50GB）。用完後降速至約 128 kbps 可持續使用。M1／Starhub 雙網自動切換。支援熱點與 ChatGPT。",
        activation_notice: "建議抵達新加坡後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "新加坡 eSIM 總量型  M1 / Starhub",
    subtitle: "M1 / Starhub 雙網・總量流量型・高速用完後約 128kbps",
    handle: HANDLE,
    description:
      "新加坡 eSIM 總量型，走 M1／Starhub 雙網漫遊（香港 IP）。依天數與總流量選購，用完後降速約 128kbps 可持續使用，支援熱點與 ChatGPT／Gemini。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: dataValues },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: CATEGORY_IDS.map((id) => ({ id })),
  };

  const variants = rows.map(toVariant);
  console.log(`📦 方案 ${rows.length} 筆（${TELECOM} @${PROFIT}%）`);
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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-singapore-total-product.mjs --rebuild",
      );
      return;
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants,*options`,
  );
  const vs = check.product?.variants || [];
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`前台: /product/singapore/${HANDLE}/`);
  console.log(`變體數: ${vs.length}`);
  const s1 = rows.find((r) => r.day === 3 && r.data_amount === "1GB");
  const s3 = rows.find((r) => r.day === 3 && r.data_amount === "3GB");
  if (s1) {
    console.log(
      `範例 3天1GB: HKD ${s1.price_hkd} → cost NT$${s1.cost_twd} → 售價 NT$${s1.retail_twd}（80%）`,
    );
  }
  if (s3) {
    console.log(
      `範例 3天3GB: HKD ${s3.price_hkd} → cost NT$${s3.cost_twd} → 售價 NT$${s3.retail_twd}（80%）`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
