/**
 * 將日本吃到飽拆成兩個 Medusa 商品：
 *   japan-unlimited-esim          → 日本吃到飽 eSIM（AU(KDDI) 10Mbps）
 *   japan-unlimited-esim-nolimit  → 日本吃到飽 eSIM｜吃到飽不降速eSIM（AU(KDDI) 真。吃到飽不降速）
 *
 *   HKD_TO_TWD=4.5 node scripts/split-japan-unlimited-products.mjs
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function run(script) {
  console.log(`\n▶ ${script} --rebuild\n`);
  const res = spawnSync(
    process.execPath,
    [path.join(__dirname, script), "--rebuild"],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    },
  );
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

run("create-japan-unlimited-product.mjs");
run("create-japan-unlimited-nolimit-product.mjs");

console.log("\n▶ split-japan-softbank-telecoms.mjs（補回 SoftBank / KDDI 吃到飽）\n");
const softbank = spawnSync(
  process.execPath,
  [path.join(__dirname, "split-japan-softbank-telecoms.mjs")],
  { cwd: root, stdio: "inherit", env: process.env },
);
if (softbank.status !== 0) {
  process.exit(softbank.status || 1);
}

console.log("\n▶ patch-japan-unlimited-iij-docomo.mjs\n");
const iij = spawnSync(
  process.execPath,
  [path.join(__dirname, "patch-japan-unlimited-iij-docomo.mjs")],
  { cwd: root, stdio: "inherit", env: process.env },
);
if (iij.status !== 0) {
  process.exit(iij.status || 1);
}

console.log("\n✅ 拆分完成");
console.log("  10Mbps + SoftBank + IIJ：/product/japan/japan-unlimited-esim");
console.log("  真不限速：/product/japan/japan-unlimited-esim-nolimit");
