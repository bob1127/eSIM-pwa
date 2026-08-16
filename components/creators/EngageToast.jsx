"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useEngageToast() {
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  const showToast = useCallback((msg) => {
    const text = String(msg || "").trim();
    if (!text) return;
    setToast(text);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2800);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const toastNode = toast ? (
    <div
      role="status"
      className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[90] max-w-[min(92vw,360px)] px-4 py-2.5 rounded-full bg-slate-900 text-white text-[13px] font-bold text-center shadow-lg"
    >
      {toast}
    </div>
  ) : null;

  return { showToast, toastNode };
}
