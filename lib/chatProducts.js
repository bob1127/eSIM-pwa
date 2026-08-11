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

/** 判斷方案是否為原生線路（非漫遊） */
function isNativeVariant(v) {
  const a = v?.attributes || {};
  const hay = [a.route_type, a.ip_type, a.line, a.network]
    .filter(Boolean)
    .join(" ");
  if (/漫遊/.test(hay)) return false;
  if (/原生/.test(hay)) return true;
  // 本地／目的地國 IP（非新加坡等中繼）通常為原生
  if (
    /(日本|韓國|泰國|越南|馬來西亞|本地)\s*IP/i.test(hay) &&
    !/新加坡|SG\b/i.test(hay)
  ) {
    return true;
  }
  return false;
}

/**
 * HOT SALE 電信中，僅保留「原生」線路（AI 商品卡徽章用）。
 * 若變體缺 route_type，再看 carrier_specs；最後用名稱啟發式。
 */
function getNativeHotSaleTelecoms(product) {
  const hot = product?.hotSaleTelecoms || [];
  if (!hot.length) return [];

  return hot.filter((telecom) => {
    const related = (product.variants || []).filter((v) =>
      isHotSaleTelecom([telecom], v.attributes?.telecom),
    );
    if (related.length) return related.some(isNativeVariant);

    const spec = product.carrierSpecs?.[telecom];
    if (spec) {
      const route = String(spec.route_type || "");
      if (/漫遊/.test(route)) return false;
      if (/原生/.test(route)) return true;
    }

    // 啟發式：單電信 AU(KDDI)／IIJ／Docomo 視為原生；含「／」雙網多為漫遊
    if (/\//.test(telecom)) return false;
    return /AU\s*\(?\s*KDDI\s*\)?|IIJ|DOCOMO|Docomo/i.test(telecom);
  });
}

// 商品清單快取（結構化，不是字串）
let _itemsCache = null;
let _cacheAt = 0;

// ── 國家 → category slug 對照 ───────────────────────────────────────────
// 注意：歷史 Medusa 分類曾誤建為 "tailand"；正規 handle 為 "thailand"
const NAME_TO_CATEGORY = [
  [/日本|japan/i, "japan"],
  [/韓國|korea|首爾/i, "korea"],
  [/泰國|thailand|曼谷|tailand/i, "thailand"],
  [/越南|vietnam/i, "vietnam"],
  [/歐洲|europe/i, "europe"],
  [/美國|加拿大|usa|america/i, "usa"],
  [/澳洲|紐西蘭|australia|nz/i, "australia"],
  [/新加坡|singapore/i, "singapore"],
  [/馬來西亞|malaysia/i, "malaysia"],
  [/港澳|香港|hong\s*kong/i, "hongkong"],
  [/中國|大陸|china/i, "china"],
  [/亞洲|asia/i, "asia"],
  [/全球|global|world/i, "global"],
];

const HANDLE_SLUGS = [
  "japan",
  "korea",
  "thailand",
  "tailand",
  "vietnam",
  "europe",
  "usa",
  "australia",
  "singapore",
  "malaysia",
  "hongkong",
  "china",
  "asia",
  "global",
];

/** 查詢／商品比對用的國家同義詞（含 Medusa 拼字） */
const COUNTRY_ALIASES = [
  {
    label: "日本",
    slugs: ["japan"],
    keys: ["日本", "japan", "東京", "大阪", "沖繩", "北海道"],
  },
  {
    label: "韓國",
    slugs: ["korea"],
    keys: ["韓國", "korea", "首爾", "釜山", "濟州"],
  },
  {
    label: "泰國",
    slugs: ["thailand", "tailand"],
    keys: ["泰國", "thailand", "tailand", "曼谷", "清邁", "普吉"],
  },
  {
    label: "越南",
    slugs: ["vietnam"],
    keys: ["越南", "vietnam", "河內", "胡志明"],
  },
  {
    label: "歐洲",
    slugs: ["europe"],
    keys: ["歐洲", "europe"],
  },
  {
    label: "美國",
    slugs: ["usa"],
    keys: ["美國", "usa", "america", "加州", "紐約"],
  },
  {
    label: "中國",
    slugs: ["china"],
    keys: ["中國", "大陸", "china"],
  },
  {
    label: "新加坡／馬來西亞",
    slugs: ["singapore", "malaysia"],
    keys: ["新加坡", "馬來西亞", "singapore", "malaysia"],
  },
  {
    label: "港澳",
    slugs: ["hongkong"],
    keys: ["港澳", "香港", "澳門", "hongkong", "hong kong"],
  },
];

function guessCategoryFromName(name = "") {
  for (const [re, slug] of NAME_TO_CATEGORY) {
    if (re.test(name)) return slug;
  }
  return null;
}

function guessCategoryFromHandle(handle = "") {
  const h = String(handle || "").toLowerCase();
  if (!h) return null;
  for (const slug of HANDLE_SLUGS) {
    if (h === slug || h.startsWith(`${slug}-`) || h.includes(`-${slug}`)) {
      // 歷史 typo tailand → 正規 thailand
      if (slug === "tailand") return "thailand";
      return slug;
    }
  }
  return guessCategoryFromName(h);
}

function detectCountriesFromQuery(queryText = "") {
  const q = String(queryText || "");
  const qLower = q.toLowerCase();
  return COUNTRY_ALIASES.filter((c) =>
    c.keys.some((k) => q.includes(k) || qLower.includes(String(k).toLowerCase())),
  );
}

function productMatchesCountry(product, country) {
  const hay = [
    product.name,
    product.handle,
    product.categoryHandle,
    product.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (country.slugs.some((s) => hay.includes(s))) return true;
  return country.keys.some((k) => hay.includes(String(k).toLowerCase()));
}

/** 站內相對路徑，避免絕對網域／錯誤分類造成連錯頁 */
function buildProductUrl(product) {
  const handle = product.handle || null;
  const cat =
    product.categoryHandle ||
    guessCategoryFromName(product.name) ||
    guessCategoryFromHandle(handle) ||
    null;

  if (!handle && !cat) return "/product";
  if (!handle) return `/product/${cat}`;
  if (!cat) return `/product/${handle}`;
  if (handle === cat) return `/product/${cat}`;
  return `/product/${cat}/${handle}`;
}

// ── 關鍵字評分（找最相關商品）───────────────────────────────────────────
function scoreProduct(product, queryText) {
  if (!queryText) return 0;
  const q = queryText.toLowerCase();
  const name = (product.name || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const handle = (product.handle || "").toLowerCase();
  const cat = (product.categoryHandle || "").toLowerCase();

  let score = 0;

  // 國家同義詞加權（解決「泰國」對不到 Thailand／tailand）
  const countries = detectCountriesFromQuery(queryText);
  for (const c of countries) {
    if (productMatchesCountry(product, c)) score += 80;
  }

  // 天數提示（有寫 N 天時，名稱／方案含該天數加分）
  const dayMatch = q.match(/(\d+)\s*天/);
  if (dayMatch) {
    const d = dayMatch[1];
    if (name.includes(`${d}天`) || name.includes(`${d}日`) || desc.includes(`${d}`)) {
      score += 8;
    }
  }

  // 用量往上抓：規劃／推薦時優先吃到飽與「夠緩衝」的總量
  const planning =
    /eSIM專推|使用習慣|輕量|社群|影音|視訊|推薦適合的\s*eSIM|預留緩衝/i.test(
      queryText,
    );
  if (planning) {
    const hay = `${name} ${handle} ${desc}`;
    const isUnlimited = /吃到飽|無限|unlimited|unlimit/i.test(hay);
    const isTotal = /總量|total/i.test(hay) && !isUnlimited;
    const dayMatch2 = q.match(/(\d+)\s*天/);
    const days = dayMatch2 ? parseInt(dayMatch2[1], 10) : 0;

    // 使用習慣 → 建議「每日 GB 下限」（第 2 順位總量也要達標）
    let minGbPerDay = 1.5; // 輕量預設
    if (/工作視訊|視訊|會議|雲端/.test(queryText)) minGbPerDay = 3.5;
    else if (/影音|直播|吃到飽/.test(queryText) && /使用習慣|影音/.test(queryText))
      minGbPerDay = 5;
    else if (/社群|拍照|ig|分享/.test(queryText)) minGbPerDay = 2.5;

    const minTotalGb = days > 0 ? Math.ceil(days * minGbPerDay) : 0;

    if (isUnlimited) {
      score += 40;
      if (/工作視訊|視訊|會議|影音|直播|社群/.test(queryText)) score += 20;
    }

    const gbMatch = hay.match(/(\d+(?:\.\d+)?)\s*gb/i);
    const gb = gbMatch ? parseFloat(gbMatch[1]) : 0;

    if (isTotal || (!isUnlimited && gb > 0)) {
      if (minTotalGb > 0 && gb > 0) {
        if (gb >= minTotalGb) score += 28; // 達緩衝門檻 → 可當第 2 推薦
        else if (gb >= minTotalGb * 0.7) score += 4;
        else score -= 35; // 明顯不足（如 10 天工作視訊推 10GB）
      }
      if (gb > 0 && gb <= 3) score -= 18;
      else if (gb >= 20) score += 8;
      else if (gb >= 10) score += 2;
    }

    // 工作／影音：壓低「非吃到飽且總量不足」
    if (/工作視訊|視訊|會議|影音|直播/.test(queryText) && !isUnlimited) {
      if (minTotalGb > 0 && gb > 0 && gb < minTotalGb) score -= 25;
    }
  }

  // 短 token：2～6 字中文／英文，避免整句當 token 對不到
  const tokens = q.match(/[\u4e00-\u9fff]{2,6}|[a-z0-9]{3,}/g) || [];
  for (const t of tokens) {
    if (name.includes(t)) score += 5;
    if (handle.includes(t) || cat.includes(t)) score += 4;
    if (desc.includes(t)) score += 1;
  }
  return score;
}

/** 關鍵字相關者先留下，再以 HOT SALE 優先 */
function pickRelevantProducts(all, queryText, limit = 3) {
  if (!queryText) return all.slice(0, limit);

  const countries = detectCountriesFromQuery(queryText);
  let pool = all;
  if (countries.length) {
    // 有指定國家時：只准回該國商品；沒貨就回空陣列，禁止改推其他國家
    pool = all.filter((p) =>
      countries.some((c) => productMatchesCountry(p, c)),
    );
    if (!pool.length) return [];
  }

  const scored = pool
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
    const categoryHandle =
      p.metadata?.category_handle ||
      p.metadata?.categoryHandle ||
      p.metadata?.category_slug ||
      null;
    return {
      name: p.name,
      description: p.description || "",
      handle: p.handle || null,
      categoryHandle,
      imageUrl: p.image_url || null,
      hotSaleTelecoms,
      carrierSpecs:
        p.metadata?.carrier_specs_by_carrier &&
        typeof p.metadata.carrier_specs_by_carrier === "object"
          ? p.metadata.carrier_specs_by_carrier
          : {},
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
      "+metadata,*categories,*variants,*variants.metadata,*variants.prices,*variants.options,*variants.options.option",
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
      const categoryHandle =
        p.categories?.[0]?.handle ||
        p.metadata?.category_handle ||
        null;
      return {
        name: f.name,
        description: f.description || "",
        handle: f.handle || null,
        categoryHandle,
        imageUrl: f.image_url || null,
        hotSaleTelecoms,
        carrierSpecs:
          p.metadata?.carrier_specs_by_carrier &&
          typeof p.metadata.carrier_specs_by_carrier === "object"
            ? p.metadata.carrier_specs_by_carrier
            : {},
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
    // 聊天推薦以 Medusa 即時目錄為準（本機／正式都較新）；Supabase 可能尚未同步新國家
    let items = await loadFromMedusa();
    if (!items?.length) items = await loadFromSupabase();
    if (!items) items = [];

    console.log(`[chatProducts] Cached ${items.length} products (prefer Medusa)`);
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
  const { days, data, data_amount, gb, telecom } = v.attributes || {};
  const dataLabel = data || data_amount || (gb ? `${gb}GB` : null);
  const parts = [];
  if (telecom) parts.push(telecom);
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

  const countries = detectCountriesFromQuery(queryText);
  let items = queryText
    ? pickRelevantProducts(all, queryText, 3)
    : all.slice(0, 3);

  // 有指定國家但對不到：不要改塞其他國家商品，避免 AI 說「沒有」又亂推
  if (queryText && !items.length) {
    if (countries.length) {
      const labels = countries.map((c) => c.label).join("、");
      return (
        `【最新商品資料庫】\n` +
        `【無庫存｜${labels}】目前 Jeko 官網商品資料庫沒有「${labels}」eSIM 方案。\n` +
        `【強制回覆】必須清楚告訴使用者：這個目的地目前尚未上架／找不到相符方案。\n` +
        `【禁止捏造】禁止自行編造任何方案名稱、電信商（如 AT&T、Verizon）、天數、流量、價格或購買連結。\n` +
        `可引導至 /product 瀏覽其他已上架國家，或請使用者改選其他目的地／轉真人客服。\n` +
        `禁止推薦其他電信／eSIM 電商網站。`
      );
    }
    return (
      `【最新商品資料庫】\n` +
      `（目前找不到與問題相符的 eSIM 方案。請引導至 /product 或轉真人客服；禁止捏造方案。）`
    );
  }

  const lines = ["【最新商品資料庫（來源：Jeko 官網／Medusa）】"];
  for (const p of items) {
    const path = buildProductUrl(p);
    const url = path.startsWith("http") ? path : `${SITE}${path}`;
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
    "\n【重要｜禁止捏造商品】回答時只能引用上方「▸」列出的商品名稱、方案與購買連結；聊天室會顯示商品卡。" +
      "禁止推薦未列出的方案，禁止憑印象編造電信商／天數／流量／價格。" +
      "禁止推薦其他電信或 eSIM 電商（競品網站一律禁止）。" +
      "【HOT SALE｜一律優先】若方案標 [HOT SALE] 或商品註明 HOT SALE 電信，推薦時必須主推該電信商；" +
      "不要主推非 HOT SALE 電信，除非使用者明確指定。" +
      "【用量緩衝】第 1 優先吃到飽／高容量；第 2 可推總量型但必須達「天數×每日下限」：" +
      "輕量≈1.5GB/日、社群≈2.5GB/日、工作視訊≈3.5GB/日、影音≈5GB/日。" +
      "禁止推剛好均攤（如 10天10GB 給工作視訊）；不夠用的方案不要湊數推薦。" +
      "價格以資料庫為準，禁止臆測。",
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
    const nativeHot = getNativeHotSaleTelecoms(p);
    return {
      name: p.name,
      description: p.description || "",
      imageUrl: p.imageUrl || null,
      url: buildProductUrl(p),
      minPrice,
      maxPrice,
      variantCount: p.variants?.length || 0,
      // AI 推薦卡：僅原生 HOT SALE 電信才顯示徽章（漫遊 HOT SALE 不標）
      isHotSale: nativeHot.length > 0,
      hotSaleTelecoms: nativeHot,
    };
  });
}

/** 清除快取（商品更新或同步後呼叫） */
export function clearProductKnowledgeCache() {
  _itemsCache = null;
  _cacheAt = 0;
}
