/**
 * 更新「中國大陸 吃到飽 eSIM」電信變體
 *   1) 中國聯通 GPT + TikTok (CUCC) ← China(T+C)-unlimited-*-A0（CUCC／約 40–100 Mbps）
 *   2) 中國移動 吃到飽 常規速度 50-70Mbps ← China-unlimited-*-B0（CMCC）
 *   3) 中國移動 吃到飽 常規速度 8-20Mbps ← China-unlimited-*-A0（CMCC／FUP）
 *
 * 用法：
 *   node scripts/update-china-unlimited-product.mjs --rebuild
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const HANDLE = "china-unlimited-esim";
const DATA_AMOUNT = "吃到飽";
const LINE = "漫遊線路";
const TELECOM_TC = "中國聯通 GPT + TikTok (CUCC)";
const TELECOM_70 = "中國移動 吃到飽 常規速度 50-70Mbps";
const TELECOM_8 = "中國移動 吃到飽 常規速度 8-20Mbps";
const MARGIN = 1.5; // 利潤 50%
const BATCH_SIZE = 40;
const REBUILD = process.argv.includes("--rebuild");

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

const SALES_CHANNEL_ID = "sc_01KPJKQCG9X3ZGDM5156KFW8HD";
const CATEGORY_IDS = ["pcat_01KY70EGV51W6NNHWBFGX3VZ1F"]; // china
const THUMB =
  process.env.CHINA_PRODUCT_THUMB ||
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/01KYBQ3HHZADQNWFGG6F02YKSP.png";

function loadPlans() {
  const file = path.join(__dirname, "data", "china-unlimited-plans.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  const push = (list, telecom, kind) => {
    for (const p of list || []) {
      const cost = Number(p.cost_twd) || 0;
      rows.push({
        ...p,
        cost_twd: cost,
        retail_twd: retailFromCost(cost),
        telecom,
        daysLabel: `${p.day}天`,
        kind,
      });
    }
  };
  push(raw.tiktok_chatgpt, TELECOM_TC, "tc_cucc");
  push(raw.speed70, TELECOM_70, "cmcc_70");
  push(raw.speed8_20, TELECOM_8, "cmcc_8_20");
  return rows.sort(
    (a, b) =>
      a.telecom.localeCompare(b.telecom, "zh") || Number(a.day) - Number(b.day),
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

function speedRuleFor(kind) {
  if (kind === "tc_cucc") return "約 40–100 Mbps 吃到飽";
  if (kind === "cmcc_70") return "限速 50–70Mbps 吃到飽";
  return "約 8–20 Mbps 吃到飽";
}

function toVariant(row) {
  const isTc = row.kind === "tc_cucc";
  return {
    title: `${row.telecom} · ${row.daysLabel} · ${DATA_AMOUNT}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: row.telecom,
      數據量: DATA_AMOUNT,
      線路: LINE,
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
      profit_rate: "50%",
      margin: MARGIN,
      apn: row.apn || "",
      networks: row.networks || "",
      rule_desc: row.rule_desc || "",
      speed_desc: row.speed_desc || "",
      ip: row.ip || "SG",
      attributes: {
        days: row.day,
        data: DATA_AMOUNT,
        data_amount: DATA_AMOUNT,
        telecom: row.telecom,
        line: LINE,
        network: "4G / 5G",
        ip_type: "新加坡 IP",
        route_type: LINE,
        hotspot: isTc,
        gpt: isTc,
        tiktok: isTc,
        gemini: false,
        speed_rule: speedRuleFor(row.kind),
      },
    },
  };
}

async function main() {
  const rows = loadPlans();
  if (!rows.length) throw new Error("china-unlimited-plans.json 無資料");

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const telecomValues = [TELECOM_TC, TELECOM_70, TELECOM_8];

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];
  if (!product) throw new Error(`找不到商品 handle=${HANDLE}`);

  const productMeta = {
    type: "esim",
    country: "CN",
    hot_sale_telecoms: [TELECOM_TC, TELECOM_70],
    carrier_profit_by_carrier: {
      [TELECOM_TC]: 50,
      [TELECOM_70]: 50,
      [TELECOM_8]: 50,
    },
    seo_title:
      "中國大陸 吃到飽 eSIM｜聯通 GPT+TikTok／移動常規速度｜Jeko eSIM",
    seo_description:
      "中國大陸吃到飽 eSIM：中國聯通 GPT + TikTok (CUCC)、移動常規速度 50-70Mbps／8-20Mbps。漫遊線路、5G；移動方案不一定支援熱點，依天數選購。",
    seo_keywords:
      "中國大陸eSIM,中國聯通eSIM,中國移動eSIM,吃到飽eSIM,TikTok,ChatGPT,70Mbps,8-20Mbps,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM_TC]: "支援 TikTok 與 ChatGPT・約 40–100 Mbps",
      [TELECOM_70]: "常規速度 50–70Mbps 吃到飽",
      [TELECOM_8]: "常規速度 8–20Mbps 吃到飽",
    },
    carrier_specs_by_carrier: {
      [TELECOM_TC]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊線路",
        network: "CUCC 5G/4G",
        speed_rule: "約 40–100 Mbps 吃到飽",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
      },
      [TELECOM_70]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊線路",
        network: "CMCC 5G/4G",
        speed_rule: "限速 50–70Mbps 吃到飽",
        apps: "不一定支援熱點",
      },
      [TELECOM_8]: {
        ip_type: "新加坡 IP",
        route_type: "漫遊線路",
        network: "CMCC 5G/4G",
        speed_rule: "約 8–20 Mbps 吃到飽",
        apps: "不一定支援熱點",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM_TC]: {
        fup_notice:
          "支援 TikTok／ChatGPT｜約 40–100 Mbps 吃到飽（實際速度依當地網路）",
        activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
      },
      [TELECOM_70]: {
        fup_notice: "常規速度約 50–70Mbps 吃到飽（實際速度依當地網路）",
        activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
      },
      [TELECOM_8]: {
        fup_notice: "常規速度約 8–20Mbps 吃到飽（實際速度依當地網路）",
        activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: {
      [TELECOM_TC]: [
        "支援 TikTok",
        "支援 ChatGPT",
        "約 40-100 Mbps",
        "熱點分享",
        "4G / 5G",
      ],
      [TELECOM_70]: [
        "常規速度 50-70Mbps",
        "吃到飽",
        "不一定支援熱點",
        "4G / 5G",
      ],
      [TELECOM_8]: [
        "常規速度 8-20Mbps",
        "吃到飽",
        "不一定支援熱點",
        "4G / 5G",
      ],
    },
  };

  const payloadBase = {
    title: "中國大陸 吃到飽 eSIM",
    subtitle:
      "聯通 GPT+TikTok／移動 50-70Mbps／移動 8-20Mbps",
    handle: HANDLE,
    description:
      "中國大陸吃到飽 eSIM，三種電信方案：中國聯通 GPT + TikTok (CUCC)；中國移動吃到飽常規速度 50-70Mbps；中國移動吃到飽常規速度 8-20Mbps。漫遊線路、5G；移動方案不一定支援熱點，依天數選購。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: telecomValues },
      { title: "數據量", values: [DATA_AMOUNT] },
      { title: "線路", values: [LINE] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: CATEGORY_IDS.map((id) => ({ id })),
  };

  const variants = rows.map(toVariant);
  const nTc = rows.filter((r) => r.telecom === TELECOM_TC).length;
  const n70 = rows.filter((r) => r.telecom === TELECOM_70).length;
  const n8 = rows.filter((r) => r.telecom === TELECOM_8).length;
  console.log(`📦 方案 ${rows.length} 筆（T+C ${nTc} + 50-70 ${n70} + 8-20 ${n8}）`);

  console.log("♻️ 更新商品", product.id);
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
    console.log("（未加 --rebuild，僅更新商品標題／metadata；變體未重建）");
    console.log(
      "重建變體請執行：node scripts/update-china-unlimited-product.mjs --rebuild",
    );
    return;
  }

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

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants,*options`,
  );
  const vs = check.product?.variants || [];
  const telecomOpt = (check.product?.options || []).find(
    (o) => o.title === "電信商",
  );
  console.log("\n======= 完成 =======");
  console.log(`標題: ${check.product?.title}`);
  console.log(`前台: /product/china/${HANDLE}`);
  console.log(`變體數: ${vs.length}`);
  console.log(
    "電信商選項:",
    (telecomOpt?.values || []).map((v) => v.value).join(" | "),
  );
  console.log(
    `範例 8-20Mbps 2天:`,
    rows.find((r) => r.telecom === TELECOM_8 && r.day === 2),
  );
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
