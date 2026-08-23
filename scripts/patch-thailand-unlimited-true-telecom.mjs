/**
 * 泰國吃到飽 thailand-unlimited-esim：
 *   1) 電信選項 TRRE 電信 → True 電信（含變體 title / metadata）
 *   2) hot_sale_telecoms 加入 True 電信
 *   3) 更新 key_features_by_carrier
 *
 *   node scripts/patch-thailand-unlimited-true-telecom.mjs
 *   node scripts/patch-thailand-unlimited-true-telecom.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  truemoveHKeyFeatures,
  trueDtacKeyFeatures,
} from "../content/product-detailed/thailand-key-features.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..", "esim-backend");
const require = createRequire(path.join(backendRoot, "package.json"));
const { Client } = require("pg");

const HANDLE = "thailand-unlimited-esim";
const FROM = "TRRE 電信";
const TO = "True 電信";
const TELECOM_TRUEMOVE = "Truemove H 當地號碼";
const RENAME = [[FROM, TO]];

const dryRun = process.argv.includes("--dry-run");

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
loadEnv(path.join(backendRoot, ".env"));

function remapMetaObject(obj, renames) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = { ...obj };
  for (const [from, to] of renames) {
    if (Object.prototype.hasOwnProperty.call(out, from)) {
      if (!Object.prototype.hasOwnProperty.call(out, to)) {
        out[to] = out[from];
      }
      delete out[from];
    }
  }
  return out;
}

function toFeaturePayload(featuresFn) {
  const features = featuresFn();
  const payload = {};
  for (const [carrier, entry] of Object.entries(features)) {
    payload[carrier] = {
      bullets: entry.bullets || [],
      actual_experience: entry.actual_experience || "",
    };
  }
  return payload;
}

async function renameTelecomForProduct(c, productId) {
  for (const [from, to] of RENAME) {
    const opt = await c.query(
      `UPDATE product_option_value
       SET value = $1, updated_at = NOW()
       WHERE value = $2
         AND option_id IN (
           SELECT id FROM product_option
           WHERE product_id = $3 AND title = '電信商' AND deleted_at IS NULL
         )
         AND deleted_at IS NULL
       RETURNING id`,
      [to, from, productId],
    );
    console.log(`   rename option "${from}" → "${to}": ${opt.rowCount} values`);

    const titles = await c.query(
      `UPDATE product_variant
       SET title = REPLACE(title, $1, $2), updated_at = NOW()
       WHERE product_id = $3
         AND title LIKE $4
         AND deleted_at IS NULL
       RETURNING id`,
      [from, to, productId, `%${from}%`],
    );
    console.log(`   rename variant titles: ${titles.rowCount}`);

    const metaCarrier = await c.query(
      `UPDATE product_variant
       SET metadata = jsonb_set(
         jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{carrier}',
           to_jsonb($1::text),
           true
         ),
         '{attributes,telecom}',
         to_jsonb($1::text),
         true
       ),
       updated_at = NOW()
       WHERE product_id = $2
         AND (
           metadata->>'carrier' = $3
           OR metadata->'attributes'->>'telecom' = $3
           OR title LIKE $4
         )
         AND deleted_at IS NULL
       RETURNING id`,
      [to, productId, from, `%${from}%`],
    );
    console.log(`   rename variant metadata carrier: ${metaCarrier.rowCount}`);
  }
}

async function updateProductMetadata(c, productId) {
  const metaRes = await c.query(`SELECT metadata FROM product WHERE id = $1`, [
    productId,
  ]);
  const meta = metaRes.rows[0]?.metadata || {};
  const keys = [
    "carrier_profit_by_carrier",
    "carrier_partner_rate_by_carrier",
    "carrier_referral_discount_by_carrier",
    "subtitle_by_carrier",
    "carrier_specs_by_carrier",
    "overview_notices_by_carrier",
    "key_features_by_carrier",
  ];

  let next = { ...meta };
  for (const k of keys) {
    if (k in next) next[k] = remapMetaObject(next[k], RENAME);
  }

  const hot = Array.isArray(next.hot_sale_telecoms)
    ? [...next.hot_sale_telecoms]
    : [];
  const normalized = hot.map((v) => (v === FROM ? TO : v));
  for (const t of [TELECOM_TRUEMOVE, TO]) {
    if (!normalized.includes(t)) normalized.push(t);
  }
  next.hot_sale_telecoms = normalized;

  next.key_features_by_carrier = toFeaturePayload(() => ({
    [TELECOM_TRUEMOVE]: truemoveHKeyFeatures(),
    [TO]: trueDtacKeyFeatures(),
  }));

  if (typeof next.seo_title === "string") {
    next.seo_title = next.seo_title.replaceAll(FROM, TO);
  }
  if (typeof next.seo_description === "string") {
    next.seo_description = next.seo_description.replaceAll(FROM, TO);
  }
  if (typeof next.seo_keywords === "string") {
    next.seo_keywords = next.seo_keywords
      .replaceAll("TRRE電信", "True電信")
      .replaceAll(FROM, TO);
  }

  await c.query(
    `UPDATE product SET metadata = $2::jsonb, updated_at = NOW() WHERE id = $1`,
    [productId, JSON.stringify(next)],
  );
  console.log(
    `   metadata updated｜hot_sale_telecoms: ${next.hot_sale_telecoms.join("、")}`,
  );

  await c.query(
    `UPDATE product
     SET subtitle = REPLACE(COALESCE(subtitle, ''), $2, $3),
         description = REPLACE(COALESCE(description, ''), $2, $3),
         updated_at = NOW()
     WHERE id = $1`,
    [productId, FROM, TO],
  );
  console.log("   product subtitle/description updated");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("缺少 DATABASE_URL（esim-backend/.env）");

  const c = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const r = await c.query(
    `SELECT id, handle FROM product WHERE handle = $1 AND deleted_at IS NULL LIMIT 1`,
    [HANDLE],
  );
  const row = r.rows[0];
  if (!row) throw new Error(`找不到商品 ${HANDLE}`);

  console.log(`✅ ${row.handle} (${row.id})`);
  if (dryRun) {
    console.log("dry-run：未寫入資料庫");
    await c.end();
    return;
  }

  await renameTelecomForProduct(c, row.id);
  await updateProductMetadata(c, row.id);

  await c.end();
  console.log("\n完成。請重新整理泰國吃到飽商品頁。");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
