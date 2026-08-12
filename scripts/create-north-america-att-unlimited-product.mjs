/**
 * 建立「北美 (美國、加拿大、墨西哥) 吃到飽 不限流量 eSIM - AT&T 美國號碼」
 * SKU：USCAMX-Local-unlimited-*-A1（10–30 天）
 * 利潤：70%（成本 × 1.7，尾數 9）
 *
 * 規格重點：
 * - 美國原生 IP（AT&T）＋正宗 +1 美國號碼
 * - 美／墨無限流量；加拿大 25GB 高速後 512Kbps
 * - 美／加／墨無限通話＋簡訊
 * - 熱點僅限美國境內（不作保證；加／墨不可用）
 * - 開通以美西時間 (PT) 為準，建議至少提前一天預訂
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-north-america-att-unlimited-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-north-america-att-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { northAmericaAttUnlimitedKeyFeaturesByCarrier, northAmericaAttUnlimitedOverviewNoticesByCarrier } from "../content/product-detailed/usa-region-key-features.js";

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

const HANDLE = "north-america-att-unlimited-esim";
const TITLE =
  "北美 (美國、加拿大、墨西哥) 吃到飽 不限流量 eSIM - AT&T 美國號碼 ｜ 跨國可用 美國當地原生IP";
const TELECOM = "AT&T 美國號碼";
const DATA = "吃到飽";
const LINE = "本地線路";
const PROFIT = 70;
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
    "north-america-att-unlimited-plans.json",
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
        retail_twd: retailFromCost(cost_twd),
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

async function ensureCategory(
  token,
  { handle, name, match },
) {
  const { product_categories: cats } = await admin(
    token,
    "/admin/product-categories?limit=100",
  );
  const existing = (cats || []).find(
    (c) => c.handle === handle || match(c),
  );
  if (existing) {
    console.log("📂 分類", existing.id, existing.handle, existing.name);
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name,
      handle,
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  console.log("🆕 已建立分類", id, handle);
  return id;
}

async function ensureProductCategories(token) {
  const northAmericaId = await ensureCategory(token, {
    handle: "north-america",
    name: "北美",
    match: (c) =>
      c.handle === "north-america" ||
      (/北美/.test(String(c.name || "")) &&
        !/美加(?!墨)/.test(String(c.name || ""))),
  });
  const usaId = await ensureCategory(token, {
    handle: "usa",
    name: "美國",
    match: (c) =>
      c.handle === "usa" ||
      c.handle === "us" ||
      /^美國$/.test(String(c.name || "").trim()),
  });
  return { northAmericaId, usaId };
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
      apn: row.apn || "ENHANCEDPHONE",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "unlimited",
      speed_desc: row.speed_desc || "",
      special_desc: row.special_desc || "",
      ip: row.ip || "US",
      has_us_number: true,
      voice_sms: true,
      hotspot: "us_only",
      attributes: {
        days: row.day,
        data: DATA,
        data_amount: DATA,
        telecom: TELECOM,
        line: LINE,
        network: "AT&T / Rogers / 4G·5G",
        ip_type: "美國原生 IP",
        route_type: LINE,
        hotspot: "僅限美國境內（不作保證）",
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: "美／墨無限；加拿大 25GB 後 512Kbps",
        apps: "無限通話／簡訊；熱點僅限美國",
      },
    },
  };
}

async function main() {
  const rows = loadPlans();
  if (!rows.length) {
    throw new Error("north-america-att-unlimited-plans.json 無資料");
  }

  console.log(`💱 HKD→TWD ${HKD_TO_TWD}｜利潤 ${PROFIT}%｜方案 ${rows.length}`);
  for (const s of [rows.find((r) => r.day === 10), rows.find((r) => r.day === 15)].filter(Boolean)) {
    console.log(
      `   ${s.day}天 HKD ${s.price_hkd} → cost NT$${s.cost_twd} → 售價 NT$${s.retail_twd} (${s.sku})`,
    );
  }

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  const { northAmericaId, usaId } = await ensureProductCategories(token);

  const productMeta = {
    type: "esim",
    country: "US",
    region: "US,CA,MX",
    is_native: true,
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: {
      [TELECOM]: PROFIT,
    },
    seo_title:
      "北美 eSIM 吃到飽｜AT&T 美國號碼・美加墨跨國・美國原生 IP｜Jeko eSIM",
    seo_description:
      "北美（美國、加拿大、墨西哥）吃到飽 eSIM：AT&T 美國號碼、美國原生 IP、美墨無限流量、加拿大 25GB，含無限通話與簡訊。跨國可用。",
    seo_keywords:
      "北美eSIM,美國eSIM,加拿大eSIM,墨西哥eSIM,AT&T,美國號碼,原生IP,吃到飽,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]:
        "美國原生 IP｜AT&T 美國號碼｜美墨無限／加拿大25GB｜無限通話簡訊｜熱點僅限美國",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "美國原生 IP",
        route_type: LINE,
        network: "US: AT&T｜CA: Rogers｜MX: AT&T｜4G·5G",
        speed_rule:
          "美／墨無限流量；加拿大 25GB 高速後降速至 512Kbps 吃到飽",
        apn: "ENHANCEDPHONE",
        apps: "含無限通話／簡訊；熱點僅限美國境內且不作保證",
      },
    },
    overview_notices_by_carrier:
      northAmericaAttUnlimitedOverviewNoticesByCarrier(),
    key_features_by_carrier: northAmericaAttUnlimitedKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle:
      "AT&T 美國號碼｜美國原生 IP｜美墨無限／加拿大25GB｜無限通話簡訊｜熱點僅限美國｜跨國可用",
    handle: HANDLE,
    description:
      "北美（美國、加拿大、墨西哥）吃到飽不限流量 eSIM，附 AT&T 美國號碼與美國當地原生 IP。美／墨無限流量；加拿大 25GB 高速後降速至 512Kbps。含三國無限通話與簡訊。熱點僅限美國境內且不作保證。開通日期以美西時間 (PT) 為準，建議至少提前一天預訂。",
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
    // 主分類北美；同時掛美國，兩邊分類頁都會出現
    categories: [{ id: northAmericaId }, { id: usaId }],
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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-north-america-att-unlimited-product.mjs --rebuild",
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
  const sample = vs.find((v) => /10-A1$/i.test(v.sku || ""));
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`Handle: ${check.product?.handle}`);
  console.log(`前台: /product/north-america/${HANDLE}`);
  console.log(`Admin: ${MEDUSA_URL}/app/products/${product.id}`);
  console.log(`變體數: ${vs.length}`);
  if (sample) {
    console.log(
      `核對 10天: ${sample.sku} 售價 TWD ${sample.prices?.[0]?.amount || "(見價格)"}`,
    );
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
