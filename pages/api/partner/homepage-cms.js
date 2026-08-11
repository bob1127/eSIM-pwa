import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import {
  mergeHomepageCms,
  resolveHomepageDisplay,
  sanitizeHomepageCmsInput,
} from "../../../lib/partnerHomepageCms";

/**
 * GET  /api/partner/homepage-cms?store_id= — 店主讀取（含預設合併）
 * PATCH /api/partner/homepage-cms — 店主儲存（body.homepage_cms）
 *
 * 僅 verifyPartnerAccessForUser 通過且 store_id 為本人店鋪時可寫。
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

    let homepage_cms = store.homepage_cms || {};
    // 若 access.store 未帶欄位，再查一次
    if (homepage_cms == null || typeof homepage_cms !== "object") {
      const { data } = await supabase
        .from("stores")
        .select("homepage_cms")
        .eq("id", storeId)
        .maybeSingle();
      homepage_cms = data?.homepage_cms || {};
    }

    const display = resolveHomepageDisplay(store, homepage_cms);
    return res.status(200).json({
      store_id: storeId,
      homepage_cms: mergeHomepageCms(store, homepage_cms),
      display,
      can_edit: true,
    });
  }

  if (req.method === "PATCH") {
    const bodyStoreId = Number(req.body?.store_id || storeId);
    if (bodyStoreId !== Number(storeId)) {
      return res.status(403).json({ error: "只能編輯自己的店鋪" });
    }

    const cleaned = sanitizeHomepageCmsInput(store, req.body?.homepage_cms || {});

    const { data, error } = await supabase
      .from("stores")
      .update({
        homepage_cms: cleaned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId)
      .select("id, homepage_cms, store_name, description, domain, logo_url")
      .maybeSingle();

    if (error) {
      if (/homepage_cms|column|does not exist|schema cache/i.test(error.message || "")) {
        return res.status(503).json({
          error:
            "資料庫尚未套用 homepage_cms migration（20260810d_store_homepage_cms.sql）",
        });
      }
      return res.status(500).json({ error: error.message });
    }

    // 可選：同步 hero 空值時不覆寫 store_name／description；若 partner 填了 title 可選寫入
    const syncBrand = req.body?.sync_brand === true;
    if (syncBrand && cleaned.hero?.title) {
      await supabase
        .from("stores")
        .update({
          store_name: cleaned.hero.title.slice(0, 80),
          ...(cleaned.hero.subtitle
            ? { description: cleaned.hero.subtitle.slice(0, 500) }
            : {}),
        })
        .eq("id", storeId);
    }

    return res.status(200).json({
      ok: true,
      store_id: storeId,
      homepage_cms: cleaned,
      display: resolveHomepageDisplay(data || store, cleaned),
    });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).end("Method Not Allowed");
}
