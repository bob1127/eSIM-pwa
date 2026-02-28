"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "./Layout";
import RegisterForm from "../components/RegisterForm";
import ForgotPasswordForm from "../components/ForgotPasswordForm";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../components/context/UserContext";

// 🚀 1. 引入 NextAuth 引擎
import { useSession, signIn, signOut } from "next-auth/react";

const LoginRegisterPage = () => {
  const router = useRouter();

  // 🚀 2. 啟動雙引擎狀態監聽
  const { data: session, status: navStatus } = useSession(); // NextAuth (負責 LINE)
  const { user: supaUser, logout: supaLogout, isHydrated } = useUser(); // Supabase (負責 Email, Google, FB)

  const [selected, setSelected] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // 🚀 3. 雙引擎合併邏輯：任一邊登入就算登入
  const isLoggedIn =
    navStatus === "authenticated" || (isHydrated && !!supaUser);
  const displayName =
    session?.user?.name || supaUser?.user_metadata?.full_name || "會員";
  const displayEmail = session?.user?.email || supaUser?.email;

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // 信箱密碼登入 (Supabase 引擎)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    setMessage("登入中...");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      if (data?.user) {
        setMessage("登入成功！正在前往會員中心...");
        setTimeout(() => router.push("/account"), 500);
      }
    } catch (err) {
      console.error("Login error:", err.message);
      if (err.message === "Invalid login credentials") {
        setMessage("帳號或密碼錯誤");
      } else if (err.message.includes("Email not confirmed")) {
        setMessage("請先前往信箱點擊驗證連結，才能正式登入喔！");
      } else {
        setMessage("登入失敗，請稍後再試");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  // OAuth 快速登入 (Supabase 引擎)
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
      alert("快速登入發生錯誤：" + err.message);
    }
  };

  // 🚀 4. 統一登出邏輯 (同時關閉兩顆引擎)
  const handleUniversalLogout = async () => {
    await signOut({ redirect: false }); // 關閉 NextAuth
    if (supaLogout) await supaLogout(); // 關閉 Supabase
    router.push("/login");
  };

  return (
    <Layout>
      <div className="flex bg-[#1C82E0] flex-col items-center justify-center px-4 min-h-screen pt-[100px] pb-12">
        <div className="w-full max-w-md mx-auto text-white">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-wide">
              會員登入 / 註冊
            </h1>
            <p className="mt-1 text-sm text-white/70">
              使用同一組帳號管理您的 eSIM 訂單與 QR Code
            </p>
          </div>

          {/* 🚀 5. 使用合併後的 isLoggedIn 來判斷顯示畫面 */}
          {!isLoggedIn ? (
            <div>
              <div className="flex justify-around mb-6 border-b border-white/30">
                <button
                  onClick={() => {
                    setSelected("login");
                    setShowForgot(false);
                  }}
                  className={`pb-2 text-sm font-semibold tracking-wide transition-colors ${
                    selected === "login"
                      ? "text-white border-b-2 border-white"
                      : "text-white/60 hover:text-white/90"
                  }`}
                >
                  登入
                </button>
                <button
                  onClick={() => {
                    setSelected("sign-up");
                    setShowForgot(false);
                  }}
                  className={`pb-2 text-sm font-semibold tracking-wide transition-colors ${
                    selected === "sign-up"
                      ? "text-white border-b-2 border-white"
                      : "text-white/60 hover:text-white/90"
                  }`}
                >
                  註冊
                </button>
              </div>

              {selected === "login" && successMessage && (
                <div className="mb-4 rounded-md bg-emerald-500/20 px-3 py-2 text-center text-xs text-emerald-50">
                  {successMessage}
                </div>
              )}

              {selected === "login" ? (
                !showForgot ? (
                  <>
                    <form
                      onSubmit={handleLogin}
                      className="flex flex-col gap-5"
                    >
                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-white/70">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-0"
                          required
                          placeholder="請輸入 Email"
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
                            setForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-0"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loggingIn}
                        className={`mt-2 w-full rounded-full bg-white/95 py-2.5 text-sm font-semibold text-[#1C82E0] tracking-wide shadow-sm transition hover:bg-white ${
                          loggingIn ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      >
                        {loggingIn ? "登入中…" : "登入"}
                      </button>
                    </form>

                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs text-white/80 underline underline-offset-4 hover:text-white"
                      >
                        忘記密碼？
                      </button>
                    </div>

                    {message && (
                      <p className="mt-3 text-center text-xs text-red-100">
                        {message}
                      </p>
                    )}

                    {/* OAuth 第三方登入區塊 */}
                    <div className="mt-8">
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/20"></div>
                        <span className="flex-shrink-0 mx-4 text-[10px] text-white/60 uppercase tracking-widest">
                          使用快速登入
                        </span>
                        <div className="flex-grow border-t border-white/20"></div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 🚀 LINE 登入 (交給 NextAuth) */}
                        <button
                          type="button"
                          onClick={() =>
                            signIn("line", { callbackUrl: "/account" })
                          }
                          className="flex items-center justify-center gap-2.5 w-full rounded-full bg-[#06C755] border border-transparent py-2.5 text-[13px] font-semibold text-white tracking-wide transition hover:brightness-105 shadow-sm"
                        >
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.122.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-4.137 2.572-5.992zM7.421 11.96H5.216V7.525a.43.43 0 00-.428-.428h-.86a.43.43 0 00-.428.428v5.295c0 .235.192.428.428.428h3.493a.43.43 0 00.428-.428v-.86a.43.43 0 00-.428-.428zm3.23-4.435v4.435a.43.43 0 01-.428.428h-.86a.43.43 0 01-.428-.428V7.525a.43.43 0 01.428-.428h.86a.43.43 0 01.428.428zm6.541 2.871c0 .235-.192.428-.428.428h-1.963v1.136h1.963a.43.43 0 01.428.428v.86a.43.43 0 01-.428.428h-3.252a.43.43 0 01-.428-.428V7.525a.43.43 0 01.428-.428h3.252a.43.43 0 01.428.428v.86a.43.43 0 01-.428.428h-1.963v1.144h1.963a.43.43 0 01.428.428v.86zm3.321-2.871l-2.063 2.924V7.525a.43.43 0 00-.428-.428h-.86a.43.43 0 00-.428.428v5.295c0 .235.192.428.428.428h.86a.43.43 0 00.35-.183l2.141-3.033v3.216a.43.43 0 00.428.428h.86a.43.43 0 00.428-.428V7.525a.43.43 0 00-.428-.428h-.86a.43.43 0 00-.428.428z" />
                          </svg>
                          LINE
                        </button>

                        {/* 🍎 Apple 登入 (交給 Supabase) */}
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

                        {/* 🌐 Google 登入 (交給 Supabase) */}
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

                        {/* 📘 Facebook 登入 (交給 Supabase) */}
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
                  </>
                ) : (
                  <ForgotPasswordForm onClose={() => setShowForgot(false)} />
                )
              ) : (
                <RegisterForm
                  onSuccess={(msg) => {
                    setSelected("login");
                    setSuccessMessage(msg);
                    setShowForgot(false);
                  }}
                />
              )}
            </div>
          ) : (
            // 🚀 6. 已登入狀態的 UI (顯示合併後的資料)
            <div className="text-center space-y-4">
              <div>
                <h2 className="text-xl font-semibold">已登入：{displayName}</h2>
                <p className="mt-1 text-xs text-white/70">
                  您目前已透過 {displayEmail} 登入
                </p>
              </div>

              <button
                onClick={() => router.push("/account")}
                className="w-full rounded-full bg-white/95 py-2.5 text-sm font-semibold text-[#1C82E0] tracking-wide shadow-sm transition hover:bg-white"
              >
                前往會員中心
              </button>

              <button
                onClick={handleUniversalLogout}
                className="w-full rounded-full border border-white/70 py-2.5 text-sm font-semibold text-white tracking-wide transition hover:bg-white/10"
              >
                登出帳號
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LoginRegisterPage;
