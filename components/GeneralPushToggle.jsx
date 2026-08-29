"use client";

import { useCallback, useEffect, useState } from "react";
import MaterialIcon from "./MaterialIcon";
import { detectPushSupport } from "@/lib/pushSupport";
import { getPushEndpoint } from "@/lib/pushBind";
import { subscribeToPush } from "@/lib/pushSubscribe";
import {
  broadcastPushNotifyState,
  subscribePushNotifySync,
} from "@/lib/pushNotifySync";
import { useUser } from "./context/UserContext";
import { QuarterRing } from "@/components/ui/QuarterRing";
import TrafficNotifyToggle from "@/components/ui/TrafficNotifyToggle";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";

const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";

const SYNC_SOURCE = "general-push-toggle";

/**
 * 首頁／會員區：推播通知 ON/OFF
 * 與 BottomSheet 流量通知共用訂閱狀態，開關會全站同步並跳出提示。
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

  useEffect(() => {
    return subscribePushNotifySync((detail) => {
      if (detail?.source === SYNC_SOURCE) return;
      // 流量開關變更時重讀一般推播旗標，避免誤把 SW 訂閱當成已退訂
      load();
    });
  }, [load]);

  const enablePush = async () => {
    const support = await detectPushSupport();
    if (!support.supported) {
      throw new Error(support.hint || support.title || "此裝置不支援推播");
    }
    await subscribeToPush({ token });
    const endpoint = await getPushEndpoint();
    if (endpoint) {
      await fetch("/api/push/general-push/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, enabled: true }),
      });
    }
    setSubscribed(true);
    setEnabled(true);
    broadcastPushNotifyState({ on: true, source: SYNC_SOURCE });
    alert("推播通知已開啟！\n優惠、公告會推播到本裝置。");
  };

  const disablePush = async () => {
    // 只關「優惠／公告」旗標；保留 SW 訂閱與流量 eSIM 綁定（關閉再開可還原）
    const endpoint = await getPushEndpoint();
    if (endpoint) {
      const res = await fetch("/api/push/general-push/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, enabled: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "關閉失敗");
      }
    }

    setSubscribed(true);
    setEnabled(false);
    alert("已關閉優惠／公告推播。\n流量提醒若已綁定，不受影響。");
  };

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const isOn = subscribed && enabled;
      if (isOn) await disablePush();
      else await enablePush();
    } catch (e) {
      const msg = e?.message || "設定失敗";
      setError(msg);
      alert(`操作失敗：${msg}\n\n請再試一次。`);
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
      <div className={`${wrapCls} flex items-center gap-2`}>
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
        <div className="flex items-center gap-2">
          <MaterialIcon
            name="notifications_off"
            size={18}
            className={isDark ? "text-white/70" : "text-slate-400"}
          />
          <span
            className={`text-xs leading-relaxed ${isDark ? "text-white/75" : "text-slate-500"}`}
          >
            {supportHint || "此裝置請先安裝 APP 或改用 Chrome"}
          </span>
        </div>
        <LinePushBlock isDark={isDark} />
      </div>
    );
  }

  const isOn = subscribed && enabled;

  return (
    <div className={wrapCls}>
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="min-w-0">
          <p
            className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            推播通知
          </p>
          <p
            className={`text-[11px] mt-0.5 ${isDark ? "text-white/75" : "text-slate-500"}`}
          >
            {isOn
              ? "優惠、公告已開啟"
              : subscribed
                ? "優惠、公告已關閉（流量提醒另設）"
                : "優惠、公告（流量提醒另設）"}
          </p>
        </div>
        <TrafficNotifyToggle
          on={isOn}
          busy={busy}
          onClick={handleToggle}
          aria-label={isOn ? "關閉推播通知" : "開啟推播通知"}
        />
      </div>
      {error ? (
        <p
          className={`text-xs mt-2 ${isDark ? "text-red-200" : "text-red-500"}`}
        >
          {error}
        </p>
      ) : null}
      <LinePushBlock isDark={isDark} />
    </div>
  );
}

function LinePushBlock({ isDark }) {
  return (
    <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
      <a
        href={LINE_OA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={[
          "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-3",
          "text-[13px] font-bold transition",
          "bg-[#06C755] hover:brightness-105 text-white",
          isDark ? "shadow-[0_2px_8px_rgba(0,0,0,0.2)]" : "",
        ].join(" ")}
      >
        <LineIconSvg className="w-5 h-5" />
        LINE 推播通知
      </a>
      <p
        className={`text-center text-[10px] leading-relaxed ${
          isDark ? "text-white/75" : "text-slate-500"
        }`}
      >
        <a
          href={LINE_OA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isDark
              ? "underline underline-offset-2 decoration-white/40 hover:text-white hover:decoration-white"
              : "underline underline-offset-2 decoration-slate-300 hover:text-[#06C755] hover:decoration-[#06C755]"
          }
        >
          加入官方 LINE 後，點擊開啟流量提醒綁定
        </a>
      </p>
    </div>
  );
}
