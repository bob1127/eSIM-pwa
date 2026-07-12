/**
 * 重建「日本每日型eSIM」— 對齊無限方案選項結構：
 *   使用天數 / 電信商 / 數據量
 * （不要「線路」「方案」）
 *
 * SoftBank/KDDI：同一 天數×數據 取成本最低
 * IIJ Docomo：UI 28 筆全收
 */
import fs from "fs";

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const PRODUCT_HANDLE = process.env.PRODUCT_HANDLE || "daily-jp";
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.1);
const BATCH_SIZE = 50;

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(`登入失敗: ${data.message || res.status}`);
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
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${path}] 非 JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      `[${path}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 400)}`,
    );
  }
  return data;
}

function parseCarrier(p) {
  let rawOp = "";
  Object.entries(p).forEach(([, val]) => {
    if (typeof val === "string") {
      const v = val.trim();
      if (v.includes("[") && v.includes("]") && v.length > 5) rawOp = v.toUpperCase();
    }
  });
  if (rawOp && rawOp.length > 5) {
    return rawOp
      .split("|")
      .map((part) => {
        const [code, opsRaw] = part.split(":");
        if (!opsRaw) return part;
        return `${code} ${opsRaw.replace(/\[.*?\]/g, "").split(",").join(" / ")}`;
      })
      .join(" + ");
  }
  if ((p.apn || "").toLowerCase().includes("vmobile.jp")) return "JP IIJ(DOCOMO) + ";
  return "自動切換";
}

function isJapanDaily(p) {
  const exclude = [
    "ASIA", "GLOBAL", "WORLD", "EUROPE", "TOTAL COUNTRIES",
    "KOREA", "JAPAN/KOREA", "JAPAN KOREA",
  ];
  const pName = (p.name || "").toUpperCase();
  if (exclude.some((ex) => pName.includes(ex))) return false;
  const n = (p.name || "").toLowerCase();
  if (n.includes("total") || n.includes("unlimited")) return false;
  if (!n.includes("daily")) return false;
  const pCode = (p.code || "").toUpperCase();
  const full = JSON.stringify(p).toUpperCase();
  return (
    ["JP", "JPN"].some((c) => pCode === c || pCode.includes(c)) ||
    full.includes("JAPAN")
  );
}

function dataLabel(p) {
  const d = (p.data || "").toLowerCase();
  if (d.includes("500mb")) return "每日500MB";
  if (d.includes("1gb")) return "每日1GB";
  if (d.includes("2gb")) return "每日2GB";
  if (d.includes("3gb")) return "每日3GB";
  const m = (p.name || "").match(/Daily\s*([\d.]+[GM]B)/i);
  if (m) return `每日${m[1].toUpperCase()}`;
  return p.data || "未知";
}

function retailPrice(hkd) {
  const cost = Math.ceil(Number(hkd || 0) * HKD_TO_TWD);
  return Math.ceil((cost * 1.4) / 10) * 10 - 1;
}

/** SoftBank 重複時優先 (KDDI+SB)(T+C)-，其次非 5Mbps / 非漫遊U，最後才比價 */
function softbankScore(p) {
  const name = p.name || "";
  let s = 0;
  if (/\(KDDI\+SB\)\(T\+C\)/i.test(name) || /\(T\+C\)-Daily/i.test(name)) s += 1000;
  if (!/5mbps/i.test(name)) s += 100;
  if (!/-u-a\d/i.test(name) && !/-U-A/i.test(name)) s += 50;
  s += Math.max(0, 200 - Number(p.price || 0));
  return s;
}

function toRow(p, carrier) {
  return {
    name: p.name,
    day: String(p.day),
    dayLabel: `${p.day}天`,
    data: dataLabel(p),
    carrier,
    retail: retailPrice(p.price),
    planId: p.id,
    priceHkd: p.price,
    apn: p.apn || "",
    _score: softbankScore(p),
  };
}

