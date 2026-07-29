"use client";

import { useState, useEffect, useCallback } from "react";
import MaterialIcon from "./MaterialIcon";
import { LineIconSvg, LineAppIconSvg } from "@/components/social/SocialBrandIcons";
import { useAuth } from "../hooks/useAuth";
import { getPushEndpoint } from "../lib/pushBind";

/**
 * LINE 登入會員：開啟官方 LINE 低流量推播（不需 Web Push）
 */
export default function PushLineAlertSection({ className = "", boundTopupId }) {
  const { session, authReady } = useAuth();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    if (!authReady || !session?.user?.id) {
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
      });
      const data = await res.json();
      setStatus(data);
    } catch {
      setError("無法載入 LINE 提醒狀態");
    } finally {
      setLoading(false);
    }
  }, [authReady, session?.user?.id]);

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
        headers: { "Content-Type": "application/json" },
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

  if (!authReady || loading) {
    return (
      <div
        className={`rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-500 animate-pulse ${className}`}
      >
        載入 LINE 提醒設定…
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div
        className={`rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-4 ${className}`}
      >
        <div className="flex items-start gap-3">
          <LineAppIconSvg className="w-[22px] h-[22px] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-stone-900 text-sm">LINE 推播提醒</p>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              使用 <strong>LINE 登入</strong> 後，可額外開啟官方 LINE 低流量推播（不需瀏覽器通知）。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const oaUrl = status?.oaUrl || "https://line.me/R/ti/p/@391huuts";
  const enabled = status?.enabled;
  const needsFriend = status?.needsAddFriend;

  return (
    <div
      className={`rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#06C755]/15 flex items-center justify-center shrink-0 overflow-hidden">
          <LineAppIconSvg className="w-10 h-10" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-stone-900 text-sm">LINE 推播提醒</p>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            加入官方 LINE 好友後，流量偏低時會收到 LINE 訊息（可與瀏覽器推播同時開啟）。
          </p>
          {enabled && status?.productName && (
            <p className="text-[11px] text-[#06C755] font-bold mt-2">
              已監控：{status.productName}
            </p>
          )}
        </div>
      </div>

      {needsFriend && (
        <a
          href={oaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-bold transition-colors"
        >
          <LineIconSvg className="w-[18px] h-[18px]" />
          加入官方 LINE 好友
        </a>
      )}

      {error && (
        <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
          <MaterialIcon name="error" size={16} />
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {!enabled ? (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => toggleLineAlert(true)}
            className="flex-1 bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <MaterialIcon name="notifications_active" size={18} />
            {actionLoading ? "設定中…" : "開啟 LINE 流量提醒"}
          </button>
        ) : (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => toggleLineAlert(false)}
            className="flex-1 border border-stone-300 text-stone-700 font-bold py-3 rounded-xl text-sm hover:bg-white disabled:opacity-50"
          >
            {actionLoading ? "處理中…" : "關閉 LINE 提醒"}
          </button>
        )}
        <a
          href={oaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="sm:shrink-0 px-4 py-3 rounded-xl border border-[#06C755]/40 text-[#06C755] text-xs font-bold hover:bg-white text-center"
        >
          在 LINE 傳「開啟流量提醒」
        </a>
      </div>
    </div>
  );
}
