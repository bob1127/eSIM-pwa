/**
 * 專屬連結折扣碼：旅客看到的代碼 = referral_code；
 * Medusa 實際套用夥伴專屬、高熵亂數碼（partners.referral_medusa_code，
 * 由管理者後台建立／管理，見 lib/medusaPartnerPromotions.js）。
 *
 * 安全性：此檔案只讀 Supabase 已存好的映射，完全不持有、也不需要任何
 * Medusa 管理員憑證——旅客結帳路徑不應該有能力建立或修改折扣碼。
 */
import { createClient } from "@supabase/supabase-js";
import { normalizeReferralCode } from "./partnerReferral";

export const PENDING_COUPON_KEY = "jeko_pending_coupon";
export const DEFAULT_REFERRAL_DISCOUNT_PERCENT = 10;
export const MIN_REFERRAL_DISCOUNT_PERCENT = 1;
export const MAX_REFERRAL_DISCOUNT_PERCENT = 50;

export function clampReferralDiscountPercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(
    MAX_REFERRAL_DISCOUNT_PERCENT,
    Math.max(MIN_REFERRAL_DISCOUNT_PERCENT, Math.round(n)),
  );
}

export function displayReferralCouponCode(referralCode) {
  const c = normalizeReferralCode(referralCode);
  return c ? c.toUpperCase() : "";
}

function supabaseAdmin() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * 若輸入碼對應啟用中的 referral 夥伴折扣，回傳映射資訊；否則 null。
 * 只信任 Supabase 存好的 referral_medusa_code——絕不依「趴數」現算內部碼，
 * 避免出現可被猜測、跨夥伴共用的折扣碼。
 * @returns {Promise<null | {
 *   partnerId: number,
 *   referralCode: string,
 *   displayCode: string,
 *   medusaCode: string,
 *   percent: number,
 * }>}
 */
export async function resolvePartnerReferralDiscount(rawCode) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;

  const db = supabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("partners")
    .select(
      "id, referral_code, status, cooperation_model, referral_discount_enabled, referral_discount_percent, referral_medusa_code",
    )
    .eq("referral_code", code)
    .eq("status", "active")
    .eq("cooperation_model", "referral")
    .maybeSingle();

  // 遷移尚未執行時略過折扣映射（不阻斷其他折扣碼）
  if (error) {
    const msg = String(error.message || "");
    if (msg.includes("column") || msg.includes("referral_")) {
      return null;
    }
    console.error("[partnerReferralDiscount] 查詢失敗:", error.message);
    return null;
  }

  if (!data) return null;
  if (data.referral_discount_enabled === false) {
    return { unavailable: true, reason: "disabled", displayCode: displayReferralCouponCode(code) };
  }
  if (!data.referral_medusa_code) {
    return { unavailable: true, reason: "not_synced", displayCode: displayReferralCouponCode(code) };
  }

  const percent = clampReferralDiscountPercent(
    data.referral_discount_percent ?? DEFAULT_REFERRAL_DISCOUNT_PERCENT,
  ) || DEFAULT_REFERRAL_DISCOUNT_PERCENT;

  return {
    partnerId: data.id,
    referralCode: code,
    displayCode: displayReferralCouponCode(code),
    medusaCode: data.referral_medusa_code,
    percent,
  };
}
