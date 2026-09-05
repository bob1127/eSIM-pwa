/**
 * 建立「中港澳 eSIM 吃到飽」— 兩個電信／天數變體（皆 T+C）
 *   1) 短天數｜…（選項名保留舊字串以相容 URL）
 *      CN,HK,MO(T+C)-unlimited-1～10-A0｜SG IP｜FUP 10Mbps｜利潤 65%
 *   2) 長天數｜中國電信／聯通／CSL／澳門電訊
 *      CN,HK,MO(T+C)-unlimited-≥11-A0｜SG IP｜FUP 10Mbps｜利潤 65%
 *
 * 免 VPN：出網新加坡 IP（非中國大陸 IP），一般可使用 LINE／IG／FB。
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-cnhkmo-unlimited-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-cnhkmo-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CNHKMO_TELECOM_SHORT,
  CNHKMO_TELECOM_LONG,
  cnhkmoShortCtKeyFeatures,
  cnhkmoLongTcKeyFeatures,
} from "../content/product-detailed/cnhkmo-unlimited-key-features.js";

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

const HANDLE = "cnhkmo-unlimited-esim";
const DATA_AMOUNT = "無限流量";
const TELECOM_SHORT = CNHKMO_TELECOM_SHORT;
const TELECOM_LONG = CNHKMO_TELECOM_LONG;

const FUP_10 =
  "公平使用政策 (FUP)：約 10 Mbps 的無限流量，實際速度可能有所變動。";
const FUP_SHORT = FUP_10;
const FUP_LONG = FUP_10;

const VPN_NOTICE =
  "出網為新加坡 IP（非中國大陸 IP），一般可免 VPN 使用 LINE、Instagram、Facebook。實際可用性依當下路由而定。";

const NETWORK_TC = "中國電信／中國聯通／香港 CSL／澳門電訊 CTM";
const APPS_TC = "免VPN：LINE／IG／FB；ChatGPT、TikTok、Gemini、熱點";

/** 官網售價利潤％ */
const PROFIT_BY_TELECOM = {
  [TELECOM_SHORT]: 65,
  [TELECOM_LONG]: 65,
};

const PARTNER_RATE_BY_TELECOM = {
  [TELECOM_SHORT]: 30,
  [TELECOM_LONG]: 30,
};
const REFERRAL_DISCOUNT_BY_TELECOM = {
  [TELECOM_SHORT]: 5,
  [TELECOM_LONG]: 5,
};

const SKU_SUFFIX = {
  [TELECOM_SHORT]: "TC",
  [TELECOM_LONG]: "TC",
};

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CATEGORY_IDS = ["pcat_01KZJNBW76333EH5XBG62QJEHW"]; // kongkong 中港澳
const THUMB =
  process.env.CNHKMO_UNLIMITED_THUMB ||
  process.env.CNHKMO_PRODUCT_THUMB ||
  "https://www.jeko-esim.com.tw/images/sim/%E7%94%A2%E5%93%81/esim-%E4%B8%AD%E6%B8%AF%E6%BE%B3.png";

