#!/usr/bin/env node
/**
 * 將 japan-unlimited-esim 的 AU(KDDI) 原生方案（Japan-Local-unlimited-*-D*）
 * 依選品神器公式重算售價：costTWD = ceil(HKD * FX)，retail = ceil(cost * 1.6 / 10)*10 - 1
 *
 * 用法：
 *   node scripts/reprice-japan-unlimited-au.mjs
 *   node scripts/reprice-japan-unlimited-au.mjs --dry-run
 *   node scripts/reprice-japan-unlimited-au.mjs --margin 1.6
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
const marginIdx = args.indexOf("--margin");
const backendIdx = args.indexOf("--backend");
const MARGIN = Number(marginIdx >= 0 ? args[marginIdx + 1] : 1.6) || 1.6;

const MEDUSA_URL = (
  (backendIdx >= 0 ? args[backendIdx + 1] : null) ||
  process.env.MEDUSA_SYNC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "japan-unlimited-esim";
const SKU_PREFIX = "Japan-Local-unlimited-";

function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
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

async function fetchSupplierPlans() {
  // 走本機 Next API（與選品神器同源）；失敗則直接打供應商需帳密，這裡只走 API
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const res = await fetch(`${base.replace(/\/$/, "")}/api/esim/list`);
  if (!res.ok) throw new Error(`/api/esim/list ${res.status}`);
  const data = await res.json();
  return data.result || [];
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

async function main() {
  console.log(`Medusa: ${MEDUSA_URL}`);
  console.log(`Handle: ${HANDLE} · margin=${MARGIN} · dryRun=${dryRun}`);

  const fx = await fetchFxHkdToTwd();
  console.log(`FX HKD→TWD: ${fx.toFixed(4)}`);

  const plans = await fetchSupplierPlans();
  // 供應商 plan.name 對齊 Medusa variant.sku（例 Japan-Local-unlimited-5-D1）
  const byName = Object.fromEntries(
    plans
      .filter((p) => String(p.name || "").startsWith(SKU_PREFIX))
      .map((p) => [String(p.name), p]),
  );
  console.log(`供應商 AU 方案筆數: ${Object.keys(byName).length}`);

  const token = await login();
  const list = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.prices`,
  );
  const product = list.products?.[0];
  if (!product) throw new Error("找不到商品");

  const updates = [];
  for (const v of product.variants || []) {
    const sku = String(v.sku || "");
    if (!sku.startsWith(SKU_PREFIX)) continue;
    const plan = byName[sku];
    if (!plan) {
      console.log(`· 略過（供應商無此 SKU）: ${sku}`);
      continue;
    }
    const costTwd = Math.ceil(Number(plan.price || 0) * fx);
    const retail = retailFromCost(costTwd);
    const old =
      v.prices?.find((p) => p.currency_code === "twd")?.amount ??
      v.prices?.[0]?.amount;
    updates.push({
      id: v.id,
      sku,
      costTwd,
      old: Number(old) || 0,
      retail,
      prices: [{ currency_code: "twd", amount: retail }],
    });
  }

  if (!updates.length) {
    console.log("沒有可更新的變體");
    return;
  }

  for (const u of updates) {
    const mark = u.old === u.retail ? "·" : u.old > u.retail ? "↓" : "↑";
    console.log(
      `${mark} ${u.sku.padEnd(32)} cost=${String(u.costTwd).padStart(4)}  ${u.old} → ${u.retail}`,
    );
  }

  const changed = updates.filter((u) => u.old !== u.retail);
  console.log(`\n將更新 ${changed.length} / ${updates.length} 筆`);

  if (dryRun || !changed.length) {
    console.log(dryRun ? "（dry-run，未寫入）" : "無需寫入");
    return;
  }

  const BATCH = 20;
  for (let i = 0; i < changed.length; i += BATCH) {
    const slice = changed.slice(i, i + BATCH).map(({ id, prices }) => ({
      id,
      prices,
    }));
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ update: slice }),
    });
    console.log(`✓ batch ${i / BATCH + 1}`);
  }

  const five = updates.find((u) => u.sku === "Japan-Local-unlimited-5-D1");
  if (five) {
    console.log(
      `\n驗證目標：Japan-Local-unlimited-5-D1 → NT$${five.retail}（原 ${five.old}）`,
    );
  }
  console.log("完成。請硬重新整理商品頁（或觸發 revalidate）。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
