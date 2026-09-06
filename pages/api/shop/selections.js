import { fetchShopMustHaveSelections } from "../../../lib/shopSelections";

/**
 * GET /api/shop/selections
 * Must-Have 區塊：Medusa 實體商品（new / bestsellers）
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const limit = Math.min(
      48,
      Math.max(1, Number(req.query.limit) || 24),
    );
    const selections = await fetchShopMustHaveSelections({ limit });
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return res.status(200).json({
      success: true,
      ...selections,
    });
  } catch (err) {
    console.error("[api/shop/selections]", err);
    return res.status(500).json({
      success: false,
      error: err.message || "讀取商城商品失敗",
      new: [],
      bestsellers: [],
    });
  }
}
