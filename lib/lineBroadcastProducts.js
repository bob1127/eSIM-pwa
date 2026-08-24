import {
  fetchMedusaRegions,
  getMedusaPublishableKey,
  getMedusaStoreApiUrl,
  isVisibleOnMainSite,
} from "./medusaStoreApi";
import { parseRetailPrice } from "./medusaPartnerPricing";
import { resolveProductListingImage } from "./resolveProductListingImage";
import { resolveLinePushImageUrl, resolveLinePushLink } from "./linePushImageUrl";

/** 從 handle 或 /product/cat/slug 路徑解析 Medusa handle */
export function parseProductHandleInput(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (s.startsWith("/product/")) {
    const parts = s.split("?")[0].split("/").filter(Boolean);
    if (parts.length >= 3) return parts[2];
    return null;
  }
  return s.replace(/^@/, "");
}

export function parseProductHandleList(input) {
  const items = Array.isArray(input)
    ? input
    : String(input || "")
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
  const handles = [];
  const seen = new Set();
  for (const item of items) {
    const handle = parseProductHandleInput(item);
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    handles.push(handle);
  }
  return handles;
}

async function fetchMedusaProductByHandle(handle) {
  const backendUrl = getMedusaStoreApiUrl();
  const key = getMedusaPublishableKey();
  if (!key) throw new Error("缺少 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");

  const region = await fetchMedusaRegions();
  const query = new URLSearchParams({
    handle,
    fields:
      "+metadata,*variants,*variants.prices,*variants.calculated_price,*categories,thumbnail",
  });
  if (region?.id) query.set("region_id", region.id);

  const res = await fetch(`${backendUrl}/store/products?${query}`, {
    headers: { "x-publishable-api-key": key },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Medusa products ${res.status}`);
  }
  const product = (data.products || []).find((p) => p.handle === handle);
  if (!product || !isVisibleOnMainSite(product)) return null;
  return product;
}

function formatTwdPrice(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `NT$ ${Math.round(n).toLocaleString("zh-TW")} 起`;
}

function buildProductUrl(product) {
  const categoryHandle = product.categories?.[0]?.handle || "product";
  return resolveLinePushLink(`/product/${categoryHandle}/${product.handle}/`);
}

function buildFallbackProduct(handle, fallback = {}) {
  if (!fallback.fallbackImage && !fallback.url) return null;
  return {
    handle,
    title: fallback.label || handle,
    imageUrl: resolveLinePushImageUrl(fallback.fallbackImage),
    priceLabel: null,
    url: fallback.url ? resolveLinePushLink(fallback.url) : resolveLinePushLink("/"),
  };
}

/**
 * 依 handle 列表抓商品，供 LINE 輪播用。
 * presetFallback: Record<handle, { label?, fallbackImage?, url? }>
 */
export async function fetchLineBroadcastProducts(handles, presetFallback = {}) {
  const list = [];
  for (const handle of handles) {
    const fallback = presetFallback[handle] || {};
    try {
      const product = await fetchMedusaProductByHandle(handle);
      if (!product) {
        const fb = buildFallbackProduct(handle, fallback);
        if (fb) list.push(fb);
        continue;
      }

      const categoryHandle = product.categories?.[0]?.handle || "";
      const image = resolveProductListingImage(product.thumbnail, {
        categoryHandle,
        name: product.title,
      });
      const prices = (product.variants || [])
        .map((v) => parseRetailPrice(v))
        .filter((p) => p > 0);
      const minPrice = prices.length ? Math.min(...prices) : 0;

      list.push({
        handle: product.handle,
        title: String(product.title || handle).trim(),
        imageUrl:
          resolveLinePushImageUrl(image || fallback.fallbackImage) ||
          resolveLinePushImageUrl(fallback.fallbackImage),
        priceLabel: formatTwdPrice(minPrice),
        url: buildProductUrl(product),
      });
    } catch (err) {
      const fb = buildFallbackProduct(handle, fallback);
      if (fb) {
        list.push(fb);
      } else {
        console.warn("[line-broadcast] product fetch failed:", handle, err?.message);
      }
    }
  }
  return list.filter((p) => p.title && p.url);
}

/** 單一商品 → 可編輯輪播卡片欄位 */
export async function fetchLineBroadcastProductCard(handleOrPath, presetFallback = {}) {
  const handle = parseProductHandleInput(handleOrPath);
  if (!handle) return null;
  const list = await fetchLineBroadcastProducts([handle], presetFallback);
  const p = list[0];
  if (!p) return null;
  return {
    title: p.title || "",
    subtitle: p.priceLabel || "",
    body: "",
    imageUrl: p.imageUrl || "",
    url: p.url || "/",
    buttonLabel: "查看商品",
  };
}
