"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fireCelebrationConfettiFromElement } from "@/lib/fireCelebrationConfetti";
import { cn } from "@/lib/utils";
import { QuarterRing } from "@/components/ui/QuarterRing";
import styles from "./ConfettiButton.module.css";

/**
 * 非同步操作成功後，從按鈕位置噴出慶祝彩帶。
 * onClick 若 throw，視為失敗並進入 error 狀態。
 */
export default function ConfettiButton({
  onClick,
  onSuccess,
  children = "送出",
  successLabel = "完成！",
  loadingLabel = "處理中...",
  errorLabel = "再試一次",
  resetAfter = 2200,
  successDelay = 700,
  confettiOpts,
  disabled = false,
  className = "",
  type = "button",
  ...rest
}) {
  const [phase, setPhase] = useState("idle");
  const btnRef = useRef(null);
  const resetTimer = useRef(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const fireConfetti = useCallback(() => {
    fireCelebrationConfettiFromElement(btnRef.current, confettiOpts);
  }, [confettiOpts]);

  const handleClick = useCallback(
    async (e) => {
      if (phase === "loading" || phase === "success" || disabled) return;

      setPhase("loading");
      if (resetTimer.current) clearTimeout(resetTimer.current);

      try {
        await onClick?.(e);
        setPhase("success");
        fireConfetti();

        if (onSuccess) {
          resetTimer.current = setTimeout(() => {
            onSuccess();
          }, successDelay);
        } else if (resetAfter) {
          resetTimer.current = setTimeout(() => setPhase("idle"), resetAfter);
        }
      } catch {
        setPhase("error");
        resetTimer.current = setTimeout(
          () => setPhase("idle"),
          resetAfter || 2200,
        );
      }
    },
    [
      phase,
      disabled,
      onClick,
      fireConfetti,
      onSuccess,
      successDelay,
      resetAfter,
    ],
  );

  const label =
    phase === "loading"
      ? loadingLabel
      : phase === "success"
        ? successLabel
        : phase === "error"
          ? errorLabel
          : children;

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled || phase === "loading" || phase === "success"}
      onClick={handleClick}
      className={cn(
        "cfb-btn",
        styles.btn,
        phase === "loading" && styles.loading,
        phase === "success" && styles.success,
        phase === "error" && styles.error,
        className,
      )}
      {...rest}
    >
      {phase === "loading" && (
        <QuarterRing size="sm" className="text-black" aria-hidden />
      )}
      {phase === "success" && (
        <svg
          className={styles.check}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
