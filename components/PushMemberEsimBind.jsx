"use client";

import { useState, useEffect } from "react";
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
 * 第二層：會員從本站訂單選擇 eSIM 綁定（圖二）
 * 一次只能綁一張；已綁定方案會注記
 */
export default function PushMemberEsimBind({
  esims = [],
  onBound,
  onUnbind,
  unbinding = false,
  onManualIccid,
  onBack,
  boundTopupId = null,
  /** 從查詢用量頁帶入時預選 */
  initialSelectedTopupId = null,
  className = "",
  initialError = "",
  /** 本機假資料：不打真實 API，直接模擬綁定成功 */
  demoMode = false,
  /** 假資料下模擬綁定失敗 */
  demoForceFail = false,
}) {
  const { token } = useUser();
  const defaultSelected =
    (initialSelectedTopupId &&
      esims.some((e) => e.topupId === initialSelectedTopupId) &&
      initialSelectedTopupId) ||
    (boundTopupId && esims.some((e) => e.topupId === boundTopupId)
      ? boundTopupId
      : esims[0]?.topupId || "");
  const [selected, setSelected] = useState(defaultSelected);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    setError(initialError || "");
  }, [initialError]);

  useEffect(() => {
    if (!esims.length) return;
    setSelected((prev) => {
      if (
        initialSelectedTopupId &&
        esims.some((e) => e.topupId === initialSelectedTopupId)
      ) {
        return initialSelectedTopupId;
      }
      if (prev && esims.some((e) => e.topupId === prev)) return prev;
      if (boundTopupId && esims.some((e) => e.topupId === boundTopupId)) {
        return boundTopupId;
      }
      return esims[0].topupId;
    });
  }, [esims, boundTopupId, initialSelectedTopupId]);

  const handleBind = async () => {
    setError("");
    setLoading(true);
    try {
      if (boundTopupId && selected === boundTopupId) {
        throw new Error("此方案已綁定監控中。若要換卡，請先取消綁定。");
      }

      if (demoMode) {
        await new Promise((r) => setTimeout(r, 400));
        if (demoForceFail) {
          throw new Error(initialError || "① 綁定失敗");
        }
        const esim = esims.find((e) => e.topupId === selected) || esims[0];
        if (!esim) throw new Error("請選擇 eSIM");
        onBound?.({
          success: true,
          productName: esim.productName,
          topupId: esim.topupId,
          iccid: esim.iccid || null,
          bindMethod: "member_order",
          boundAt: new Date().toISOString(),
          message: `（假資料）已綁定「${esim.productName}」`,
        });
        return;
      }

      const endpoint = await getPushEndpoint();
      if (!endpoint) throw new Error("請先開啟流量提醒通知");

      const res = await fetch("/api/push/auto-bind-member", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(token),
        body: JSON.stringify({ endpoint, topupId: selected || undefined }),
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
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-stone-700 hover:text-stone-900"
        >
          <MaterialIcon name="arrow_back" size={18} />
          回到上一層
        </button>
      ) : null}

      <div className="flex items-start gap-3 mb-3">
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
            <span className="block mt-1 font-bold text-stone-700">
              一次只能綁定一張做流量提醒。
            </span>
            {demoMode ? (
              <span className="block mt-1 font-bold text-amber-700">
                假資料預覽：綁定不會打真實 API。
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
        {esims.map((esim) => {
          const active = selected === esim.topupId;
          const isCurrentBound = boundTopupId === esim.topupId;
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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-stone-900 truncate">
                    {esim.productName}
                  </p>
                  {isCurrentBound ? (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      監控中
                    </span>
                  ) : null}
                </div>
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

      <PillButton
        disabled={loading || !selected || selected === boundTopupId}
        onClick={handleBind}
      >
        {loading
          ? "綁定中…"
          : selected === boundTopupId
            ? "此方案已綁定"
            : "綁定所選 eSIM"}
      </PillButton>

      {boundTopupId && onUnbind ? (
        <button
          type="button"
          disabled={unbinding || loading}
          onClick={onUnbind}
          className="mt-3 w-full rounded-full border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          {unbinding ? "取消中…" : "取消綁定"}
        </button>
      ) : null}

      {onManualIccid ? (
        <button
          type="button"
          onClick={onManualIccid}
          className="mt-3 text-xs hover:underline w-full text-left"
          style={{ color: MUTED }}
        >
          非使用會員購買？改用手動輸入 ICCID
        </button>
      ) : null}
    </div>
  );
}
