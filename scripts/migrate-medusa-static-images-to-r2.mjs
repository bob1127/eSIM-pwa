#!/usr/bin/env node
/**
 * 將 Medusa 商品圖（/static/ 或 localhost 上傳）上傳至 R2，並更新 Admin 商品 URL。
 *
 * 背景：Vercel 上的 Medusa 不持久化 /static/ 檔案，正式站會 404；本機 9000 才有原檔。
 *
 * 用法：
 *   node scripts/migrate-medusa-static-images-to-r2.mjs --handle thailand-unlimited-esim
 *   node scripts/migrate-medusa-static-images-to-r2.mjs --handle thailand-unlimited-esim --dry-run
 *   node scripts/migrate-medusa-static-images-to-r2.mjs --all-static   # 掃描全部 published 商品
 *
 * 環境（.env.local）：
 *   NEXT_PUBLIC_MEDUSA_BACKEND_URL   下載來源（預設 localhost:9000）
 *   MEDUSA_SYNC_BACKEND_URL          Admin 更新目標（未設則同上）
 *   MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD
 *   R2_*                             Cloudflare R2
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildObjectKey,
  getR2PublicBaseUrl,
  isR2Configured,
  uploadToR2,
} from "../lib/r2.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    const env = fs.readFileSync(envPath, "utf8");
    for (const line of env.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      let k = t.slice(0, i);
      let v = t.slice(i + 1);
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const allStatic = args.includes("--all-static");
const handleIdx = args.indexOf("--handle");
const PRODUCT_HANDLE = handleIdx >= 0 ? args[handleIdx + 1] : null;

const SOURCE_URL = (
  process.env.MEDUSA_IMAGE_SOURCE_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");

const MEDUSA_URL = (
  process.env.MEDUSA_SYNC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");

const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const R2_BASE = getR2PublicBaseUrl();

function isAlreadyOnR2(url) {
  return typeof url === "string" && url.startsWith(`${R2_BASE}/`);
}

function isStaticMedusaUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (isAlreadyOnR2(url)) return false;
  if (url.includes("/static/")) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1):9000\//i.test(url)) return true;
  if (/esim-backend-eight\.vercel\.app\/static\//i.test(url)) return true;
  return false;
}

function toSourceDownloadUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.pathname.includes("/static/")) {
      return `${SOURCE_URL}${u.pathname}${u.search}`;
    }
  } catch {
    if (url.startsWith("/static/")) return `${SOURCE_URL}${url}`;
  }
  return url;
}

function extFromUrl(url, contentType) {
  const fromPath = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromPath && /^[a-z0-9]{2,5}$/.test(fromPath)) return fromPath;
  if (contentType?.includes("jpeg")) return "jpg";
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  return "bin";
}

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Medusa 登入失敗 (${MEDUSA_URL}): ${data.message || res.status}`);
  }
  return data.token;
}

async function admin(token, apiPath, options = {}) {
  const res = await fetch(`${MEDUSA_URL}${apiPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${apiPath}] 非 JSON: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(
      `[${apiPath}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 500)}`,
    );
  }
  return data;
}

async function downloadBytes(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下載失敗 ${res.status}: ${url}`);
  }
  const contentType = res.headers.get("content-type") || "";
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, contentType };
}

async function migrateUrl(url, cache) {
  if (!url || !isStaticMedusaUrl(url)) return url;
  if (cache.has(url)) return cache.get(url);

  const source = toSourceDownloadUrl(url);
  if (dryRun) {
    console.log(`  [dry-run] 會上傳: ${source}`);
    return url;
  }

  const { buf, contentType } = await downloadBytes(source);
  const ext = extFromUrl(source, contentType);
  const key = buildObjectKey("medusa-migrated", `file.${ext}`, ext);
  const { url: r2Url } = await uploadToR2({
    key,
    body: buf,
    contentType: contentType.split(";")[0] || `image/${ext === "jpg" ? "jpeg" : ext}`,
  });
  cache.set(url, r2Url);
  console.log(`  ✓ ${path.basename(source.split("?")[0])} → ${r2Url}`);
  return r2Url;
}

async function migrateProduct(token, product, cache) {
  const urls = [
    product.thumbnail,
    ...(product.images || []).map((img) => img.url),
  ].filter(Boolean);

  const needsMigration = urls.some(isStaticMedusaUrl);
  if (!needsMigration) {
    console.log(`⏭  ${product.handle} — 已是 R2／外部 URL，略過`);
    return false;
  }

  console.log(`\n📦 ${product.handle} (${product.id})`);

  const newThumb = await migrateUrl(product.thumbnail, cache);
  const newImages = [];
  const seen = new Set();

  for (const img of product.images || []) {
    const migrated = await migrateUrl(img.url, cache);
    if (!migrated || seen.has(migrated)) continue;
    seen.add(migrated);
    newImages.push({ url: migrated });
  }

  if (dryRun) {
    console.log(`  [dry-run] thumbnail → ${newThumb}`);
    console.log(`  [dry-run] images: ${newImages.length}`);
    return true;
  }

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      thumbnail: newThumb,
      images: newImages,
    }),
  });
  console.log(`  ✅ 已更新 Medusa（${newImages.length} 張圖）`);
  return true;
}

async function fetchProducts(token) {
  if (PRODUCT_HANDLE) {
    const data = await admin(
      token,
      `/admin/products?handle=${encodeURIComponent(PRODUCT_HANDLE)}&limit=1&fields=*images`,
    );
    const product = data.products?.[0];
    if (!product) throw new Error(`找不到商品 handle=${PRODUCT_HANDLE}`);
    return [product];
  }

  if (!allStatic) {
    throw new Error("請指定 --handle <slug> 或 --all-static");
  }

  const out = [];
  let offset = 0;
  const limit = 50;
  for (;;) {
    const data = await admin(
      token,
      `/admin/products?limit=${limit}&offset=${offset}&fields=*images&status=published`,
    );
    const batch = data.products || [];
    out.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return out;
}

async function main() {
  if (!isR2Configured()) {
    throw new Error("R2 未設定（需 R2_BUCKET / R2_PUBLIC_URL / keys）");
  }

  console.log(`Medusa Admin: ${MEDUSA_URL}`);
  console.log(`下載來源:     ${SOURCE_URL}`);
  console.log(`R2 公開網址:  ${R2_BASE}`);
  if (dryRun) console.log("模式: dry-run（不寫入）");

  const token = await login();
  const products = await fetchProducts(token);
  const cache = new Map();
  let updated = 0;

  for (const product of products) {
    const ok = await migrateProduct(token, product, cache);
    if (ok) updated += 1;
  }

  console.log(`\n======= 完成：${updated} 個商品已處理 =======`);
  if (updated > 0 && !dryRun) {
    console.log("請在 Vercel 觸發 revalidate 或等 ISR 更新後刷新正式站。");
  }
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
