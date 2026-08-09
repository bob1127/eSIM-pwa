/**
 * 建立／更新「韓國 eSIM 每日型」
 * 兩種電信 × 各流量／天數（漫遊利潤 60%）：
 *   1) LG U+ / SK電信 5G 雙切換 ← South Korea(T+C)-Daily*
 *      標準 128kbps + Daily1GB 5Mbps 續航；新加坡 IP
 *   2) SK電信 5G ← South Korea-Daily*-B0
 *      用完降速 384kbps；香港 IP（cmhk）
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-korea-daily-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { koreaDailyKeyFeaturesByCarrier } from "../content/product-detailed/korea-key-features.js";

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

const HANDLE = "korea-daily-esim";
const TELECOM_TC = "LG U+ / SK電信 5G 雙切換";
const TELECOM_SKT = "SK電信 5G";
const LINE = "漫遊線路";
const DATA_ORDER = [
  "每日 500MB",
  "每日 1GB",
  "每日 1GB（5Mbps續航）",
  "每日 2GB",
  "每日 3GB",
];
/** 選品神器漫遊 60%（兩電信皆同）：margin = 1 + 60/100 */
const PROFIT_PERCENT = 60;
const MARGIN = 1 + PROFIT_PERCENT / 100;
const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CATEGORY_IDS = ["pcat_01KZJNBVGMVYJ9W659MWQB1E3Q"]; // korea
// 與 korea-unlimited-esim（SK電信吃到飽）同一組商品圖
const KOREA_GALLERY = [
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDD41493R26CQSJP8CS.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDFBNK845TJDWA4697M.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDGVRBHVSY5D1FJ15SJ.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDHWCH8R57ZRQ7RP7YT.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDJYA8R20W94NW2909F.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDKK0YTH870CH7NADWV.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDMPPGMMZARAKC8DA1C.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDM5YYGWR08PQZAWQFK.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDNPW4F3C7BV41G6RR0.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDNRGMJZBZZ7MKT2VAW.png",
  "https://www.jeko-esim.com.tw/images/korea-esim-banner.jpg",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDPMD9WFX666FPG8P8J.jpg",
];
const THUMB = process.env.KOREA_PRODUCT_THUMB || KOREA_GALLERY[0];
const PRODUCT_IMAGES = KOREA_GALLERY.map((url) => ({ url }));

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
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
  if (telecom === TELECOM_TC) return 0;
  if (telecom === TELECOM_SKT) return 1;
  return 9;
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "korea-daily-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, telecom, kind) => {
    for (const p of list || []) {
      const hkd = Number(p.price_hkd) || Number(p.cost_twd) || 0;
      const cost = Math.ceil(hkd * hkdToTwd);
      const dataAmount = p.data_amount || "每日 1GB";
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
  push(raw.tc, TELECOM_TC, "tc");
  push(raw.skt, TELECOM_SKT, "skt");
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
  const isSkt = row.kind === "skt";
  const dataAmount = row.data_amount;
  const is5Mbps =
    row.throttle_kind === "5mbps" ||
    /5mbps/i.test(row.sku || "") ||
    /5Mbps續航/.test(dataAmount) ||
    /5\s*Mbps/i.test(row.speed_rule || "");
  const speedRule =
    row.speed_rule ||
    (is5Mbps
      ? "每日高速用完後限速約 5 Mbps（可持續使用）"
      : isSkt
        ? "高速用完後降速至 384 kbps"
        : "高速用完後降速至 128 kbps");
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
      profit_rate: `${PROFIT_PERCENT}%`,
      margin: MARGIN,
      apn: row.apn || (isSkt ? "cmhk" : "e-ideas"),
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: is5Mbps
        ? "5mbps"
        : isSkt
          ? "384kbps"
          : "128kbps",
      ip: isSkt ? "HK" : "SG",
      attributes: {
        days: row.day,
        data: dataAmount,
        data_amount: dataAmount,
        telecom: row.telecom,
        line: LINE,
        network: isSkt
          ? "SKT 5G/4G"
          : "LG U+ / SKT 5G/4G 雙電信切換",
        ip_type: isSkt ? "香港IP" : "新加坡IP",
        route_type: LINE,
        hotspot: !isSkt,
        gpt: !isSkt,
        tiktok: !isSkt,
        gemini: !isSkt,
        speed_rule: speedRule,
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("korea-daily-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );
  const telecomValues = [TELECOM_TC, TELECOM_SKT];

  for (const telecom of telecomValues) {
    const sample = rows.find(
      (r) =>
        r.telecom === telecom &&
        r.day === 1 &&
        r.data_amount === "每日 500MB",
    );
    if (sample) {
      console.log(
        `核對 ${telecom} 1天 500MB: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（${PROFIT_PERCENT}%） (${sample.sku})`,
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
    country: "KR",
    plan_kind: "daily",
    hot_sale_telecoms: [TELECOM_TC],
    carrier_profit_by_carrier: {
      [TELECOM_TC]: PROFIT_PERCENT,
      [TELECOM_SKT]: PROFIT_PERCENT,
    },
    seo_title:
      "韓國 eSIM 每日型｜LG U+/SK電信 雙切換・SK電信 5G・500MB／1GB／2GB／3GB｜Jeko eSIM",
    seo_description:
      "韓國每日型 eSIM：LG U+ / SK電信 5G 雙電信切換，或純 SK電信 5G。每日 500MB／1GB／2GB／3GB，雙切換含 5Mbps 續航選項。支援熱點分享。",
    seo_keywords:
      "韓國eSIM,每日型eSIM,LG U+,SK電信,雙電信切換,每日1GB,每日2GB,5G,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_TC]:
        "每日型・LG U+ / SK電信 5G 雙切換・標準 128kbps／可選 5Mbps 續航",
      [TELECOM_SKT]:
        "每日型・SK電信 5G・用完後降速 384kbps",
    },
    carrier_specs_by_carrier: {
      [TELECOM_TC]: {
        ip_type: "新加坡IP",
        route_type: "漫遊",
        network: "LG U+ / SK電信 5G/4G 雙電信切換",
        speed_rule:
          "標準方案用完後降速至 128 kbps；選「5Mbps續航」則用完後限速約 5 Mbps 可持續使用（每日重置）",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
      },
      [TELECOM_SKT]: {
        ip_type: "香港IP",
        route_type: "漫遊",
        network: "SK電信 5G/4G",
        speed_rule: "每日高速用完後降速至約 384 kbps（可持續使用）",
        apn: "cmhk",
      },
    },
    key_features_by_carrier: koreaDailyKeyFeaturesByCarrier(),
    overview_notices_by_carrier: {
      [TELECOM_TC]: {
        fup_notice:
          "依所選方案提供每日高速流量（500MB／1GB／2GB／3GB）。標準方案用完後降速至約 128 kbps；若選「5Mbps續航」則用完後限速約 5 Mbps 可持續使用（每日重置）。LG U+ 與 SK電信 5G 雙電信自動切換。",
        activation_notice: "建議抵達韓國後再安裝／啟用 eSIM",
      },
      [TELECOM_SKT]: {
        fup_notice:
          "依所選方案提供每日高速流量（500MB／1GB／2GB）。用完後降速至約 384 kbps 可持續使用（每日重置）。純 SK電信 5G 網路。",
        activation_notice: "建議抵達韓國後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "韓國 eSIM 每日型",
    subtitle:
      "兩種電信可選：LG U+/SK電信 5G 雙切換・SK電信 5G・每日 500MB～3GB",
    handle: HANDLE,
    description:
      "韓國 eSIM 每日型，兩種電信：LG U+ / SK電信 5G 雙電信切換（新加坡 IP，含 5Mbps 續航）、純 SK電信 5G（香港 IP，用完降速 384kbps）。提供每日 500MB／1GB／2GB／3GB，支援熱點分享。",
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
  const nTc = rows.filter((r) => r.telecom === TELECOM_TC).length;
  const nSkt = rows.filter((r) => r.telecom === TELECOM_SKT).length;
  console.log(
    `📦 方案 ${rows.length} 筆（雙切換 ${nTc} + SKT ${nSkt}）・${PROFIT_PERCENT}% 利潤`,
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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-korea-daily-product.mjs --rebuild",
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
  console.log(`前台: /product/korea/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "電信商選項:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
  console.log(
    "數據量選項:",
    (dataOpt?.values || []).map((v) => v.value).join(" | "),
  );
  const sTc = rows.find(
    (r) =>
      r.telecom === TELECOM_TC &&
      r.day === 1 &&
      r.data_amount === "每日 500MB",
  );
  const sSkt = rows.find(
    (r) =>
      r.telecom === TELECOM_SKT &&
      r.day === 1 &&
      r.data_amount === "每日 500MB",
  );
  const sSkt1 = rows.find(
    (r) =>
      r.telecom === TELECOM_SKT &&
      r.day === 1 &&
      r.data_amount === "每日 1GB",
  );
  if (sTc) {
    console.log(
      `範例 雙切換 1天 500MB: HKD ${sTc.price_hkd} → cost NT$${sTc.cost_twd} → 售價 NT$${sTc.retail_twd} (${sTc.sku})`,
    );
  }
  if (sSkt) {
    console.log(
      `範例 SKT 1天 500MB: HKD ${sSkt.price_hkd} → cost NT$${sSkt.cost_twd} → 售價 NT$${sSkt.retail_twd} (${sSkt.sku})`,
    );
  }
  if (sSkt1) {
    console.log(
      `範例 SKT 1天 1GB: HKD ${sSkt1.price_hkd} → cost NT$${sSkt1.cost_twd} → 售價 NT$${sSkt1.retail_twd} (${sSkt1.sku})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
