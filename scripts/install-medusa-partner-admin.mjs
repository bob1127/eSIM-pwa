#!/usr/bin/env node
/**
 * 一鍵安裝 Medusa Admin「夥伴管理」iframe 擴充
 * 執行：node scripts/install-medusa-partner-admin.mjs
 */
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const backendRoot = resolve(root, "../esim-backend");
const src = resolve(
  root,
  "medusa-admin-extension/src/admin/routes/partner-management/page.tsx",
);
const destDir = resolve(backendRoot, "src/admin/routes/partner-management");
const dest = resolve(destDir, "page.tsx");

if (!existsSync(backendRoot)) {
  console.error("❌ 找不到 esim-backend 目錄:", backendRoot);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
cpSync(src, dest);
console.log("✅ 已複製 partner-management → esim-backend");

const envPath = resolve(backendRoot, ".env");
const lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : [];
const additions = {
  VITE_JEKO_PARTNER_DASHBOARD_URL: "http://localhost:3000/admin-boss?embed=1",
  JEKO_PARTNER_DASHBOARD_URL: "http://localhost:3000/admin-boss?embed=1",
};

let envText = lines.join("\n");
for (const [key, val] of Object.entries(additions)) {
  if (!envText.includes(`${key}=`)) {
    envText += `\n${key}=${val}`;
    console.log(`✅ .env 新增 ${key}`);
  }
}
writeFileSync(envPath, envText.trim() + "\n");

console.log("\n下一步：");
console.log("  cd ../esim-backend && npm run dev");
console.log("  開啟 http://localhost:9000/app → 側欄「夥伴管理」");
console.log("  （正式站需 redeploy esim-backend 並設 VITE_JEKO_PARTNER_DASHBOARD_URL）");
