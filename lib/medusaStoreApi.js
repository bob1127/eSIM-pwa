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

export function getMedusaPublishableKey() {
  return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
}

let regionsCache = { value: null, ts: 0 };
const REGIONS_TTL_MS = 10 * 60 * 1000;

export async function fetchMedusaRegions() {
  if (regionsCache.value && Date.now() - regionsCache.ts < REGIONS_TTL_MS) {
    return regionsCache.value;
  }
  const backendUrl = getMedusaBackendUrl();
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

export async function fetchAllMedusaStoreProducts({
  partnerPool = false,
  liveCost,
  includeVariants,
} = {}) {
  const backendUrl = getMedusaBackendUrl();
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
  const headers = { "x-publishable-api-key": key };
  const all = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      fields:
        "+metadata,*variants,*variants.metadata,*variants.prices,*variants.calculated_price,*variants.options",
    });
    if (region?.id) query.set("region_id", region.id);

    const res = await fetch(`${backendUrl}/store/products?${query}`, { headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Medusa products ${res.status}: ${JSON.stringify(data)}`);
    }

    const batch = data.products || [];
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 500) break;
  }

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
 * 選品管理專用：只回商品層摘要，不做變體展開／即時底價。
 * planCount / minB2B 由呼叫端用 Supabase 補上（見 product-pool API）。
 */
export async function fetchMedusaStoreProductSummaries() {
  const backendUrl = getMedusaBackendUrl();
  const key = getMedusaPublishableKey();
  if (!key) throw new Error("缺少 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");

  const headers = { "x-publishable-api-key": key };
  const all = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      fields: "id,title,handle,thumbnail,description,created_at,+metadata,*categories",
    });

    const res = await fetch(`${backendUrl}/store/products?${query}`, { headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Medusa products ${res.status}: ${JSON.stringify(data)}`);
    }

    const batch = data.products || [];
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 500) break;
  }

  return all.filter(isVisibleOnMainSite).map((p) => {
    const meta = p.metadata || {};
    // metadata 可選填摘要，沒有的話由 Supabase 補
    const metaPlanCount = Number(meta.plan_count || meta.planCount) || 0;
    const metaMinB2B = Number(meta.min_b2b || meta.minB2B) || 0;
    return {
      medusa_product_id: p.id,
      id: p.id,
      handle: p.handle,
      title: p.title,
      name: p.title,
      description: p.description || "",
      image_url: resolveMedusaImageUrl(p.thumbnail),
      thumbnail: resolveMedusaImageUrl(p.thumbnail),
      categories: p.categories || [],
      planCount: metaPlanCount,
      minB2B: metaMinB2B > 0 ? applyPartnerB2BMarkup(metaMinB2B) : 0,
      minRetail: 0,
      b2b_cost_rate: meta.b2b_cost_rate ?? null,
      created_at: p.created_at || null,
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
