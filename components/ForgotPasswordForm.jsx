import { useState } from "react";

export default function ForgotPasswordForm({ onClose }) {
  const [identifier, setIdentifier] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setMsg("請輸入帳號或 Email");
      return;
    }
    setSubmitting(true);
    setMsg("寄送中…");

    try {
      // 呼叫 Next.js API，由它與 WordPress 溝通寄信
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(data?.message || "若該 Email/帳號存在，將寄出重設密碼信。");
      } else {
        setMsg(data?.message || "寄送失敗，請稍後再試。");
      }
    } catch (err) {
      setMsg("錯誤：" + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 text-white">
      <h3 className="text-lg font-semibold mb-2">忘記密碼</h3>
      <p className="text-sm text-white/70 mb-4">
        請輸入您的帳號或 Email，我們會寄出重設密碼連結到您的信箱。
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {/* 帳號 / Email 輸入 */}
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-white/70">
            帳號 / Email
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-0"
            placeholder="請輸入帳號或 Email"
            required
          />
        </div>

        {/* 寄送按鈕 */}
        <button
          type="submit"
          disabled={submitting}
          className={`mt-1 w-full rounded-full py-2.5 text-sm font-semibold tracking-wide shadow-sm transition ${
            submitting
              ? "bg-white/40 text-[#1C82E0] cursor-not-allowed"
              : "bg-white/95 text-[#1C82E0] hover:bg-white"
          }`}
        >
          {submitting ? "寄送中…" : "寄送重設密碼連結"}
        </button>

        {/* 提示訊息 */}
        {msg && (
          <p className="text-xs text-center text-amber-100 mt-2">{msg}</p>
        )}

        {/* 返回登入 */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-3 text-xs text-white/80 underline underline-offset-4 hover:text-white"
          >
            返回登入
          </button>
        )}
      </form>
    </div>
  );
}
