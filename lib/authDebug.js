import { getPublicSiteUrl } from "./siteUrl";

/** 統一 Auth 除錯 log，Vercel Logs / 瀏覽器 Console 搜尋 [Auth Debug] */
export function authLog(step, detail) {
  const ts = new Date().toISOString();
  if (detail !== undefined) {
    console.log(`[Auth Debug] ${ts} | ${step}`, detail);
  } else {
    console.log(`[Auth Debug] ${ts} | ${step}`);
  }
}

export function authError(step, err) {
  const msg = err?.message || String(err);
  console.error(`[Auth Debug] ❌ ${step}`, msg, err);
}

/** 解析 NextAuth 回傳到 /login 的 error query */
export function parseNextAuthError(search = "") {
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  const error = params.get("error");
  if (!error) return null;

  const map = {
    Configuration: "NextAuth 設定錯誤（檢查 NEXTAUTH_URL / LINE 金鑰）",
    AccessDenied: "signIn callback 拒絕（Supabase 同步失敗）",
    Verification: "驗證 token 過期或無效",
    OAuthSignin: "LINE OAuth 初始化失敗",
    OAuthCallback: "LINE callback 失敗（redirect_uri 未登記？）",
    OAuthCreateAccount: "建立 OAuth 帳號失敗",
    EmailCreateAccount: "建立 Email 帳號失敗",
    Callback: "Callback 路由錯誤",
    OAuthAccountNotLinked: "此 Email 已綁定其他登入方式",
    SessionRequired: "需要登入才能存取",
    Default: "未知 NextAuth 錯誤",
  };

  return {
    code: error,
    hint: map[error] || map.Default,
    raw: params.toString(),
  };
}

/** OAuth 登入後 Supabase 導回網址（優先用 NEXT_PUBLIC_SITE_URL） */
export function getOAuthRedirectUrl(path = "/account") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // 本機開發時一律導回 localhost，避免 NEXT_PUBLIC_SITE_URL 指到正式站
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (/^localhost$|^127\.0\.0\.1$/i.test(hostname)) {
      const url = `${origin}${normalizedPath}`;
      authLog("Google OAuth redirectTo (localhost)", {
        redirectTo: url,
        hint: "請在 Supabase → Redirect URLs 加入此網址",
      });
      return url;
    }
  }

  const site =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    getPublicSiteUrl();
  const url = `${site}${normalizedPath}`;
  authLog("Google OAuth redirectTo", {
    site,
    path,
    redirectTo: url,
    hint: "此 URL 必須在 Supabase → Authentication → Redirect URLs 白名單內",
  });
  return url;
}

/** 本機點 LINE 前可預期的 callback URL（需與 LINE Console 一致） */
export function getLineCallbackUrl(origin) {
  return `${origin}/api/auth/callback/line`;
}

/** 點 LINE 前：印 client 資訊 + 拉 server env 檢查 */
export async function logLineLoginStart(origin, callbackPath = "/account") {
  const callbackUrl = `${origin}${callbackPath}`;
  const lineCallback = getLineCallbackUrl(origin);

  authLog("LINE 登入開始（client）", {
    origin,
    callbackUrl,
    lineCallbackMustRegisterInConsole: lineCallback,
  });

  try {
    const res = await fetch("/api/auth/debug-config");
    const cfg = await res.json();
    authLog("伺服器 env 檢查（debug-config）", cfg);
    return { callbackUrl, serverConfig: cfg };
  } catch (err) {
    authError("無法取得 /api/auth/debug-config", err);
    return { callbackUrl, serverConfig: null };
  }
}
