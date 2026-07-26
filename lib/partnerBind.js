import { isLineSyntheticEmail, lineUserIdToEmail } from "./lineAuth";

const PARTNER_SELECT =
  "id, name, slug, email, status, created_at, cooperation_model, referral_code, referral_rate, auth_user_id, line_user_id";

function pickPreferredPartner(rows) {
  if (!rows?.length) return null;
  return rows.find((r) => r.status === "active") || rows[0];
}

/** 從 auth user 抽出 LINE user id（metadata 或虛擬信箱） */
export function extractLineUserIdFromAuthUser(user) {
  if (!user) return null;
  const fromMeta =
    user.user_metadata?.line_id ||
    user.app_metadata?.line_id ||
    null;
  if (fromMeta) return String(fromMeta).trim();

  const email = String(user.email || "").trim();
  const m = email.match(/^([uU][a-zA-Z0-9]+)@line-login\.com$/i);
  return m ? m[1] : null;
}

/**
 * 以 auth user 查找夥伴：auth_user_id → line_user_id → email
 */
export async function findPartnerForAuthUser(admin, user) {
  if (!admin || !user) return null;

  const { data: byAuth } = await admin
    .from("partners")
    .select(PARTNER_SELECT)
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const authHit = pickPreferredPartner(byAuth);
  if (authHit) return authHit;

  const lineUserId = extractLineUserIdFromAuthUser(user);
  if (lineUserId) {
    const { data: byLine } = await admin
      .from("partners")
      .select(PARTNER_SELECT)
      .eq("line_user_id", lineUserId)
      .order("created_at", { ascending: false })
      .limit(10);
    const lineHit = pickPreferredPartner(byLine);
    if (lineHit) return lineHit;
  }

  const email = String(user.email || "").trim().toLowerCase();
  if (!email || isLineSyntheticEmail(email)) return null;

  const { data: byEmail } = await admin
    .from("partners")
    .select(PARTNER_SELECT)
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(10);

  return pickPreferredPartner(byEmail);
}

/**
 * 登入成功後自動補綁 auth_user_id / line_user_id（不覆寫既有不同人的綁定）
 */
export async function ensurePartnerAuthBinding(admin, partner, user) {
  if (!admin || !partner?.id || !user?.id) return partner;

  const patch = {};
  const lineUserId = extractLineUserIdFromAuthUser(user);

  if (!partner.auth_user_id) {
    patch.auth_user_id = user.id;
  } else if (partner.auth_user_id !== user.id) {
    // 已綁其他帳號：若目前是用申請 Email 登入，允許改綁到這個 user
    const email = String(user.email || "").trim().toLowerCase();
    const partnerEmail = String(partner.email || "").trim().toLowerCase();
    if (email && partnerEmail && email === partnerEmail) {
      patch.auth_user_id = user.id;
    }
  }

  if (lineUserId && !partner.line_user_id) {
    patch.line_user_id = lineUserId;
  }

  if (!Object.keys(patch).length) return partner;

  const { data, error } = await admin
    .from("partners")
    .update(patch)
    .eq("id", partner.id)
    .select(PARTNER_SELECT)
    .single();

  if (error) {
    console.error("[ensurePartnerAuthBinding]", error.message);
    return partner;
  }
  return data || { ...partner, ...patch };
}

/** 依 Email 在 Auth 找使用者（審核通過時綁定） */
export async function findAuthUserIdByEmail(admin, email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!admin || !normalized) return null;

  // Supabase admin API：listUsers 分頁搜尋（規模小時夠用）
  try {
    let page = 1;
    const perPage = 200;
    while (page <= 5) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) break;
      const hit = (data?.users || []).find(
        (u) => String(u.email || "").toLowerCase() === normalized,
      );
      if (hit) return hit.id;
      if (!data?.users?.length || data.users.length < perPage) break;
      page += 1;
    }
  } catch (err) {
    console.error("[findAuthUserIdByEmail]", err?.message || err);
  }
  return null;
}

export async function findAuthUserIdByLineUserId(admin, lineUserId) {
  if (!admin || !lineUserId) return null;
  const email = lineUserIdToEmail(lineUserId);
  return findAuthUserIdByEmail(admin, email);
}
