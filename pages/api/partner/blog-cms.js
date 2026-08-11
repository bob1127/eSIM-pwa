import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import {
  mergeBlogCms,
  sanitizeBlogCmsInput,
} from "../../../lib/partnerBlogCms";

/**
 * GET  /api/partner/blog-cms?store_id= — 店主讀取
 * PATCH /api/partner/blog-cms — 店主儲存（body.blog_cms）
 */
export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) {
    return res.status(401).json({ error: "請先登入夥伴主帳號" });
  }

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.store) {
    return res.status(403).json({ error: access.message || "無權限" });
  }

  const store = access.store;
  const storeId = store.id;

  if (req.method === "GET") {
    const qid = req.query.store_id ? Number(req.query.store_id) : storeId;
    if (Number(qid) !== Number(storeId)) {
      return res.status(403).json({ error: "只能讀取自己的店鋪" });
    }

    let blog_cms = store.blog_cms;
    if (blog_cms == null || typeof blog_cms !== "object") {
      const { data } = await supabase
        .from("stores")
        .select("blog_cms")
        .eq("id", storeId)
        .maybeSingle();
      blog_cms = data?.blog_cms || {};
    }

    return res.status(200).json({
      store_id: storeId,
      blog_cms: mergeBlogCms(blog_cms),
      can_edit: true,
    });
  }

  if (req.method === "PATCH") {
    const bodyStoreId = Number(req.body?.store_id || storeId);
    if (bodyStoreId !== Number(storeId)) {
      return res.status(403).json({ error: "只能編輯自己的店鋪" });
    }

    const cleaned = sanitizeBlogCmsInput(req.body?.blog_cms || {});

    const { data, error } = await supabase
      .from("stores")
      .update({
        blog_cms: cleaned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId)
      .select("id, blog_cms, domain")
      .maybeSingle();

    if (error) {
      if (/blog_cms|column|does not exist|schema cache/i.test(error.message || "")) {
        return res.status(503).json({
          error:
            "資料庫尚未套用 blog_cms migration（20260810e_store_blog_cms.sql）",
        });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      ok: true,
      store_id: storeId,
      blog_cms: mergeBlogCms(data?.blog_cms || cleaned),
    });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).end("Method Not Allowed");
}
