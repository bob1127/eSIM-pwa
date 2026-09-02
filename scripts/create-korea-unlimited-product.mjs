/**
 * 建立「韓國 eSIM 吃到飽」— 兩個電信方案 × 各天數變體
 *   1) SK電信（韓國IP）← South Korea-Local-unlimited-*-B0（真高速）
 *   2) LG U+ / SK電信 ← South Korea-Promo-unlimited-*-A0（限速 10Mbps）
 * 利潤：SK 原生 <30 天 50%；≥30 天 40%。Promo 維持 50%。
 *
 * 用法：
 *   node scripts/create-korea-unlimited-product.mjs
 *   node scripts/create-korea-unlimited-product.mjs --rebuild   # 刪舊變體重建
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { koreaUnlimitedKeyFeaturesByCarrier } from "../content/product-detailed/korea-key-features.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const HANDLE = "korea-unlimited-esim";
const DATA_AMOUNT = "無限流量";
const TELECOM_SKT = "SK電信（韓國IP）";
const TELECOM_PROMO = "LG U+ / SK電信";
const PROFIT_SKT_SHORT = 50;
const PROFIT_SKT_LONG = 40;
const SKT_LONG_MIN_DAYS = 30;
const PROFIT_PROMO = 50;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.1);
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const CATEGORY_IDS = ["pcat_01KZJNBVGMVYJ9W659MWQB1E3Q"]; // korea
// 韓國三產品共用同一組商品圖（SK電信吃到飽為基準）
const KOREA_GALLERY = [
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDD41493R26CQSJP8CS.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDFBNK845TJDWA4697M.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDGVRBHVSY5D1FJ15SJ.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDHWCH8R57ZRQ7RP7YT.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDJYA8R20W94NW2909F.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDKK0YTH870CH7NADWV.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDMPPGMMZARAKC8DA1C.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDM5YYGWR08PQZAWQFK.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDNPW4F3C7BV41G6RR0.png",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDNRGMJZBZZ7MKT2VAW.png",
  "https://www.jeko-esim.com.tw/images/korea-esim-banner.jpg",
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KZK87FDPMD9WFX666FPG8P8J.jpg",
];
const THUMB = process.env.KOREA_PRODUCT_THUMB || KOREA_GALLERY[0];
const PRODUCT_IMAGES = KOREA_GALLERY.map((url) => ({ url }));

function profitForRow(row) {
  if (row.kind === "native_skt") {
    return row.day >= SKT_LONG_MIN_DAYS ? PROFIT_SKT_LONG : PROFIT_SKT_SHORT;
  }
  return PROFIT_PROMO;
}

function retailFromCost(costTwd, profitPercent) {
  const m = 1 + profitPercent / 100;
  return Math.ceil((costTwd * m) / 10) * 10 - 1;
}

function loadPlans() {
  const file = path.join(__dirname, "data", "korea-unlimited-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  for (const p of raw.local || []) {
    const cost_twd = p.cost_twd || Math.ceil(Number(p.price_hkd) * HKD_TO_TWD);
    const profit_percent = profitForRow({ kind: "native_skt", day: p.day });
    rows.push({
      ...p,
      telecom: TELECOM_SKT,
      daysLabel: `${p.day}天`,
      cost_twd,
      profit_percent,
      retail_twd: retailFromCost(cost_twd, profit_percent),
      kind: "native_skt",
    });
  }
  for (const p of raw.promo || []) {
    const cost_twd = p.cost_twd || Math.ceil(Number(p.price_hkd) * HKD_TO_TWD);
    const profit_percent = PROFIT_PROMO;
    rows.push({
      ...p,
      telecom: TELECOM_PROMO,
      daysLabel: `${p.day}天`,
      cost_twd,
      profit_percent,
      retail_twd: retailFromCost(cost_twd, profit_percent),
      kind: "promo_lg_skt",
    });
  }
  return rows.sort(
    (a, b) =>
      a.telecom.localeCompare(b.telecom, "zh") ||
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
      cost_hkd: String(row.price_hkd),
      cost_price: row.cost_twd,
      profit_percent: row.profit_percent,
      profit_margin: `${row.profit_percent}%`,
      profit_rate: `${row.profit_percent}%`,
      margin: 1 + row.profit_percent / 100,
      apn: row.apn || "",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      ip: row.ip || "",
      attributes: {
        days: row.day,
        data: DATA_AMOUNT,
        data_amount: DATA_AMOUNT,
        telecom: row.telecom,
        network:
          row.kind === "native_skt"
            ? "4G/LTE"
            : "5G/4G · 每日1GB高速後10Mbps吃到飽",
        ip_type: row.kind === "native_skt" ? "韓國 IP" : "新加坡 IP",
        route_type: row.kind === "native_skt" ? "原生eSIM" : "漫遊",
        hotspot: true,
        speed_rule:
          row.kind === "native_skt"
            ? row.rule_desc || "Unlimited High Speed"
            : "每日1GB高速，用完後10Mbps吃到飽",
      },
    },
  };
}

async function main() {
  const rows = loadPlans();
  if (!rows.length) throw new Error("korea-unlimited-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [TELECOM_SKT, TELECOM_PROMO];

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];

  const productMeta = {
    type: "esim",
    country: "KR",
    is_native: true,
    native_esim: true,
    hot_sale_telecoms: [TELECOM_SKT],
    carrier_profit_by_carrier: {
      [TELECOM_SKT]: PROFIT_SKT_SHORT,
      [TELECOM_PROMO]: PROFIT_PROMO,
    },
    carrier_profit_long_by_carrier: {
      [TELECOM_SKT]: PROFIT_SKT_LONG,
    },
    carrier_profit_long_min_days_by_carrier: {
      [TELECOM_SKT]: SKT_LONG_MIN_DAYS,
    },
    seo_title:
      "韓國 eSIM SK電信 - 高速數據流量吃到飽 原生eSIM / 漫遊｜韓國IP｜Jeko eSIM",
    seo_description:
      "韓國 eSIM SK電信高速吃到飽：原生eSIM（韓國IP／4G／LTE／真高速不限速）與漫遊（新加坡IP／每日1GB高速、用完後約10Mbps吃到飽／5G／4G）。支援熱點，依天數選購。Jeko eSIM 免換卡、QR Code 即開即用。",
    seo_keywords:
      "韓國eSIM,韓國eSIM SK電信,高速數據流量吃到飽,原生eSIM,韓國IP,漫遊eSIM,新加坡IP,SK電信eSIM,LG U+ eSIM,真不限速,每日1GB,10Mbps吃到飽,旅遊eSIM,出國上網,Jeko eSIM,接口eSIM,免換卡",
    subtitle_by_carrier: {
      [TELECOM_SKT]: "原生eSIM：SK電信韓國IP真高速",
      [TELECOM_PROMO]: "LG U+·SK電信新加坡IP流量吃到飽",
    },
    carrier_specs_by_carrier: {
      [TELECOM_SKT]: {
        ip_type: "韓國 IP",
        route_type: "原生eSIM",
        network: "SKT 4G/LTE",
        speed_rule: "高速數據流量吃到飽（真不限速）",
        apps: "熱點分享,ChatGPT,TikTok",
        apn: "lte.sktelecom.com",
      },
      [TELECOM_PROMO]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊",
        network: "LG U+ / SKT 5G/4G",
        speed_rule: "每日1GB高速，用完後10Mbps吃到飽",
        fup_detail:
          "Daily 1 GB high-speed data + unlimited 10 Mbps afterward",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        apn: "e-ideas",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM_SKT]: {
        fup_notice: "原生eSIM｜高速數據流量吃到飽，典型為真不限速（依供應商規則）",
        activation_notice: "建議抵達韓國後再安裝／啟用 eSIM",
      },
      [TELECOM_PROMO]: {
        fup_notice:
          "新加坡IP漫遊｜每日1GB高速流量，用完後維持約10Mbps吃到飽（實際速度可能有所變動）",
        activation_notice: "建議抵達韓國後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: koreaUnlimitedKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: "韓國 eSIM SK電信 - 高速數據流量吃到飽 原生eSIM / 漫遊",
    subtitle: "",
    handle: HANDLE,
    description:
      "韓國 eSIM 吃到飽，兩種方案：原生eSIM（SK電信／韓國IP／4G／LTE）高速數據流量吃到飽、真不限速；漫遊（LG U+／SK電信／新加坡IP／5G／4G）每日1GB高速，用完後維持約10Mbps吃到飽。支援熱點，依天數選購，抵達後安裝即可使用。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: PRODUCT_IMAGES,
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
  console.log(
    `📦 方案 ${rows.length} 筆（${TELECOM_SKT} ${rows.filter((r) => r.telecom === TELECOM_SKT).length} + ${TELECOM_PROMO} ${rows.filter((r) => r.telecom === TELECOM_PROMO).length}）`,
  );

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
      console.log("若要重建變體請加：node scripts/create-korea-unlimited-product.mjs --rebuild");
    }
  }

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants`,
  );
  const vs = check.product?.variants || [];
  console.log("\n======= 完成 =======");
  console.log(`前台: /product/korea/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    `範例: ${TELECOM_SKT} 5天 →`,
    rows.find((r) => r.telecom === TELECOM_SKT && r.day === 5),
  );
  console.log(
    `範例: ${TELECOM_PROMO} 5天 →`,
    rows.find((r) => r.telecom === TELECOM_PROMO && r.day === 5),
  );
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
