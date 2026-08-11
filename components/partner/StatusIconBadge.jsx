"use client";

import { useEffect, useRef, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { SHOPIFY_BADGE } from "@/lib/shopifyUi";

/** tone → Material icon（圖形為主，文字僅 hover／點擊顯示） */
const TONE_ICON = {
  success: { name: "check_circle", filled: true },
  warning: { name: "warning", filled: true },
  critical: { name: "error", filled: true },
  info: { name: "info", filled: true },
  neutral: { name: "cancel", filled: true },
};

/**
 * 狀態圖示：顯示圖形；hover 或點擊才浮出狀態文字。
 * @param {"success"|"warning"|"critical"|"info"|"neutral"} tone
 * @param {string} label 狀態文字（tooltip / aria）
 */
export default function StatusIconBadge({
  tone = "neutral",
  label = "",
  size = 22,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const t = SHOPIFY_BADGE[tone] || SHOPIFY_BADGE.neutral;
  const icon = TONE_ICON[tone] || TONE_ICON.neutral;
  const text = String(label || "").trim() || "狀態";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center p-0.5 rounded-full transition hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#458fff]/40"
        aria-label={text}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MaterialIcon
          name={icon.name}
          size={size}
          filled={icon.filled}
          style={{ color: t.dot }}
        />
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-1/2 bottom-full z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold text-white shadow-md pointer-events-none"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          {text}
          <span
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: "#1a1a1a" }}
            aria-hidden
          />
        </span>
      ) : null}
    </span>
  );
}
