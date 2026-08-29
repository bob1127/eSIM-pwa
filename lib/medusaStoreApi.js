import { resolveMedusaImageUrl } from "./resolveMedusaImageUrl";
import {
  parseRetailPrice,
  resolveApiWholesalePrice,
  resolveApiWholesalePriceDetailed,
  resolveApiWholesalePriceLive,
  applyPartnerB2BMarkup,
} from "./medusaPartnerPricing";
import { parseHotSaleTelecoms } from "./productHotSale";

export function getMedusaBackendUrl() {
  return (
    process.env.MEDUSA_SYNC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    "http://localhost:9000"
  ).replace(/\/$/, "");
}

/** 前台／選品管理讀目錄：優先本機或公開 Store URL，避免誤打同步用遠端而逾時 */
export function getMedusaStoreApiUrl() {
  return (
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    process.env.MEDUSA_SYNC_BACKEND_URL ||
    "http://localhost:9000"
  ).replace(/\/$/, "");
}

export function getMedusaPublishableKey() {
  return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
}

let regionsCache = { value: null, ts: 0 };
const REGIONS_TTL_MS = 10 * 60 * 1000;

export async function fetchMedusaRegions() {
  if (regionsCache.value && Date.now() - regionsCache.ts < REGIONS_TTL_MS) {
    return regionsCache.value;
  }
  const backendUrl = getMedusaStoreApiUrl();
  const key = getMedusaPublishableKey();
  const res = await fetch(`${backendUrl}/store/regions`, {
    headers: { "x-publishable-api-key": key },
  });
  if (!res.ok) throw new Error(`Medusa regions ${res.status}`);
  const data = await res.json();
  const region =
    data.regions?.find((r) => r.currency_code?.toLowerCase() === "twd") ||
    data.regions?.[0] ||
    null;
  regionsCache = { value: region, ts: Date.now() };
  return region;
}

export function parseVariantAttributes(variant) {
  let attrs = {};
  if (variant.metadata?.attributes) {
    try {
      attrs =
        typeof variant.metadata.attributes === "string"
          ? JSON.parse(variant.metadata.attributes)
          : variant.metadata.attributes;
    } catch {
      /* ignore */
    }
  }
  attrs = { ...variant.metadata, ...attrs };

  variant.options?.forEach((opt) => {
    const val = String(opt.value || "").trim();
    if (!val) return;
    const title = opt.option?.title || "";

    if (val.includes("天") || val.includes("Days") || title.includes("天數")) {
      attrs.days = parseInt(val, 10) || val.replace(/[^\d]/g, "");
    } else if (
      val.includes("流量") ||
      val.includes("GB") ||
      val.includes("MB") ||
      val.includes("吃到飽") ||
      title.includes("數據")
    ) {
      attrs.data = val;
      attrs.data_amount = val;
    } else {
      attrs.telecom = val;
    }
  });

  attrs.medusa_variant_id = variant.id;
  if (variant.metadata?.plan_id) attrs.plan_id = variant.metadata.plan_id;

  return attrs;
}

export async function formatMedusaProductForPartner(
  product,
  { liveCost = true, includeVariants = true } = {},
) {
  const meta = product.metadata || {};
  const variants = product.variants || [];

  let formattedVariants;
  if (liveCost) {
    // 單一商品同步／上架：可打 MicroeSIM 即時底價
    formattedVariants = await Promise.all(
      variants.map(async (v) => {
        const { value: api_b2b_price, source: b2bPriceSource } =
          await resolveApiWholesalePriceLive(v, meta);
        return {
          medusa_variant_id: v.id,
          sku: v.sku,
          title: v.title,
          retail_price: parseRetailPrice(v),
          api_b2b_price,
          b2bPriceSource,
          b2b_price: applyPartnerB2BMarkup(api_b2b_price),
          attributes: parseVariantAttributes(v),
        };
      }),
    );
  } else {
    // 選品管理商品池：只用本地 metadata／明確比例，毫秒級；不用零售價×1
    formattedVariants = variants.map((v) => {
      const detailed = resolveApiWholesalePriceDetailed(v, meta);
      return {
        medusa_variant_id: v.id,
        sku: v.sku,
        title: v.title,
        retail_price: parseRetailPrice(v),
        api_b2b_price: detailed.value,
        b2bPriceSource: detailed.source,
        b2b_price: applyPartnerB2BMarkup(detailed.value),
        attributes: parseVariantAttributes(v),
      };
    });
  }

  const b2bPrices = formattedVariants
    .map((v) => v.b2b_price)
    .filter((p) => p > 0);

  return {
    medusa_product_id: product.id,
    handle: product.handle,
    name: product.title,
    description: product.description || "",
    image_url: resolveMedusaImageUrl(product.thumbnail),
    planCount: formattedVariants.length,
    minB2B: b2bPrices.length ? Math.min(...b2bPrices) : 0,
    minRetail: formattedVariants.length
      ? Math.min(...formattedVariants.map((v) => v.retail_price).filter(Boolean))
      : 0,
    hot_sale_telecoms: parseHotSaleTelecoms(meta.hot_sale_telecoms),
    ...(includeVariants ? { variants: formattedVariants } : {}),
    b2b_cost_rate: meta.b2b_cost_rate ?? null,
    created_at: product.created_at || null,
  };
}

