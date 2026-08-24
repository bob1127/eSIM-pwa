"use client";

import { useEffect } from "react";
import { fireRibbonBurst } from "@/lib/fireCelebrationConfetti";

/**
 * 綁定成功彈窗（圖二：置中白卡 + 萊姆勾選 + Done）+ 緞帶
 */
export default function BindSuccessSheet({
  open,
  message,
  title = "綁定成功",
  doneLabel = "完成",
  onClose,
  onDone,
}) {
  useEffect(() => {
    if (!open) return;
    fireRibbonBurst();
  }, [open]);

  if (!open) return null;

  const finish = () => {
    (onDone || onClose)?.();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-5">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="關閉"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bind-success-title"
        className="relative z-[1] w-full max-w-[340px] animate-[bindSuccessPop_0.34s_cubic-bezier(0.32,0.72,0,1)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-1/2 top-0 z-[2] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#8A94A6] shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
          aria-label="關閉成功視窗"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="rounded-[32px] bg-white px-7 pb-7 pt-10 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.35)] text-center">
          <div className="relative mx-auto mb-5 flex h-[88px] w-[88px] items-center justify-center">
            {/* burst dots */}
            <span className="absolute -top-1 left-3 h-2 w-2 rounded-full bg-[#D7FF32]" />
            <span className="absolute top-2 -right-1 h-1.5 w-1.5 rounded-full bg-[#FADE2B]" />
            <span className="absolute bottom-3 -left-2 h-1.5 w-1.5 rounded-full bg-[#24A148]" />
            <span className="absolute -bottom-0.5 right-4 h-2 w-2 rounded-full bg-[#D7FF32]/80" />
            <ScallopedCheck />
          </div>

          <h2
            id="bind-success-title"
            className="text-[26px] font-black tracking-tight text-[#111111]"
          >
            {title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#8A94A6]">
            {message ||
              "流量提醒已開啟。剩餘流量偏低時，系統會自動通知您。"}
          </p>

          <button
            type="button"
            onClick={finish}
            className="mt-8 w-full rounded-full bg-[#2B2B2B] py-3.5 text-[15px] font-bold text-white hover:bg-black transition"
          >
            {doneLabel}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bindSuccessPop {
          from {
            transform: translateY(18px) scale(0.96);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function ScallopedCheck() {
  return (
    <svg
      width="88"
      height="88"
      viewBox="0 0 88 88"
      fill="none"
      aria-hidden
      className="relative z-[1]"
    >
      <path
        d="M44 6c4.2 0 6.2 2.4 9.2 3.4 3 .9 6.3-.2 8.8 1.6 2.5 1.8 2.8 5.1 4.8 7.4 2 2.4 5.2 3.2 6.4 6.1 1.2 2.9-.2 6.1.4 9.2.6 3.1 3.2 5.4 3.2 8.6s-2.6 5.5-3.2 8.6c-.6 3.1.8 6.3-.4 9.2-1.2 2.9-4.4 3.7-6.4 6.1-2 2.3-2.3 5.6-4.8 7.4-2.5 1.8-5.8.7-8.8 1.6-3 1-5 3.4-9.2 3.4s-6.2-2.4-9.2-3.4c-3-.9-6.3.2-8.8-1.6-2.5-1.8-2.8-5.1-4.8-7.4-2-2.4-5.2-3.2-6.4-6.1-1.2-2.9.2-6.1-.4-9.2C13.4 49.5 10.8 47.2 10.8 44s2.6-5.5 3.2-8.6c.6-3.1-.8-6.3.4-9.2 1.2-2.9 4.4-3.7 6.4-6.1 2-2.3 2.3-5.6 4.8-7.4 2.5-1.8 5.8-.7 8.8-1.6C37.8 8.4 39.8 6 44 6z"
        fill="#D7FF32"
      />
      <path
        d="M28.5 44.5l9.2 9.2 21.8-22"
        stroke="#111111"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
