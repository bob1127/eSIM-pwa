#!/usr/bin/env node
/**
 * 依 Medusa 變體 metadata.profit_percent + cost_price（或 cost_hkd×匯率）重算 TWD 售價。
 *
 * 在 Medusa Admin 編輯變體 metadata：
 *   profit_percent: 50        // 利潤趴數（相對成本）
 *   cost_price: 307           // TWD 成本（優先）
 *   cost_hkd: "74.41"         // 若無 cost_price 則用 HKD×匯率
 *
 * 售價公式（與選品神器一致）：
 *   retail = ceil(cost * (1 + profit_percent/100) / 10) * 10 - 1
 *
 * 用法：
 *   node scripts/reprice-medusa-variants-by-profit.mjs --handle japan-unlimited-esim
 *   node scripts/reprice-medusa-variants-by-profit.mjs --handle japan-unlimited-esim --telecom "SoftBank / KDDI 10Mbps"
 *   node scripts/reprice-medusa-variants-by-profit.mjs --handle japan-unlimited-esim --sku-prefix "Japan(T+C)-unlimited-"
 *   node scripts/reprice-medusa-variants-by-profit.mjs --handle japan-unlimited-esim --dry-run
 *   node scripts/reprice-medusa-variants-by-profit.mjs --handle japan-unlimited-esim --default-profit 50
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(__dirname, "../.env.local"));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const handleIdx = args.indexOf("--handle");
const telecomIdx = args.indexOf("--telecom");
const skuIdx = args.indexOf("--sku-prefix");
const profitIdx = args.indexOf("--default-profit");
const backendIdx = args.indexOf("--backend");

const HANDLE =
  (handleIdx >= 0 ? args[handleIdx + 1] : null) || "japan-unlimited-esim";
const TELECOM_FILTER = telecomIdx >= 0 ? args[telecomIdx + 1] : null;
const SKU_PREFIX = skuIdx >= 0 ? args[skuIdx + 1] : null;
const DEFAULT_PROFIT = Number(profitIdx >= 0 ? args[profitIdx + 1] : 50) || 50;

const MEDUSA_URL = (
  (backendIdx >= 0 ? args[backendIdx + 1] : null) ||
  process.env.MEDUSA_SYNC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const BATCH = 20;

function parseJsonField(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  }
  return {};
}

function retailFromCost(costTwd, profitPercent) {
  const m = 1 + Number(profitPercent) / 100;
  return Math.ceil((costTwd * m) / 10) * 10 - 1;
}

function parseProfit(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).replace("%", "").trim();
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function fetchFxHkdToTwd() {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/TWD");
    const data = await res.json();
    return 1 / data.rates.HKD;
  } catch {
    return 4.12;
  }
}

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(`登入失敗: ${data.message || res.status}`);
  }
  return data.token;
}

async function admin(token, path, options = {}) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${path}] 非 JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      `[${path}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 300)}`,
    );
  }
  return data;
}

function variantTelecom(product, variant) {
  for (const opt of product.options || []) {
    if (opt.title !== "電信商") continue;
    const vo = (variant.options || []).find((x) => x.option_id === opt.id);
    if (vo?.value) return String(vo.value).trim();
  }
  return String(variant.metadata?.carrier || "").trim();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log(`Medusa: ${MEDUSA_URL}`);
  console.log(
    `Handle: ${HANDLE} · telecom=${TELECOM_FILTER || "*"} · sku=${SKU_PREFIX || "*"} · defaultProfit=${DEFAULT_PROFIT}% · dryRun=${dryRun}`,
  );

  const fx = await fetchFxHkdToTwd();
  const token = await login();
  const list = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.sku,*variants.metadata,*variants.prices,*variants.options,*options,*metadata`,
  );
  const product = list.products?.[0];
  if (!product) throw new Error("找不到商品");

  const carrierProfit = parseJsonField(
    product.metadata?.carrier_profit_by_carrier,
  );

  const updates = [];
  for (const v of product.variants || []) {
    const sku = String(v.sku || "");
    const telecom = variantTelecom(product, v);
    if (TELECOM_FILTER && telecom !== TELECOM_FILTER) continue;
    if (SKU_PREFIX && !sku.startsWith(SKU_PREFIX)) continue;

    const meta = v.metadata || {};
    let costTwd = Number(meta.cost_price);
    if (!Number.isFinite(costTwd) || costTwd <= 0) {
      const hkd = Number(meta.cost_hkd);
      if (Number.isFinite(hkd) && hkd > 0) costTwd = Math.ceil(hkd * fx);
    }
    if (!Number.isFinite(costTwd) || costTwd <= 0) {
      console.log(`· 略過（無成本）: ${sku || v.id}`);
      continue;
    }

    const profitPercent = parseProfit(
      meta.profit_percent ?? meta.profit_margin,
      parseProfit(carrierProfit[telecom], DEFAULT_PROFIT),
    );
    const retail = retailFromCost(costTwd, profitPercent);
    const old =
      v.prices?.find((p) => p.currency_code === "twd")?.amount ??
      v.prices?.[0]?.amount;

    updates.push({
      id: v.id,
      sku,
      telecom,
      costTwd,
      profitPercent,
      old: Number(old) || 0,
      retail,
      prices: [{ currency_code: "twd", amount: retail }],
      metadata: {
        ...meta,
        cost_price: costTwd,
        profit_percent: profitPercent,
        profit_margin: `${profitPercent}%`,
      },
    });
  }

  if (!updates.length) {
    console.log("沒有可更新的變體（請確認 filter 或 metadata.cost_price）");
    return;
  }

  for (const u of updates) {
    const mark = u.old === u.retail ? "·" : u.old > u.retail ? "↓" : "↑";
    console.log(
      `${mark} ${(u.sku || u.id).padEnd(34)} [${u.telecom}] cost=${String(u.costTwd).padStart(4)}  ${u.profitPercent}%  ${u.old} → ${u.retail}`,
    );
  }

  const changed = updates.filter((u) => u.old !== u.retail);
  console.log(`\n將更新 ${changed.length} / ${updates.length} 筆售價`);

  if (dryRun || !changed.length) {
    console.log(dryRun ? "（dry-run，未寫入）" : "無需寫入");
    return;
  }

  for (const batch of chunk(changed, BATCH)) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({
        update: batch.map(({ id, prices, metadata }) => ({
          id,
          prices,
          metadata,
        })),
      }),
    });
  }
  console.log("✓ 完成。請硬重新整理商品頁。");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
