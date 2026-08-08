/**
 * 更新 japan-unlimited-esim：
 *   1) 商品名稱 → 日本無限流量吃到飽eSIM / AU KDDI 不限速吃到飽
 *   2) key_features_by_carrier（商品特點＋實際體驗）對齊現行電信商選項
 *
 * Admin 整包 POST 易 timeout，改 SQL 更新。
 *
 *   node scripts/patch-japan-unlimited-key-features.mjs
 *   node scripts/patch-japan-unlimited-key-features.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { japanUnlimitedKeyFeaturesByCarrier } from "../content/product-detailed/japan-unlimited-key-features.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..", "esim-backend");
const require = createRequire(path.join(backendRoot, "package.json"));
const { Client } = require("pg");

const HANDLE = "japan-unlimited-esim";
const PRODUCT_ID = "prod_01KPJQZ4WMH315JRS7WGMJAGB6";
const NEW_TITLE = "日本無限流量吃到飽eSIM / AU KDDI 不限速吃到飽";
const DRY = process.argv.includes("--dry-run");

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

function toPayload(features) {
  const payload = {};
  for (const [carrier, entry] of Object.entries(features)) {
    payload[carrier] = {
      bullets: entry.bullets || [],
      actual_experience: entry.actual_experience || "",
    };
  }
  return payload;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("缺少 DATABASE_URL（esim-backend/.env）");

  const payload = toPayload(japanUnlimitedKeyFeaturesByCarrier());
  const c = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const before = await c.query(
    `SELECT id, handle, title,
            metadata->'key_features_by_carrier' AS kf
     FROM product WHERE id=$1 OR handle=$2 LIMIT 1`,
    [PRODUCT_ID, HANDLE],
  );
  const row = before.rows[0];
  if (!row) throw new Error(`找不到商品 ${HANDLE}`);

  console.log(`📦 ${row.handle} (${row.id})`);
  console.log(`   原標題: ${row.title}`);
  console.log(`   新標題: ${NEW_TITLE}`);
  console.log(
    `   原 KF 鍵: ${Object.keys(row.kf || {}).join(" | ") || "(無)"}`,
  );
  console.log(`   新 KF 鍵: ${Object.keys(payload).join(" | ")}`);

  if (DRY) {
    console.log("\n--dry-run：未寫入");
    await c.end();
    return;
  }

  await c.query(
    `UPDATE product
     SET title = $2,
         metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{key_features_by_carrier}',
           $3::jsonb,
           true
         ),
         updated_at = NOW()
     WHERE id = $1`,
    [row.id, NEW_TITLE, JSON.stringify(payload)],
  );

  const after = await c.query(
    `SELECT title, metadata->'key_features_by_carrier' AS kf
     FROM product WHERE id=$1`,
    [row.id],
  );
  const a = after.rows[0];
  const kf = a.kf || {};
  console.log(`\n✅ 標題: ${a.title}`);
  for (const k of Object.keys(kf)) {
    const exp = String(kf[k]?.actual_experience || "").trim();
    const n = (kf[k]?.bullets || []).length;
    console.log(`   ${k}: bullets=${n} 實際體驗=${exp ? "✓" : "–"}`);
  }
  console.log("\n重新整理商品頁，切換電信商即可看到「重點特色／實際體驗」。");
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
