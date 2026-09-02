/**
 * 美國相關 eSIM 全品項稽核＋同步（不變更利潤趴數）
 *
 *   node scripts/audit-and-sync-usa-esim-all.mjs           # 僅稽核
 *   node scripts/audit-and-sync-usa-esim-all.mjs --fix     # 修正缺漏／錯誤欄位
 *   node scripts/audit-and-sync-usa-esim-all.mjs --fix --handle=usa-mainland-daily-usip-esim
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, "..", ".env.local"));

const fix = process.argv.includes("--fix");
const handleFilter = (() => {
  const arg = process.argv.find((a) => a.startsWith("--handle="));
  return arg ? arg.split("=")[1] : null;
})();

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 20;
const LINE = "漫遊線路";

/** @type {{ handle: string, planFiles: string[], line?: string }[]} */
const PRODUCTS = [
  {
    handle: "usa-mainland-unlimited-esim",
    planFiles: ["usa-mainland-unlimited-plans.json"],
  },
  {
    handle: "usa-mainland-daily-usip-esim",
    planFiles: [
      "usa-mainland-daily-usip-plans.json",
      "usa-mainland-daily-vztmo-plans.json",
    ],
  },
  {
    handle: "usa-mainland-total-usip-esim",
    planFiles: ["usa-mainland-total-usip-plans.json"],
  },
  {
    handle: "us-canada-unlimited-esim",
    planFiles: ["us-canada-unlimited-plans.json"],
  },
  {
    handle: "us-canada-daily-esim",
    planFiles: ["us-canada-daily-plans.json"],
  },
  {
    handle: "us-canada-total-esim",
    planFiles: ["us-canada-total-plans.json"],
  },
  {
    handle: "north-america-att-unlimited-esim",
    planFiles: ["north-america-att-unlimited-plans.json"],
    line: "本地線路",
  },
  {
    handle: "usa-native-unlimited-longterm-esim",
    planFiles: ["usa-native-unlimited-longterm-plans.json"],
    line: "本地線路",
  },
  {
    handle: "north-america-daily-usip-esim",
    planFiles: ["north-america-daily-usip-plans.json"],
  },
  {
    handle: "north-america-total-usip-esim",
    planFiles: ["north-america-total-usip-plans.json"],
  },
];

