/**
 * 建立「日本吃到飽 eSIM｜吃到飽不降速eSIM」(japan-unlimited-esim-nolimit)
 *   AU(KDDI) 真。吃到飽不降速 ← Japan-Local-unlimited-*-D0（真・不限速）— 利潤 65%
 *
 * 10Mbps 吃到飽請用：scripts/create-japan-unlimited-product.mjs
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-japan-unlimited-nolimit-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-japan-unlimited-nolimit-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { japanUnlimitedKeyFeaturesByCarrier } from "../content/product-detailed/japan-unlimited-key-features.js";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";
import {
  JAPAN_PRODUCT_THUMB,
  japanProductImages,
} from "./lib/japanProductGallery.mjs";

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

const HANDLE = "japan-unlimited-esim-nolimit";
const TITLE = "日本吃到飽 eSIM｜吃到飽不降速eSIM";
const TELECOM_HS = "AU(KDDI) 真。吃到飽不降速";
const DATA = "無限流量";
const PROFIT = 65;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CATEGORY_IDS = ["pcat_01KZJNBV5DAJTWWG22KSHC7FTN"]; // japan
const THUMB = JAPAN_PRODUCT_THUMB;
const PRODUCT_IMAGES = japanProductImages();

function retailFromCost(costTwd, profitPercent = PROFIT) {
  return Math.ceil((costTwd * (1 + profitPercent / 100)) / 10) * 10 - 1;
}

function is10Mbps(p) {
  return /10\s*mbps/i.test(String(p.rule_desc || ""));
}

function isHighSpeed(p) {
  const rule = String(p.rule_desc || "").trim();
  if (/10\s*mbps/i.test(rule)) return false;
  return /high\s*speed/i.test(rule) || /^unlimited$/i.test(rule);
}

function highSpeedScore(p) {
  const rule = String(p.rule_desc || "");
  let s = 0;
  if (/high\s*speed/i.test(rule)) s += 1000;
  if (/username|password|chap/i.test(String(p.apn || ""))) s += 100;
  // 優先 D0（真不限速）
  if (/-D0$/i.test(String(p.name || ""))) s += 50;
  s += Math.max(0, 200 - Number(p.price || 0));
  return s;
}

async function fetchPlans() {
  const localCache = "/tmp/esim-full-plans.json";
  const urls = [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.result || [];
      if (list.length) {
        fs.writeFileSync(localCache, JSON.stringify(data));
        console.log(`📥 方案目錄 ${list.length} 筆（${url}）`);
        return list;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }

  // 直接打供應商（本機 .env ESIM_*）
  try {
    const { fetchMicroesimCatalog } = await import(
      "../lib/esim/microesimClient.js"
    );
    const list = await fetchMicroesimCatalog();
    if (list?.length) {
      fs.writeFileSync(localCache, JSON.stringify({ result: list }));
      console.log(`📥 方案目錄 ${list.length} 筆（MicroeSIM 直連）`);
      return list;
    }
  } catch (e) {
    console.warn(`⚠️ MicroeSIM 直連: ${e.message}`);
  }

  if (fs.existsSync(localCache)) {
    const data = JSON.parse(fs.readFileSync(localCache, "utf8"));
    console.log("📥 使用快取 /tmp/esim-full-plans.json");
    return data.result || [];
  }
  throw new Error("無法取得方案目錄");
}

function pickByDay(raw, pred, scoreFn) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!/^Japan-Local-unlimited-/i.test(name)) continue;
    const plan = {
      ...p,
      name,
      price: Number(p.price) || 0,
      day: Number(p.day) || 0,
      rule_desc: p.rule_desc || "",
      apn: String(p.apn || "").trim(),
      networks: p.networks || "JP:KDDI[4G;5G]|",
      ip: String(p.ip || "JP").trim(),
      plan_id: p.channel_dataplan_id || p.id,
    };
    if (!pred(plan)) continue;
    const day = plan.day;
    if (!day) continue;
    const hkd = plan.price;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    const score = scoreFn
      ? scoreFn(plan)
      : Math.max(0, 500 - hkd) + (/-D1$/i.test(name) ? 20 : 0);
    const prev = map.get(day);
    if (!prev || score > prev._score) {
      map.set(day, {
        sku: name,
        plan_id: plan.plan_id,
        day,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost),
        profit: PROFIT,
        apn: plan.apn,
        networks: plan.networks,
        rule_desc: plan.rule_desc,
        ip: plan.ip,
        _score: score,
      });
    }
  }
  return [...map.values()]
    .map(({ _score, ...rest }) => rest)
    .sort((a, b) => a.day - b.day);
}

function toVariant(r, telecom, kind) {
  const manual = /username|password|chap/i.test(r.apn);
  const needsApnPopup = kind === "hs" && r.day >= 10;
  const fup =
    kind === "10"
      ? "公平使用政策 (FUP)：限速約 10 Mbps 吃到飽（實際速度依位置與網路環境變動）。"
      : "公平使用政策 (FUP)：高速數據吃到飽，實際速度取決於位置及網路環境（真・不限速）。";
  return {
    title: `${telecom} · ${r.day}天 · ${DATA}`,
    sku: `${r.sku}-${kind === "10" ? "AU10" : "AUHS"}`,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: `${r.day}天`,
      電信商: telecom,
      數據量: DATA,
    },
    prices: [{ currency_code: "twd", amount: r.retail_twd }],
    metadata: {
      plan_id: r.plan_id,
      type: "esim",
      carrier: telecom,
      plan_kind: "unlimited",
      data: DATA,
      data_amount: DATA,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: r.cost_twd,
      profit_percent: r.profit,
      profit_margin: `${r.profit}%`,
      profit_rate: `${r.profit}%`,
      margin: 1 + r.profit / 100,
      supplier_sku: r.sku,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      ip: r.ip,
      apn_manual_reminder: needsApnPopup,
      attributes: {
        days: r.day,
        data: DATA,
        data_amount: DATA,
        telecom,
        network: "AU(KDDI) 4G/5G",
        ip_type: "日本 IP",
        route_type: "原生eSIM",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: fup,
        fup,
        apn: r.apn,
        apn_manual: manual || needsApnPopup,
        apps:
          manual || needsApnPopup
            ? "天數≥10 天若無法上網，請依購買提醒手動設定 APN"
            : "APN 自動設定",
      },
    },
  };
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

async function admin(token, apiPath, options = {}, retries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
    } catch (e) {
      lastErr = e;
      console.warn(
        `⚠️ admin ${apiPath} 失敗 (${attempt}/${retries}): ${e.message}`,
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  throw lastErr;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD} · 利潤 ${PROFIT}%`);
  console.log(`  ${TELECOM_HS}（HOT SALE）`);

  const raw = await fetchPlans();
  const rowsHs = pickByDay(raw, isHighSpeed, highSpeedScore);
  if (!rowsHs.length) throw new Error("找不到 Japan-Local-unlimited 真不限速");

  for (const r of [rowsHs.find((x) => x.day === 4), rowsHs.find((x) => x.day === 5)].filter(Boolean)) {
    console.log(
      `  [真不限速] ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}`,
    );
  }
  console.log(`共真不限速 ${rowsHs.length} 款`);

  const dayValues = rowsHs.map((r) => `${r.day}天`);
  const telecomValues = [TELECOM_HS];

  const keyFeatures = japanUnlimitedKeyFeaturesByCarrier();
  const productMeta = {
    type: "esim",
    country: "JP",
    is_native: true,
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM_HS],
    carrier_profit_by_carrier: {
      [TELECOM_HS]: PROFIT,
    },
    subtitle_by_carrier: {
      [TELECOM_HS]:
        "原生eSIM｜AU(KDDI)｜日本 IP｜真・不限速｜≥10天可能需手動 APN",
    },
    key_features_by_carrier: {
      [TELECOM_HS]: keyFeatures[TELECOM_HS],
      "AU(KDDI) 高速數據": keyFeatures[TELECOM_HS],
      "AU(KDDI)": keyFeatures[TELECOM_HS],
    },
    overview_notices_by_carrier: {
      [TELECOM_HS]: {
        fup_notice:
          "真・不限速吃到飽。天數 10 天（含）以上若無法上網，請依購買提醒手動設定 APN。",
        activation_notice: "建議抵達日本後再安裝／啟用 eSIM；≥10 天請留意 APN 提醒",
      },
    },
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "AU(KDDI) 原生｜真・不限速吃到飽｜日本 IP",
    handle: HANDLE,
    description:
      "日本吃到飽 eSIM｜吃到飽不降速eSIM。AU(KDDI) 原生真・不限速高速數據（HOT SALE）。日本本地 IP，支援熱點與常用 App。天數 ≥10 天可能需手動設定 APN（購買前會提示）。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: PRODUCT_IMAGES,
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: [DATA] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: CATEGORY_IDS.map((id) => ({ id })),
  };

  const variants = rowsHs.map((r) => toVariant(r, TELECOM_HS, "hs"));

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();

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

    if (!REBUILD) {
      console.log("（未加 --rebuild，僅更新商品資訊；變體不變）");
      console.log(
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-japan-unlimited-nolimit-product.mjs --rebuild",
      );
      return;
    }

    const oldIds = [];
    let offset = 0;
    for (;;) {
      const page = await admin(
        token,
        `/admin/products/${product.id}/variants?limit=${BATCH_SIZE}&offset=${offset}&fields=id`,
      );
      const pageRows = page.variants || [];
      oldIds.push(...pageRows.map((v) => v.id).filter(Boolean));
      if (pageRows.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }
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
  console.log(`前台: /product/japan/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "電信商選項:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
