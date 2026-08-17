/**
 * Supabase 資料庫本機備份（離線災難備援用）
 *
 * 用法：
 *   npm run backup:db
 *
 * 連線設定（擇一，建議放 .env.backup.local，已被 .gitignore 排除）：
 *   SUPABASE_DB_URL='postgresql://postgres:[密碼]@db.fxwwyqkowdmhofctrhjs.supabase.co:5432/postgres'
 *
 * 可選環境變數：
 *   BACKUP_DIR         備份資料夾（預設 ~/JekoBackups/supabase，位於 git 專案外）
 *   BACKUP_SCHEMAS     要備份的 schema（預設 public,auth,storage；權限不足時改 public）
 *   BACKUP_KEEP_COUNT  只保留最新 N 份（預設 5；設 0 = 永久保留）
 *   BACKUP_PASSPHRASE  設定後以 AES-256 加密備份檔（強烈建議）
 *
 * 資安設計：
 *   - 密碼絕不出現在指令參數（避免 ps / shell history 外洩），只經由子行程環境變數傳遞
 *   - 強制 TLS（PGSSLMODE=require）
 *   - 備份資料夾 0700、檔案 0600，僅本人可讀
 *   - 加密使用 openssl AES-256-CBC + PBKDF2（60 萬次迭代），金鑰經環境變數傳入
 *   - 所有錯誤輸出均遮蔽連線字串與密碼
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ---------- 讀取設定（僅接受 env / gitignore 的本機檔） ----------
function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

const homeBackupEnv = join(homedir(), "JekoBackups", ".env.backup.local");
const local = {
  ...loadEnvFile(resolve(root, ".env.local")),
  ...loadEnvFile(homeBackupEnv),
  ...loadEnvFile(resolve(root, ".env.backup.local")),
};
const get = (k) => process.env[k] ?? local[k];

const rawUrl = get("SUPABASE_DB_URL") || get("DATABASE_URL");
if (!rawUrl) {
  console.error(
    "缺少 SUPABASE_DB_URL。\n\n" +
      "請在 esim-store-front/.env.backup.local 加入（此檔已被 .gitignore 排除）：\n" +
      "  SUPABASE_DB_URL='postgresql://postgres:[資料庫密碼]@db.fxwwyqkowdmhofctrhjs.supabase.co:5432/postgres'\n\n" +
      "密碼在 Supabase Dashboard → Project Settings → Database。\n" +
      "請使用 Direct connection（db.xxx.supabase.co:5432），不要用 pooler。",
  );
  process.exit(2);
}

let db;
try {
  db = new URL(rawUrl);
  if (!/^postgres(ql)?:$/.test(db.protocol)) throw new Error("not postgres");
} catch {
  console.error("SUPABASE_DB_URL 不是合法的 postgresql:// 連線字串。");
  process.exit(2);
}

const schemas = (get("BACKUP_SCHEMAS") || "public,auth,storage")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => /^[a-z_][a-z0-9_]*$/i.test(s));
const keepCount = Number(get("BACKUP_KEEP_COUNT") ?? 5);
const passphrase = get("BACKUP_PASSPHRASE") || "";
const backupDir = resolve(
  get("BACKUP_DIR") || join(homedir(), "JekoBackups", "supabase"),
);

// 拒絕把備份存進 git 專案內，避免誤 commit
if (backupDir.startsWith(root)) {
  console.error("BACKUP_DIR 不可位於專案資料夾內（避免備份被 commit）。");
  process.exit(2);
}

// ---------- 準備資料夾（0700） ----------
mkdirSync(backupDir, { recursive: true, mode: 0o700 });
chmodSync(backupDir, 0o700);

const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 15);
const baseName = `jeko-supabase-${stamp}.dump`;
const outFile = join(backupDir, passphrase ? `${baseName}.enc` : baseName);

// ---------- 執行 pg_dump（密碼只進子行程 env，不進 argv） ----------
const pgEnv = {
  ...process.env,
  PGHOST: db.hostname,
  PGPORT: db.port || "5432",
  PGUSER: decodeURIComponent(db.username || "postgres"),
  PGPASSWORD: decodeURIComponent(db.password || ""),
  PGDATABASE: (db.pathname || "/postgres").slice(1) || "postgres",
  PGSSLMODE: "require",
};

// 自動尋找 pg_dump（Homebrew libpq 預設不在 PATH）
function findPgDump() {
  const candidates = [
    "/opt/homebrew/opt/libpq/bin/pg_dump",
    "/usr/local/opt/libpq/bin/pg_dump",
    "/opt/homebrew/bin/pg_dump",
    "/usr/local/bin/pg_dump",
    "pg_dump",
  ];
  for (const c of candidates) {
    if (c === "pg_dump" || existsSync(c)) return c;
  }
  return "pg_dump";
}
const pgDumpBin = findPgDump();

const dumpArgs = [
  "--format=custom", // 內建壓縮，還原用 pg_restore
  "--no-owner",
  "--no-privileges",
  ...schemas.map((s) => `--schema=${s}`),
];

console.log(`開始備份 → ${outFile}`);
console.log(`schemas: ${schemas.join(", ")}（TLS 強制啟用）`);

let result;
if (passphrase) {
  // pg_dump | openssl，金鑰經 env 傳遞，全程不落地明文
  const shellCmd =
    `'${pgDumpBin}' ${dumpArgs.map((a) => `'${a}'`).join(" ")} | ` +
    `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt ` +
    `-pass env:BACKUP_PASSPHRASE -out "$BACKUP_OUT_FILE"`;
  result = spawnSync("/bin/sh", ["-c", `set -o pipefail; ${shellCmd}`], {
    env: { ...pgEnv, BACKUP_PASSPHRASE: passphrase, BACKUP_OUT_FILE: outFile },
    stdio: ["ignore", "inherit", "pipe"],
  });
} else {
  result = spawnSync(pgDumpBin, [...dumpArgs, `--file=${outFile}`], {
    env: pgEnv,
    stdio: ["ignore", "inherit", "pipe"],
  });
}

const stderr = (result.stderr || "").toString();
// 遮蔽任何可能含密碼的輸出
const safeErr = stderr
  .replaceAll(pgEnv.PGPASSWORD, "[REDACTED]")
  .replaceAll(rawUrl, "[REDACTED_URL]");

if (result.error?.code === "ENOENT") {
  console.error(
    "找不到 pg_dump。macOS 請先安裝：\n" +
      "  brew install libpq && brew link --force libpq\n" +
      "或安裝完整 PostgreSQL：brew install postgresql@17",
  );
  process.exit(2);
}

if (result.status !== 0) {
  if (existsSync(outFile)) unlinkSync(outFile); // 不留下不完整的備份
  if (/server version mismatch|aborting because of/i.test(safeErr)) {
    console.error(
      "pg_dump 版本低於伺服器版本，請升級：brew install postgresql@17\n\n" +
        safeErr,
    );
  } else if (/permission denied/i.test(safeErr)) {
    console.error(
      "部分 schema 權限不足。可改為只備份 public：\n" +
        "  BACKUP_SCHEMAS=public npm run backup:db\n\n" +
        safeErr,
    );
  } else {
    console.error(`pg_dump 失敗（exit ${result.status}）：\n${safeErr}`);
  }
  process.exit(1);
}

// ---------- 驗證與收尾 ----------
const size = statSync(outFile).size;
if (size < 1024) {
  unlinkSync(outFile);
  console.error("備份檔過小（<1KB），已刪除。請檢查連線與權限。");
  process.exit(1);
}
chmodSync(outFile, 0o600);

console.log(`✅ 備份完成：${outFile}（${(size / 1024 / 1024).toFixed(2)} MB）`);
if (passphrase) {
  console.log(
    "已加密。還原前先解密：\n" +
      `  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_PASSPHRASE -in "${outFile}" -out restore.dump`,
  );
} else {
  console.log(
    "⚠️ 未加密。建議在 .env.backup.local 設 BACKUP_PASSPHRASE 啟用 AES-256 加密。",
  );
}
console.log(
  "還原指令（匯入新專案）：\n" +
    "  pg_restore --no-owner --no-privileges -d '新專案連線字串' restore.dump",
);

// ---------- 保留策略：只留最新 N 份（只動本腳本產生的檔名） ----------
if (keepCount > 0) {
  const dumps = readdirSync(backupDir)
    .filter((f) => /^jeko-supabase-\d{8}-\d{6}\.dump(\.enc)?$/.test(f))
    .sort()
    .reverse();
  for (const f of dumps.slice(keepCount)) {
    unlinkSync(join(backupDir, f));
    console.log(`已清除舊備份：${f}`);
  }
}
