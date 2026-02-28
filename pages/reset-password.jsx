// pages/reset-password.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { key, login } = router.query;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 等 query 就緒
    if (typeof key === "string" && typeof login === "string") {
      setReady(true);
    }
  }, [key, login]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready) return;

    if (!password || password.length < 6) {
      setMsg("請輸入至少 6 碼的新密碼");
      return;
    }
    if (password !== confirm) {
      setMsg("兩次輸入的密碼不一致");
      return;
    }

    setSubmitting(true);
    setMsg("設定中…");

    try {
      const res = await fetch(
        "https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/custom/v1/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login,
            key,
            password,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(data?.message || "密碼已更新，請用新密碼登入。");
        // 2 秒後導回登入頁
        setTimeout(() => {
          window.location.href = "/login"; // 如果你的登入頁路徑不同，改這裡
        }, 2000);
      } else {
        setMsg(data?.message || "重設失敗，連結可能已失效，請重新申請。");
      }
    } catch (err) {
      setMsg("錯誤：" + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>載入中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9fa] px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold mb-2">重設密碼</h1>
        <p className="text-sm text-gray-600 mb-4">
          帳號：<span className="font-mono">{String(login)}</span>
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-[13px]"
            placeholder="輸入新密碼（至少 6 碼）"
            minLength={6}
            required
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-[13px]"
            placeholder="再次輸入新密碼"
            minLength={6}
            required
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={submitting}
            className={`bg-[#1757FF] text-white py-2 rounded-[10px] hover:bg-[#2a3ebb] transition ${
              submitting ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {submitting ? "設定中…" : "設定新密碼"}
          </button>
          {msg && (
            <p className="text-sm text-center text-gray-700 mt-1">{msg}</p>
          )}
        </form>
      </div>
    </div>
  );
}
