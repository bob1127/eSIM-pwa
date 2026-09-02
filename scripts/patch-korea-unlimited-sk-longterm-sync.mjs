/**
 * 韓國 SK 原生吃到飽：<30 天 50%；≥30 天 40%
 *
 *   node scripts/patch-korea-unlimited-sk-longterm-sync.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { koreaUnlimitedKeyFeaturesByCarrier } from "../content/product-detailed/korea-key-features.js";

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

const HANDLE = "korea-unlimited-esim";
const DATA_AMOUNT = "無限流量";
const TELECOM_SKT = "SK電信（韓國IP）";
const TELECOM_PROMO = "LG U+ / SK電信";
const PROFIT_SKT_SHORT = 50;
const PROFIT_SKT_LONG = 40;
const SKT_LONG_MIN_DAYS = 30;
const PROFIT_PROMO = 50;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.1);
const BATCH = 20;

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
        network: "4G/LTE",
        ip_type: "韓國 IP",
        route_type: "原生eSIM",
        hotspot: true,
        speed_rule: row.rule_desc || "Unlimited High Speed",
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

function parseMeta(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function main() {
  const rows = loadPlans();
  const skRows = rows.filter((r) => r.kind === "native_skt");
  console.log(
    `SK 原生 ${skRows.length} 筆 · <${SKT_LONG_MIN_DAYS}天 ${PROFIT_SKT_SHORT}% · ≥${SKT_LONG_MIN_DAYS}天 ${PROFIT_SKT_LONG}%`,
  );

  const token = await login();
  const list = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.sku,*variants.metadata,*variants.prices,*variants.options,*options,*metadata`,
  );
  const product = list.products?.[0];
  if (!product) throw new Error("找不到 korea-unlimited-esim");

  const md = parseMeta(product.metadata);
  md.carrier_profit_by_carrier = {
    ...(md.carrier_profit_by_carrier || {}),
    [TELECOM_SKT]: PROFIT_SKT_SHORT,
    [TELECOM_PROMO]: PROFIT_PROMO,
  };
  md.carrier_profit_long_by_carrier = {
    ...(md.carrier_profit_long_by_carrier || {}),
    [TELECOM_SKT]: PROFIT_SKT_LONG,
  };
  md.carrier_profit_long_min_days_by_carrier = {
    ...(md.carrier_profit_long_min_days_by_carrier || {}),
    [TELECOM_SKT]: SKT_LONG_MIN_DAYS,
  };
  md.key_features_by_carrier = koreaUnlimitedKeyFeaturesByCarrier();

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      metadata: md,
      options: [
        { title: "使用天數", values: dayValues },
        { title: "電信商", values: [TELECOM_SKT, TELECOM_PROMO] },
        { title: "數據量", values: [DATA_AMOUNT] },
      ],
    }),
  });

  const bySku = new Map(
    (product.variants || []).map((v) => [String(v.sku || ""), v]),
  );

  const updates = [];
  const creates = [];

  for (const row of skRows) {
    const v = toVariant(row);
    const existing = bySku.get(row.sku);
    if (existing) {
      const old =
        existing.prices?.find((p) => p.currency_code === "twd")?.amount ??
        existing.prices?.[0]?.amount;
      updates.push({
        id: existing.id,
        sku: row.sku,
        day: row.day,
        profit: row.profit_percent,
        old: Number(old) || 0,
        retail: row.retail_twd,
        prices: v.prices,
        metadata: v.metadata,
      });
    } else {
      creates.push(v);
    }
  }

  for (const u of updates) {
    const mark = u.old === u.retail ? "=" : u.old < u.retail ? "↑" : "↓";
    console.log(
      `${mark} ${u.day}天 ${u.profit}%  ${u.old} → ${u.retail}  (${u.sku})`,
    );
  }

  const changed = updates.filter((u) => u.old !== u.retail);
  const metadataUpdates = updates.filter(
    (u) => u.metadata?.profit_percent != null,
  );
  for (const batch of chunk(metadataUpdates, BATCH)) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({
        update: batch.map(({ id, prices, metadata, old, retail }) => ({
          id,
          ...(old !== retail ? { prices } : {}),
          metadata,
        })),
      }),
    });
  }
  console.log(`✓ 已同步 ${metadataUpdates.length} 筆 SK 變體（售價+metadata）`);

  if (creates.length) {
    console.log(`➕ 新增 ${creates.length} 筆 SK 變體（含長天數）`);
    for (const batch of chunk(creates, BATCH)) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
    }
  }

  console.log("\n範例 29天:", skRows.find((r) => r.day === 29) || "(無)");
  console.log("範例 30天:", skRows.find((r) => r.day === 30));
  console.log("範例 60天:", skRows.find((r) => r.day === 60));
  console.log(`\n前台: /product/korea/${HANDLE}?telecom=sk-native&days=60`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
