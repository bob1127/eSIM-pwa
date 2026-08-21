/**
 * 補上台灣吃到飽「中華電信 10Mbps · 2天」——供應商無 Taiwan-unlimited-2-D0，
 * 改用選品目錄的 Taiwan(T+C)-unlimited-2-A0（Daily 1GB + 10Mbps）。
 *
 *   node scripts/add-taiwan-unlimited-10mbps-2day.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
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
const HANDLE = "taiwan-unlimited-esim";
const TELECOM = "中華電信 10Mbps";
const DATA = "無限流量";
const DAY = 2;
const SKU = "Taiwan(T+C)-unlimited-2-A0";
const PLAN_ID = "7441aecb-e9c3-43f5-b7f3-7fa8e68bb254";
const PROFIT = 70;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const PRICE_HKD = 29.21;
const FUP_10 = "每日約 1GB 高速後限速約 10Mbps 吃到飽（台灣時間 00:00 重置）";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * (1 + PROFIT / 100)) / 10) * 10 - 1;
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

async function main() {
  const cost = Math.ceil(PRICE_HKD * HKD_TO_TWD);
  const retail = retailFromCost(cost);
  console.log(
    `補洞 ${TELECOM} · ${DAY}天 ← ${SKU} HKD ${PRICE_HKD} → cost NT$${cost} → 售價 NT$${retail}`,
  );

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.sku,*options`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);

  const exists = (product.variants || []).find(
    (v) =>
      v.sku === SKU ||
      (String(v.title || "").includes("10Mbps") &&
        String(v.title || "").includes(`${DAY}天`)),
  );
  if (exists) {
    console.log("已存在，略過建立:", exists.id, exists.sku, exists.title);
    return;
  }

  const variant = {
    title: `${TELECOM} · ${DAY}天 · ${DATA}`,
    sku: SKU,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: `${DAY}天`,
      電信商: TELECOM,
      數據量: DATA,
    },
    prices: [{ currency_code: "twd", amount: retail }],
    metadata: {
      plan_id: PLAN_ID,
      type: "esim",
      carrier: TELECOM,
      plan_kind: "unlimited",
      data: DATA,
      data_amount: DATA,
      days: String(DAY),
      cost_hkd: String(PRICE_HKD),
      cost_price: cost,
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: 1 + PROFIT / 100,
      apn: "e-ideas",
      networks: "TW:Taiwan Mobile[4G;LTE;5G]|",
      rule_desc: "unlimited 10mbps",
      speed_desc: "Daily 1 GB high-speed data + unlimited 10 Mbps afterward",
      special_desc: "Daily 1 GB high-speed data + unlimited 10 Mbps afterward",
      throttle_kind: "10mbps",
      ip: "SG",
      ekyc: false,
      fill_from: "Taiwan(T+C)-unlimited-2-A0",
      attributes: {
        days: DAY,
        data: DATA,
        data_amount: DATA,
        telecom: TELECOM,
        network: "台灣大哥大 4G/5G",
        ip_type: "新加坡 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        ekyc: false,
        speed_rule: FUP_10,
        coverage: "台灣",
        apps: "支援熱點；支援 GPT／TikTok／Gemini",
      },
    },
  };

  await admin(token, `/admin/products/${product.id}/variants/batch`, {
    method: "POST",
    body: JSON.stringify({ create: [variant] }),
  });
  console.log("✅ 已建立 variant", variant.title, variant.sku, `NT$${retail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
