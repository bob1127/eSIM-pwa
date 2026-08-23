/**
 * 全站商品輪播寫入 Medusa：各國 R2 特色圖（第 1 張）+ 共用教學圖（第 2 張起）
 *
 * 對齊舊建品腳本習慣：Admin fetch 不設短 timeout、每筆間隔、失敗重試。
 *
 *   node scripts/patch-all-product-galleries.mjs
 *   node scripts/patch-all-product-galleries.mjs --dry-run
 *   node scripts/patch-all-product-galleries.mjs --thumb-only   # 僅 thumbnail + 1 張（舊建品模式）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CATEGORY_PRODUCT_IMAGE_FILES,
  buildCountryProductGallery,
} from "../lib/countryProductImages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const THUMB_ONLY = process.argv.includes("--thumb-only");
const PAUSE_MS = Number(process.env.PATCH_PAUSE_MS || 5000);
const MAX_RETRIES = Number(process.env.PATCH_RETRIES || 4);
/** Admin POST 常因 refetch 全 variants 逾時；寫入可能已成功，改用輕量查詢驗收 */
const WRITE_TIMEOUT_MS = Number(process.env.PATCH_WRITE_TIMEOUT_MS || 90_000);

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  try {
    if (url.startsWith("/")) return decodeURIComponent(url.split("?")[0]);
    const u = new URL(url);
    return decodeURIComponent(u.pathname);
  } catch {
    return url;
  }
}

function gallerySignature(urls) {
  return (urls || []).map(normalizeUrl).join("|");
}

function pickGallery(categories) {
  const handles = (categories || [])
    .map((c) => String(c?.handle || "").toLowerCase())
    .filter(Boolean);
  for (const h of handles) {
    if (!CATEGORY_PRODUCT_IMAGE_FILES[h]) continue;
    const gallery = buildCountryProductGallery(categories, "");
    if (gallery?.urls?.length) return gallery;
  }
  return null;
}

function payloadFor(gallery) {
  if (THUMB_ONLY) {
    return {
      thumbnail: gallery.thumbnail,
      images: [{ url: gallery.thumbnail }],
    };
  }
  return {
    thumbnail: gallery.thumbnail,
    images: gallery.images,
  };
}

function expectedUrls(gallery) {
  if (THUMB_ONLY) return [gallery.thumbnail];
  return gallery.urls;
}

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
      `[${apiPath}] ${res.status}: ${data.message || text.slice(0, 200)}`,
    );
  }
  return data;
}

async function fetchAllProducts(token) {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { products, count } = await admin(
      token,
      `/admin/products?limit=${limit}&offset=${offset}&fields=id,title,handle,thumbnail,*images,*categories`,
    );
    out.push(...(products || []));
    offset += limit;
    if (!products?.length || out.length >= (count || out.length)) break;
  }
  return out;
}

async function verifyGallery(token, productId, gallery) {
  await sleep(1500);
  const { product } = await admin(
    token,
    `/admin/products/${productId}?fields=id,handle,thumbnail,*images`,
  );
  const currentUrls = (product?.images || []).map((i) => i.url).filter(Boolean);
  const thumbOk =
    normalizeUrl(product?.thumbnail) === normalizeUrl(gallery.thumbnail);
  const fullOk =
    gallerySignature(currentUrls) === gallerySignature(expectedUrls(gallery));
  return thumbOk && fullOk;
}

async function postProductUpdate(token, productId, body) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), WRITE_TIMEOUT_MS);
  try {
    return await admin(token, `/admin/products/${productId}`, {
      method: "POST",
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(to);
  }
}

async function updateWithRetry(token, productId, gallery) {
  const body = payloadFor(gallery);
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const t0 = Date.now();
    try {
      await postProductUpdate(token, productId, body);
      return { ms: Date.now() - t0, via: "ok" };
    } catch (err) {
      lastErr = err;
      const aborted = err?.name === "AbortError" || /aborted/i.test(String(err));
      process.stdout.write(aborted ? "timeout→verify… " : `err→verify… `);
      try {
        if (await verifyGallery(token, productId, gallery)) {
          return { ms: Date.now() - t0, via: "verified" };
        }
      } catch (verifyErr) {
        lastErr = verifyErr;
      }
      if (attempt < MAX_RETRIES) {
        const wait = 8000 * attempt;
        process.stdout.write(`retry${attempt}… `);
        await sleep(wait);
      }
    }
  }
  throw lastErr;
}

async function main() {
  console.log(`Medusa: ${MEDUSA_URL}`);
  console.log(
    `模式: ${THUMB_ONLY ? "thumb-only（1 張）" : "full gallery"}｜間隔 ${PAUSE_MS}ms｜重試 ${MAX_RETRIES}`,
  );
  if (DRY_RUN) console.log("（dry-run，不寫入）");

  const token = await login();
  const products = await fetchAllProducts(token);
  let updated = 0;
  let skipped = 0;
  let noMap = 0;
  let failed = 0;
  const failedHandles = [];

  for (const p of products) {
    const gallery = pickGallery(p.categories);
    if (!gallery) {
      noMap += 1;
      continue;
    }

    const currentUrls = (p.images || []).map((i) => i.url).filter(Boolean);
    const nextSig = gallerySignature(expectedUrls(gallery));
    const curSig = gallerySignature(currentUrls);
    const thumbOk =
      normalizeUrl(p.thumbnail) === normalizeUrl(gallery.thumbnail);

    if (thumbOk && curSig === nextSig) {
      skipped += 1;
      continue;
    }

    process.stdout.write(`  ${p.handle} … `);

    if (DRY_RUN) {
      console.log("dry-run");
      updated += 1;
      continue;
    }

    try {
      const { ms, via } = await updateWithRetry(token, p.id, gallery);
      console.log(`${via} ${ms}ms`);
      updated += 1;
      await sleep(PAUSE_MS);
    } catch (err) {
      failed += 1;
      failedHandles.push(p.handle);
      console.log(`FAIL ${String(err.message || err).slice(0, 120)}`);
      await sleep(PAUSE_MS * 2);
    }
  }

  console.log(
    `\n✅ 更新 ${updated} 筆，略過 ${skipped} 筆，失敗 ${failed} 筆，無國家圖 ${noMap} 筆（共 ${products.length}）`,
  );
  if (failedHandles.length) {
    console.log("失敗列表:", failedHandles.join(", "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
