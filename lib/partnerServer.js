import { createClient } from "@supabase/supabase-js";
import {
  normalizePartnerEmail,
  partnerLoginBlockMessage,
} from "./partnerUtils";

let supabaseAdmin = null;

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAdmin;
}

/** 用 service role 查 partners（不受 RLS 限制） */
export async function fetchPartnerByEmailAdmin(email) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const normalized = normalizePartnerEmail(email);
  if (!normalized) return null;

  const { data: rows, error } = await admin
    .from("partners")
    .select(
      "id, name, slug, email, status, created_at, cooperation_model, referral_code, referral_rate",
    )
    .ilike("email", normalized)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !rows?.length) return null;
  return rows.find((r) => r.status === "active") || rows[0];
}

export async function getOrLinkPartnerStoreAdmin(userId, userEmail) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: storeByUserId } = await admin
    .from("stores")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (storeByUserId) return storeByUserId;

  const partner = await fetchPartnerByEmailAdmin(userEmail);
  if (!partner || partner.status !== "active") return null;

  const { data: storeBySlug } = await admin
    .from("stores")
    .select("*")
    .eq("domain", partner.slug)
    .maybeSingle();

  if (!storeBySlug) return null;

  const { data: updatedStore } = await admin
    .from("stores")
    .update({ user_id: userId })
    .eq("id", storeBySlug.id)
    .select()
    .single();

  return updatedStore || storeBySlug;
}

export async function getAuthUserFromBearer(req) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

export async function verifyPartnerAccessForUser(user) {
  const partner = await fetchPartnerByEmailAdmin(user.email);

  if (!partner || partner.status !== "active") {
    return {
      ok: false,
      code: partner ? "NOT_ACTIVE" : "NOT_FOUND",
      message: partnerLoginBlockMessage(partner),
      partner: partner || null,
      store: null,
    };
  }

  const store = await getOrLinkPartnerStoreAdmin(user.id, user.email);

  return {
    ok: true,
    partner,
    store,
  };
}
