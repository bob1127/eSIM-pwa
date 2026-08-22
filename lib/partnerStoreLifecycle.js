/** 軟刪除賣場保留天數（逾期永久刪除） */
export const STORE_RETENTION_DAYS = 30;

export const STORE_STATUS = {
  ACTIVE: "active",
  DELETED: "deleted",
  SETUP: "setup",
};

/** 前台可對外瀏覽、顯示賣場連結 */
export function isStorePublicLive(store) {
  return store?.status === STORE_STATUS.ACTIVE;
}

/** 智慧開店進行中（尚未正式上線） */
export function isStoreSetupPending(store) {
  return store?.status === STORE_STATUS.SETUP;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param {{ status?: string, deleted_at?: string|null, updated_at?: string|null }} store
 */
export function getStoreDeletionMeta(store) {
  if (!store || store.status !== "deleted") {
    return {
      isDeleted: false,
      canReopen: false,
      isExpired: false,
      daysLeft: null,
      expiresAt: null,
      deletedAt: null,
    };
  }

  const deletedAt = store.deleted_at || store.updated_at || null;
  const deletedMs = deletedAt ? new Date(deletedAt).getTime() : Date.now();
  const expiresMs = deletedMs + STORE_RETENTION_DAYS * MS_PER_DAY;
  const isExpired = Date.now() >= expiresMs;
  const daysLeft = Math.max(
    0,
    Math.ceil((expiresMs - Date.now()) / MS_PER_DAY),
  );

  return {
    isDeleted: true,
    canReopen: !isExpired,
    isExpired,
    daysLeft,
    expiresAt: new Date(expiresMs).toISOString(),
    deletedAt,
  };
}

function deletionTimestamp(store) {
  return store?.deleted_at || store?.updated_at || null;
}

/**
 * 永久刪除已超過保留期的軟刪除賣場（store_products 等 cascade）
 */
export async function purgeExpiredDeletedStores(supabase) {
  if (!supabase) return { purged: 0 };

  const cutoff = new Date(
    Date.now() - STORE_RETENTION_DAYS * MS_PER_DAY,
  ).toISOString();

  const { data: rows, error } = await supabase
    .from("stores")
    .select("id, deleted_at, updated_at")
    .eq("status", "deleted");

  if (error) {
    console.error("[purgeExpiredDeletedStores]", error.message);
    return { purged: 0, error: error.message };
  }

  const toPurge = (rows || []).filter((row) => {
    const ts = deletionTimestamp(row);
    return ts && ts < cutoff;
  });

  let purged = 0;
  for (const row of toPurge) {
    const { error: delErr } = await supabase
      .from("stores")
      .delete()
      .eq("id", row.id);
    if (!delErr) purged += 1;
  }

  return { purged };
}

/**
 * 建立全新賣場列（同夥伴 slug domain）
 */
export async function insertFreshPartnerStore(
  supabase,
  { partner, userId, pendingSetup = false },
) {
  const domain = String(partner.slug || "").trim().toLowerCase();
  if (!domain) {
    return { store: null, error: "夥伴缺少 slug" };
  }

  const { data, error } = await supabase
    .from("stores")
    .insert([
      {
        domain,
        store_name: partner.name || domain,
        status: pendingSetup ? STORE_STATUS.SETUP : STORE_STATUS.ACTIVE,
        markup_rate: 20,
        user_id: userId || partner.auth_user_id || null,
        deleted_at: null,
      },
    ])
    .select()
    .single();

  if (error) {
    return { store: null, error: error.message };
  }

  return { store: data, error: null };
}
