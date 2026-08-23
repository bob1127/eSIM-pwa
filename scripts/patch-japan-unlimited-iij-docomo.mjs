/**
 * japan-unlimited-esim 補回 IIJ Docomo 吃到飽（JapanIIJ-unlimited-* @ 65%）
 *
 *   HKD_TO_TWD=4.5 node scripts/patch-japan-unlimited-iij-docomo.mjs
 *   HKD_TO_TWD=4.5 node scripts/patch-japan-unlimited-iij-docomo.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { japanUnlimitedKeyFeaturesByCarrier } from "../content/product-detailed/japan-unlimited-key-features.js";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
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

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const backendIdx = args.indexOf("--backend");

const MEDUSA_URL = (
  (backendIdx >= 0 ? args[backendIdx + 1] : null) ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const INTERNAL_SECRET = process.env.PRODUCT_CONTENT_ADMIN_SECRET || "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const HANDLE = "japan-unlimited-esim";
const TELECOM = "IIJ Docomo";
const DATA = "無限流量";
const PROFIT = Number(process.env.JAPAN_IIJ_UNLIMITED_PROFIT || 65);
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 40;

function retail(costTwd, profitPercent = PROFIT) {
  return Math.ceil((costTwd * (1 + profitPercent / 100)) / 10) * 10 - 1;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchPlans() {
  for (const url of [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ].filter(Boolean)) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.result?.length) return data.result;
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }
  throw new Error("無法取得方案目錄");
}

function pickIijUnlimitedRows(raw) {
  const map = new Map();
  for (const p of raw) {
    const name = String(p.name || p.channel_dataplan_name || "").trim();
    if (!/^JapanIIJ-unlimited-\d+-[AB]\d$/i.test(name)) continue;
    const day = Number(p.day) || 0;
    if (!day) continue;
    const hkd = Number(p.price) || 0;
    const prev = map.get(day);
    if (!prev || hkd < prev.price_hkd) {
      map.set(day, {
        sku: name,
        plan_id: p.channel_dataplan_id || p.id,
        day,
        price_hkd: hkd,
        apn: String(p.apn || "vmobile.jp").trim(),
        networks: p.networks || "JP:IIJ(Docomo)[4G;LTE]|",
        rule_desc: p.rule_desc || "Unlimited High Speed",
        ip: String(p.ip || "JP").trim(),
      });
    }
  }
  return [...map.values()].sort((a, b) => a.day - b.day);
}

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
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
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`[${apiPath}] 非 JSON: ${text.slice(0, 300)}`);
      }
      if (!res.ok) {
        throw new Error(
          `[${apiPath}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 400)}`,
        );
      }
      return data;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastErr;
}

async function internalContent(body) {
  if (!INTERNAL_SECRET || INTERNAL_SECRET.length < 16) return false;
  const res = await fetch(`${MEDUSA_URL}/store/internal/product-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Product-Admin-Secret": INTERNAL_SECRET,
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      `product-content ${res.status}: ${data.error || data.detail || ""}`,
    );
  }
  return true;
}

function toVariant(r) {
  const cost = Math.ceil(r.price_hkd * HKD_TO_TWD);
  const fup =
    "公平使用政策 (FUP)：高速數據吃到飽（Unlimited High Speed）。需手動設定 APN：vmobile.jp。";
  return {
    title: `${TELECOM} · ${r.day}天 · ${DATA}`,
    sku: `${r.sku}-IIJ`,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: `${r.day}天`,
      電信商: TELECOM,
      數據量: DATA,
    },
    prices: [{ currency_code: "twd", amount: retail(cost) }],
    metadata: {
      plan_id: r.plan_id,
      type: "esim",
      carrier: TELECOM,
      plan_kind: "unlimited",
      data: DATA,
      data_amount: DATA,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: cost,
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: 1 + PROFIT / 100,
      supplier_sku: r.sku,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      ip: r.ip,
      attributes: {
        days: r.day,
        data: DATA,
        data_amount: DATA,
        telecom: TELECOM,
        network: "DOCOMO 4G/LTE（IIJ）",
        ip_type: "日本 IP",
        route_type: "原生eSIM",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: fup,
        fup,
        apn: r.apn,
        apn_manual: true,
        apps: "需手動設定 APN：vmobile.jp",
      },
    },
  };
}

async function main() {
  console.log(
    `Medusa: ${MEDUSA_URL} · ${HANDLE} · IIJ unlimited @${PROFIT}% · dryRun=${dryRun}`,
  );
  const raw = await fetchPlans();
  const rows = pickIijUnlimitedRows(raw);
  if (!rows.length) throw new Error("找不到 JapanIIJ-unlimited 方案");

  const sample = rows.find((r) => r.day === 5) || rows[0];
  const cost5 = Math.ceil(sample.price_hkd * HKD_TO_TWD);
  console.log(
    `方案 ${rows.length} 款 · 範例 ${sample.day}天 ${sample.sku} HKD ${sample.price_hkd} → NT$${retail(cost5)}`,
  );

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.sku,*options,*metadata`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);

  const existingSkus = new Set(
    (product.variants || []).map((v) => String(v.sku || "")),
  );
  const toCreate = rows
    .map((r) => toVariant(r))
    .filter((v) => !existingSkus.has(v.sku));

  console.log(`新建 ${toCreate.length} · 既有 ${rows.length - toCreate.length}`);

  if (dryRun) {
    for (const v of toCreate.slice(0, 5)) {
      console.log(`  + ${v.sku} → NT$${v.prices[0].amount}`);
    }
    return;
  }

  const daySet = new Set(rows.map((r) => `${r.day}天`));
  for (const v of product.variants || []) {
    for (const o of v.options || []) {
      const title = o.option?.title || o.title || "";
      if (title === "使用天數" && o.value) daySet.add(String(o.value));
    }
    const d = v.metadata?.days;
    if (d) daySet.add(`${d}天`.replace(/天天/, "天"));
  }
  const telecomSet = new Set([
    TELECOM,
    "AU(KDDI) 10Mbps",
    "SoftBank / KDDI",
    "SoftBank / KDDI 10Mbps",
  ]);
  for (const v of product.variants || []) {
    const t = v.metadata?.carrier || "";
    if (t) telecomSet.add(t);
  }

  const dayValues = [...daySet].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [...telecomSet];
  const keyFeatures = japanUnlimitedKeyFeaturesByCarrier();
  const meta = { ...(product.metadata || {}) };
  meta.carrier_profit_by_carrier = {
    ...(meta.carrier_profit_by_carrier || {}),
    [TELECOM]: PROFIT,
  };
  meta.subtitle_by_carrier = {
    ...(meta.subtitle_by_carrier || {}),
    [TELECOM]:
      "原生eSIM｜IIJ Docomo（DOCOMO）｜高速吃到飽｜日本 IP｜需手動 APN vmobile.jp",
  };
  meta.key_features_by_carrier = {
    ...(meta.key_features_by_carrier || {}),
    [TELECOM]: keyFeatures[TELECOM],
  };

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      metadata: meta,
      options: [
        { title: "使用天數", values: dayValues },
        { title: "電信商", values: telecomValues },
        { title: "數據量", values: [DATA] },
      ],
    }),
  });
  console.log("✓ 已更新 options / metadata");

  try {
    await internalContent({
      productId: product.id,
      carrier: TELECOM,
      contentType: "features",
      features: keyFeatures[TELECOM]?.bullets || [],
      actual_experience: keyFeatures[TELECOM]?.actual_experience || "",
      updatedBy: "patch-japan-unlimited-iij-docomo",
    });
    console.log("✓ features IIJ Docomo");
  } catch (e) {
    console.warn(`⚠️ features: ${e.message}`);
  }

  if (toCreate.length) {
    for (const [i, batch] of chunk(toCreate, BATCH).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + batch ${i + 1}: ${batch.length}`);
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants`,
  );
  const iijCount = (check.product?.variants || []).filter((v) =>
    /IIJ/i.test(String(v.sku || v.metadata?.carrier || v.title || "")),
  ).length;
  console.log("\n======= 完成 =======");
  console.log(`IIJ Docomo 變體: ${iijCount}`);
  console.log(`前台: /product/japan/${HANDLE}?telecom=iij-docomo`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
