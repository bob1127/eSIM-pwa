#!/usr/bin/env node
/**
 * 將 japan-unlimited-esim 的 SoftBank / KDDI 拆成兩個電信商：
 *   1) SoftBank / KDDI          ← Japan-unlimited-*-A0（典型 8~20Mbps）
 *   2) SoftBank / KDDI 10Mbps   ← Japan(T+C)-unlimited-*-A0（每日1GB高速後10Mbps）
 *
 * 注意：Admin POST /admin/products/:id（含 options）在此商品會卡住，
 * 因此只走 variants/batch + /store/internal/product-content。
 * 新電信商選項值會在建立變體時自動出現。
 *
 * 用法：
 *   node scripts/split-japan-softbank-telecoms.mjs
 *   node scripts/split-japan-softbank-telecoms.mjs --dry-run
 *   node scripts/split-japan-softbank-telecoms.mjs --backend http://localhost:9000
 *   node scripts/split-japan-softbank-telecoms.mjs --profit 50 --reprice-existing
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";

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
const repriceExisting = args.includes("--reprice-existing");
const backendIdx = args.indexOf("--backend");
const profitIdx = args.indexOf("--profit");

const DEFAULT_PROFIT = Number(profitIdx >= 0 ? args[profitIdx + 1] : 50) || 50;
const TELECOM_FUP = "SoftBank / KDDI";
const TELECOM_10 = "SoftBank / KDDI 10Mbps";
const DATA_AMOUNT = "無限流量";
const HANDLE = "japan-unlimited-esim";
const BATCH = 20;

const FUP_NOTICE_FUP =
  "**公平使用政策 (FUP):** 無限流量，典型速度為8~20Mbps，實際速度可能有所變動。";
const FUP_NOTICE_10 =
  "**公平使用政策 (FUP):** 每日 1 GB 高速數據流量，用完後可享 10 Mbps 無限流量";
const ACTIVATION_DEFAULT =
  "注意: 我們建議您**抵達後再新增 eSIM**。 查看啟用政策。";

const MEDUSA_URL = (
  (backendIdx >= 0 ? args[backendIdx + 1] : null) ||
  process.env.MEDUSA_SYNC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const INTERNAL_SECRET = process.env.PRODUCT_CONTENT_ADMIN_SECRET || "";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

function retailFromCost(costTwd, profitPercent) {
  const m = 1 + Number(profitPercent) / 100;
  return Math.ceil((costTwd * m) / 10) * 10 - 1;
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
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const res = await fetch(`${base.replace(/\/$/, "")}/api/esim/list`, {
    headers: internalCatalogHeaders(),
  });
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
    throw new Error(`[${path}] 非 JSON: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(
      `[${path}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 400)}`,
    );
  }
  return data;
}

async function internalContent(body) {
  if (!INTERNAL_SECRET || INTERNAL_SECRET.length < 16) {
    throw new Error("缺少 PRODUCT_CONTENT_ADMIN_SECRET");
  }
  const res = await fetch(`${MEDUSA_URL}/store/internal/product-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Product-Admin-Secret": INTERNAL_SECRET,
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `product-content ${res.status}: ${data.error || data.detail || JSON.stringify(data).slice(0, 200)}`,
    );
  }
  return data;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function variantTelecom(product, variant) {
  for (const opt of product.options || []) {
    if (opt.title !== "電信商") continue;
    const vo = (variant.options || []).find((x) => x.option_id === opt.id);
    if (vo?.value) return String(vo.value).trim();
  }
  return String(variant.metadata?.carrier || "").trim();
}

function toCreatePayload(plan, telecom, fx, profitPercent) {
  const day = Number(plan.day);
  const costHkd = Number(plan.price || 0);
  const costTwd = Math.ceil(costHkd * fx);
  const retail = retailFromCost(costTwd, profitPercent);
  const daysLabel = `${day}天`;
  return {
    title: `日本 eSIM ${telecom}`,
    sku: plan.name,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: daysLabel,
      電信商: telecom,
      數據量: DATA_AMOUNT,
    },
    prices: [{ currency_code: "twd", amount: retail }],
    metadata: {
      plan_id: plan.id,
      type: "esim",
      carrier: telecom,
      data: DATA_AMOUNT,
      data_amount: DATA_AMOUNT,
      days: String(day),
      cost_hkd: String(costHkd),
      cost_price: costTwd,
      profit_percent: profitPercent,
      profit_margin: `${profitPercent}%`,
      apn: plan.apn || "",
      networks: plan.networks || "",
      rule_desc: plan.rule_desc || "",
      speed_desc: plan.speed || plan.speed_desc || "",
      attributes: {
        days: day,
        data: DATA_AMOUNT,
        data_amount: DATA_AMOUNT,
        telecom,
        network: "4G / 5G",
        route_type: "漫遊",
        speed_rule:
          telecom === TELECOM_10
            ? "每日1GB高速後10Mbps吃到飽"
            : "典型速度 8~20Mbps 無限流量",
      },
    },
  };
}

async function main() {
  console.log(`Medusa: ${MEDUSA_URL}`);
  console.log(
    `Handle: ${HANDLE} · profit=${DEFAULT_PROFIT}% · dryRun=${dryRun} · repriceExisting=${repriceExisting}`,
  );

  const fx = await fetchFxHkdToTwd();
  console.log(`FX HKD→TWD: ${fx.toFixed(4)}`);

  const plans = await fetchSupplierPlans();
  const fupPlans = plans
    .filter((p) => /^Japan-unlimited-\d+-A0$/i.test(String(p.name || "")))
    .sort((a, b) => Number(a.day) - Number(b.day));
  const tcPlans = plans
    .filter((p) =>
      /^Japan\(T\+C\)-unlimited-\d+-A0$/i.test(String(p.name || "")),
    )
    .sort((a, b) => Number(a.day) - Number(b.day));

  console.log(
    `供應商 SoftBank FUP: ${fupPlans.length} · 10Mbps: ${tcPlans.length}`,
  );
  if (!tcPlans.length) throw new Error("供應商找不到 Japan(T+C)-unlimited-*");

  const token = await login();
  const list = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.sku,*variants.metadata,*variants.prices,*variants.options,*options,*metadata`,
  );
  const product = list.products?.[0];
  if (!product) throw new Error("找不到商品");

  const existingSkus = new Set(
    (product.variants || []).map((v) => String(v.sku || "")),
  );

  // ── 1) 概覽 / 重點 / 規格 / 利潤（內部 API，避開會卡住的 admin product POST）──
  async function tryContent(label, body) {
    try {
      await internalContent(body);
      console.log(`✓ ${label}`);
      return true;
    } catch (e) {
      console.warn(`⚠ ${label} 失敗（可部署 backend 後重跑）: ${e.message}`);
      return false;
    }
  }

  if (!dryRun) {
    for (const [carrier, fup] of [
      [TELECOM_FUP, FUP_NOTICE_FUP],
      [TELECOM_10, FUP_NOTICE_10],
    ]) {
      await tryContent(`overview ${carrier}`, {
        productId: product.id,
        carrier,
        contentType: "overview",
        fup_notice: fup,
        activation_notice: ACTIVATION_DEFAULT,
        updatedBy: "split-japan-softbank",
      });
    }

    await tryContent("features SoftBank FUP", {
      productId: product.id,
      carrier: TELECOM_FUP,
      contentType: "features",
      features: [
        "KDDI / SoftBank 雙網",
        "無限流量",
        "典型速度 8~20Mbps",
        "4G / 5G",
      ],
      updatedBy: "split-japan-softbank",
    });
    await tryContent("features SoftBank 10Mbps", {
      productId: product.id,
      carrier: TELECOM_10,
      contentType: "features",
      features: [
        "KDDI / SoftBank 雙網",
        "無限流量 10Mbps",
        "每日 1GB 高速",
        "日本 IP",
        "4G / 5G",
      ],
      updatedBy: "split-japan-softbank",
    });

    await tryContent("specs SoftBank FUP", {
      productId: product.id,
      carrier: TELECOM_FUP,
      contentType: "specs",
      specs: {
        network: "KDDI / SoftBank 4G/5G",
        speed_rule: "典型速度 8~20Mbps 無限流量",
        route_type: "漫遊",
      },
      updatedBy: "split-japan-softbank",
    });
    await tryContent("specs SoftBank 10Mbps", {
      productId: product.id,
      carrier: TELECOM_10,
      contentType: "specs",
      specs: {
        network: "KDDI / SoftBank 4G/5G",
        speed_rule: "每日1GB高速後10Mbps無限流量",
        route_type: "漫遊",
        ip_type: "日本 IP",
      },
      updatedBy: "split-japan-softbank",
    });

    for (const carrier of [TELECOM_FUP, TELECOM_10]) {
      await tryContent(`profit ${carrier}`, {
        productId: product.id,
        carrier,
        contentType: "profit",
        profit_percent: DEFAULT_PROFIT,
        updatedBy: "split-japan-softbank",
      });
    }

    await tryContent("subtitle SoftBank FUP", {
      productId: product.id,
      carrier: TELECOM_FUP,
      contentType: "subtitle",
      subtitle: "漫遊雙網・典型速度 8~20Mbps 無限流量",
      updatedBy: "split-japan-softbank",
    });
    await tryContent("subtitle SoftBank 10Mbps", {
      productId: product.id,
      carrier: TELECOM_10,
      contentType: "subtitle",
      subtitle: "漫遊雙網・每日1GB高速後10Mbps無限流量",
      updatedBy: "split-japan-softbank",
    });
  } else {
    console.log("（dry-run）略過 product-content 寫入");
  }

  // ── 2) SoftBank FUP 變體 metadata ──
  const fupByName = Object.fromEntries(fupPlans.map((p) => [p.name, p]));
  const softbankUpdates = [];
  for (const v of product.variants || []) {
    const sku = String(v.sku || "");
    if (!/^Japan-unlimited-\d+-A0$/i.test(sku)) continue;
    const plan = fupByName[sku];
    if (!plan) {
      console.log(`· 略過（供應商無 SKU）: ${sku}`);
      continue;
    }
    const costHkd = Number(plan.price || 0);
    const costTwd = Math.ceil(costHkd * fx);
    const profitPercent =
      Number(v.metadata?.profit_percent) || DEFAULT_PROFIT;
    const retail = retailFromCost(costTwd, profitPercent);
    const old =
      v.prices?.find((p) => p.currency_code === "twd")?.amount ??
      v.prices?.[0]?.amount;
    const patch = {
      id: v.id,
      title: `日本 eSIM ${TELECOM_FUP}`,
      metadata: {
        ...(v.metadata || {}),
        plan_id: plan.id,
        carrier: TELECOM_FUP,
        cost_hkd: String(costHkd),
        cost_price: costTwd,
        profit_percent: profitPercent,
        profit_margin: `${profitPercent}%`,
        networks: plan.networks || "",
        rule_desc: plan.rule_desc || "",
        speed_desc: plan.speed || plan.speed_desc || "",
        attributes: {
          ...((v.metadata && v.metadata.attributes) || {}),
          telecom: TELECOM_FUP,
          data_amount: DATA_AMOUNT,
          speed_rule: "典型速度 8~20Mbps 無限流量",
        },
      },
    };
    if (repriceExisting) {
      patch.prices = [{ currency_code: "twd", amount: retail }];
    }
    softbankUpdates.push({
      ...patch,
      sku,
      old: Number(old) || 0,
      retail,
      costTwd,
    });
  }

  console.log(`\nSoftBank FUP 變體 metadata：${softbankUpdates.length}`);
  for (const u of softbankUpdates.slice(0, 5)) {
    console.log(
      `  ${u.sku} cost=${u.costTwd} price=${u.old}${repriceExisting ? ` → ${u.retail}` : ""}`,
    );
  }

  if (!dryRun && softbankUpdates.length) {
    for (const batch of chunk(softbankUpdates, BATCH)) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({
          update: batch.map(({ id, title, metadata, prices }) => ({
            id,
            title,
            metadata,
            ...(prices ? { prices } : {}),
          })),
        }),
      });
    }
    console.log("✓ SoftBank FUP 變體已更新");
  }

  // ── 3) 建立 / 補齊 SoftBank 10Mbps 變體 ──
  const toCreate = tcPlans
    .filter((p) => !existingSkus.has(p.name))
    .map((p) => toCreatePayload(p, TELECOM_10, fx, DEFAULT_PROFIT));

  // 已存在的（例如先前測試建的 5 天）→ 同步 metadata / 售價
  const toUpdateExisting = [];
  for (const v of product.variants || []) {
    const sku = String(v.sku || "");
    if (!/^Japan\(T\+C\)-unlimited-\d+-A0$/i.test(sku)) continue;
    const plan = tcPlans.find((p) => p.name === sku);
    if (!plan) continue;
    const payload = toCreatePayload(plan, TELECOM_10, fx, DEFAULT_PROFIT);
    toUpdateExisting.push({
      id: v.id,
      title: payload.title,
      metadata: payload.metadata,
      prices: payload.prices,
      sku,
    });
  }

  console.log(
    `\n10Mbps 新建 ${toCreate.length} · 更新既有 ${toUpdateExisting.length}`,
  );
  for (const c of toCreate) {
    console.log(
      `  + ${c.sku.padEnd(32)} cost=${c.metadata.cost_price} → NT$${c.prices[0].amount}`,
    );
  }

  if (!dryRun && toCreate.length) {
    for (const batch of chunk(toCreate, BATCH)) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
    }
    console.log("✓ SoftBank 10Mbps 變體已建立");
  }

  if (!dryRun && toUpdateExisting.length) {
    for (const batch of chunk(toUpdateExisting, BATCH)) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({
          update: batch.map(({ id, title, metadata, prices }) => ({
            id,
            title,
            metadata,
            prices,
          })),
        }),
      });
    }
    console.log("✓ SoftBank 10Mbps 既有變體已同步");
  }

  if (!dryRun) {
    const check = await admin(
      token,
      `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.sku,*variants.options,*options`,
    );
    const p2 = check.products?.[0];
    const counts = {};
    for (const v of p2.variants || []) {
      const t = variantTelecom(p2, v) || "?";
      counts[t] = (counts[t] || 0) + 1;
    }
    console.log("\n電信商變體數：", counts);
  }

  console.log("\n完成。");
  console.log(
    "改利潤趴：Medusa 變體 metadata 設 profit_percent（數字）後執行：",
  );
  console.log(
    '  node scripts/reprice-medusa-variants-by-profit.mjs --handle japan-unlimited-esim --telecom "SoftBank / KDDI 10Mbps"',
  );
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
