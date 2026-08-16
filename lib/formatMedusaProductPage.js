/**
 * 將 Medusa Store API 商品格式化成 eSIM 產品內頁所需的 product + variations
 *（與 pages/product/[category]/[slug].jsx getStaticProps 對齊）
 */
import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
  fetchMedusaRegions,
} from "./medusaStoreApi";
import {
  resolveMedusaImageUrl,
  resolveMedusaImageUrls,
} from "./resolveMedusaImageUrl";
import { parseKeyFeaturesByCarrier, stripEuPackCopy } from "./productKeyFeatures";
import { parseCarrierSpecsByCarrier } from "./productCarrierSpecs";
import { parseHotSaleTelecoms, isHotSaleTelecom } from "./productHotSale";
import { parseOverviewNoticesByCarrier } from "./productOverviewNotices";
import { parseDetailedContentByCarrier } from "./productDetailedContent";
import { parseUsageContentByCarrier } from "./productUsageContent";
import { parseFaqContentByCarrier } from "./productFaqContent";
import { parsePromoOfferByCarrier } from "./productPromoOffer";
import {
  parseSubtitleByCarrier,
  stripInternalMarginFromSubtitle,
} from "./productSubtitleByCarrier";
import { resolveB2BPrice } from "./medusaPartnerPricing";

export { applyPartnerMarkupToVariations } from "./partnerPricing";

function getMedusaHeaders() {
  const key = getMedusaPublishableKey();
  return {
    "Content-Type": "application/json",
    ...(key ? { "x-publishable-api-key": key } : {}),
  };
}

function mapVariant(v, productMetadata = {}) {
  let price = 0;
  if (
    v.calculated_price &&
    typeof v.calculated_price.calculated_amount === "number"
  ) {
    price = v.calculated_price.calculated_amount;
  } else if (typeof v.calculated_price === "number") {
    price = v.calculated_price;
  } else if (v.prices && v.prices.length > 0) {
    const twdPrice = v.prices.find(
      (p) =>
        p.currency_code === "twd" ||
        p.currency_code === "TWD" ||
        p.currency_code === "NTD",
    );
    price = twdPrice ? twdPrice.amount : v.prices[0].amount;
  }

  let attrs = {};
  if (v.metadata?.attributes) {
    try {
      attrs =
        typeof v.metadata.attributes === "string"
          ? JSON.parse(v.metadata.attributes)
          : { ...v.metadata.attributes };
    } catch {
      /* ignore */
    }
  }

  v.options?.forEach((opt) => {
    const val = String(opt.value || "").trim();
    if (!val) return;
    const title = String(opt.option?.title || opt.title || "").trim();

    if (title === "使用天數" || /^\d+\s*天/.test(val)) {
      attrs.days = parseInt(val, 10);
    } else if (title === "數據量") {
      attrs.data_amount = val;
    } else if (
      !title &&
      (val.includes("流量") ||
        val.includes("GB") ||
        val.includes("MB") ||
        val.includes("吃到飽") ||
        val.includes("每日") ||
        /5Mbps續航/i.test(val))
    ) {
      attrs.data_amount = val;
    } else if (title === "電信商") {
      attrs.telecom = val;
    } else if (title === "線路" || title === "方案") {
      attrs.line = val;
    }
  });

  // title 後備：電信 · N天 · 數據量（含 5Mbps續航）
  const titleParts = String(v.title || "")
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (titleParts.length >= 3) {
    if (!attrs.telecom) attrs.telecom = titleParts[0];
    if (attrs.days == null || attrs.days === "") {
      const d = parseInt(titleParts[1], 10);
      if (Number.isFinite(d)) attrs.days = d;
    }
    if (!attrs.data_amount) attrs.data_amount = titleParts[2];
  }

  const b2b_price = resolveB2BPrice(v, productMetadata);
  const n = (x) => (x === undefined ? null : x);

  return {
    id: v.id,
    title: v.title || "",
    sku: v.sku || "",
    price,
    original_price: v.original_price || price,
    retail_price: price,
    b2b_price: n(b2b_price),
    plan_id: v.metadata?.plan_id || "",
    attributes: {
      telecom: attrs.telecom || null,
      days: attrs.days ?? null,
      data_amount: attrs.data_amount || null,
      line: attrs.line || null,
      speed_rule: attrs.speed_rule || v.metadata?.speed_rule || null,
      ip_type: attrs.ip_type || null,
      network: attrs.network || null,
      route_type: attrs.route_type || null,
      hotspot: n(attrs.hotspot),
      gpt: n(attrs.gpt),
      tiktok: n(attrs.tiktok),
      gemini: n(attrs.gemini),
    },
    tags: v.metadata?.tags ? String(v.metadata.tags).split(",") : [],
    speed_desc: v.metadata?.speed_desc || "",
    rule_desc: v.metadata?.rule_desc || "",
    metadata: v.metadata || {},
  };
}

