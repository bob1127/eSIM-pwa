import { createClient } from "@supabase/supabase-js";
import { guardAuthRateLimit, getClientIp } from "../../../lib/authRateLimit";

/**
 * 會員 Email/密碼登入代理。
 *
 * 直接讓前端呼叫 supabase.auth.signInWithPassword() 雖然方便，但我們的應用程式
 * 完全無法在中間插入「同 Email / 同 IP 短時間內失敗太多次就擋下」的防暴力破解機制
 * （anon key 是公開的，攻擊者可以完全跳過我們的網站直接打 Supabase Auth API）。
 *
 * 把登入請求收斂到這支 API，至少能確保「透過本站登入表單」的嘗試會被限流；
 * 若要完整防護（包含直接打 Supabase REST API 的攻擊），還需要在
 * Supabase Dashboard → Authentication → Rate Limits 另外設定。
 */
function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");
  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ success: false, message: "伺服器設定不完整" });
  }

  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "請輸入 Email 與密碼" });
  }

  const ip = getClientIp(req);
  const rl = await guardAuthRateLimit({
    action: "login",
    identifier: email,
    ip,
    windowMs: 15 * 60 * 1000,
    maxAttempts: 8,
  });
  if (rl.limited) {
    return res.status(429).json({
      success: false,
      code: "RATE_LIMIT",
      message: `登入嘗試過多，請稍候 ${rl.retryAfterSec} 秒後再試`,
      retryAfter: rl.retryAfterSec,
    });
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    await rl.record(false);
    return res.status(401).json({
      success: false,
      message: error.message || "登入失敗，請確認帳號密碼",
    });
  }

  await rl.record(true);

  return res.status(200).json({
    success: true,
    session: {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_at: data.session?.expires_at,
    },
    user: data.user
      ? { id: data.user.id, email: data.user.email }
      : null,
  });
}
