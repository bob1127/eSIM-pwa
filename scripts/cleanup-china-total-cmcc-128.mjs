/**
 * 中國大陸 eSIM 總量型 — 中國移動(CMCC) 只保留「用完降速 128kbps」
 * 刪除 terminate／用完斷網變體，並更新文案。
 *
 *   node scripts/cleanup-china-total-cmcc-128.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
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
      )
        v = v.slice(1, -1);
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
const HANDLE = "china-total-esim";
const TELECOM = "中國移動";
const BATCH = 40;

function is128kbps(v) {
  const rule = String(
    v.metadata?.rule_desc ||
      v.metadata?.speed_desc ||
      v.metadata?.attributes?.speed_rule ||
      "",
  ).toLowerCase();
  if (/terminate|用完斷網|\bstop\b/.test(rule)) return false;
  return /128\s*kbps/.test(rule);
}

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error("登入失敗");
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
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(
      `[${apiPath}] ${res.status}: ${data.message || text.slice(0, 300)}`,
    );
  }
  return data;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*metadata`,
  );
  const product = products?.[0];
  if (!product) throw new Error("product not found");

  const cmcc = (product.variants || []).filter((v) => {
    const t = v.metadata?.attributes?.telecom || v.metadata?.carrier || "";
    return t === TELECOM;
  });

  const keep = cmcc.filter(is128kbps);
  const drop = cmcc.filter((v) => !is128kbps(v));
  console.log(`中國移動：保留 128kbps ${keep.length}・刪除 ${drop.length}`);
  for (const v of drop) {
    console.log(`  - ${v.sku} rule=${v.metadata?.rule_desc}`);
  }

  if (drop.length) {
    for (const batch of chunk(
      drop.map((v) => v.id).filter(Boolean),
      BATCH,
    )) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ delete: batch }),
      });
    }
    console.log(`🗑 已刪 ${drop.length}`);
  }

  // 統一留下的 CMCC 變體 speed_rule 文案
  const updates = [];
  for (const v of keep) {
    const m = { ...(v.metadata || {}) };
    const attrs = {
      ...(typeof m.attributes === "object" && m.attributes ? m.attributes : {}),
    };
    attrs.speed_rule = "高速用完後降速至 128 kbps";
    attrs.gpt = false;
    attrs.tiktok = false;
    m.attributes = attrs;
    if (!/128/i.test(String(m.rule_desc || ""))) {
      m.rule_desc = "unlimited 128kbps";
    }
    updates.push({ id: v.id, metadata: m });
  }

  for (const [i, batch] of chunk(updates, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ update: batch }),
    });
    console.log(`  ~ metadata batch ${i + 1}: ${batch.length}`);
  }

  const meta = { ...(product.metadata || {}) };
  meta.carrier_specs_by_carrier = {
    ...(meta.carrier_specs_by_carrier || {}),
    [TELECOM]: {
      ...(meta.carrier_specs_by_carrier?.[TELECOM] || {}),
      ip_type: "香港IP",
      route_type: "漫遊",
      network: "4G/5G",
      speed_rule: "高速用完後降速至 128 kbps",
      apps: "熱點分享,Gemini",
    },
  };
  meta.key_features_by_carrier = {
    ...(meta.key_features_by_carrier || {}),
    [TELECOM]: ["總量型", "熱點分享", "4G / 5G", "高速用完後降速至 128 kbps"],
  };
  meta.subtitle_by_carrier = {
    ...(meta.subtitle_by_carrier || {}),
    [TELECOM]: "總量型・高速用完後降速至 128 kbps",
  };
  meta.overview_notices_by_carrier = {
    ...(meta.overview_notices_by_carrier || {}),
    [TELECOM]: {
      fup_notice:
        "總量型：高速流量用完後降速至 128 kbps（可持續使用）；不支援 GPT／TikTok（香港 IP）",
      activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
    },
  };

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({ metadata: meta }),
  });

  console.log("✅ 中國移動已限定為用完維持 128kbps");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