function buildAll(raw) {
  const daily = raw.filter(isJapanDaily);

  // SoftBank / KDDI — 同 天數×數據 優先挑 (KDDI+SB)(T+C)-
  const sbMap = new Map();
  for (const p of daily) {
    const c = parseCarrier(p);
    if (!(/KDDI/i.test(c) && /SOFTBANK/i.test(c) && !/DOCOMO/i.test(c) && !/CHINA/i.test(c))) {
      continue;
    }
    const row = toRow(p, "SoftBank / KDDI");
    const key = `${row.day}|${row.data}`;
    const prev = sbMap.get(key);
    if (!prev || row._score > prev._score) {
      sbMap.set(key, row);
    }
  }

  // IIJ Docomo — 28 筆
  const iijMap = new Map();
  for (const p of daily) {
    if (parseCarrier(p) !== "JP IIJ(DOCOMO) + ") continue;
    const row = toRow(p, "IIJ Docomo");
    const key = `${row.day}|${row.data}`;
    if (!iijMap.has(key)) iijMap.set(key, row);
  }

  const softbank = [...sbMap.values()].map(({ _score, ...rest }) => rest);
  const iij = [...iijMap.values()].map(({ _score, ...rest }) => rest);
  return {
    softbank,
    iij,
    all: [...softbank, ...iij].sort(
      (a, b) =>
        a.carrier.localeCompare(b.carrier) ||
        Number(a.day) - Number(b.day) ||
        a.data.localeCompare(b.data),
    ),
  };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log("🔐 登入…", EMAIL);
  const token = await login();

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(PRODUCT_HANDLE)}&limit=1&fields=*variants`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${PRODUCT_HANDLE}`);
  console.log("✅", product.title, product.id);

  const cache = "/tmp/esim-plans.json";
  if (!fs.existsSync(cache)) throw new Error("缺少 /tmp/esim-plans.json");
  const { softbank, iij, all } = buildAll(
    JSON.parse(fs.readFileSync(cache, "utf8")).result || [],
  );
  console.log(`📋 SoftBank / KDDI: ${softbank.length}`);
  console.log(`📋 IIJ Docomo:      ${iij.length}`);
  console.log(`📋 合計:            ${all.length}`);

  const days = [...new Set(all.map((v) => v.dayLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const datas = [...new Set(all.map((v) => v.data))];
  const carriers = [...new Set(all.map((v) => v.carrier))];

  // 分頁抓舊變體（避免 *variants 一次載入 timeout）
  const oldIds = [];
  let offset = 0;
  for (;;) {
    const page = await admin(
      token,
      `/admin/products/${product.id}/variants?limit=${BATCH_SIZE}&offset=${offset}&fields=id,sku,title`,
    );
    const rows = page.variants || [];
    oldIds.push(...rows.map((v) => v.id));
    console.log(`   掃描變體 offset=${offset} → ${rows.length} 筆`);
    if (rows.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  if (oldIds.length) {
    console.log(`🗑️  刪除舊變體 ${oldIds.length}…`);
    let deleted = 0;
    for (const part of chunk(oldIds, BATCH_SIZE)) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ delete: part }),
      });
      deleted += part.length;
      console.log(`   已刪 ${deleted}/${oldIds.length}`);
    }
  } else {
    console.log("🗑️  無舊變體");
  }

  // 對齊無限方案：使用天數 / 電信商 / 數據量
  console.log("🧩 更新選項（使用天數 / 電信商 / 數據量）…");
  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      options: [
        { title: "使用天數", values: days },
        { title: "電信商", values: carriers },
        { title: "數據量", values: datas },
      ],
    }),
  });

  const payloads = all.map((v) => ({
    title: `日本每日 eSIM ${v.carrier}`,
    sku: v.name,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: v.dayLabel,
      電信商: v.carrier,
      數據量: v.data,
    },
    prices: [{ currency_code: "twd", amount: v.retail }],
    metadata: {
      plan_id: v.planId,
      type: "esim",
      carrier: v.carrier,
      data: v.data,
      days: v.day,
      cost_hkd: v.priceHkd,
      apn: v.apn,
    },
  }));

  let created = 0;
  const parts = chunk(payloads, BATCH_SIZE);
  console.log(`🚀 batch 建立 ${payloads.length}（${parts.length} 批）…`);
  const t0 = Date.now();
  for (let i = 0; i < parts.length; i++) {
    const result = await admin(
      token,
      `/admin/products/${product.id}/variants/batch`,
      { method: "POST", body: JSON.stringify({ create: parts[i] }) },
    );
    const n = result.created?.length || parts[i].length;
    created += n;
    console.log(`   批 ${i + 1}/${parts.length}: +${n}（累計 ${created}）`);
  }

  console.log("\n======= 完成 =======");
  console.log(`建立 ${created} 筆，耗時 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`後台: ${MEDUSA_URL}/app/products/${product.id}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
