/**
 * 建立「泰國 eSIM 吃到飽」原生卡 — 兩個電信變體
 *   1) Truemove H 當地號碼 ← Unlimited High Speed（目前 8／15 天）
 *      真．不限速｜利潤 80%｜給夥伴 30%｜95 折
 *   2) TRRE 電信 ← unlimited 10mbps（1／3／4／5／6／7／10／15／20／30 天等）
 *      FUP 10Mbps 無限流量｜利潤 110%｜給夥伴 50%｜9 折
 *
 * 用法：
 *   HKD_TO_TWD=4.5 node scripts/create-thailand-unlimited-product.mjs
 *   HKD_TO_TWD=4.5 node scripts/create-thailand-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  truemoveHKeyFeatures,
  trueDtacKeyFeatures,
} from "../content/product-detailed/thailand-key-features.js";

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

const HANDLE = "thailand-unlimited-esim";
const DATA_AMOUNT = "無限流量";
const TELECOM_TRUEMOVE = "Truemove H 當地號碼";
const TELECOM_TRRE = "TRRE 電信";
const FUP_TRRE =
  "公平使用政策 (FUP): 10 Mbps的無限流量，實際速度可能有所變動。";
const FUP_TRUEMOVE =
  "公平使用政策 (FUP): 無限高速數據，實際速度取決於您的位置及網路環境。";
const SPEED_TRUEMOVE = "真．不限速（Unlimited High Speed）";
const ACTIVATION_TRUEMOVE =
  "⚠️ 注意: eSIM新增後即開始計算使用有效期，我們建議您需要時再安裝。 查看啟用政策。\n我們建議您在抵達泰國後安裝此 eSIM。⚠️ 自泰國當地時間 2026 年 5 月 22 日起，撥出電話與發送 SMS 需完成護照實名登記。請前往 True 門店完成登記，以恢復通話功能。";

/** 官網售價利潤％ */
const PROFIT_BY_TELECOM = {
  [TELECOM_TRUEMOVE]: 80,
  [TELECOM_TRRE]: 110,
};

/**
 * 專屬折扣碼連結建議條件（寫入 metadata，供後台／夥伴對齊；
 * 實際 referral 折扣仍以 partners 表為準）
 */
const PARTNER_RATE_BY_TELECOM = {
  [TELECOM_TRUEMOVE]: 30,
  [TELECOM_TRRE]: 50,
};
const REFERRAL_DISCOUNT_BY_TELECOM = {
  [TELECOM_TRUEMOVE]: 5, // 95 折
  [TELECOM_TRRE]: 10, // 9 折
};

const SKU_SUFFIX = {
  [TELECOM_TRUEMOVE]: "TMH",
  [TELECOM_TRRE]: "TRRE",
};

const HKD_TO_TWD_ENV = process.env.HKD_TO_TWD
  ? Number(process.env.HKD_TO_TWD)
  : null;
const HKD_TO_TWD_FALLBACK = 4.5;
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CATEGORY_IDS = ["pcat_01KZJNBXJX5EFQD5H7YSEXRWK1"]; // tailand
const THUMB =
  process.env.THAILAND_PRODUCT_THUMB ||
  "https://www.jeko-esim.com.tw/images/tailand-esim-banner.jpg";

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
  if (telecom === TELECOM_TRUEMOVE) return 0;
  if (telecom === TELECOM_TRRE) return 1;
  return 9;
}

function expandTelecomPlans(list, telecom, hkdToTwd) {
  const profit = PROFIT_BY_TELECOM[telecom];
  const suffix = SKU_SUFFIX[telecom];
  const isTrre = telecom === TELECOM_TRRE;
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
      speed_rule: isTrre ? FUP_TRRE : p.speed_rule || SPEED_TRUEMOVE,
    };
  });
}

