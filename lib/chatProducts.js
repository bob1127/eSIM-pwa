/**
 * chatProducts.js
 * 從 Supabase 讀取已同步的商品，依使用者問題關鍵字篩選最相關 1-2 個。
 * 優先 Supabase，若為空則 fallback Medusa。
 * 內建 5 分鐘 in-memory cache（所有商品列表）。
 */

import { getSupabaseAdminServer } from "./supabaseAdminServer";
import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
  formatMedusaProductForPartner,
  isVisibleOnMainSite,
} from "./medusaStoreApi";
import { parseHotSaleTelecoms, isHotSaleTelecom } from "./productHotSale";

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
).replace(/\/$/, "");

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘

// 商品清單快取（結構化，不是字串）
let _itemsCache = null;
let _cacheAt = 0;

// ── 國家 → category slug 對照 ───────────────────────────────────────────
const NAME_TO_CATEGORY = [
  [/日本/,        "japan"],
  [/韓國/,        "korea"],
  [/泰國/,        "thailand"],
  [/歐洲/,        "europe"],
  [/美國|加拿大/, "usa"],
  [/澳洲|紐西蘭/, "australia"],
  [/新加坡/,      "singapore"],
  [/馬來西亞/,    "malaysia"],
  [/港澳|香港/,   "hongkong"],
  [/亞洲/,        "asia"],
  [/全球/,        "global"],
];

function guessCategoryFromName(name = "") {
  for (const [re, slug] of NAME_TO_CATEGORY) {
    if (re.test(name)) return slug;
  }
  return null;
}

function buildProductUrl(product) {
  if (!product.handle) return `${SITE}/product`;
  const cat = guessCategoryFromName(product.name) || "esim";
  return `${SITE}/product/${cat}/${product.handle}`;
}

