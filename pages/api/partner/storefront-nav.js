import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
} from "@/lib/partnerStorefront";
import { buildPartnerCountryNavItems } from "@/lib/partnerNavCountries";

/**
 * GET /api/partner/storefront-nav?domain=xxx
 * 回傳夥伴賣場 Navbar 國家項目
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const domain = String(req.query.domain || "")
    .trim()
    .toLowerCase();
  if (!domain) {
    return res.status(400).json({ error: "domain required" });
  }

  try {
    const store = await fetchActiveStoreByDomain(domain);
    if (!store) {
      return res.status(404).json({ error: "store not found", countries: [] });
    }
    const products = await fetchStoreProductsForStorefront(store);
    const countries = buildPartnerCountryNavItems(products, store.domain);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).json({ countries });
  } catch (err) {
    console.error("[storefront-nav]", err);
    return res.status(500).json({ error: err.message || "failed", countries: [] });
  }
}