function loadPlans(hkdToTwd) {
  const file = path.join(__dirname, "data", "thailand-unlimited-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));

  // 新格式：truemove_high_speed + trre_10mbps
  // 相容舊格式：plans（兩電信共用同一清單，不建議）
  let rows;
  if (raw.truemove_high_speed || raw.trre_10mbps) {
    rows = [
      ...expandTelecomPlans(
        raw.truemove_high_speed,
        TELECOM_TRUEMOVE,
        hkdToTwd,
      ),
      ...expandTelecomPlans(raw.trre_10mbps, TELECOM_TRRE, hkdToTwd),
    ];
  } else {
    const base = raw.plans || [];
    rows = [
      ...expandTelecomPlans(base, TELECOM_TRUEMOVE, hkdToTwd),
      ...expandTelecomPlans(base, TELECOM_TRRE, hkdToTwd),
    ];
  }

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
  const profit = row.profit_percent;
  const isTrre = row.telecom === TELECOM_TRRE;
  const speedRule = isTrre
    ? FUP_TRRE
    : row.speed_rule || SPEED_TRUEMOVE;

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
      profit_percent: profit,
      profit_margin: `${profit}%`,
      profit_rate: `${profit}%`,
      margin: 1 + profit / 100,
      partner_rate_percent: row.partner_rate_percent,
      referral_discount_percent: row.referral_discount_percent,
      supplier_sku: row.supplier_sku,
      apn: row.apn || "internet",
      networks: row.networks || "",
      rule_desc: isTrre ? "unlimited 10mbps (FUP)" : row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      ip: row.ip || "TH",
      attributes: {
        days: row.day,
        data: DATA_AMOUNT,
        data_amount: DATA_AMOUNT,
        telecom: row.telecom,
        network: isTrre ? "TRUE / TRRE 4G/5G" : "TRUE / Truemove H 4G/5G",
        ip_type: "泰國 IP",
        route_type: "原生eSIM",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        speed_rule: speedRule,
        network_speed: isTrre ? "5G/4G · FUP 10Mbps" : "5G 極速",
        fup: isTrre ? FUP_TRRE : "",
      },
    },
  };
}

