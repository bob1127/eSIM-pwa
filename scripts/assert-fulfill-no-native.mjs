/**
 * 發貨路徑禁止依賴 native 影像套件（sharp 等）。
 * Vercel linux-x64 漏帶 binary → fulfill-order 一 import 就 500、客人沒 QR／沒信。
 *
 * 用法：node scripts/assert-fulfill-no-native.mjs
 * 掛在 prebuild，部署前擋下來。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(import.meta.url);

const FULFILL_GLOBS = [
  "lib/esimProfile.js",
  "lib/esimFulfillmentEmail.js",
  "lib/esimInstallLinks.js",
  "pages/api/internal/fulfill-order.js",
  "pages/api/internal/fulfill-from-topup.js",
  "pages/api/fulfillment/send-esim.js",
];

const FORBIDDEN = [
  /\bfrom\s+["']sharp["']/,
  /\brequire\s*\(\s*["']sharp["']\s*\)/,
  /\bimport\s*\(\s*["']sharp["']\s*\)/,
  /\bfrom\s+["']@img\/sharp/,
  /\bfrom\s+["']canvas["']/,
  /\brequire\s*\(\s*["']canvas["']\s*\)/,
];

const REQUIRED_PURE = ["pngjs", "jpeg-js", "jsqr"];

function walkListed() {
  const hits = [];
  for (const rel of FULFILL_GLOBS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      hits.push({ file: rel, issue: "missing file" });
      continue;
    }
    const src = fs.readFileSync(abs, "utf8");
    for (const re of FORBIDDEN) {
      if (re.test(src)) {
        hits.push({
          file: rel,
          issue: `forbidden native import matched ${re}`,
        });
      }
    }
  }
  return hits;
}

function assertPackageJson() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const missing = REQUIRED_PURE.filter((name) => !deps[name]);
  if (missing.length) {
    throw new Error(
      `發貨純 JS 依賴缺失: ${missing.join(", ")}（請加回 package.json）`,
    );
  }
  return pkg;
}

function smokeDecode() {
  const png1x1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  let PNG;
  let jpeg;
  try {
    ({ PNG } = require("pngjs"));
    jpeg = require("jpeg-js");
  } catch (err) {
    throw new Error(
      `無法 require pngjs/jpeg-js（請先 npm install）: ${err?.message || err}`,
    );
  }
  if (typeof PNG.sync?.read !== "function") {
    throw new Error("pngjs 不可用");
  }
  if (typeof jpeg.decode !== "function") {
    throw new Error("jpeg-js 不可用");
  }
  const png = PNG.sync.read(png1x1);
  if (!png?.width || !png?.data) {
    throw new Error("pngjs 解碼失敗");
  }

  let jsQRMod;
  try {
    jsQRMod = require("jsqr");
  } catch (err) {
    throw new Error(
      `無法 require jsqr（請先 npm install）: ${err?.message || err}`,
    );
  }
  const jsQR =
    typeof jsQRMod === "function" ? jsQRMod : jsQRMod?.default;
  if (typeof jsQR !== "function") {
    throw new Error("jsqr 不可用");
  }

  const profileSrc = fs.readFileSync(
    path.join(root, "lib/esimProfile.js"),
    "utf8",
  );
  if (!/\bfrom\s+["']pngjs["']/.test(profileSrc)) {
    throw new Error("esimProfile.js 應 import pngjs");
  }
  if (!/\bfrom\s+["']jpeg-js["']/.test(profileSrc)) {
    throw new Error("esimProfile.js 應 import jpeg-js");
  }
  if (!/\bjsqr\b/i.test(profileSrc)) {
    throw new Error("esimProfile.js 應 import jsqr");
  }
}

async function main() {
  console.log("[assert-fulfill-no-native] checking…");
  assertPackageJson();
  const hits = walkListed();
  if (hits.length) {
    console.error("[assert-fulfill-no-native] FAILED:");
    for (const h of hits) console.error(`  - ${h.file}: ${h.issue}`);
    console.error(
      "發貨 API 禁止 sharp／canvas 等 native 套件。QR 解碼請用 pngjs + jpeg-js + jsqr。",
    );
    process.exit(1);
  }
  await smokeDecode();
  console.log(
    "[assert-fulfill-no-native] ok — fulfill path has no sharp; pngjs/jpeg-js loadable",
  );
}

main().catch((err) => {
  console.error("[assert-fulfill-no-native] FAILED:", err?.message || err);
  process.exit(1);
});
