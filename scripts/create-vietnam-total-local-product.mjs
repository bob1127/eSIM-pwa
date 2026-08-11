/**
 * 建立／更新「越南 eSIM 總量型」— 三個原生當地 IP 電信：
 *   1) Vinaphone ← Vietnam-local-Total*（VN IP，APN m3-world，5G）
 *      預設 100%；20GB／30GB → 60%；50GB → 55%
 *   2) Wintel ← Vietnam-Local-Total*（VN IP，APN m9-wintel）
 *      預設 100%；20GB／30GB → 75%；50GB → 65%
 *   3) Mobifone 當地號碼 ← Vietnam-Local-Total*（m-wap，帶號碼）— 利潤 85%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-vietnam-total-local-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VINAPHONE_KEY_FEATURES } from "../content/product-detailed/vinaphone-local-key-features.js";
import { VINAPHONE_LOCAL_DETAILED_CONTENT_HTML } from "../content/product-detailed/vinaphone-local.js";
import {
  MOBIFONE_LOCAL_KEY_FEATURES,
  TELECOM_MOBIFONE_LOCAL,
} from "../content/product-detailed/mobifone-local-key-features.js";
import { MOBIFONE_LOCAL_DETAILED_CONTENT_HTML } from "../content/product-detailed/mobifone-local.js";
import { WINTEL_KEY_FEATURES } from "../content/product-detailed/wintel-local-key-features.js";

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

const HANDLE = "vietnam-total-local-esim";
const TELECOM_VINAPHONE = "Vinaphone";
const TELECOM_WINTEL = "Wintel";
const TELECOM_MOBIFONE = TELECOM_MOBIFONE_LOCAL; // "Mobifone 當地號碼"
const LINE = "原生線路";

/** 預設利潤；大流量另有覆寫 */
const PROFIT_DEFAULT_BY_TELECOM = {
  [TELECOM_VINAPHONE]: 100,
  [TELECOM_WINTEL]: 100,
  [TELECOM_MOBIFONE]: 85,
};

/** 依電信 × 流量覆寫利潤（未列則用預設） */
const PROFIT_BY_TELECOM_DATA = {
  [TELECOM_VINAPHONE]: {
    "20GB": 60,
    "30GB": 60,
    "50GB": 55,
  },
  [TELECOM_WINTEL]: {
    "20GB": 75,
    "30GB": 75,
    "50GB": 65,
  },
};

function resolveProfit(telecom, dataAmount) {
  const data = String(dataAmount || "").toUpperCase().replace(/\s+/g, "");
  const byData = PROFIT_BY_TELECOM_DATA[telecom];
  if (byData && Number.isFinite(byData[data])) return byData[data];
  return PROFIT_DEFAULT_BY_TELECOM[telecom] ?? 100;
}

