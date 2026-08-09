/**
 * daily-jp 新增電信商 SoftBank（JapanSB-Daily* 自動設定）
 *   - 每日 <5GB（1/2/3GB）→ 70%
 *   - 每日 5GB → 50%
 *   - 每日 10GB → 70%
 *   - 只抓 APN 自動設定（無 username/password/CHAP）
 * SoftBank / KDDI、IIJ Docomo 不動；不 POST 整包 product（會 timeout）
 * 若缺電信／數據選項值，需先在 DB 寫入 product_option_value，或等 Medusa options API 可用。
 *
 *   HKD_TO_TWD=4.5 node scripts/patch-japan-daily-softbank-only.mjs
 *   HKD_TO_TWD=4.5 node scripts/patch-japan-daily-softbank-only.mjs --dry-run
 */
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "daily-jp";
const TELECOM = "SoftBank（注意：Android 通常需手動 APN）";
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 15;
const DRY = process.argv.includes("--dry-run");
const FUP =
  "公平使用政策 (FUP)：每日高速額度用完後降速至約 128 kbps，隔日重置。";

function retail(cost, profit) {
  return Math.ceil((cost * (1 + profit / 100)) / 10) * 10 - 1;
}

function isAutoApn(p) {
  const a = String(p.apn || "").toLowerCase();
  if (!a || a === "-" || a === "n/a") return false;
  return !(
    a.includes("username") ||
    a.includes("password") ||
    a.includes("chap")
  );
}

/** Daily5GB → 50%；其餘 JapanSB Daily（含 <5GB、10GB）→ 70% */
function profitForData(data) {
  const d = String(data || "");
  if (/Daily5GB|每日\s*5\s*GB/i.test(d) && !/10|15|20/i.test(d)) return 50;
  return 70;
}

function dataLabel(data) {
  const m = String(data || "").match(/Daily\s*(\d+)\s*GB/i);
  if (m) return `每日${m[1]}GB`;
  return String(data || "");
}

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

async function admin(token, path, options = {}, tries = 4) {
  let err;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(`${MEDUSA_URL}${path}`, {
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
          `${path} ${res.status}: ${data.message || text.slice(0, 200)}`,
        );
      }
      return data;
    } catch (e) {
      err = e;
      console.warn(`⚠️ ${path} (${i}/${tries}) ${e.message}`);
      await new Promise((r) => setTimeout(r, 1200 * i));
    }
  }
  throw err;
}

function chunk(a, n) {
  const o = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}

async function fetchPlans() {
  for (const url of [
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.result?.length) return data.result;
    } catch (e) {
      console.warn(url, e.message);
    }
  }
  throw new Error("無法抓方案目錄");
}

function buildRows(raw) {
  const map = new Map();
  for (const p of raw) {
    if (!/^JapanSB-Daily/i.test(p.name || "")) continue;
    if (!isAutoApn(p)) continue;
    const day = Number(p.day);
    const data = dataLabel(p.data);
    const profit = profitForData(p.data);
    const hkd = Number(p.price) || 0;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    const key = `${day}|${data}`;
    const row = {
      sku: p.name,
      plan_id: p.channel_dataplan_id || p.id,
      day,
      data,
      profit,
      price_hkd: hkd,
      cost_twd: cost,
      retail_twd: retail(cost, profit),
      apn: String(p.apn || "plus.4g").trim(),
      networks: p.networks || "JP:Softbank[4G;5G]|",
      rule_desc: p.rule_desc || "unlimited 128kbps",
      ip: String(p.ip || "JP").trim(),
    };
    const prev = map.get(key);
    if (!prev || hkd < prev.price_hkd) map.set(key, row);
  }
  return [...map.values()].sort(
    (a, b) =>
      a.data.localeCompare(b.data) || Number(a.day) - Number(b.day),
  );
}

