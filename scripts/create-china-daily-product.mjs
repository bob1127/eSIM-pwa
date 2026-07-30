/**
 * 建立／更新「中國大陸 eSIM 每日型」
 * 三種電信 × 各流量／天數（50% 利潤）：
 *   1) 中國移動（CMCC）← China-Daily*（128kbps）
 *   2) 中國聯通 GPT + TikTok (CUCC) ← China-Daily*5mbps* / China(T+C)-Daily*5mbps*（用完限速 5Mbps）
 *   3) 中國聯通（CUCC）← China-Daily* A2（128kbps）
 *
 * 用法：
 *   node scripts/create-china-daily-product.mjs
 *   node scripts/create-china-daily-product.mjs --rebuild
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

const HANDLE = "china-daily-esim";
const LINE = "漫遊線路";
const TELECOM_CMCC = "中國移動";
const TELECOM_TC = "中國聯通 GPT + TikTok (CUCC)";
const TELECOM_CUCC = "中國聯通";
const DATA_ORDER = ["每日 500MB", "每日 1GB", "每日 2GB", "每日 3GB"];
const MARGIN = 1.5;
/** china-daily-plans.json 的 cost_twd 實際是 HKD 進價（誤標）；對齊選品神器用 4.1 */
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.1);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KPJKQCG9X3ZGDM5156KFW8HD";
const CATEGORY_IDS = ["pcat_01KY70EGV51W6NNHWBFGX3VZ1F"]; // china
const THUMB =
  process.env.CHINA_PRODUCT_THUMB ||
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KYBQ3HHZADQNWFGG6F02YKSP.png";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

function dataRank(label) {
  const i = DATA_ORDER.indexOf(String(label || ""));
  return i >= 0 ? i : 99;
}

function loadPlans() {
  const file = path.join(__dirname, "data", "china-daily-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, telecom, kind) => {
    for (const p of list || []) {
      // JSON 內 cost_twd 實為 HKD；有 price_hkd 則優先
      const hkd = Number(p.price_hkd) || Number(p.cost_twd) || 0;
      const cost = Math.ceil(hkd * HKD_TO_TWD);
      const dataAmount = p.data_amount || "每日 3GB";
      rows.push({
        ...p,
        data_amount: dataAmount,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost),
        telecom,
        daysLabel: `${p.day}天`,
        kind,
      });
    }
  };
  push(raw.cmcc, TELECOM_CMCC, "cmcc");
  push(raw.tc, TELECOM_TC, "tc");
  push(raw.cucc, TELECOM_CUCC, "cucc");
  return rows.sort(
    (a, b) =>
      a.telecom.localeCompare(b.telecom, "zh") ||
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
  const isTc = row.kind === "tc";
  const isCucc = row.kind === "cucc";
  const dataAmount = row.data_amount;
  const speedRule =
    row.speed_rule ||
    (isTc
      ? "每日高速用完後限速約 5 Mbps（可持續使用）"
      : `${dataAmount.replace(/^每日\s*/, "每日 ")} 高速，用完後降速至 128 kbps`);
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
      profit_rate: "50%",
      margin: MARGIN,
      apn: row.apn || "",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      ip: isTc || isCucc ? "SG" : "HK",
      attributes: {
        days: row.day,
        data: dataAmount,
        data_amount: dataAmount,
        telecom: row.telecom,
        line: LINE,
        network: "4G / 5G",
        ip_type: isTc || isCucc ? "新加坡IP" : "香港IP",
        route_type: LINE,
        hotspot: true,
        gpt: isTc || isCucc,
        tiktok: isTc || isCucc,
        gemini: true,
        speed_rule: speedRule,
      },
    },
  };
}

