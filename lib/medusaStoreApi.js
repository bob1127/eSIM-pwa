import { resolveMedusaImageUrl } from "./resolveMedusaImageUrl";
import { parseRetailPrice, resolveB2BPrice } from "./medusaPartnerPricing";

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

export async function fetchMedusaRegions() {
  const backendUrl = getMedusaBackendUrl();
  const key = getMedusaPublishableKey();
  const res = await fetch(`${backendUrl}/store/regions`, {
    headers: { "x-publishable-api-key": key },
  });
  if (!res.ok) throw new Error(`Medusa regions ${res.status}`);
  const data = await res.json();
  return (
    data.regions?.find((r) => r.currency_code?.toLowerCase() === "twd") ||
    data.regions?.[0] ||
    null
  );
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

export function formatMedusaProductForPartner(product) {
  const meta = product.metadata || {};
  const variants = product.variants || [];
  const formattedVariants = variants.map((v) => ({
    medusa_variant_id: v.id,
    sku: v.sku,
    title: v.title,
    retail_price: parseRetailPrice(v),
    b2b_price: resolveB2BPrice(v, meta),
    attributes: parseVariantAttributes(v),
  }));

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
    variants: formattedVariants,
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

export async function fetchAllMedusaStoreProducts({ partnerPool = false } = {}) {
  const backendUrl = getMedusaBackendUrl();
  const key = getMedusaPublishableKey();
  if (!key) throw new Error("缺少 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");

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
        "+metadata,*variants,*variants.prices,*variants.calculated_price,*variants.options",
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

  const filtered = partnerPool
    ? all.filter(isVisibleOnMainSite)
    : all.filter(isVisibleOnMainSite);

  return filtered.map(formatMedusaProductForPartner);
}

export async function fetchMedusaProductById(medusaProductId) {
  const backendUrl = getMedusaBackendUrl();
  const key = getMedusaPublishableKey();
  const region = await fetchMedusaRegions();
  const query = new URLSearchParams({
    id: medusaProductId,
    fields:
      "+metadata,*variants,*variants.prices,*variants.calculated_price,*variants.options",
  });
  if (region?.id) query.set("region_id", region.id);

  const res = await fetch(`${backendUrl}/store/products?${query}`, {
    headers: { "x-publishable-api-key": key },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Medusa product ${res.status}`);
  const product = data.products?.[0];
  if (!product) throw new Error(`找不到 Medusa 商品 ${medusaProductId}`);
  return formatMedusaProductForPartner(product);
}
