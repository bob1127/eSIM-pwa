// pages/reset-password.jsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "../lib/supabaseClient";
import { validatePassword, PASSWORD_HINT } from "../lib/passwordPolicy";
import { QuarterRing } from "@/components/ui/QuarterRing";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
            router.replace("/reset-password", undefined, { shallow: true });
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
    setMsg("設定中…");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg("重設失敗：" + error.message);
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    setMsg("密碼已更新，請用新密碼登入。");
    setTimeout(() => router.replace("/login"), 2000);
  };

  const isSuccess = msg.includes("已更新");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9fa] px-4">
      <Head>
        <title>重設密碼 | JEKO eSIM</title>
      </Head>
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold mb-2">重設密碼</h1>

        {!ready ? (
          <div className="flex justify-center py-8">
            <QuarterRing size="md" className="text-[#1757FF]" />
          </div>
        ) : !recoveryReady ? (
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-2">連結無效或已過期</p>
            <p className="text-gray-500 mb-4 leading-relaxed">
              {msg || "請重新至登入頁申請重設密碼，或確認信件中的連結是否完整。"}
            </p>
            <a
              href="/login"
              className="inline-block text-[#1757FF] font-semibold underline"
            >
              返回登入並重寄連結 →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-sm text-gray-600 mb-1">請輸入您的新密碼。</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-[13px]"
              placeholder={`輸入新密碼（${PASSWORD_HINT}）`}
              required
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-[13px]"
              placeholder="再次輸入新密碼"
              required
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={submitting || isSuccess}
              className={`bg-[#1757FF] text-white py-2 rounded-[10px] hover:bg-[#2a3ebb] transition ${
                submitting || isSuccess ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {submitting ? "設定中…" : "設定新密碼"}
            </button>
            {msg && (
              <p className="text-sm text-center text-stone-900 mt-1">{msg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
