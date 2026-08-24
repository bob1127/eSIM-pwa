"use client";

import { useState, useEffect, useCallback } from "react";
import MaterialIcon from "./MaterialIcon";
import { LineAppIconSvg } from "@/components/social/SocialBrandIcons";
import { useAuth } from "../hooks/useAuth";
import { getPushEndpoint } from "../lib/pushBind";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import JekoAnimatedCtaButton from "@/components/ui/JekoAnimatedCtaButton";

/**
 * LINE 登入會員：開啟官方 LINE 低流量推播（不需 Web Push）
 */
export default function PushLineAlertSection({ className = "", boundTopupId }) {
  const { session, authReady, token, isLoggedIn } = useAuth();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    if (!authReady || (!session?.user?.id && !token)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const endpoint = await getPushEndpoint();
      const qs = endpoint
        ? `?endpoint=${encodeURIComponent(endpoint)}`
        : "";
      const res = await fetch(`/api/push/line-alert${qs}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setStatus(data);
    } catch {
      setError("無法載入 LINE 提醒狀態");
    } finally {
      setLoading(false);
    }
  }, [authReady, session?.user?.id, token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const toggleLineAlert = async (enable) => {
    setActionLoading(true);
    setError("");
    try {
      const endpoint = await getPushEndpoint();
      const res = await fetch("/api/push/line-alert", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: enable ? "enable" : "disable",
          topupId: boundTopupId || undefined,
          endpoint: endpoint || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsAddFriend && data.oaUrl) {
          setError("請先加入官方 LINE 好友後再開啟");
        } else {
          throw new Error(data.error || data.hint || "操作失敗");
        }
        return;
      }
      await loadStatus();
    } catch (e) {
      setError(e.message || "操作失敗");
    } finally {
      setActionLoading(false);
    }
  };

  const oaUrl = status?.oaUrl || "https://line.me/R/ti/p/@391huuts";

  const lineGuideButton = (
    <JekoAnimatedCtaButton
      href={oaUrl}
      external
      className="w-full sm:w-auto [&>a]:w-full [&>a>span]:w-full [&>a>span]:justify-center"
      surfaceClassName="border-[#06C755]/35 bg-white text-stone-900 hover:border-transparent"
    >
      加入官方 LINE 開啟流量提醒
    </JekoAnimatedCtaButton>
  );

  if (!authReady || loading) {
    return (
      <div
        className={`rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-500 animate-pulse ${className}`}
      >
        載入 LINE 提醒設定…
      </div>
    );
  }

  if (!session?.user?.id && !isLoggedIn) {
    return (
      <div
        className={`rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-4 ${className}`}
      >
        <div className="flex items-start gap-3 mb-4">
          <LineAppIconSvg className="w-[22px] h-[22px] shrink-0 mt-0.5" />
          <p className="font-bold text-stone-900 text-sm">LINE 推播提醒</p>
        </div>
        {lineGuideButton}
      </div>
    );
  }

  const enabled = status?.enabled;
  const needsFriend = status?.needsAddFriend;
  const needsLineLink = status && status.isLineLogin === false;
  const showGuideOnly = needsFriend || needsLineLink || !enabled;

  return (
    <div
      className={`rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#06C755]/15 flex items-center justify-center shrink-0 overflow-hidden">
          <LineAppIconSvg className="w-10 h-10" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-stone-900 text-sm">LINE 推播提醒</p>
          {enabled && status?.productName ? (
            <p className="text-[11px] text-[#06C755] font-bold mt-1">
              已監控：{status.productName}
            </p>
          ) : null}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
          <MaterialIcon name="error" size={16} />
          {error}
        </p>
      )}

      {showGuideOnly ? (
        <div className="flex flex-col gap-3">
          {lineGuideButton}
          {!needsFriend && !needsLineLink && !enabled ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => toggleLineAlert(true)}
              className="w-full sm:w-auto self-start text-xs font-bold text-[#06C755] hover:underline disabled:opacity-50 px-1"
            >
              {actionLoading ? "設定中…" : "已加入？點此開啟提醒"}
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => toggleLineAlert(false)}
          className="w-full sm:w-auto border border-stone-300 text-stone-700 font-bold py-3 px-5 rounded-full text-sm hover:bg-white disabled:opacity-50"
        >
          {actionLoading ? (
            <LoadingIndicator layout="inline" size="xs" label="處理中…" />
          ) : (
            "關閉 LINE 提醒"
          )}
        </button>
      )}
    </div>
  );
}
