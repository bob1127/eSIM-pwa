import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug is required" });

  // ── GET：讀取評論列表 ──────────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("blog_reviews")
      .select(`
        id, user_id, user_name, user_avatar, rating, content, likes, created_at, parent_id,
        blog_review_media (id, media_type, public_url, file_name)
      `)
      .eq("post_slug", slug)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // 如果用戶已登入，附帶「我是否已按讚」
    const authHeader = req.headers.authorization;
    let myLikedIds = new Set();
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const reviewIds = (data || []).map((r) => r.id);
        if (reviewIds.length > 0) {
          const { data: likeRows } = await supabaseAdmin
            .from("blog_review_likes")
            .select("review_id")
            .eq("user_id", user.id)
            .in("review_id", reviewIds);
          myLikedIds = new Set((likeRows || []).map((l) => l.review_id));
        }
      }
    }

    const enriched = (data || []).map((r) => ({
      ...r,
      is_liked_by_me: myLikedIds.has(r.id),
    }));

    return res.status(200).json(enriched);
  }

  // ── POST：新增評論／回覆 ───────────────────────────────────────
  if (req.method === "POST") {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "請先登入" });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "登入逾時，請重新登入" });

    const { rating, content, mediaIds, parentId } = req.body;
    const parent = parentId ? String(parentId).trim() : null;
    if (!content?.trim() || content.trim().length < 2)
      return res.status(400).json({ error: "請輸入至少 2 個字的評論" });

    // 回覆不需星等；頂層若未傳則預設 5（前台已無星等 UI）
    const finalRating = parent
      ? 5
      : Math.min(5, Math.max(1, Number(rating) || 5));

    if (parent) {
      const { data: parentRow, error: parentErr } = await supabaseAdmin
        .from("blog_reviews")
        .select("id, parent_id, post_slug")
        .eq("id", parent)
        .eq("post_slug", slug)
        .maybeSingle();
      if (parentErr) return res.status(500).json({ error: parentErr.message });
      if (!parentRow) return res.status(400).json({ error: "找不到要回覆的留言" });
      // 僅允許回覆頂層（一層）
      if (parentRow.parent_id) {
        return res.status(400).json({ error: "僅能回覆主留言" });
      }
    }

    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "訪客";

    const insertPayload = {
      post_slug: slug,
      user_id: user.id,
      user_name: userName,
      user_avatar: user.user_metadata?.avatar_url || null,
      rating: finalRating,
      content: content.trim(),
      parent_id: parent || null,
    };

    const { data: review, error: insertError } = await supabaseAdmin
      .from("blog_reviews")
      .insert(insertPayload)
      .select(
        "id, user_id, user_name, user_avatar, rating, content, likes, created_at, parent_id",
      )
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    // 將已上傳的媒體綁定到這則評論（回覆通常無媒體，仍相容）
    if (!parent && Array.isArray(mediaIds) && mediaIds.length > 0) {
      await supabaseAdmin
        .from("blog_review_media")
        .update({ review_id: review.id })
        .in("id", mediaIds)
        .eq("user_id", user.id);
    }

    const { data: media } = await supabaseAdmin
      .from("blog_review_media")
      .select("id, media_type, public_url, file_name")
      .eq("review_id", review.id);

    return res.status(201).json({
      ...review,
      is_liked_by_me: false,
      blog_review_media: media || [],
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
