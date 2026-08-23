#!/usr/bin/env node
/**
 * 上傳產品特色圖 + 共用教學輪播到 Cloudflare R2（不佔站內 public 空間）
 *
 *   node scripts/upload-product-gallery-to-r2.mjs
 *   node scripts/upload-product-gallery-to-r2.mjs --dry-run
 *
 * 寫出：lib/productGalleryR2.urls.json（給 countryProductImages / productCarouselShared 用）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getR2PublicBaseUrl, isR2Configured, uploadToR2 } from "../lib/r2.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DRY = process.argv.includes("--dry-run");

function loadEnvLocal() {
  try {
    const envPath = path.join(ROOT, ".env.local");
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

const PRODUCT_DIR = path.join(ROOT, "public", "images", "sim", "產品");
const GUIDE_DIR = path.join(ROOT, "public", "images", "sim", "教學");
const OUT_JSON = path.join(ROOT, "lib", "productGalleryR2.urls.json");
const OUT_JS = path.join(ROOT, "lib", "productGalleryR2.js");

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function publicUrlForKey(key) {
  const base = getR2PublicBaseUrl();
  return `${base}/${key
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")}`;
}

async function uploadFile(localPath, key) {
  const body = fs.readFileSync(localPath);
  if (DRY) {
    console.log(`  [dry] ${key} (${body.length} bytes)`);
    return publicUrlForKey(key);
  }
  const { url } = await uploadToR2({
    key,
    body,
    contentType: contentType(localPath),
    cacheControl: "public, max-age=31536000, immutable",
  });
  console.log(`  ✅ ${key}`);
  return url;
}

async function main() {
  if (!isR2Configured() && !DRY) {
    throw new Error("R2 未設定（.env.local 需 R2_BUCKET / R2_PUBLIC_URL / keys）");
  }

  console.log(`R2: ${DRY ? "(dry-run)" : getR2PublicBaseUrl()}`);
  console.log(`產品圖: ${PRODUCT_DIR}`);
  console.log(`教學圖: ${GUIDE_DIR}`);

  const thumbs = {};
  const productFiles = fs
    .readdirSync(PRODUCT_DIR)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();

  console.log(`\n── 上傳特色圖 ${productFiles.length} 張 ──`);
  for (const file of productFiles) {
    const key = `product-gallery/thumbs/${file}`;
    const url = await uploadFile(path.join(PRODUCT_DIR, file), key);
    thumbs[file] = url;
  }

  const carousel = [];
  const guideFiles = fs
    .readdirSync(GUIDE_DIR)
    .filter((f) => /^\d{2}\.(png|jpe?g|webp)$/i.test(f))
    .sort();

  console.log(`\n── 上傳教學輪播 ${guideFiles.length} 張 ──`);
  for (const file of guideFiles) {
    const key = `product-gallery/carousel/${file}`;
    const url = await uploadFile(path.join(GUIDE_DIR, file), key);
    carousel.push(url);
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    publicBase: DRY ? "https://example.invalid" : getR2PublicBaseUrl(),
    thumbs,
    carousel,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const js = `/**
 * 產品圖 R2 公開網址（由 scripts/upload-product-gallery-to-r2.mjs 產生）
 * 勿手改；重新上傳後再跑腳本。
 */
export const PRODUCT_GALLERY_R2 = ${JSON.stringify(payload, null, 2)};

export const R2_PRODUCT_THUMB_BY_FILE = PRODUCT_GALLERY_R2.thumbs || {};
export const R2_SHARED_CAROUSEL_IMAGES = PRODUCT_GALLERY_R2.carousel || [];
`;
  fs.writeFileSync(OUT_JS, js, "utf8");

  console.log(`\n寫入 ${path.relative(ROOT, OUT_JSON)}`);
  console.log(`寫入 ${path.relative(ROOT, OUT_JS)}`);
  console.log(`特色圖 ${Object.keys(thumbs).length}、輪播 ${carousel.length}`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
