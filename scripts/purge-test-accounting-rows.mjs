/**
 * 清除 Google Sheet 假訂單（test-*）並更新表頭
 *   node scripts/purge-test-accounting-rows.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const p = resolve(root, ".env.local");
  if (!existsSync(p)) throw new Error("缺少 .env.local");
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const args = process.argv.slice(2);
const resetMain = args.includes("--reset-main");

const { purgeTestAccountingRows, clearAccountingTabData, setupAccountingDashboard } =
  await import("../lib/accountingSheet.js");

if (resetMain) {
  const cleared = await clearAccountingTabData("main");
  console.log("cleared:", cleared);
  const { execSync } = await import("child_process");
  execSync(
    "node scripts/backfill-accounting-sheet.mjs --channel=main --limit=100 --force",
    {
      stdio: "inherit",
      cwd: root,
    },
  );
  const dash = await setupAccountingDashboard();
  console.log("dashboard:", dash);
} else {
  const result = await purgeTestAccountingRows();
  console.log(JSON.stringify(result, null, 2));
}
