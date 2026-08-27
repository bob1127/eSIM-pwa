/**
 * 商品評價彙總（ISR / JSON-LD / 可見星級共用）
 * 來源：Supabase product_reviews（status=approved、僅主評）
 */
import { createClient } from "@supabase/supabase-js";
import { PRODUCT_AGGREGATE_RATING } from "./productJsonLd";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * @returns {Promise<{
 *   ratingValue: number,
 *   reviewCount: number,
 *   ratingCount: number,
 *   bestRating: number,
 *   worstRating: number,
 *   source: 'product' | 'fallback',
 *   reviews: Array<{
 *     id: string,
 *     author: string,
 *     rating: number,
 *     title: string,
 *     body: string,
 *     datePublished: string,
 *   }>
 * }>}
 */
export async function fetchProductReviewAggregate(
  productId,
  { sampleLimit = 8 } = {},
) {
  const fallback = {
    ...PRODUCT_AGGREGATE_RATING,
    source: "fallback",
    reviews: [],
  };

  if (!productId) return fallback;

  const sb = getServiceClient();
  if (!sb) return fallback;

  try {
    const { data, error } = await sb
      .from("product_reviews")
      .select(
        "id, parent_id, rating, title, content, user_name, created_at, status",
      )
      .eq("product_id", String(productId))
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.warn("[productReviewAggregate]", error.message);
      return fallback;
    }

    const main = (data || []).filter((r) => !r.parent_id);
    if (!main.length) return fallback;

    const sum = main.reduce((s, r) => s + (Number(r.rating) || 5), 0);
    const avg = Math.round((sum / main.length) * 10) / 10;
    const count = main.length;

    const reviews = main.slice(0, sampleLimit).map((r) => ({
      id: String(r.id),
      author: String(r.user_name || "").trim() || "Jeko 旅客",
      rating: Math.min(5, Math.max(1, Number(r.rating) || 5)),
      title: String(r.title || "").trim(),
      body: String(r.content || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500),
      datePublished: r.created_at
        ? new Date(r.created_at).toISOString().slice(0, 10)
        : undefined,
    }));

    return {
      ratingValue: avg,
      reviewCount: count,
      ratingCount: count,
      bestRating: 5,
      worstRating: 1,
      source: "product",
      reviews,
    };
  } catch (err) {
    console.warn("[productReviewAggregate]", err?.message || err);
    return fallback;
  }
}
