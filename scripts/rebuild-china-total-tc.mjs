/**
 * 中國大陸 eSIM 總量型：把「GPT + TikTok」線改掛 China(T+C)-Total*
 * 利潤 50%（ceil(HKD×匯率) → ×1.5 → 十位進位 −1）
 * 前端電信名稱：GPT + TikTok
 *
 * 用法：
 *   node scripts/rebuild-china-total-tc.mjs
 *   （會刪除舊「中國移動 GPT + TikTok」/ B0 變體，再建 T+C 變體）
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

const HANDLE = "china-total-esim";
const LINE = "漫遊線路";
const TELECOM_TC = "GPT + TikTok";
const TELECOM_CMCC = "中國移動";
const TELECOM_CUCC = "中國聯通";
/** 舊名稱（需刪除的變體） */
const OLD_TC_NAMES = [
  "中國移動 GPT + TikTok",
  "中國聯通 GPT + TikTok (CUCC)",
  "中國聯通 GPT + TikTok (CMCC)",
  "GPT + TikTok",
];
const MARGIN = 1.5;
const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.12;
const BATCH_SIZE = 40;

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
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
  } catch (e) {
    return { rate: HKD_TO_TWD_FALLBACK, source: `fallback (${e.message})` };
  }
}

function loadTcPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "china-total-tc-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return (raw.plans || []).map((p) => {
    const hkd = Number(p.price_hkd) || 0;
    const cost = Math.ceil(hkd * hkdToTwd);
    return {
      ...p,
      price_hkd: hkd,
      cost_twd: cost,
      retail_twd: retailFromCost(cost),
      telecom: TELECOM_TC,
      daysLabel: `${p.day}天`,
      data_amount: p.data_amount,
    };
  });
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

function variantTelecom(v) {
  return (
    v.metadata?.attributes?.telecom ||
    v.metadata?.carrier ||
    ""
  );
}

function isOldTcVariant(v) {
  const telecom = variantTelecom(v);
  if (OLD_TC_NAMES.includes(telecom)) return true;
  if (/China\(T\+C\)-Total/i.test(v.sku || "")) return true;
  if (/China-Total\d+GB-\d+-B0/i.test(v.sku || "")) return true;
  return false;
}

function toVariant(row) {
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
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd),
      cost_price: row.cost_twd,
      profit_rate: "50%",
      margin: MARGIN,
      apn: row.apn || "e-ideas",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "terminate",
      speed_desc: row.speed_desc || "",
      ip: row.ip || "SG",
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: row.telecom,
        line: LINE,
        network: "4G / 5G",
        ip_type: "新加坡IP",
        route_type: LINE,
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: "流量用完即斷網（實際速度依當地網路）",
      },
    },
  };
}

