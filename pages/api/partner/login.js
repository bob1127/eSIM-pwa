import { createClient } from "@supabase/supabase-js";
import { guardAuthRateLimit } from "../../../lib/authRateLimit";
import {
  applyPartnerAuthSecurityHeaders,
  assertSameSiteRequest,
  authFailureDelay,
  GENERIC_AUTH_ERROR,
  getClientIp,
  isHoneypotTriggered,
  isValidEmailFormat,
  isValidPasswordLength,
  normalizeLoginEmail,
} from "../../../lib/partnerLoginSecurity";
import {
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { partnerLoginBlockMessage } from "../../../lib/partnerUtils";

/**
 * POST /api/partner/login
 * 夥伴後台專用 Email／密碼登入（高規格防護）：
 * - 同源 Origin／Referer
 * - 蜜罐欄位
 * - Email／IP 雙重限流（較一般會員更嚴）
 * - 失敗固定延遲 + 統一錯誤訊息
 * - 登入成功後先驗證 partners.status === active，非 active 不發 session
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  applyPartnerAuthSecurityHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ success: false, message: "伺服器設定不完整" });
  }

  if (!assertSameSiteRequest(req)) {
    await authFailureDelay(400);
    return res.status(403).json({
      success: false,
      code: "FORBIDDEN_ORIGIN",
      message: "來源不受信任，請由官方夥伴登入頁重新操作",
    });
  }

  if (isHoneypotTriggered(req.body)) {
    await authFailureDelay(900);
    // 假裝成功節奏，不洩漏
    return res.status(429).json({
      success: false,
      code: "RATE_LIMIT",
      message: "登入嘗試過多，請稍候再試",
      retryAfter: 60,
    });
  }

  const email = normalizeLoginEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || !isValidEmailFormat(email) || !isValidPasswordLength(password)) {
    await authFailureDelay();
    return res.status(400).json({
      success: false,
      code: "INVALID_INPUT",
      message: GENERIC_AUTH_ERROR,
    });
  }

  const ip = getClientIp(req);
  const rl = await guardAuthRateLimit({
    action: "partner-login",
    identifier: email,
    ip,
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
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

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.session || !data?.user) {
    await rl.record(false);
    await authFailureDelay();
    return res.status(401).json({
      success: false,
      code: "INVALID_CREDENTIALS",
      message: GENERIC_AUTH_ERROR,
    });
  }

  // 必須為 active 夥伴才發 token（審核中／未申請不發 session）
  if (!getSupabaseAdmin()) {
    await rl.record(false);
    await authFailureDelay();
    return res.status(500).json({
      success: false,
      message: "伺服器設定不完整",
    });
  }

  const access = await verifyPartnerAccessForUser(data.user);
  if (!access?.ok) {
    await rl.record(false);
    await authFailureDelay(400);
    return res.status(403).json({
      success: false,
      code: access?.code || "NOT_ACTIVE",
      message: access?.message || partnerLoginBlockMessage(access?.partner),
      partner: access?.partner
        ? { status: access.partner.status, name: access.partner.name }
        : null,
    });
  }

  await rl.record(true);

  return res.status(200).json({
    success: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    partner: {
      id: access.partner.id,
      status: access.partner.status,
      name: access.partner.name,
      slug: access.partner.slug,
    },
  });
}
