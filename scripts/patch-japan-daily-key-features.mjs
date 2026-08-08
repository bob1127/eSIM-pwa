/**
 * 寫入 daily-jp 的 key_features_by_carrier（商品特點＋實際體驗）
 * 因整包 Admin POST 商品會 timeout，改以 DB 更新 metadata。
 *
 *   node scripts/patch-japan-daily-key-features.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { japanDailyKeyFeaturesByCarrier } from "../content/product-detailed/japan-daily-key-features.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..", "esim-backend");
const require = createRequire(path.join(backendRoot, "package.json"));
const { Client } = require("pg");

const PRODUCT_ID = "prod_01KXAZTQ0SMW7ABVBAWBSFH4F1";
const HANDLE = "daily-jp";

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
loadEnv(path.join(__dirname, "..", "..", "esim-backend", ".env"));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("缺少 DATABASE_URL（esim-backend/.env）");

  const features = japanDailyKeyFeaturesByCarrier();
  const payload = {};
  for (const [carrier, entry] of Object.entries(features)) {
    payload[carrier] = {
      bullets: entry.bullets || [],
      actual_experience: entry.actual_experience || "",
    };
  }

  const c = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const before = await c.query(
    `SELECT id, handle, metadata->'key_features_by_carrier' AS kf
     FROM product WHERE id=$1 OR handle=$2 LIMIT 1`,
    [PRODUCT_ID, HANDLE],
  );
  const row = before.rows[0];
  if (!row) throw new Error(`找不到商品 ${HANDLE}`);

  await c.query(
    `UPDATE product
     SET metadata = jsonb_set(
       COALESCE(metadata, '{}'::jsonb),
       '{key_features_by_carrier}',
       $2::jsonb,
       true
     ),
     updated_at = NOW()
     WHERE id = $1`,
    [row.id, JSON.stringify(payload)],
  );

  const after = await c.query(
    `SELECT metadata->'key_features_by_carrier' AS kf FROM product WHERE id=$1`,
    [row.id],
  );
  const kf = after.rows[0]?.kf || {};
  const keys = Object.keys(kf);
  const withExp = keys.filter((k) =>
    String(kf[k]?.actual_experience || "").trim(),
  ).length;

  console.log(`✅ ${row.handle} (${row.id})`);
  console.log(`   電信 ${keys.length}｜含實際體驗 ${withExp}`);
  keys.forEach((k) => {
    const n = Array.isArray(kf[k]?.bullets) ? kf[k].bullets.length : 0;
    const exp = String(kf[k]?.actual_experience || "").trim() ? "✓" : "–";
    console.log(`   - ${k}: ${n} 點｜體驗 ${exp}`);
  });

  await c.end();
  console.log("\n重新整理商品頁，切換電信商即可看到「重點特色／實際體驗」。");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
