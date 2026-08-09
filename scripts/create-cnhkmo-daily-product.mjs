/**
 * 建立「中港澳 eSIM 每日型」— 單一電信變體
 *   中國電信／聯通／CSL／澳門電訊 ← CN,HK,MO(T+C)-Daily*
 *   一般每日型（降速約 128kbps）→ 利潤 120%
 *   每日 1GB（5Mbps 續航）→ 利潤 95%
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-cnhkmo-daily-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-cnhkmo-daily-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CNHKMO_DAILY_TELECOM,
  cnhkmoDailyTcKeyFeatures,
} from "../content/product-detailed/cnhkmo-daily-key-features.js";

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

const HANDLE = "cnhkmo-daily-esim";
const TELECOM = CNHKMO_DAILY_TELECOM;
const PROFIT_DEFAULT = 120;
const PROFIT_5MBPS = 95;

const DATA_ORDER = [
  "每日 500MB",
  "每日 1GB",
  "每日 1GB（5Mbps續航）",
  "每日 2GB",
  "每日 3GB",
];

const FUP_128 =
  "公平使用政策 (FUP)：每日高速額度用完後降速至約 128 kbps，實際速度可能有所變動。";
const FUP_5 =
  "公平使用政策 (FUP)：每日高速額度用完後維持約 5 Mbps 續航，實際速度可能有所變動。";

const VPN_NOTICE =
  "出網為新加坡 IP（非中國大陸 IP），一般可免 VPN 使用 LINE、Instagram、Facebook。實際可用性依當下路由而定。";

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CATEGORY_IDS = ["pcat_01KZJNBW76333EH5XBG62QJEHW"]; // kongkong 中港澳
const THUMB =
  process.env.CNHKMO_DAILY_THUMB ||
  process.env.CNHKMO_UNLIMITED_THUMB ||
  "https://www.jeko-esim.com.tw/images/%E5%88%86%E9%A1%9EeSIM-%E4%B8%AD%E6%B8%AF%E6%BE%B3.png";

function retailFromCost(costTwd, profitPercent) {
  return Math.ceil((costTwd * (1 + profitPercent / 100)) / 10) * 10 - 1;
}

function dataRank(label) {
  const i = DATA_ORDER.indexOf(String(label || ""));
  return i >= 0 ? i : 99;
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

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "cnhkmo-daily-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  for (const p of raw.plans || []) {
    const is5 = Boolean(p.is_5mbps) || /5mbps/i.test(p.sku || "");
    const profit = is5 ? PROFIT_5MBPS : PROFIT_DEFAULT;
    const hkd = Number(p.price_hkd) || 0;
    const cost = Math.ceil(hkd * hkdToTwd);
    rows.push({
      ...p,
      supplier_sku: p.sku,
      sku: `${p.sku}-TC`,
      price_hkd: hkd,
      cost_twd: cost,
      retail_twd: retailFromCost(cost, profit),
      profit_percent: profit,
      partner_rate_percent: 30,
      referral_discount_percent: 5,
      telecom: TELECOM,
      daysLabel: `${p.day}天`,
      is_5mbps: is5,
      speed_rule: is5 ? FUP_5 : p.speed_rule || FUP_128,
    });
  }
  return rows.sort(
    (a, b) =>
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
  const is5 = row.is_5mbps;
  const speedRule = is5 ? FUP_5 : FUP_128;
  return {
    title: `${TELECOM} · ${row.daysLabel} · ${row.data_amount}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: TELECOM,
      數據量: row.data_amount,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: TELECOM,
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
      partner_rate_percent: row.partner_rate_percent,
      referral_discount_percent: row.referral_discount_percent,
      supplier_sku: row.supplier_sku,
      apn: row.apn || "e-ideas",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      throttle_kind: is5 ? "5mbps" : "128kbps",
      ip: row.ip || "SG",
      vpn_free: true,
      vpn_free_note: VPN_NOTICE,
      attributes: {
        days: row.day,
        data: row.data_amount,
        data_amount: row.data_amount,
        telecom: TELECOM,
        network: "中國電信／中國聯通／香港 CSL／澳門電訊 CTM",
        ip_type: "新加坡 IP",
        route_type: "漫遊eSIM",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        line: true,
        instagram: true,
        facebook: true,
        vpn_free: true,
        speed_rule: speedRule,
        network_speed: is5
          ? "4G/5G · 每日高速後約 5Mbps"
          : "4G/5G · 每日高速後約 128kbps",
        fup: speedRule,
        apps: "免VPN：LINE／IG／FB；ChatGPT、TikTok、Gemini、熱點",
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("cnhkmo-daily-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) =>
    rows.some((r) => r.data_amount === d),
  );

  for (const label of [
    "每日 500MB",
    "每日 1GB",
    "每日 1GB（5Mbps續航）",
  ]) {
    const sample = rows.find((r) => r.day === 1 && r.data_amount === label);
    if (sample) {
      console.log(
        `核對 ${label} 1天: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（利潤 ${sample.profit_percent}%）`,
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
    country: "CN,HK,MO",
    coverage: ["CN", "HK", "MO"],
    is_native: false,
    plan_kind: "daily",
    vpn_free: true,
    vpn_free_apps: ["LINE", "Instagram", "Facebook"],
    vpn_free_note: VPN_NOTICE,
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: {
      [TELECOM]: PROFIT_DEFAULT,
    },
    carrier_profit_note:
      "一般每日型（128kbps 降速）利潤 120%；每日 1GB（5Mbps 續航）利潤 95%",
    seo_title:
      "中港澳 eSIM 每日型｜免 VPN 用 LINE／IG／FB｜中國電信／聯通／CSL｜Jeko eSIM",
    seo_description:
      "中國、香港、澳門每日型 eSIM。新加坡 IP，一般可免 VPN 使用 LINE、Instagram、Facebook；支援 ChatGPT、TikTok、Gemini。每日 500MB～3GB，另有 5Mbps 續航選項。",
    seo_keywords:
      "中港澳eSIM,每日型,中國香港澳門,免VPN,LINE,Instagram,Facebook,中國電信,聯通,CSL,澳門電訊,5Mbps,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]:
        "漫遊eSIM｜新加坡 IP｜免 VPN（LINE／IG／FB）｜每日高速＋續航選項",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊eSIM",
        network: "中國電信／中國聯通／香港 CSL／澳門電訊 CTM",
        speed_rule: FUP_128,
        apps: "免VPN：LINE／IG／FB；ChatGPT、TikTok、Gemini、熱點",
        apn: "e-ideas",
        vpn_free: true,
      },
    },
    key_features_by_carrier: {
      [TELECOM]: cnhkmoDailyTcKeyFeatures(),
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice: FUP_128,
        activation_notice: "建議抵達目的地、於覆蓋範圍內再安裝／啟用 eSIM。",
        vpn_notice: VPN_NOTICE,
      },
    },
  };

  const payloadBase = {
    title: "中港澳 eSIM 每日型｜免 VPN 用 LINE／IG／FB",
    subtitle:
      "中國電信／聯通／CSL／澳門電訊｜新加坡 IP｜每日高速額度｜一卡三地",
    handle: HANDLE,
    description:
      "中國大陸、香港、澳門每日型 eSIM。單一電信變體：中國電信／聯通／CSL／澳門電訊（新加坡 IP）。可選每日 500MB、1GB、2GB、3GB（高速用完後約 128 kbps，利潤 120%），以及每日 1GB（約 5Mbps 續航，利潤 95%）。一般可免 VPN 使用 LINE、Instagram、Facebook，並支援 ChatGPT、TikTok、Gemini 與熱點。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: dataValues },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: CATEGORY_IDS.map((id) => ({ id })),
  };

  const variants = rows.map(toVariant);
  const n5 = rows.filter((r) => r.is_5mbps).length;
  console.log(
    `📦 方案 ${rows.length} 筆（一般 ${rows.length - n5} @120% + 5Mbps ${n5} @95%）`,
  );
  console.log(`數據量: ${dataValues.join(" | ")}`);
  console.log(`天數: ${dayValues.join(" | ")}`);

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
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants`,
  );
  console.log("\n======= 完成 =======");
  console.log(`前台: /product/kongkong/${HANDLE}`);
  console.log(`變體數: ${(check.product?.variants || []).length}`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
