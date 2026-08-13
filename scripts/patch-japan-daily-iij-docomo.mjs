/**
 * 僅更新 daily-jp 的 IIJ Docomo 變體 → Japan-LocalIIJ-Daily3GB-* @ 95%
 * SoftBank / KDDI 變體不動
 *
 *   HKD_TO_TWD=4.5 node scripts/patch-japan-daily-iij-docomo.mjs
 */
import fs from "fs";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "daily-jp";
const TELECOM = "IIJ Docomo（注意：需手動設定 APN）";
const PROFIT = 95;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.5);
const BATCH = 40;

function retail(cost, profit) {
  return Math.ceil((cost * (1 + profit / 100)) / 10) * 10 - 1;
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
        throw new Error(`${path} ${res.status}: ${data.message || text.slice(0, 200)}`);
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
      const res = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.result?.length) return data.result;
    } catch (e) {
      console.warn(url, e.message);
    }
  }
  throw new Error("無法抓方案目錄");
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD}｜IIJ Docomo → LocalIIJ-Daily3GB @${PROFIT}%`);
  const plans = (await fetchPlans()).filter((p) =>
    /^Japan-LocalIIJ-Daily3GB-/i.test(p.name || ""),
  );
  const byDay = new Map();
  for (const p of plans) {
    const day = Number(p.day);
    const hkd = Number(p.price) || 0;
    const prev = byDay.get(day);
    if (!prev || hkd < prev.price_hkd) {
      byDay.set(day, {
        sku: p.name,
        plan_id: p.channel_dataplan_id || p.id,
        day,
        price_hkd: hkd,
        apn: String(p.apn || "vmobile.jp").trim(),
        networks: p.networks || "JP:DOCOMO[4G;LTE]|",
        rule_desc: p.rule_desc || "unlimited 256kbps",
        special_desc: p.special_desc || "",
        ip: String(p.ip || "JP").trim(),
      });
    }
  }
  const rows = [...byDay.values()].sort((a, b) => a.day - b.day);
  if (!rows.length) throw new Error("找不到 Japan-LocalIIJ-Daily3GB");

  const d1 = rows.find((r) => r.day === 1);
  const cost1 = Math.ceil(d1.price_hkd * HKD_TO_TWD);
  console.log(
    `核對 1天: HKD ${d1.price_hkd} → cost ${cost1} → 售價 ${retail(cost1, PROFIT)}（${PROFIT}%）｜共 ${rows.length} 天`,
  );

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,title,handle,metadata,options`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);
  console.log("✅", product.id, product.title);

  // 找出舊 IIJ Docomo 變體
  const deleteIds = [];
  let offset = 0;
  for (;;) {
    const page = await admin(
      token,
      `/admin/products/${product.id}/variants?limit=${BATCH}&offset=${offset}&fields=id,sku,title,metadata`,
    );
    const vs = page.variants || [];
    for (const v of vs) {
      const carrier = v.metadata?.carrier || v.metadata?.attributes?.telecom || "";
      const title = v.title || "";
      const sku = v.sku || "";
      if (
        /IIJ/i.test(carrier) ||
        /IIJ/i.test(title) ||
        /IIJ|LocalIIJ|JapanIIJ/i.test(sku)
      ) {
        deleteIds.push(v.id);
      }
    }
    console.log(`  掃描 offset=${offset} → ${vs.length}（累計待刪 IIJ ${deleteIds.length}）`);
    if (vs.length < BATCH) break;
    offset += BATCH;
  }

  if (deleteIds.length) {
    for (const part of chunk(deleteIds, BATCH)) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ delete: part }),
      });
    }
    console.log(`🗑 已刪舊 IIJ 變體 ${deleteIds.length}`);
  } else {
    console.log("無舊 IIJ 變體可刪");
  }

  const dayLabels = rows.map((r) => `${r.day}天`);
  const fup =
    "公平使用政策 (FUP)：每日高速額度用完後降速至約 256 kbps，隔日重置。";

  const create = rows.map((r) => {
    const cost = Math.ceil(r.price_hkd * HKD_TO_TWD);
    const amount = retail(cost, PROFIT);
    return {
      title: `${TELECOM} · ${r.day}天 · 每日3GB`,
      sku: `${r.sku}-IIJ`,
      manage_inventory: false,
      allow_backorder: false,
      options: {
        使用天數: `${r.day}天`,
        電信商: TELECOM,
        數據量: "每日3GB",
      },
      prices: [{ currency_code: "twd", amount }],
      metadata: {
        plan_id: r.plan_id,
        type: "esim",
        carrier: TELECOM,
        plan_kind: "daily",
        data: "每日3GB",
        data_amount: "每日3GB",
        days: String(r.day),
        cost_hkd: String(r.price_hkd),
        cost_price: cost,
        profit_percent: PROFIT,
        profit_margin: `${PROFIT}%`,
        profit_rate: `${PROFIT}%`,
        margin: 1 + PROFIT / 100,
        supplier_sku: r.sku,
        apn: r.apn || "vmobile.jp",
        networks: r.networks,
        rule_desc: r.rule_desc,
        special_desc: r.special_desc,
        ip: r.ip,
        attributes: {
          days: r.day,
          data: "每日3GB",
          data_amount: "每日3GB",
          telecom: TELECOM,
          network: "DOCOMO 4G/LTE（IIJ）",
          ip_type: "日本 IP",
          route_type: "原生eSIM",
          hotspot: true,
          speed_rule: fup,
          fup,
          apn: r.apn || "vmobile.jp",
          apn_manual: true,
          apps: "需手動設定 APN：vmobile.jp",
        },
      },
    };
  });

  for (const [i, part] of chunk(create, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: part }),
    });
    console.log(`  + batch ${i + 1}: ${part.length}`);
  }

  // 合併選項（保留 SoftBank 既有天數／數據，補上 IIJ）
  const allDays = new Set(dayLabels);
  const allData = new Set(["每日3GB"]);
  // 再掃一頁 SoftBank 變體補 options
  offset = 0;
  for (;;) {
    const page = await admin(
      token,
      `/admin/products/${product.id}/variants?limit=${BATCH}&offset=${offset}&fields=id,options,metadata`,
    );
    const vs = page.variants || [];
    for (const v of vs) {
      const days = v.metadata?.days;
      const data = v.metadata?.data_amount || v.metadata?.data;
      if (days) allDays.add(`${days}天`.replace(/天天/, "天"));
      if (data) allData.add(String(data));
      for (const o of v.options || []) {
        if (o.option?.title === "使用天數" || o.title === "使用天數") {
          allDays.add(o.value || o);
        }
      }
    }
    if (vs.length < BATCH) break;
    offset += BATCH;
  }

  const dayValues = [...allDays].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = [...allData];

  const meta = { ...(product.metadata || {}) };
  meta.carrier_profit_by_carrier = {
    ...(meta.carrier_profit_by_carrier || {}),
    [TELECOM]: PROFIT,
  };
  meta.subtitle_by_carrier = {
    ...(meta.subtitle_by_carrier || {}),
    [TELECOM]:
      "原生eSIM｜IIJ Docomo（DOCOMO）｜每日3GB｜日本 IP｜需手動 APN vmobile.jp",
  };

  // 僅更新 metadata（勿改 options：daily-jp 變體多時整包 POST 會 statement timeout）
  try {
    await admin(
      token,
      `/admin/products/${product.id}?fields=id,metadata`,
      {
        method: "POST",
        body: JSON.stringify({ metadata: meta }),
      },
      2,
    );
    console.log("📝 metadata 已更新（IIJ Docomo 95%／每日3GB）");
  } catch (e) {
    console.warn(
      "⚠️ metadata 更新逾時（變體已建立）。可之後再補：",
      e.message,
    );
  }

  console.log("\n======= 完成 =======");
  console.log(
    `前台: /product/japan/${HANDLE}?telecom=iij-docomo&data_amount=${encodeURIComponent("每日3GB")}`,
  );
  console.log(
    `IIJ Docomo 變體: ${create.length}（LocalIIJ-Daily3GB @${PROFIT}%）`,
  );
  console.log("options 天數／數據參考:", dayValues.join(","), "|", dataValues.join(","));
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
