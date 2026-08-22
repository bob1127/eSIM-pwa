"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Layout from "./Layout";
import RegisterForm from "../components/RegisterForm";
import ForgotPasswordForm from "../components/ForgotPasswordForm";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../components/context/UserContext";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

import { useSession } from "next-auth/react";
import {
  authLog,
  authError,
  parseNextAuthError,
  logLineLoginStart,
  getOAuthRedirectUrl,
  startLineLoginWithFormPost,
} from "../lib/authDebug";
import {
  sanitizeRedirect,
  peekAuthRedirect,
  rememberAuthRedirect,
} from "../lib/authRedirect";
import {
  markWelcomeGiftPopup,
  WELCOME_GIFT_TRIGGER_ON_LOGIN,
} from "../lib/welcomeGiftPopup";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";

const LoginRegisterPage = () => {
  const router = useRouter();
  const { user: supaUser, isHydrated } = useUser();
  const { status: nextAuthStatus } = useSession();

  const redirectTo = useMemo(() => {
    const fromQuery = router.query.redirect || router.query.callbackUrl || null;
    if (fromQuery) {
      const raw = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
      const safe = sanitizeRedirect(raw, "/account");
      rememberAuthRedirect(safe);
      return safe;
    }
    // 無 query 時用先前記住的原頁；不要預設首頁
    return peekAuthRedirect("/account");
  }, [router.query.redirect, router.query.callbackUrl]);

  const [selected, setSelected] = useState("login");
  const [showForgot, setShowForgot] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // 除錯 log（僅輸出至 Console）
  const addLog = (msg) => {
    console.log(`[Auth Debug]`, msg);
  };

  const isLoggedIn =
    isHydrated && (!!supaUser || nextAuthStatus === "authenticated");

  // 🛠️ 監聽所有底層狀態與網址參數
  useEffect(() => {
    if (typeof window === "undefined") return;

    addLog(`🚩 初始載入網址: ${window.location.href}`);

    // 本機開發：主動清掉可能殘留的 SW，避免 LINE OAuth state cookie 遺失
    if (process.env.NODE_ENV === "development") {
      import("../lib/authDebug").then(({ clearServiceWorkersForAuth }) => {
        clearServiceWorkersForAuth();
      });
    }

    // 捕捉從跳轉回來時，隱藏在網址列的錯誤碼
    const hash = window.location.hash;
    const search = window.location.search;

    if (hash.includes("access_token")) {
      addLog("✅ Google OAuth 回傳 access_token（hash）");
      authLog("Supabase OAuth callback hash", {
        hash: hash.slice(0, 80) + "...",
      });
      // Supabase client 會自動解析 hash；稍後 onAuthStateChange 會觸發 SIGNED_IN
    }

    if (hash.includes("error") || search.includes("error")) {
      const urlParams = new URLSearchParams(hash.replace("#", "?"));
      const searchParams = new URLSearchParams(search);
      const errDesc =
        urlParams.get("error_description") ||
        searchParams.get("error_description") ||
        "未知錯誤";
      const nextAuthErr = parseNextAuthError(search);

      addLog(`❌ 抓到授權錯誤: ${errDesc}`);
      if (nextAuthErr) {
        authLog("NextAuth error query", nextAuthErr);
        addLog(`❌ NextAuth [${nextAuthErr.code}]: ${nextAuthErr.hint}`);
        // URL 若是 error=undefined，代表打到了錯誤的 callback（常見：LINE Console 填成 /api/auth/）
        const isUndefinedError =
          searchParams.get("error") === "undefined" ||
          !searchParams.get("callbackUrl");
        setMessage(
          isUndefinedError && nextAuthErr.code === "OAuthCallback"
            ? `登入失敗：瀏覽器沒帶上 OAuth state cookie（常見原因：本機殘留 Service Worker）。請到 Chrome → 開發人員工具 → Application → Service Workers 按 Unregister，並清除 Cookies 後再試。Callback 設定看起來是對的。`
            : `LINE 登入失敗 [${nextAuthErr.code}]: ${nextAuthErr.hint}`,
        );
      } else {
        setMessage(`第三方登入失敗: ${errDesc}`);
      }
    }

    // 啟動時拉一次 server env 摘要
    fetch("/api/auth/debug-config")
      .then((r) => r.json())
      .then((cfg) => authLog("login 頁載入 — server env", cfg))
      .catch((e) => authError("login 頁無法取得 debug-config", e));

    // 監聽 Supabase 的事件變化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      addLog(`⚡ Supabase 事件觸發: ${event}`);
      if (session) {
        addLog(`✅ 取得 Session! User ID: ${session.user.id}`);
      } else {
        addLog(`⚠️ 目前沒有 Session (未登入)`);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 登入成功後導頁；TEMP：導首頁並彈出新會員 50 禮（核對設計用）
  useEffect(() => {
    if (!isLoggedIn) return;

    if (WELCOME_GIFT_TRIGGER_ON_LOGIN) {
      markWelcomeGiftPopup();
    }

    // TEMP：核對 popup 設計 → 固定回首頁；之後改回 sanitizeRedirect(redirectTo, "/account")
    const dest = WELCOME_GIFT_TRIGGER_ON_LOGIN
      ? "/"
      : sanitizeRedirect(redirectTo, "/account");

    try {
      sessionStorage.removeItem("jeko_auth_redirect");
    } catch {
      /* ignore */
    }
    addLog(`🚀 登入成功，導回 ${dest}`);
    const timer = setTimeout(() => {
      router.replace(dest);
    }, 800);
    return () => clearTimeout(timer);
  }, [isLoggedIn, redirectTo, router]);

  // 一般 Email 登入：透過 /api/auth/login 代理（伺服器端限流，防暴力破解）
  const handleLogin = async (e) => {
    e.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    setMessage("");
    addLog("開始執行 Email 登入...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(
          data.message ||
            (res.status === 429
              ? "登入嘗試過多，請稍候再試"
              : "登入失敗，請檢查帳號密碼"),
        );
      }

      const { access_token, refresh_token } = data.session || {};
      if (!access_token || !refresh_token) {
        throw new Error("登入回應異常，請重新嘗試");
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (setSessionError) throw setSessionError;

      addLog("✅ Email 登入成功！");
    } catch (err) {
      addLog(`❌ 登入錯誤: ${err.message}`);
      setMessage(err.message || "登入失敗，請檢查帳號密碼");
    } finally {
      setLoggingIn(false);
    }
  };

  // Supabase 的 OAuth 登入 (Google)
  const handleOAuthLogin = async (provider) => {
    try {
      addLog(`準備請求 ${provider} 授權...`);
      const redirectUrl = getOAuthRedirectUrl(
        WELCOME_GIFT_TRIGGER_ON_LOGIN ? "/" : redirectTo,
      );
      addLog(`redirectTo: ${redirectUrl}`);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      authLog("signInWithOAuth 回傳", {
        provider,
        url: data?.url,
        error: error?.message,
      });
      if (error) throw error;
      if (data?.url) {
        window.location.assign(data.url);
      } else {
        throw new Error(
          "未取得 Google 授權網址，請確認 Supabase anon key 是否正確",
        );
      }
    } catch (err) {
      addLog(`❌ 跳轉前發生錯誤: ${err.message}`);
      setMessage(`Google 登入失敗: ${err.message}`);
    }
  };

  // LINE 登入：用 form POST（完整導向），避免 fetch 設不到 next-auth.state cookie
  const handleLineLogin = async () => {
    if (loggingIn) return;
    try {
      setLoggingIn(true);
      addLog("🟢 點擊 LINE 登入...");

      if (typeof window !== "undefined") {
        const host = window.location.hostname;
        if (host === "127.0.0.1") {
          setMessage(
            "請改用 http://localhost:3000 開啟再登入 LINE（勿用 127.0.0.1）",
          );
          setLoggingIn(false);
          return;
        }
      }

      const { callbackUrl, serverConfig } = await logLineLoginStart(
        window.location.origin,
        WELCOME_GIFT_TRIGGER_ON_LOGIN ? "/" : redirectTo,
      );
      addLog(`callbackUrl: ${callbackUrl}`);
      if (serverConfig?.expectedLineCallback) {
        addLog(
          `伺服器推算 LINE callback: ${serverConfig.expectedLineCallback}`,
        );
      }

      await startLineLoginWithFormPost(callbackUrl);
    } catch (err) {
      authError("handleLineLogin 例外", err);
      addLog(`❌ ${err.message}`);
      setMessage(`LINE 登入異常: ${err.message}`);
      setLoggingIn(false);
    }
  };

  // 🛠️ 強制清除快取功能
  const clearAuthCache = async () => {
    addLog("🧹 正在清除本地快取與登出...");
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    addLog("✅ 清除完畢，請重新整理網頁！");
  };

  return (
    <Layout>
      <div className="flex bg-[#1C82E0] flex-col items-center justify-center px-4 min-h-screen pt-10 pb-12 relative overflow-hidden">
        <div className="w-full max-w-md mx-auto text-white relative z-10">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-wide">會員登入</h1>
          </div>

          {!isLoggedIn ? (
            <div>
              <div className="flex justify-around mb-6 border-b border-white/20">
                <button
                  type="button"
                  onClick={() => {
                    setSelected("login");
                    setShowForgot(false);
                    setMessage("");
                  }}
                  className={`pb-3 text-sm font-semibold tracking-widest transition-all ${
                    selected === "login"
                      ? "text-white border-b-2 border-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  登入
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected("register");
                    setShowForgot(false);
                    setMessage("");
                  }}
                  className={`pb-3 text-sm font-semibold tracking-widest transition-all ${
                    selected === "register"
                      ? "text-white border-b-2 border-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  註冊
                </button>
              </div>

              {selected === "login" && successMessage && (
                <div className="mb-4 bg-emerald-500/20 border border-emerald-400/50 text-emerald-100 p-3 rounded text-sm font-bold text-center">
                  {successMessage}
                </div>
              )}

              {selected === "login" ? (
                !showForgot ? (
                  <>
                    {message && (
                      <div className="mb-4 bg-red-500/20 border border-red-500 text-red-100 p-3 rounded text-sm font-bold text-center">
                        {message}
                      </div>
                    )}

                    <form
                      onSubmit={handleLogin}
                      className="flex flex-col gap-5 mb-4"
                    >
                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-white/70">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          placeholder="請輸入 Email"
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                          className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-white/70">
                          密碼
                        </label>
                        <input
                          type="password"
                          name="password"
                          placeholder="請輸入密碼"
                          value={form.password}
                          onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                          }
                          className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loggingIn}
                        className={`mt-2 w-full rounded-full py-2.5 text-sm font-semibold tracking-wide shadow-sm transition ${
                          loggingIn
                            ? "bg-white/40 text-[#1C82E0] cursor-not-allowed"
                            : "bg-white/95 text-[#1C82E0] hover:bg-white"
                        }`}
                      >
                        {loggingIn ? (
                          <LoadingIndicator
                            layout="inline"
                            size="xs"
                            label="處理中..."
                            labelClassName="text-sm font-semibold text-[#1C82E0]"
                            spinnerClassName="text-[#1C82E0]"
                          />
                        ) : (
                          "登入"
                        )}
                      </button>
                    </form>

                    <div className="mb-6 text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-sm text-white/80 hover:text-white underline"
                      >
                        忘記密碼？
                      </button>
                    </div>

                    <div className="relative flex items-center py-2 mb-4">
                      <div className="flex-grow border-t border-white/20"></div>
                      <span className="flex-shrink-0 mx-4 text-[10px] text-white/60">
                        使用快速登入
                      </span>
                      <div className="flex-grow border-t border-white/20"></div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => handleOAuthLogin("google")}
                        className="flex justify-center items-center gap-2 bg-white/10 border border-white/30 py-2.5 rounded text-sm font-bold"
                      >
                        Google 登入
                      </button>

                      <button
                        type="button"
                        onClick={handleLineLogin}
                        className="flex items-center justify-center gap-2.5 w-full rounded-full bg-[#06C755] border border-transparent py-2.5 text-[13px] font-semibold text-white tracking-wide transition hover:brightness-105 shadow-sm"
                      >
                        <LineIconSvg className="w-5 h-5" />
                        LINE
                      </button>
                    </div>
                  </>
                ) : (
                  <ForgotPasswordForm onClose={() => setShowForgot(false)} />
                )
              ) : (
                <RegisterForm
                  redirectTo={redirectTo}
                  onSuccess={(msg) => {
                    setSelected("login");
                    setSuccessMessage(
                      msg || "註冊成功！請使用 Email 與密碼登入。",
                    );
                    setShowForgot(false);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-bold">登入成功！</h2>
              <p className="mt-2 text-sm text-emerald-300">
                正在導向會員中心...
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LoginRegisterPage;
