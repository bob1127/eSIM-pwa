import { createClient } from "@supabase/supabase-js";
import { validatePassword } from "../../lib/passwordPolicy";
import {
  isEmailVerifiedForRegistration,
  consumeEmailVerification,
} from "../../lib/emailVerification";
import { guardAuthRateLimit, getClientIp } from "../../lib/authRateLimit";

/**
 * 會員信箱註冊：一律在伺服器端建立帳號。
 *
 * 為什麼不讓前端直接呼叫 supabase.auth.signUp？
 * 前端拿到的是公開的 anon key，任何人都能在瀏覽器 console 直接呼叫
 * signUp() 跳過「Email 驗證碼」流程建立帳號。這裡改成：
 *   1. 先確認 email 已透過 /api/send-code + /api/verify-code 完成驗證
 *   2. 伺服器端用 service_role 呼叫 admin.createUser()，並直接標記 email_confirm=true
 *   3. 成功後消耗掉驗證紀錄，避免同一次驗證被重複濫用
 */
function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const fullName = String(req.body?.fullName || "").slice(0, 100);

  if (!email || !email.includes("@")) {
    return res
      .status(400)
      .json({ success: false, message: "請輸入有效的 Email 地址" });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  const ip = getClientIp(req);
  const rl = await guardAuthRateLimit({
    action: "register",
    identifier: email,
    ip,
    windowMs: 60 * 60 * 1000,
    maxAttempts: 10,
  });
  if (rl.limited) {
    return res.status(429).json({
      success: false,
      message: `註冊嘗試過多，請稍候 ${rl.retryAfterSec} 秒後再試`,
      retryAfter: rl.retryAfterSec,
    });
  }

  if (!isEmailVerifiedForRegistration(email)) {
    await rl.record(false);
    return res
      .status(400)
      .json({ success: false, message: "請先完成 Email 驗證，或驗證已過期請重新驗證" });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({
      success: false,
      message: "伺服器設定不完整，無法建立帳號",
    });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    await rl.record(false);
    const msg = error.message || "";
    const alreadyExists =
      msg.toLowerCase().includes("already") ||
      msg.toLowerCase().includes("registered") ||
      error.status === 422;
    if (alreadyExists) {
      return res
        .status(409)
        .json({ success: false, code: "ALREADY_EXISTS", message: "此 Email 已註冊過帳號，請直接登入" });
    }
    return res.status(400).json({ success: false, message: msg || "建立帳號失敗" });
  }

  await rl.record(true);
  consumeEmailVerification(email);

  return res.status(200).json({
    success: true,
    userId: data?.user?.id || null,
    message: "註冊成功！請直接登入",
  });
}
