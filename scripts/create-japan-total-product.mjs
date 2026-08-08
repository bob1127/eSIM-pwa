/**
 * 建立／更新「日本 eSIM 總量型」
 * 三種電信（對齊選品神器）：
 *   1) IIJ(DOCOMO) ← Japan-IIJ-Total*（原生 JP IP，用完降速 200kbps）— 利潤 60%
 *   2) AU(KDDI) ← Japan-Local-Total* au-net（原生 JP IP，用完降速 128kbps）— 利潤 95%
 *   3) KDDI / SoftBank ← Japan(KDDI+SB)(T+C)-Total*（漫遊 SG IP，128kbps）— 利潤 60%（HOT SALE）
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-japan-total-product.mjs --rebuild
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

const HANDLE = "japan-total-esim";
const TELECOM_IIJ = "IIJ(DOCOMO)";
const TELECOM_KDDI = "AU(KDDI)";
const TELECOM_DUAL = "KDDI / SoftBank";
const LINE = "漫遊線路";
const DATA_ORDER = [
  "1GB",
  "3GB",
  "5GB",
  "10GB",
  "12GB",
  "20GB",
  "21GB",
  "30GB",
  "50GB",
];
/** 原生 60%／漫遊雙網 50% */
const PROFIT_BY_KIND = { iij: 60, kddi: 95, dual: 60 };
const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KPJKQCG9X3ZGDM5156KFW8HD";
const CATEGORY_IDS = ["pcat_01KPJN0F8RYEENWHMS7D5WT7QR"]; // japan
const THUMB =
  process.env.JAPAN_PRODUCT_THUMB ||
  "https://www.jeko-esim.com.tw/images/japan-esim-banner.jpg";

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

