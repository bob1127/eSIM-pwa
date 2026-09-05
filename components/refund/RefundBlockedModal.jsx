"use client";

import { ACCOUNT_UI } from "@/lib/accountUi";
import { CONTACT_INFO } from "@/lib/contactUi";
import Link from "next/link";

/** 無法線上申請退款時的說明（含濫用上限 → 官方 LINE） */
export default function RefundBlockedModal({
  title = "無法申請退款",
  message,
  footnote,
  showLineCta = false,
  lineUrl,
  onClose,
}) {
  const tip =
    footnote === null
      ? null
      : footnote ||
        (showLineCta
          ? null
          : "若為連線／設定問題，請先查看安裝指南或聯絡客服。");
  const oaUrl = lineUrl || CONTACT_INFO.lineUrl;

  return (
    <div className={ACCOUNT_UI.modalOverlayBottom} role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide">
              退款防呆
            </p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-[24px] leading-none px-1"
            aria-label="關閉"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
          {tip ? (
            <p className="text-xs text-slate-500 leading-relaxed">{tip}</p>
          ) : null}
          {showLineCta && oaUrl ? (
            <a
              href={oaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#067A38] text-white text-sm font-bold hover:bg-[#056B30] transition"
            >
              透過官方 LINE 申請人工審核
            </a>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/refund-policy"
              target="_blank"
              className="text-sm font-bold text-[#1E4AD1] hover:underline"
            >
              查看退換貨政策
            </Link>
            {!showLineCta ? (
              <Link
                href="/contact"
                className="text-sm font-bold text-slate-600 hover:underline"
              >
                聯絡客服
              </Link>
            ) : null}
          </div>
        </div>
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}

/** 將 precheck／request 回傳對應到 modal props */
export function refundBlockedFromApi(data = {}) {
  if (data.blocked === "abuse" || data.code === "REFUND_ABUSE_LIMIT") {
    return {
      title: "線上退款暫時關閉",
      message: data.message || "近期核准退款次數已達上限，請改由官方 LINE 人工申請。",
      showLineCta: true,
      lineUrl: data.lineUrl || CONTACT_INFO.lineUrl,
      footnote: null,
    };
  }
  if (data.blocked === "native" || data.code === "NATIVE_ESIM") {
    return {
      title: "原生 eSIM 無法申請退款",
      message: data.message || "原生 eSIM 售出後概不退款。",
      showLineCta: false,
    };
  }
  return {
    title: "目前無法申請退款",
    message: data.message || data.error || "此訂單不符合退款條件。",
    showLineCta: Boolean(data.showLineCta),
    lineUrl: data.lineUrl,
  };
}
