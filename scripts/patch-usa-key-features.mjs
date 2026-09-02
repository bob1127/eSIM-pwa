/**
 * 推送美國相關商品 key_features_by_carrier（含電信商介紹）
 *   node scripts/patch-usa-key-features.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  usaMainlandUnlimitedKeyFeaturesByCarrier,
  usaMainlandDailyUsipKeyFeaturesByCarrier,
  usaMainlandTotalUsipKeyFeaturesByCarrier,
  usCanadaUnlimitedKeyFeaturesByCarrier,
  usCanadaDailyKeyFeaturesByCarrier,
  usCanadaTotalKeyFeaturesByCarrier,
  northAmericaAttUnlimitedKeyFeaturesByCarrier,
  usaNativeUnlimitedLongtermKeyFeaturesByCarrier,
  northAmericaDailyUsipKeyFeaturesByCarrier,
  northAmericaTotalUsipKeyFeaturesByCarrier,
} from "../content/product-detailed/usa-region-key-features.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..", "esim-backend");
const require = createRequire(path.join(backendRoot, "package.json"));
const { Client } = require("pg");

function loadEnv(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let k = t.slice(0, i).trim();
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
loadEnv(path.join(backendRoot, ".env"));

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const PATCHES = [
  { handle: "usa-mainland-unlimited-esim", map: usaMainlandUnlimitedKeyFeaturesByCarrier() },
  { handle: "usa-mainland-daily-usip-esim", map: usaMainlandDailyUsipKeyFeaturesByCarrier() },
  { handle: "usa-mainland-total-usip-esim", map: usaMainlandTotalUsipKeyFeaturesByCarrier() },
  { handle: "us-canada-unlimited-esim", map: usCanadaUnlimitedKeyFeaturesByCarrier() },
  { handle: "us-canada-daily-esim", map: usCanadaDailyKeyFeaturesByCarrier() },
  { handle: "us-canada-total-esim", map: usCanadaTotalKeyFeaturesByCarrier() },
  { handle: "north-america-att-unlimited-esim", map: northAmericaAttUnlimitedKeyFeaturesByCarrier() },
  { handle: "usa-native-unlimited-longterm-esim", map: usaNativeUnlimitedLongtermKeyFeaturesByCarrier() },
  { handle: "north-america-daily-usip-esim", map: northAmericaDailyUsipKeyFeaturesByCarrier() },
  { handle: "north-america-total-usip-esim", map: northAmericaTotalUsipKeyFeaturesByCarrier() },
];

function toMeta(map) {
  const out = {};
  for (const [carrier, entry] of Object.entries(map)) {
    out[carrier] = {
      bullets: (entry.bullets || []).map(String),
      actual_experience: String(entry.actual_experience || ""),
    };
  }
  return out;
}

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
  if (!res.ok) throw new Error(`[${apiPath}] ${res.status}: ${data.message || text.slice(0, 300)}`);
  return data;
}

async function patchMetadata(token, productId, map) {
  const kf = toMeta(map);
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const c = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    const res = await c.query(`SELECT metadata FROM product WHERE id = $1`, [productId]);
    const md = res.rows[0]?.metadata || {};
    md.key_features_by_carrier = kf;
    await c.query(
      `UPDATE product SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(md), productId],
    );
    await c.end();
    return "pg";
  }
  await admin(token, `/admin/products/${productId}`, {
    method: "POST",
    body: JSON.stringify({ metadata: { key_features_by_carrier: kf } }),
  });
  return "admin";
}

async function main() {
  const token = await login();
  for (const { handle, map } of PATCHES) {
    const { products } = await admin(
      token,
      `/admin/products?handle=${encodeURIComponent(handle)}&limit=1&fields=id`,
    );
    const product = products?.[0];
    if (!product) {
      console.warn(`⚠️ 略過 ${handle}（找不到）`);
      continue;
    }
    const via = await patchMetadata(token, product.id, map);
    console.log(`✅ ${handle} → ${Object.keys(map).length} 電信 [${via}]`);
  }
  console.log("\n完成。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
