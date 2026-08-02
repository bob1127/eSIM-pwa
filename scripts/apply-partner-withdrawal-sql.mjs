/**
 * 套用 20260802e（partner_bank_accounts / partner_withdrawal_requests）
 *
 * 需要資料庫連線字串（Supabase → Project Settings → Database → URI）：
 *   SUPABASE_DB_URL='postgresql://postgres.…@db.…:5432/postgres' \
 *     node scripts/apply-partner-withdrawal-sql.mjs
 *
 * 或直接到 Supabase SQL Editor 貼上：
 *   supabase/migrations/20260802e_partner_withdrawal.sql
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sqlPath = resolve(root, "supabase/migrations/20260802e_partner_withdrawal.sql");

function loadEnvLocal() {
  const p = resolve(root, ".env.local");
  if (!existsSync(p)) return {};
  const env = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

const local = loadEnvLocal();
const dbUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  local.SUPABASE_DB_URL ||
  local.DATABASE_URL;

if (!dbUrl) {
  console.error(
    "缺少 SUPABASE_DB_URL。\n\n" +
      "請到 Supabase Dashboard → SQL Editor，貼上並執行：\n" +
      `  ${sqlPath}\n\n` +
      "或設定連線後再跑本腳本：\n" +
      "  SUPABASE_DB_URL='postgresql://…' node scripts/apply-partner-withdrawal-sql.mjs",
  );
  process.exit(2);
}

const require = createRequire(import.meta.url);
let pg;
try {
  pg = require("pg");
} catch {
  console.error("請先安裝 pg：npm i -D pg");
  process.exit(2);
}

const sql = readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("✅ 已套用 20260802e_partner_withdrawal.sql");
} finally {
  await client.end();
}