function telecomRank(telecom) {
  if (telecom === TELECOM_IIJ) return 0;
  if (telecom === TELECOM_KDDI) return 1;
  if (telecom === TELECOM_DUAL) return 2;
  return 9;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "japan-total-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, telecom, kind) => {
    const profit = PROFIT_BY_KIND[kind];
    for (const p of list || []) {
      const hkd = Number(p.price_hkd) || Number(p.cost_twd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      const dataAmount = p.data_amount || "5GB";
      rows.push({
        ...p,
        data_amount: dataAmount,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost, profit),
        profit_percent: profit,
        telecom,
        daysLabel: `${p.day}天`,
        kind,
      });
    }
  };
  push(raw.iij, TELECOM_IIJ, "iij");
  push(raw.kddi, TELECOM_KDDI, "kddi");
  push(raw.dual, TELECOM_DUAL, "dual");
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
  const isIij = row.kind === "iij";
  const isKddi = row.kind === "kddi";
  const isNative = isIij || isKddi;
  const dataAmount = row.data_amount;
  const profit = row.profit_percent;
  const speedRule =
    row.speed_rule ||
    (isIij
      ? "高速用完後降速至 200 kbps"
      : isKddi
        ? "高速用完後降速至 128 kbps"
        : "高速用完後降速至 128 kbps");
  const network = isIij
    ? "IIJ(DOCOMO) 4G/LTE"
    : isKddi
      ? "AU(KDDI) 4G/5G"
      : "KDDI / SoftBank 4G/5G 雙電信";
  const apn = row.apn || (isIij ? "vmobile.jp" : isKddi ? "uad5gn.au-net.ne.jp" : "e-ideas");
  const ip = isNative ? "JP" : "SG";
  const ipType = isNative ? "日本IP" : "新加坡IP";
  const routeType = isNative ? "原生eSIM" : "漫遊";

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
      profit_rate: `${profit}%`,
      margin: 1 + profit / 100,
      apn,
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: row.throttle_kind || (isIij ? "200kbps" : "128kbps"),
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
  if (!rows.length) throw new Error("japan-total-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [TELECOM_IIJ, TELECOM_KDDI, TELECOM_DUAL];

  for (const telecom of telecomValues) {
    const sample = rows.find(
      (r) =>
        r.telecom === telecom && r.day === 5 && r.data_amount === "5GB",
    );
    if (sample) {
      console.log(
        `核對 ${telecom} 5天 5GB: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（${sample.profit_percent}%） (${sample.sku})`,
      );
    } else {
      const any = rows.find((r) => r.telecom === telecom);
      if (any) {
        console.log(
          `核對 ${telecom}（範例 ${any.daysLabel} ${any.data_amount}）: HKD ${any.price_hkd} → cost NT$${any.cost_twd} → 售價 NT$${any.retail_twd}（${any.profit_percent}%） (${any.sku})`,
        );
      }
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
    country: "JP",
    plan_kind: "total",
    hot_sale_telecoms: [TELECOM_KDDI, TELECOM_DUAL],
    carrier_profit_by_carrier: {
      [TELECOM_IIJ]: PROFIT_BY_KIND.iij,
      [TELECOM_KDDI]: PROFIT_BY_KIND.kddi,
      [TELECOM_DUAL]: PROFIT_BY_KIND.dual,
    },
    seo_title:
      "日本 eSIM 總量型｜IIJ(DOCOMO)・AU(KDDI)・KDDI/SoftBank｜Jeko eSIM",
    seo_description:
      "日本總量型 eSIM：IIJ(DOCOMO)、AU(KDDI) 原生（日本 IP），或 KDDI / SoftBank 雙網漫遊（HOT SALE）。依天數與總量選購，支援熱點分享。",
    seo_keywords:
      "日本eSIM,總量型eSIM,IIJ,DOCOMO,AU,KDDI,SoftBank,原生eSIM,總量流量,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_IIJ]:
        "總量型・IIJ(DOCOMO) 原生・高速用完後降速 200kbps",
      [TELECOM_KDDI]:
        "總量型・AU(KDDI) 原生・高速用完後降速 128kbps",
      [TELECOM_DUAL]:
        "總量型・KDDI / SoftBank 雙網・高速用完後降速 128kbps",
    },
    carrier_specs_by_carrier: {
      [TELECOM_IIJ]: {
        ip_type: "日本IP",
        route_type: "原生eSIM",
        network: "IIJ(DOCOMO) 4G/LTE",
        speed_rule: "方案總量高速用完後降速至約 200 kbps（可持續使用）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "vmobile.jp",
      },
      [TELECOM_KDDI]: {
        ip_type: "日本IP",
        route_type: "原生eSIM",
        network: "AU(KDDI) 4G/5G",
        speed_rule: "方案總量高速用完後降速至約 128 kbps（可持續使用）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "uad5gn.au-net.ne.jp",
      },
      [TELECOM_DUAL]: {
        ip_type: "新加坡IP",
        route_type: "漫遊",
        network: "KDDI / SoftBank 4G/5G 雙電信",
        speed_rule: "方案總量高速用完後降速至約 128 kbps（可持續使用）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
      },
    },
    key_features_by_carrier: {
      [TELECOM_IIJ]: [
        "總量型",
        "3～50GB",
        "IIJ(DOCOMO)",
        "原生日本IP",
        "用完降速 200kbps",
      ],
      [TELECOM_KDDI]: [
        "總量型",
        "12／21／30GB",
        "AU(KDDI)",
        "原生日本IP",
        "用完降速 128kbps",
      ],
      [TELECOM_DUAL]: [
        "總量型",
        "3～50GB",
        "KDDI / SoftBank",
        "用完降速 128kbps",
        "支援 TikTok／ChatGPT",
      ],
    },
    overview_notices_by_carrier: {
      [TELECOM_IIJ]: {
        fup_notice:
          "依所選方案提供總量高速流量（3GB～50GB）。高速用完後降速至約 200 kbps 可持續使用。IIJ(DOCOMO) 原生網路，日本 IP。",
        activation_notice: "建議抵達日本後再安裝／啟用 eSIM",
      },
      [TELECOM_KDDI]: {
        fup_notice:
          "依所選方案提供總量高速流量（12GB／21GB／30GB）。高速用完後降速至約 128 kbps 可持續使用。AU(KDDI) 原生網路，日本 IP。",
        activation_notice: "建議抵達日本後再安裝／啟用 eSIM",
      },
      [TELECOM_DUAL]: {
        fup_notice:
          "依所選方案提供總量高速流量（3GB～50GB）。高速用完後降速至約 128 kbps 可持續使用。KDDI 與 SoftBank 雙電信自動切換。",
        activation_notice: "建議抵達日本後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "日本 eSIM 總量型",
    subtitle:
      "三種電信可選：IIJ(DOCOMO)・AU(KDDI)・KDDI / SoftBank・3～50GB",
    handle: HANDLE,
    description:
      "日本 eSIM 總量型，三種電信：IIJ(DOCOMO) 原生、AU(KDDI) 原生（日本 IP），以及 KDDI / SoftBank 雙網漫遊（新加坡 IP）。提供多種總量與天數方案，支援熱點分享。",
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
  const nIij = rows.filter((r) => r.telecom === TELECOM_IIJ).length;
  const nKddi = rows.filter((r) => r.telecom === TELECOM_KDDI).length;
  const nDual = rows.filter((r) => r.telecom === TELECOM_DUAL).length;
  console.log(
    `📦 方案 ${rows.length} 筆（IIJ ${nIij} + AU(KDDI) ${nKddi} + 雙網 ${nDual}）・IIJ 60%／AU(KDDI) 95%／雙網 60%・HOT SALE=${TELECOM_KDDI} + ${TELECOM_DUAL}`,
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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-japan-total-product.mjs --rebuild",
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
  const dataOpt = (check.product?.options || []).find(
    (o) => o.title === "數據量",
  );
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`前台: /product/japan/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "電信商選項:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
  console.log(
    "數據量選項:",
    (dataOpt?.values || []).map((v) => v.value).join(" | "),
  );
  const sIij = rows.find(
    (r) =>
      r.telecom === TELECOM_IIJ && r.day === 5 && r.data_amount === "5GB",
  );
  const sDual = rows.find(
    (r) =>
      r.telecom === TELECOM_DUAL && r.day === 5 && r.data_amount === "5GB",
  );
  const sKddi = rows.find((r) => r.telecom === TELECOM_KDDI);
  if (sIij) {
    console.log(
      `範例 IIJ 5天 5GB: HKD ${sIij.price_hkd} → cost NT$${sIij.cost_twd} → 售價 NT$${sIij.retail_twd}（${sIij.profit_percent}%） (${sIij.sku})`,
    );
  }
  if (sKddi) {
    console.log(
      `範例 AU(KDDI) ${sKddi.daysLabel} ${sKddi.data_amount}: HKD ${sKddi.price_hkd} → cost NT$${sKddi.cost_twd} → 售價 NT$${sKddi.retail_twd}（${sKddi.profit_percent}%） (${sKddi.sku})`,
    );
  }
  if (sDual) {
    console.log(
      `範例 雙網 5天 5GB: HKD ${sDual.price_hkd} → cost NT$${sDual.cost_twd} → 售價 NT$${sDual.retail_twd}（${sDual.profit_percent}%） (${sDual.sku})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
