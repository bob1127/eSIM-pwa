/**
 * [已拆分] 香港 eSIM 請改用三種獨立商品腳本：
 *   HKD_TO_TWD=4.5 node scripts/create-hongkong-daily-product.mjs --rebuild
 *   HKD_TO_TWD=4.5 node scripts/create-hongkong-total-product.mjs --rebuild
 *   HKD_TO_TWD=4.5 node scripts/create-hongkong-unlimited-product.mjs --rebuild
 *
 * 本檔保留舊合併商品 hongkong-esim 的建立邏輯（不建議再用）。
 * 三種電信（對齊選品神器圈選利潤）：
 *   1) CSL / China Telecom HK ← Hong Kong-unlimited*（HK IP，吃到飽 10Mbps）— 利潤 75%・HOT SALE
 *   2) CSL / SmarTone（總量型）← Hong Kong(T+C)-Total*（SG IP）— 利潤 60%
 *   3) CSL / SmarTone（每日型）← Hong Kong(T+C)-Daily*（SG IP）— 利潤 75%
 *
 * 用法（舊）：
 *   HKD_TO_TWD=4.5 node scripts/create-hongkong-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const HANDLE = "hongkong-esim";
const TELECOM_CT = "CSL / China Telecom HK";
const TELECOM_SB_TOTAL = "CSL / SmarTone（總量型）";
const TELECOM_SB_DAILY = "CSL / SmarTone（每日型）";
const LINE_HK = "香港IP線路";
const LINE_SG = "漫遊線路";

const DATA_ORDER = [
  "500MB",
  "1GB",
  "2GB",
  "3GB",
  "5GB",
  "10GB",
  "20GB",
  "30GB",
  "50GB",
  "無限流量 10Mbps",
];

/** 對齊選品神器圈選：吃到飽 75%／總量 60%／每日 75% */
const PROFIT = {
  [TELECOM_CT]: 75,
  [TELECOM_SB_TOTAL]: 60,
  [TELECOM_SB_DAILY]: 75,
};

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KPJKQCG9X3ZGDM5156KFW8HD";
const THUMB =
  process.env.HONGKONG_PRODUCT_THUMB ||
  "https://www.jeko-esim.com.tw/images/about-marquee/hongkong.png";

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
    return { rate, source: "exchangerate-api (同選品神器)" };
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
  if (t === TELECOM_CT) return 0;
  if (t === TELECOM_SB_TOTAL) return 1;
  if (t === TELECOM_SB_DAILY) return 2;
  return 9;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "hongkong-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, telecom) => {
    const profit = PROFIT[telecom];
    for (const p of list || []) {
      const hkd = Number(p.price_hkd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      const isCt = telecom === TELECOM_CT;
      rows.push({
        ...p,
        telecom,
        plan_kind: isCt
          ? "unlimited"
          : telecom === TELECOM_SB_TOTAL
            ? "total"
            : "daily",
        profit_percent: profit,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost, profit),
        daysLabel: `${p.day}天`,
        line: isCt ? LINE_HK : LINE_SG,
      });
    }
  };
  push(raw.ct_hk_unlim, TELECOM_CT);
  push(raw.sb_total, TELECOM_SB_TOTAL);
  push(raw.sb_daily, TELECOM_SB_DAILY);

  // Medusa 選項組合不可重複（同電信／天數／流量的 A0／A1 只留一檔）
  const best = new Map();
  for (const r of rows) {
    const key = `${r.telecom}|${r.daysLabel}|${r.data_amount}|${r.line}`;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, r);
      continue;
    }
    const preferNew =
      (String(r.sku).includes("-A0") && !String(prev.sku).includes("-A0")) ||
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

