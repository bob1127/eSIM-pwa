/**
 * 將日本吃到飽商品輪播圖對齊 japan-total-esim（11 張：產品圖 + 10 教學圖）
 *
 *   node scripts/patch-japan-unlimited-gallery.mjs
 *   node scripts/patch-japan-unlimited-gallery.mjs --dry-run
 *   node scripts/patch-japan-unlimited-gallery.mjs --backend https://esim-backend-eight.vercel.app
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
const backendIdx = process.argv.indexOf("--backend");

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
  (backendIdx >= 0 ? process.argv[backendIdx + 1] : null) ||
  process.env.MEDUSA_SYNC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");

const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const TARGET_HANDLES = [
  "japan-unlimited-esim",
  "japan-unlimited-esim-nolimit",
];

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

async function patchHandle(token, handle) {
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(handle)}&limit=1&fields=id,handle,title,*images,thumbnail`,
  );
  const product = products?.[0];
  if (!product?.id) {
    console.warn(`⚠️ 找不到 ${handle}，略過`);
    return false;
  }

  const before = (product.images || []).map((i) => i.url).filter(Boolean);
  console.log(`\n📦 ${handle} (${product.id})`);
  console.log(`   原圖 ${before.length} 張 → 新圖 ${JAPAN_PRODUCT_GALLERY.length} 張`);

  if (DRY) {
    console.log("   --dry-run：未寫入");
    return true;
  }

  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      thumbnail: JAPAN_PRODUCT_THUMB,
      images: japanProductImages(),
    }),
  });
  console.log("   ✅ 已更新 thumbnail + images");
  return true;
}

async function main() {
  console.log(`Medusa: ${MEDUSA_URL}`);
  console.log(`目標: ${TARGET_HANDLES.join(", ")}`);
  if (DRY) console.log("模式: dry-run");

  const token = await login();
  let ok = 0;
  for (const handle of TARGET_HANDLES) {
    if (await patchHandle(token, handle)) ok += 1;
  }
  console.log(`\n======= 完成：${ok}/${TARGET_HANDLES.length} =======`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
