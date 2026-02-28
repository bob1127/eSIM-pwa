"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
// 🚀 關鍵引入：匯入 NextAuth 的 signIn 函數
import { signIn } from "next-auth/react";

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

  /* ====== 3. 傳統信箱註冊 (Supabase Auth) ====== */
  const handleRegister = async (e) => {
    e.preventDefault();
    if (registering) return;
    if (!isCodeVerified) return setMessage("請先完成 Email 驗證");
    if (form.password.length < 6) return setMessage("密碼長度至少需 6 位");

    setRegistering(true);
    setMessage("建立帳號中...");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.username, phone: "" },
        },
      });

      if (error) throw error;

      if (data.user) {
        setShowSuccessPopup(true);
        setMessage("");
        onSuccess?.("註冊成功！請直接登入");
        setTimeout(() => setShowSuccessPopup(false), 3000);
      }
    } catch (err) {
      console.error("Register Error:", err.message);
      setMessage(err.message || "註冊失敗");
    } finally {
      setRegistering(false);
    }
  };

  /* ====== 🚀 4. 社群快速註冊/登入 (Google, FB, Apple - 維持 Supabase) ====== */
  const handleOAuthLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/account`,
        },
      });
      if (error) throw error;
    } catch (err) {
      alert("快速註冊發生錯誤：" + err.message);
    }
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
            className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white focus:outline-none focus:ring-0"
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
              className="flex-1 bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white focus:outline-none focus:ring-0"
              placeholder="請輸入 Email"
            />
            <button
              type="button"
              onClick={() => sendCode("new")}
              disabled={sending || cooldown > 0}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition ${sending || cooldown > 0 ? "bg-white/30 text-white/70" : "bg-white/95 text-[#1C82E0] hover:bg-white"}`}
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
                className="flex-1 bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white focus:outline-none focus:ring-0"
                placeholder="輸入驗證碼"
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verifying || isCodeVerified}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition ${verifying || isCodeVerified ? "bg-emerald-500 text-white" : "bg-white/95 text-[#1C82E0]"}`}
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
            className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white focus:outline-none focus:ring-0"
            placeholder="請輸入密碼 (至少 6 位)"
          />
        </div>

        <button
          type="submit"
          disabled={registering || !isCodeVerified}
          className={`mt-2 w-full rounded-full py-2.5 text-sm font-semibold tracking-wide shadow-sm transition ${registering || !isCodeVerified ? "bg-white/40 text-[#1C82E0] cursor-not-allowed" : "bg-white/95 text-[#1C82E0] hover:bg-white"}`}
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

        {/* 2x2 Grid Layout */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 🌟 修改點：將 LINE 的點擊事件替換為 NextAuth 的 signIn */}
          <button
            type="button"
            onClick={() => signIn("line", { callbackUrl: "/account" })}
            className="flex items-center justify-center gap-2.5 w-full rounded-full bg-[#06C755] border border-transparent py-2.5 text-[13px] font-semibold text-white tracking-wide transition hover:brightness-105 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.122.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-4.137 2.572-5.992zM7.421 11.96H5.216V7.525a.43.43 0 00-.428-.428h-.86a.43.43 0 00-.428.428v5.295c0 .235.192.428.428.428h3.493a.43.43 0 00.428-.428v-.86a.43.43 0 00-.428-.428zm3.23-4.435v4.435a.43.43 0 01-.428.428h-.86a.43.43 0 01-.428-.428V7.525a.43.43 0 01.428-.428h.86a.43.43 0 01.428.428zm6.541 2.871c0 .235-.192.428-.428.428h-1.963v1.136h1.963a.43.43 0 01.428.428v.86a.43.43 0 01-.428.428h-3.252a.43.43 0 01-.428-.428V7.525a.43.43 0 01.428-.428h3.252a.43.43 0 01.428.428v.86a.43.43 0 01-.428.428h-1.963v1.144h1.963a.43.43 0 01.428.428v.86zm3.321-2.871l-2.063 2.924V7.525a.43.43 0 00-.428-.428h-.86a.43.43 0 00-.428.428v5.295c0 .235.192.428.428.428h.86a.43.43 0 00.35-.183l2.141-3.033v3.216a.43.43 0 00.428.428h.86a.43.43 0 00.428-.428V7.525a.43.43 0 00-.428-.428h-.86a.43.43 0 00-.428.428z" />
            </svg>
            LINE
          </button>

          {/* Apple */}
          <button
            type="button"
            onClick={() => handleOAuthLogin("apple")}
            className="flex items-center justify-center gap-2.5 w-full rounded-full bg-black border border-black py-2.5 text-[13px] font-semibold text-white tracking-wide transition hover:bg-neutral-800 shadow-sm"
          >
            <svg
              className="w-5 h-5 mb-0.5"
              viewBox="0 0 384 512"
              fill="currentColor"
            >
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            Apple
          </button>

          {/* Google */}
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

          {/* Facebook */}
          <button
            type="button"
            onClick={() => handleOAuthLogin("facebook")}
            className="flex items-center justify-center gap-2.5 w-full rounded-full bg-[#1877F2]/90 border border-transparent py-2.5 text-[13px] font-semibold text-white tracking-wide transition hover:bg-[#1877F2]"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
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
