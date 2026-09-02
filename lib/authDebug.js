import { getPublicSiteUrl } from "./siteUrl";
import { sanitizeRedirect } from "./authRedirect";

/** 統一 Auth 除錯 log，Vercel Logs / 瀏覽器 Console 搜尋 [Auth Debug] */
function authDebugEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AUTH_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_AUTH_DEBUG === "1"
  );
}

export function authLog(step, detail) {
  if (!authDebugEnabled()) return;
  const ts = new Date().toISOString();
  if (detail !== undefined) {
    console.log(`[Auth Debug] ${ts} | ${step}`, detail);
  } else {
    console.log(`[Auth Debug] ${ts} | ${step}`);
  }
}

export function authError(step, err) {
  if (!authDebugEnabled()) return;
  const msg = err?.message || String(err);
  console.error(`[Auth Debug] ❌ ${step}`, msg, err);
}

/** 解析 NextAuth 回傳到 /login 的 error query */
export function parseNextAuthError(search = "") {
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  let error = params.get("error");
  if (!error) return null;

  // NextAuth pages.error 在缺參數時會變成字串 "undefined"
  if (error === "undefined" || error === "null") {
    error = "OAuthCallback";
  }

  const map = {
    Configuration: "NextAuth 設定錯誤（檢查 NEXTAUTH_URL / LINE 金鑰）",
    AccessDenied: "signIn callback 拒絕（Supabase 同步失敗）",
    Verification: "驗證 token 過期或無效",
    OAuthSignin: "LINE OAuth 初始化失敗",
    OAuthCallback:
      "OAuth state cookie 遺失。Callback 設定通常沒問題；請清除本機 Service Worker 與 Cookies 後重試（Chrome → Application → Service Workers → Unregister）。",
    OAuthCreateAccount: "建立 OAuth 帳號失敗",
    EmailCreateAccount: "建立 Email 帳號失敗",
    Callback: "Callback 路由錯誤",
    OAuthAccountNotLinked: "此 Email 已綁定其他登入方式",
    SessionRequired: "需要登入才能存取",
    Default: "未知 NextAuth 錯誤",
  };

  const code = String(error);
  return {
    code,
    hint: map[code] || map.Default,
    raw: params.toString(),
  };
}

/** OAuth 登入後 Supabase 導回網址（一律先回 /login?redirect=…，再由登入頁導回原頁） */
export function getOAuthRedirectUrl(path = "/account") {
  const safe = sanitizeRedirect(path, "/account");
  const loginReturn = `/login?redirect=${encodeURIComponent(safe)}`;

  // 本機開發時一律導回 localhost，避免 NEXT_PUBLIC_SITE_URL 指到正式站
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (/^localhost$|^127\.0\.0\.1$/i.test(hostname)) {
      const url = `${origin}${loginReturn}`;
      authLog("Google OAuth redirectTo (localhost)", {
        redirectTo: url,
        hint: "請在 Supabase → Redirect URLs 加入此網址（或 /login*）",
      });
      return url;
    }
  }

  const site =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    getPublicSiteUrl();
  const url = `${site}${loginReturn}`;
  authLog("Google OAuth redirectTo", {
    site,
    path: safe,
    redirectTo: url,
    hint: "此 URL 必須在 Supabase → Authentication → Redirect URLs 白名單內",
  });
  return url;
}

/** 本機點 LINE 前可預期的 callback URL（需與 LINE Console 一致） */
export function getLineCallbackUrl(origin) {
  return `${origin}/api/auth/callback/line`;
}

/** 本機殘留的 Service Worker 會讓 OAuth state cookie 設不到／帶不回 */
export async function clearServiceWorkersForAuth() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    if (window.caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    authLog("已清除 Service Worker / Cache（避免 OAuth state 遺失）", {
      unregistered: regs.length,
    });
  } catch (err) {
    authError("清除 Service Worker 失敗", err);
  }
}

/**
 * 用瀏覽器 form POST 開始 LINE 登入（比 signIn() 的 fetch 更穩）：
 * Set-Cookie(next-auth.state) 會跟著 302 導向 LINE，回來時 cookie 還在。
 */
export async function startLineLoginWithFormPost(callbackUrl) {
  if (typeof window === "undefined") return;

  await clearServiceWorkersForAuth();

  const { getCsrfToken } = await import("next-auth/react");
  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    throw new Error("無法取得 CSRF Token，請重新整理頁面再試");
  }

  authLog("LINE form POST 開始", {
    action: "/api/auth/signin/line",
    callbackUrl,
  });

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/auth/signin/line";
  form.style.display = "none";

  const fields = {
    csrfToken,
    callbackUrl,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
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
