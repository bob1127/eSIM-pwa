/**
 * 建立「美國本土 吃到飽 不限流量 eSIM」
 * SKU：United States of America-unlimited-*-A0（1–10、15、20、25、30 天全系列）
 * 利潤：100%（成本 × 2，尾數 9）
 *
 * 注意：供應商標註 IP=US（美國 IP 漫遊出口，非原生門號卡）。
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-usa-mainland-unlimited-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-usa-mainland-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { usaMainlandUnlimitedKeyFeaturesByCarrier } from "../content/product-detailed/usa-region-key-features.js";

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

const HANDLE = "usa-mainland-unlimited-esim";
const TITLE = "美國本土 吃到飽 不限流量 eSIM";
const TELECOM = "Verizon / T-Mobile";
const DATA = "吃到飽";
const LINE = "漫遊線路";
const PROFIT = 100;
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
  const file = path.join(
    __dirname,
    "data",
    "usa-mainland-unlimited-plans.json",
  );
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
        price_hkd,
        cost_twd,
        retail_twd: Number(p.retail_twd) || retailFromCost(cost_twd),
      };
    })
    .sort((a, b) => a.day - b.day);
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

async function ensureUsaCategory(token) {
  const { product_categories: cats } = await admin(
    token,
    "/admin/product-categories?limit=100",
  );
  const existing = (cats || []).find(
    (c) =>
      c.handle === "usa" ||
      c.handle === "us" ||
      /美國|北美|usa|america/i.test(String(c.name || "")),
  );
  if (existing) {
    console.log("📂 分類", existing.id, existing.handle, existing.name);
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: "美國",
      handle: "usa",
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  console.log("🆕 已建立分類", id, "usa");
  return id;
}

function toVariant(row) {
  return {
    title: `${TELECOM} · ${row.daysLabel} · ${DATA}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: TELECOM,
      數據量: DATA,
      線路: LINE,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: TELECOM,
      data: DATA,
      data_amount: DATA,
      days: String(row.day),
      cost_hkd: String(row.price_hkd),
      cost_price: row.cost_twd,
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: MARGIN,
      apn: row.apn || "bicsapn",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "unlimited",
      speed_desc: row.speed_desc || "",
      special_desc: row.special_desc || "",
      ip: row.ip || "US",
      hotspot: true,
      attributes: {
        days: row.day,
        data: DATA,
        data_amount: DATA,
        telecom: TELECOM,
        line: LINE,
        network: "Verizon / T-Mobile · 4G·5G",
        ip_type: "美國 IP",
        route_type: LINE,
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: "吃到飽 FUP；典型速度約 8–20Mbps；阿拉斯加／夏威夷不保證",
        apps: "ChatGPT、TikTok、Gemini；支援熱點",
      },
    },
  };
}

async function main() {
  const rows = loadPlans();
  if (!rows.length) {
    throw new Error("usa-mainland-unlimited-plans.json 無資料");
  }

  console.log(`💱 HKD→TWD ${HKD_TO_TWD}｜利潤 ${PROFIT}%｜方案 ${rows.length}`);
  for (const s of rows) {
    console.log(
      `   ${s.day}天 HKD ${s.price_hkd} → cost NT$${s.cost_twd} → 售價 NT$${s.retail_twd} (${s.sku})`,
    );
  }

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  const categoryId = await ensureUsaCategory(token);

  const productMeta = {
    type: "esim",
    country: "US",
    region: "US",
    is_native: false,
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: {
      [TELECOM]: PROFIT,
    },
    seo_title: "美國本土 吃到飽 不限流量 eSIM｜Verizon / T-Mobile｜Jeko eSIM",
    seo_description:
      "美國本土吃到飽不限流量 eSIM：Verizon／T-Mobile 5G，1–30 天，支援熱點。FUP 典型約 8–20Mbps。",
    seo_keywords:
      "美國eSIM,美國本土eSIM,Verizon,T-Mobile,吃到飽,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]:
        "Verizon / T-Mobile 5G｜吃到飽 FUP｜支援熱點｜美國 IP",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "美國 IP",
        route_type: LINE,
        network: "US: Verizon｜T-Mobile｜4G·5G",
        speed_rule: "吃到飽 FUP；典型速度約 8–20Mbps",
        apn: "bicsapn",
        apps: "ChatGPT、TikTok、Gemini；支援熱點",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "無限流量（FUP）：典型速度約 8–20Mbps。阿拉斯加、夏威夷使用不保證。",
        activation_notice: "建議抵達美國後再新增／啟用 eSIM。",
      },
    },
    key_features_by_carrier: usaMainlandUnlimitedKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "Verizon / T-Mobile 5G｜吃到飽 FUP｜支援熱點｜1–30 天",
    handle: HANDLE,
    description:
      "美國本土吃到飽 eSIM，電信 Verizon／T-Mobile（5G），支援熱點。出網為美國 IP（漫遊批發線路，非原生門號卡）。提供 1–10、15、20、25、30 天。FUP 典型速度約 8–20Mbps；阿拉斯加與夏威夷使用不保證。建議抵達後再新增 eSIM。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: [DATA] },
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
      console.log("（未加 --rebuild，僅更新商品資訊；變體不變）");
      console.log(
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-usa-mainland-unlimited-product.mjs --rebuild",
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
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`Handle: ${check.product?.handle}`);
  console.log(`前台: /product/usa/${HANDLE}`);
  console.log(`Admin: ${MEDUSA_URL}/app/products/${product.id}`);
  console.log(`變體數: ${vs.length}`);
  for (const v of vs.sort(
    (a, b) =>
      Number(a.metadata?.days || 0) - Number(b.metadata?.days || 0),
  )) {
    console.log(
      `  ${v.sku} → TWD ${v.prices?.[0]?.amount ?? "(見價格)"}`,
    );
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
