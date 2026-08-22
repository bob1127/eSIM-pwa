"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import MaterialIcon from "./MaterialIcon";
import { QuarterRing } from "@/components/ui/QuarterRing";
import { useUser } from "./context/UserContext";
import {
  getPushEndpoint,
  isValidIccid,
  normalizeIccid,
  ICCID_STORAGE_KEY,
} from "../lib/pushBind";
import {
  subscribeToPush,
  PUSH_TEST_ICCID,
  isPushTestMode,
} from "../lib/pushSubscribe";
import { buildLoginUrl } from "../lib/authRedirect";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * 訪客：直接顯示 ICCID 欄位，一鍵完成「開推播 + 綁定 ICCID」
 */
export default function GuestPushBindForm({
  onBound,
  initialIccid = "",
  className = "",
  embedded = false,
  variant = "guest",
}) {
  const { token } = useUser();
  const router = useRouter();
  const loginHref = buildLoginUrl(router.asPath?.split("?")[0] || "/data-query");
  const [iccid, setIccid] = useState(initialIccid);
  const [loading, setLoading] = useState(false);
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const normalized = normalizeIccid(iccid);
    if (!isValidIccid(normalized)) {
      setError("請輸入 18～22 碼數字的 ICCID");
      return;
    }

    setLoading(true);
    setStepLabel("準備中");
    try {
      let endpoint = await getPushEndpoint();
      if (!endpoint) {
        setStepLabel("開啟推播");
        await subscribeToPush({
          token,
          onStep: setStepLabel,
        });
        endpoint = await getPushEndpoint();
        if (!endpoint) {
          throw new Error("推播訂閱完成但找不到 endpoint，請重新整理後再試");
        }
      }

      setStepLabel("綁定 ICCID");
      const res = await fetch("/api/push/bind-esim", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(token),
        body: JSON.stringify({ endpoint, iccid: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || data.hint || "綁定失敗");
      }

      localStorage.setItem(ICCID_STORAGE_KEY, normalized);
      setMessage("已啟用！流量偏低時將推播通知您");
      onBound?.(data);
    } catch (err) {
      setError(err.message || "啟用失敗，請稍後再試");
    } finally {
      setLoading(false);
      setStepLabel("");
    }
  };

  const fillTestIccid = () => setIccid(PUSH_TEST_ICCID);
  const isMember = variant === "member";

  return (
    <div
      className={
        embedded
          ? `bg-white px-5 sm:px-8 py-5 sm:py-6 ${className}`
          : `rounded-2xl border border-[#1d5cc5]/25 bg-white p-5 sm:p-6 shadow-sm ${className}`
      }
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isMember ? "bg-blue-100" : "bg-amber-100"
          }`}
        >
          <MaterialIcon
            name={isMember ? "person" : "person_off"}
            size={20}
            className={isMember ? "text-[#1d5cc5]" : "text-amber-700"}
          />
        </div>
        <div>
          <p className="font-bold text-stone-900 text-sm">
            {isMember ? "會員模式 · 手動綁定 ICCID" : "訪客模式 · 尚未加入會員"}
          </p>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            {isMember ? (
              <>
                系統找不到您在本站的 eSIM 訂單。請輸入 eSIM 的 ICCID，點下方按鈕後會
                <strong className="text-stone-700">一併開啟瀏覽器推播</strong>
                並完成綁定。
              </>
            ) : (
              <>
                請輸入 eSIM 的 ICCID，點下方按鈕後會
                <strong className="text-stone-700">一併開啟瀏覽器推播</strong>
                並完成綁定（僅需設定一次）。
              </>
            )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-stone-700 mb-1.5 block">
            eSIM ICCID <span className="text-red-500">*</span>
          </span>
          <div className="flex items-center bg-stone-50 rounded-xl border border-stone-200 px-4 py-3 focus-within:border-[#1d5cc5] focus-within:ring-2 focus-within:ring-[#1d5cc5]/20">
            <MaterialIcon
              name="sim_card"
              size={20}
              className="text-stone-400 shrink-0 mr-3"
            />
            <input
              type="text"
              inputMode="numeric"
              value={iccid}
              onChange={(e) => setIccid(e.target.value)}
              placeholder="輸入 ICCID（19～20 碼）"
              className="flex-1 bg-transparent border-none outline-none text-stone-800 placeholder-stone-400 text-sm min-w-0"
              autoComplete="off"
            />
          </div>
        </label>

        <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5 text-[11px] text-stone-600 leading-relaxed">
          <p className="font-bold text-stone-700 mb-1">ICCID 哪裡找？</p>
          <p>iPhone：設定 → 行動服務 → eSIM →「數字服務 ID」</p>
          <p>Android：設定 → 網路和網際網路 → SIM → ICCID</p>
        </div>

        {isPushTestMode() && (
          <div className="rounded-xl bg-violet-50 border border-violet-200 px-3 py-2.5 text-[11px] text-violet-900">
            <p className="font-bold mb-1">開發測試（無正式 eSIM 時）</p>
            <p className="mb-2">
              綁定流程僅檢查 ICCID 格式，可用測試碼驗證推播與綁定（無法查真實流量）。
            </p>
            <button
              type="button"
              onClick={fillTestIccid}
              className="text-xs font-bold text-violet-700 underline underline-offset-2"
            >
              填入測試 ICCID：{PUSH_TEST_ICCID}
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 font-medium flex items-center gap-1">
            <MaterialIcon name="error" size={16} />
            {error}
          </p>
        )}
        {message && (
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <MaterialIcon name="check_circle" size={16} filled />
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1d5cc5] hover:bg-[#174da8] disabled:opacity-60 text-white font-bold py-3.5 rounded-full transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <MaterialIcon name="notifications_active" size={18} />
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <QuarterRing size="xs" className="text-white" />
              <span className="text-white">
                {stepLabel ? `${stepLabel}…` : "處理中…"}
              </span>
            </span>
          ) : isMember ? (
            "開啟推播並綁定 ICCID"
          ) : (
            "留下 ICCID 並啟用流量提醒"
          )}
          {!loading && <MaterialIcon name="arrow_forward" size={18} />}
        </button>
      </form>

      {!isMember && (
        <p className="mt-4 text-[11px] text-stone-500 text-center">
          曾在本站購買？{" "}
          <Link href={loginHref} className="font-bold text-[#1d5cc5] hover:underline">
            登入會員
          </Link>{" "}
          可一鍵綁定訂單，無需手動輸入 ICCID
        </p>
      )}
    </div>
  );
}
