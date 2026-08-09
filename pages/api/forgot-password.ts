import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "../../lib/siteUrl";
import { sendMemberResetPasswordEmail } from "../../lib/memberResetPasswordEmail";
import { guardAuthRateLimit, getClientIp } from "../../lib/authRateLimit";

/**
 * 會員忘記密碼：改用 Supabase Auth 直接產生重設連結並寄信。
 *
 * 舊版曾經呼叫一個完全不相關產品（fegoesim.com / wmesim.com）的 WordPress
 * 端點，是從別的專案複製過來、對 Jeko 帳號完全無效的殘留程式碼，已移除。
 */
function normalizeEmail(e: unknown) {
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

/** 本機開發時用目前 request host，避免導到正式站網址 */
function resolveResetSiteUrl(req: NextApiRequest) {
  const host = String(req?.headers?.host || "");
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return getSiteUrl(req);
}

function buildResetLink(redirectTo: string, linkProperties: any) {
  const hashedToken = linkProperties?.hashed_token;
  if (hashedToken) {
    const url = new URL(redirectTo);
    url.searchParams.set("token_hash", hashedToken);
    url.searchParams.set("type", "recovery");
    return url.toString();
  }
  const actionLink = linkProperties?.action_link;
  if (actionLink) {
    try {
      const url = new URL(actionLink);
      url.searchParams.set("redirect_to", redirectTo);
      return url.toString();
    } catch {
      return actionLink;
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });

  const email = normalizeEmail(req.body?.email ?? req.body?.identifier);
  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, message: "請輸入有效的 Email 地址" });
  }

  const ip = getClientIp(req);
  const rl = await guardAuthRateLimit({
    action: "forgot-password",
    identifier: email,
    ip,
    windowMs: 5 * 60 * 1000,
    maxAttempts: 3,
    countAll: true,
  });
  if (rl.limited) {
    return res.status(429).json({
      ok: false,
      message: `請稍候 ${rl.retryAfterSec} 秒後再試`,
      retryAfter: rl.retryAfterSec,
    });
  }
  await rl.record(true);

  // 防帳號枚舉：無論該 email 是否存在，一律回相同訊息
  const genericOk = {
    ok: true,
    message: "若該 Email 存在，將寄出重設密碼信。",
  };

  if (!supabaseAdmin) {
    console.error("[forgot-password] Supabase admin 未設定");
    return res.status(200).json(genericOk);
  }

  try {
    const siteUrl = resolveResetSiteUrl(req);
    const redirectTo = `${siteUrl}/reset-password`;

    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

    if (linkErr) {
      // 找不到帳號等錯誤一律回通用訊息，避免帳號枚舉
      console.warn("[forgot-password] generateLink:", linkErr.message);
      return res.status(200).json(genericOk);
    }

    const resetLink = buildResetLink(redirectTo, linkData?.properties || linkData);
    if (resetLink) {
      await sendMemberResetPasswordEmail({ email, resetLink });
    }

    return res.status(200).json(genericOk);
  } catch (err: any) {
    console.error("[forgot-password] error:", err?.message || err);
    // 寄信失敗也不透露細節給前端，避免帳號枚舉／資訊洩漏
    return res.status(200).json(genericOk);
  }
}
