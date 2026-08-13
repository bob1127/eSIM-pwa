/**
 * 建立「加拿大 吃到飽 eSIM」
 *   WIND / Bell / TELUS + ← US&Canada-unlimited-*-B0（PL IP、FUP、75%）
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-canada-unlimited-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-canada-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CA_TELECOM_UNLIM,
  canadaUnlimitedKeyFeaturesByCarrier,
} from "../content/product-detailed/canada-key-features.js";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";

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

const HANDLE = "canada-unlimited-esim";
const TITLE = "加拿大 吃到飽 eSIM";
const TELECOM = CA_TELECOM_UNLIM;
const DATA = "吃到飽";
const PROFIT = 75;
const MARGIN = 1 + PROFIT / 100;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");
const THUMB =
  process.env.CANADA_PRODUCT_THUMB ||
  `${SITE_ORIGIN}/images/${encodeURIComponent("加拿大esim.png")}`;

const SPEED_RULE = "吃到飽不限流量（FUP，繁忙時段可能降速）";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

async function fetchPlans() {
  const localCache = "/tmp/esim-full-plans.json";
  const urls = [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.result || [];
      if (list.length) {
        fs.writeFileSync(localCache, JSON.stringify(data));
        console.log(`📥 方案目錄 ${list.length} 筆（${url}）`);
        return list;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }

  try {
    const { fetchMicroesimCatalog } = await import(
      "../lib/esim/microesimClient.js"
    );
    const list = await fetchMicroesimCatalog();
    if (list?.length) {
      fs.writeFileSync(localCache, JSON.stringify({ result: list }));
      console.log(`📥 方案目錄 ${list.length} 筆（MicroeSIM 直連）`);
      return list;
    }
  } catch (e) {
    console.warn(`⚠️ MicroeSIM 直連: ${e.message}`);
  }

  if (fs.existsSync(localCache)) {
    const data = JSON.parse(fs.readFileSync(localCache, "utf8"));
    console.log("📥 使用快取 /tmp/esim-full-plans.json");
    return data.result || [];
  }
  throw new Error("無法取得方案目錄");
}

function collectRows(raw) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!/^US&Canada-unlimited-\d+-B0$/i.test(name)) continue;
    const day = Number(p.day) || 0;
    if (!day) continue;
    const hkd = Number(p.price) || 0;
    const prev = map.get(day);
    if (prev && hkd >= prev.price_hkd) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    map.set(day, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom: TELECOM,
      day,
      daysLabel: `${day}天`,
      data: DATA,
      price_hkd: hkd,
      cost_twd: cost,
      profit_percent: PROFIT,
      retail_twd: retailFromCost(cost),
      apn: String(p.apn || "plus").trim(),
      networks:
        p.networks ||
        p.operator ||
        "US:T-Mobile/Verizon/AT&T[4G;LTE;5G]|CA:Wind/Bell/Telus/SaskTel[4G;LTE;5G]",
      rule_desc: p.rule_desc || "unlimited",
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || "PL").trim(),
    });
  }
  return [...map.values()].sort((a, b) => a.day - b.day);
}

function toVariant(r) {
  return {
    title: `${r.telecom} · ${r.daysLabel} · ${r.data}`,
    // 美加吃到飽 SKU 已用於 us-canada-unlimited-esim
    sku: `${r.sku}#canada`,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: r.daysLabel,
      電信商: r.telecom,
      數據量: r.data,
    },
    prices: [{ currency_code: "twd", amount: r.retail_twd }],
    metadata: {
      plan_id: r.plan_id,
      type: "esim",
      carrier: r.telecom,
      plan_kind: "unlimited",
      data: r.data,
      data_amount: r.data,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: r.cost_twd,
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: MARGIN,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      speed_desc: r.speed_desc,
      special_desc: r.special_desc,
      throttle_kind: "fup",
      ip: r.ip,
      is_native: false,
      ekyc: null,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: "美加多網 4G/5G（WIND／Bell／TELUS＋T-Mobile／Verizon／AT&T）",
        ip_type: "波蘭 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        ekyc: null,
        speed_rule: SPEED_RULE,
        coverage: "加拿大＋美國",
        apps: "熱點分享,ChatGPT,TikTok,Gemini；美加雙國可用",
      },
    },
  };
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
    "/admin/product-categories?limit=200",
  );
  const existing = (cats || []).find(
    (c) =>
      c.handle === "canada" ||
      c.handle === "ca" ||
      /^加拿大$/.test(String(c.name || "")),
  );
  if (existing) {
    console.log("📂 分類", existing.id, existing.handle, existing.name);
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: "加拿大",
      handle: "canada",
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  console.log("🆕 已建立分類", id, "canada");
  return id;
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD} · ${TELECOM} ${PROFIT}%`);
  console.log(`  ${TELECOM} ← US&Canada-unlimited-*-B0`);

  const rows = collectRows(await fetchPlans());
  if (!rows.length) throw new Error("找不到 US&Canada-unlimited-*-B0");

  const samples = [
    rows.find((r) => r.day === 1),
    rows.find((r) => r.day === 3),
    rows.find((r) => r.day === 7),
    rows.find((r) => r.day === 30),
  ].filter(Boolean);
  for (const r of samples) {
    console.log(
      `  [${r.telecom}] ${r.data} ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（${r.profit_percent}%）`,
    );
  }
  console.log(`共 ${rows.length} 筆`);

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [TELECOM];
  const dataValues = [DATA];

  const productMeta = {
    type: "esim",
    country: "CA",
    is_native: false,
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title: "加拿大 eSIM 吃到飽｜WIND／Bell／TELUS＋｜美加雙國｜Jeko eSIM",
    seo_description:
      "加拿大吃到飽 eSIM：WIND／Bell／TELUS＋加拿大多網，並含美國 T-Mobile／Verizon／AT&T。FUP 不限流量，不含墨西哥。",
    seo_keywords:
      "加拿大eSIM,Canada eSIM,吃到飽,不限流量,TELUS,Bell,WIND,美加eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]: "美加多網｜WIND／Bell／TELUS＋｜FUP 吃到飽｜不含墨西哥",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "波蘭 IP",
        route_type: "漫遊",
        network: "WIND／Bell／Telus／SaskTel＋T-Mobile／Verizon／AT&T 4G/5G",
        speed_rule: SPEED_RULE,
        apn: "plus",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        coverage: "加拿大＋美國（不含墨西哥）",
        ekyc: "供應商備註未標示實名",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "美加多網漫遊吃到飽（FUP）。加拿大 WIND／Bell／Telus／SaskTel，美國 T-Mobile／Verizon／AT&T。不含墨西哥。出網波蘭 IP，支援 ChatGPT／TikTok／Gemini。",
        activation_notice: "建議抵達加拿大或美國後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: canadaUnlimitedKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "WIND／Bell／TELUS＋｜美加吃到飽｜FUP｜75%",
    handle: HANDLE,
    description:
      "加拿大吃到飽 eSIM，走 WIND／Bell／TELUS／SaskTel 與美國 T-Mobile／Verizon／AT&T。FUP 不限流量，波蘭 IP，不含墨西哥。可選 1／3／5／7／10／15／20／30 天。建議抵達後再啟用。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: dataValues },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
  };

  const variants = rows.map(toVariant);

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  const categoryId = await ensureCategory(token);
  payloadBase.categories = [{ id: categoryId }];

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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-canada-unlimited-product.mjs --rebuild",
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
  console.log(`前台: /product/canada/${HANDLE}/`);
  console.log(`Admin: ${MEDUSA_URL}/app/products/${product.id}`);
  console.log(`變體數: ${vs.length}`);
  console.log(`天數: ${dayValues.join(" | ")}`);
  console.log(`流量: ${dataValues.join(" | ")}`);
  console.log(`電信: ${telecomValues.join(" | ")}`);
  for (const r of samples) {
    console.log(
      `範例 ${r.telecom} ${r.data} ${r.day}天: HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（${r.profit_percent}%）`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
