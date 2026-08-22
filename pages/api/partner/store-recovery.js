import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import {
  getStoreDeletionMeta,
  insertFreshPartnerStore,
  purgeExpiredDeletedStores,
  STORE_STATUS,
} from "../../../lib/partnerStoreLifecycle";

/**
 * POST /api/partner/store-recovery
 * body: { action: "reopen" | "create_new" }
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

  await purgeExpiredDeletedStores(supabase);

  const user = await getAuthUserFromBearer(req);
  if (!user) {
    return res.status(401).json({ error: "請先登入" });
  }

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.partner) {
    return res.status(403).json({ error: access.message || "無夥伴權限" });
  }

  if (access.partner.cooperation_model === "referral") {
    return res.status(403).json({ error: "專屬連結夥伴無法開立賣場" });
  }

  const action = String(req.body?.action || "").trim();
  if (action !== "reopen" && action !== "create_new") {
    return res.status(400).json({ error: "無效的操作" });
  }

  let store = access.store;

  if (!store) {
    if (action === "create_new") {
      const created = await insertFreshPartnerStore(supabase, {
        partner: access.partner,
        userId: user.id,
        pendingSetup: true,
      });
      if (created.error) {
        return res.status(500).json({ error: created.error });
      }
      return res.status(200).json({
        ok: true,
        action,
        store: created.store,
        openWizard: true,
      });
    }
    return res.status(404).json({ error: "找不到商店資料" });
  }

  const meta = getStoreDeletionMeta(store);

  if (action === "reopen") {
    if (!meta.isDeleted) {
      return res.status(400).json({ error: "商店運作中，無需重新開啟" });
    }
    if (meta.isExpired) {
      return res.status(400).json({
        error: "已超過 30 天保留期限，請使用「建立新商店」",
        code: "STORE_EXPIRED",
      });
    }

    const { data, error } = await supabase
      .from("stores")
      .update({
        status: "active",
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message || "重新開啟失敗" });
    }

    return res.status(200).json({ ok: true, action, store: data });
  }

  // create_new — 智慧開店：清空上架、維持 setup，wizard 完成後才 active
  if (store.status === STORE_STATUS.ACTIVE) {
    return res.status(400).json({
      error: "商店運作中。若要重新選品，請至「選品管理」或使用智慧開店。",
    });
  }

  if (store.status === STORE_STATUS.SETUP) {
    await supabase.from("store_products").delete().eq("store_id", store.id);
    return res.status(200).json({
      ok: true,
      action,
      store,
      openWizard: true,
      resumedSetup: true,
    });
  }

  if (!meta.isDeleted) {
    return res.status(400).json({ error: "商店狀態異常，請聯繫客服" });
  }

  if (meta.isExpired) {
    const { error: delErr } = await supabase
      .from("stores")
      .delete()
      .eq("id", store.id);
    if (delErr) {
      return res.status(500).json({ error: delErr.message || "清除舊賣場失敗" });
    }

    const created = await insertFreshPartnerStore(supabase, {
      partner: access.partner,
      userId: user.id,
      pendingSetup: true,
    });
    if (created.error) {
      return res.status(500).json({ error: created.error });
    }

    return res.status(200).json({
      ok: true,
      action,
      store: created.store,
      openWizard: true,
      recreated: true,
    });
  }

  // 保留期內：重新啟用 + 清空上架清單，再走智慧選品
  await supabase.from("store_products").delete().eq("store_id", store.id);

  const { data, error } = await supabase
    .from("stores")
    .update({
      status: STORE_STATUS.SETUP,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message || "建立新商店失敗" });
  }

  return res.status(200).json({
    ok: true,
    action,
    store: data,
    openWizard: true,
    clearedListings: true,
  });
}