const DATA_ORDER = [
  "1GB",
  "2GB",
  "3GB",
  "5GB",
  "10GB",
  "15GB",
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
const CATEGORY_IDS = ["pcat_01KZJNBYMN524P29B285E6XFF5"]; // vietnam
const THUMB =
  process.env.VIETNAM_PRODUCT_THUMB ||
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829TZQCPYT6AZE92A4XF2.png";
/** 與越南每日型同一組商品圖 */
const PRODUCT_IMAGES = (
  process.env.VIETNAM_PRODUCT_IMAGES
    ? process.env.VIETNAM_PRODUCT_IMAGES.split(",").map((s) => s.trim()).filter(Boolean)
    : [
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829TZQCPYT6AZE92A4XF2.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829V2TSY138ZN02BJRJA2.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829V3KQZ01YKCWS09J3H7.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829V5TFFF48WEVKHEM2GX.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829V7ZT5SJ6JNPECWD6PW.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829V8PYDRJ8RN0CSRRDTW.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829V9NVSKPSKSR9DE3YYX.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829VA45TD5JDXEZJCQBF5.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829VCE00HTJP4F5NGVKHV.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829VDMETW32XPJPAK4S2Z.png",
        "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK829VF5DQN9PSGG81BCEZJ.jpg",
      ]
).map((url) => ({ url }));

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
  if (t === TELECOM_MOBIFONE) return 0; // 當地號碼優先
  if (t === TELECOM_VINAPHONE) return 1;
  if (t === TELECOM_WINTEL) return 2;
  return 9;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "vietnam-total-local-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, telecom) => {
    for (const p of list || []) {
      const hkd = Number(p.price_hkd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      const dataAmount = p.data_amount || "5GB";
      const profit = resolveProfit(telecom, dataAmount);
      rows.push({
        ...p,
        data_amount: dataAmount,
        telecom,
        plan_kind: "total",
        profit_percent: profit,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost, profit),
        daysLabel: `${p.day}天`,
      });
    }
  };
  push(raw.mobifone, TELECOM_MOBIFONE);
  push(raw.vinaphone, TELECOM_VINAPHONE);
  push(raw.wintel, TELECOM_WINTEL);

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
      (String(r.sku).includes("-D0") &&
        !String(prev.sku).match(/-A0|-D0/)) ||
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
  const isVinaphone = row.telecom === TELECOM_VINAPHONE;
  const isMobifone = row.telecom === TELECOM_MOBIFONE;
  const speedRule =
    row.speed_rule ||
    (isVinaphone
      ? "總量高速用完後降速至約 128 kbps"
      : "總量用完後斷網");
  const network = isMobifone
    ? "Mobifone 4G/LTE"
    : isVinaphone
      ? "Vinaphone 4G/LTE/5G"
      : "Wintel 4G/LTE";
  const apn =
    row.apn ||
    (isMobifone ? "m-wap" : isVinaphone ? "m3-world" : "m9-wintel");

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
      plan_kind: "total",
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd || ""),
      cost_price: row.cost_twd,
      profit_rate: `${profit}%`,
      profit_percent: profit,
      margin,
      apn,
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: row.throttle_kind || "",
      ip: "VN",
      has_local_number: Boolean(isMobifone || row.has_local_number),
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: row.telecom,
        line: LINE,
        network,
        ip_type: "越南IP",
        route_type: "原生eSIM",
        hotspot: true,
        gpt: !isMobifone,
        tiktok: true,
        gemini: !isMobifone,
        local_number: isMobifone,
        incoming_call: isMobifone,
        incoming_sms: isMobifone,
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
  if (!rows.length) throw new Error("vietnam-total-local-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [
    TELECOM_MOBIFONE,
    TELECOM_VINAPHONE,
    TELECOM_WINTEL,
  ].filter((t) => rows.some((r) => r.telecom === t));

  for (const t of telecomValues) {
    const samples = [
      rows.find((r) => r.telecom === t && r.data_amount === "20GB"),
      rows.find((r) => r.telecom === t && r.data_amount === "30GB"),
      rows.find((r) => r.telecom === t && r.data_amount === "50GB"),
      rows.find((r) => r.telecom === t),
    ].filter(Boolean);
    const seen = new Set();
    for (const sample of samples) {
      const k = `${sample.data_amount}`;
      if (seen.has(k)) continue;
      seen.add(k);
      console.log(
        `核對 ${t} ${sample.daysLabel} ${sample.data_amount}: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（${sample.profit_percent}%） (${sample.sku})`,
      );
    }
    if (!samples.length) console.warn(`⚠️ 無 ${t} 方案`);
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
    plan_kind: "total",
    hot_sale_telecoms: [TELECOM_MOBIFONE],
    carrier_profit_by_carrier: {
      [TELECOM_MOBIFONE]: PROFIT_DEFAULT_BY_TELECOM[TELECOM_MOBIFONE],
      [TELECOM_VINAPHONE]: PROFIT_DEFAULT_BY_TELECOM[TELECOM_VINAPHONE],
      [TELECOM_WINTEL]: PROFIT_DEFAULT_BY_TELECOM[TELECOM_WINTEL],
    },
    carrier_profit_by_carrier_data: {
      [TELECOM_VINAPHONE]: PROFIT_BY_TELECOM_DATA[TELECOM_VINAPHONE],
      [TELECOM_WINTEL]: PROFIT_BY_TELECOM_DATA[TELECOM_WINTEL],
    },
    seo_title:
      "越南 eSIM 總量型｜Mobifone 當地號碼／Vinaphone／Wintel｜Jeko eSIM",
    seo_description:
      "越南總量型原生 eSIM：Mobifone 當地號碼、Vinaphone 5G、Wintel 當地 VN IP。依天數與總流量選購，支援熱點與常用 App。",
    seo_keywords:
      "越南eSIM,總量型,Mobifone,當地號碼,Vinaphone,Wintel,原生卡,當地IP,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_MOBIFONE]:
        "總量型・Mobifone 原生・越南 IP・當地號碼・接聽／收簡訊免費",
      [TELECOM_VINAPHONE]:
        "總量型・Vinaphone 原生 5G・越南 IP・用完降速約 128kbps",
      [TELECOM_WINTEL]: "總量型・Wintel 原生・越南 IP・用完斷網",
    },
    carrier_specs_by_carrier: {
      [TELECOM_MOBIFONE]: {
        ip_type: "越南IP",
        route_type: "原生eSIM",
        network: "Mobifone 4G/LTE",
        speed_rule: "總量用完後斷網",
        apps: "熱點分享,TikTok,LINE,Zalo,Grab",
        apn: "m-wap",
        coverage: "越南",
        local_number: true,
      },
      [TELECOM_VINAPHONE]: {
        ip_type: "越南IP",
        route_type: "原生eSIM",
        network: "Vinaphone 4G/LTE/5G",
        speed_rule: "總量高速用完後降速至約 128 kbps",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "m3-world",
        coverage: "越南",
      },
      [TELECOM_WINTEL]: {
        ip_type: "越南IP",
        route_type: "原生eSIM",
        network: "Wintel 4G/LTE",
        speed_rule: "總量用完後斷網",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "m9-wintel",
        coverage: "越南",
      },
    },
    key_features_by_carrier: {
      [TELECOM_MOBIFONE]: MOBIFONE_LOCAL_KEY_FEATURES,
      [TELECOM_VINAPHONE]: VINAPHONE_KEY_FEATURES,
      [TELECOM_WINTEL]: WINTEL_KEY_FEATURES,
    },
    detailed_content_by_carrier: {
      [TELECOM_MOBIFONE]: MOBIFONE_LOCAL_DETAILED_CONTENT_HTML,
      [TELECOM_VINAPHONE]: VINAPHONE_LOCAL_DETAILED_CONTENT_HTML,
    },
    overview_notices_by_carrier: {
      [TELECOM_MOBIFONE]: {
        fup_notice:
          "總量型依所選流量提供高速額度，用完後斷網。Mobifone 原生網路，越南當地 IP，附當地號碼（僅限接聽來電／接收簡訊，免費）。",
        activation_notice:
          "有效期於 eSIM 下載到裝置後立即開始計算，請準備好使用時再安裝。抵達後請撥打 900，接著按 1 啟用。兌換後請於 30 天內完成啟用。",
        special_notice:
          "查詢手機號碼請撥打 *0#；查詢流量請撥打 *090*5#，或發送簡訊 KT_ALL 至 999。通話僅限接聽、簡訊僅限接收（免費）；旅遊 eSIM 可能無法保證應用程式註冊簡訊。",
      },
      [TELECOM_VINAPHONE]: {
        fup_notice:
          "總量型依所選流量提供高速額度，用完後降速至約 128 kbps。Vinaphone 原生 5G 網路，越南當地 IP。",
        activation_notice: "建議抵達越南後再安裝／啟用 eSIM",
      },
      [TELECOM_WINTEL]: {
        fup_notice:
          "總量型依所選流量提供高速額度，用完後斷網。Wintel 原生網路，越南當地 IP。",
        activation_notice: "建議抵達越南後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "越南 eSIM 總量型 原生 IP",
    subtitle: "Mobifone 當地號碼／Vinaphone／Wintel｜越南當地 IP",
    handle: HANDLE,
    description:
      "越南總量型原生 eSIM，可選 Mobifone 當地號碼（APN m-wap，接聽／收簡訊免費）、Vinaphone（APN m3-world，5G）或 Wintel（APN m9-wintel），皆為越南當地 IP。依天數與總流量選購，支援熱點與常用 App。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: PRODUCT_IMAGES,
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
  const nMf = rows.filter((r) => r.telecom === TELECOM_MOBIFONE).length;
  const nVp = rows.filter((r) => r.telecom === TELECOM_VINAPHONE).length;
  const nWt = rows.filter((r) => r.telecom === TELECOM_WINTEL).length;
  console.log(
    `📦 方案 ${rows.length} 筆（Mobifone ${nMf} + Vinaphone ${nVp} + Wintel ${nWt}）・Vinaphone 20/30GB=60%・50GB=55%；Wintel 20/30GB=75%・50GB=65%；其餘預設 100%／Mobifone 85%`,
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
        "重建變體：HKD_TO_TWD=4.5 node scripts/create-vietnam-total-local-product.mjs --rebuild",
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
