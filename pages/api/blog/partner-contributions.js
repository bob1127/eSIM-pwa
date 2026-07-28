import {
  fetchAllPublishedPartnerPostsForMain,
  toMainBlogListCard,
} from "@/lib/partnerBlogMain";

/**
 * GET /api/blog/partner-contributions
 * 主站 /blog 列表用：已發布且賣場已開通文章加值的夥伴供稿
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limit = Number(req.query.limit) || 100;
    const shaped = await fetchAllPublishedPartnerPostsForMain({ limit });
    const cards = shaped.map(toMainBlogListCard).filter(Boolean);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(cards);
  } catch (error) {
    console.error("[api/blog/partner-contributions]", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch partner posts" });
  }
}
