"use client";

import { ensureLiffIdToken, initLiff } from "@/lib/liffClient";

export const LINE_WELCOME_VERIFY_PENDING_KEY = "jeko_line_welcome_verify_pending";

function isLocalDevHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/** 是否為新會員 welcome 個人碼 */
export function isWelcomeCouponCode(code) {
  return /^JEKO-WELCOME-(30|50)-[A-F0-9]{6}$/i.test(String(code || "").trim());
}

/**
 * 取得 LINE ID Token（LIFF 或本機 OAuth），供訪客套用 welcome 券
 * @returns {Promise<{ ok: true, idToken: string } | { ok: false, pending?: boolean, error?: string }>}
 */
export async function getLineIdTokenForWelcomeCheckout() {
  if (typeof window === "undefined") {
    return { ok: false, error: "ssr" };
  }

  const init = await initLiff();
  if (init.ok && init.inClient && init.liff) {
    const tokenResult = await ensureLiffIdToken();
    if (tokenResult.ok && tokenResult.token) {
      return { ok: true, idToken: tokenResult.token, via: "liff" };
    }
    if (tokenResult.pending) {
      return { ok: false, pending: true };
    }
  }

  if (isLocalDevHost(window.location.hostname)) {
    try {
      sessionStorage.setItem(LINE_WELCOME_VERIFY_PENDING_KEY, "1");
    } catch {
      /* ignore */
    }
    const returnTo = `${window.location.pathname}${window.location.search || ""}`;
    try {
      const prep = await fetch("/api/line/welcome-verify-prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ returnTo }),
      });
      const data = await prep.json().catch(() => ({}));
      if (!prep.ok || !data.authorizeUrl) {
        return {
          ok: false,
          error: data.error || `prepare_http_${prep.status}`,
        };
      }
      window.location.href = data.authorizeUrl;
      return { ok: false, pending: true };
    } catch (e) {
      return { ok: false, error: e?.message || "prepare_failed" };
    }
  }

  // 正式站非 LINE App：OAuth 導向
  try {
    sessionStorage.setItem(LINE_WELCOME_VERIFY_PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
  const returnTo = `${window.location.pathname}${window.location.search || ""}`;
  try {
    const prep = await fetch("/api/line/welcome-verify-prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ returnTo }),
    });
    const data = await prep.json().catch(() => ({}));
    if (!prep.ok || !data.authorizeUrl) {
      return { ok: false, error: data.error || `prepare_http_${prep.status}` };
    }
    window.location.href = data.authorizeUrl;
    return { ok: false, pending: true };
  } catch (e) {
    return { ok: false, error: e?.message || "prepare_failed" };
  }
}

export function consumeWelcomeVerifyPendingFlag() {
  if (typeof window === "undefined") return false;
  try {
    const v = sessionStorage.getItem(LINE_WELCOME_VERIFY_PENDING_KEY);
    if (v) sessionStorage.removeItem(LINE_WELCOME_VERIFY_PENDING_KEY);
    return Boolean(v);
  } catch {
    return false;
  }
}