function retailFromCost(costTwd, profitPercent) {
  return Math.ceil((costTwd * (1 + profitPercent / 100)) / 10) * 10 - 1;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchCatalog() {
  for (const url of [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ].filter(Boolean)) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(120000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.result?.length) {
        console.log(`目錄 ${data.result.length} 筆 ← ${url}`);
        return data.result;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }
  throw new Error("無法取得方案目錄");
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

async function admin(token, apiPath, options = {}, retries = 4) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${MEDUSA_URL}${apiPath}`, {
        ...options,
        signal: AbortSignal.timeout(120000),
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
        throw new Error(`[${apiPath}] 非 JSON: ${text.slice(0, 300)}`);
      }
      if (!res.ok) {
        throw new Error(
          `[${apiPath}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 400)}`,
        );
      }
      return data;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr;
}

function refreshPlanJson(planFiles, allRows) {
  const byFile = {};
  for (const file of planFiles) {
    const fp = path.join(__dirname, "data", file);
    const raw = JSON.parse(fs.readFileSync(fp, "utf8"));
    const skusInFile = new Set((raw.plans || []).map((p) => p.sku));
    const plans = allRows
      .filter((r) => skusInFile.has(r.sku))
      .map(({ sku, plan_id, day, daysLabel, telecom, data, price_hkd, cost_twd, retail_twd, profit_percent, apn, networks, rule_desc, speed_desc, special_desc, ip, location }) => ({
        sku,
        plan_id,
        day,
        daysLabel,
        ...(telecom ? { telecom } : {}),
        ...(data ? { data } : {}),
        price_hkd,
        cost_twd,
        retail_twd,
        profit_percent,
        apn,
        networks,
        rule_desc,
        speed_desc,
        special_desc,
        ip,
        ...(location ? { location } : {}),
      }));
    fs.writeFileSync(
      fp,
      JSON.stringify(
        {
          ...raw,
          generated_at: new Date().toISOString(),
          hkd_to_twd: HKD_TO_TWD,
          plans,
        },
        null,
        2,
      ),
    );
  }
}

function toVariant(row, line = LINE) {
  const telecom = row.telecom;
  const data = row.data;
  const profit = row.profit_percent;
  const margin = 1 + profit / 100;
  return {
    title: `${telecom} · ${row.daysLabel} · ${data}`,
    sku: row.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: row.daysLabel,
      電信商: telecom,
      數據量: data,
      線路: line,
    },
    prices: [{ currency_code: "twd", amount: row.retail_twd }],
    metadata: {
      plan_id: row.plan_id,
      type: "esim",
      carrier: telecom,
      data,
      data_amount: data,
      days: String(row.day),
      cost_hkd: String(row.price_hkd),
      cost_price: row.cost_twd,
      profit_percent: profit,
      profit_margin: `${profit}%`,
      profit_rate: `${profit}%`,
      margin,
      apn: row.apn,
      networks: row.networks,
      rule_desc: row.rule_desc,
      speed_desc: row.speed_desc,
      special_desc: row.special_desc,
      ip: row.ip,
      hotspot: true,
      attributes: {
        days: row.day,
        data,
        data_amount: data,
        telecom,
        line,
        ip_type: row.ip === "US" ? "美國 IP" : row.ip === "SG" ? "新加坡 IP" : String(row.ip),
        route_type: line,
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
      },
    },
  };
}

function auditRows(expected, variants) {
  const bySku = Object.fromEntries((variants || []).map((v) => [v.sku, v]));
  const issues = [];
  const create = [];
  const update = [];

  for (const row of expected) {
    const cur = bySku[row.sku];
    if (!cur) {
      issues.push(`MISSING ${row.sku} (${row.telecom})`);
      create.push(toVariant(row, row._line || LINE));
      continue;
    }

    const md = cur.metadata || {};
    const profit = Number(md.profit_percent);
    const fixes = {};

    if (md.carrier !== row.telecom) {
      issues.push(`CARRIER ${row.sku}: ${md.carrier} → ${row.telecom}`);
    }
    if (String(md.plan_id) !== String(row.plan_id)) {
      issues.push(`PLAN_ID ${row.sku}`);
    }
    if (Number(md.cost_price) !== row.cost_twd) {
      issues.push(`COST ${row.sku}: ${md.cost_price} → ${row.cost_twd}`);
    }
    const expectedRetail = retailFromCost(row.cost_twd, profit || row.profit_percent);
    const curPrice = Number(cur.prices?.[0]?.amount);
    if (curPrice !== expectedRetail && profit === row.profit_percent) {
      issues.push(`PRICE ${row.sku}: NT$${curPrice} → NT$${expectedRetail} (profit ${profit}% 不變)`);
    }
    if (String(md.ip || "") !== String(row.ip || "")) {
      issues.push(`IP ${row.sku}: ${md.ip} → ${row.ip}`);
    }
    if (profit && profit !== row.profit_percent) {
      issues.push(`PROFIT_MISMATCH ${row.sku}: variant=${profit}% config=${row.profit_percent}% (不自動改)`);
    }

    const needUpdate =
      md.carrier !== row.telecom ||
      String(md.plan_id) !== String(row.plan_id) ||
      Number(md.cost_price) !== row.cost_twd ||
      (profit === row.profit_percent && curPrice !== expectedRetail) ||
      String(md.ip || "") !== String(row.ip || "");

    if (needUpdate) {
      const keepProfit = profit || row.profit_percent;
      const v = toVariant({
        ...row,
        profit_percent: keepProfit,
        retail_twd: retailFromCost(row.cost_twd, keepProfit),
      }, row._line || LINE);
      update.push({
        id: cur.id,
        title: v.title,
        options: v.options,
        prices: [{ currency_code: "twd", amount: retailFromCost(row.cost_twd, profit || row.profit_percent) }],
        metadata: { ...v.metadata, profit_percent: profit || row.profit_percent },
      });
    }
  }

  const expectedSkus = new Set(expected.map((r) => r.sku));
  for (const v of variants || []) {
    if (!expectedSkus.has(v.sku)) {
      issues.push(`EXTRA ${v.sku} (${v.metadata?.carrier}) — 不在方案 JSON`);
    }
  }

  return { issues, create, update };
}

async function processProduct(token, spec, catalogByName) {
  const { handle, planFiles, line } = spec;
  const allRows = [];
  const allStale = [];

  for (const file of planFiles) {
    const fp = path.join(__dirname, "data", file);
    if (!fs.existsSync(fp)) continue;
    const raw = JSON.parse(fs.readFileSync(fp, "utf8"));
    const defaultProfit = Number(raw.profit_percent) || null;
    const defaultTelecom = raw.telecom || null;
    const defaultData = raw.data || null;

    for (const p of raw.plans || []) {
      const sku = String(p.sku || "").trim();
      if (!sku) continue;
      const cat = catalogByName.get(sku);
      const telecom = p.telecom || defaultTelecom;
      const data = p.data || defaultData;
      const profit_percent =
        Number(p.profit_percent) || defaultProfit || 0;

      let price_hkd;
      let cost_twd;
      let plan_id;
      let apn;
      let networks;
      let rule_desc;
      let speed_desc;
      let special_desc;
      let ip;

      if (cat) {
        price_hkd = Number(cat.price) || 0;
        cost_twd = Math.ceil(price_hkd * HKD_TO_TWD);
        plan_id = cat.channel_dataplan_id || cat.id;
        apn = String(cat.apn || p.apn || "bicsapn").trim();
        networks = cat.networks || p.networks || "";
        rule_desc = cat.rule_desc || p.rule_desc || "";
        speed_desc = cat.speed_desc || cat.special_desc || p.speed_desc || "";
        special_desc = cat.special_desc || p.special_desc || "";
        ip = String(cat.ip || p.ip || "US").trim();
      } else {
        allStale.push(sku);
        price_hkd = Number(p.price_hkd) || 0;
        cost_twd = Number(p.cost_twd) || Math.ceil(price_hkd * HKD_TO_TWD);
        plan_id = p.plan_id;
        apn = String(p.apn || "bicsapn").trim();
        networks = p.networks || "";
        rule_desc = p.rule_desc || "";
        speed_desc = p.speed_desc || "";
        special_desc = p.special_desc || "";
        ip = String(p.ip || "US").trim();
      }

      allRows.push({
        ...p,
        sku,
        plan_id,
        price_hkd,
        cost_twd,
        profit_percent,
        retail_twd: retailFromCost(cost_twd, profit_percent),
        apn,
        networks,
        rule_desc,
        speed_desc,
        special_desc,
        ip,
        telecom,
        data,
        day: Number(p.day),
        daysLabel: p.daysLabel || `${p.day}天`,
        _line: line || LINE,
      });
    }
  }

  if (fix && allRows.length) {
    refreshPlanJson(planFiles, allRows);
  }

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(handle)}&limit=1&fields=id,*variants,*variants.metadata,*variants.prices`,
  );
  const product = products?.[0];
  if (!product) {
    console.log(`\n❌ ${handle} 找不到商品`);
    return { handle, ok: false };
  }

  const { issues, create, update } = auditRows(allRows, product.variants);

  console.log(`\n━━ ${handle} ━━`);
  console.log(`  目標 ${allRows.length} · 現有 ${(product.variants || []).length} · 目錄缺 SKU ${allStale.length}`);
  if (allStale.length) {
    console.log(`  ⚠️ 目錄暫無（用 JSON 快照驗證）: ${allStale.slice(0, 3).join(", ")}${allStale.length > 3 ? ` …+${allStale.length - 3}` : ""}`);
  }

  const actionable = issues.filter((i) => !i.startsWith("PROFIT_MISMATCH") && !i.startsWith("EXTRA"));
  if (actionable.length === 0 && issues.filter((i) => i.startsWith("EXTRA")).length === 0) {
    console.log("  ✅ 資料正確");
  } else {
    for (const i of issues.slice(0, 30)) console.log(`  · ${i}`);
    if (issues.length > 30) console.log(`  … +${issues.length - 30} 項`);
  }

  if (fix && (create.length || update.length)) {
    for (const [i, batch] of chunk(create, BATCH).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + create batch ${i + 1}: ${batch.length}`);
    }
    for (const [i, batch] of chunk(update, BATCH).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ update: batch }),
      });
      console.log(`  ↻ update batch ${i + 1}: ${batch.length}`);
    }
  }

  return {
    handle,
    ok: actionable.length === 0,
    expected: allRows.length,
    have: (product.variants || []).length,
    issues: issues.length,
    create: create.length,
    update: update.length,
  };
}

async function main() {
  console.log(`美國 eSIM 全品項稽核 fix=${fix}${handleFilter ? ` handle=${handleFilter}` : ""}`);
  const catalog = await fetchCatalog();
  const catalogByName = new Map(
    catalog.map((p) => [(p.channel_dataplan_name || p.name || "").trim(), p]),
  );

  const token = await login();
  const specs = handleFilter
    ? PRODUCTS.filter((p) => p.handle === handleFilter)
    : PRODUCTS;

  if (!specs.length) throw new Error(`未知 handle: ${handleFilter}`);

  const results = [];
  for (const spec of specs) {
    results.push(await processProduct(token, spec, catalogByName));
  }

  console.log("\n════ 摘要 ════");
  for (const r of results) {
    console.log(
      `${r.ok ? "✅" : "⚠️"} ${r.handle}: 目標 ${r.expected} · 問題 ${r.issues}${fix ? ` · 新建 ${r.create} · 更新 ${r.update}` : ""}`,
    );
  }
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
