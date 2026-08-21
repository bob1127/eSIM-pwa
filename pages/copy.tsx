/**
 * 郵件／手機一鍵複製中繼頁：/?t=要複製的文字
 * 開啟後自動寫入剪貼簿，方便從 Email「複製」按鈕跳轉。
 */
"use client";

import { useEffect, useMemo, useState } from "react";

export default function CopyPage() {
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const text = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("t") || "";
  }, []);

  useEffect(() => {
    if (!text) {
      setStatus("fail");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await navigator.clipboard.writeText(text);
        if (!cancelled) setStatus("ok");
      } catch {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          if (!cancelled) setStatus("ok");
        } catch {
          if (!cancelled) setStatus("fail");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <main className="min-h-[100dvh] bg-[#f4f4f4] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md bg-white rounded-xl px-6 py-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900 mb-2">
          {status === "ok"
            ? "已複製到剪貼簿"
            : status === "fail"
              ? "請手動複製"
              : "複製中…"}
        </h1>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          {status === "ok"
            ? "可返回郵件或設定頁貼上使用。"
            : "若未自動複製，請長按下方文字自行複製。"}
        </p>
        {text ? (
          <code className="block text-left text-[13px] font-mono text-slate-900 break-all bg-slate-50 rounded-lg p-4 leading-relaxed select-all">
            {text}
          </code>
        ) : null}
        <button
          type="button"
          className="mt-5 w-full rounded-lg bg-[#007bff] text-white font-semibold text-sm py-3"
          onClick={async () => {
            if (!text) return;
            try {
              await navigator.clipboard.writeText(text);
              setStatus("ok");
            } catch {
              setStatus("fail");
            }
          }}
        >
          再複製一次
        </button>
      </div>
    </main>
  );
}
