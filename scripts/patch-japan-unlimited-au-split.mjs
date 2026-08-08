/**
 * japan-unlimited-esim 調整：
 *   SoftBank / KDDI → AU(KDDI) 10Mbps（Japan-Local-unlimited* 限速 10Mbps）@95%
 *   AU(KDDI) → AU(KDDI) 高速數據（真不限速 / High Speed）@65%
 * SoftBank / KDDI 10Mbps（T+C）、IIJ Docomo 保留
 *
 *   HKD_TO_TWD=4.5 node scripts/patch-japan-unlimited-au-split.mjs
 *   HKD_TO_TWD=4.5 node scripts/patch-japan-unlimited-au-split.mjs --dry-run
 */
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "japan-unlimited-esim";
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 15;
const DRY = process.argv.includes("--dry-run");

const TELECOM_10 = "AU(KDDI) 10Mbps";
const TELECOM_HS = "AU(KDDI) 高速數據";
const PROFIT_10 = 95;
const PROFIT_HS = 65;
const DATA = "無限流量";

function retail(cost, profit) {
  return Math.ceil((cost * (1 + profit / 100)) / 10) * 10 - 1;
}

function is10Mbps(p) {
  return /10\s*mbps/i.test(String(p.rule_desc || ""));
}

/** 真・高速：優先 Unlimited High Speed；否則 unlimited（非 10Mbps） */
function isHighSpeed(p) {
  const rule = String(p.rule_desc || "").trim();
  if (/10\s*mbps/i.test(rule)) return false;
  return /high\s*speed/i.test(rule) || /^unlimited$/i.test(rule);
}

function highSpeedScore(p) {
  const rule = String(p.rule_desc || "");
  let s = 0;
  if (/high\s*speed/i.test(rule)) s += 1000;
  if (/username|password|chap/i.test(String(p.apn || ""))) s += 100;
  s += Math.max(0, 200 - Number(p.price || 0));
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
      await new Promise((r) => setTimeout(r, 1000 * i));
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

function pickByDay(raw, pred, profit, scoreFn) {
  const map = new Map();
  for (const p of raw) {
    if (!/^Japan-Local-unlimited-/i.test(p.name || "")) continue;
    if (!pred(p)) continue;
    const day = Number(p.day);
    const hkd = Number(p.price) || 0;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    const score = scoreFn ? scoreFn(p) : Math.max(0, 500 - hkd);
    const prev = map.get(day);
    if (!prev || score > prev._score) {
      map.set(day, {
        sku: p.name,
        plan_id: p.channel_dataplan_id || p.id,
        day,
        price_hkd: hkd,
        cost_twd: cost,
        retail_twd: retail(cost, profit),
        profit,
        apn: String(p.apn || "").trim(),
        networks: p.networks || "JP:KDDI[4G;5G]|",
        rule_desc: p.rule_desc || "",
        ip: String(p.ip || "JP").trim(),
        _score: score,
      });
    }
  }
  return [...map.values()]
    .map(({ _score, ...rest }) => rest)
    .sort((a, b) => a.day - b.day);
}

function toVariant(r, telecom, kind) {
  const manual = /username|password|chap/i.test(r.apn);
  const fup =
    kind === "10"
      ? "公平使用政策 (FUP)：限速約 10 Mbps 吃到飽（實際速度依位置與網路環境變動）。"
      : "公平使用政策 (FUP)：高速數據吃到飽，實際速度取決於位置及網路環境（真・不限速）。";
  return {
    title: `${telecom} · ${r.day}天 · ${DATA}`,
    sku: `${r.sku}-${kind === "10" ? "AU10" : "AUHS"}`,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: `${r.day}天`,
      電信商: telecom,
      數據量: DATA,
    },
    prices: [{ currency_code: "twd", amount: r.retail_twd }],
    metadata: {
      plan_id: r.plan_id,
      type: "esim",
      carrier: telecom,
      plan_kind: "unlimited",
      data: DATA,
      data_amount: DATA,
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
        data: DATA,
        data_amount: DATA,
        telecom,
        network: "AU(KDDI) 4G/5G",
        ip_type: "日本 IP",
        route_type: "原生eSIM",
        hotspot: true,
        speed_rule: fup,
        fup,
        apn: r.apn,
        apn_manual: manual,
        apps: manual
          ? "需手動設定 APN（au.5g.au-net.ne.jp）"
          : "APN 自動設定",
      },
    },
  };
}

function shouldDelete(v) {
  const sku = v.sku || "";
  const carrier = String(v.metadata?.carrier || "");
  const title = v.title || "";
  // 舊 SoftBank / KDDI（非 10Mbps T+C）
  if (/^Japan-unlimited-/i.test(sku)) return true;
  if (carrier === "SoftBank / KDDI") return true;
  if (/SoftBank \/ KDDI/i.test(title) && !/10\s*Mbps/i.test(title)) return true;
  // 舊 AU Local（無後綴或舊 AU）
  if (/^Japan-Local-unlimited-/i.test(sku) && !/-(AU10|AUHS)$/i.test(sku)) {
    return true;
  }
  if (carrier === "AU(KDDI)" || carrier === TELECOM_10 || carrier === TELECOM_HS) {
    return true;
  }
  if (/^AU\(KDDI\)/i.test(title)) return true;
  return false;
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD}`);
  console.log(`  ${TELECOM_10} @${PROFIT_10}% ← Local 10Mbps`);
  console.log(`  ${TELECOM_HS} @${PROFIT_HS}% ← Local 高速`);

  const raw = await fetchPlans();
  const rows10 = pickByDay(raw, is10Mbps, PROFIT_10, (p) =>
    Math.max(0, 500 - Number(p.price || 0)),
  );
  const rowsHs = pickByDay(raw, isHighSpeed, PROFIT_HS, highSpeedScore);
  if (!rows10.length) throw new Error("找不到 Local 10Mbps");
  if (!rowsHs.length) throw new Error("找不到 Local 高速數據");

  console.log("核對：");
  for (const r of [rows10.find((x) => x.day === 4), rows10.find((x) => x.day === 3)].filter(Boolean)) {
    console.log(
      `  [10Mbps] ${r.day}天 ${r.sku} HKD ${r.price_hkd} → NT$${r.retail_twd}`,
    );
  }
  for (const r of [rowsHs.find((x) => x.day === 3), rowsHs.find((x) => x.day === 4)].filter(Boolean)) {
    console.log(
      `  [高速] ${r.day}天 ${r.sku} HKD ${r.price_hkd} → NT$${r.retail_twd}`,
    );
  }
  console.log(`共 10Mbps ${rows10.length} + 高速 ${rowsHs.length}`, DRY ? "（dry-run）" : "");
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
      if (shouldDelete(v)) deleteIds.push(v.id);
    }
    console.log(
      `  掃描 offset=${offset} → ${vs.length}（待刪 ${deleteIds.length}）`,
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
    console.log(`🗑 已刪 ${deleteIds.length}`);
  }

  const create = [
    ...rows10.map((r) => toVariant(r, TELECOM_10, "10")),
    ...rowsHs.map((r) => toVariant(r, TELECOM_HS, "hs")),
  ];

  for (const [i, part] of chunk(create, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: part }),
    });
    console.log(`  + batch ${i + 1}: ${part.length}`);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log("\n======= 變體完成 =======");
  console.log(`${TELECOM_10}: ${rows10.length} @${PROFIT_10}%`);
  console.log(`${TELECOM_HS}: ${rowsHs.length} @${PROFIT_HS}%`);
  console.log("接著請執行選項值 rename（腳本末尾已嘗試）或 SQL。");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
