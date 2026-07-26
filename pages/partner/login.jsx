import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabaseClient";
import {
  partnerLoginBlockMessage,
  verifyPartnerAccess,
} from "@/lib/partnerAuth";
import {
  logLineLoginStart,
  startLineLoginWithFormPost,
} from "@/lib/authDebug";

const INPUT_CLASS =
  "w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder:text-blue-300 text-sm outline-none focus:bg-white/20 focus:border-white/60 transition";

function PasswordInput({ value, onChange, show, onToggleShow, autoComplete }) {
  return (
    <div className="relative">
      <input
        required
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder="••••••••"
        autoComplete={autoComplete}
        className={`${INPUT_CLASS} pr-11`}
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? "隱藏密碼" : "顯示密碼"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white transition p-0.5"
      >
        {show ? (
          <EyeSlashIcon className="w-5 h-5" />
        ) : (
          <EyeIcon className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

function FormMessage({ title, children, tone = "default" }) {
  const titleClass =
    tone === "success"
      ? "text-emerald-200"
      : tone === "error"
        ? "text-white"
        : "text-white";
  const bodyClass =
    tone === "success" ? "text-emerald-100/90" : "text-blue-100";

  return (
    <div className="text-sm leading-relaxed space-y-1.5">
      {title && <p className={`font-bold ${titleClass}`}>{title}</p>}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

function ForgotPasswordPanel({ initialEmail, onClose }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [status, setStatus] = useState("idle");
  const [errorCode, setErrorCode] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleReset = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || cooldown > 0) return;

    setStatus("sending");
    setMessage("");
    setErrorCode("");

    try {
      const res = await fetch("/api/partner/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === "RATE_LIMIT") {
          setCooldown(data.retryAfter || 60);
        }
        setStatus("error");
        setErrorCode(data.code || "UNKNOWN");
        setMessage(data.message || "寄送失敗，請稍後再試");
        return;
      }

      setCooldown(60);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorCode("NETWORK");
      setMessage("網路錯誤，請稍後再試");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-xl font-black text-white mb-2">忘記密碼</h2>
      <p className="text-sm text-blue-100 leading-relaxed mb-6">
        請輸入您<strong className="text-white">申請合作夥伴時填寫的 Email</strong>
        ，我們將寄送重設密碼連結。
      </p>

      {status === "success" ? (
        <div className="space-y-4">
          <FormMessage tone="success" title="重設信件已寄出">
            請至 <strong className="text-white">{email.trim()}</strong>{" "}
            查收信件（含垃圾郵件匣），點擊連結即可設定新密碼。
          </FormMessage>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm font-bold text-white underline hover:no-underline"
          >
            返回登入
          </button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-blue-200 mb-1.5 uppercase tracking-wide">
              申請時使用的 Email
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setMessage("");
                  setErrorCode("");
                }
              }}
              placeholder="your@email.com"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-[11px] text-blue-200/80">
              必須與夥伴申請表上驗證過的 Email 相同
            </p>
          </div>

          {status === "error" && message && errorCode !== "RATE_LIMIT" && (
            <FormMessage
              tone="error"
              title={
                errorCode === "NOT_PARTNER_EMAIL"
                  ? "此 Email 沒有申請紀錄"
                  : errorCode === "NO_AUTH_ACCOUNT"
                    ? "尚未建立登入帳號"
                    : "無法寄送重設信"
              }
            >
              <p>{message}</p>
              {errorCode === "NOT_PARTNER_EMAIL" && (
                <p className="text-blue-200/90">
                  若您尚未申請，請先{" "}
                  <Link
                    href="/register-distributor"
                    className="font-bold text-white underline hover:no-underline"
                  >
                    提交夥伴申請
                  </Link>
                  ；若記不清 Email，請聯繫客服協助。
                </p>
              )}
            </FormMessage>
          )}

          {(cooldown > 0 || errorCode === "RATE_LIMIT") && (
            <FormMessage tone="default" title="請稍候再寄送">
              <p>
                {cooldown > 0
                  ? `為避免重複寄信，${cooldown} 秒後可再次申請。若剛才已成功寄出，請先至信箱（含垃圾郵件）查收。`
                  : message}
              </p>
            </FormMessage>
          )}

          <button
            type="submit"
            disabled={status === "sending" || cooldown > 0}
            className="w-full bg-white hover:bg-blue-50 disabled:opacity-60 text-[#1a56db] font-black py-3.5 rounded-full text-sm transition shadow-lg"
          >
            {status === "sending"
              ? "驗證並寄送中..."
              : cooldown > 0
                ? `${cooldown} 秒後可再寄送`
                : "寄送重設密碼連結"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-blue-200 hover:text-white transition"
          >
            ← 返回登入
          </button>
        </form>
      )}
    </div>
  );
}

function PartnerHeroPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center items-end"
      style={{
        backgroundImage:
          "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%), url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80')",
      }}
    >
      <div className="p-12 text-white">
        <p className="text-sm font-bold text-white/70 uppercase tracking-widest mb-2">
          JEKO eSIM Partner
        </p>
        <h2 className="text-3xl font-black leading-snug mb-3">
          零成本開店
          <br />
          即時分潤
        </h2>
        <p className="text-white/80 text-sm leading-relaxed max-w-sm">
          加入 Jeko eSIM 合作夥伴計畫，取得專屬賣場連結，推廣日本、韓國、泰國等多國
          eSIM 方案，每筆成交自動計算分潤。
        </p>
        <div className="mt-6 flex gap-6">
          {[
            { num: "0", label: "開店費用" },
            { num: "20%", label: "預設加價" },
            { num: "∞", label: "分潤上限" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-3xl font-black">{item.num}</p>
              <p className="text-xs text-white/70 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PartnerLogin() {
  const router = useRouter();
  const { status: nextAuthStatus } = useSession();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  const finishPartnerLogin = useCallback(async () => {
    const access = await verifyPartnerAccess();
    if (!access?.ok) {
      await supabase.auth.signOut();
      setError(access?.message || partnerLoginBlockMessage(access?.partner));
      return false;
    }
    router.replace("/partner/dashboard");
    return true;
  }, [router]);

  /** LINE NextAuth → 換成 Supabase session 再開後台 */
  const syncLineToSupabase = useCallback(async () => {
    const res = await fetch("/api/auth/line-supabase-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok || !data.success || !data.tokenHash) {
      throw new Error(data.message || "LINE 帳號同步失敗");
    }
    const { error: otpErr } = await supabase.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: "email",
    });
    if (otpErr) throw otpErr;
    return finishPartnerLogin();
  }, [finishPartnerLogin]);

  useEffect(() => {
    if (router.query.error === "not_partner") {
      setError(
        "此帳號尚未通過合作夥伴審核，或尚未綁定夥伴資格。請用申請時的 Email 登入一次，或重新申請時先用社群登入。",
      );
    }

    let cancelled = false;

    async function checkSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          const access = await verifyPartnerAccess();
          if (access?.ok) {
            router.replace("/partner/dashboard");
            return;
          }
        }

        // 已 LINE 登入但尚無 Supabase session → 嘗試橋接
        if (nextAuthStatus === "authenticated" && !user) {
          setOauthLoading("line");
          try {
            const ok = await syncLineToSupabase();
            if (ok || cancelled) return;
          } catch (err) {
            if (!cancelled) {
              setError(err?.message || "LINE 登入後無法進入夥伴後台");
            }
          } finally {
            if (!cancelled) setOauthLoading("");
          }
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    if (nextAuthStatus === "loading") return;
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [router, nextAuthStatus, syncLineToSupabase]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });

    if (authErr) {
      setError("登入失敗：" + authErr.message);
      setLoading(false);
      return;
    }

    const ok = await finishPartnerLogin();
    if (!ok) setLoading(false);
  };

  const handleOAuth = async (provider) => {
    setError("");
    setOauthLoading(provider);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/partner/login`;
      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });
      if (oauthErr) throw oauthErr;
      if (data?.url) window.location.assign(data.url);
      else throw new Error("未取得授權網址，請確認 Supabase OAuth 設定");
    } catch (err) {
      setError(
        `${provider === "google" ? "Google" : "Facebook"} 登入失敗：${err.message}`,
      );
      setOauthLoading("");
    }
  };

  const handleLineLogin = async () => {
    if (oauthLoading) return;
    setError("");
    setOauthLoading("line");
    try {
      if (typeof window !== "undefined" && window.location.hostname === "127.0.0.1") {
        setError("請改用 http://localhost:3000 再開啟 LINE 登入");
        setOauthLoading("");
        return;
      }
      const { callbackUrl } = await logLineLoginStart(
        window.location.origin,
        "/partner/login",
      );
      await startLineLoginWithFormPost(callbackUrl);
    } catch (err) {
      setError(`LINE 登入異常：${err.message}`);
      setOauthLoading("");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a56db]">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex font-sans">
      <Head>
        <title>合作夥伴登入 | JEKO eSIM</title>
      </Head>

      <div className="w-full lg:w-1/2 bg-[#1a56db] flex flex-col justify-center px-10 md:px-16 py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10 max-w-md mx-auto w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-200 text-sm mb-10 hover:text-white transition"
          >
            ← JEKO eSIM 官網
          </Link>

          {!showForgot && (
            <>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">
                Partner Portal
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
                合作夥伴
                <br />
                管理後台
              </h1>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                請使用「申請合作夥伴時填寫的 Email」與密碼；若該 Email
                綁定 Google／Facebook，或申請時已用 LINE
                登入，也可直接快速登入。
                <span className="block mt-2 text-blue-200/90 text-xs">
                  審核通過前無法進入後台。建議先用社群登入再申請，通過後可一鍵進後台。
                </span>
              </p>
            </>
          )}

          {showForgot ? (
            <ForgotPasswordPanel
              initialEmail={form.email}
              onClose={() => {
                setShowForgot(false);
                setError("");
              }}
            />
          ) : (
            <>
              <div className="flex flex-col gap-2.5 mb-5">
                <button
                  type="button"
                  disabled={!!oauthLoading || loading}
                  onClick={() => handleOAuth("google")}
                  className="flex items-center justify-center gap-2 w-full bg-white/10 border border-white/30 hover:bg-white/20 disabled:opacity-60 py-3 rounded-xl text-sm font-bold text-white transition"
                >
                  {oauthLoading === "google" ? "導向 Google..." : "Google 快速登入"}
                </button>
                <button
                  type="button"
                  disabled={!!oauthLoading || loading}
                  onClick={() => handleOAuth("facebook")}
                  className="flex items-center justify-center gap-2 w-full bg-white/10 border border-white/30 hover:bg-white/20 disabled:opacity-60 py-3 rounded-xl text-sm font-bold text-white transition"
                >
                  {oauthLoading === "facebook"
                    ? "導向 Facebook..."
                    : "Facebook 快速登入"}
                </button>
                <button
                  type="button"
                  disabled={!!oauthLoading || loading}
                  onClick={handleLineLogin}
                  className="flex items-center justify-center gap-2 w-full bg-[#06C755] hover:brightness-105 disabled:opacity-60 py-3 rounded-xl text-sm font-bold text-white transition"
                >
                  {oauthLoading === "line" ? "LINE 登入中..." : "LINE 快速登入"}
                </button>
              </div>

              <div className="relative flex items-center py-1 mb-5">
                <div className="flex-grow border-t border-white/20" />
                <span className="flex-shrink-0 mx-3 text-[10px] text-blue-200/80">
                  或使用 Email
                </span>
                <div className="flex-grow border-t border-white/20" />
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-bold text-blue-200 mb-1.5 uppercase tracking-wide">
                    Email 地址
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-blue-200 uppercase tracking-wide">
                      密碼
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(true);
                        setError("");
                      }}
                      className="text-xs font-bold text-blue-200 hover:text-white transition"
                    >
                      忘記密碼？
                    </button>
                  </div>
                  <PasswordInput
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    show={showPassword}
                    onToggleShow={() => setShowPassword((v) => !v)}
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <p className="text-sm text-blue-100 leading-relaxed">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !!oauthLoading}
                  className="w-full bg-[#4ade80] hover:bg-[#22c55e] disabled:opacity-60 text-slate-900 font-black py-4 rounded-full text-base transition shadow-lg mt-2"
                >
                  {loading ? "登入中..." : "登入夥伴後台 →"}
                </button>
              </form>
            </>
          )}

          {!showForgot && (
            <div className="mt-8 flex flex-col gap-2 text-sm">
              <p className="text-blue-200">
                尚未成為合作夥伴？{" "}
                <Link
                  href="/register-distributor"
                  className="text-white font-bold hover:underline"
                >
                  立即申請
                </Link>
              </p>
              <p className="text-blue-300 text-xs">
                一般會員請至{" "}
                <Link href="/login" className="text-blue-100 hover:underline">
                  會員登入頁
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      <PartnerHeroPanel />
    </div>
  );
}
