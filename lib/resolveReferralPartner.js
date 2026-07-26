import { createClient } from "@supabase/supabase-js";
import {
  normalizeReferralCode,
  computeReferralProfit,
  DEFAULT_REFERRAL_RATE,
} from "./partnerReferral";

/**
 * 依推薦代碼查 active 推薦夥伴；供結帳 API 使用。
 */
export async function resolveActiveReferralPartner(code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data } = await admin
    .from("partners")
    .select("id, name, slug, referral_code, referral_rate, status, cooperation_model")
    .eq("referral_code", normalized)
    .eq("status", "active")
    .eq("cooperation_model", "referral")
    .maybeSingle();

  return data || null;
}

export function profitFromReferralPartner(partner, totalAmount, b2bCost) {
  if (!partner) return 0;
  const rate = partner.referral_rate ?? DEFAULT_REFERRAL_RATE;
  const cost = Number(b2bCost);
  if (Number.isFinite(cost) && cost > 0) {
    return computeReferralProfit(cost, rate, totalAmount);
  }
  // 無成本時：無法做成本加成拆分，暫用售價×趴（請盡量帶 b2b_cost）
  return computeReferralProfit(totalAmount, rate);
}

export async function linkCartToReferral(cartId, partner, code) {
  if (!cartId || !partner?.id) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await admin.from("referral_cart_links").upsert(
    [
      {
        cart_id: String(cartId),
        partner_id: partner.id,
        referral_code: normalizeReferralCode(code || partner.referral_code),
      },
    ],
    { onConflict: "cart_id" },
  );
}
