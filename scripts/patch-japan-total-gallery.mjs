/**
 * 更新「日本 eSIM 總量型」輪播：首圖去背產品圖 + 10 張教學圖
 *
 *   node scripts/patch-japan-total-gallery.mjs
 *   node scripts/patch-japan-total-gallery.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  JAPAN_PRODUCT_GALLERY,
  JAPAN_PRODUCT_THUMB,
  japanProductImages,
} from "./lib/japanProductGallery.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry-run");

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

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const HANDLE = "japan-total-esim";

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(data.message || "Medusa 登入失敗");
  }
  return data.token;
}

async function admin(token, pathSuffix, opts = {}) {
  const res = await fetch(`${MEDUSA_URL}${pathSuffix}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  console.log(`Medusa: ${MEDUSA_URL}`);
  console.log(`目標: ${HANDLE}（${JAPAN_PRODUCT_GALLERY.length} 張）`);
  if (DRY) console.log("模式: dry-run");

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,handle,*images,thumbnail`,
  );
  const product = products?.[0];
  if (!product?.id) throw new Error(`找不到 ${HANDLE}`);

  const before = (product.images || []).map((i) => i.url).filter(Boolean);
  console.log(`📦 ${HANDLE} (${product.id})`);
  console.log(`   原圖 ${before.length} 張 → 新圖 ${JAPAN_PRODUCT_GALLERY.length} 張`);

  if (DRY) {
    JAPAN_PRODUCT_GALLERY.forEach((u, i) => console.log(`   ${i + 1}. ${u}`));
    return;
  }

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      thumbnail: JAPAN_PRODUCT_THUMB,
      images: japanProductImages(),
    }),
  });
  console.log("✅ 已更新 thumbnail + images");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