function formatProductRecord(product) {
  const subtitleByCarrier = Object.fromEntries(
    Object.entries(
      parseSubtitleByCarrier(product.metadata?.subtitle_by_carrier),
    ).map(([k, v]) => [k, stripInternalMarginFromSubtitle(v)]),
  );
  const rawKeyFeatures = product.metadata?.key_features_by_carrier;
  return {
    product: {
      id: product.id,
      name: product.title,
      subtitle: stripInternalMarginFromSubtitle(product.subtitle || ""),
      slug: product.handle,
      description: stripEuPackCopy(product.description || ""),
      metadata: {
        ...(product.metadata || {}),
        subtitle_by_carrier: subtitleByCarrier,
      },
      subtitle_by_carrier: subtitleByCarrier,
      detailed_content: stripEuPackCopy(product.metadata?.detailed_content || ""),
      detailed_content_by_carrier: parseDetailedContentByCarrier(
        product.metadata?.detailed_content_by_carrier,
      ),
      usage_content_by_carrier: parseUsageContentByCarrier(
        product.metadata?.usage_content_by_carrier,
      ),
      faq_content_by_carrier: parseFaqContentByCarrier(
        product.metadata?.faq_content_by_carrier,
      ),
      promo_offer_by_carrier: parsePromoOfferByCarrier(
        product.metadata?.promo_offer_by_carrier,
      ),
      key_features_by_carrier: parseKeyFeaturesByCarrier(rawKeyFeatures) || {},
      carrier_specs_by_carrier:
        parseCarrierSpecsByCarrier(product.metadata?.carrier_specs_by_carrier) ||
        {},
      hot_sale_telecoms: parseHotSaleTelecoms(
        product.metadata?.hot_sale_telecoms,
      ),
      overview_notices_by_carrier: parseOverviewNoticesByCarrier(
        product.metadata?.overview_notices_by_carrier,
      ),
      image_url: resolveMedusaImageUrl(product.thumbnail),
      image_urls: resolveMedusaImageUrls(
        product.images?.map((img) => img.url) || [],
      ),
      price: product.variants?.[0]?.prices?.[0]?.amount || null,
    },
    variations: (product.variants || []).map((v) =>
      mapVariant(v, product.metadata || {}),
    ),
  };
}

/**
 * @param {{ handle?: string, id?: string }} query
 */
export async function fetchFormattedMedusaProductPage(query = {}) {
  const backendUrl = getMedusaBackendUrl();
  const headers = getMedusaHeaders();
  if (!headers["x-publishable-api-key"]) {
    throw new Error("缺少 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
  }

  let regionId = "";
  try {
    const region = await fetchMedusaRegions();
    if (region?.id) regionId = region.id;
  } catch {
    /* optional */
  }

  const params = new URLSearchParams({
    fields:
      "+metadata,*variants,*variants.metadata,*variants.prices,*variants.calculated_price,*variants.options,*variants.options.option,*images",
  });
  if (query.handle) params.set("handle", query.handle);
  if (query.id) params.set("id", query.id);
  if (regionId) params.set("region_id", regionId);

  const res = await fetch(`${backendUrl}/store/products?${params}`, {
    headers,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Medusa products ${res.status}: ${JSON.stringify(data)}`);
  }
  const product = data.products?.[0];
  if (!product) return null;
  return formatProductRecord(product);
}

function inferProductKind(title = "", handle = "") {
  const s = `${title} ${handle}`;
  if (/吃到飽|unlimited|無限/i.test(s)) return "unlimited";
  if (/每日|daily/i.test(s)) return "daily";
  if (/總計|total|定量/i.test(s)) return "total";
  return "other";
}

function shortProductLabel(title = "", kind = "other") {
  if (kind === "unlimited") return "吃到飽";
  if (kind === "total") return "總量型";
  if (kind === "daily") return "每日型";
  const stripped = String(title)
    .replace(/\s*eSIM.*/i, "")
    .replace(/中國大陸|中國|China|日本|Japan/gi, "")
    .trim();
  return stripped || title || "方案";
}

/**
 * 同分類相關商品變體（供流量試算器跨商品比較推薦）
 * 例：中國總量型頁會一併帶入中國吃到飽變體
 */
export async function fetchCategoryComparablePlans({
  categoryHandle,
  currentHandle,
  limit = 100,
} = {}) {
  if (!categoryHandle) return [];

  const backendUrl = getMedusaBackendUrl();
  const headers = getMedusaHeaders();
  if (!headers["x-publishable-api-key"]) return [];

  let regionId = "";
  try {
    const region = await fetchMedusaRegions();
    if (region?.id) regionId = region.id;
  } catch {
    /* optional */
  }

  const catRes = await fetch(
    `${backendUrl}/store/product-categories?handle=${encodeURIComponent(categoryHandle)}`,
    { headers },
  );
  if (!catRes.ok) return [];
  const catData = await catRes.json();
  const category = catData.product_categories?.[0];
  if (!category?.id) return [];

  const params = new URLSearchParams({
    "category_id[]": category.id,
    limit: String(limit),
    fields:
      "+metadata,*variants,*variants.metadata,*variants.prices,*variants.calculated_price,*variants.options,*variants.options.option",
  });
  if (regionId) params.set("region_id", regionId);

  const prodRes = await fetch(`${backendUrl}/store/products?${params}`, {
    headers,
  });
  if (!prodRes.ok) return [];
  const prodData = await prodRes.json();
  const products = prodData.products || [];

  const plans = [];
  for (const p of products) {
    const kind = inferProductKind(p.title, p.handle);
    const label = shortProductLabel(p.title, kind);
    const isCurrent = String(p.handle) === String(currentHandle);
    const hotSaleTelecoms = parseHotSaleTelecoms(
      p.metadata?.hot_sale_telecoms,
    );
    const variations = (p.variants || []).map(mapVariant);

    for (const v of variations) {
      if (!v.attributes?.days || !v.attributes?.data_amount) continue;
      const telecom = v.attributes?.telecom || "";
      plans.push({
        ...v,
        productId: p.id,
        productSlug: p.handle,
        productName: p.title || "",
        productLabel: label,
        productKind: kind,
        isCurrentProduct: isCurrent,
        categoryHandle,
        hotSaleTelecoms,
        isHotSale: isHotSaleTelecom(hotSaleTelecoms, telecom),
      });
    }
  }

  return plans;
}
