/**
 * 價格異動稽核紀錄（防竄改追蹤用）。
 *
 * 只在伺服器（service role）寫入，前端／partner 無法直接寫入此表
 * （見 supabase/migrations/20260728_partner_pricing_security.sql 的 RLS）。
 * 任何失敗都不應阻斷主要操作，因此全程 best-effort、吞掉錯誤。
 */

function extractClientIp(req) {
  const fwd = req?.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) return fwd.split(",")[0].trim();
  return req?.socket?.remoteAddress || null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin service-role client
 * @param {{
 *   storeId: number|string,
 *   actorUserId?: string|null,
 *   actorEmail?: string|null,
 *   action: string,        // 例："update_markup_rate" | "update_custom_prices"
 *   field: string,         // 例："markup_rate" | "custom_prices"
 *   oldValue?: any,
 *   newValue?: any,
 *   req?: import('http').IncomingMessage,
 * }} params
 */
export async function logPricingAudit(admin, params = {}) {
  if (!admin || !params?.storeId || !params?.action) return;
  try {
    await admin.from("partner_pricing_audit").insert([
      {
        store_id: params.storeId,
        actor_user_id: params.actorUserId || null,
        actor_email: params.actorEmail || null,
        action: params.action,
        field: params.field || null,
        old_value: params.oldValue ?? null,
        new_value: params.newValue ?? null,
        ip: params.req ? extractClientIp(params.req) : null,
      },
    ]);
  } catch (err) {
    console.error("[logPricingAudit] 寫入稽核紀錄失敗（不影響主流程）", err?.message || err);
  }
}
