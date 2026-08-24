"use client";

import { useCallback, useEffect, useState } from "react";
import MaterialIcon from "./MaterialIcon";
import { detectPushSupport } from "@/lib/pushSupport";
import { getPushEndpoint } from "@/lib/pushBind";
import { subscribeToPush } from "@/lib/pushSubscribe";
import { useUser } from "./context/UserContext";
import { QuarterRing } from "@/components/ui/QuarterRing";

/**
 * 首頁／會員區：日常推播（優惠、公告）ON/OFF
 * 與流量提醒 monitor_enabled 無關。
 */
export default function GeneralPushToggle({
  className = "",
  compact = false,
  theme = "light",
}) {
  const { token } = useUser();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  const [supportHint, setSupportHint] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const support = await detectPushSupport();
      if (!support.supported) {
        setSupported(false);
        setSupportHint(support.hint || support.title || "");
        setSubscribed(false);
        setEnabled(false);
        return;
      }
      setSupported(true);
      const endpoint = await getPushEndpoint();
      if (!endpoint) {
        setSubscribed(false);
        setEnabled(false);
        return;
      }
      const res = await fetch(
        `/api/push/general-push/?endpoint=${encodeURIComponent(endpoint)}`,
      );
      const data = await res.json();
      setSubscribed(!!data.subscribed);
      setEnabled(!!data.generalPushEnabled);
    } catch {
      setError("無法載入推播設定");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubscribe = async () => {
    setBusy(true);
    setError("");
    try {
      const support = await detectPushSupport();
      if (!support.supported) {
        setError(support.hint || support.title || "此裝置不支援推播");
        return;
      }
      await subscribeToPush({ token });
      await load();
    } catch (e) {
      setError(e?.message || "訂閱失敗");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async () => {
    setBusy(true);
    setError("");
    try {
      const endpoint = await getPushEndpoint();
      if (!endpoint) {
        await handleSubscribe();
        return;
      }
      const next = !enabled;
      const res = await fetch("/api/push/general-push/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.hint || "設定失敗");
      setEnabled(next);
      setSubscribed(true);
    } catch (e) {
      setError(e?.message || "設定失敗");
    } finally {
      setBusy(false);
    }
  };

  const isDark = theme === "dark";
  const wrapCls = compact
    ? `inline-flex items-center gap-2 ${className}`
    : `rounded-xl border p-3 sm:p-4 ${
        isDark
          ? "border-white/25 bg-white/10"
          : "border-[#1d5cc5]/20 bg-white/95"
      } ${className}`;

  if (loading) {
    return (
      <div className={wrapCls}>
        <QuarterRing size="xs" className={isDark ? "text-white" : "text-[#1d5cc5]"} />
        <span className={`text-xs ${isDark ? "text-white/80" : "text-slate-600"}`}>
          載入推播設定…
        </span>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className={wrapCls}>
        <MaterialIcon
          name="notifications_off"
          size={18}
          className={isDark ? "text-white/70" : "text-slate-400"}
        />
        <span className={`text-xs leading-relaxed ${isDark ? "text-white/75" : "text-slate-500"}`}>
          {supportHint || "此裝置請先安裝 APP 或改用 Chrome"}
        </span>
      </div>
    );
  }

  if (!subscribed) {
    return (
      <div className={wrapCls}>
        <button
          type="button"
          disabled={busy}
          onClick={handleSubscribe}
          className={`flex flex-1 min-w-0 items-center gap-2.5 rounded-lg px-3.5 py-3.5 text-left transition-colors shadow-sm disabled:opacity-60 w-full ${
            isDark
              ? "bg-white text-[#1d5cc5] hover:bg-white/95"
              : "bg-[#1d5cc5] text-white hover:bg-[#174da8]"
          }`}
        >
          <MaterialIcon name="campaign" size={22} className="shrink-0" />
          <span className="text-sm font-bold leading-tight">
            {busy ? "處理中…" : "開啟日常推播"}
          </span>
        </button>
        {error ? (
          <p className="text-xs text-red-500 mt-2 w-full">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={wrapCls}>
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="min-w-0">
          <p
            className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            日常推播
          </p>
          <p
            className={`text-[11px] mt-0.5 ${isDark ? "text-white/75" : "text-slate-500"}`}
          >
            優惠、公告（流量提醒另設）
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={busy}
          onClick={handleToggle}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-[#06C755]" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {error ? <p className="text-xs text-red-500 mt-2">{error}</p> : null}
    </div>
  );
}
