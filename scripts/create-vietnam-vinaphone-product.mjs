/**
 * 建立／更新「越南 eSIM」— Vinaphone 原生當地 IP 吃到飽
 *   Vietnam-local-unlimited-*（VN IP，APN m3-world，10Mbps）— 利潤 75%・HOT SALE
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-vietnam-vinaphone-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VINAPHONE_KEY_FEATURES } from "../content/product-detailed/vinaphone-local-key-features.js";
import { VINAPHONE_LOCAL_DETAILED_CONTENT_HTML } from "../content/product-detailed/vinaphone-local.js";

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

const HANDLE = "vietnam-vinaphone-esim";
const TELECOM = "Vinaphone";
const LINE = "原生線路";
const DATA_AMOUNT = "無限流量 10Mbps";
const PROFIT = 75;

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

function loadPlans(hkdToTwd) {
  const file = path.join(
    __dirname,
    "data",
    "vietnam-vinaphone-local-plans.json",
  );
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return (raw.unlimited || [])
    .map((p) => {
      const hkd = Number(p.price_hkd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      return {
        ...p,
        telecom: TELECOM,
        plan_kind: "unlimited",
        profit_percent: PROFIT,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retailFromCost(cost, PROFIT),
        daysLabel: `${p.day}天`,
        data_amount: p.data_amount || DATA_AMOUNT,
      };
    })
    .sort((a, b) => Number(a.day) - Number(b.day));
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
  const speedRule =
    row.speed_rule ||
    "每日約 1GB 高速後限速約 10 Mbps 吃到飽（Vinaphone 原生）";

  return {
    title: `${TELECOM} · ${row.daysLabel} · ${row.data_amount}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: TELECOM,
      數據量: row.data_amount,
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: TELECOM,
      plan_kind: "unlimited",
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd || ""),
      cost_price: row.cost_twd,
      profit_rate: `${profit}%`,
      profit_percent: profit,
      margin,
      apn: row.apn || "m3-world",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: row.throttle_kind || "10mbps",
      ip: "VN",
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: TELECOM,
        line: LINE,
        network: "Vinaphone 4G/LTE/5G",
        ip_type: "越南IP",
        route_type: "原生eSIM",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
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
  if (!rows.length) {
    throw new Error("vietnam-vinaphone-local-plans.json 無資料");
  }

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );

  const sample = rows[0];
  console.log(
    `核對 ${TELECOM} ${sample.daysLabel}: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（${sample.profit_percent}%） (${sample.sku})`,
  );

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
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title: "越南 吃到飽eSIM 原生卡 Vinaphone 當地 IP｜Jeko eSIM",
    seo_description:
      "越南 Vinaphone 原生吃到飽 eSIM（當地 VN IP）：約 10Mbps，支援 5G/4G、熱點與 TikTok／ChatGPT。",
    seo_keywords:
      "越南eSIM,吃到飽eSIM,Vinaphone,原生卡,當地IP,5G,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]: "吃到飽・Vinaphone 原生・越南 IP・高速後約 10Mbps",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "越南IP",
        route_type: "原生eSIM",
        network: "Vinaphone 4G/LTE/5G",
        speed_rule: "每日約 1GB 高速後限速約 10 Mbps 可持續使用（吃到飽）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "m3-world",
        coverage: "越南",
      },
    },
    key_features_by_carrier: {
      [TELECOM]: VINAPHONE_KEY_FEATURES,
    },
    detailed_content_by_carrier: {
      [TELECOM]: VINAPHONE_LOCAL_DETAILED_CONTENT_HTML,
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "吃到飽方案：每日約 1GB 高速後限速約 10 Mbps 可持續使用。Vinaphone 原生網路，越南當地 IP。",
        activation_notice: "建議抵達越南後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "越南 吃到飽eSIM 原生卡 Vinaphone 當地 IP",
    subtitle: "Vinaphone 當地 IP・吃到飽約 10Mbps・支援熱點",
    handle: HANDLE,
    description:
      "越南 Vinaphone 原生吃到飽 eSIM（Vietnam-local）：當地 VN IP、APN m3-world。高速後約限速 10 Mbps，支援 5G/4G、熱點分享與 TikTok／ChatGPT。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: PRODUCT_IMAGES,
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: [DATA_AMOUNT] },
      { title: "線路", values: [LINE] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: CATEGORY_IDS.map((id) => ({ id })),
  };

  const variants = rows.map(toVariant);
  console.log(
    `📦 方案 ${rows.length} 筆（Vinaphone 原生吃到飽 @${PROFIT}%）・HOT SALE=${TELECOM}`,
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
        "重建變體：HKD_TO_TWD=4.5 node scripts/create-vietnam-vinaphone-product.mjs --rebuild",
      );
      return;
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants,*options`,
  );
  const vs = check.product?.variants || [];
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`前台: /product/vietnam/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "電信商:",
    TELECOM,
    "・天數:",
    dayValues.join(" | "),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
