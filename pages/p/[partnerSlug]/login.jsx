import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { fetchActiveStoreByDomain } from "@/lib/partnerStorefront";
import { validatePassword, PASSWORD_HINT } from "@/lib/passwordPolicy";
import { useSession, signIn, signOut } from "next-auth/react";
import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { QuarterRing } from "@/components/ui/QuarterRing";

const RESEND_WAIT_SECONDS = 60;

// ==========================================
// 內部子元件：註冊表單 (整合進同一頁)
// ==========================================
const RegisterForm = ({ onSuccess, storeDomain }) => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    code: "",
  });
  const [message, setMessage] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
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

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

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
      } else setMessage(data.message || "驗證碼寄送失敗");
    } catch (err) {
      setMessage("錯誤：" + err.message);
    } finally {
      setSending(false);
    }
  };

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
      } else setMessage(data.message || "驗證碼錯誤或已過期");
    } catch (err) {
      setMessage("錯誤：" + err.message);
    } finally {
      setVerifying(false);
    }
  };

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
      setMessage("");
      onSuccess?.("註冊成功！請直接登入");
    } catch (err) {
      setMessage(err.message || "註冊失敗");
    } finally {
      setRegistering(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/p/${storeDomain}/account`,
        },
      });
      if (error) throw error;
    } catch (err) {
      alert("快速註冊發生錯誤：" + err.message);
    }
  };

  return (
    <div className="relative text-white">
      <form onSubmit={handleRegister} className="flex flex-col gap-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-blue-200">
            顯示姓名
          </label>
          <input
            required
            name="username"
            value={form.username}
            onChange={handleChange}
            className="mt-1 block w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:bg-white/20 transition-all placeholder:text-white/40"
            placeholder="請輸入姓名"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-blue-200">
            Email
          </label>
          <div className="mt-1 flex gap-2">
            <input
              required
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:bg-white/20 transition-all placeholder:text-white/40"
              placeholder="請輸入 Email"
            />
            <button
              type="button"
              onClick={() => sendCode("new")}
              disabled={sending || cooldown > 0}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition ${sending || cooldown > 0 ? "bg-white/20 text-white/50 cursor-not-allowed" : "bg-white text-[#1e3a8a] hover:bg-gray-100"}`}
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
            <label className="text-xs font-bold uppercase tracking-widest text-blue-200">
              驗證碼
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                name="code"
                value={form.code}
                onChange={handleChange}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:bg-white/20 transition-all placeholder:text-white/40"
                placeholder="輸入驗證碼"
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verifying || isCodeVerified}
                className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition ${verifying || isCodeVerified ? "bg-emerald-500 text-white" : "bg-white text-[#1e3a8a] hover:bg-gray-100"}`}
              >
                {verifying
                  ? "驗證中..."
                  : isCodeVerified
                    ? "✅ 已驗證"
                    : "驗證"}
              </button>
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-blue-200">
            設定密碼
          </label>
          <input
            required
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="mt-1 block w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:bg-white/20 transition-all placeholder:text-white/40"
            placeholder={`請輸入密碼 (${PASSWORD_HINT})`}
          />
        </div>
        <button
          type="submit"
          disabled={registering || !isCodeVerified}
          className={`mt-4 w-full rounded-xl py-3.5 text-base font-bold tracking-wide shadow-lg transition ${registering || !isCodeVerified ? "bg-white/30 text-white/60 cursor-not-allowed" : "bg-white text-[#1e3a8a] hover:bg-gray-50"}`}
        >
          {registering ? "註冊中..." : "立即註冊"}
        </button>
      </form>

      {/* OAuth */}
      <div className="mt-8">
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/20"></div>
          <span className="flex-shrink-0 mx-4 text-xs text-blue-200 uppercase tracking-widest font-bold">
            快速註冊
          </span>
          <div className="flex-grow border-t border-white/20"></div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              signIn("line", {
                callbackUrl: `${window.location.origin}/p/${storeDomain}/account`,
              })
            }
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#067A38] py-3 text-[14px] font-bold text-white transition hover:brightness-105 shadow-sm"
          >
            <LineIconSvg className="w-5 h-5" />
            LINE
          </button>
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-white text-stone-900 py-3 text-[14px] font-bold transition hover:bg-gray-50 shadow-sm"
          >
            Google
          </button>
        </div>
      </div>
      {message && (
        <p className="mt-4 text-center text-sm font-bold text-amber-300 bg-amber-900/40 py-2 rounded-lg">
          {message}
        </p>
      )}
    </div>
  );
};

// ==========================================
// 內部子元件：忘記密碼 (極簡版)
// ==========================================
const ForgotPasswordForm = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setStatus("error");
    else setStatus("success");
  };

  return (
    <div className="text-white animate-in fade-in slide-in-from-bottom-4 duration-300">
      <h3 className="text-lg font-bold mb-2">重設密碼</h3>
      <p className="text-sm text-blue-200 mb-6">
        請輸入您的註冊 Email，我們將寄送重設密碼的連結給您。
      </p>

      {status === "success" ? (
        <div className="bg-emerald-500/20 border border-emerald-500/50 p-4 rounded-xl text-center">
          <p className="font-bold text-emerald-300 mb-4">
            重設信件已寄出！請檢查您的信箱。
          </p>
          <button
            onClick={onClose}
            className="text-sm underline hover:text-white"
          >
            返回登入
          </button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:bg-white/20 transition-all placeholder:text-white/40"
            placeholder="輸入 Email"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full bg-white text-[#1e3a8a] hover:bg-gray-50 font-bold rounded-xl py-3.5 transition-colors"
          >
            {status === "sending" ? "發送中..." : "寄送重設連結"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-blue-200 mt-2 hover:text-white transition-colors"
          >
            返回登入
          </button>
          {status === "error" && (
            <p className="text-red-400 text-sm mt-2 text-center">
              發生錯誤，請稍後再試或聯繫客服。
            </p>
          )}
        </form>
      )}
    </div>
  );
};

// ==========================================
// 主元件：登入 / 註冊 頁面
// ==========================================
export default function PartnerLoginRegisterPage({ store }) {
  const router = useRouter();
  const { data: session, status: navStatus } = useSession();
  const [supaUser, setSupaUser] = useState(null);

  const [selected, setSelected] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setSupaUser(data.user);
    });
  }, []);

  const isLoggedIn = navStatus === "authenticated" || !!supaUser;

  // 自動跳轉
  useEffect(() => {
    if (isLoggedIn) {
      const timer = setTimeout(() => {
        router.push(`/p/${store.domain}/account`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, router, store.domain]);

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    setMessage("登入中...");

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
            (res.status === 429 ? "登入嘗試過多，請稍候再試" : "登入失敗，請稍後再試"),
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
      setMessage("登入成功！");
    } catch (err) {
      if (err.message === "Invalid login credentials")
        setMessage("帳號或密碼錯誤");
      else if (String(err.message || "").includes("Email not confirmed"))
        setMessage("請先前往信箱點擊驗證連結，才能正式登入喔！");
      else setMessage(err.message || "登入失敗，請稍後再試");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/p/${store.domain}/account`,
        },
      });
      if (error) throw error;
    } catch (err) {
      alert("快速登入發生錯誤：" + err.message);
    }
  };

  if (!store)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingIndicator layout="center" label="載入中..." />
      </div>
    );

  return (
    <PartnerShopLayout store={store} title="登入與註冊">
      <div className="bg-[#f5f6f6] min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-12">
        {/* 🌟 專屬深海藍高質感卡片設計 */}
        <div className="w-full max-w-md bg-[#1e3a8a] rounded-[2rem] shadow-2xl p-8 sm:p-10 relative overflow-hidden">
          {/* 背景裝飾光暈 */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#0064e0] rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          <div className="mb-8 text-center relative z-10">
            <h1 className="text-[28px] font-bold tracking-tight text-white">
              會員登入
            </h1>
            <p className="mt-2 text-sm text-blue-200 font-medium">
              使用同一組帳號管理您的 eSIM 訂單與 QR Code
            </p>
          </div>

          {!isLoggedIn ? (
            <div className="relative z-10">
              <div className="flex justify-around mb-8 border-b border-white/20">
                <button
                  onClick={() => {
                    setSelected("login");
                    setShowForgot(false);
                  }}
                  className={`pb-3 text-sm font-bold tracking-widest transition-all ${selected === "login" ? "text-white border-b-2 border-white" : "text-white/50 hover:text-white/80"}`}
                >
                  登入
                </button>
                <button
                  onClick={() => {
                    setSelected("sign-up");
                    setShowForgot(false);
                  }}
                  className={`pb-3 text-sm font-bold tracking-widest transition-all ${selected === "sign-up" ? "text-white border-b-2 border-white" : "text-white/50 hover:text-white/80"}`}
                >
                  註冊
                </button>
              </div>

              {selected === "login" && successMessage && (
                <div className="mb-6 rounded-xl bg-emerald-500/20 border border-emerald-500/50 px-4 py-3 text-center text-sm font-bold text-emerald-300">
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
                        <label className="text-xs font-bold uppercase tracking-widest text-blue-200">
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
                          className="mt-1 block w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:bg-white/20 focus:outline-none transition-all"
                          required
                          placeholder="請輸入 Email"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-blue-200">
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
                          className="mt-1 block w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:bg-white/20 focus:outline-none transition-all"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loggingIn}
                        className={`mt-4 w-full rounded-xl bg-white py-3.5 text-base font-bold text-[#1e3a8a] shadow-lg transition-all hover:bg-gray-50 ${loggingIn ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {loggingIn ? "登入中…" : "登入"}
                      </button>
                    </form>

                    <div className="mt-5 text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-sm font-bold text-blue-300 hover:text-white transition-colors"
                      >
                        忘記密碼？
                      </button>
                    </div>

                    {message && (
                      <p className="mt-4 text-center text-sm font-bold text-amber-300 bg-amber-900/40 py-2 rounded-lg">
                        {message}
                      </p>
                    )}

                    <div className="mt-8">
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/20"></div>
                        <span className="flex-shrink-0 mx-4 text-xs font-bold text-blue-200 uppercase tracking-widest">
                          快速登入
                        </span>
                        <div className="flex-grow border-t border-white/20"></div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            signIn("line", {
                              callbackUrl: `${window.location.origin}/p/${store.domain}/account`,
                            })
                          }
                          className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#067A38] py-3 text-[14px] font-bold text-white transition hover:brightness-105 shadow-sm"
                        >
                          <LineIconSvg className="w-5 h-5" />
                          LINE
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOAuthLogin("google")}
                          className="flex items-center justify-center gap-2 w-full rounded-xl bg-white text-stone-900 py-3 text-[14px] font-bold transition hover:bg-gray-50 shadow-sm"
                        >
                          Google
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <ForgotPasswordForm onClose={() => setShowForgot(false)} />
                )
              ) : (
                <RegisterForm
                  storeDomain={store.domain}
                  onSuccess={(msg) => {
                    setSelected("login");
                    setSuccessMessage(msg);
                    setShowForgot(false);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="text-center space-y-6 relative z-10 py-10">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-300 tracking-wide mb-2">
                  登入成功！
                </p>
                <p className="text-sm text-blue-100 font-medium">
                  正在為您導向會員中心...
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <QuarterRing size="sm" className="text-white" />
              </div>
              <button
                onClick={() => router.push(`/p/${store.domain}/account`)}
                className="mt-4 text-sm font-bold text-blue-200 underline hover:text-white"
              >
                立即前往
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 max-w-sm text-center">
          <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
            若使用 Email
            註冊，系統將發送驗證信至信箱。請點擊連結完成驗證，方可正式登入。
          </p>
        </div>
      </div>
    </PartnerShopLayout>
  );
}

// 伺服器端資料抓取
export async function getServerSideProps(context) {
  const { partnerSlug } = context.params;
  const store = await fetchActiveStoreByDomain(partnerSlug);
  if (!store) return { notFound: true };
  return { props: { store } };
}
