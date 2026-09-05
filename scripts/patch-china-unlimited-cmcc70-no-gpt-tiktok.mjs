/**
 * CMCC 70Mbps（china-unlimited-esim）：ChatGPT／TikTok 改為不保證，
 * 並同步 carrier_specs／變體旗標／重點特色。
 *
 *   node scripts/patch-china-unlimited-cmcc70-no-gpt-tiktok.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  chinaUnlimitedKeyFeaturesByCarrier,
  CN_UNLIMITED_CMCC_70,
  CN_UNLIMITED_CUCC,
} from "../content/product-detailed/china-unlimited-key-features.js";

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
loadEnv(path.join(__dirname, "..", ".env"));

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "china-unlimited-esim";
const TELECOM = CN_UNLIMITED_CMCC_70;
const APPS_LABEL = "熱點分享；ChatGPT／TikTok 不保證（請選 CUCC+）";

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.token;
}

async function admin(token, pathName, init = {}) {
  const res = await fetch(`${MEDUSA_URL}${pathName}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${init.method || "GET"} ${pathName} → ${res.status} ${JSON.stringify(data).slice(0, 400)}`,
    );
  }
  return data;
}

async function main() {
  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.metadata,+metadata`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 ${HANDLE}`);

  const meta = { ...(product.metadata || {}) };
  const kf = chinaUnlimitedKeyFeaturesByCarrier();
  meta.key_features_by_carrier = {
    ...(meta.key_features_by_carrier || {}),
    [CN_UNLIMITED_CUCC]: kf[CN_UNLIMITED_CUCC],
    [TELECOM]: kf[TELECOM],
  };
  meta.subtitle_by_carrier = {
    ...(meta.subtitle_by_carrier || {}),
    [TELECOM]: "移動 CMCC｜香港IP｜限速約50–70Mbps｜ChatGPT／TikTok不保證",
  };
  meta.carrier_specs_by_carrier = {
    ...(meta.carrier_specs_by_carrier || {}),
    [TELECOM]: {
      ...((meta.carrier_specs_by_carrier || {})[TELECOM] || {}),
      ip_type: "香港 IP",
      route_type: "漫遊線路",
      network: "中國移動 / 4G・5G",
      speed_rule: "約 50–70 Mbps 吃到飽",
      apn: "cmhk",
      apps: APPS_LABEL,
    },
  };
  meta.overview_notices_by_carrier = {
    ...(meta.overview_notices_by_carrier || {}),
    [TELECOM]: {
      fup_notice:
        "香港IP漫遊｜限速約 50–70 Mbps 吃到飽。ChatGPT／TikTok 不保證；若需要請改選 CUCC+（中國聯通）。",
      activation_notice:
        "建議抵達中國大陸後再啟用 eSIM；APN 多為自動設定（cmhk）",
    },
  };

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({ metadata: meta }),
  });
  console.log("✓ product metadata updated");

  const updates = [];
  for (const v of product.variants || []) {
    const attrs = { ...(v.metadata?.attributes || {}) };
    const telecom = String(attrs.telecom || v.metadata?.carrier || "");
    const sku = String(v.sku || "");
    const isCmcc70 =
      telecom === TELECOM ||
      /^China-unlimited-\d+-B0$/i.test(sku) ||
      String(v.title || "").includes(TELECOM);
    if (!isCmcc70) continue;
    attrs.gpt = false;
    attrs.tiktok = false;
    attrs.chatgpt = false;
    attrs.gemini = false;
    attrs.ip_type = attrs.ip_type || "香港 IP";
    updates.push({
      id: v.id,
      metadata: {
        ...(v.metadata || {}),
        attributes: attrs,
        carrier: TELECOM,
      },
    });
  }

  const BATCH = 40;
  for (let i = 0; i < updates.length; i += BATCH) {
    const slice = updates.slice(i, i + BATCH);
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ update: slice }),
    });
    console.log(`✓ variants ${i + 1}–${i + slice.length}`);
  }
  console.log(`DONE variants=${updates.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
