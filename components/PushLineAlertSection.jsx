"use client";

import { useState, useEffect, useCallback } from "react";
import MaterialIcon from "./MaterialIcon";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { useAuth } from "../hooks/useAuth";
import { getPushEndpoint } from "../lib/pushBind";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const FALLBACK_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";

/** 與帳號流量「查詢流量」SecondaryBtn 同款 */
const queryBtnStyle = {
  backgroundColor: "#fafafa",
  color: "#303030",
  border: "1px solid #8a8a8a",
  borderRadius: "0.5rem",
};

function buildOaQrUrl(oaUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=M&margin=12&data=${encodeURIComponent(oaUrl)}`;
}

/**
 * LINE 登入會員：開啟官方 LINE 低流量推播（不需 Web Push）
 * @param {{ className?: string, boundTopupId?: string, disabled?: boolean }} props
 */
export default function PushLineAlertSection({
  className = "",
  boundTopupId,
  disabled = false,
}) {
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
    if (disabled) return;
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
  const locked = Boolean(disabled);

  const lineGuideCard = (
    <div
      className={`flex flex-col sm:flex-row gap-3 items-center sm:items-start rounded-xl border p-3 ${
        locked
          ? "border-zinc-200 bg-zinc-100/80 opacity-70"
          : "border-zinc-200 bg-white"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={oaQrUrl}
        alt="Jeko 官方 LINE QR Code"
        width={120}
        height={120}
        className={`w-[112px] h-[112px] rounded-lg border border-zinc-200 bg-white shrink-0 ${
          locked ? "grayscale" : ""
        }`}
      />
      <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left w-full">
        <p
          className={`text-sm font-bold leading-snug ${
            locked ? "text-zinc-400" : "text-zinc-900"
          }`}
        >
          加入官方 LINE 開啟流量提醒
        </p>
        <p
          className={`text-[11px] leading-relaxed ${
            locked ? "text-zinc-400" : "text-zinc-500"
          }`}
        >
          {locked
            ? "此 eSIM 已過期，無法開啟 LINE 流量提醒。"
            : "用手機相機或 LINE 掃描左側 QR；已是好友可直接點下方開啟提醒。"}
        </p>
        {locked ? (
          <span
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 h-8 px-3 text-[13px] font-semibold cursor-not-allowed opacity-40"
            style={queryBtnStyle}
          >
            <LineIconSvg className="w-4 h-4 text-[#303030]" />
            開啟官方 LINE
          </span>
        ) : (
          <a
            href={oaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 h-8 px-3 text-[13px] font-semibold transition hover:bg-zinc-100"
            style={queryBtnStyle}
          >
            <LineIconSvg className="w-4 h-4 text-[#303030]" />
            開啟官方 LINE
          </a>
        )}
      </div>
    </div>
  );

  if (!authReady || loading) {
    return (
      <div
        className={`rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500 animate-pulse ${className}`}
      >
        載入 LINE 提醒設定…
      </div>
    );
  }

  if (!session?.user?.id && !isLoggedIn) {
    return (
      <div
        className={`rounded-xl border border-zinc-200 bg-zinc-50 p-4 ${className}`}
      >
        <div className="flex items-start gap-3 mb-4">
          <LineIconSvg
            className={`w-6 h-6 shrink-0 mt-0.5 ${
              locked ? "text-zinc-400" : "text-zinc-700"
            }`}
          />
          <p
            className={`font-bold text-sm ${
              locked ? "text-zinc-400" : "text-zinc-900"
            }`}
          >
            LINE 推播提醒
          </p>
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
      className={`rounded-xl border p-4 sm:p-5 ${
        locked
          ? "border-zinc-200 bg-zinc-100"
          : "border-zinc-200 bg-zinc-50"
      } ${className}`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ring-1 ${
            locked
              ? "bg-zinc-200 ring-zinc-200"
              : "bg-white ring-zinc-200"
          }`}
        >
          <LineIconSvg
            className={`w-6 h-6 ${locked ? "text-zinc-400" : "text-zinc-700"}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`font-bold text-sm ${
              locked ? "text-zinc-400" : "text-zinc-900"
            }`}
          >
            LINE 推播提醒
          </p>
          {locked ? (
            <p className="text-[11px] text-zinc-400 font-medium mt-1">
              已過期，無法開啟或變更提醒
            </p>
          ) : enabled && status?.productName ? (
            <p className="text-[11px] text-zinc-600 font-semibold mt-1">
              已監控：{status.productName}
            </p>
          ) : needsFriend ? (
            <p className="text-[11px] text-zinc-600 font-medium mt-1">
              系統尚未確認好友狀態，請掃碼加入後再開啟
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500 mt-1">
              已加入官方帳號即可一鍵開啟低流量提醒
            </p>
          )}
        </div>
      </div>

      {error && !locked ? (
        <p className="text-xs text-zinc-700 mb-3 flex items-start gap-1 rounded-lg bg-zinc-100 px-2.5 py-2 border border-zinc-200">
          <MaterialIcon name="error" size={16} className="shrink-0 mt-0.5 text-zinc-500" />
          <span>{error}</span>
        </p>
      ) : null}

      {showGuideOnly ? (
        <div className="flex flex-col gap-3">
          {lineGuideCard}
          {!needsLineLink ? (
            <button
              type="button"
              disabled={actionLoading || locked}
              onClick={() => toggleLineAlert(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[13px] font-semibold transition hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
              style={queryBtnStyle}
            >
              {actionLoading ? (
                <LoadingIndicator layout="inline" size="xs" label="設定中…" />
              ) : locked ? (
                "已過期無法開啟"
              ) : (
                "已加入？點此開啟提醒"
              )}
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={actionLoading || locked}
          onClick={() => toggleLineAlert(false)}
          className="w-full inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[13px] font-semibold transition hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
          style={queryBtnStyle}
        >
          {actionLoading ? (
            <LoadingIndicator layout="inline" size="xs" label="處理中…" />
          ) : locked ? (
            "已過期無法變更"
          ) : (
            "關閉 LINE 提醒"
          )}
        </button>
      )}
    </div>
  );
}
