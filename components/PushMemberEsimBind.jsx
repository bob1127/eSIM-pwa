"use client";

import { useState } from "react";
import MaterialIcon from "./MaterialIcon";
import { useUser } from "./context/UserContext";
import { getPushEndpoint, ICCID_STORAGE_KEY } from "../lib/pushBind";

/** 與 data-query／TSUNORU 一致的主藍 */
const PRIMARY = "#3768C7";
const PRIMARY_DARK = "#2B56A8";
const PRIMARY_SOFT = "#EAF0FB";
const LINE = "#E8E8E8";
const MUTED = "#777777";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function PillButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 pl-5 pr-2 py-3 rounded-full text-sm font-bold transition-colors disabled:opacity-50 ${className}`}
      style={
        isPrimary
          ? { backgroundColor: PRIMARY, color: "#FFFFFF" }
          : {
              backgroundColor: PRIMARY_SOFT,
              color: PRIMARY,
              border: `1px solid ${PRIMARY}33`,
            }
      }
      onMouseEnter={(e) => {
        if (disabled || !isPrimary) return;
        e.currentTarget.style.backgroundColor = PRIMARY_DARK;
      }}
      onMouseLeave={(e) => {
        if (!isPrimary) return;
        e.currentTarget.style.backgroundColor = PRIMARY;
      }}
    >
      <span className="flex-1 text-left">{children}</span>
      <span
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: isPrimary
            ? "rgba(255,255,255,0.22)"
            : "rgba(55,104,199,0.15)",
        }}
        aria-hidden
      >
        <MaterialIcon
          name="arrow_forward"
          size={18}
          style={{ color: isPrimary ? "#FFFFFF" : PRIMARY }}
        />
      </span>
    </button>
  );
}

/**
 * 會員：從本站訂單選擇 eSIM 綁定（不需手打 ICCID）
 */
export default function PushMemberEsimBind({
  esims = [],
  onBound,
  onManualIccid,
  className = "",
}) {
  const { token } = useUser();
  const [selected, setSelected] = useState(esims[0]?.topupId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBind = async (topupIdOverride) => {
    setError("");
    setLoading(true);
    try {
      const endpoint = await getPushEndpoint();
      if (!endpoint) throw new Error("請先開啟流量提醒通知");

      const tid = topupIdOverride || selected;
      const res = await fetch("/api/push/auto-bind-member", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(token),
        body: JSON.stringify({ endpoint, topupId: tid || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.hint || "綁定失敗");

      if (data.iccid) localStorage.setItem(ICCID_STORAGE_KEY, data.iccid);
      onBound?.(data);
    } catch (e) {
      setError(e.message || "綁定失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${className}`}
      style={{
        borderColor: LINE,
        backgroundColor: PRIMARY_SOFT,
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <MaterialIcon
            name="verified_user"
            size={22}
            style={{ color: PRIMARY }}
          />
        </div>
        <div>
          <p className="font-bold text-stone-900 text-sm">會員快速綁定</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: MUTED }}>
            已偵測到您在本站購買的 eSIM，可直接選擇方案綁定，
            <strong style={{ color: PRIMARY }}>無需輸入 ICCID</strong>。
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
        {esims.map((esim) => {
          const active = selected === esim.topupId;
          return (
            <label
              key={esim.topupId}
              className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors bg-white"
              style={{
                borderColor: active ? PRIMARY : LINE,
                boxShadow: active ? "0 1px 4px rgba(55,104,199,0.12)" : "none",
              }}
            >
              <input
                type="radio"
                name="member-esim"
                value={esim.topupId}
                checked={active}
                onChange={() => setSelected(esim.topupId)}
                className="mt-1 accent-[#3768C7]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-stone-900 truncate">
                  {esim.productName}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                  訂單 {String(esim.orderId || "").slice(0, 8)}… · Topup{" "}
                  {esim.topupId}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
          <MaterialIcon name="error" size={16} />
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        <PillButton
          disabled={loading || !selected}
          onClick={() => handleBind()}
        >
          {loading ? "綁定中…" : "綁定所選 eSIM"}
        </PillButton>
        {esims.length > 1 && (
          <PillButton
            variant="secondary"
            disabled={loading}
            onClick={() => handleBind(esims[0].topupId)}
          >
            綁定最新一筆
          </PillButton>
        )}
      </div>

      <button
        type="button"
        onClick={onManualIccid}
        className="mt-3 text-xs hover:underline w-full text-left"
        style={{ color: MUTED }}
      >
        非使用會員購買？改用手動輸入 ICCID
      </button>
    </div>
  );
}
