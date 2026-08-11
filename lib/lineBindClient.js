"use client";

import { initLiff } from "@/lib/liffClient";

export const LINE_BIND_PENDING_KEY = "jeko_line_bind_pending";

function isLocalDevHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * 綁定 LINE 帳號到目前登入的會員（Google／FB／Email 皆可）。
 *
 * - 本機 localhost：POST /api/line/bind-prepare（帶 Bearer）→ LINE OAuth
 *   → /api/line/bind-callback（讀簽章 cookie 還原會員）→ 回到本機頁面
 * - LINE App 內／正式站：走 LIFF，取得 ID Token 後 POST /api/line/bind
 */
export async function bindLineAccount({ accessToken } = {}) {
  if (typeof window === "undefined") {
    return { ok: false, error: "ssr" };
  }

  // 本機開發：不走 LIFF（Endpoint 是正式站，授權後會跳走）
  if (isLocalDevHost(window.location.hostname)) {
    try {
      sessionStorage.setItem(LINE_BIND_PENDING_KEY, "1");
    } catch {
      /* ignore */
    }

    const returnTo = `${window.location.pathname}${window.location.search || ""}`;
    try {
      const headers = { "Content-Type": "application/json" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const prep = await fetch("/api/line/bind-prepare", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ returnTo }),
      });
      const data = await prep.json().catch(() => ({}));

      if (!prep.ok || !data.authorizeUrl) {
        return {
          ok: false,
          error: data.error || `prepare_http_${prep.status}`,
          needLogin: !!data.needLogin,
        };
      }

      window.location.href = data.authorizeUrl;
      return { ok: false, pending: true };
    } catch (e) {
      return { ok: false, error: e?.message || "prepare_failed" };
    }
  }

  const initResult = await initLiff();
  if (!initResult.ok) {
    return {
      ok: false,
      error: initResult.error || "liff_init_failed",
    };
  }

  const { liff } = initResult;

  if (!liff.isLoggedIn()) {
    try {
      sessionStorage.setItem(LINE_BIND_PENDING_KEY, "1");
    } catch {
      /* ignore */
    }
    const redirectUri = window.location.href;
    try {
      liff.login({ redirectUri });
    } catch {
      liff.login();
    }
    return { ok: false, pending: true };
  }

  let idToken = null;
  try {
    idToken = liff.getIDToken();
  } catch (e) {
    return { ok: false, error: e?.message || "get_id_token_failed" };
  }

  if (!idToken) {
    return { ok: false, error: "no_id_token" };
  }

  try {
    const headers = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const res = await fetch("/api/line/bind", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        ok: false,
        error: data.error || `http_${res.status}`,
        code: data.code,
        needLogin: !!data.needLogin,
      };
    }

    return {
      ok: true,
      alreadyLinked: !!data.already_linked,
      lineUserId: data.line_user_id,
      isFriend: !!data.is_friend,
      lineOaUrl: data.line_oa_url,
    };
  } catch (e) {
    return { ok: false, error: e?.message || "network_error" };
  }
}
