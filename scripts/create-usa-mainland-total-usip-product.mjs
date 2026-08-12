/**
 * 建立「美國 eSIM 總量型｜美國 IP」
 * - 一般／短天數：Verizon USA / AT&T USA Total @95%
 * - 長天數：長天數 Verizon USA / AT&T USA（15–30 天 Total30GB）@100%
 * - 長天數：長天數 Verizon（60 天 Total30/60GB，SG IP）@100%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-usa-mainland-total-usip-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-usa-mainland-total-usip-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { usaMainlandTotalUsipKeyFeaturesByCarrier } from "../content/product-detailed/usa-region-key-features.js";

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

const HANDLE = "usa-mainland-total-usip-esim";
const TITLE = "美國 eSIM 總量型｜美國 IP";
const LINE = "漫遊線路";
const DEFAULT_PROFIT = 95;
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

function retailFromCost(costTwd, profitPercent) {
  return Math.ceil((costTwd * (1 + profitPercent / 100)) / 10) * 10 - 1;
}

function loadPlans() {
  const file = path.join(
    __dirname,
    "data",
    "usa-mainland-total-usip-plans.json",
  );
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return (raw.plans || [])
    .map((p) => {
      const day = Number(p.day);
      const price_hkd = Number(p.price_hkd) || 0;
      const cost_twd =
        Number(p.cost_twd) || Math.ceil(price_hkd * HKD_TO_TWD);
      const telecom = p.telecom || "Verizon USA / AT&T USA";
      const data = p.data || "總量型 FUP吃到飽";
      const profit_percent = Number(p.profit_percent) || DEFAULT_PROFIT;
      return {
        ...p,
        day,
        daysLabel: `${day}天`,
        telecom,
        data,
        price_hkd,
        cost_twd,
        profit_percent,
        retail_twd:
          Number(p.retail_twd) || retailFromCost(cost_twd, profit_percent),
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
  const telecom = row.telecom;
  const data = row.data;
  const profit = Number(row.profit_percent) || DEFAULT_PROFIT;
  const margin = 1 + profit / 100;
  const ipLabel =
    String(row.ip || "").toUpperCase() === "US"
      ? "美國 IP"
      : String(row.ip || "").toUpperCase() === "SG"
        ? "新加坡 IP"
        : `${row.ip} IP`;
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
      profit_percent: profit,
      profit_margin: `${profit}%`,
      profit_rate: `${profit}%`,
      margin,
      apn: row.apn || "bicsapn",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "unlimited 128kbps",
      speed_desc: row.speed_desc || "",
      special_desc: row.special_desc || "",
      ip: row.ip || "US",
      hotspot: true,
      attributes: {
        days: row.day,
        data,
        data_amount: data,
        telecom,
        line: LINE,
        network: /AT&T/i.test(telecom)
          ? "Verizon USA / AT&T USA · 4G·5G"
          : "Verizon · 4G·5G",
        ip_type: ipLabel,
        route_type: LINE,
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: `${data}；降速後 128kbps 無限`,
        apps: "ChatGPT、TikTok、Gemini；支援熱點",
      },
    },
  };
}

async function main() {
  const rows = loadPlans();
  if (!rows.length) {
    throw new Error("usa-mainland-total-usip-plans.json 無資料");
  }

  console.log(`💱 HKD→TWD ${HKD_TO_TWD}｜方案 ${rows.length}`);
  for (const s of rows.slice(0, 5)) {
    console.log(
      `   ${s.day}天 ${s.telecom} HKD ${s.price_hkd} → cost NT$${s.cost_twd} → 售價 NT$${s.retail_twd} @${s.profit_percent}%`,
    );
  }
  if (rows.length > 5) console.log(`   …另 ${rows.length - 5} 檔`);

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [...new Set(rows.map((r) => r.telecom))];
  const dataValues = [...new Set(rows.map((r) => r.data))];
  const profitByTelecom = {};
  for (const r of rows) {
    profitByTelecom[r.telecom] = r.profit_percent;
  }

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  const categoryId = await ensureUsaCategory(token);

  const telecomUsAtt = "Verizon USA / AT&T USA";
  const telecomLongUsAtt = "長天數 Verizon USA / AT&T USA";
  const telecomLongVz = "長天數 Verizon";

  const productMeta = {
    type: "esim",
    country: "US",
    region: "US",
    is_native: false,
    plan_kind: "total_fup",
    hot_sale_telecoms: telecomValues,
    carrier_profit_by_carrier: profitByTelecom,
    seo_title: "美國 eSIM 總量型｜美國 IP｜Jeko eSIM",
    seo_description:
      "美國總量型 eSIM：Verizon USA／AT&T 美國 IP，另有長天數 15–30 天與 60 天 Verizon Total FUP 方案。",
    seo_keywords:
      "美國eSIM,美國本土IP,Verizon,AT&T,總量型,長天數,60天,Jeko eSIM",
    subtitle_by_carrier: {
      [telecomUsAtt]:
        "美國 IP｜Verizon USA / AT&T USA｜總量型 FUP｜短／中天數",
      [telecomLongUsAtt]:
        "美國 IP｜長天數｜Total30GB｜15–30天",
      [telecomLongVz]:
        "新加坡 IP｜長天數 Verizon｜60天｜Total30／60GB",
    },
    carrier_specs_by_carrier: {
      [telecomUsAtt]: {
        ip_type: "美國 IP",
        route_type: LINE,
        network: "US: Verizon USA｜AT&T USA｜4G·5G",
        speed_rule: "高速額度用完後降速 128kbps 無限流量",
        apn: "bicsapn",
        apps: "ChatGPT、TikTok、Gemini；支援熱點",
      },
      [telecomLongUsAtt]: {
        ip_type: "美國 IP",
        route_type: LINE,
        network: "US: Verizon USA｜AT&T USA｜4G·5G",
        speed_rule: "高速 30GB 後降速 128kbps 無限流量",
        apn: "bicsapn",
        apps: "ChatGPT、TikTok、Gemini；支援熱點",
      },
      [telecomLongVz]: {
        ip_type: "新加坡 IP",
        route_type: LINE,
        network: "US: Verizon｜4G·5G",
        speed_rule: "高速 30GB／60GB 後降速 128kbps 無限流量",
        apn: "e-ideas",
        apps: "ChatGPT、TikTok、Gemini；支援熱點",
      },
    },
    overview_notices_by_carrier: {
      [telecomUsAtt]: {
        fup_notice:
          "高速額度用完後降速至 128kbps，並提供無限流量。阿拉斯加、夏威夷使用不保證。",
        activation_notice: "建議抵達美國後再新增／啟用 eSIM。",
      },
      [telecomLongUsAtt]: {
        fup_notice:
          "高速數據 30GB 用完後降速至 128kbps，並提供無限流量。阿拉斯加、夏威夷使用不保證。",
        activation_notice: "建議抵達美國後再新增／啟用 eSIM。",
      },
      [telecomLongVz]: {
        fup_notice:
          "高速數據（30GB 或 60GB）用完後降速至 128kbps，並提供無限流量。閘道為新加坡 IP。",
        activation_notice: "建議抵達美國後再新增／啟用 eSIM。",
      },
    },
    key_features_by_carrier: usaMainlandTotalUsipKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle:
      "Verizon USA / AT&T｜總量型｜含長天數 15–30／60 天",
    handle: HANDLE,
    description:
      "美國 eSIM 總量型｜美國 IP。一般天數為 Verizon USA／AT&T USA 總量 FUP；另有長天數 15／20／30 天（美國 IP）與 60 天 Verizon（新加坡 IP，Total30／60GB）。支援熱點。建議抵達後再新增 eSIM。",
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
      console.log("（未加 --rebuild，僅更新商品資訊；變體不變）");
      console.log(
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-usa-mainland-total-usip-product.mjs --rebuild",
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
      `  ${v.sku} → TWD ${v.prices?.[0]?.amount ?? "(見價格)"}｜IP ${v.metadata?.ip || "?"}`,
    );
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