async function main() {
  const rows = loadPlans();
  if (!rows.length) throw new Error("china-daily-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [TELECOM_CMCC, TELECOM_TC, TELECOM_CUCC];

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];

  const productMeta = {
    type: "esim",
    country: "CN",
    plan_kind: "daily",
    hot_sale_telecoms: [TELECOM_TC, TELECOM_CMCC],
    carrier_profit_by_carrier: {
      [TELECOM_CMCC]: 50,
      [TELECOM_TC]: 50,
      [TELECOM_CUCC]: 50,
    },
    seo_title:
      "中國大陸 eSIM 每日型｜500MB／1GB／2GB／3GB・移動／聯通／TikTok+ChatGPT｜Jeko eSIM",
    seo_description:
      "中國大陸每日型 eSIM：中國移動、中國聯通 GPT + TikTok (CUCC)、中國聯通。可選每日流量方案；GPT+TikTok 線高速用完後限速約 5Mbps 可持續使用。",
    seo_keywords:
      "中國大陸eSIM,每日型eSIM,每日1GB,每日2GB,中國移動,中國聯通,TikTok,ChatGPT,5Mbps,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_CMCC]: "漫遊每日型・500MB～3GB・高速用完後降速至 128 kbps",
      [TELECOM_TC]: "漫遊每日型・1GB／2GB・用完後限速 5Mbps・支援 TikTok 與 ChatGPT",
      [TELECOM_CUCC]: "漫遊每日型・500MB～3GB・高速用完後降速至 128 kbps",
    },
    carrier_specs_by_carrier: {
      [TELECOM_CMCC]: {
        ip_type: "香港IP",
        route_type: "漫遊",
        network: "CMCC 4G/5G",
        speed_rule: "依方案每日高速額度，用完後降速至 128 kbps（每日重置）",
        apps: "熱點分享,Gemini",
      },
      [TELECOM_TC]: {
        ip_type: "新加坡IP",
        route_type: "漫遊",
        network: "CUCC 4G/5G",
        speed_rule: "每日高速用完後限速約 5 Mbps（可持續使用）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
      },
      [TELECOM_CUCC]: {
        ip_type: "新加坡IP",
        route_type: "漫遊",
        network: "CUCC 4G/5G",
        speed_rule: "依方案每日高速額度，用完後降速至 128 kbps（每日重置）",
        apps: "熱點分享,ChatGPT,TikTok",
      },
    },
    key_features_by_carrier: {
      [TELECOM_CMCC]: [
        "每日型",
        "500MB／1／2／3GB",
        "4G / 5G",
        "高速用完後降速至 128 kbps",
      ],
      [TELECOM_TC]: [
        "每日型",
        "每日 1GB／2GB",
        "用完後限速 5Mbps",
        "支援 TikTok",
        "支援 ChatGPT",
        "4G / 5G",
      ],
      [TELECOM_CUCC]: [
        "每日型",
        "500MB／1／2／3GB",
        "支援 TikTok",
        "支援 ChatGPT",
        "4G / 5G",
      ],
    },
    overview_notices_by_carrier: {
      [TELECOM_CMCC]: {
        fup_notice:
          "依所選方案提供每日高速流量（500MB／1GB／2GB／3GB），用完後降速至約 128 kbps（每日重置）。TikTok／ChatGPT 不保證可用。",
        activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
      },
      [TELECOM_TC]: {
        fup_notice:
          "依所選方案提供每日高速流量（1GB／2GB），用完後限速約 5 Mbps 可持續使用（每日重置）。支援 TikTok 與 ChatGPT。",
        activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
      },
      [TELECOM_CUCC]: {
        fup_notice:
          "依所選方案提供每日高速流量（500MB／1GB／2GB／3GB），用完後降速至約 128 kbps（每日重置）。",
        activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "中國大陸 eSIM 每日型",
    subtitle: "每日型用量方案・三種電信可選（含 GPT+TikTok 5Mbps 線）",
    handle: HANDLE,
    description:
      "中國大陸 eSIM 每日型，三種電信：中國移動、中國聯通 GPT + TikTok (CUCC)、中國聯通。GPT+TikTok 線為每日 1GB／2GB，高速用完後限速約 5 Mbps 可持續使用。",
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
  const nCmcc = rows.filter((r) => r.telecom === TELECOM_CMCC).length;
  const nTc = rows.filter((r) => r.telecom === TELECOM_TC).length;
  const nCucc = rows.filter((r) => r.telecom === TELECOM_CUCC).length;
  console.log(
    `📦 方案 ${rows.length} 筆（移動 ${nCmcc} + GPT+TikTok ${nTc} + 聯通 ${nCucc}）`,
  );
  console.log(`數據量選項: ${dataValues.join(" | ")}`);

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
        "重建變體請執行：node scripts/create-china-daily-product.mjs --rebuild",
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
  console.log(`前台: /product/china/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "電信商選項:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
  const dataOpt = (check.product?.options || []).find((o) => o.title === "數據量");
  console.log(
    "數據量選項:",
    (dataOpt?.values || []).map((v) => v.value).join(" | "),
  );
  const sample = rows.find(
    (r) =>
      r.telecom === TELECOM_TC &&
      r.day === 5 &&
      (r.data_amount === "每日 1GB" || r.sku.includes("Daily1GB-5-5mbps")),
  );
  if (sample) {
    console.log(
      `範例 GPT+TikTok 5天 每日1GB 5Mbps: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd} (${sample.sku})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
