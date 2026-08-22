import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { validatePassword, PASSWORD_HINT } from "@/lib/passwordPolicy";
import { QuarterRing } from "@/components/ui/QuarterRing";

const INPUT_CLASS =
  "w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 pr-11 text-white placeholder:text-blue-300 text-sm outline-none focus:bg-white/20 focus:border-white/60 transition";

function PasswordField({ label, value, onChange, show, onToggleShow }) {
  return (
    <div>
      <label className="block text-xs font-bold text-blue-200 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={PASSWORD_HINT}
          autoComplete="new-password"
          className={INPUT_CLASS}
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
    </div>
  );
}

export default function PartnerResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initRecovery() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) throw error;
        }

        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, ""),
        );
        const hashError = hashParams.get("error_description");
        if (hashError && !cancelled) {
          setMsg(decodeURIComponent(hashError.replace(/\+/g, " ")));
        }

        const hashType = hashParams.get("type");
        if (hashParams.get("access_token") && hashType === "recovery") {
          setRecoveryReady(true);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled && session) {
          setRecoveryReady(true);
          if (tokenHash || code || window.location.hash) {
            router.replace("/partner/reset-password/", undefined, {
              shallow: true,
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setMsg(err.message || "重設連結無效或已過期");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setReady(true);
      }
    });

    initRecovery();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) {
      setMsg(passwordError);
      return;
    }
    if (password !== confirm) {
      setMsg("兩次輸入的密碼不一致");
      return;
    }

    setSubmitting(true);
    setMsg("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg("重設失敗：" + error.message);
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    setMsg("密碼已更新！即將導向登入頁…");
    setTimeout(() => router.replace("/partner/login"), 2000);
  };

  const isSuccess = msg.includes("已更新");

  return (
    <div className="min-h-screen flex font-sans">
      <Head>
        <title>重設夥伴後台密碼 | JEKO eSIM</title>
      </Head>

      <div className="w-full lg:w-1/2 bg-[#1E4AD1] flex flex-col justify-center px-10 md:px-16 py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10 max-w-md mx-auto w-full">
          <Link
            href="/partner/login"
            className="inline-flex items-center gap-2 text-blue-200 text-sm mb-10 hover:text-white transition"
          >
            ← 返回夥伴登入
          </Link>

          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">
            Partner Portal
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
            設定新密碼
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed mb-8">
            請輸入您的新登入密碼（{PASSWORD_HINT}），完成後即可使用新密碼登入夥伴後台。
          </p>

          {!ready ? (
            <div className="flex justify-center py-8">
              <QuarterRing size="md" className="text-white" />
            </div>
          ) : !recoveryReady ? (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-4 text-sm text-red-100">
              <p className="font-bold mb-2">連結無效或已過期</p>
              <p className="text-red-200/90 mb-4 leading-relaxed">
                {msg ||
                  "請重新至夥伴登入頁申請重設密碼，或確認信件中的連結是否完整。"}
              </p>
              <Link
                href="/partner/login"
                className="inline-block text-white font-bold underline hover:no-underline"
              >
                返回登入並重寄連結 →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <PasswordField
                label="新密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
              />
              <PasswordField
                label="確認新密碼"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                show={showConfirm}
                onToggleShow={() => setShowConfirm((v) => !v)}
              />

              {msg && (
                <p
                  className={`text-sm rounded-xl px-4 py-3 leading-relaxed ${
                    isSuccess
                      ? "text-emerald-100 bg-emerald-500/20 border border-emerald-400/30"
                      : "text-red-200 bg-red-500/20 border border-red-400/30"
                  }`}
                >
                  {msg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || isSuccess}
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] disabled:opacity-60 text-slate-900 font-black py-4 rounded-full text-base transition shadow-lg mt-2"
              >
                {submitting ? "更新中..." : "確認新密碼 →"}
              </button>
            </form>
          )}
        </div>
      </div>

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
            安全重設密碼
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">
            重設連結僅限單次使用且有效期限有限。若連結失效，請回到登入頁再次申請。
          </p>
        </div>
      </div>
    </div>
  );
}
