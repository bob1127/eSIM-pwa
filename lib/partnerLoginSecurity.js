/**
 * 夥伴登入資安工具：同源檢查、蜜罐、失敗延遲、安全標頭。
 */
import { getClientIp } from "./authRateLimit";

const GENERIC_AUTH_ERROR = "帳號或密碼錯誤，或此帳號無法登入夥伴後台";

export { getClientIp, GENERIC_AUTH_ERROR };

/** 正規化 Email */
export function normalizeLoginEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

export function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 密碼長度上限（防超大 payload / bcrypt DoS） */
export function isValidPasswordLength(password) {
  const len = String(password || "").length;
  return len >= 1 && len <= 256;
}

/**
 * 僅允許本站 Origin／Referer 呼叫（阻擋跨站偽造表單打 API）
 * 本機允許 localhost / 127.0.0.1
 */
export function assertSameSiteRequest(req) {
  const host = String(req.headers?.host || "").toLowerCase();
  const origin = String(req.headers?.origin || "");
  const referer = String(req.headers?.referer || "");

  const allowedHosts = new Set();
  if (host) allowedHosts.add(host.split(":")[0]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";
  try {
    if (siteUrl) allowedHosts.add(new URL(siteUrl).hostname.toLowerCase());
  } catch {
    /* ignore */
  }
  allowedHosts.add("localhost");
  allowedHosts.add("127.0.0.1");

  const checkUrl = (raw) => {
    if (!raw) return null;
    try {
      return new URL(raw).hostname.toLowerCase();
    } catch {
      return null;
    }
  };

  const originHost = checkUrl(origin);
  const refererHost = checkUrl(referer);

  // 瀏覽器通常會帶 Origin（CORS POST）；無 Origin 時退而檢查 Referer
  if (originHost) {
    return allowedHosts.has(originHost);
  }
  if (refererHost) {
    return allowedHosts.has(refererHost);
  }

  // 非瀏覽器／部分工具不帶 Origin／Referer：正式環境拒絕，本機放行方便測試
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    process.env.NODE_ENV === "development";
  return isLocal;
}

/** 蜜罐欄位：自動化機器人常會填寫 */
export function isHoneypotTriggered(body) {
  const trap = body?.company_website ?? body?.website ?? body?.fax;
  return typeof trap === "string" && trap.trim().length > 0;
}

/** 失敗時固定延遲，降低時機攻擊／暴力破解效率 */
export function authFailureDelay(ms = 650) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function applyPartnerAuthSecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}
