"use client";

import { useState, useEffect, useCallback } from "react";
import MaterialIcon from "./MaterialIcon";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { useAuth } from "../hooks/useAuth";
import { getPushEndpoint } from "../lib/pushBind";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const FALLBACK_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";

function buildOaQrUrl(oaUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=M&margin=12&data=${encodeURIComponent(oaUrl)}`;
}

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
        if (data.oaUrl || data.oaQrUrl) {
          setStatus((prev) => ({
            ...(prev || {}),
            oaUrl: data.oaUrl || prev?.oaUrl,
            oaQrUrl: data.oaQrUrl || prev?.oaQrUrl,
            needsAddFriend: Boolean(data.needsAddFriend),
          }));
        }
        if (data.needsAddFriend) {
          setError("請先掃描下方 QR 加入官方 LINE，完成後再按「開啟提醒」");
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

  const oaUrl = status?.oaUrl || FALLBACK_OA_URL;
  const oaQrUrl = status?.oaQrUrl || buildOaQrUrl(oaUrl);

  const lineGuideCard = (
    <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-start rounded-xl border border-[#06C755]/35 bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={oaQrUrl}
        alt="Jeko 官方 LINE QR Code"
        width={120}
        height={120}
        className="w-[112px] h-[112px] rounded-lg border border-stone-200 bg-white shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left w-full">
        <p className="text-sm font-bold text-stone-900 leading-snug">
          加入官方 LINE 開啟流量提醒
        </p>
        <p className="text-[11px] text-stone-500 leading-relaxed">
          用手機相機或 LINE 掃描左側 QR；已是好友可直接點下方開啟提醒。
        </p>
        <a
          href={oaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-bold py-2.5 px-4 transition"
        >
          <LineIconSvg className="w-4 h-4 text-white" />
          開啟官方 LINE
        </a>
      </div>
    </div>
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
          <LineIconSvg className="w-6 h-6 shrink-0 mt-0.5 text-[#06C755]" />
          <p className="font-bold text-stone-900 text-sm">LINE 推播提醒</p>
        </div>
        {lineGuideCard}
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
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-[#06C755]/25">
          <LineIconSvg className="w-6 h-6 text-[#06C755]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-stone-900 text-sm">LINE 推播提醒</p>
          {enabled && status?.productName ? (
            <p className="text-[11px] text-[#06C755] font-bold mt-1">
              已監控：{status.productName}
            </p>
          ) : needsFriend ? (
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              系統尚未確認好友狀態，請掃碼加入後再開啟
            </p>
          ) : (
            <p className="text-[11px] text-stone-500 mt-1">
              已加入官方帳號即可一鍵開啟低流量提醒
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-3 flex items-start gap-1">
          <MaterialIcon name="error" size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      {showGuideOnly ? (
        <div className="flex flex-col gap-3">
          {lineGuideCard}
          {!needsLineLink ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => toggleLineAlert(true)}
              className="w-full rounded-lg border border-[#06C755] bg-white text-[#06C755] font-bold py-3 px-4 text-sm hover:bg-[#06C755]/10 disabled:opacity-50 transition"
            >
              {actionLoading ? (
                <LoadingIndicator layout="inline" size="xs" label="設定中…" />
              ) : (
                "已加入？點此開啟提醒"
              )}
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => toggleLineAlert(false)}
          className="w-full rounded-lg border border-stone-300 bg-white text-stone-700 font-bold py-3 px-4 text-sm hover:bg-stone-50 disabled:opacity-50 transition"
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
