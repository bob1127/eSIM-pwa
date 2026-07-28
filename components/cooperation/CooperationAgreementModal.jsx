"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import {
  TERMS_COMMON,
  TERMS_BY_MODE,
  TERMS_VERSION,
} from "@/lib/cooperationTermsContent";

const SCROLL_BOTTOM_THRESHOLD_PX = 24;

/**
 * 申請流程用「合作須知」彈窗：強制捲到底部才能點擊同意（scroll-wrap）。
 * 同意時會回傳 { version, agreedAt, mode } 給呼叫端存證（見 register-distributor.jsx）。
 */
export default function CooperationAgreementModal({
  open,
  mode = "referral",
  onAgree,
  onClose,
}) {
  const [reachedBottom, setReachedBottom] = useState(false);
  const bodyRef = useRef(null);
  const detail = TERMS_BY_MODE[mode] || TERMS_BY_MODE.referral;

  useEffect(() => {
    if (!open) return undefined;
    setReachedBottom(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mode]);

  // 內容若不夠長本來就不會出現捲軸，直接視為已讀到底
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + SCROLL_BOTTOM_THRESHOLD_PX) {
      setReachedBottom(true);
    }
  }, [open, mode]);

  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el || reachedBottom) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom <= SCROLL_BOTTOM_THRESHOLD_PX) {
      setReachedBottom(true);
    }
  };

  const handleAgree = () => {
    if (!reachedBottom) return;
    onAgree?.({
      version: TERMS_VERSION,
      agreedAt: new Date().toISOString(),
      mode,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="關閉背景"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coop-agreement-title"
            className="relative z-10 flex w-full max-w-[560px] max-h-[90vh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.32)]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 md:px-6 md:pt-6 shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.16em] text-[#1a56db] mb-1.5">
                  合作須知・{detail.label}模式
                </p>
                <h3
                  id="coop-agreement-title"
                  className="text-[19px] md:text-[21px] font-black text-slate-900 tracking-wide"
                >
                  請詳閱以下內容至頁尾
                </h3>
                <p className="mt-1.5 text-[12px] text-slate-500 leading-relaxed">
                  送出申請前，請完整閱讀合作條款；捲動到底部後才能按下同意。
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                aria-label="關閉"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div
              ref={bodyRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-5 pb-2 md:px-6 space-y-5"
            >
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-[#F7FAFF] to-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1a56db] mb-1">
                  {detail.label}網址
                </p>
                <code className="text-[13px] font-semibold text-slate-800 break-all">
                  {detail.urlHint}
                </code>
              </div>

              <div>
                <h4 className="text-[14px] font-black text-slate-900 mb-3">
                  {detail.label}特別約定
                </h4>
                <ul className="space-y-2.5">
                  {detail.items.map((text) => (
                    <li
                      key={text}
                      className="flex gap-2.5 text-[13px] leading-relaxed text-slate-600"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F2CC40]" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <h4 className="text-[14px] font-black text-slate-900 mb-3 mt-4">
                  共通約定
                </h4>
                <ul className="space-y-2.5">
                  {TERMS_COMMON.map((text) => (
                    <li
                      key={text}
                      className="flex gap-2.5 text-[13px] leading-relaxed text-slate-600"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F2CC40]" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[12px] text-slate-500 leading-relaxed pb-1">
                以上為摘要；完整條款（含付款、退款、免責與準據法）請見{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1a56db] font-bold underline"
                >
                  服務條款
                </Link>{" "}
                及{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1a56db] font-bold underline"
                >
                  隱私權政策
                </Link>
                。
              </p>

              {/* 到底標記：可視化「已讀完」，也讓 scrollHeight 有明確終點 */}
              <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 pb-4">
                <CheckCircleIcon className="h-4 w-4" />
                已閱讀至頁尾
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4 md:px-6">
              {!reachedBottom && (
                <p className="mb-2.5 text-center text-[11px] font-bold text-amber-600">
                  請先捲動閱讀至頁尾，才能點擊同意
                </p>
              )}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full px-4 py-3 text-[13px] font-bold text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={!reachedBottom}
                  onClick={handleAgree}
                  className="flex-[2] inline-flex items-center justify-center rounded-full bg-[#1a56db] hover:bg-[#0e3fae] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-[13px] tracking-wide px-6 py-3 shadow-md transition"
                >
                  我已閱讀，同意合作須知
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
