import { isSettledOrderStatus } from "./refundPolicy";
import { isWelcomeMemberCouponCode } from "./memberCoupons";

/**
 * 新會員首單券：有成功訂單後自動標 expired，避免結帳仍顯示可點卡片。
 */

export async function memberHasPriorSuccessfulOrder(supabaseAdmin, email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized || !supabaseAdmin) return false;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("customer_email", normalized);

  if (error) {
    console.error("[welcomeFirstOrder] 查歷史訂單失敗:", error.message);
    // 保守：查不到時當已購買，避免誤用首單券
    return true;
  }

  return (data || []).some(
    (o) =>
      isSettledOrderStatus(o.status) ||
      ["refund_pending", "refunded"].includes(
        String(o.status || "").toLowerCase(),
      ),
  );
}

/**
 * 將仍為 available 的 welcome／JEKO-WELCOME 券標為 expired。
 * @returns {Promise<number>} 更新筆數
 */
export async function expireWelcomeCouponsForEmail(supabaseAdmin, email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized || !supabaseAdmin) return 0;

  const { data: rows, error: listErr } = await supabaseAdmin
    .from("member_coupons")
    .select("id, code, source, status")
    .eq("email", normalized)
    .eq("status", "available");

  if (listErr) {
    console.error("[welcomeFirstOrder] 列券失敗:", listErr.message);
    return 0;
  }

  const ids = (rows || [])
    .filter(
      (r) =>
        r.source === "welcome" || isWelcomeMemberCouponCode(r.code),
    )
    .map((r) => r.id)
    .filter(Boolean);

  if (!ids.length) return 0;

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("member_coupons")
    .update({ status: "expired" })
    .in("id", ids)
    .eq("status", "available")
    .select("id");

  if (updErr) {
    console.error("[welcomeFirstOrder] 失效更新失敗:", updErr.message);
    return 0;
  }

  return updated?.length || 0;
}

/** 若已有成功訂單 → 失效首單券；回傳是否已有訂單 */
export async function syncWelcomeCouponsAfterOrders(supabaseAdmin, email) {
  const hasPrior = await memberHasPriorSuccessfulOrder(supabaseAdmin, email);
  if (!hasPrior) return { hasPrior: false, expired: 0 };
  const expired = await expireWelcomeCouponsForEmail(supabaseAdmin, email);
  return { hasPrior: true, expired };
}