function mergeMeta(productMeta, keepCmcc, keepCucc) {
  const meta = { ...(productMeta || {}) };

  const profit = { ...(meta.carrier_profit_by_carrier || {}) };
  for (const k of OLD_TC_NAMES) delete profit[k];
  profit[TELECOM_TC] = 50;
  if (keepCmcc) profit[TELECOM_CMCC] = profit[TELECOM_CMCC] ?? 45;
  if (keepCucc) profit[TELECOM_CUCC] = profit[TELECOM_CUCC] ?? 50;
  meta.carrier_profit_by_carrier = profit;

  meta.hot_sale_telecoms = [TELECOM_TC, TELECOM_CUCC];

  const specs = { ...(meta.carrier_specs_by_carrier || {}) };
  for (const k of OLD_TC_NAMES) {
    if (k !== TELECOM_TC) delete specs[k];
  }
  specs[TELECOM_TC] = {
    ip_type: "新加坡IP",
    route_type: "漫遊",
    network: "CUCC 4G/5G",
    speed_rule: "流量用完即斷網（實際速度依當地網路）",
    apps: "熱點分享,ChatGPT,TikTok",
  };
  meta.carrier_specs_by_carrier = specs;

  const features = { ...(meta.key_features_by_carrier || {}) };
  for (const k of OLD_TC_NAMES) {
    if (k !== TELECOM_TC) delete features[k];
  }
  features[TELECOM_TC] = [
    "總量型",
    "支援 TikTok",
    "支援 ChatGPT",
    "用完斷網",
    "4G / 5G",
  ];
  meta.key_features_by_carrier = features;

  const subtitle = { ...(meta.subtitle_by_carrier || {}) };
  for (const k of OLD_TC_NAMES) {
    if (k !== TELECOM_TC) delete subtitle[k];
  }
  subtitle[TELECOM_TC] = "漫遊總量型・流量用完即斷網・支援 TikTok 與 ChatGPT";
  meta.subtitle_by_carrier = subtitle;

  const notices = { ...(meta.overview_notices_by_carrier || {}) };
  for (const k of OLD_TC_NAMES) {
    if (k !== TELECOM_TC) delete notices[k];
  }
  notices[TELECOM_TC] = {
    fup_notice: "流量統計型：流量用完即斷網；支援 GPT / TikTok",
    activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
  };
  meta.overview_notices_by_carrier = notices;

  return meta;
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const tcRows = loadTcPlans(hkdToTwd);
  if (!tcRows.length) throw new Error("china-total-tc-plans.json 無資料");

  const sample = tcRows.find(
    (r) => r.sku === "China(T+C)-Total50GB-7-D0",
  );
  if (sample) {
    console.log(
      `核對 50GB/7天: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（50%）`,
    );
  }

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels,*metadata`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到商品 handle=${HANDLE}`);
  console.log("♻️ 商品", product.id, product.title);

  const keepVariants = (product.variants || []).filter((v) => !isOldTcVariant(v));
  const deleteVariants = (product.variants || []).filter((v) => isOldTcVariant(v));
  console.log(
    `變體：保留 ${keepVariants.length}（移動/聯通）・刪除舊 GPT 線 ${deleteVariants.length}・新建 T+C ${tcRows.length}`,
  );

  if (deleteVariants.length) {
    for (const batch of chunk(
      deleteVariants.map((v) => v.id).filter(Boolean),
      BATCH_SIZE,
    )) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ delete: batch }),
      });
    }
    console.log(`🗑 已刪 ${deleteVariants.length} 舊 GPT / B0 / 舊 T+C 變體`);
  }

  const dayValues = [
    ...new Set([
      ...keepVariants.map((v) => {
        const d =
          v.metadata?.attributes?.days ||
          v.metadata?.days ||
          parseInt(String(v.title || ""), 10);
        return d ? `${d}天` : null;
      }),
      ...tcRows.map((r) => r.daysLabel),
      ...((product.options || []).find((o) => o.title === "使用天數")?.values || []).map(
        (v) => v.value,
      ),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const dataValues = [
    ...new Set([
      ...keepVariants.map(
        (v) =>
          v.metadata?.attributes?.data_amount ||
          v.metadata?.data_amount ||
          v.metadata?.data,
      ),
      ...tcRows.map((r) => r.data_amount),
      ...((product.options || []).find((o) => o.title === "數據量")?.values || []).map(
        (v) => v.value,
      ),
    ]),
  ].filter(Boolean);

  const DATA_ORDER = [
    "1GB",
    "2GB",
    "3GB",
    "5GB",
    "10GB",
    "20GB",
    "30GB",
    "50GB",
    "60GB",
  ];
  const dataSorted = [
    ...DATA_ORDER.filter((d) => dataValues.includes(d)),
    ...dataValues.filter((d) => !DATA_ORDER.includes(d)),
  ];

  const telecomValues = [TELECOM_TC, TELECOM_CMCC, TELECOM_CUCC];
  const metadata = mergeMeta(
    product.metadata,
    keepVariants.some((v) => variantTelecom(v) === TELECOM_CMCC),
    keepVariants.some((v) => variantTelecom(v) === TELECOM_CUCC),
  );

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      title: "中國大陸 eSIM 總量型",
      subtitle: "總量型用量方案・GPT+TikTok／移動／聯通",
      description:
        "中國大陸 eSIM 總量型：GPT + TikTok（China T+C）、中國移動、中國聯通。流量用完即斷網（terminate），依天數與總量選購。",
      status: "published",
      metadata,
      options: [
        { title: "使用天數", values: dayValues },
        { title: "電信商", values: telecomValues },
        { title: "數據量", values: dataSorted },
        { title: "線路", values: [LINE] },
      ],
    }),
  });
  console.log("✅ 已更新商品 metadata／電信選項 →", telecomValues.join(" | "));

  const createPayload = tcRows.map(toVariant);
  for (const [i, batch] of chunk(createPayload, BATCH_SIZE).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: batch }),
    });
    console.log(`  + batch ${i + 1}: ${batch.length} T+C variants`);
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants,*variants.prices,*options`,
  );
  const vs = check.product?.variants || [];
  const telecomOpt = (check.product?.options || []).find(
    (o) => o.title === "電信商",
  );
  const hit = vs.find((v) => v.sku === "China(T+C)-Total50GB-7-D0");
  console.log("\n======= 完成 =======");
  console.log(`前台: /product/china/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "電信商選項:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
  if (hit) {
    console.log(
      `驗證 50GB/7天: ${hit.title} → NT$${hit.prices?.[0]?.amount}（${hit.sku}）`,
    );
  } else {
    console.log("⚠️ 找不到 China(T+C)-Total50GB-7-D0");
  }
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
