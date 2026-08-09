/**
 * 韓國三產品：
 *   1) 寫入 key_features_by_carrier（產品特色＋實際體驗）
 *   2) 每日型／總量型電信選項改中文名（SKT → SK電信）
 *
 *   node scripts/patch-korea-key-features.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  koreaUnlimitedKeyFeaturesByCarrier,
  koreaDailyKeyFeaturesByCarrier,
  koreaTotalKeyFeaturesByCarrier,
  KR_DAILY_TOTAL_DUAL,
  KR_DAILY_TOTAL_SKT,
  KR_DAILY_TOTAL_DUAL_LEGACY,
  KR_DAILY_TOTAL_SKT_LEGACY,
} from "../content/product-detailed/korea-key-features.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..", "esim-backend");
const require = createRequire(path.join(backendRoot, "package.json"));
const { Client } = require("pg");

const RENAME = [
  [KR_DAILY_TOTAL_DUAL_LEGACY, KR_DAILY_TOTAL_DUAL],
  [KR_DAILY_TOTAL_SKT_LEGACY, KR_DAILY_TOTAL_SKT],
];

const PRODUCTS = [
  {
    handle: "korea-unlimited-esim",
    features: koreaUnlimitedKeyFeaturesByCarrier,
    renameTelecom: false,
  },
  {
    handle: "korea-daily-esim",
    features: koreaDailyKeyFeaturesByCarrier,
    renameTelecom: true,
  },
  {
    handle: "korea-total-esim",
    features: koreaTotalKeyFeaturesByCarrier,
    renameTelecom: true,
  },
];

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

/** metadata 內以電信名為 key 的物件：舊鍵 → 新鍵 */
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
  }

  const metaRes = await c.query(
    `SELECT metadata FROM product WHERE id = $1`,
    [productId],
  );
  const meta = metaRes.rows[0]?.metadata || {};
  const keys = [
    "hot_sale_telecoms",
    "carrier_profit_by_carrier",
    "subtitle_by_carrier",
    "carrier_specs_by_carrier",
    "overview_notices_by_carrier",
    "key_features_by_carrier",
  ];
  let next = { ...meta };
  for (const k of keys) {
    if (!(k in next)) continue;
    if (k === "hot_sale_telecoms" && Array.isArray(next[k])) {
      next[k] = next[k].map((v) => {
        for (const [from, to] of RENAME) {
          if (v === from) return to;
        }
        return v;
      });
    } else {
      next[k] = remapMetaObject(next[k], RENAME);
    }
  }
  await c.query(
    `UPDATE product SET metadata = $2::jsonb, updated_at = NOW() WHERE id = $1`,
    [productId, JSON.stringify(next)],
  );
  console.log("   metadata telecom keys remapped");
}

async function writeKeyFeatures(c, productId, handle, featuresFn) {
  const payload = toFeaturePayload(featuresFn);
  // 正式前台只保留新中文鍵（舊鍵仍放進 content 給相容，但 DB 寫新鍵為主）
  const cleaned = { ...payload };
  if (handle !== "korea-unlimited-esim") {
    delete cleaned[KR_DAILY_TOTAL_DUAL_LEGACY];
    delete cleaned[KR_DAILY_TOTAL_SKT_LEGACY];
  }

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
    [productId, JSON.stringify(cleaned)],
  );

  const keys = Object.keys(cleaned);
  const withExp = keys.filter((k) =>
    String(cleaned[k]?.actual_experience || "").trim(),
  ).length;
  console.log(`   key_features: ${keys.length} 電信｜含實際體驗 ${withExp}`);
  keys.forEach((k) => {
    const n = Array.isArray(cleaned[k]?.bullets) ? cleaned[k].bullets.length : 0;
    const exp = String(cleaned[k]?.actual_experience || "").trim() ? "✓" : "–";
    console.log(`   - ${k}: ${n} 點｜體驗 ${exp}`);
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("缺少 DATABASE_URL（esim-backend/.env）");

  const c = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  for (const item of PRODUCTS) {
    const r = await c.query(
      `SELECT id, handle FROM product WHERE handle = $1 AND deleted_at IS NULL LIMIT 1`,
      [item.handle],
    );
    const row = r.rows[0];
    if (!row) {
      console.log(`⚠️ 找不到 ${item.handle}，略過`);
      continue;
    }
    console.log(`\n✅ ${row.handle} (${row.id})`);
    if (item.renameTelecom) {
      await renameTelecomForProduct(c, row.id);
    }
    await writeKeyFeatures(c, row.id, item.handle, item.features);
  }

  await c.end();
  console.log("\n完成。重新整理商品頁，切換電信商即可看到產品特色／實際體驗。");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
