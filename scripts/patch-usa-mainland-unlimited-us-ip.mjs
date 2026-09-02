/**
 * 同步 usa-mainland-unlimited-esim：供應商 IP=US（非舊快照 HK）
 *
 *   node scripts/patch-usa-mainland-unlimited-us-ip.mjs
 *   node scripts/patch-usa-mainland-unlimited-us-ip.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { usaMainlandUnlimitedKeyFeaturesByCarrier } from "../content/product-detailed/usa-region-key-features.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      let k = t.slice(0, i);
      let v = t.slice(i + 1);
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "usa-mainland-unlimited-esim";
const TELECOM = "Verizon / T-Mobile";
const LINE = "漫遊線路";
const BATCH = 40;

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`登入失敗: ${data.message || res.status}`);
  }
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
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${apiPath}] 非 JSON: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(
      `[${apiPath}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 500)}`,
    );
  }
  return data;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function patchVariantMetadata(meta = {}) {
  const attrs = { ...(meta.attributes || {}) };
  attrs.ip_type = "美國 IP";
  attrs.tiktok = true;
  attrs.apps = "ChatGPT、TikTok、Gemini；支援熱點";
  return {
    ...meta,
    ip: "US",
    attributes: attrs,
  };
}

async function main() {
  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,handle,metadata,*variants,*variants.metadata`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到商品 ${HANDLE}`);

  const md = { ...(product.metadata || {}) };
  md.subtitle_by_carrier = {
    ...(md.subtitle_by_carrier || {}),
    [TELECOM]: "Verizon / T-Mobile 5G｜吃到飽 FUP｜支援熱點｜美國 IP",
  };
  md.carrier_specs_by_carrier = {
    ...(md.carrier_specs_by_carrier || {}),
    [TELECOM]: {
      ...(md.carrier_specs_by_carrier?.[TELECOM] || {}),
      ip_type: "美國 IP",
      route_type: LINE,
      apn: "bicsapn",
      apps: "ChatGPT、TikTok、Gemini；支援熱點",
    },
  };
  md.key_features_by_carrier = usaMainlandUnlimitedKeyFeaturesByCarrier();

  const variantUpdates = (product.variants || []).map((v) => ({
    id: v.id,
    metadata: patchVariantMetadata(v.metadata || {}),
  }));

  console.log(`商品 ${product.id} · 變體 ${variantUpdates.length} 筆`);
  if (dryRun) {
    console.log("dry-run：", {
      subtitle: md.subtitle_by_carrier[TELECOM],
      ip_type: md.carrier_specs_by_carrier[TELECOM].ip_type,
      sampleSku: product.variants?.[0]?.sku,
    });
    return;
  }

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      description:
        "美國本土吃到飽 eSIM，電信 Verizon／T-Mobile（5G），支援熱點。出網為美國 IP（漫遊批發線路，非原生門號卡）。提供 1–10、15、20、25、30 天。FUP 典型速度約 8–20Mbps；阿拉斯加與夏威夷使用不保證。建議抵達後再新增 eSIM。",
      metadata: md,
    }),
  });
  console.log("✅ 已更新商品 metadata");

  for (const [i, batch] of chunk(variantUpdates, BATCH).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({
        update: batch.map(({ id, metadata }) => ({ id, metadata })),
      }),
    });
    console.log(`  ✅ 變體 batch ${i + 1}: ${batch.length}`);
  }

  console.log("\n完成。請再跑 push-carrier-detailed-content / push-carrier-faq-content 同步圖文 tab。");
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
