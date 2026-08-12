/**
 * 建立「美加 (美國、加拿大) 每日型 eSIM」
 * SKU：USA & Canada-Daily*、US&Canada-Daily*、US,CA-Daily*
 * 利潤：60%
 * 不含墨西哥
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-us-canada-daily-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-us-canada-daily-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { usCanadaDailyKeyFeaturesByCarrier } from "../content/product-detailed/usa-region-key-features.js";

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

const HANDLE = "us-canada-daily-esim";
const TITLE = "美加 (美國、加拿大) 每日型 eSIM";
const LINE = "漫遊線路";
const PROFIT = 60;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");
const DEFAULT_US_THUMB = `${SITE_ORIGIN}/images/${encodeURIComponent("美國esim.png")}`;

const THUMB =
  process.env.US_ESIM_PRODUCT_THUMB ||
  DEFAULT_US_THUMB;

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

function loadPlans() {
  const file = path.join(__dirname, "data", "us-canada-daily-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return (raw.plans || [])
    .map((p) => {
      const day = Number(p.day);
      const price_hkd = Number(p.price_hkd) || 0;
      const cost_twd =
        Number(p.cost_twd) || Math.ceil(price_hkd * HKD_TO_TWD);
      return {
        ...p,
        day,
        daysLabel: `${day}天`,
        telecom: p.telecom || "美加每日",
        data: p.data || "每日型",
        price_hkd,
        cost_twd,
        profit_percent: Number(p.profit_percent) || PROFIT,
        retail_twd: Number(p.retail_twd) || retailFromCost(cost_twd),
      };
    })
    .sort(
      (a, b) =>
        a.day - b.day ||
        String(a.telecom).localeCompare(String(b.telecom)) ||
        String(a.data).localeCompare(String(b.data)),
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

async function ensureCategory(token) {
  const { product_categories: cats } = await admin(
    token,
    "/admin/product-categories?limit=100",
  );
  const existing = (cats || []).find(
    (c) =>
      c.handle === "us-canada" ||
      c.handle === "usa-canada" ||
      /美加/i.test(String(c.name || "")),
  );
  if (existing) {
    console.log("📂 分類", existing.id, existing.handle, existing.name);
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: "美加",
      handle: "us-canada",
      is_active: true,
      is_internal: false,
    }),
  });
  return created.product_category?.id;
}

function toVariant(row) {
  const telecom = row.telecom;
  const data = row.data;
  return {
    title: `${telecom} · ${row.daysLabel} · ${data}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: telecom,
      數據量: data,
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: telecom,
      data,
      data_amount: data,
      days: String(row.day),
      cost_hkd: String(row.price_hkd),
      cost_price: row.cost_twd,
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: MARGIN,
      apn: row.apn || "",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      special_desc: row.special_desc || "",
      ip: row.ip || "PL",
      hotspot: true,
      attributes: {
        days: row.day,
        data,
        data_amount: data,
        telecom,
        line: LINE,
        network: row.networks || "US + CA",
        ip_type: "波蘭 IP",
        route_type: LINE,
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: `${data}；超量後降速（FUP）`,
        apps: "ChatGPT、TikTok、Gemini；支援熱點",
      },
    },
  };
}

async function main() {
  const rows = loadPlans();
  if (!rows.length) throw new Error("us-canada-daily-plans.json 無資料");

  console.log(`💱 HKD→TWD ${HKD_TO_TWD}｜利潤 ${PROFIT}%｜方案 ${rows.length}`);
  for (const s of rows.filter((r) => r.day === 1 && /USA & Canada-Daily/i.test(r.sku))) {
    console.log(
      `   ${s.sku} → cost NT$${s.cost_twd} → 售價 NT$${s.retail_twd}`,
    );
  }

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [...new Set(rows.map((r) => r.telecom))];
  const dataValues = [...new Set(rows.map((r) => r.data))];

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  const categoryId = await ensureCategory(token);

  const profitByTelecom = Object.fromEntries(
    telecomValues.map((t) => [t, PROFIT]),
  );

  const productMeta = {
    type: "esim",
    country: "US,CA",
    region: "US,CA",
    is_native: false,
    plan_kind: "daily",
    hot_sale_telecoms: telecomValues,
    carrier_profit_by_carrier: profitByTelecom,
    seo_title: "美加 每日型 eSIM｜美國加拿大｜Jeko eSIM",
    seo_description:
      "美加（美國、加拿大）每日型 eSIM，純數據，不含墨西哥。多網可選。",
    seo_keywords: "美加eSIM,美國加拿大eSIM,每日型,Jeko eSIM",
    subtitle_by_carrier: Object.fromEntries(
      telecomValues.map((t) => [t, `美加覆蓋｜${t}｜每日型`]),
    ),
    carrier_specs_by_carrier: Object.fromEntries(
      telecomValues.map((t) => [
        t,
        {
          ip_type: "波蘭 IP",
          route_type: LINE,
          network: t,
          speed_rule: "每日額度用完後降速（FUP）",
          apn: "依變體",
          apps: "ChatGPT、TikTok、Gemini；支援熱點",
        },
      ]),
    ),
    overview_notices_by_carrier: Object.fromEntries(
      telecomValues.map((t) => [
        t,
        {
          fup_notice:
            "每日流量額度用完後降速。僅涵蓋美國與加拿大，不含墨西哥。",
          activation_notice: "建議抵達後再新增／啟用 eSIM。",
        },
      ]),
    ),
    key_features_by_carrier: usCanadaDailyKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "美國 + 加拿大｜每日型｜純數據｜不含墨西哥",
    handle: HANDLE,
    description:
      "美加（美國、加拿大）每日型 eSIM。純數據，覆蓋美加兩國，不含墨西哥。提供多組電信網與每日流量可選。建議抵達後再新增 eSIM。",
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
    categories: [{ id: categoryId }],
  };

  const variants = rows.map(toVariant);

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
      console.log("（未加 --rebuild，僅更新商品資訊）");
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
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`Handle: ${check.product?.handle}`);
  console.log(`前台: /product/us-canada/${HANDLE}`);
  console.log(`Admin: ${MEDUSA_URL}/app/products/${product.id}`);
  console.log(`變體數: ${vs.length}`);
  for (const sku of [
    "USA & Canada-Daily500MB-1-B0",
    "USA & Canada-Daily1GB-1-B0",
  ]) {
    const v = vs.find((x) => x.sku === sku);
    if (v)
      console.log(`核對 ${sku}: TWD ${v.prices?.[0]?.amount ?? "?"}`);
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