// ── 關鍵字評分（找最相關商品）───────────────────────────────────────────
function scoreProduct(product, queryText) {
  if (!queryText) return 0;
  const q = queryText.toLowerCase();
  const name = (product.name || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();

  let score = 0;
  // 每個雙字元（含以上）中文詞或英文詞給分
  const tokens = q.match(/[\u4e00-\u9fff]{2,}|[a-z0-9]{3,}/g) || [];
  for (const t of tokens) {
    if (name.includes(t)) score += 5;
    if (desc.includes(t)) score += 1;
  }
  return score;
}

/** 關鍵字相關者先留下，再以 HOT SALE 優先 */
function pickRelevantProducts(all, queryText, limit = 3) {
  if (!queryText) return all.slice(0, limit);
  const scored = all
    .map((p) => ({
      p,
      score: scoreProduct(p, queryText),
      hot: Array.isArray(p.hotSaleTelecoms) && p.hotSaleTelecoms.length > 0,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (a.hot !== b.hot) return a.hot ? -1 : 1;
      return b.score - a.score;
    });
  return scored.slice(0, limit).map((x) => x.p);
}

function sortVariantsHotSaleFirst(variants = [], hotSaleTelecoms = []) {
  if (!hotSaleTelecoms?.length) return variants;
  return [...variants].sort((a, b) => {
    const at = a.attributes?.telecom || "";
    const bt = b.attributes?.telecom || "";
    const ah = isHotSaleTelecom(hotSaleTelecoms, at);
    const bh = isHotSaleTelecom(hotSaleTelecoms, bt);
    if (ah !== bh) return ah ? -1 : 1;
    return (a.retail_price || a.b2b_price || 0) - (b.retail_price || b.b2b_price || 0);
  });
}

// ── Supabase loader ────────────────────────────────────────────────────
async function loadFromSupabase() {
  const supabase = getSupabaseAdminServer();

  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, description, handle, image_url, metadata")
    .order("created_at", { ascending: true });

  if (prodErr) {
    // metadata 欄位可能不存在：退回精簡 select
    const fallback = await supabase
      .from("products")
      .select("id, name, description, handle, image_url")
      .order("created_at", { ascending: true });
    if (fallback.error) {
      console.error("[chatProducts] Supabase error:", prodErr.message);
      return null;
    }
    if (!fallback.data?.length) return null;
    return hydrateSupabaseProducts(fallback.data);
  }
  if (!products?.length) return null;
  return hydrateSupabaseProducts(products);
}

async function hydrateSupabaseProducts(products) {
  const supabase = getSupabaseAdminServer();
  const { data: variations } = await supabase
    .from("product_variations")
    .select("product_id, sku, title, retail_price, b2b_price, attributes")
    .order("retail_price", { ascending: true });

  const variMap = {};
  for (const v of variations || []) {
    if (!variMap[v.product_id]) variMap[v.product_id] = [];
    variMap[v.product_id].push(v);
  }

  return products.map((p) => {
    const hotSaleTelecoms = parseHotSaleTelecoms(
      p.metadata?.hot_sale_telecoms,
    );
    const variants = (variMap[p.id] || []).map((v) => ({
      title: v.title,
      attributes: v.attributes || {},
      retail_price: v.retail_price || v.b2b_price || 0,
      b2b_price: v.b2b_price || 0,
    }));
    return {
      name: p.name,
      description: p.description || "",
      handle: p.handle || null,
      imageUrl: p.image_url || null,
      hotSaleTelecoms,
      variants: sortVariantsHotSaleFirst(variants, hotSaleTelecoms),
    };
  });
}

// ── Medusa fallback loader ─────────────────────────────────────────────
async function loadFromMedusa() {
  const backendUrl = getMedusaBackendUrl();
  const key = getMedusaPublishableKey();
  if (!key) return null;

  const qs = new URLSearchParams({
    limit: "100",
    fields:
      "+metadata,*variants,*variants.prices,*variants.options,*variants.options.option",
  });

  const res = await fetch(`${backendUrl}/store/products?${qs}`, {
    headers: { "x-publishable-api-key": key },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const all = (data.products || []).filter(isVisibleOnMainSite);
  if (!all.length) return null;

  console.log(`[chatProducts] Medusa fallback: ${all.length} products`);
  return Promise.all(
    all.map(async (p) => {
      const f = await formatMedusaProductForPartner(p);
      const hotSaleTelecoms = parseHotSaleTelecoms(
        p.metadata?.hot_sale_telecoms || f.metadata?.hot_sale_telecoms,
      );
      const variants = (f.variants || []).map((v) => ({
        title: v.title,
        attributes: v.attributes || {},
        retail_price: v.retail_price || 0,
        b2b_price: v.b2b_price || 0,
      }));
      return {
        name: f.name,
        description: f.description || "",
        handle: f.handle || null,
        imageUrl: f.image_url || null,
        hotSaleTelecoms,
        variants: sortVariantsHotSaleFirst(variants, hotSaleTelecoms),
      };
    }),
  );
}

// ── 取得所有商品（帶快取）─────────────────────────────────────────────
async function getAllProductsCached() {
  const now = Date.now();
  if (_itemsCache && now - _cacheAt < CACHE_TTL_MS) return _itemsCache;

  try {
    let items = await loadFromSupabase();
    if (!items) items = await loadFromMedusa();
    if (!items) items = [];

    console.log(`[chatProducts] Cached ${items.length} products`);
    _itemsCache = items;
    _cacheAt = now;
    return items;
  } catch (err) {
    console.error("[chatProducts] getAllProducts error:", err?.message);
    return _itemsCache || [];
  }
}

// ── 格式化 variant 標籤 ────────────────────────────────────────────────
function formatVariantLabel(v) {
  const { days, data, data_amount, gb } = v.attributes || {};
  const dataLabel = data || data_amount || (gb ? `${gb}GB` : null);
  const parts = [];
  if (days) parts.push(`${days} 天`);
  if (dataLabel) parts.push(dataLabel);
  const price = v.retail_price || v.b2b_price;
  if (price) parts.push(`NT$${Math.round(price)}`);
  return parts.join(" / ");
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * 依問題篩選最相關 1-2 個商品，回傳 prompt 知識庫文字。
 */
export async function fetchProductKnowledge(queryText = "") {
  const all = await getAllProductsCached();
  if (!all.length) {
    return "【最新商品資料庫】\n（目前商品資料暫時無法取得，請稍後再試或聯繫客服）";
  }

  // 有查詢文字 → 先關鍵字相關，再 HOT SALE 優先；無查詢 → 取前幾個
  let items = queryText
    ? pickRelevantProducts(all, queryText, 2)
    : all.slice(0, 3);
  if (queryText && !items.length) items = all.slice(0, 3);

  const lines = ["【最新商品資料庫（來源：Jeko 官網）】"];
  for (const p of items) {
    const url = buildProductUrl(p);
    const hotNote =
      p.hotSaleTelecoms?.length > 0
        ? `（HOT SALE：${p.hotSaleTelecoms.join("、")}）`
        : "";
    lines.push(`\n▸ ${p.name}${hotNote}`);
    if (p.description) lines.push(`  說明：${p.description}`);
    lines.push(`  購買連結：${url}`);
    if (p.variants?.length) {
      const shown = p.variants.slice(0, 10);
      lines.push(`  方案（共 ${p.variants.length} 種，HOT SALE 電信優先列出）：`);
      for (const v of shown) {
        const telecom = v.attributes?.telecom || "";
        const hot = isHotSaleTelecom(p.hotSaleTelecoms, telecom);
        const label = formatVariantLabel(v);
        if (label) lines.push(`    - ${hot ? "[HOT SALE] " : ""}${label}`);
      }
      if (p.variants.length > 10) lines.push(`    ...詳見購買連結`);
    }
  }
  lines.push(
    "\n【重要】回答時只引用上方商品資料；若有標 [HOT SALE] 或 HOT SALE 電信，優先推薦該電信方案；連結直接貼購買連結；價格以資料庫為準，禁止臆測。",
  );
  return lines.join("\n");
}

/**
 * 依問題篩選最相關商品，回傳結構化 Card 陣列（供前端渲染推薦卡片）。
 */
export async function fetchProductCards(queryText = "") {
  const all = await getAllProductsCached();
  if (!all.length) return [];

  const items = queryText ? pickRelevantProducts(all, queryText, 3) : [];

  return items.map((p) => {
    const prices = (p.variants || [])
      .map((v) => v.retail_price || v.b2b_price || 0)
      .filter((n) => n > 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    return {
      name: p.name,
      description: p.description || "",
      imageUrl: p.imageUrl || null,
      url: buildProductUrl(p),
      minPrice,
      maxPrice,
      variantCount: p.variants?.length || 0,
      isHotSale: Array.isArray(p.hotSaleTelecoms) && p.hotSaleTelecoms.length > 0,
      hotSaleTelecoms: p.hotSaleTelecoms || [],
    };
  });
}

/** 清除快取（商品更新或同步後呼叫） */
export function clearProductKnowledgeCache() {
  _itemsCache = null;
  _cacheAt = 0;
}
