import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { fetchStoreProductsForStorefront } from "../../../lib/partnerStorefront";

/** GET 夥伴賣場商品清單（文章產品區塊勾選用） */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!getSupabaseAdmin()) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }
  const user = await getAuthUserFromBearer(req);
  if (!user) return res.status(401).json({ error: "請先登入" });
  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.store) {
    return res.status(403).json({ error: access.message || "無權限" });
  }
  try {
    const products = await fetchStoreProductsForStorefront(access.store);
    const domain = access.store.domain || "";
    return res.status(200).json({
      products: (products || []).slice(0, 80).map((p) => ({
        handle: p.handle || p.id,
        name: p.name || "",
        image: p.image || "",
        price: p.displayPrice || 0,
        href: domain ? `/p/${domain}/${p.handle || p.id}` : "#",
      })),
    });
  } catch (err) {
    console.error("[blog-catalog]", err);
    return res.status(200).json({ products: [] });
  }
}
