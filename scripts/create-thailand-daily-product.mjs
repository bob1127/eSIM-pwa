/**
 * 建立／更新「泰國 eSIM 每日型」— 三個電信：
 *   1) AIS ← Thailand-Daily*（標準 128kbps；e-ideas／新加坡 IP）— 利潤 50%
 *   2) DTAC ← Thailand-Local-Daily*（原生 TH IP、帶號碼、internet）— 利潤 60%
 *   3) DTAC / REAL FUTURE ← Southeast Asia 4-Daily*（多國含泰；前台顯示泰國電信名）— 利潤 55%
 *
 * 核對選品神器（HKD×4.5）：
 *   AIS Daily500MB-1：HKD 5.41 → cost NT$25 → 售價 NT$39（50%）
 *   AIS Daily1GB-1：HKD 7.82 → cost NT$36 → 售價 NT$59（50%）
 *   DTAC Local-Daily5GB-10：HKD 47.50 → cost NT$214 → 售價 NT$349（60%）
 *   DTAC/RF SEA4-Daily500MB-1：HKD 4.37 → cost NT$20 → 售價 NT$39（55%）
 *   DTAC/RF SEA4-Daily1GB-1：HKD 5.98 → cost NT$27 → 售價 NT$49（55%）
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-thailand-daily-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-thailand-daily-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  aisDailyKeyFeatures,
  dtacDailyKeyFeatures,
  dtacRealFutureDailyKeyFeatures,
  TH_TELECOM_DTAC_NATIVE,
  TH_TELECOM_DTAC_RF,
} from "../content/product-detailed/thailand-key-features.js";

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

const HANDLE = "thailand-daily-esim";
const TELECOM_AIS = "AIS";
const TELECOM_DTAC = TH_TELECOM_DTAC_NATIVE; // "DTAC"
const TELECOM_DTAC_RF = TH_TELECOM_DTAC_RF; // "DTAC / REAL FUTURE"
const LINE = "每日型";

const PROFIT_BY_KIND = { ais: 50, dtac: 60, dtac_rf: 55 };
const PARTNER_BY_KIND = { ais: 25, dtac: 25, dtac_rf: 25 };
const REFERRAL_BY_KIND = { ais: 5, dtac: 5, dtac_rf: 5 };

const DATA_ORDER = [
  "每日 500MB",
  "每日 1GB",
  "每日 2GB",
  "每日 3GB",
  "每日 5GB",
];

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CATEGORY_IDS = ["pcat_01KZJNBX7K2X5KN4KP41T4F60D"]; // thailand
const THUMB =
  process.env.THAILAND_PRODUCT_THUMB ||
  "https://www.jeko-esim.com.tw/images/tailand-esim-banner.jpg";

function retailFromCost(costTwd, profitPercent) {
  const margin = 1 + profitPercent / 100;
  return Math.ceil((costTwd * margin) / 10) * 10 - 1;
}

async function resolveHkdToTwd() {
  if (Number.isFinite(HKD_TO_TWD_ENV) && HKD_TO_TWD_ENV > 0) {
    return { rate: HKD_TO_TWD_ENV, source: "env HKD_TO_TWD" };
  }
  try {
    const res = await fetch(
      "https://api.exchangerate-api.com/v4/latest/TWD",
    );
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
  if (telecom === TELECOM_DTAC_RF) return 0; // 高 CP 優先
  if (telecom === TELECOM_AIS) return 1;
  if (telecom === TELECOM_DTAC) return 2;
  return 9;
}

function dataRank(label) {
  const i = DATA_ORDER.indexOf(String(label || ""));
  return i >= 0 ? i : 99;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "thailand-daily-plans.json");
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
        partner_rate_percent: PARTNER_BY_KIND[kind],
        referral_discount_percent: REFERRAL_BY_KIND[kind],
        telecom,
        daysLabel: `${p.day}天`,
        kind,
      });
    }
  };
  push(raw.dtac_rf, TELECOM_DTAC_RF, "dtac_rf");
  push(raw.ais, TELECOM_AIS, "ais");
  push(raw.dtac, TELECOM_DTAC, "dtac");
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
  const isDtac = row.kind === "dtac";
  const isDtacRf = row.kind === "dtac_rf";
  const profit = row.profit_percent;
  const speedRule =
    row.speed_rule ||
    (isDtac
      ? "每日高速額度用完即斷網（隔日恢復）"
      : "每日高速用完後降速至約 128 kbps（可持續使用）");
  const network = isDtac
    ? "DTAC 4G/LTE/5G"
    : isDtacRf
      ? "DTAC / Real Future (TrueMove) 4G/LTE/5G"
      : "AIS Thailand 4G/LTE/5G";
  const apn =
    row.apn || (isDtac ? "internet" : isDtacRf ? "cmlink" : "e-ideas");
  const ip = isDtac ? "TH" : isDtacRf ? "HK" : "SG";
  const ipType = isDtac ? "泰國 IP" : isDtacRf ? "香港 IP" : "新加坡 IP";
  const routeType = isDtac ? "原生eSIM" : "漫遊";
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
      profit_percent: profit,
      profit_margin: `${profit}%`,
      profit_rate: `${profit}%`,
      margin: 1 + profit / 100,
      partner_rate_percent: row.partner_rate_percent,
      referral_discount_percent: row.referral_discount_percent,
      apn,
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind:
        row.throttle_kind || (isDtac ? "terminate" : "128kbps"),
      ip,
      has_local_number: Boolean(isDtac || row.has_local_number),
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: row.telecom,
        line: LINE,
        network,
        ip_type: ipType,
        route_type: routeType,
        hotspot: true,
        gpt: !isDtac,
        tiktok: !isDtac,
        gemini: !isDtac,
        local_number: isDtac,
        speed_rule: speedRule,
        coverage: "泰國",
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("thailand-daily-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [TELECOM_DTAC_RF, TELECOM_AIS, TELECOM_DTAC].filter(
    (t) => rows.some((r) => r.telecom === t),
  );

  const check500 = rows.find(
    (r) =>
      r.telecom === TELECOM_AIS &&
      r.day === 1 &&
      r.data_amount === "每日 500MB",
  );
  const check1g = rows.find(
    (r) =>
      r.telecom === TELECOM_AIS && r.day === 1 && r.data_amount === "每日 1GB",
  );
  const checkDtac = rows.find((r) => r.telecom === TELECOM_DTAC);
  const checkRf500 = rows.find(
    (r) =>
      r.telecom === TELECOM_DTAC_RF &&
      r.day === 1 &&
      r.data_amount === "每日 500MB",
  );
  const checkRf1g = rows.find(
    (r) =>
      r.telecom === TELECOM_DTAC_RF &&
      r.day === 1 &&
      r.data_amount === "每日 1GB",
  );
  if (checkRf500) {
    console.log(
      `核對 DTAC/RF 1天 500MB: HKD ${checkRf500.price_hkd} → cost NT$${checkRf500.cost_twd} → 售價 NT$${checkRf500.retail_twd}（${checkRf500.profit_percent}%） (${checkRf500.sku})`,
    );
  }
  if (checkRf1g) {
    console.log(
      `核對 DTAC/RF 1天 1GB: HKD ${checkRf1g.price_hkd} → cost NT$${checkRf1g.cost_twd} → 售價 NT$${checkRf1g.retail_twd}（${checkRf1g.profit_percent}%） (${checkRf1g.sku})`,
    );
  }
  if (check500) {
    console.log(
      `核對 AIS 1天 500MB: HKD ${check500.price_hkd} → cost NT$${check500.cost_twd} → 售價 NT$${check500.retail_twd}（${check500.profit_percent}%） (${check500.sku})`,
    );
  }
  if (check1g) {
    console.log(
      `核對 AIS 1天 1GB: HKD ${check1g.price_hkd} → cost NT$${check1g.cost_twd} → 售價 NT$${check1g.retail_twd}（${check1g.profit_percent}%） (${check1g.sku})`,
    );
  }
  if (checkDtac) {
    console.log(
      `核對 DTAC ${checkDtac.daysLabel} ${checkDtac.data_amount}: HKD ${checkDtac.price_hkd} → cost NT$${checkDtac.cost_twd} → 售價 NT$${checkDtac.retail_twd}（${checkDtac.profit_percent}%） (${checkDtac.sku})`,
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
    country: "TH",
    plan_kind: "daily",
    hot_sale_telecoms: [TELECOM_DTAC_RF, TELECOM_DTAC, TELECOM_AIS],
    carrier_profit_by_carrier: {
      [TELECOM_DTAC_RF]: PROFIT_BY_KIND.dtac_rf,
      [TELECOM_AIS]: PROFIT_BY_KIND.ais,
      [TELECOM_DTAC]: PROFIT_BY_KIND.dtac,
    },
    carrier_partner_rate_by_carrier: {
      [TELECOM_DTAC_RF]: PARTNER_BY_KIND.dtac_rf,
      [TELECOM_AIS]: PARTNER_BY_KIND.ais,
      [TELECOM_DTAC]: PARTNER_BY_KIND.dtac,
    },
    carrier_referral_discount_by_carrier: {
      [TELECOM_DTAC_RF]: REFERRAL_BY_KIND.dtac_rf,
      [TELECOM_AIS]: REFERRAL_BY_KIND.ais,
      [TELECOM_DTAC]: REFERRAL_BY_KIND.dtac,
    },
    seo_title: "泰國 eSIM 每日型｜DTAC／AIS｜Jeko eSIM",
    seo_description:
      "泰國每日型 eSIM：DTAC／REAL FUTURE（高 CP）、AIS（新加坡 IP 漫遊）與 DTAC 原生（帶號碼）。依天數與每日流量選購，支援熱點分享。",
    seo_keywords:
      "泰國eSIM,每日型eSIM,DTAC,REAL FUTURE,AIS,原生eSIM,漫遊eSIM,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_DTAC_RF]:
        "每日型・DTAC／REAL FUTURE・香港 IP 漫遊・每日額度用完降速 128kbps",
      [TELECOM_AIS]:
        "每日型・AIS Thailand・新加坡 IP 漫遊・每日額度用完降速 128kbps",
      [TELECOM_DTAC]:
        "每日型・DTAC 原生・泰國 IP・帶號碼・每日 5GB 用完斷網",
    },
    carrier_specs_by_carrier: {
      [TELECOM_DTAC_RF]: {
        ip_type: "香港 IP",
        route_type: "漫遊",
        network: "DTAC / Real Future (TrueMove) 4G/LTE/5G",
        speed_rule: "每日高速用完後降速至約 128 kbps（隔日恢復額度）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "cmlink",
      },
      [TELECOM_AIS]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊",
        network: "AIS Thailand 4G/LTE/5G",
        speed_rule: "每日高速用完後降速至約 128 kbps（隔日恢復額度）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
      },
      [TELECOM_DTAC]: {
        ip_type: "泰國 IP",
        route_type: "原生eSIM",
        network: "DTAC 4G/LTE/5G",
        speed_rule: "每日 5GB 高速用完即斷網（隔日恢復）",
        apps: "熱點分享",
        apn: "internet",
        local_number: true,
      },
    },
    key_features_by_carrier: {
      [TELECOM_DTAC_RF]: dtacRealFutureDailyKeyFeatures(),
      [TELECOM_AIS]: aisDailyKeyFeatures(),
      [TELECOM_DTAC]: dtacDailyKeyFeatures(),
    },
    overview_notices_by_carrier: {
      [TELECOM_DTAC_RF]: {
        fup_notice:
          "公平使用政策 (FUP): 每日高速額度用完後降速至約 128 kbps，可持續使用；隔日恢復高速額度。實際速度取決於您的位置及網路環境。",
        activation_notice: "建議抵達泰國後再安裝／啟用 eSIM",
      },
      [TELECOM_AIS]: {
        fup_notice:
          "公平使用政策 (FUP): 每日高速額度用完後降速至約 128 kbps，可持續使用；隔日恢復高速額度。實際速度取決於您的位置及網路環境。",
        activation_notice: "建議抵達泰國後再安裝／啟用 eSIM",
      },
      [TELECOM_DTAC]: {
        fup_notice:
          "公平使用政策 (FUP): 每日 5GB 高速額度用完即斷網，隔日恢復。實際速度取決於您的位置及網路環境。",
        activation_notice:
          "建議抵達泰國後、於覆蓋範圍內再安裝／啟用 eSIM。泰國原生卡請勿在覆蓋範圍外安裝，否則方案可能失效。",
      },
    },
  };

  const payloadBase = {
    title: "泰國 eSIM 每日型",
    subtitle: "DTAC／AIS｜每日流量｜支援熱點",
    handle: HANDLE,
    description:
      "泰國 eSIM 每日型，三種電信：DTAC／REAL FUTURE（高 CP 漫遊，每日 500MB～3GB）、AIS Thailand（新加坡 IP 漫遊）與 DTAC 原生（帶號碼，每日 5GB／10 天）。支援熱點，依天數與用量選購。",
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
  const nRf = rows.filter((r) => r.kind === "dtac_rf").length;
  const nAis = rows.filter((r) => r.kind === "ais").length;
  const nDtac = rows.filter((r) => r.kind === "dtac").length;
  console.log(
    `📦 方案 ${rows.length} 筆（DTAC/RF ${nRf} + AIS ${nAis} + DTAC ${nDtac}）・利潤 55%／50%／60%`,
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
        "若要重建變體請加：HKD_TO_TWD=4.5 node scripts/create-thailand-daily-product.mjs --rebuild",
      );
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants`,
  );
  const vs = check.product?.variants || [];
  console.log("\n======= 完成 =======");
  console.log(`前台: /product/thailand/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log("範例 DTAC/RF 500MB/1天 →", checkRf500);
  console.log("範例 AIS 500MB/1天 →", check500);
  console.log("範例 DTAC →", checkDtac);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
