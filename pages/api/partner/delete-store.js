import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";

/**
 * POST /api/partner/delete-store
 * 夥伴自行關閉賣場（soft delete：stores.status = deleted）
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
  if (store.status === "deleted") {
    return res.status(400).json({ error: "此商店已刪除" });
  }

  const body = req.body || {};
  if (body.confirm !== true) {
    return res.status(400).json({ error: "缺少刪除確認" });
  }

  const confirmDomain = String(body.confirmDomain || "")
    .trim()
    .toLowerCase();
  if (confirmDomain !== String(store.domain || "").trim().toLowerCase()) {
    return res.status(400).json({ error: "商店代碼確認不符" });
  }

  const { data, error } = await supabase
    .from("stores")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message || "刪除失敗" });
  }

  return res.status(200).json({ ok: true, store: data });
}
