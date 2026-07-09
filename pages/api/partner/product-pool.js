import { fetchAllMedusaStoreProducts } from "../../../lib/medusaStoreApi";
import { getGlobalB2BCostRate } from "../../../lib/medusaPartnerPricing";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const products = await fetchAllMedusaStoreProducts({ partnerPool: true });
    return res.status(200).json({
      products,
      pricing: {
        globalB2BCostRate: getGlobalB2BCostRate(),
        hint:
          "底價 = 零售價 × b2b_cost_rate；可在 Medusa 商品 metadata 設 b2b_cost_rate，或變體 metadata 設 b2b_price",
      },
    });
  } catch (err) {
    console.error("[product-pool]", err);
    return res.status(502).json({
      error: err.message || "無法讀取 Medusa 商品池",
    });
  }
}
