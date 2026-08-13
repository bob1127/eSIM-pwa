/**
 * 建立「加拿大 總量型 eSIM」
 *   1) TELUS / BELL ← Canada-Total*GB-*-A0（HK/SG IP、多數 128kbps）
 *   2) Rogers / Bell / TELUS + ← USA & Canada-Total*GB-*-B0（PL IP、美加多網、用完斷網、60%）
 *   3) TELUS 原生 ← Canada-Local-Total*GB-*-A0（CA IP、sp.telus.com、含通話簡訊）
 * 利潤：未滿 25 天 40%；25 天以上 50%；美加多網一律 60%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-canada-total-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-canada-total-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CA_TELECOM_MULTI,
  CA_TELECOM_NATIVE,
  CA_TELECOM_ROAM,
  canadaTotalKeyFeaturesByCarrier,
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

const HANDLE = "canada-total-esim";
const TITLE = "加拿大 總量型 eSIM";
const TELECOM_ROAM = CA_TELECOM_ROAM;
const TELECOM_MULTI = CA_TELECOM_MULTI;
const TELECOM_NATIVE = CA_TELECOM_NATIVE;
const PROFIT_DEFAULT = 40;
const PROFIT_LONG = 50;
const PROFIT_MULTI = 60;
const LONG_DAY_MIN = 25;
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

const SPEED_FUP = "總量高速用完後降速約 128kbps 持續使用";
const SPEED_TERM = "總量高速額度用完斷網";
const DATA_ORDER = [
  "1GB",
  "2GB",
  "3GB",
  "5GB",
  "10GB",
  "20GB",
  "30GB",
  "50GB",
  "75GB",
];

function profitForDay(day) {
  return Number(day) >= LONG_DAY_MIN ? PROFIT_LONG : PROFIT_DEFAULT;
}

function retailFromCost(costTwd, profitPercent) {
  return Math.ceil((costTwd * (1 + profitPercent / 100)) / 10) * 10 - 1;
}

function parseDataLabel(name) {
  const m = String(name || "").match(/Total(\d+)\s*GB/i);
  return m ? `${m[1]}GB` : "";
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

function collectFamily(raw, pred, telecom, defaults) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!pred(name)) continue;
    const day = Number(p.day) || 0;
    const data = parseDataLabel(name);
    if (!day || !data) continue;
    const hkd = Number(p.price) || 0;
    const key = `${telecom}|${day}|${data}`;
    const prev = map.get(key);
    if (prev && hkd >= prev.price_hkd) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    const profit =
      defaults.profit != null ? Number(defaults.profit) : profitForDay(day);
    const terminate = /terminat/i.test(String(p.rule_desc || defaults.rule || ""));
    map.set(key, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom,
      kind: defaults.kind,
      day,
      daysLabel: `${day}天`,
      data,
      price_hkd: hkd,
      cost_twd: cost,
      profit_percent: profit,
      retail_twd: retailFromCost(cost, profit),
      apn: String(p.apn || defaults.apn).trim(),
      networks: p.networks || p.operator || defaults.networks,
      rule_desc: p.rule_desc || defaults.rule,
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || defaults.ip).trim(),
      terminate,
      speed_rule: terminate ? SPEED_TERM : SPEED_FUP,
    });
  }
  return [...map.values()];
}

function collectRows(raw) {
  const roam = collectFamily(
    raw,
    (name) => /^Canada-Total\d+GB-\d+-A0$/i.test(name),
    TELECOM_ROAM,
    {
      kind: "roam",
      apn: "internetipv6",
      networks: "CA:Telus[4G;LTE;5G],Bell[4G;LTE;5G]|",
      rule: "unlimited 128kbps",
      ip: "HK,SG",
    },
  );
  const multi = collectFamily(
    raw,
    (name) => /^USA & Canada-Total\d+GB-\d+-B0$/i.test(name),
    TELECOM_MULTI,
    {
      kind: "multi",
      profit: PROFIT_MULTI,
      apn: "internet / internetipv6",
      networks:
        "US:Verizon[4G;LTE;5G],AT&T[4G;LTE;5G],T-Mobile[4G;LTE;5G]| CA:Rogers[4G;LTE;5G],FIDO (Rogers AT&T/ Microcell)[4G;LTE;5G],Bell[4G;LTE;5G],Telus[4G;LTE;5G],Videotron General Partnership[4G;LTE;5G],SaskTel[4G;LTE]|",
      rule: "terminate",
      ip: "PL",
    },
  );
  const native = collectFamily(
    raw,
    (name) => /^Canada-Local-Total\d+GB-\d+-A0$/i.test(name),
    TELECOM_NATIVE,
    {
      kind: "native",
      apn: "sp.telus.com",
      networks: "CA:Telus[4G;5G]|",
      rule: "unlimited 128kbps",
      ip: "CA",
    },
  );
  const dataRank = (label) => {
    const i = DATA_ORDER.indexOf(String(label || ""));
    return i >= 0 ? i : 99;
  };
  const kindRank = (k) => (k === "roam" ? 0 : k === "multi" ? 1 : 2);
  return [...roam, ...multi, ...native].sort(
    (a, b) =>
      kindRank(a.kind) - kindRank(b.kind) ||
      a.day - b.day ||
      dataRank(a.data) - dataRank(b.data),
  );
}

function toVariant(r) {
  const isNative = r.kind === "native";
  const isMulti = r.kind === "multi";
  const margin = 1 + r.profit_percent / 100;
  return {
    title: `${r.telecom} · ${r.daysLabel} · ${r.data}`,
    sku: r.sku,
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
      plan_kind: "total",
      data: r.data,
      data_amount: r.data,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: r.cost_twd,
      profit_percent: r.profit_percent,
      profit_margin: `${r.profit_percent}%`,
      profit_rate: `${r.profit_percent}%`,
      margin,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      speed_desc: r.speed_desc,
      special_desc: r.special_desc,
      throttle_kind: r.terminate ? "terminate" : "128kbps",
      ip: r.ip,
      is_native: isNative,
      ekyc: null,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: isNative
          ? "TELUS 4G/5G"
          : isMulti
            ? "美加多網 4G/5G（Rogers／Bell／TELUS＋）"
            : "TELUS / Bell 4G/5G",
        ip_type: isNative ? "加拿大 IP" : isMulti ? "波蘭 IP" : "香港／新加坡 IP",
        route_type: isNative ? "原生" : "漫遊",
        hotspot: true,
        gpt: isNative || isMulti,
        tiktok: isNative || isMulti,
        gemini: true,
        ekyc: null,
        speed_rule: `${r.data}；${r.speed_rule}`,
        coverage: isMulti ? "加拿大＋美國" : "加拿大",
        apps: isNative
          ? "熱點分享,ChatGPT,TikTok,Gemini；含本地通話／簡訊"
          : isMulti
            ? "熱點分享,ChatGPT,TikTok,Gemini；美加雙國可用"
            : "支援熱點；ChatGPT／TikTok 不保證（香港／新加坡 IP）",
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
  console.log(
    `💱 HKD→TWD ${HKD_TO_TWD} · <${LONG_DAY_MIN}天 ${PROFIT_DEFAULT}% · ≥${LONG_DAY_MIN}天 ${PROFIT_LONG}% · 多網 ${PROFIT_MULTI}%`,
  );
  console.log(`  ${TELECOM_ROAM} ← Canada-Total*-A0`);
  console.log(`  ${TELECOM_MULTI} ← USA & Canada-Total*-B0`);
  console.log(`  ${TELECOM_NATIVE} ← Canada-Local-Total*-A0`);

  const rows = collectRows(await fetchPlans());
  const rowsRoam = rows.filter((r) => r.kind === "roam");
  const rowsMulti = rows.filter((r) => r.kind === "multi");
  const rowsNative = rows.filter((r) => r.kind === "native");
  if (!rowsRoam.length) throw new Error("找不到 Canada-Total*GB-*-A0");
  if (!rowsMulti.length) throw new Error("找不到 USA & Canada-Total*GB-*-B0");
  if (!rowsNative.length) throw new Error("找不到 Canada-Local-Total*GB-*-A0");

  const samples = [
    rows.find((r) => r.kind === "roam" && r.day === 3 && r.data === "3GB"),
    rows.find((r) => r.kind === "roam" && r.day === 3 && r.data === "5GB"),
    rows.find((r) => r.kind === "roam" && r.day === 3 && r.data === "10GB"),
    rows.find((r) => r.kind === "roam" && r.day === 25 && r.data === "10GB"),
    rows.find((r) => r.kind === "multi" && r.day === 3 && r.data === "1GB"),
    rows.find((r) => r.kind === "multi" && r.day === 3 && r.data === "3GB"),
    rows.find((r) => r.kind === "multi" && r.day === 3 && r.data === "5GB"),
    rows.find((r) => r.kind === "native" && r.day === 30 && r.data === "50GB"),
    rows.find((r) => r.kind === "native" && r.day === 30 && r.data === "75GB"),
  ].filter(Boolean);
  for (const r of samples) {
    console.log(
      `  [${r.telecom}] ${r.data} ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（${r.profit_percent}%）`,
    );
  }
  console.log(
    `共 ${TELECOM_ROAM} ${rowsRoam.length} + ${TELECOM_MULTI} ${rowsMulti.length} + ${TELECOM_NATIVE} ${rowsNative.length} = ${rows.length} 筆`,
  );

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) => rows.some((r) => r.data === d));
  const telecomValues = [TELECOM_ROAM, TELECOM_MULTI, TELECOM_NATIVE];

  const productMeta = {
    type: "esim",
    country: "CA",
    is_native: false,
    plan_kind: "total",
    hot_sale_telecoms: [TELECOM_NATIVE],
    carrier_profit_by_carrier: {
      [TELECOM_ROAM]: PROFIT_DEFAULT,
      [TELECOM_MULTI]: PROFIT_MULTI,
      [TELECOM_NATIVE]: PROFIT_LONG,
    },
    profit_by_days: { default: PROFIT_DEFAULT, from_day: LONG_DAY_MIN, long: PROFIT_LONG },
    seo_title: "加拿大 eSIM 總量型｜TELUS／Bell｜美加多網｜原生 TELUS｜Jeko eSIM",
    seo_description:
      "加拿大總量型 eSIM：TELUS／Bell 雙網漫遊（40%，25 天以上 50%）、美加多網 Rogers／Bell／TELUS＋（60%，含美國三網，用完斷網），或 TELUS 原生含通話簡訊。",
    seo_keywords:
      "加拿大eSIM,Canada eSIM,TELUS,Bell,Rogers,美加eSIM,總量型,原生,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_ROAM]: "TELUS／Bell 5G｜漫遊｜總量高速後約 128kbps",
      [TELECOM_MULTI]: "美加多網｜Rogers／Bell／TELUS＋｜美國三網｜用完斷網",
      [TELECOM_NATIVE]: "TELUS 原生｜加拿大 IP｜含通話簡訊｜50GB／75GB 30天",
    },
    carrier_specs_by_carrier: {
      [TELECOM_ROAM]: {
        ip_type: "香港／新加坡 IP",
        route_type: "漫遊",
        network: "TELUS / Bell 4G/5G",
        speed_rule: SPEED_FUP,
        apn: "internetipv6",
        apps: "支援熱點；ChatGPT／TikTok 不保證",
        coverage: "加拿大",
        ekyc: "供應商備註未標示實名",
      },
      [TELECOM_MULTI]: {
        ip_type: "波蘭 IP",
        route_type: "漫遊",
        network: "美加多網 4G/5G（Rogers／FIDO／Bell／Telus／Videotron／SaskTel＋Verizon／AT&T／T-Mobile）",
        speed_rule: SPEED_TERM,
        apn: "internet / internetipv6",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        coverage: "加拿大＋美國（不含墨西哥）",
        ekyc: "供應商備註未標示實名",
      },
      [TELECOM_NATIVE]: {
        ip_type: "加拿大 IP",
        route_type: "原生",
        network: "TELUS 4G/5G",
        speed_rule: SPEED_FUP,
        apn: "sp.telus.com",
        apps: "熱點分享,ChatGPT,TikTok,Gemini；含本地通話／簡訊",
        coverage: "加拿大",
        ekyc: "供應商備註未標示實名",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM_ROAM]: {
        fup_notice:
          "TELUS／Bell 漫遊。多數總量高速用完後降速約 128kbps；1GB／2GB 部分天數為用完斷網。出網香港／新加坡 IP，ChatGPT／TikTok 不保證。",
        activation_notice: "建議抵達加拿大後再安裝／啟用 eSIM",
      },
      [TELECOM_MULTI]: {
        fup_notice:
          "美加多網漫遊（加拿大 6 網＋美國 3 網）。總量高速用完斷網，不含墨西哥。出網波蘭 IP，支援 ChatGPT／TikTok／Gemini。",
        activation_notice: "建議抵達加拿大或美國後再安裝／啟用 eSIM",
      },
      [TELECOM_NATIVE]: {
        fup_notice:
          "TELUS 原生、加拿大 IP。含本地無限通話／簡訊與部分國際通話分鐘。高速用完後約 128kbps。eSIM 僅能安裝一次，請勿刪除。",
        activation_notice: "可提前安裝；建議抵達加拿大後再啟用。查用量可發 SMS Check 至 1888。",
      },
    },
    key_features_by_carrier: canadaTotalKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "TELUS／Bell｜美加多網｜TELUS 原生｜40%／25天+50%／多網60%",
    handle: HANDLE,
    description:
      "加拿大總量型 eSIM，三種電信可選：TELUS／Bell 雙網漫遊（香港／新加坡 IP，多數高速後 128kbps）；Rogers／Bell／TELUS＋美加多網（波蘭 IP，含美國三網，高速用完斷網，利潤 60%）；TELUS 原生（加拿大 IP，含本地通話／簡訊，30 天 50GB／75GB）。TELUS／Bell 未滿 25 天利潤 40%，25 天以上 50%。建議抵達後再啟用。",
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
        "重建變體請執行：HKD_TO_TWD=4.5 node scripts/create-canada-total-product.mjs --rebuild",
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
