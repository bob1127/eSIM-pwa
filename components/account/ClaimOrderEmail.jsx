import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 認領其他 Email 的歷史訂單：寄 OTP → 輸入驗證碼 → 綁定。
 * 綁定成功後，該 Email 的歷史訂單會併入本會員的查單結果。
 */
export default function ClaimOrderEmail({ getAuthHeaders, onClaimed }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // email | code
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'ok'|'err', text }
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => timerRef.current && clearInterval(timerRef.current);
  }, []);

  const startCooldown = useCallback((sec) => {
    setCooldown(sec);
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const buildHeaders = useCallback(async () => {
    const base = { "Content-Type": "application/json" };
    if (typeof getAuthHeaders === "function") {
      const extra = await getAuthHeaders();
      return { ...base, ...(extra || {}) };
    }
    return base;
  }, [getAuthHeaders]);

  const sendCode = async () => {
    const target = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setMsg({ type: "err", text: "請輸入正確的 Email" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/member/order-claim/send-code", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ email: target }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.cooldown) startCooldown(data.cooldown);
        setMsg({ type: "err", text: data.message || "寄送失敗" });
        return;
      }
      setStep("code");
      setMsg({ type: "ok", text: "驗證碼已寄出，請至該信箱查收（10 分鐘內有效）" });
      startCooldown(data.cooldown || 60);
    } catch {
      setMsg({ type: "err", text: "寄送失敗，請稍後再試" });
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const target = email.trim().toLowerCase();
    if (!/^\d{6}$/.test(code.trim())) {
      setMsg({ type: "err", text: "請輸入 6 位數驗證碼" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/member/order-claim/verify", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ email: target, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMsg({ type: "err", text: data.message || "驗證失敗" });
        return;
      }
      setMsg({ type: "ok", text: `已成功認領 ${target} 的歷史訂單` });
      setStep("email");
      setEmail("");
      setCode("");
      setOpen(false);
      if (typeof onClaimed === "function") onClaimed();
    } catch {
      setMsg({ type: "err", text: "驗證失敗，請稍後再試" });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              找不到以前買過的訂單？
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              若結帳時填過其他 Email（例如以前購買用的信箱），可在此驗證後一併顯示。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setOpen(true);
            }}
            className="shrink-0 rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            認領訂單
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            認領以前購買時用過的 Email
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            請輸入結帳時填寫的 Email（非目前登入信箱）。我們會寄驗證碼到該信箱，通過後該 Email
            的歷史訂單會併入此帳號。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-xs text-slate-500 hover:text-slate-700"
        >
          收合
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="以前購買時使用的 Email"
          value={email}
          disabled={busy || step === "code"}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={sendCode}
          disabled={busy || (cooldown > 0 && step === "email")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {cooldown > 0 && step === "email"
            ? `重寄(${cooldown}s)`
            : step === "code"
              ? "重新寄送"
              : "寄送驗證碼"}
        </button>
      </div>

      {step === "code" && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="輸入 6 位數驗證碼"
            value={code}
            disabled={busy}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-widest outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={verifyCode}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            確認認領
          </button>
        </div>
      )}

      {msg && (
        <p
          className={`mt-2 text-xs ${
            msg.type === "ok" ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
