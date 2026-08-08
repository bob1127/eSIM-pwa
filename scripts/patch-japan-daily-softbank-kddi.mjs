/**
 * daily-jp SoftBank / KDDI → 只抓 Japan(KDDI+SB)(T+C)-Daily* @ 80%
 * 同天數／數據優先非 5mbps（標準 128kbps）
 * SoftBank-only（-SBN）、IIJ Docomo 不動
 *
 *   HKD_TO_TWD=4.5 node scripts/patch-japan-daily-softbank-kddi.mjs
 *   HKD_TO_TWD=4.5 node scripts/patch-japan-daily-softbank-kddi.mjs --dry-run
 */
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "daily-jp";
const TELECOM = "SoftBank / KDDI";
const PROFIT = 80;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 15;
const DRY = process.argv.includes("--dry-run");
const FUP =
  "公平使用政策 (FUP)：每日高速額度用完後降速至約 128 kbps，隔日重置。";

function retail(cost, profit) {
  return Math.ceil((cost * (1 + profit / 100)) / 10) * 10 - 1;
}

function dataLabel(data, name) {
  const m = String(data || name || "").match(/Daily\s*(\d+)\s*(GB|MB)/i);
  if (m) return `每日${m[1]}${m[2].toUpperCase()}`;
  if (/500\s*MB/i.test(String(data || name))) return "每日500MB";
  return String(data || "");
}

/** 分數越高越優先：非 5mbps > 較低價 */
function score(p) {
  let s = 0;
  if (!/5mbps/i.test(p.name || "")) s += 1000;
  s += Math.max(0, 500 - Number(p.price || 0));
  return s;
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
    if (!/^Japan\(KDDI\+SB\)\(T\+C\)-Daily/i.test(p.name || "")) continue;
    const day = Number(p.day);
    const data = dataLabel(p.data, p.name);
    const hkd = Number(p.price) || 0;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    const key = `${day}|${data}`;
    const row = {
      sku: p.name,
      plan_id: p.channel_dataplan_id || p.id,
      day,
      data,
      price_hkd: hkd,
      cost_twd: cost,
      retail_twd: retail(cost, PROFIT),
      apn: String(p.apn || "e-ideas").trim(),
      networks: p.networks || "JP:KDDI[4G;LTE;5G],Softbank[4G;LTE;5G]|",
      rule_desc: p.rule_desc || "unlimited 128kbps",
      ip: String(p.ip || "SG").trim(),
      _score: score(p),
    };
    const prev = map.get(key);
    if (!prev || row._score > prev._score) map.set(key, row);
  }
  return [...map.values()]
    .map(({ _score, ...rest }) => rest)
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) || Number(a.day) - Number(b.day),
    );
}

function toVariant(r) {
  return {
    title: `${TELECOM} · ${r.day}天 · ${r.data}`,
    sku: `${r.sku}-SB`,
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
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: 1 + PROFIT / 100,
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
        network: "KDDI / SoftBank 4G/5G",
        ip_type: "新加坡 IP",
        route_type: "漫遊eSIM",
        hotspot: true,
        speed_rule: FUP,
        fup: FUP,
        apn: r.apn,
        apps: "APN 自動設定（e-ideas）",
      },
    },
  };
}

function isSoftBankKddiVariant(v) {
  if (/-SBN$/i.test(v.sku || "")) return false;
  if (/LocalIIJ|-IIJ$/i.test(v.sku || "")) return false;
  const carrier = String(
    v.metadata?.carrier || v.metadata?.attributes?.telecom || "",
  );
  const title = v.title || "";
  if (carrier === TELECOM) return true;
  if (/SoftBank\s*\/\s*KDDI/i.test(carrier) && !/10\s*Mbps/i.test(carrier)) {
    return true;
  }
  if (/SoftBank\s*\/\s*KDDI/i.test(title) && !/10\s*Mbps/i.test(title)) {
    return true;
  }
  // 舊 SKU 未帶 -SB 後綴但屬 T+C / SoftBank KDDI 雙網
  if (
    /Japan\(KDDI\+SB\)\(T\+C\)-Daily/i.test(v.sku || "") ||
    (/SoftBank/i.test(title) &&
      /KDDI/i.test(title) &&
      !/Android|手動/i.test(title) &&
      !/10\s*Mbps/i.test(title))
  ) {
    return true;
  }
  return false;
}

async function main() {
  console.log(
    `💱 HKD→TWD ${HKD_TO_TWD}｜${TELECOM} → Japan(KDDI+SB)(T+C) @${PROFIT}%`,
  );
  const rows = buildRows(await fetchPlans());
  if (!rows.length) throw new Error("找不到 Japan(KDDI+SB)(T+C)-Daily");

  const d1 = rows.filter((r) => r.day === 1);
  console.log("核對 1天：");
  for (const r of d1) {
    console.log(
      `  ${r.data} ${r.sku} HKD ${r.price_hkd} → cost ${r.cost_twd} → NT$${r.retail_twd}`,
    );
  }
  console.log(`共 ${rows.length} 筆`, DRY ? "（dry-run）" : "");
  if (DRY) return;

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,title,handle`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);
  console.log("✅", product.id, product.title);

  const deleteIds = [];
  let offset = 0;
  for (;;) {
    const page = await admin(
      token,
      `/admin/products/${product.id}/variants?limit=40&offset=${offset}&fields=id,sku,title,metadata`,
    );
    const vs = page.variants || [];
    for (const v of vs) {
      if (isSoftBankKddiVariant(v)) deleteIds.push(v.id);
    }
    console.log(
      `  掃描 offset=${offset} → ${vs.length}（待刪 SoftBank/KDDI ${deleteIds.length}）`,
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
    console.log(`🗑 已刪舊 SoftBank/KDDI ${deleteIds.length}`);
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
    `前台: /product/japan/${HANDLE}?telecom=softbank-kddi&data_amount=${encodeURIComponent("每日500MB")}`,
  );
  console.log(`SoftBank / KDDI 變體: ${create.length} @${PROFIT}%`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
