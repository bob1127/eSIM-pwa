import { createClient } from "@supabase/supabase-js";
import {
  normalizeReferralCode,
  computeReferralProfit,
  DEFAULT_REFERRAL_RATE,
  referralRateForMonthCount,
  monthBoundsIso,
  resolveReferralTierRates,
} from "./partnerReferral";
import { isSettledOrderStatus } from "./refundPolicy";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 依推薦代碼查 active 推薦夥伴；供結帳 API 使用。
 */
export async function resolveActiveReferralPartner(code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;

  const admin = getAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("partners")
    .select(
      "id, name, slug, referral_code, referral_rate, status, cooperation_model",
    )
    .eq("referral_code", normalized)
    .eq("status", "active")
    .eq("cooperation_model", "referral")
    .maybeSingle();

  return data || null;
}

/** 當月有效訂單筆數（pending + completed） */
export async function countReferralValidOrdersThisMonth(
  admin,
  partnerId,
  when = new Date(),
) {
  if (!admin || !partnerId) return 0;
  const { start, end } = monthBoundsIso(when);
  const { data, error } = await admin
    .from("orders")
    .select("id, status")
    .eq("partner_id", partnerId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error || !data) return 0;
  return data.filter((o) => isSettledOrderStatus(o.status)).length;
}

/**
 * 當月達標後：把本月既有有效單的分潤重算為 bonusRate（成本 × 30%）
 */
export async function backfillMonthReferralProfitsAtRate(
  admin,
  partnerId,
  ratePercent,
  when = new Date(),
) {
  if (!admin || !partnerId) return 0;
  const { start, end } = monthBoundsIso(when);
  const { data: orders, error } = await admin
    .from("orders")
    .select("id, status, total_amount, b2b_cost, partner_profit")
    .eq("partner_id", partnerId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error || !orders?.length) return 0;

  let updated = 0;
  for (const o of orders) {
    if (!isSettledOrderStatus(o.status)) continue;
    const cost = Number(o.b2b_cost);
    const sell = Number(o.total_amount);
    const nextProfit =
      Number.isFinite(cost) && cost > 0
        ? computeReferralProfit(cost, ratePercent, sell)
        : computeReferralProfit(sell, ratePercent);
    if (Number(o.partner_profit) === nextProfit) continue;
    const { error: upErr } = await admin
      .from("orders")
      .update({ partner_profit: nextProfit })
      .eq("id", o.id);
    if (!upErr) updated += 1;
  }
  return updated;
}

/**
 * 建立推薦訂單時：依「本月有效單量（含本筆）」決定 25% 或 30%，
 * 若達標則回填本月先前訂單為 30%。
 */
export async function profitFromReferralPartner(
  partner,
  totalAmount,
  b2bCost,
  opts = {},
) {
  if (!partner) return 0;

  const admin = opts.admin || getAdmin();
  let monthCountBefore = 0;
  if (admin && partner.id) {
    monthCountBefore = await countReferralValidOrdersThisMonth(
      admin,
      partner.id,
      opts.when,
    );
  }

  const monthCountAfter = monthCountBefore + 1;
  const rate = referralRateForMonthCount(partner, monthCountAfter);
  const { threshold, bonusRate } = resolveReferralTierRates(partner);

  const cost = Number(b2bCost);
  const profit =
    Number.isFinite(cost) && cost > 0
      ? computeReferralProfit(cost, rate, totalAmount)
      : computeReferralProfit(totalAmount, rate);

  // 達標當月：整月有效單改為 30%
  if (admin && partner.id && monthCountAfter >= threshold) {
    try {
      await backfillMonthReferralProfitsAtRate(
        admin,
        partner.id,
        bonusRate,
        opts.when,
      );
    } catch (err) {
      console.error("[referral] month backfill failed:", err?.message || err);
    }
  }

  return profit;
}

/** 同步版（無 DB 計數；僅用基本趴數）— 相容舊呼叫 */
export function profitFromReferralPartnerSync(partner, totalAmount, b2bCost) {
  if (!partner) return 0;
  const rate = DEFAULT_REFERRAL_RATE;
  const cost = Number(b2bCost);
  if (Number.isFinite(cost) && cost > 0) {
    return computeReferralProfit(cost, rate, totalAmount);
  }
  return computeReferralProfit(totalAmount, rate);
}

export async function linkCartToReferral(cartId, partner, code) {
  if (!cartId || !partner?.id) return;
  const admin = getAdmin();
  if (!admin) return;

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
