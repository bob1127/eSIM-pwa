/**
 * 登入 / 註冊 / 忘記密碼共用的持久化限流（防暴力破解）。
 *
 * 做法與 lib/couponRateLimit.js 一致：Vercel serverless 沒有跨請求的常駐記憶體，
 * 改用 Supabase 資料表記錄每次嘗試，套用前查詢同 key 近期嘗試次數。
 * 需先執行 supabase/migrations/20260809_auth_rate_limit.sql 建立資料表。
 */
import { createClient } from "@supabase/supabase-js";

let cachedAdmin = null;
function supabaseAdmin() {
  if (cachedAdmin) return cachedAdmin;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  cachedAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return cachedAdmin;
}

export function getClientIp(req) {
  const fwd = req.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

/**
 * 檢查某個 action + key（通常是 `email` 或 `email|ip`）是否已超過嘗試上限。
 * 資料表／查詢失敗時預設「不擋」，避免誤傷正常登入／註冊流程。
 *
 * @returns {Promise<{ limited: boolean, retryAfterSec: number }>}
 */
export async function checkAuthRateLimit({
  action,
  identifier,
  windowMs = 10 * 60 * 1000,
  maxAttempts = 10,
  countAll = false, // false = 只計失敗次數（登入類）；true = 不論成敗都算（發送類）
}) {
  const db = supabaseAdmin();
  if (!db || !identifier) return { limited: false, retryAfterSec: 0 };

  const since = new Date(Date.now() - windowMs).toISOString();
  let query = db
    .from("auth_rate_limit_attempts")
    .select("created_at", { count: "exact" })
    .eq("action", action)
    .eq("identifier", identifier)
    .gte("created_at", since);
  if (!countAll) query = query.eq("success", false);

  const { data, error, count } = await query
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) return { limited: false, retryAfterSec: 0 };

  const limited = (count || 0) >= maxAttempts;
  if (!limited) return { limited: false, retryAfterSec: 0 };

  const oldest = data?.[0]?.created_at
    ? new Date(data[0].created_at).getTime()
    : Date.now();
  const retryAfterSec = Math.max(
    1,
    Math.ceil((oldest + windowMs - Date.now()) / 1000),
  );
  return { limited: true, retryAfterSec };
}

/** 記錄一次嘗試（成功或失敗皆記，供事後異常監控 + 限流判斷） */
export async function logAuthAttempt({ action, identifier, ip, success }) {
  const db = supabaseAdmin();
  if (!db) return;
  try {
    await db.from("auth_rate_limit_attempts").insert([
      {
        action: String(action || "").slice(0, 64),
        identifier: String(identifier || "").slice(0, 256),
        ip: ip ? String(ip).slice(0, 64) : null,
        success: !!success,
      },
    ]);
  } catch {
    /* 記錄失敗不應影響登入／註冊主流程 */
  }
}

/**
 * 常用組合：檢查是否被擋 → 若沒被擋，回傳一個 record() 供呼叫端在流程結束後記錄結果。
 * 用法：
 *   const rl = await guardAuthRateLimit({ action: "login", identifier: email, ip, maxAttempts: 8 });
 *   if (rl.limited) return res.status(429).json({ message: `請稍候 ${rl.retryAfterSec} 秒後再試` });
 *   ... 執行登入 ...
 *   await rl.record(success);
 */
export async function guardAuthRateLimit({
  action,
  identifier,
  ip,
  windowMs,
  maxAttempts,
  countAll = false,
}) {
  const byIdentifier = await checkAuthRateLimit({
    action,
    identifier,
    windowMs,
    maxAttempts,
    countAll,
  });
  if (byIdentifier.limited) {
    return {
      limited: true,
      retryAfterSec: byIdentifier.retryAfterSec,
      record: async () => {},
    };
  }

  // 同 IP 也需要獨立算一次，防止攻擊者輪換 email 打同一支 API
  const ipLimit = ip
    ? await checkAuthRateLimit({
        action: `${action}:ip`,
        identifier: ip,
        windowMs,
        maxAttempts: Math.max(maxAttempts * 3, maxAttempts + 10),
        countAll,
      })
    : { limited: false, retryAfterSec: 0 };

  if (ipLimit.limited) {
    return {
      limited: true,
      retryAfterSec: ipLimit.retryAfterSec,
      record: async () => {},
    };
  }

  return {
    limited: false,
    retryAfterSec: 0,
    record: async (success) => {
      await Promise.all([
        logAuthAttempt({ action, identifier, ip, success }),
        ip
          ? logAuthAttempt({ action: `${action}:ip`, identifier: ip, ip, success })
          : Promise.resolve(),
      ]);
    },
  };
}