async function ensureHongkongCategory(token) {
  const { product_categories } = await admin(
    token,
    `/admin/product-categories?limit=100&q=hongkong`,
  );
  const hit = (product_categories || []).find(
    (c) => c.handle === "hongkong" || c.handle === "hong-kong",
  );
  if (hit) {
    console.log("📁 分類已存在", hit.id, hit.handle);
    return hit.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: "香港",
      handle: "hongkong",
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  if (!id) throw new Error("建立 hongkong 分類失敗");
  console.log("📁 已建立分類", id, "hongkong");
  return id;
}

function toVariant(row) {
  const profit = row.profit_percent;
  const margin = 1 + profit / 100;
  const isCt = row.telecom === TELECOM_CT;
  const speedRule =
    row.speed_rule ||
    (isCt
      ? "每日約 1GB 高速後限速約 10 Mbps 吃到飽"
      : row.plan_kind === "total"
        ? "總量高速用完後降速至約 128 kbps"
        : "每日高速用完後降速至約 128 kbps");

  return {
    title: `${row.telecom} · ${row.daysLabel} · ${row.data_amount}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: row.telecom,
      數據量: row.data_amount,
      線路: row.line,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: row.telecom,
      plan_kind: row.plan_kind,
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd || ""),
      cost_price: row.cost_twd,
      profit_rate: `${profit}%`,
      profit_percent: profit,
      margin,
      apn: row.apn || (isCt ? "ctexcel" : "e-ideas"),
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: row.throttle_kind || "",
      ip: row.ip || (isCt ? "HK" : "SG"),
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: row.telecom,
        line: row.line,
        network: isCt
          ? "CSL / China Telecom HK 4G/5G"
          : "CSL / SmarTone 4G/5G 雙電信",
        ip_type: isCt ? "香港IP" : "新加坡IP",
        route_type: isCt ? "香港IP" : "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: speedRule,
        coverage: "香港",
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("hongkong-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [TELECOM_CT, TELECOM_SB_TOTAL, TELECOM_SB_DAILY];
  const lineValues = [LINE_HK, LINE_SG];

  for (const t of telecomValues) {
    const sample = rows.find((r) => r.telecom === t);
    if (sample) {
      console.log(
        `核對 ${t}: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（${sample.profit_percent}%） (${sample.sku})`,
      );
    }
  }

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  const categoryId = await ensureHongkongCategory(token);

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];

  const productMeta = {
    type: "esim",
    country: "HK",
    plan_kind: "mixed",
    hot_sale_telecoms: [TELECOM_CT],
    carrier_profit_by_carrier: { ...PROFIT },
    seo_title:
      "香港 eSIM｜CSL／中國電信香港吃到飽・CSL／SmarTone｜Jeko eSIM",
    seo_description:
      "香港純港 eSIM：CSL / China Telecom HK 吃到飽（香港 IP），或 CSL / SmarTone 雙網每日／總量（新加坡 IP）。支援熱點與 TikTok／ChatGPT。",
    seo_keywords:
      "香港eSIM,純港eSIM,CSL,SmarTone,China Telecom HK,吃到飽,總量型,每日型,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_CT]:
        "吃到飽・CSL / China Telecom HK・香港 IP・高速後約 10Mbps",
      [TELECOM_SB_TOTAL]:
        "總量型・CSL / SmarTone 雙網・新加坡 IP・用完降速 128kbps",
      [TELECOM_SB_DAILY]:
        "每日型・CSL / SmarTone 雙網・新加坡 IP・用完降速 128kbps",
    },
    carrier_specs_by_carrier: {
      [TELECOM_CT]: {
        ip_type: "香港IP",
        route_type: "香港IP",
        network: "CSL / China Telecom HK 4G/5G",
        speed_rule: "每日約 1GB 高速後限速約 10 Mbps 可持續使用（吃到飽）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "ctexcel",
        coverage: "香港",
      },
      [TELECOM_SB_TOTAL]: {
        ip_type: "新加坡IP",
        route_type: "漫遊",
        network: "CSL / SmarTone 4G/5G 雙電信",
        speed_rule: "總量高速用完後降速至約 128 kbps",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
        coverage: "香港",
      },
      [TELECOM_SB_DAILY]: {
        ip_type: "新加坡IP",
        route_type: "漫遊",
        network: "CSL / SmarTone 4G/5G 雙電信",
        speed_rule: "每日高速用完後降速至約 128 kbps",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
        coverage: "香港",
      },
    },
    key_features_by_carrier: {
      [TELECOM_CT]: [
        "吃到飽",
        "香港IP",
        "CSL + 中國電信香港",
        "10Mbps",
        "支援 TikTok／ChatGPT",
      ],
      [TELECOM_SB_TOTAL]: [
        "總量型",
        "雙網切換",
        "CSL / SmarTone",
        "新加坡IP",
        "用完降速 128kbps",
      ],
      [TELECOM_SB_DAILY]: [
        "每日型",
        "雙網切換",
        "CSL / SmarTone",
        "新加坡IP",
        "用完降速 128kbps",
      ],
    },
    overview_notices_by_carrier: {
      [TELECOM_CT]: {
        fup_notice:
          "吃到飽方案：每日約 1GB 高速後限速約 10 Mbps 可持續使用。CSL 與 China Telecom HK 雙網，香港 IP。",
        activation_notice: "建議抵達香港後再安裝／啟用 eSIM",
      },
      [TELECOM_SB_TOTAL]: {
        fup_notice:
          "總量型於有效天數內共用高速流量，用完後降速至約 128 kbps。CSL / SmarTone 雙網，新加坡 IP 漫遊。",
        activation_notice: "建議抵達香港後再安裝／啟用 eSIM",
      },
      [TELECOM_SB_DAILY]: {
        fup_notice:
          "每日型依所選流量提供高速額度，用完後降速至約 128 kbps。CSL / SmarTone 雙網，新加坡 IP 漫遊。",
        activation_notice: "建議抵達香港後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "香港 eSIM",
    subtitle:
      "三種可選：CSL／中國電信香港吃到飽・CSL／SmarTone 總量・每日",
    handle: HANDLE,
    description:
      "香港純港 eSIM。可選 CSL / China Telecom HK 吃到飽（香港 IP、約 10Mbps），或 CSL / SmarTone 雙網總量型／每日型（新加坡 IP）。支援熱點分享與 TikTok／ChatGPT。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: dataValues },
      { title: "線路", values: lineValues },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: [{ id: categoryId }],
  };

  const variants = rows.map(toVariant);
  const nCt = rows.filter((r) => r.telecom === TELECOM_CT).length;
  const nTot = rows.filter((r) => r.telecom === TELECOM_SB_TOTAL).length;
  const nDay = rows.filter((r) => r.telecom === TELECOM_SB_DAILY).length;
  console.log(
    `📦 方案 ${rows.length} 筆（吃到飽 ${nCt}@75% + 總量 ${nTot}@60% + 每日 ${nDay}@75%）・HOT SALE=${TELECOM_CT}`,
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
      console.log("（未加 --rebuild，僅更新商品資訊；變體不變）");
      console.log(
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-hongkong-product.mjs --rebuild",
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
  console.log(`前台: /product/hongkong/${HANDLE}`);
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
