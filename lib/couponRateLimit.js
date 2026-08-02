/**
 * 折扣碼套用防暴力破解／異常監控。
 *
 * Serverless（Vercel）函式沒有常駐記憶體可跨請求計數，改用 Supabase 記錄
 * 每次嘗試（成功／失敗皆記），套用前先查詢同 IP 近期嘗試次數。流量再大時
 * 可平移到 Redis／Upstash，對外介面（isCouponRateLimited / logCouponAttempt）
 * 不需要變動。
 */
import { createClient } from "@supabase/supabase-js";

const WINDOW_MS = 5 * 60 * 1000; // 5 分鐘
const MAX_ATTEMPTS = 20; // 同 IP 5 分鐘內最多 20 次套用嘗試（含失敗）

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

export function getClientIp(req) {
  const fwd = req.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

/** 套用折扣碼前檢查是否已超過嘗試上限；回傳 true = 應擋下（回 429） */
export async function isCouponRateLimited(ip) {
  const db = supabaseAdmin();
  if (!db || !ip || ip === "unknown") return false;

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error } = await db
    .from("coupon_apply_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  // 表尚未建立（migration 未跑）或查詢失敗時不擋，避免誤傷正常結帳流程
  if (error) return false;
  return (count || 0) >= MAX_ATTEMPTS;
}

/** 記錄一次套用嘗試（成功或失敗皆記，供事後異常監控） */
export async function logCouponAttempt({ ip, cartId, code, success }) {
  const db = supabaseAdmin();
  if (!db) return;
  try {
    await db.from("coupon_apply_attempts").insert([
      {
        ip: ip || null,
        cart_id: cartId || null,
        code: String(code || "").slice(0, 64),
        success: !!success,
      },
    ]);
  } catch {
    /* 記錄失敗不應影響結帳主流程 */
  }
}
