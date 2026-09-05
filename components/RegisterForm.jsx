"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  authLog,
  logLineLoginStart,
  getOAuthRedirectUrl,
  startLineLoginWithFormPost,
} from "../lib/authDebug";
import { markJustRegistered } from "../lib/authRedirect";
import { markWelcomeGiftPopup } from "../lib/welcomeGiftPopup";
import { validatePassword, PASSWORD_HINT } from "../lib/passwordPolicy";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { clientError } from "@/lib/clientLogger";

const RESEND_WAIT_SECONDS = 60;

const RegisterForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    code: "",
  });

  const [message, setMessage] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);

  // 狀態控制
  const [cooldown, setCooldown] = useState(0);
  const [resendWait, setResendWait] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    let t;
    if (cooldown > 0) t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    let t;
    if (resendWait > 0) t = setTimeout(() => setResendWait((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendWait]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ====== 1. 發送驗證碼 (呼叫原本的 API) ====== */
  const sendCode = async (action = "new") => {
    if (sending || cooldown > 0) return;
    if (!form.email) return setMessage("請先輸入 Email");

    setSending(true);
    setMessage("");
    try {
      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, action }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessage(action === "resend" ? "已重新寄送驗證碼" : "驗證碼已寄出");
        setIsCodeSent(true);
        setIsCodeVerified(false);
        setCooldown(data.cooldown ?? 10);
        setResendWait(RESEND_WAIT_SECONDS);
      } else {
        setMessage(data.message || "驗證碼寄送失敗");
      }
    } catch (err) {
      setMessage("錯誤：" + err.message);
    } finally {
      setSending(false);
    }
  };

  /* ====== 2. 驗證驗證碼 (呼叫原本的 API) ====== */
  const handleVerifyCode = async () => {
    if (verifying) return;
    if (!form.email || !form.code) return setMessage("請輸入 Email 與驗證碼");

    setVerifying(true);
    setMessage("");
    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code: form.code }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("✅ 驗證成功，請設定密碼完成註冊");
        setIsCodeVerified(true);
      } else {
        setMessage(data.message || "驗證碼錯誤或已過期");
      }
    } catch (err) {
      setMessage("錯誤：" + err.message);
    } finally {
      setVerifying(false);
    }
  };

  /* ====== 3. 傳統信箱註冊（伺服器端建立帳號，避免前端繞過 Email 驗證） ====== */
  const handleRegister = async (e) => {
    e.preventDefault();
    if (registering) return;
    if (!isCodeVerified) return setMessage("請先完成 Email 驗證");
    const passwordError = validatePassword(form.password);
    if (passwordError) return setMessage(passwordError);

    setRegistering(true);
    setMessage("建立帳號中...");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.username,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || "註冊失敗");
      }

      setShowSuccessPopup(true);
      setMessage("");
      markJustRegistered();
      markWelcomeGiftPopup();
      onSuccess?.("註冊成功！請使用 Email 與密碼登入，將導向會員中心。");
      setTimeout(() => setShowSuccessPopup(false), 3000);
    } catch (err) {
      clientError("Register Error:", err.message);
      setMessage(err.message || "註冊失敗");
    } finally {
      setRegistering(false);
    }
  };

  // 註冊分頁的社群登入：完成後進會員中心（首次註冊）
  const registerDest = "/account";

  /* ====== 4. 社群快速註冊 (Google - Supabase OAuth) ====== */
  const handleOAuthLogin = async (provider) => {
    try {
      markJustRegistered();
      markWelcomeGiftPopup();
      const redirectToUrl = getOAuthRedirectUrl(registerDest);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: redirectToUrl },
      });
      if (error) throw error;
    } catch (err) {
      alert("快速註冊發生錯誤：" + err.message);
    }
  };

  /* ====== LINE 快速登入 (NextAuth) ====== */
  const handleLineLogin = async () => {
    authLog("RegisterForm LINE 登入開始");
    if (typeof window !== "undefined" && window.location.hostname === "127.0.0.1") {
      alert("請改用 http://localhost:3000 再開啟 LINE 登入");
      return;
    }
    markJustRegistered();
    markWelcomeGiftPopup();
    const { callbackUrl } = await logLineLoginStart(
      window.location.origin,
      registerDest,
    );
    await startLineLoginWithFormPost(callbackUrl);
  };

  return (
    <div className="relative text-white">
      {showSuccessPopup && (
        <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm">
          註冊成功！
        </div>
      )}

      {/* 傳統註冊表單 */}
      <form onSubmit={handleRegister} className="flex flex-col gap-5">
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-white/70">
            顯示姓名
          </label>
          <input
            required
            name="username"
            value={form.username}
            onChange={handleChange}
            className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
            placeholder="請輸入姓名"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-white/70">
            Email
          </label>
          <div className="mt-1 flex gap-2">
            <input
              required
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="flex-1 bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
              placeholder="請輸入 Email"
            />
            <button
              type="button"
              onClick={() => sendCode("new")}
              disabled={sending || cooldown > 0}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition ${sending || cooldown > 0 ? "bg-white/30 text-white/70" : "bg-white/95 text-[#1566B5] hover:bg-white"}`}
            >
              {sending
                ? "寄送中..."
                : cooldown > 0
                  ? `請稍候 ${cooldown}s`
                  : "發送驗證碼"}
            </button>
          </div>
        </div>

        {isCodeSent && (
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-white/70">
              驗證碼
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                name="code"
                value={form.code}
                onChange={handleChange}
                className="flex-1 bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
                placeholder="輸入驗證碼"
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verifying || isCodeVerified}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition ${verifying || isCodeVerified ? "bg-emerald-500 text-white" : "bg-white/95 text-[#1566B5]"}`}
              >
                {verifying
                  ? "驗證中..."
                  : isCodeVerified
                    ? "✅ 已驗證"
                    : "驗證"}
              </button>
            </div>
            {resendWait === 0 && !isCodeVerified && (
              <button
                type="button"
                onClick={() => sendCode("resend")}
                className="mt-2 text-[10px] text-white/60 underline"
              >
                沒收到？重新寄送
              </button>
            )}
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-white/70">
            設定密碼
          </label>
          <input
            required
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
            placeholder={`請輸入密碼 (${PASSWORD_HINT})`}
          />
        </div>

        <button
          type="submit"
          disabled={registering || !isCodeVerified}
          className={`mt-2 w-full rounded-full py-2.5 text-sm font-semibold tracking-wide shadow-sm transition ${registering || !isCodeVerified ? "bg-white/40 text-[#1566B5] cursor-not-allowed" : "bg-white/95 text-[#1566B5] hover:bg-white"}`}
        >
          {registering ? "註冊中..." : "立即註冊"}
        </button>
      </form>

      {/* 🚀 OAuth 第三方登入區塊 (網格設計) */}
      <div className="mt-8">
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/20"></div>
          <span className="flex-shrink-0 mx-4 text-[10px] text-white/60 uppercase tracking-widest">
            使用快速註冊
          </span>
          <div className="flex-grow border-t border-white/20"></div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleLineLogin}
            className="flex items-center justify-center gap-2.5 w-full rounded-full bg-[#067A38] border border-transparent py-2.5 text-[13px] font-semibold text-white tracking-wide transition hover:brightness-105 shadow-sm"
          >
            <LineIconSvg className="w-5 h-5" />
            LINE
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            className="flex items-center justify-center gap-2.5 w-full rounded-full bg-white/10 border border-white/30 py-2.5 text-[13px] font-semibold text-white tracking-wide transition hover:bg-white/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
        </div>
      </div>
      {message && (
        <p className="mt-3 text-center text-xs text-amber-100">{message}</p>
      )}
    </div>
  );
};

export default RegisterForm;
