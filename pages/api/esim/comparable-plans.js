/** 流量試算器用：同分類跨商品變體。不進 getStaticProps，避免 PDP ISR 被拖 2–3 秒。 */

import { fetchCategoryComparablePlans } from "../../../lib/formatMedusaProductPage";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const category =
    typeof req.query.category === "string" ? req.query.category.trim() : "";
  const handle =
    typeof req.query.handle === "string" ? req.query.handle.trim() : "";

  if (!category) {
    return res.status(400).json({ error: "category is required" });
  }

  try {
    const plans = await fetchCategoryComparablePlans({
      categoryHandle: category,
      currentHandle: handle || undefined,
      limit: 80,
    });
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
    return res.status(200).json({ plans: plans || [] });
  } catch (error) {
    console.warn("[comparable-plans]", error?.message || error);
    return res.status(200).json({ plans: [] });
  }
}