async function main() {
  const { rate: hkdToTwd, source: fxSource } = await resolveHkdToTwd();
  console.log(`💱 匯率 1 HKD ≈ ${hkdToTwd.toFixed(4)} TWD（${fxSource}）`);

  const rows = loadPlans(hkdToTwd);
  if (!rows.length) throw new Error("thailand-unlimited-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [TELECOM_TRUEMOVE, TELECOM_TRRE];

  for (const telecom of telecomValues) {
    const sample =
      rows.find((r) => r.telecom === telecom && r.day === 8) ||
      rows.find((r) => r.telecom === telecom && r.day === 1) ||
      rows.find((r) => r.telecom === telecom);
    if (sample) {
      console.log(
        `核對 ${telecom} ${sample.day}天: HKD ${sample.price_hkd} → cost NT$${sample.cost_twd} → 售價 NT$${sample.retail_twd}（利潤 ${sample.profit_percent}%｜夥伴 ${sample.partner_rate_percent}%｜折扣 ${sample.referral_discount_percent}%） (${sample.sku})`,
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
    country: "TH",
    is_native: true,
    native_esim: true,
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM_TRUEMOVE],
    carrier_profit_by_carrier: {
      [TELECOM_TRUEMOVE]: PROFIT_BY_TELECOM[TELECOM_TRUEMOVE],
      [TELECOM_TRRE]: PROFIT_BY_TELECOM[TELECOM_TRRE],
    },
    carrier_partner_rate_by_carrier: {
      [TELECOM_TRUEMOVE]: PARTNER_RATE_BY_TELECOM[TELECOM_TRUEMOVE],
      [TELECOM_TRRE]: PARTNER_RATE_BY_TELECOM[TELECOM_TRRE],
    },
    carrier_referral_discount_by_carrier: {
      [TELECOM_TRUEMOVE]: REFERRAL_DISCOUNT_BY_TELECOM[TELECOM_TRUEMOVE],
      [TELECOM_TRRE]: REFERRAL_DISCOUNT_BY_TELECOM[TELECOM_TRRE],
    },
    seo_title:
      "泰國 eSIM 吃到飽 原生卡｜Truemove H 當地號碼 / TRRE 電信｜泰國當地 IP｜Jeko eSIM",
    seo_description:
      "泰國原生 eSIM 吃到飽：Truemove H 當地號碼（真．不限速）、TRRE 電信（FUP 10Mbps）兩種電信變體，泰國當地 IP、支援熱點，依天數選購。Jeko eSIM 免換卡、QR Code 即開即用。",
    seo_keywords:
      "泰國eSIM,泰國吃到飽,原生eSIM,泰國IP,Truemove H,TRRE電信,TRUE,當地號碼,無限流量,10Mbps,旅遊eSIM,出國上網,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_TRUEMOVE]:
        "原生eSIM｜Truemove H 當地號碼｜泰國當地 IP｜真．不限速吃到飽",
      [TELECOM_TRRE]:
        "原生eSIM｜TRRE 電信｜泰國當地 IP｜FUP 10Mbps 無限流量",
    },
    carrier_specs_by_carrier: {
      [TELECOM_TRUEMOVE]: {
        ip_type: "泰國 IP",
        route_type: "原生eSIM",
        network: "TRUE / Truemove H 4G/5G",
        speed_rule: SPEED_TRUEMOVE,
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "internet",
      },
      [TELECOM_TRRE]: {
        ip_type: "泰國 IP",
        route_type: "原生eSIM",
        network: "TRUE / TRRE 4G/5G",
        speed_rule: FUP_TRRE,
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "internet",
      },
    },
    key_features_by_carrier: {
      [TELECOM_TRUEMOVE]: truemoveHKeyFeatures(),
      [TELECOM_TRRE]: trueDtacKeyFeatures(),
    },
    overview_notices_by_carrier: {
      [TELECOM_TRUEMOVE]: {
        fup_notice: FUP_TRUEMOVE,
        activation_notice: ACTIVATION_TRUEMOVE,
      },
      [TELECOM_TRRE]: {
        fup_notice: FUP_TRRE,
        activation_notice: "建議抵達泰國後再安裝／啟用 eSIM",
      },
    },
  };

  const payloadBase = {
    title: "泰國 eSIM 吃到飽  原生卡 原生eSIM 泰國當地IP",
    subtitle:
      "Truemove H 當地號碼 真．不限速／TRRE 電信 FUP 10Mbps｜泰國當地 IP｜原生eSIM",
    handle: HANDLE,
    description:
      "泰國 eSIM 吃到飽原生卡，提供 Truemove H 當地號碼（真．不限速）與 TRRE 電信（公平使用政策 FUP：10 Mbps 無限流量，實際速度可能有所變動）兩個電信變體。走 TRUE 當地網路、泰國當地 IP，支援熱點與主流 App，依天數選購，抵達後安裝即可使用。",
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
  const nTmh = rows.filter((r) => r.telecom === TELECOM_TRUEMOVE).length;
  const nTrre = rows.filter((r) => r.telecom === TELECOM_TRRE).length;
  console.log(
    `📦 方案 ${rows.length} 筆（${TELECOM_TRUEMOVE} ${nTmh} + ${TELECOM_TRRE} ${nTrre}）・利潤 80%／110%`,
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
      console.log(
        "若要重建變體請加：HKD_TO_TWD=4.5 node scripts/create-thailand-unlimited-product.mjs --rebuild",
      );
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants`,
  );
  const vs = check.product?.variants || [];
  console.log("\n======= 完成 =======");
  console.log(`前台: /product/tailand/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    `範例: ${TELECOM_TRUEMOVE} 8天 →`,
    rows.find((r) => r.telecom === TELECOM_TRUEMOVE && r.day === 8),
  );
  console.log(
    `範例: ${TELECOM_TRRE} 15天 →`,
    rows.find((r) => r.telecom === TELECOM_TRRE && r.day === 15),
  );
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
