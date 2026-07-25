const AUTH_REDIRECT_KEY = "jeko_auth_redirect";

/** 登入後安全導回路徑（僅允許站內相對路徑） */
export function sanitizeRedirect(path, fallback = "/account") {
  if (!path || typeof path !== "string") return fallback;
  let trimmed = path.trim();
  try {
    trimmed = decodeURIComponent(trimmed);
  } catch {
    /* keep raw */
  }
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  // 避免導回登入頁本身造成迴圈
  if (trimmed === "/login" || trimmed.startsWith("/login?") || trimmed.startsWith("/login/")) {
    return fallback;
  }
  return trimmed;
}

/** 目前瀏覽路徑（含 query），供登入後返回 */
export function getCurrentReturnPath(fallback = "/account") {
  if (typeof window === "undefined") return fallback;
  const path = `${window.location.pathname || "/"}${window.location.search || ""}`;
  return sanitizeRedirect(path, fallback);
}

export function rememberAuthRedirect(path) {
  if (typeof window === "undefined") return;
  const safe = sanitizeRedirect(path, null);
  if (!safe) return;
  try {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, safe);
  } catch {
    /* private mode */
  }
}

/** 讀取並清除記住的返回路徑 */
export function consumeAuthRedirect(fallback = "/account") {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(AUTH_REDIRECT_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
    return sanitizeRedirect(raw, fallback);
  } catch {
    return fallback;
  }
}

export function peekAuthRedirect(fallback = "/account") {
  if (typeof window === "undefined") return fallback;
  try {
    return sanitizeRedirect(sessionStorage.getItem(AUTH_REDIRECT_KEY), fallback);
  } catch {
    return fallback;
  }
}

/**
 * 帶 redirect 的登入頁 URL。
 * 未傳路徑時，瀏覽器端自動使用目前頁面（登入後維持原頁）。
 */
export function buildLoginUrl(redirectPath, fallback = "/account") {
  const raw =
    redirectPath != null && redirectPath !== ""
      ? redirectPath
      : typeof window !== "undefined"
        ? getCurrentReturnPath(fallback)
        : fallback;
  const safe = sanitizeRedirect(raw, fallback);
  rememberAuthRedirect(safe);
  return `/login?redirect=${encodeURIComponent(safe)}`;
}
