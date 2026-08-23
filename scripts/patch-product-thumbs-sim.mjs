/**
 * 將 Medusa 商品 thumbnail / 首圖改為 public/images/sim/產品 去背圖
 *
 * 用法：
 *   node scripts/patch-product-thumbs-sim.mjs
 *   node scripts/patch-product-thumbs-sim.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildCountryProductGallery,
} from "../lib/countryProductImages.js";

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

const DRY_RUN = process.argv.includes("--dry-run");
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

const PRODUCT_DIR = path.join(__dirname, "..", "public", "images", "sim", "產品");

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`登入失敗: ${data.message || res.status}`);
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

function pickGallery(categories) {
  return buildCountryProductGallery(categories, SITE_ORIGIN);
}

async function fetchAllProducts(token) {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { products, count } = await admin(
      token,
      `/admin/products?limit=${limit}&offset=${offset}&fields=id,title,handle,thumbnail,*categories`,
    );
    out.push(...(products || []));
    offset += limit;
    if (!products?.length || out.length >= (count || out.length)) break;
  }
  return out;
}

async function main() {
  console.log(`🖼  站台 ${SITE_ORIGIN}`);
  console.log(`📂 產品圖 ${PRODUCT_DIR}`);
  if (DRY_RUN) console.log("（dry-run，不寫入 Medusa）");

  const token = await login();
  const products = await fetchAllProducts(token);
  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const picked = pickGallery(p.categories);
    if (!picked?.thumbnail) {
      skipped += 1;
      continue;
    }

    console.log(
      `  ${p.handle} [${picked.handle}] → ${picked.thumbnail} + ${picked.urls.length - 1} 輪播`,
    );

    if (!DRY_RUN) {
      await admin(token, `/admin/products/${p.id}`, {
        method: "POST",
        body: JSON.stringify({
          thumbnail: picked.thumbnail,
          images: picked.images,
        }),
      });
    }
    updated += 1;
  }

  console.log(`\n✅ 更新 ${updated} 筆，略過 ${skipped} 筆（共 ${products.length} 商品）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
