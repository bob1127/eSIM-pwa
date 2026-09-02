import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { internalCatalogHeaders } from "./internal-catalog-headers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, "..", "..", ".env.local");
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

export const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
export const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
export const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
export const PROFIT = 40;
export const MARGIN = 1 + PROFIT / 100;
export const HKD_TO_TWD = Number(
  process.env.HKD_TO_TWD ||
    process.env.ESIM_FX_RATE_HKD ||
    process.env.NEXT_PUBLIC_ESIM_FX_RATE_HKD ||
    4.5,
);
export const BATCH_SIZE = 40;
export const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
export const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");
export const THUMB =
  process.env.UAE_PRODUCT_THUMB ||
  `${SITE_ORIGIN}/images/${encodeURIComponent("分類eSIM-多國.png")}`;

export function retailFromCost(costTwd) {
  return Math.ceil((costTwd * MARGIN) / 10) * 10 - 1;
}

/** 選品神器同款：波蘭 IP（PL）→ GPT＋Gemini 可用 */
export function supportsGptGemini(p) {
  const ip = String(p.ip || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const apn = String(p.apn || "").toLowerCase();
  const roamingApns = [
    "3gnet",
    "globaldata",
    "cuniq",
    "cmhk",
    "mobile.three.com.hk",
    "ctm-mobile",
    "plus.4g",
  ];
  if (roamingApns.some((k) => apn.includes(k))) return false;
  if (!ip || ip === "HK" || ip.includes("HK,") || ip.startsWith("HK,")) {
    return false;
  }
  if (ip.includes("CN")) return false;
  return true;
}

export function is128kbps(p) {
  const blob = `${p.rule_desc || ""} ${p.speed_desc || ""} ${p.special_desc || ""}`.toLowerCase();
  return /128\s*kbps/.test(blob);
}

export async function fetchPlans() {
  const localCache = "/tmp/esim-full-plans.json";
  const urls = [
    process.env.ESIM_LIST_URL,
    "http://localhost:3000/api/esim/test-list",
    "https://www.jeko-esim.com.tw/api/esim/test-list",
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: internalCatalogHeaders(),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.result || [];
      if (list.length) {
        fs.writeFileSync(localCache, JSON.stringify(data));
        console.log(`📥 方案目錄 ${list.length} 筆（${url}）`);
        return list;
      }
    } catch (e) {
      console.warn(`⚠️ ${url}: ${e.message}`);
    }
  }

  if (fs.existsSync(localCache)) {
    const data = JSON.parse(fs.readFileSync(localCache, "utf8"));
    console.log("📥 使用快取 /tmp/esim-full-plans.json");
    return data.result || [];
  }
  throw new Error("無法取得方案目錄");
}

export async function login() {
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

export async function admin(token, apiPath, options = {}, retries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
    } catch (e) {
      lastErr = e;
      console.warn(
        `⚠️ admin ${apiPath} 失敗 (${attempt}/${retries}): ${e.message}`,
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  throw lastErr;
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function ensureCategory(token) {
  const { product_categories: cats } = await admin(
    token,
    "/admin/product-categories?limit=200",
  );
  const CATEGORY_NAME = "杜拜、阿布達比";
  const existing = (cats || []).find(
    (c) =>
      c.handle === "uae" ||
      c.handle === "middle-east" ||
      /阿聯|UAE|杜拜|阿布達比|中東/.test(String(c.name || "")),
  );
  if (existing) {
    if (existing.name !== CATEGORY_NAME) {
      await admin(token, `/admin/product-categories/${existing.id}`, {
        method: "POST",
        body: JSON.stringify({ name: CATEGORY_NAME }),
      });
      console.log("📂 分類已更名", existing.id, existing.handle, CATEGORY_NAME);
    } else {
      console.log("📂 分類", existing.id, existing.handle, existing.name);
    }
    return existing.id;
  }
  const created = await admin(token, "/admin/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: CATEGORY_NAME,
      handle: "uae",
      is_active: true,
      is_internal: false,
    }),
  });
  const id = created.product_category?.id;
  console.log("🆕 已建立分類", id, "uae");
  return id;
}

export async function syncProduct(token, {
  handle,
  payloadBase,
  variants,
  rebuild,
}) {
  const categoryId = await ensureCategory(token);
  payloadBase.categories = [{ id: categoryId }];

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(handle)}&limit=1&fields=*variants,*options,*categories,*sales_channels`,
  );
  let product = products?.[0];

  if (!product) {
    console.log("🆕 建立商品…");
    const first = variants[0];
    const rest = variants.slice(1);
    const created = await admin(token, "/admin/products", {
      method: "POST",
      body: JSON.stringify({ ...payloadBase, variants: [first] }),
    });
    product = created.product;
    console.log("✅ 已建立", product.id, product.handle);

    for (const [i, batch] of chunk(rest, BATCH_SIZE).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + batch ${i + 1}: ${batch.length} variants`);
    }
    return product;
  }

  console.log("♻️ 更新既有商品", product.id);
  await admin(token, `/admin/products/${product.id}`, {
    method: "POST",
    body: JSON.stringify({
      title: payloadBase.title,
      subtitle: payloadBase.subtitle,
      description: payloadBase.description,
      status: "published",
      discountable: true,
      thumbnail: payloadBase.thumbnail,
      images: payloadBase.images,
      metadata: payloadBase.metadata,
      options: payloadBase.options,
      sales_channels: payloadBase.sales_channels,
      categories: payloadBase.categories,
    }),
  });

  if (!rebuild) {
    console.log("（未加 --rebuild，僅更新商品資訊；變體不變）");
    return product;
  }

  const oldIds = [];
  let offset = 0;
  for (;;) {
    const page = await admin(
      token,
      `/admin/products/${product.id}/variants?limit=${BATCH_SIZE}&offset=${offset}&fields=id`,
    );
    const pageRows = page.variants || [];
    oldIds.push(...pageRows.map((v) => v.id).filter(Boolean));
    if (pageRows.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  if (oldIds.length) {
    for (const batch of chunk(oldIds, BATCH_SIZE)) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ delete: batch }),
      });
    }
    console.log(`🗑 已刪 ${oldIds.length} 舊變體`);
  }
  for (const [i, batch] of chunk(variants, BATCH_SIZE).entries()) {
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: batch }),
    });
    console.log(`  + batch ${i + 1}: ${batch.length} variants`);
  }
  return product;
}
