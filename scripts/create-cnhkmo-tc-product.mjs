/**
 * 建立／更新「中國大陸、香港、澳門 eSIM 5G 支援 TikTok」
 *
 * 與舊中國商品不同：同一個商品用「電信商」選項承載三種方案類型：
 *   - 每日型  → 利潤 60%  ← CN,HK,MO(T+C)-Daily*
 *   - 總量型  → 利潤 60%  ← CN,HK,MO(T+C)-Total*
 *   - 吃到飽  → 利潤 70%
 *        · 1–10 天 ← CNHKMO-unlimited-*-A0（短天數・香港 IP・ctexcel）
 *        · 11–30 天 ← CN,HK,MO(T+C)-unlimited-*-A0（長天數・約 10Mbps）
 *
 * 用法：
 *   node scripts/create-cnhkmo-tc-product.mjs
 *   node scripts/create-cnhkmo-tc-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cnhkmoTcKeyFeaturesByCarrier } from "../content/product-detailed/cnhkmo-tc-key-features.js";

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

const HANDLE = "cnhkmo-tc-esim";
const LINE = "漫遊線路";
const TYPE_DAILY = "每日型";
const TYPE_TOTAL = "總量型";
const TYPE_UNLIM = "吃到飽";
const PROFIT = {
  [TYPE_DAILY]: 60,
  [TYPE_TOTAL]: 60,
  [TYPE_UNLIM]: 70,
};

const DATA_ORDER_DAILY = [
  "每日 500MB",
  "每日 1GB",
  "每日 1GB（5Mbps續航）",
  "每日 2GB",
  "每日 2GB（5Mbps續航）",
  "每日 3GB",
  "每日 3GB（5Mbps續航）",
];
const DATA_ORDER_TOTAL = [
  "總量 1GB",
  "總量 2GB",
  "總量 3GB",
  "總量 5GB",
  "總量 10GB",
  "總量 20GB",
  "總量 30GB",
  "總量 50GB",
];
const DATA_ORDER_UNLIM = ["吃到飽", "吃到飽（10Mbps）"];

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.12;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CATEGORY_IDS = ["pcat_01KZJNBW76333EH5XBG62QJEHW"]; // kongkong 中港澳（勿掛 china）
const THUMB =
  process.env.CNHKMO_PRODUCT_THUMB ||
  "https://www.jeko-esim.com.tw/images/sim/%E7%94%A2%E5%93%81/esim-%E4%B8%AD%E6%B8%AF%E6%BE%B3.png";

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
  const all = [...DATA_ORDER_DAILY, ...DATA_ORDER_TOTAL, ...DATA_ORDER_UNLIM];
  const i = all.indexOf(String(label || ""));
  return i >= 0 ? i : 99;
}

function typeRank(t) {
  if (t === TYPE_DAILY) return 0;
  if (t === TYPE_TOTAL) return 1;
  if (t === TYPE_UNLIM) return 2;
  return 9;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "cnhkmo-tc-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, planType, extras = {}) => {
    const profit = PROFIT[planType];
    for (const p of list || []) {
      const hkd = Number(p.price_hkd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      rows.push({
        ...p,
        ...extras,
        telecom: planType,
        plan_kind:
          planType === TYPE_DAILY
            ? "daily"
            : planType === TYPE_TOTAL
              ? "total"
              : "unlimited",
        profit_percent: profit,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost, profit),
        daysLabel: `${p.day}天`,
      });
    }
  };
  push(raw.daily, TYPE_DAILY);
  push(raw.total, TYPE_TOTAL);

  // 吃到飽：1–10 天用短天數 CNHKMO；11–30 天用長天數 T+C
  let shortSrc = [];
  try {
    const unlimFile = path.join(
      __dirname,
      "data",
      "cnhkmo-unlimited-plans.json",
    );
    const unlimRaw = JSON.parse(fs.readFileSync(unlimFile, "utf8"));
    shortSrc = (unlimRaw.short_ct || unlimRaw.short_cmcc || []).filter(
      (p) => Number(p.day) >= 1 && Number(p.day) <= 10,
    );
  } catch {
    /* optional */
  }
  push(shortSrc, TYPE_UNLIM, {
    unlim_line: "short",
    data_amount: "吃到飽",
  });
  push(
    (raw.unlimited || []).filter((p) => Number(p.day) >= 11),
    TYPE_UNLIM,
    { unlim_line: "long" },
  );

  return rows.sort(
    (a, b) =>
      typeRank(a.telecom) - typeRank(b.telecom) ||
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
  const is5Mbps =
    row.throttle_kind === "5mbps" || /5Mbps續航/.test(row.data_amount || "");
  const is10Mbps =
    row.throttle_kind === "10mbps" || /10Mbps/.test(row.data_amount || "");
  const isShortUnlim =
    row.unlim_line === "short" || /^CNHKMO-unlimited/i.test(row.sku || "");
  const speedRule =
    row.speed_rule ||
    row.rule_desc ||
    (row.plan_kind === "unlimited"
      ? isShortUnlim
        ? "公平使用政策 (FUP)：無限流量，實際速度依網路環境而定。"
        : is10Mbps
          ? "高速吃到飽，約限速 10 Mbps"
          : "吃到飽（依供應商 FUP／限速條款）"
      : row.plan_kind === "total"
        ? "總量高速用完後降速至約 128 kbps"
        : is5Mbps
          ? "每日高速用完後限速約 5 Mbps（可持續使用）"
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
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: row.telecom,
      plan_kind: row.plan_kind,
      unlim_line: isShortUnlim ? "short" : row.plan_kind === "unlimited" ? "long" : "",
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd || ""),
      cost_price: row.cost_twd,
      profit_rate: `${profit}%`,
      profit_percent: profit,
      margin,
      apn: row.apn || (isShortUnlim ? "ctexcel" : "e-ideas"),
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: row.throttle_kind || "",
      ip: row.ip || (isShortUnlim ? "HK" : "SG"),
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: row.telecom,
        line: LINE,
        network: isShortUnlim
          ? "中國電信／香港 CSL・中國電信香港／澳門電信"
          : "中國聯通／電信 + 香港 CSL + 澳門 CTM（5G/4G）",
        ip_type: isShortUnlim ? "香港 IP" : "新加坡 IP",
        route_type: LINE,
        hotspot: true,
        gpt: !isShortUnlim,
        tiktok: !isShortUnlim,
        gemini: !isShortUnlim,
        speed_rule: speedRule,
        coverage: "中國大陸、香港、澳門",
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("cnhkmo-tc-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = [
    ...DATA_ORDER_DAILY,
    ...DATA_ORDER_TOTAL,
    ...DATA_ORDER_UNLIM,
  ].filter((d) => rows.some((r) => r.data_amount === d));
  const telecomValues = [TYPE_DAILY, TYPE_TOTAL, TYPE_UNLIM];

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

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];

  const productMeta = {
    type: "esim",
    country: "CN,HK,MO",
    plan_kind: "mixed",
    hot_sale_telecoms: [TYPE_TOTAL, TYPE_UNLIM],
    carrier_profit_by_carrier: {
      [TYPE_DAILY]: PROFIT[TYPE_DAILY],
      [TYPE_TOTAL]: PROFIT[TYPE_TOTAL],
      [TYPE_UNLIM]: PROFIT[TYPE_UNLIM],
    },
    seo_title:
      "中國大陸、香港、澳門 eSIM 5G 支援 TikTok｜每日型／總量型／吃到飽｜Jeko eSIM",
    seo_description:
      "中港澳三地通用 eSIM（CN,HK,MO T+C）：5G/4G，可選每日型、總量型或吃到飽。支援 TikTok／ChatGPT（港澳較穩；大陸請留意當地網路政策）。",
    seo_keywords:
      "中港澳eSIM,中國eSIM,香港eSIM,澳門eSIM,TikTok,5G,每日型,總量型,吃到飽,Jeko eSIM",
    subtitle_by_carrier: {
      [TYPE_DAILY]: "每日型・高速用完後降速／可選 5Mbps 續航",
      [TYPE_TOTAL]: "總量型・用完後降速約 128kbps",
      [TYPE_UNLIM]: "吃到飽・優先推薦",
    },
    carrier_specs_by_carrier: {
      [TYPE_DAILY]: {
        ip_type: "中港澳 T+C",
        route_type: "漫遊",
        network: "CUCC／China Telecom + CSL + CTM 5G/4G",
        speed_rule:
          "每日高速額度用完後降速至約 128 kbps；選「5Mbps續航」則用完後約 5 Mbps 可持續使用",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
        coverage: "中國大陸、香港、澳門",
      },
      [TYPE_TOTAL]: {
        ip_type: "中港澳 T+C",
        route_type: "漫遊",
        network: "CUCC／China Telecom + CSL + CTM 5G/4G",
        speed_rule: "總量高速用完後降速至約 128 kbps",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
        coverage: "中國大陸、香港、澳門",
      },
      [TYPE_UNLIM]: {
        ip_type: "中港澳 T+C",
        route_type: "漫遊",
        network: "CUCC／China Telecom + CSL + CTM 5G/4G",
        speed_rule: "吃到飽（依供應商限速／FUP，常見約 10 Mbps）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
        coverage: "中國大陸、香港、澳門",
      },
    },
    key_features_by_carrier: (() => {
      const src = cnhkmoTcKeyFeaturesByCarrier();
      const out = {};
      for (const [k, entry] of Object.entries(src)) {
        out[k] = {
          bullets: entry.bullets || [],
          actual_experience: entry.actual_experience || "",
        };
      }
      return out;
    })(),
    overview_notices_by_carrier: {
      [TYPE_DAILY]: {
        fup_notice:
          "每日型依所選流量提供高速額度，用完後降速（標準約 128 kbps；5Mbps 續航方案約 5 Mbps）。覆蓋中國大陸、香港、澳門。大陸使用 ChatGPT／TikTok 請留意當地網路政策，港澳通常較穩定。",
        activation_notice: "建議抵達目的地後再安裝／啟用 eSIM",
      },
      [TYPE_TOTAL]: {
        fup_notice:
          "總量型於有效天數內共用高速流量，用完後降速至約 128 kbps。建議預留緩衝避免旅遊中不夠用。覆蓋中國大陸、香港、澳門。",
        activation_notice: "建議抵達目的地後再安裝／啟用 eSIM",
      },
      [TYPE_UNLIM]: {
        fup_notice:
          "吃到飽：1–10 天為短天數線路（香港 IP・中國電信／CSL）；11 天起為長天數線路（約 10Mbps・電信／聯通／CSL／CTM）。覆蓋中國大陸、香港、澳門。",
        activation_notice: "建議抵達目的地後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "中國大陸、香港、澳門 eSIM 5G 支援 TikTok",
    subtitle: "三地通用・每日型／總量型／吃到飽・CN,HK,MO(T+C)",
    handle: HANDLE,
    description:
      "中國大陸、香港、澳門三地通用 eSIM（優先 CN,HK,MO(T+C) 線路）。同一個商品可選每日型、總量型或吃到飽。支援 5G/4G，行銷標示支援 TikTok／ChatGPT（港澳較穩；大陸請自行評估當地網路政策）。",
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
  const nDaily = rows.filter((r) => r.telecom === TYPE_DAILY).length;
  const nTotal = rows.filter((r) => r.telecom === TYPE_TOTAL).length;
  const nUnlim = rows.filter((r) => r.telecom === TYPE_UNLIM).length;
  console.log(
    `📦 方案 ${rows.length} 筆（每日 ${nDaily} + 總量 ${nTotal} + 吃到飽 ${nUnlim}）`,
  );
  console.log(`數據量選項: ${dataValues.join(" | ")}`);
  console.log(`天數選項: ${dayValues.join(" | ")}`);

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
        "重建變體請執行：node scripts/create-cnhkmo-tc-product.mjs --rebuild",
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
  console.log(`前台: /product/kongkong/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "方案類型（電信商選項）:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
