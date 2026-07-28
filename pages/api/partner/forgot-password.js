import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "../../../lib/siteUrl";
import {
  sendPartnerResetPasswordEmail,
  mailErrorMessage,
} from "../../../lib/partnerResetPasswordEmail";

const COOLDOWN_MS = 60 * 1000;

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

/**
 * 重設連結網域：本機開發時用目前 request host（localhost），
 * 避免 NEXT_PUBLIC_SITE_URL 指向正式站導致本機測試點到官網。
 * 正式／預覽環境仍走 getSiteUrl。
 */
function resolveResetSiteUrl(req) {
  const host = String(req?.headers?.host || "");
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    const proto = req.headers["x-forwarded-proto"] || "http";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return getSiteUrl(req);
}

/** 直接導向本站重設頁（略過 Supabase verify 中轉，避免被導回首頁） */
function buildPartnerResetLink(redirectTo, linkProperties) {
  const hashedToken = linkProperties?.hashed_token;
  if (hashedToken) {
    const url = new URL(redirectTo);
    url.searchParams.set("token_hash", hashedToken);
    url.searchParams.set("type", "recovery");
    return url.toString();
  }
  const actionLink = linkProperties?.action_link;
  if (actionLink) return fixRecoveryRedirectLink(actionLink, redirectTo);
  return null;
}

function fixRecoveryRedirectLink(actionLink, redirectTo) {
  try {
    const url = new URL(actionLink);
    url.searchParams.set("redirect_to", redirectTo);
    return url.toString();
  } catch {
    return actionLink;
  }
}

function getCooldownRemainSec(email) {
  global.partnerResetCooldown = global.partnerResetCooldown || {};
  const last = global.partnerResetCooldown[email];
  if (!last) return 0;
  const remain = COOLDOWN_MS - (Date.now() - last);
  return remain > 0 ? Math.ceil(remain / 1000) : 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const email = normalizeEmail(req.body?.email);
  if (!email || !email.includes("@")) {
    return res.status(400).json({
      success: false,
      code: "INVALID_EMAIL",
      message: "請輸入有效的 Email 地址",
    });
  }

  const cooldownSec = getCooldownRemainSec(email);
  if (cooldownSec > 0) {
    return res.status(429).json({
      success: false,
      code: "RATE_LIMIT",
      message: `請稍候 ${cooldownSec} 秒後再試`,
      retryAfter: cooldownSec,
    });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({
      success: false,
      message: "伺服器設定不完整，無法寄送重設信件",
    });
  }

  const { data: partnerRows, error: partnerErr } = await supabaseAdmin
    .from("partners")
    .select("id, email, status")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (partnerErr) {
    console.error("[forgot-password] partners query:", partnerErr.message);
    return res.status(500).json({
      success: false,
      message: "查詢失敗，請稍後再試",
    });
  }

  const partner = partnerRows?.[0] ?? null;

  if (!partner) {
    return res.status(404).json({
      success: false,
      code: "NOT_PARTNER_EMAIL",
      message:
        "找不到此 Email 的夥伴申請紀錄。請確認是否為您「申請合作夥伴時填寫的 Email」，而非其他信箱。",
    });
  }

  const siteUrl = resolveResetSiteUrl(req);
  const redirectTo = `${siteUrl}/partner/reset-password/`;

  const { data: linkData, error: linkErr } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

  if (linkErr) {
    const msg = linkErr.message || "";
    if (/user|not found|registered/i.test(msg)) {
      return res.status(404).json({
        success: false,
        code: "NO_AUTH_ACCOUNT",
        message:
          "此 Email 有申請紀錄，但尚未建立登入帳號。請重新完成夥伴申請，或聯繫 JEKO eSIM 客服協助。",
      });
    }
    return res.status(400).json({
      success: false,
      message: msg || "無法建立重設連結",
    });
  }

  const resetLink = buildPartnerResetLink(
    redirectTo,
    linkData?.properties || linkData,
  );

  if (!resetLink) {
    return res.status(500).json({
      success: false,
      message: "無法產生重設連結，請稍後再試",
    });
  }

  try {
    await sendPartnerResetPasswordEmail({ email, resetLink });
  } catch (err) {
    console.error("[forgot-password] send mail:", err?.message || err);
    return res.status(500).json({
      success: false,
      message: mailErrorMessage(err),
    });
  }

  global.partnerResetCooldown = global.partnerResetCooldown || {};
  global.partnerResetCooldown[email] = Date.now();

  return res.status(200).json({
    success: true,
    message: "重設密碼信件已寄出",
    email,
  });
}
