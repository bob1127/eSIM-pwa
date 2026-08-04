import {
  getAuthUserFromBearer,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
  isVisibleOnMainSite,
} from "../../../lib/medusaStoreApi";
import {
  parsePercentMap,
  PARTNER_RATE_METADATA_KEY,
  REFERRAL_DISCOUNT_METADATA_KEY,
} from "../../../lib/productPartnerTerms";

async function fetchProductsWithPartnerTerms() {
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
      fields: "id,title,handle,thumbnail,+metadata",
    });
    const res = await fetch(`${backendUrl}/store/products?${query}`, {
      headers,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Medusa products ${res.status}`);
    }
    const batch = data.products || [];
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 500) break;
  }

  return all.filter(isVisibleOnMainSite);
}

/**
 * GET /api/partner/product-terms
 * 專屬連結夥伴：各商品 × 電信商的分潤％／旅客折扣％（讀 Medusa metadata）
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) return res.status(401).json({ error: "請先登入" });

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.partner) {
    return res.status(403).json({ error: access.message || "無夥伴權限" });
  }

  if (access.partner.cooperation_model !== "referral") {
    return res.status(403).json({
      error: "此頁面僅供專屬連結夥伴使用",
    });
  }

  try {
    const products = await fetchProductsWithPartnerTerms();
    const rows = [];

    for (const p of products) {
      const meta = p.metadata || {};
      const rateMap = parsePercentMap(meta[PARTNER_RATE_METADATA_KEY]);
      const discountMap = parsePercentMap(meta[REFERRAL_DISCOUNT_METADATA_KEY]);
      const carriers = Array.from(
        new Set([...Object.keys(rateMap), ...Object.keys(discountMap)]),
      ).sort((a, b) => a.localeCompare(b, "zh-TW"));

      if (!carriers.length) continue;

      rows.push({
        id: p.id,
        title: p.title || "",
        handle: p.handle || "",
        thumbnail: p.thumbnail || null,
        carriers: carriers.map((carrier) => ({
          carrier,
          partner_rate_percent: rateMap[carrier] ?? null,
          referral_discount_percent: discountMap[carrier] ?? null,
        })),
      });
    }

    rows.sort((a, b) => a.title.localeCompare(b.title, "zh-TW"));

    return res.status(200).json({
      ok: true,
      products: rows,
      discount_enabled: access.partner.referral_discount_enabled !== false,
    });
  } catch (err) {
    console.error("[partner/product-terms]", err.message);
    return res.status(500).json({
      error: err.message || "無法讀取方案分潤",
    });
  }
}
