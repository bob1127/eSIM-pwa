/**
 * 修正總量型 GPT + TikTok：移除誤植的「50–70 Mbps」
 * （供應商 China(T+C)-Total* 只有 terminate，無 Mbps）
 *
 *   node scripts/fix-china-total-tc-speed-copy.mjs
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
  } catch {}
}
loadEnvLocal();

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "china-total-esim";
const TELECOM = "GPT + TikTok";
const SPEED = "流量用完即斷網（實際速度依當地網路）";
const BATCH = 40;

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
    throw new Error(`[${apiPath}] ${res.status}: ${data.message || text.slice(0, 300)}`);
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

  const vs = (product.variants || []).filter((v) => {
    const t = v.metadata?.attributes?.telecom || v.metadata?.carrier || "";
    return t === TELECOM || /China\(T\+C\)-Total/i.test(v.sku || "");
  });
  console.log(`GPT + TikTok variants: ${vs.length}`);

  const updates = vs.map((v) => {
    const m = { ...(v.metadata || {}) };
    const attrs = {
      ...(typeof m.attributes === "object" && m.attributes ? m.attributes : {}),
    };
    attrs.speed_rule = SPEED;
    m.attributes = attrs;
    m.rule_desc = m.rule_desc || "terminate";
    m.speed_desc = "";
    return { id: v.id, metadata: m };
  });

  for (const [i, batch] of chunk(updates, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ update: batch }),
    });
    console.log(`  ~ variants batch ${i + 1}: ${batch.length}`);
  }
  console.log(`✅ 已更新 ${updates.length} 個變體 speed_rule`);

  const meta = { ...(product.metadata || {}) };
  meta.carrier_specs_by_carrier = {
    ...(meta.carrier_specs_by_carrier || {}),
    [TELECOM]: {
      ...(meta.carrier_specs_by_carrier?.[TELECOM] || {}),
      ip_type: "新加坡IP",
      route_type: "漫遊",
      network: "CUCC 4G/5G",
      speed_rule: SPEED,
      apps: "熱點分享,ChatGPT,TikTok",
    },
  };
  meta.key_features_by_carrier = {
    ...(meta.key_features_by_carrier || {}),
    [TELECOM]: ["總量型", "支援 TikTok", "支援 ChatGPT", "用完斷網", "4G / 5G"],
  };
  meta.subtitle_by_carrier = {
    ...(meta.subtitle_by_carrier || {}),
    [TELECOM]: "總量型・流量用完即斷網・支援 TikTok 與 ChatGPT",
  };
  meta.overview_notices_by_carrier = {
    ...(meta.overview_notices_by_carrier || {}),
    [TELECOM]: {
      fup_notice: "流量統計型：流量用完即斷網；支援 GPT / TikTok",
      activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
    },
  };

  // 保留其餘 metadata，只覆寫 GPT+TikTok 相關文案
  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({ metadata: meta }),
  });
  console.log("✅ product metadata 已去掉 50–70 Mbps");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
