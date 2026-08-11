/**
 * 建立／更新「香港 eSIM 吃到飽」— CSL / China Telecom HK（HK IP）— 利潤 75%、HOT SALE
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-hongkong-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hongkongUnlimitedKeyFeatures } from "../content/product-detailed/hongkong-key-features.js";

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

const HANDLE = "hongkong-unlimited-esim";
const TELECOM = "CSL / China Telecom HK";
const DATA_AMOUNT = "無限流量 10Mbps";
const PROFIT = 75;
const CATEGORY_ID = "pcat_01KZJNBWGZ6FH1B2DRGNFMNMT3";

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");
const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
// 香港每日／總量／吃到飽共用同一組商品圖（吃到飽為基準）
const HONGKONG_GALLERY = [
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858HYVJW14GNBG8WM48A2.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858J2CKZAR4K8HSKM0NE4.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858J3XNJ1ADPJZFDRXPKT.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858J5WZR09G0J10NDTA5M.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858JESPFJ3XE2R6K8DB7P.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858JMJH26X9YJQA5B9K9S.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858JR47BX2JS5ZJJ6VT0Z.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858JTCZPZD9GFMECW02HB.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858JWA37RKBGD17ZKTSJS.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858JY6CXD14S3M1HCSRJQ.png",
  "https://www.jeko-esim.com.tw/images/about-marquee/hongkong.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK858JZCSEQV9Y9P6R4H94N.jpg",
];
const THUMB = process.env.HONGKONG_PRODUCT_THUMB || HONGKONG_GALLERY[0];
const PRODUCT_IMAGES = HONGKONG_GALLERY.map((url) => ({ url }));

function retailFromCost(costTwd, profitPercent) {
  return Math.ceil((costTwd * (1 + profitPercent / 100)) / 10) * 10 - 1;
}

async function resolveHkdToTwd() {
  if (Number.isFinite(HKD_TO_TWD_ENV) && HKD_TO_TWD_ENV > 0) {
    return { rate: HKD_TO_TWD_ENV, source: "env HKD_TO_TWD" };
  }
  return { rate: HKD_TO_TWD_FALLBACK, source: "fallback" };
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "hongkong-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const best = new Map();
  for (const p of raw.ct_hk_unlim || []) {
    const hkd = Number(p.price_hkd) || 0;
    const cost = Math.ceil(hkd * hkdToTwd);
    const row = {
      ...p,
      data_amount: DATA_AMOUNT,
      price_hkd: hkd,
      cost_twd: cost,
      retail_twd: retailFromCost(cost, PROFIT),
      profit_percent: PROFIT,
      telecom: TELECOM,
      daysLabel: `${p.day}天`,
    };
    const key = row.daysLabel;
    const prev = best.get(key);
    const preferNew =
      !prev ||
      (String(row.sku).includes("-A0") && !String(prev.sku).includes("-A0")) ||
      row.retail_twd < prev.retail_twd;
    if (preferNew) best.set(key, row);
  }
  return [...best.values()].sort((a, b) => Number(a.day) - Number(b.day));
}

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(`登入失敗: ${data.message || res.status}`);
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
    row.speed_rule || "每日約 1GB 高速後限速約 10 Mbps 吃到飽";
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
      profit_rate: `${profit}%`,
      profit_percent: profit,
      margin: 1 + profit / 100,
      apn: row.apn || "ctexcel",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: row.throttle_kind || "10mbps",
      ip: "HK",
      attributes: {
        days: row.day,
        data: DATA_AMOUNT,
        data_amount: DATA_AMOUNT,
        telecom: TELECOM,
        network: "CSL / China Telecom HK 4G/5G",
        ip_type: "香港IP",
        route_type: "香港IP",
        hotspot: false,
        gpt: false,
        tiktok: false,
        gemini: false,
        speed_rule: speedRule,
        coverage: "香港",
        apps: "",
      },
    },
  };
}

async function upsertProduct(token, rows) {
  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];

  const productMeta = {
    type: "esim",
    country: "HK",
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title: "香港 eSIM 吃到飽｜CSL / China Telecom HK｜Jeko eSIM",
    seo_description:
      "香港吃到飽 eSIM：CSL／China Telecom HK，香港 IP，每日約 1GB 高速後約 10Mbps 吃到飽，支援熱點與 TikTok／ChatGPT。",
    seo_keywords:
      "香港eSIM,吃到飽,CSL,China Telecom HK,香港IP,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]: "吃到飽・CSL / China Telecom HK・香港 IP・高速後約 10Mbps",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "香港IP",
        route_type: "香港IP",
        network: "CSL / China Telecom HK 4G/5G",
        speed_rule: "每日約 1GB 高速後限速約 10 Mbps 可持續使用（吃到飽）",
        apps: "",
        apn: "ctexcel",
        coverage: "香港",
      },
    },
    key_features_by_carrier: {
      [TELECOM]: (() => {
        const kf = hongkongUnlimitedKeyFeatures();
        return {
          bullets: kf.bullets || [],
          actual_experience: kf.actual_experience || "",
        };
      })(),
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "吃到飽方案：每日約 1GB 高速後限速約 10 Mbps 可持續使用。CSL 與 China Telecom HK 雙網，香港 IP。本線路不標示熱點／ChatGPT／TikTok／Gemini。",
        activation_notice: "建議抵達香港後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "香港 eSIM 吃到飽  CSL / China Telecom HK",
    subtitle: "CSL / China Telecom HK・香港 IP・每日1GB高速後約10Mbps",
    handle: HANDLE,
    description:
      "香港 eSIM 吃到飽，走 CSL／China Telecom HK（香港 IP）。每日約 1GB 高速後維持約 10Mbps 吃到飽，依天數選購，支援熱點與 TikTok／ChatGPT／Gemini。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: PRODUCT_IMAGES,
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: [DATA_AMOUNT] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: [{ id: CATEGORY_ID }],
  };

  const variants = rows.map(toVariant);
  console.log(`📦 方案 ${rows.length} 筆（${TELECOM} @${PROFIT}% HOT）`);
  console.log(`天數: ${dayValues.join(" | ")}`);

  if (!product) {
    console.log("🆕 建立商品…");
    const created = await admin(token, "/admin/products", {
      method: "POST",
      body: JSON.stringify({ ...payloadBase, variants: [variants[0]] }),
    });
    product = created.product;
    console.log("✅ 已建立", product.id, product.handle);
    for (const [i, batch] of chunk(variants.slice(1), BATCH_SIZE).entries()) {
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
      console.log("（未加 --rebuild，僅更新商品資訊）");
      return product;
    }
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
  }
  return product;
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);
  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("hongkong-plans.json ct_hk_unlim 無資料");
  const sample = rows.find((r) => r.day === 1) || rows[0];
  if (sample) {
    console.log(
      `核對 ${TELECOM} ${sample.daysLabel}: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（${PROFIT}%） (${sample.sku})`,
    );
  }
  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  await upsertProduct(token, rows);
  console.log("\n======= 完成 =======");
  console.log(`前台: /product/hongkong/${HANDLE}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