/** 與主站相同：Sales Channel 內已發布商品（排除 partner_only） */
export function isVisibleOnMainSite(product) {
  const v = product?.metadata?.visibility;
  if (!v) return true;
  return v !== "partner_only" && v !== "internal";
}

/** 夥伴後台／API：拉取主站可售商品全目錄（分頁至 MEDUSA_PRODUCT_FETCH_CAP） */
export async function fetchAllVisibleStoreProducts(
  fields = "id,title,handle,thumbnail,+metadata,*categories,*variants,*variants.metadata,*variants.options",
) {
  const all = await fetchMedusaStoreProductPages(({ limit, offset }) => {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      fields,
    });
    return query;
  });
  return all.filter(isVisibleOnMainSite);
}

/** Medusa 目錄分頁安全上限（避免無限 loop；預設約 3000 筆） */
const MEDUSA_PRODUCT_FETCH_CAP =
  Number(process.env.MEDUSA_PRODUCT_FETCH_CAP) || 3000;

async function fetchMedusaStoreProductPages(buildQuery) {
  const backendUrl = getMedusaStoreApiUrl();
  const key = getMedusaPublishableKey();
  if (!key) throw new Error("缺少 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");

  const headers = { "x-publishable-api-key": key };
  const all = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const query = buildQuery({ limit, offset });
    const res = await fetch(`${backendUrl}/store/products?${query}`, {
      headers,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Medusa products ${res.status}: ${text.slice(0, 180) || "非 JSON 回應"}`,
      );
    }
    if (!res.ok) {
      throw new Error(`Medusa products ${res.status}: ${JSON.stringify(data)}`);
    }

    const batch = data.products || [];
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset >= MEDUSA_PRODUCT_FETCH_CAP) {
      console.warn(
        `[medusa] product fetch hit cap (${MEDUSA_PRODUCT_FETCH_CAP})`,
      );
      break;
    }
  }

  return all;
}

export async function fetchAllMedusaStoreProducts({
  partnerPool = false,
  liveCost,
  includeVariants,
} = {}) {
  const key = getMedusaPublishableKey();
  if (!key) throw new Error("缺少 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");

  // 商品池列表不需要即時底價、也不需要回傳整包變體（payload 會很大）
  const useLiveCost = liveCost ?? !partnerPool;
  const useIncludeVariants = includeVariants ?? !partnerPool;

  // 選品管理：只抓商品摘要（不展開數百個方案），速度從數十秒降到約 1 秒內
  if (partnerPool) {
    return fetchMedusaStoreProductSummaries();
  }

  const region = await fetchMedusaRegions();
  const all = await fetchMedusaStoreProductPages(({ limit, offset }) => {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      fields:
        "+metadata,*variants,*variants.metadata,*variants.prices,*variants.calculated_price,*variants.options",
    });
    if (region?.id) query.set("region_id", region.id);
    return query;
  });

  const filtered = all.filter(isVisibleOnMainSite);

  return Promise.all(
    filtered.map((p) =>
      formatMedusaProductForPartner(p, {
        liveCost: useLiveCost,
        includeVariants: useIncludeVariants,
      }),
    ),
  );
}

/**
 * 選品管理專用：抓變體 metadata 算方案數／最低 API 底價（cost_price／b2b_price）。
 * 不做 MicroeSIM 即時報價（那是上架／結帳用）；列表顯示後再乘 PARTNER_B2B_COST_RATE。
 * 結果會被 product-pool 的 Supabase 快照覆寫（若該商品已同步）。
 */
export async function fetchMedusaStoreProductSummaries() {
  const all = await fetchMedusaStoreProductPages(({ limit, offset }) =>
    new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      fields:
        "+metadata,*categories,*variants,*variants.metadata,*variants.prices",
    }),
  );

  return all.filter(isVisibleOnMainSite).map((product) => {
    const meta = product.metadata || {};
    const variants = product.variants || [];
    const categoryNames = (product.categories || [])
      .map((c) => c?.name || c?.handle || "")
      .filter(Boolean);
    let minApi = 0;
    for (const v of variants) {
      const api = resolveApiWholesalePriceDetailed(v, meta).value;
      if (api > 0 && (minApi === 0 || api < minApi)) minApi = api;
    }

    return {
      medusa_product_id: product.id,
      id: product.id,
      handle: product.handle,
      title: product.title,
      name: product.title,
      description: product.description || "",
      image_url: resolveMedusaImageUrl(product.thumbnail),
      thumbnail: resolveMedusaImageUrl(product.thumbnail),
      categories: categoryNames,
      category: categoryNames[0] || "",
      planCount: variants.length,
      // 夥伴可見底價（已含平台抽成）
      minB2B: minApi > 0 ? applyPartnerB2BMarkup(minApi) : 0,
      minRetail: 0,
      b2b_cost_rate: meta.b2b_cost_rate ?? null,
      created_at: product.created_at || null,
      costSource: minApi > 0 ? "medusa_metadata" : "unavailable",
    };
  });
}

export async function fetchMedusaProductById(medusaProductId) {
  const backendUrl = getMedusaBackendUrl();
  const key = getMedusaPublishableKey();
  const region = await fetchMedusaRegions();
  const query = new URLSearchParams({
    id: medusaProductId,
    fields:
      "+metadata,*variants,*variants.metadata,*variants.prices,*variants.calculated_price,*variants.options,*variants.options.option",
  });
  if (region?.id) query.set("region_id", region.id);

  const res = await fetch(`${backendUrl}/store/products?${query}`, {
    headers: { "x-publishable-api-key": key },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Medusa product ${res.status}`);
  const product = data.products?.[0];
  if (!product) throw new Error(`找不到 Medusa 商品 ${medusaProductId}`);
  return await formatMedusaProductForPartner(product);
}

/**
 * 輕量：只抓 metadata.hot_sale_telecoms（夥伴定價頁標示用）
 * @param {string[]} medusaProductIds
 * @returns {Promise<Record<string, string[]>>}
 */
export async function fetchMedusaHotSaleMapByIds(medusaProductIds = []) {
  const ids = [...new Set((medusaProductIds || []).map(String).filter(Boolean))];
  if (!ids.length) return {};

  const backendUrl = getMedusaBackendUrl();
  const key = getMedusaPublishableKey();
  if (!key) return {};

  const headers = { "x-publishable-api-key": key };
  const map = {};
  const chunkSize = 20;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const query = new URLSearchParams({
            id,
            fields: "id,+metadata",
            limit: "1",
          });
          const res = await fetch(`${backendUrl}/store/products?${query}`, {
            headers,
          });
          if (!res.ok) return;
          const data = await res.json();
          const product = data.products?.[0];
          if (!product?.id) return;
          map[String(product.id)] = parseHotSaleTelecoms(
            product.metadata?.hot_sale_telecoms,
          );
        } catch {
          /* ignore single failure */
        }
      }),
    );
  }

  return map;
}

/**
 * 輕量：依 Medusa id 批次抓最新 thumbnail（夥伴賣場列表用）
 * @param {string[]} medusaProductIds
 * @returns {Promise<Record<string, string|null>>}
 */
export async function fetchMedusaThumbnailMapByIds(medusaProductIds = []) {
  const ids = [...new Set((medusaProductIds || []).map(String).filter(Boolean))];
  if (!ids.length) return {};

  const backendUrl = getMedusaStoreApiUrl();
  const key = getMedusaPublishableKey();
  if (!key) return {};

  const headers = { "x-publishable-api-key": key };
  const map = {};
  const chunkSize = 20;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const query = new URLSearchParams({
            id,
            fields: "id,thumbnail",
            limit: "1",
          });
          const res = await fetch(`${backendUrl}/store/products?${query}`, {
            headers,
          });
          if (!res.ok) return;
          const data = await res.json();
          const product = data.products?.[0];
          if (!product?.id) return;
          map[String(product.id)] =
            resolveMedusaImageUrl(product.thumbnail) || null;
        } catch {
          /* ignore single failure */
        }
      }),
    );
  }

  return map;
}