function toVariant(r) {
  return {
    title: `${TELECOM} · ${r.day}天 · ${r.data}`,
    sku: `${r.sku}-SBN`,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: `${r.day}天`,
      電信商: TELECOM,
      數據量: r.data,
    },
    prices: [{ currency_code: "twd", amount: r.retail_twd }],
    metadata: {
      plan_id: r.plan_id,
      type: "esim",
      carrier: TELECOM,
      plan_kind: "daily",
      data: r.data,
      data_amount: r.data,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: r.cost_twd,
      profit_percent: r.profit,
      profit_margin: `${r.profit}%`,
      profit_rate: `${r.profit}%`,
      margin: 1 + r.profit / 100,
      supplier_sku: r.sku,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      ip: r.ip,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: TELECOM,
        network: "SoftBank 4G/5G",
        ip_type: "日本 IP",
        route_type: "漫遊eSIM",
        hotspot: true,
        speed_rule: FUP,
        fup: FUP,
        apn: r.apn,
        apn_manual_android: true,
        apps: "注意：Android 手機通常需另外手動設定 APN：plus.4g",
      },
    },
  };
}

async function main() {
  console.log(
    `💱 HKD→TWD ${HKD_TO_TWD}｜新增 ${TELECOM}｜JapanSB 自動設定`,
  );
  const rows = buildRows(await fetchPlans());
  if (!rows.length) throw new Error("找不到 JapanSB-Daily 自動設定方案");

  const byProfit = {};
  for (const r of rows) {
    byProfit[r.profit] = (byProfit[r.profit] || 0) + 1;
  }
  const d1 = rows.filter((r) => r.day === 1);
  console.log("核對 1天：");
  for (const r of d1) {
    console.log(
      `  ${r.data} HKD ${r.price_hkd} → cost ${r.cost_twd} → NT$${r.retail_twd}（${r.profit}%）`,
    );
  }
  console.log(
    `共 ${rows.length} 筆｜利潤分佈`,
    byProfit,
    DRY ? "（dry-run）" : "",
  );

  if (DRY) return;

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,title,handle`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);
  console.log("✅", product.id, product.title);

  // 刪掉舊 SoftBank-only（同電信名或 -SBN SKU），保留 SoftBank / KDDI
  const deleteIds = [];
  let offset = 0;
  for (;;) {
    const page = await admin(
      token,
      `/admin/products/${product.id}/variants?limit=40&offset=${offset}&fields=id,sku,title,metadata`,
    );
    const vs = page.variants || [];
    for (const v of vs) {
      const sku = v.sku || "";
      const carrier = String(
        v.metadata?.carrier || v.metadata?.attributes?.telecom || "",
      );
      const title = v.title || "";
      const isSbn =
        /-SBN$/i.test(sku) ||
        /^JapanSB-Daily/i.test(sku) ||
        carrier === TELECOM ||
        (/SoftBank/i.test(carrier) &&
          !/KDDI/i.test(carrier) &&
          /Android|手動 APN|手動APN/i.test(carrier)) ||
        (/SoftBank/i.test(title) &&
          !/KDDI/i.test(title) &&
          /Android|手動 APN|手動APN/i.test(title));
      if (isSbn) deleteIds.push(v.id);
    }
    console.log(
      `  掃描 offset=${offset} → ${vs.length}（待刪 SoftBank-only ${deleteIds.length}）`,
    );
    if (vs.length < 40) break;
    offset += 40;
  }

  if (deleteIds.length) {
    for (const part of chunk(deleteIds, BATCH)) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ delete: part }),
      });
    }
    console.log(`🗑 已刪舊 SoftBank-only ${deleteIds.length}`);
  }

  const create = rows.map(toVariant);
  for (const [i, part] of chunk(create, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: part }),
    });
    console.log(`  + batch ${i + 1}: ${part.length}`);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log("\n======= 完成 =======");
  console.log(
    `前台: /product/japan/${HANDLE}?telecom=softbank&data_amount=${encodeURIComponent("每日1GB")}`,
  );
  console.log(`SoftBank 變體: ${create.length}`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
