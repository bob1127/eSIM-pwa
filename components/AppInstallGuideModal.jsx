"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  detectInstallGuidePlatform,
  getInstallGuideMeta,
  getInstallGuideSteps,
} from "@/lib/appInstallGuide";
import { promptInstall, isPwaInstallAvailable } from "@/lib/pwaInstallPrompt";

/**
 * 依裝置顯示 APP 安裝圖文步驟
 * - 點擊圖片可放大／縮小
 * - 「下一步」切換步驟
 */
export default function AppInstallGuideModal({
  open,
  onClose,
  /** 覆寫自動偵測：ios | android | mac */
  platform: platformProp = null,
  /** Chromium 可一鍵安裝時顯示按鈕 */
  showOneClickInstall = true,
}) {
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState(platformProp || "android");
  const [stepIndex, setStepIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [canOneClick, setCanOneClick] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const p = platformProp || detectInstallGuidePlatform();
    setPlatform(p);
    setStepIndex(0);
    setZoomed(false);
    setCanOneClick(isPwaInstallAvailable());
  }, [open, platformProp]);

  const steps = getInstallGuideSteps(platform);
  const meta = getInstallGuideMeta(platform);
  const step = steps[stepIndex] || steps[0];
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= steps.length - 1;

  const goNext = useCallback(() => {
    setZoomed(false);
    if (isLast) {
      onClose?.();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [isLast, onClose, steps.length]);

  const goPrev = useCallback(() => {
    setZoomed(false);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleOneClick = async () => {
    if (!canOneClick) return;
    setInstalling(true);
    try {
      const { outcome } = await promptInstall();
      if (outcome === "accepted") {
        onClose?.();
        return;
      }
      // dismissed / unavailable：繼續看圖文教學
      setCanOneClick(isPwaInstallAvailable());
    } finally {
      setInstalling(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (zoomed) setZoomed(false);
        else onClose?.();
      }
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, zoomed, onClose, goNext, goPrev]);

  if (!mounted || !open || !step) return null;

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="app-install-guide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999999999999] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
          onClick={() => (zoomed ? setZoomed(false) : onClose?.())}
          role="dialog"
          aria-modal="true"
          aria-label={meta.title}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-md sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#0A6CD0]">
                    {platform === "ios" ||
                    platform === "ios-chrome" ||
                    platform === "ios-safari"
                      ? "iPhone / iPad"
                      : platform === "mac"
                        ? "Mac"
                        : "Android"}
                  </p>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5">
                    {meta.title}
                  </h2>
                  <p className="text-[12px] text-slate-500 mt-1 leading-snug">
                    {meta.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-lg font-bold hover:bg-slate-200"
                  aria-label="關閉"
                >
                  ×
                </button>
              </div>

              {showOneClickInstall && canOneClick && (
                <button
                  type="button"
                  disabled={installing}
                  onClick={handleOneClick}
                  className="mt-3 w-full rounded-xl bg-[#0A6CD0] hover:bg-[#0851A8] text-white text-sm font-bold py-3 disabled:opacity-60"
                >
                  {installing ? "開啟安裝視窗…" : "一鍵安裝（系統提示）"}
                </button>
              )}
            </div>

            {/* Step image */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
              <p className="text-[13px] font-bold text-slate-800 mb-1">
                {step.title}
              </p>
              <p className="text-[13px] text-slate-600 mb-3 leading-relaxed">
                {step.caption}
              </p>

              <button
                type="button"
                onClick={() => setZoomed(true)}
                className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm active:scale-[0.99] transition-transform focus:outline-none focus:ring-2 focus:ring-[#0A6CD0]/40"
                aria-label="點擊放大圖片"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step.src}
                  alt={step.caption}
                  className="w-full h-auto max-h-[48vh] object-contain mx-auto bg-white"
                />
                <span className="absolute bottom-2 right-2 rounded-full bg-black/65 text-white text-[10px] font-bold px-2.5 py-1">
                  點擊放大
                </span>
              </button>

              {/* Dots */}
              {steps.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-4">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`第 ${i + 1} 步`}
                      onClick={() => {
                        setZoomed(false);
                        setStepIndex(i);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        i === stepIndex
                          ? "w-6 bg-[#0A6CD0]"
                          : "w-2 bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 border-t border-slate-100 shrink-0 flex gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={isFirst}
                className="flex-1 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold py-3 disabled:opacity-35"
              >
                上一步
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex-[1.4] rounded-xl bg-[#0A6CD0] hover:bg-[#0851A8] text-white text-sm font-bold py-3"
              >
                {isLast ? meta.doneLabel : "下一步"}
              </button>
            </div>
          </motion.div>

          {/* Zoom lightbox */}
          <AnimatePresence>
            {zoomed && (
              <motion.div
                key="zoom"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999999999999] bg-black/92 flex flex-col"
                onClick={() => setZoomed(false)}
              >
                <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 text-white">
                  <p className="text-sm font-bold truncate pr-2">
                    {step.title} · {step.caption}
                  </p>
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold"
                    onClick={() => setZoomed(false)}
                  >
                    關閉
                  </button>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={step.src}
                    alt={step.caption}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goPrev();
                    }}
                    disabled={isFirst}
                    className="flex-1 rounded-xl bg-white/15 text-white text-sm font-bold py-3 disabled:opacity-35"
                  >
                    上一步
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext();
                    }}
                    className="flex-[1.4] rounded-xl bg-[#0A6CD0] text-white text-sm font-bold py-3"
                  >
                    {isLast ? meta.doneLabel : "下一步"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
