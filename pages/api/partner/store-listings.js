import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { upsertMedusaProductToSupabase } from "../../../lib/medusaProductSync";

export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) {
    return res.status(401).json({ error: "請先登入" });
  }

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.store) {
    return res.status(403).json({ error: access.message || "無夥伴權限" });
  }

  const storeId = access.store.id;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("store_products")
      .select("id, product_id, medusa_product_id, custom_prices, created_at")
      .eq("store_id", storeId);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ listings: data || [] });
  }

  if (req.method === "POST") {
    const { medusa_product_id: medusaProductId } = req.body || {};
    if (!medusaProductId) {
      return res.status(400).json({ error: "缺少 medusa_product_id" });
    }

    try {
      const { productId } = await upsertMedusaProductToSupabase(medusaProductId);

      const { data: existing } = await supabase
        .from("store_products")
        .select("id")
        .eq("store_id", storeId)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        return res.status(200).json({
          ok: true,
          productId,
          medusaProductId,
          listingId: existing.id,
          alreadyListed: true,
        });
      }

      const insertPayload = {
        store_id: storeId,
        product_id: productId,
        custom_prices: {},
      };

      const hasMedusaCol = !(
        await supabase.from("store_products").select("medusa_product_id").limit(1)
      ).error;
      if (hasMedusaCol) insertPayload.medusa_product_id = medusaProductId;

      const { data, error } = await supabase
        .from("store_products")
        .insert([insertPayload])
        .select("id, created_at")
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({
        ok: true,
        productId,
        medusaProductId,
        listingId: data.id,
        listedAt: data.created_at,
      });
    } catch (err) {
      console.error("[store-listings POST]", err);
      return res.status(502).json({ error: err.message || "上架失敗" });
    }
  }

  if (req.method === "DELETE") {
    const medusaProductId = req.body?.medusa_product_id || req.query?.medusa_product_id;
    const productId = req.body?.product_id || req.query?.product_id;

    if (!medusaProductId && !productId) {
      return res.status(400).json({ error: "缺少 medusa_product_id 或 product_id" });
    }

    let query = supabase.from("store_products").delete().eq("store_id", storeId);

    if (productId) {
      query = query.eq("product_id", productId);
    } else {
      const hasMedusaCol = !(
        await supabase.from("store_products").select("medusa_product_id").limit(1)
      ).error;
      if (hasMedusaCol) {
        query = query.eq("medusa_product_id", medusaProductId);
      } else {
        const { productId: pid } = await upsertMedusaProductToSupabase(medusaProductId);
        query = query.eq("product_id", pid);
      }
    }

    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).end("Method Not Allowed");
}
