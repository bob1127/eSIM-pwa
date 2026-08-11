/**
 * 建立「泰國 eSIM 總量型」— 三個電信變體
 *   1) AIS ← Thailand-Total*GB（AIS Thailand／e-ideas／新加坡 IP 漫遊）
 *      利潤 40%｜專屬夥伴連結 25%｜95 折（5%）
 *   2) TRUE ← Thailand-Local-Total*（TRUE 原生 TH IP；7天／10天）
 *      利潤 70%｜專屬夥伴連結 50%｜95 折（5%）
 *   3) DTAC / REAL FUTURE ← Southeast Asia 4-Total*（多國含泰；前台只顯示泰國電信名）
 *      利潤 40%｜專屬夥伴連結 25%｜95 折（5%）
 *   （選品神器對齊：漫遊／高 CP 40%／TRUE 原生 70%）
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-thailand-total-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-thailand-total-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  aisKeyFeatures,
  trueLocalTotalKeyFeatures,
  dtacRealFutureTotalKeyFeatures,
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

const HANDLE = "thailand-total-esim";
const TELECOM_AIS = "AIS";
const TELECOM_TRUE = "TRUE";
const TELECOM_DTAC_RF = TH_TELECOM_DTAC_RF; // "DTAC / REAL FUTURE"
const LINE = "總量型";

const PROFIT_BY_TELECOM = {
  [TELECOM_AIS]: 40,
  [TELECOM_TRUE]: 70,
  [TELECOM_DTAC_RF]: 40,
};
const PARTNER_RATE_BY_TELECOM = {
  [TELECOM_AIS]: 25,
  [TELECOM_TRUE]: 50,
  [TELECOM_DTAC_RF]: 25,
};
const REFERRAL_DISCOUNT_BY_TELECOM = {
  [TELECOM_AIS]: 5, // 95 折
  [TELECOM_TRUE]: 5, // 95 折
  [TELECOM_DTAC_RF]: 5,
};

const DATA_ORDER = ["3GB", "5GB", "10GB", "15GB", "20GB", "30GB", "50GB"];
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

function dataRank(label) {
  const i = DATA_ORDER.indexOf(String(label || ""));
  return i >= 0 ? i : 99;
}

function telecomRank(telecom) {
  if (telecom === TELECOM_DTAC_RF) return 0; // 高 CP 優先
  if (telecom === TELECOM_AIS) return 1;
  if (telecom === TELECOM_TRUE) return 2;
  return 9;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "thailand-total-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, telecom, kind) => {
    const profit = PROFIT_BY_TELECOM[telecom];
    for (const p of list || []) {
      const hkd = Number(p.price_hkd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      const dataAmount = p.data_amount || "5GB";
      rows.push({
        ...p,
        data_amount: dataAmount,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost, profit),
        profit_percent: profit,
        partner_rate_percent: PARTNER_RATE_BY_TELECOM[telecom],
        referral_discount_percent: REFERRAL_DISCOUNT_BY_TELECOM[telecom],
        telecom,
        daysLabel: `${p.day}天`,
        kind,
      });
    }
  };
  push(raw.dtac_rf, TELECOM_DTAC_RF, "dtac_rf");
  push(raw.ais, TELECOM_AIS, "ais");
  push(raw.true, TELECOM_TRUE, "true");
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
  const isTrue = row.kind === "true";
  const isDtacRf = row.kind === "dtac_rf";
  const dataAmount = row.data_amount;
  const profit = row.profit_percent;
  const speedRule =
    row.speed_rule ||
    (isTrue
      ? "高速用完後降速（依供應商規則）"
      : "高速用完後降速至約 128 kbps");
  const network = isTrue
    ? "TRUE 4G/5G"
    : isDtacRf
      ? "DTAC / Real Future (TrueMove) 4G/LTE/5G"
      : "AIS Thailand 4G/LTE/5G";
  const apn = row.apn || (isTrue ? "internet" : isDtacRf ? "cmlink" : "e-ideas");
  const ip = isTrue ? "TH" : isDtacRf ? "HK" : "SG";
  const ipType = isTrue ? "泰國 IP" : isDtacRf ? "香港 IP" : "新加坡 IP";
  const routeType = isTrue ? "原生eSIM" : "漫遊";

  return {
    title: `${row.telecom} · ${row.daysLabel} · ${dataAmount}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: row.telecom,
      數據量: dataAmount,
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: row.telecom,
      data: dataAmount,
      data_amount: dataAmount,
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
      ip,
      attributes: {
        days: row.day,
        data: dataAmount,
        data_amount: dataAmount,
        telecom: row.telecom,
        line: LINE,
        network,
        ip_type: ipType,
        route_type: routeType,
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: speedRule,
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("thailand-total-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [TELECOM_DTAC_RF, TELECOM_AIS, TELECOM_TRUE];

  for (const telecom of telecomValues) {
    const sample =
      rows.find((r) => r.telecom === telecom && r.day === 7) ||
      rows.find((r) => r.telecom === telecom);
    if (sample) {
      console.log(
        `核對 ${telecom} ${sample.daysLabel} ${sample.data_amount}: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（利潤 ${sample.profit_percent}%｜夥伴 ${sample.partner_rate_percent}%｜折扣 ${sample.referral_discount_percent}%） (${sample.sku})`,
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
    country: "TH",
    plan_kind: "total",
    hot_sale_telecoms: [TELECOM_DTAC_RF, TELECOM_TRUE],
    carrier_profit_by_carrier: {
      [TELECOM_DTAC_RF]: PROFIT_BY_TELECOM[TELECOM_DTAC_RF],
      [TELECOM_AIS]: PROFIT_BY_TELECOM[TELECOM_AIS],
      [TELECOM_TRUE]: PROFIT_BY_TELECOM[TELECOM_TRUE],
    },
    carrier_partner_rate_by_carrier: {
      [TELECOM_DTAC_RF]: PARTNER_RATE_BY_TELECOM[TELECOM_DTAC_RF],
      [TELECOM_AIS]: PARTNER_RATE_BY_TELECOM[TELECOM_AIS],
      [TELECOM_TRUE]: PARTNER_RATE_BY_TELECOM[TELECOM_TRUE],
    },
    carrier_referral_discount_by_carrier: {
      [TELECOM_DTAC_RF]: REFERRAL_DISCOUNT_BY_TELECOM[TELECOM_DTAC_RF],
      [TELECOM_AIS]: REFERRAL_DISCOUNT_BY_TELECOM[TELECOM_AIS],
      [TELECOM_TRUE]: REFERRAL_DISCOUNT_BY_TELECOM[TELECOM_TRUE],
    },
    seo_title: "泰國 eSIM 總量型｜DTAC／AIS／TRUE｜Jeko eSIM",
    seo_description:
      "泰國總量型 eSIM：DTAC／REAL FUTURE（高 CP）、AIS（新加坡 IP 漫遊）與 TRUE（泰國 IP 原生）。依天數與總量選購，支援熱點分享。",
    seo_keywords:
      "泰國eSIM,總量型eSIM,DTAC,REAL FUTURE,AIS,TRUE,原生eSIM,漫遊eSIM,總量流量,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_DTAC_RF]: "總量型・DTAC／REAL FUTURE・香港 IP 漫遊・用完降速 128kbps",
      [TELECOM_AIS]: "總量型・AIS Thailand・新加坡 IP 漫遊・用完降速 128kbps",
      [TELECOM_TRUE]: "總量型・TRUE 原生・泰國當地 IP",
    },
    carrier_specs_by_carrier: {
      [TELECOM_DTAC_RF]: {
        ip_type: "香港 IP",
        route_type: "漫遊",
        network: "DTAC / Real Future (TrueMove) 4G/LTE/5G",
        speed_rule: "方案總量高速用完後降速至約 128 kbps（可持續使用）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "cmlink",
      },
      [TELECOM_AIS]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊",
        network: "AIS Thailand 4G/LTE/5G",
        speed_rule: "方案總量高速用完後降速至約 128 kbps（可持續使用）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
      },
      [TELECOM_TRUE]: {
        ip_type: "泰國 IP",
        route_type: "原生eSIM",
        network: "TRUE 4G/5G",
        speed_rule:
          "15GB／7天：用完降速約 1 Mbps；50GB／10天：用完降速約 384 kbps",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "internet",
      },
    },
    key_features_by_carrier: {
      [TELECOM_DTAC_RF]: dtacRealFutureTotalKeyFeatures(),
      [TELECOM_AIS]: aisKeyFeatures(),
      [TELECOM_TRUE]: trueLocalTotalKeyFeatures(),
    },
    overview_notices_by_carrier: {
      [TELECOM_DTAC_RF]: {
        fup_notice:
          "公平使用政策 (FUP): 方案總量高速用完後降速至約 128 kbps，可持續使用。實際速度取決於您的位置及網路環境。",
        activation_notice: "建議抵達泰國後再安裝／啟用 eSIM",
      },
      [TELECOM_AIS]: {
        fup_notice:
          "公平使用政策 (FUP): 方案總量高速用完後降速至約 128 kbps，可持續使用。實際速度取決於您的位置及網路環境。",
        activation_notice: "建議抵達泰國後再安裝／啟用 eSIM",
      },
      [TELECOM_TRUE]: {
        fup_notice:
          "公平使用政策 (FUP): 方案總量高速用完後降速（15GB 約 1 Mbps／50GB 約 384 kbps），可持續使用。實際速度取決於您的位置及網路環境。",
        activation_notice:
          "建議抵達泰國後再安裝／啟用 eSIM。泰國原生卡請勿在覆蓋範圍外安裝，否則方案可能失效。",
      },
    },
  };

  const payloadBase = {
    title: "泰國 eSIM 總量型",
    subtitle: "DTAC／AIS／TRUE｜依天數與總量選購｜支援熱點",
    handle: HANDLE,
    description:
      "泰國 eSIM 總量型，三種電信：DTAC／REAL FUTURE（高 CP 漫遊）、AIS（AIS Thailand／新加坡 IP 漫遊，高速用完後約 128 kbps）與 TRUE（原生泰國 IP：15GB／7天、50GB／10天）。支援熱點與主流 App，依天數與流量選購。",
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
  const nDtac = rows.filter((r) => r.telecom === TELECOM_DTAC_RF).length;
  const nAis = rows.filter((r) => r.telecom === TELECOM_AIS).length;
  const nTrue = rows.filter((r) => r.telecom === TELECOM_TRUE).length;
  console.log(
    `📦 方案 ${rows.length} 筆（DTAC/RF ${nDtac} + AIS ${nAis} + TRUE ${nTrue}）・利潤 40%／40%／70%`,
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
        "若要重建變體請加：HKD_TO_TWD=4.5 node scripts/create-thailand-total-product.mjs --rebuild",
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
  console.log(
    `範例: DTAC/RF →`,
    rows.find(
      (r) =>
        r.telecom === TELECOM_DTAC_RF && r.day === 3 && r.data_amount === "3GB",
    ),
  );
  console.log(
    `範例: AIS →`,
    rows.find((r) => r.telecom === TELECOM_AIS && r.day === 3 && r.data_amount === "3GB"),
  );
  console.log(
    `範例: TRUE →`,
    rows.find((r) => r.telecom === TELECOM_TRUE && r.day === 7),
  );
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
