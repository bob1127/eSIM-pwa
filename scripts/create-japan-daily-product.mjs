/**
 * 重建「日本每日型eSIM」(daily-jp)
 *   - SoftBank / KDDI：每日型（既有 T+C / Local SoftBank 線），利潤 40%
 *   - IIJ Docomo：改抓 Japan-LocalIIJ-Daily3GB-*（networks=DOCOMO、APN vmobile.jp），利潤 95%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-japan-daily-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { japanDailyKeyFeaturesByCarrier } from "../content/product-detailed/japan-daily-key-features.js";

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
const PRODUCT_HANDLE = process.env.PRODUCT_HANDLE || "daily-jp";
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const TELECOM_SB = "SoftBank / KDDI";
const TELECOM_IIJ = "IIJ Docomo（注意：需手動設定 APN）";
const PROFIT_SB = 80;
const PROFIT_IIJ = 95;

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const FUP_DEFAULT =
  "公平使用政策 (FUP)：每日高速額度用完後降速至約 256 kbps（或方案標示速度），隔日重置。";

function retailFromCost(costTwd, profitPercent) {
  return Math.ceil((costTwd * (1 + profitPercent / 100)) / 10) * 10 - 1;
}

function dataLabelFromName(name, dataField) {
  const n = String(name || "");
  const d = String(dataField || "").toLowerCase();
  if (/500\s*MB/i.test(n) || d.includes("500mb")) return "每日500MB";
  if (/Daily1GB|Daily\s*1GB/i.test(n) || /\b1gb\b/i.test(d)) return "每日1GB";
  if (/Daily2GB|Daily\s*2GB/i.test(n) || /\b2gb\b/i.test(d)) return "每日2GB";
  if (/Daily3GB|Daily\s*3GB/i.test(n) || /\b3gb\b/i.test(d)) return "每日3GB";
  if (/Daily10GB|Daily\s*10GB/i.test(n) || /\b10gb\b/i.test(d)) return "每日10GB";
  const m = n.match(/Daily\s*([\d.]+)\s*(GB|MB)/i);
  if (m) return `每日${m[1]}${m[2].toUpperCase()}`;
  return dataField || "每日流量";
}

async function fetchPlans() {
  const localCache = "/tmp/esim-plans.json";
  const urls = [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
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
  if (fs.existsSync(localCache)) {
    const data = JSON.parse(fs.readFileSync(localCache, "utf8"));
    console.log("📥 使用快取 /tmp/esim-plans.json");
    return data.result || [];
  }
  throw new Error("無法取得方案目錄");
}

function softbankScore(p) {
  const name = p.name || "";
  let s = 0;
  if (/\(KDDI\+SB\)\(T\+C\)/i.test(name) || /\(T\+C\)-Daily/i.test(name)) s += 1000;
  if (!/5mbps/i.test(name)) s += 100;
  if (!/-u-a\d/i.test(name) && !/-U-A/i.test(name)) s += 50;
  // 原生 SoftBank Local
  if (/Japan-Local-Daily/i.test(name) && /Softbank/i.test(p.networks || "")) s += 200;
  s += Math.max(0, 200 - Number(p.price || 0));
  return s;
}

function isSoftBankKddiDaily(p) {
  // 每日型 SoftBank / KDDI 只抓 T+C 雙網漫遊
  return /^Japan\(KDDI\+SB\)\(T\+C\)-Daily/i.test(String(p.name || ""));
}

function isLocalIijDaily3Gb(p) {
  return /^Japan-LocalIIJ-Daily3GB-/i.test(String(p.name || ""));
}

function toVariantRow(p, telecom, profit) {
  const hkd = Number(p.price) || 0;
  const cost = Math.ceil(hkd * HKD_TO_TWD);
  const day = Number(p.day);
  const data = dataLabelFromName(p.name, p.data);
  const isIij = telecom === TELECOM_IIJ;
  return {
    sku: p.name,
    plan_id: p.channel_dataplan_id || p.id,
    day,
    daysLabel: `${day}天`,
    data_amount: data,
    telecom,
    price_hkd: hkd,
    cost_twd: cost,
    retail_twd: retailFromCost(cost, profit),
    profit_percent: profit,
    apn: String(p.apn || "").trim(),
    networks: p.networks || "",
    rule_desc: p.rule_desc || "",
    special_desc: p.special_desc || "",
    ip: String(p.ip || "JP").trim(),
    _score: softbankScore(p),
  };
}

function buildRows(raw) {
  const sbMap = new Map();
  for (const p of raw) {
    if (!isSoftBankKddiDaily(p)) continue;
    const row = toVariantRow(p, TELECOM_SB, PROFIT_SB);
    const key = `${row.day}|${row.data_amount}`;
    const prev = sbMap.get(key);
    if (!prev || row._score > prev._score) sbMap.set(key, row);
  }

  const iijMap = new Map();
  for (const p of raw) {
    if (!isLocalIijDaily3Gb(p)) continue;
    const row = toVariantRow(p, TELECOM_IIJ, PROFIT_IIJ);
    // LocalIIJ Daily3GB → 一律 每日3GB
    row.data_amount = "每日3GB";
    const key = `${row.day}|${row.data_amount}`;
    const prev = iijMap.get(key);
    if (!prev || Number(row.price_hkd) < Number(prev.price_hkd)) {
      iijMap.set(key, row);
    }
  }

  const rows = [...sbMap.values(), ...iijMap.values()]
    .map(({ _score, ...rest }) => rest)
    .sort(
      (a, b) =>
        a.telecom.localeCompare(b.telecom) ||
        Number(a.day) - Number(b.day) ||
        a.data_amount.localeCompare(b.data_amount),
    );

  return {
    rows,
    nSb: sbMap.size,
    nIij: iijMap.size,
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
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toVariant(row) {
  const isIij = row.telecom === TELECOM_IIJ;
  const speedRule = isIij
    ? "公平使用政策 (FUP)：每日高速額度用完後降速至約 256 kbps，隔日重置。"
    : FUP_DEFAULT;
  return {
    title: `${row.telecom} · ${row.daysLabel} · ${row.data_amount}`,
    sku: `${row.sku}-${isIij ? "IIJ" : "SB"}`,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: row.telecom,
      數據量: row.data_amount,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: row.telecom,
      plan_kind: "daily",
      data: row.data_amount,
      data_amount: row.data_amount,
      days: String(row.day),
      cost_hkd: String(row.price_hkd || ""),
      cost_price: row.cost_twd,
      profit_percent: row.profit_percent,
      profit_margin: `${row.profit_percent}%`,
      profit_rate: `${row.profit_percent}%`,
      margin: 1 + row.profit_percent / 100,
      supplier_sku: row.sku,
      apn: row.apn || (isIij ? "vmobile.jp" : ""),
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      special_desc: row.special_desc || "",
      ip: row.ip || "JP",
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: row.telecom,
        network: isIij ? "DOCOMO 4G/LTE（IIJ）" : "SoftBank / KDDI 4G/5G",
        ip_type: "日本 IP",
        route_type: "原生eSIM",
        hotspot: true,
        speed_rule: speedRule,
        fup: speedRule,
        apn: row.apn || (isIij ? "vmobile.jp" : ""),
        apn_manual: isIij,
        apps: isIij
          ? "需手動設定 APN：vmobile.jp"
          : "熱點分享（依方案）",
      },
    },
  };
}

async function main() {
  console.log(`💱 匯率 1 HKD ≈ ${HKD_TO_TWD} TWD`);
  const raw = await fetchPlans();
  const { rows, nSb, nIij } = buildRows(raw);
  if (!rows.length) throw new Error("無每日型方案可建立");

  const sampleIij = rows.find((r) => r.telecom === TELECOM_IIJ && r.day === 1);
  if (sampleIij) {
    console.log(
      `核對 ${TELECOM_IIJ} 1天 每日3GB: HKD ${sampleIij.price_hkd} → cost NT$${sampleIij.cost_twd} → 售價 NT$${sampleIij.retail_twd}（利潤 ${sampleIij.profit_percent}%）`,
    );
  }
  const sampleSb = rows.find((r) => r.telecom === TELECOM_SB && r.day === 1);
  if (sampleSb) {
    console.log(
      `核對 ${TELECOM_SB} 1天 ${sampleSb.data_amount}: HKD ${sampleSb.price_hkd} → cost NT$${sampleSb.cost_twd} → 售價 NT$${sampleSb.retail_twd}（利潤 ${sampleSb.profit_percent}%）`,
    );
  }

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(PRODUCT_HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];
  if (!product) throw new Error(`找不到商品 handle=${PRODUCT_HANDLE}`);

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = [...new Set(rows.map((r) => r.data_amount))];
  const telecomValues = [TELECOM_SB, TELECOM_IIJ].filter((t) =>
    rows.some((r) => r.telecom === t),
  );

  const meta = {
    ...(product.metadata || {}),
    type: "esim",
    country: "JP",
    is_native: true,
    plan_kind: "daily",
    hot_sale_telecoms: [TELECOM_SB],
    carrier_profit_by_carrier: {
      [TELECOM_SB]: PROFIT_SB,
      [TELECOM_IIJ]: PROFIT_IIJ,
    },
    subtitle_by_carrier: {
      [TELECOM_SB]: "原生eSIM｜SoftBank／KDDI｜日本 IP",
      [TELECOM_IIJ]:
        "原生eSIM｜IIJ Docomo（DOCOMO 網路）｜日本 IP｜需手動 APN vmobile.jp｜每日3GB",
    },
    key_features_by_carrier: japanDailyKeyFeaturesByCarrier(),
  };

  console.log(
    `📦 方案 ${rows.length}（${TELECOM_SB} ${nSb} @${PROFIT_SB}% + ${TELECOM_IIJ} LocalIIJ-Daily3GB ${nIij} @${PROFIT_IIJ}%）`,
  );
  console.log(`天數: ${dayValues.join(" | ")}`);
  console.log(`數據: ${dataValues.join(" | ")}`);

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      title: product.title || "日本每日型eSIM",
      subtitle:
        "SoftBank／KDDI HOT SALE｜IIJ Docomo 每日3GB（利潤95%）｜日本原生 IP",
      description:
        "日本每日型 eSIM。SoftBank／KDDI 與 IIJ Docomo（LocalIIJ 每日3GB、DOCOMO 網路、APN vmobile.jp，需手動設定）兩種電信。IIJ Docomo 利潤 95%。",
      status: "published",
      metadata: meta,
      options: [
        { title: "使用天數", values: dayValues },
        { title: "電信商", values: telecomValues },
        { title: "數據量", values: dataValues },
      ],
      sales_channels: [{ id: SALES_CHANNEL_ID }],
    }),
  });

  const variants = rows.map(toVariant);

  if (!REBUILD) {
    console.log("（未加 --rebuild，僅更新商品資訊；變體不變）");
    console.log(
      "重建變體請加：HKD_TO_TWD=4.5 node scripts/create-japan-daily-product.mjs --rebuild",
    );
    return;
  }

  // 分頁刪舊變體
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

  const check = await admin(
    token,
    `/admin/products/${product.id}/variants?limit=5&fields=id,sku,title`,
  );
  console.log("\n======= 完成 =======");
  console.log(`前台: /product/japan/${PRODUCT_HANDLE}`);
  console.log(`變體已重建，抽樣:`, (check.variants || []).map((v) => v.sku));
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