function retailFromCost(costTwd, profitPercent) {
  const margin = 1 + profitPercent / 100;
  return Math.ceil((costTwd * margin) / 10) * 10 - 1;
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

function telecomRank(telecom) {
  if (telecom === TELECOM_SHORT) return 0;
  if (telecom === TELECOM_LONG) return 1;
  return 9;
}

function expandTelecomPlans(list, telecom, hkdToTwd) {
  const profit = PROFIT_BY_TELECOM[telecom];
  const suffix = SKU_SUFFIX[telecom];
  return (list || []).map((p) => {
    const hkd = Number(p.price_hkd) || 0;
    const cost = Math.ceil(hkd * hkdToTwd);
    return {
      ...p,
      supplier_sku: p.sku,
      sku: `${p.sku}-${suffix}`,
      price_hkd: hkd,
      cost_twd: cost,
      retail_twd: retailFromCost(cost, profit),
      profit_percent: profit,
      partner_rate_percent: PARTNER_RATE_BY_TELECOM[telecom],
      referral_discount_percent: REFERRAL_DISCOUNT_BY_TELECOM[telecom],
      telecom,
      daysLabel: `${p.day}天`,
      speed_rule: p.speed_rule || FUP_10,
      apn: p.apn || "e-ideas",
      ip: p.ip || "SG",
    };
  });
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "cnhkmo-unlimited-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const tc = raw.long_tc || [];
  // 短／長皆走 T+C：1–10 天短天數；≥11 天長天數（利潤皆 65%）
  const shortTc = tc.filter((p) => Number(p.day) >= 1 && Number(p.day) <= 10);
  const longTc = tc.filter((p) => Number(p.day) >= 11);
  const rows = [
    ...expandTelecomPlans(shortTc, TELECOM_SHORT, hkdToTwd),
    ...expandTelecomPlans(longTc, TELECOM_LONG, hkdToTwd),
  ];
  return rows.sort(
    (a, b) =>
      telecomRank(a.telecom) - telecomRank(b.telecom) ||
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
  const speedRule = row.speed_rule || FUP_10;

  return {
    title: `${row.telecom} · ${row.daysLabel} · ${DATA_AMOUNT}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: row.telecom,
      數據量: DATA_AMOUNT,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: row.telecom,
      data: DATA_AMOUNT,
      data_amount: DATA_AMOUNT,
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
      ip: row.ip || "SG",
      vpn_free: true,
      vpn_free_note: VPN_NOTICE,
      attributes: {
        days: row.day,
        data: DATA_AMOUNT,
        data_amount: DATA_AMOUNT,
        telecom: row.telecom,
        network: NETWORK_TC,
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
        network_speed: "4G/5G · FUP 10Mbps",
        fup: speedRule,
        apps: APPS_TC,
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("cnhkmo-unlimited-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [TELECOM_SHORT, TELECOM_LONG];

  for (const telecom of telecomValues) {
    const sample =
      rows.find((r) => r.telecom === telecom && r.day === 1) ||
      rows.find((r) => r.telecom === telecom);
    if (sample) {
      console.log(
        `核對 ${telecom} ${sample.day}天: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（利潤 ${sample.profit_percent}%） (${sample.sku})`,
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
    plan_kind: "unlimited",
    vpn_free: true,
    vpn_free_apps: ["LINE", "Instagram", "Facebook"],
    vpn_free_note: VPN_NOTICE,
    hot_sale_telecoms: [TELECOM_SHORT],
    carrier_profit_by_carrier: {
      [TELECOM_SHORT]: PROFIT_BY_TELECOM[TELECOM_SHORT],
      [TELECOM_LONG]: PROFIT_BY_TELECOM[TELECOM_LONG],
    },
    carrier_partner_rate_by_carrier: {
      [TELECOM_SHORT]: PARTNER_RATE_BY_TELECOM[TELECOM_SHORT],
      [TELECOM_LONG]: PARTNER_RATE_BY_TELECOM[TELECOM_LONG],
    },
    carrier_referral_discount_by_carrier: {
      [TELECOM_SHORT]: REFERRAL_DISCOUNT_BY_TELECOM[TELECOM_SHORT],
      [TELECOM_LONG]: REFERRAL_DISCOUNT_BY_TELECOM[TELECOM_LONG],
    },
    seo_title:
      "中港澳 eSIM 吃到飽｜免 VPN 用 LINE／IG／FB｜T+C 約 10Mbps｜Jeko eSIM",
    seo_description:
      "中國、香港、澳門一卡吃到飽。短／長天數皆走電信／聯通／CSL／澳門電訊（新加坡 IP・約 10Mbps），一般可免 VPN 使用 LINE、Instagram、Facebook。",
    seo_keywords:
      "中港澳eSIM,中國香港澳門,吃到飽,免VPN,LINE,Instagram,Facebook,中國電信,聯通,CSL,澳門電訊,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_SHORT]:
        "漫遊eSIM｜新加坡 IP｜約 10Mbps｜免 VPN｜T+C（電信／聯通／CSL／CTM）｜1～10 天",
      [TELECOM_LONG]:
        "漫遊eSIM｜新加坡 IP｜約 10Mbps｜免 VPN｜T+C（電信／聯通／CSL／CTM）｜11 天起",
    },
    carrier_specs_by_carrier: {
      [TELECOM_SHORT]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊eSIM",
        network: NETWORK_TC,
        speed_rule: FUP_10,
        apps: APPS_TC,
        apn: "e-ideas",
        vpn_free: true,
      },
      [TELECOM_LONG]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊eSIM",
        network: NETWORK_TC,
        speed_rule: FUP_10,
        apps: APPS_TC,
        apn: "e-ideas",
        vpn_free: true,
      },
    },
    key_features_by_carrier: {
      [TELECOM_SHORT]: cnhkmoShortCtKeyFeatures(),
      [TELECOM_LONG]: cnhkmoLongTcKeyFeatures(),
    },
    overview_notices_by_carrier: {
      [TELECOM_SHORT]: {
        fup_notice: FUP_10,
        activation_notice: "建議抵達目的地、於覆蓋範圍內再安裝／啟用 eSIM。",
        vpn_notice: VPN_NOTICE,
      },
      [TELECOM_LONG]: {
        fup_notice: FUP_10,
        activation_notice: "建議抵達目的地、於覆蓋範圍內再安裝／啟用 eSIM。",
        vpn_notice: VPN_NOTICE,
      },
    },
  };

  const payloadBase = {
    title: "中港澳 eSIM 吃到飽｜免 VPN 用 LINE／IG／FB",
    subtitle:
      "短／長天數皆 T+C（電信／聯通／CSL／澳門電訊）｜新加坡 IP｜約 10Mbps｜一卡三地無限流量",
    handle: HANDLE,
    description:
      "中國大陸、香港、澳門一卡吃到飽不限流量。短天數（1～10 天）與長天數（11 天起）皆走 CN,HK,MO(T+C) 線路：中國電信／聯通／CSL／澳門電訊、新加坡 IP、約 10Mbps FUP，利潤 65%。一般可免 VPN 使用 LINE、Instagram、Facebook，並支援 ChatGPT／TikTok／Gemini 與熱點（實際依當下路由）。抵達後安裝即可使用。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: [DATA_AMOUNT] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: CATEGORY_IDS.map((id) => ({ id })),
  };

  const variants = rows.map(toVariant);
  const nShort = rows.filter((r) => r.telecom === TELECOM_SHORT).length;
  const nLong = rows.filter((r) => r.telecom === TELECOM_LONG).length;
  console.log(
    `📦 方案 ${rows.length} 筆（短 ${nShort} + 長 ${nLong}）・利潤 65%／65%`,
  );
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
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants`,
  );
  const vs = check.product?.variants || [];
  console.log("\n======= 完成 =======");
  console.log(`前台: /product/kongkong/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    `範例短 1天 →`,
    rows.find((r) => r.telecom === TELECOM_SHORT && r.day === 1),
  );
  console.log(
    `範例長 11天 →`,
    rows.find((r) => r.telecom === TELECOM_LONG && r.day === 11),
  );
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
