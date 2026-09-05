/**
 * japan-student-longterm-esim：
 *  - HOT SALE → 僅原生 IP（IIJ Docomo）
 *  - carrier_specs 標明各國 IP
 *  - 產品介紹／使用介紹／FAQ／重點特色
 *
 *   node scripts/patch-japan-student-longterm-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  JP_DAILY_SOFTBANK_KDDI_DETAILED,
  JP_DAILY_SOFTBANK_ONLY_DETAILED,
  JP_DAILY_TRIPLE_DETAILED,
  JP_DAILY_IIJ_DETAILED,
  JP_UNLIMITED_SOFTBANK_KDDI_10MBPS_DETAILED,
  JP_UNLIMITED_IIJ_DETAILED,
  JP_TOTAL_KDDI_SOFTBANK_DETAILED,
  JP_TOTAL_IIJ_DETAILED,
  JP_USAGE_SOFTBANK_KDDI,
  JP_USAGE_SOFTBANK_ONLY,
  JP_USAGE_TRIPLE,
  JP_USAGE_IIJ,
  JP_FAQ_SOFTBANK_KDDI,
  JP_FAQ_SOFTBANK_ONLY,
  JP_FAQ_TRIPLE,
  JP_FAQ_IIJ,
} from "../content/product-detailed/japan-tab-content.js";
import {
  japanDailyKeyFeaturesByCarrier,
  softbankKddiDailyKeyFeatures,
} from "../content/product-detailed/japan-daily-key-features.js";
import {
  softbankKddi10MbpsKeyFeatures,
  iijDocomoUnlimitedKeyFeatures,
} from "../content/product-detailed/japan-unlimited-key-features.js";

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
const SECRET = process.env.PRODUCT_CONTENT_ADMIN_SECRET || "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "japan-student-longterm-esim";

const HOT_SALE = ["吃到飽 不限流量 (IIJ Docomo)"];

const dailyKf = japanDailyKeyFeaturesByCarrier();

/** @type {Array<{label:string, detailed:string, usage:string, faq:string, features:object, specs:object}>} */
const CARRIERS = [
  {
    label: "吃到飽 不限流量 (SoftBank / KDDI 10Mbps)",
    detailed: JP_UNLIMITED_SOFTBANK_KDDI_10MBPS_DETAILED,
    usage: JP_USAGE_SOFTBANK_KDDI,
    faq: JP_FAQ_SOFTBANK_KDDI,
    features: softbankKddi10MbpsKeyFeatures(),
    specs: {
      ip_type: "新加坡 IP",
      route_type: "漫遊",
      network: "KDDI / SoftBank 4G/5G 雙電信",
      speed_rule: "每日 1GB 高速後約 10Mbps 吃到飽",
      apps: "熱點分享、ChatGPT、TikTok、Gemini",
      apn: "e-ideas",
    },
  },
  {
    label: "吃到飽 不限流量 (IIJ Docomo)",
    detailed: JP_UNLIMITED_IIJ_DETAILED,
    usage: JP_USAGE_IIJ,
    faq: JP_FAQ_IIJ,
    features: iijDocomoUnlimitedKeyFeatures(),
    specs: {
      ip_type: "日本 IP",
      route_type: "原生 eSIM",
      network: "IIJ Docomo 4G/LTE",
      speed_rule: "吃到飽（實際速度依環境而定）",
      apps: "熱點分享、ChatGPT、TikTok、Gemini",
      apn: "vmobile.jp（需手動）",
    },
  },
  {
    label: "每日型 (SoftBank / KDDI)",
    detailed: JP_DAILY_SOFTBANK_KDDI_DETAILED,
    usage: JP_USAGE_SOFTBANK_KDDI,
    faq: JP_FAQ_SOFTBANK_KDDI,
    features: dailyKf["SoftBank / KDDI"],
    specs: {
      ip_type: "新加坡 IP",
      route_type: "漫遊",
      network: "KDDI / SoftBank 4G/5G 雙電信",
      speed_rule: "每日高速額度用完後約 128 kbps（隔日重置）",
      apps: "熱點分享、ChatGPT、TikTok、Gemini",
      apn: "e-ideas",
    },
  },
  {
    label: "每日型 (SoftBank（注意：Android 通常需手動 APN）)",
    detailed: JP_DAILY_SOFTBANK_ONLY_DETAILED,
    usage: JP_USAGE_SOFTBANK_ONLY,
    faq: JP_FAQ_SOFTBANK_ONLY,
    features: dailyKf["SoftBank（注意：Android 通常需手動 APN）"],
    specs: {
      ip_type: "日本 IP",
      route_type: "漫遊",
      network: "SoftBank 4G/5G",
      speed_rule: "每日高速額度用完後降速（隔日重置）",
      apps: "熱點分享、ChatGPT、TikTok、Gemini",
      apn: "plus.4g（Android 多半需手動）",
    },
  },
  {
    label: "每日型 (IIJ Docomo（注意：需手動設定 APN）)",
    detailed: JP_DAILY_IIJ_DETAILED,
    usage: JP_USAGE_IIJ,
    faq: JP_FAQ_IIJ,
    features: dailyKf["IIJ Docomo（注意：需手動設定 APN）"],
    specs: {
      ip_type: "日本 IP",
      route_type: "原生 eSIM",
      network: "IIJ Docomo 4G/LTE",
      speed_rule: "每日高速額度用完後約 200～256 kbps（隔日重置）",
      apps: "熱點分享",
      apn: "vmobile.jp（需手動）",
    },
  },
  {
    label: "每日型 (KDDI / SoftBank / Docomo +)",
    detailed: JP_DAILY_TRIPLE_DETAILED,
    usage: JP_USAGE_TRIPLE,
    faq: JP_FAQ_TRIPLE,
    features: dailyKf["KDDI / SoftBank / Docomo +"],
    specs: {
      ip_type: "香港 IP",
      route_type: "漫遊",
      network: "KDDI / SoftBank / Docomo 三網切換",
      speed_rule: "每日高速額度用完後約 128 kbps（隔日重置）",
      apps: "熱點分享、ChatGPT、TikTok、Gemini",
      apn: "mobile.three.com.hk",
    },
  },
  {
    label: "總量型 (KDDI / SoftBank)",
    detailed: JP_TOTAL_KDDI_SOFTBANK_DETAILED,
    usage: JP_USAGE_SOFTBANK_KDDI,
    faq: JP_FAQ_SOFTBANK_KDDI,
    features: softbankKddiDailyKeyFeatures(),
    specs: {
      ip_type: "新加坡 IP",
      route_type: "漫遊",
      network: "KDDI / SoftBank 4G/5G 雙電信",
      speed_rule: "總量高速用完後約 128 kbps",
      apps: "熱點分享、ChatGPT、TikTok、Gemini",
      apn: "e-ideas",
    },
  },
  {
    label: "總量型 (IIJ(DOCOMO))",
    detailed: JP_TOTAL_IIJ_DETAILED,
    usage: JP_USAGE_IIJ,
    faq: JP_FAQ_IIJ,
    features: iijDocomoUnlimitedKeyFeatures(),
    specs: {
      ip_type: "日本 IP",
      route_type: "原生 eSIM",
      network: "IIJ(DOCOMO) 4G/LTE",
      speed_rule: "總量高速用完後約 200 kbps",
      apps: "熱點分享、ChatGPT、TikTok、Gemini",
      apn: "vmobile.jp（需手動）",
    },
  },
];

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(`登入失敗 ${res.status}`);
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
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `${apiPath} ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  return data;
}

async function pushContent(productId, carrier, contentType, payload) {
  const body = {
    productId,
    carrier,
    contentType,
    ...payload,
  };
  const res = await fetch(`${MEDUSA_URL}/store/internal/product-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Product-Admin-Secret": SECRET,
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`product-content 非 JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      data.error || data.message || `${carrier} [${contentType}] ${res.status}`,
    );
  }
  return data;
}

async function main() {
  if (!SECRET || SECRET.length < 16) {
    throw new Error("請設定 PRODUCT_CONTENT_ADMIN_SECRET");
  }
  if (!PUBLISHABLE_KEY) {
    throw new Error("請設定 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
  }

  console.log(`🇯🇵 ${HANDLE} · hot_sale + IP specs + intro/usage/FAQ`);

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,title,metadata`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);

  console.log("原 hot_sale:", product.metadata?.hot_sale_telecoms || []);

  await admin(token, `/admin/products/${product.id}?fields=id,metadata`, {
    method: "POST",
    body: JSON.stringify({
      metadata: { hot_sale_telecoms: HOT_SALE },
    }),
  });
  console.log("新 hot_sale:", HOT_SALE);

  for (const c of CARRIERS) {
    process.stdout.write(`  → ${c.label} … `);
    await pushContent(product.id, c.label, "detailed", { html: c.detailed });
    await pushContent(product.id, c.label, "usage", { html: c.usage });
    await pushContent(product.id, c.label, "faq", { html: c.faq });
    await pushContent(product.id, c.label, "features", {
      features: Array.isArray(c.features?.bullets)
        ? c.features.bullets
        : Array.isArray(c.features)
          ? c.features
          : [],
    });
    await pushContent(product.id, c.label, "specs", { specs: c.specs });
    console.log("ok");
  }

  const verify = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,metadata`,
  );
  const m = verify.products?.[0]?.metadata || {};
  const keysOf = (k) => {
    const raw = m[k];
    if (!raw) return [];
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Object.keys(obj || {}).filter((x) => !/^\d+$/.test(x));
  };
  console.log("verify hot:", m.hot_sale_telecoms);
  console.log("verify specs:", keysOf("carrier_specs_by_carrier"));
  console.log("verify detailed:", keysOf("detailed_content_by_carrier"));
  console.log("verify usage:", keysOf("usage_content_by_carrier"));
  console.log("verify faq:", keysOf("faq_content_by_carrier"));
  console.log("verify features:", keysOf("key_features_by_carrier"));
  console.log(`✅ ${product.title}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
