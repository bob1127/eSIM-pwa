"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const TOAST_Z = 10200;
const DEFAULT_SUCCESS_MS = 4000;

export type SaveFeedbackState = {
  status: "success" | "error";
  title: string;
  description?: string;
} | null;

/** 儲存中 Badge（Spinner + 文字） */
export function SaveSpinnerBadge({
  label = "儲存中…",
  variant = "secondary",
  className,
}: {
  label?: string;
  variant?: "default" | "secondary" | "outline" | "destructive" | "success";
  className?: string;
}) {
  return (
    <Badge variant={variant} className={className} aria-live="polite">
      <Spinner data-icon="inline-start" className="size-3" />
      {label}
    </Badge>
  );
}

/** 放在按鈕內：儲存中顯示 Spinner，否則顯示原內容 */
export function SaveButtonContent({
  saving,
  savingLabel = "儲存中…",
  children,
}: {
  saving?: boolean;
  savingLabel?: string;
  children: ReactNode;
}) {
  if (saving) {
    return (
      <>
        <Spinner data-icon="inline-start" className="size-3.5" />
        {savingLabel}
      </>
    );
  }
  return children;
}

/** 表單下方／區塊內：儲存成功或失敗提示 */
export function SaveFeedbackAlert({
  feedback,
  className,
  onDismiss,
}: {
  feedback?: SaveFeedbackState;
  className?: string;
  onDismiss?: () => void;
}) {
  if (!feedback) return null;
  const isError = feedback.status === "error";

  return (
    <Alert
      variant={isError ? "destructive" : "default"}
      className={cn(
        "relative max-w-md",
        !isError &&
          "border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600",
        className,
      )}
    >
      {isError ? (
        <AlertCircle className="size-4" />
      ) : (
        <CheckCircle2 className="size-4" />
      )}
      <AlertTitle>{feedback.title}</AlertTitle>
      {feedback.description ? (
        <AlertDescription>{feedback.description}</AlertDescription>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 rounded-md p-0.5 text-current/50 hover:text-current"
          aria-label="關閉提示"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </Alert>
  );
}

/** 畫面頂部浮動提示（Dialog／全頁儲存） */
export function SaveFeedbackToast({
  feedback,
  onDismiss,
  className,
}: {
  feedback?: SaveFeedbackState;
  onDismiss?: () => void;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!feedback || feedback.status !== "success" || !onDismiss) return undefined;
    const t = window.setTimeout(onDismiss, DEFAULT_SUCCESS_MS);
    return () => window.clearTimeout(t);
  }, [feedback, onDismiss]);

  if (!feedback || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed top-5 left-1/2 z-[10200] w-[min(92vw,24rem)] -translate-x-1/2 pointer-events-none",
        className,
      )}
      style={{ zIndex: TOAST_Z }}
    >
      <div className="pointer-events-auto">
        <SaveFeedbackAlert feedback={feedback} onDismiss={onDismiss} />
      </div>
    </div>,
    document.body,
  );
}

/**
 * 統一儲存狀態：saving、feedback、runSave()
 */
export function useSaveFeedback(options: { successAutoDismissMs?: number } = {}) {
  const successAutoDismissMs =
    options.successAutoDismissMs ?? DEFAULT_SUCCESS_MS;
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<SaveFeedbackState>(null);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  const showSuccess = useCallback(
    (title: string, description?: string) => {
      setFeedback({ status: "success", title, description });
      window.setTimeout(() => setFeedback(null), successAutoDismissMs);
    },
    [successAutoDismissMs],
  );

  const showError = useCallback((title: string, description?: string) => {
    setFeedback({ status: "error", title, description });
  }, []);

  const runSave = useCallback(
    async (
      action: () => Promise<void>,
      messages?: {
        successTitle?: string;
        successDescription?: string;
        errorTitle?: string;
      },
    ) => {
      setSaving(true);
      setFeedback(null);
      try {
        await action();
        showSuccess(
          messages?.successTitle ?? "儲存成功",
          messages?.successDescription,
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : typeof err === "string" ? err : "請稍後再試";
        showError(messages?.errorTitle ?? "儲存失敗", msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [showError, showSuccess],
  );

  return {
    saving,
    setSaving,
    feedback,
    setFeedback,
    clearFeedback,
    showSuccess,
    showError,
    runSave,
  };
}
