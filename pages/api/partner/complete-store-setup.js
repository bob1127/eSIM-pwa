import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { STORE_STATUS } from "../../../lib/partnerStoreLifecycle";

/**
 * POST /api/partner/complete-store-setup
 * 智慧開店 wizard 全部成功後，才將 stores.status 設為 active
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

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

  const store = access.store;

  if (store.status === STORE_STATUS.ACTIVE) {
    return res.status(200).json({ ok: true, store, alreadyActive: true });
  }

  if (store.status !== STORE_STATUS.SETUP) {
    return res.status(400).json({ error: "商店狀態無法完成建立" });
  }

  const { count, error: countErr } = await supabase
    .from("store_products")
    .select("*", { count: "exact", head: true })
    .eq("store_id", store.id);

  if (countErr) {
    return res.status(500).json({ error: countErr.message || "無法確認上架商品" });
  }

  if (!count || count < 1) {
    return res.status(400).json({ error: "請至少上架一款商品後再完成建立" });
  }

  const { data, error } = await supabase
    .from("stores")
    .update({
      status: STORE_STATUS.ACTIVE,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message || "啟用賣場失敗" });
  }

  return res.status(200).json({ ok: true, store: data });
}
