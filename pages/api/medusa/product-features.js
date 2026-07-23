/** 前台即時讀取 Medusa 商品 metadata（含 key_features_by_carrier、overview_notices） */

import { parseOverviewNoticesByCarrier } from "../../../lib/productOverviewNotices";
import { parseDetailedContentByCarrier } from "../../../lib/productDetailedContent";
import { parseKeyFeaturesByCarrier } from "../../../lib/productKeyFeatures";
import { parseCarrierSpecsByCarrier } from "../../../lib/productCarrierSpecs";
import { parseHotSaleTelecoms } from "../../../lib/productHotSale";
import { parseUsageContentByCarrier } from "../../../lib/productUsageContent";
import { parseFaqContentByCarrier } from "../../../lib/productFaqContent";
import { parsePromoOfferByCarrier } from "../../../lib/productPromoOffer";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const handle = req.query.handle;
  if (!handle || typeof handle !== "string") {
    return res.status(400).json({ error: "handle is required" });
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

  const params = new URLSearchParams({
    handle,
    fields: "+metadata",
  });

  try {
    const response = await fetch(`${backendUrl}/store/products?${params}`, {
      headers: {
        ...(publishableKey && {
          "x-publishable-api-key": publishableKey,
        }),
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Medusa fetch failed" });
    }

    const data = await response.json();
    const product = data.products?.[0];
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    return res.status(200).json({
      key_features_by_carrier:
        parseKeyFeaturesByCarrier(product.metadata?.key_features_by_carrier) ||
        {},
      carrier_specs_by_carrier:
        parseCarrierSpecsByCarrier(
          product.metadata?.carrier_specs_by_carrier,
        ) || {},
      overview_notices_by_carrier: parseOverviewNoticesByCarrier(
        product.metadata?.overview_notices_by_carrier,
      ),
      detailed_content_by_carrier: parseDetailedContentByCarrier(
        product.metadata?.detailed_content_by_carrier,
      ),
      detailed_content: product.metadata?.detailed_content || "",
      hot_sale_telecoms: parseHotSaleTelecoms(
        product.metadata?.hot_sale_telecoms,
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
    });
  } catch (error) {
    console.error("[product-features]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
