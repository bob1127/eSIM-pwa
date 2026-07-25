"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function getArticleShareUrl() {
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw"
  ).replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const path = window.location.pathname || "";
    if (path.startsWith("/blog/") && path.length > "/blog/".length) {
      return `${site}${path}`;
    }
    // 非文章頁：分享當前正式站對應路徑
    if (path && path !== "/") return `${site}${path}`;
  }
  return site;
}

function getShareTitle() {
  if (typeof document !== "undefined" && document.title) {
    return document.title.replace(/\s*\|\s*.*$/, "").trim() || document.title;
  }
  return "Jeko eSIM";
}

/**
 * 右下角：Go Top + hover 展開三個白色分享鈕
 */
export default function SmartWizardFloat() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setMounted(true);
    const getScrollY = () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const onScroll = () => setVisible(getScrollY() > 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  const openShareWindow = (href) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=640");
  };

  const shareFacebook = (e) => {
    e.stopPropagation();
    const url = getArticleShareUrl();
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    );
  };

  const shareLine = (e) => {
    e.stopPropagation();
    const url = getArticleShareUrl();
    openShareWindow(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`
    );
  };

  const shareInstagram = async (e) => {
    e.stopPropagation();
    const url = getArticleShareUrl();
    const title = getShareTitle();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("連結已複製，可貼到 IG");
    } catch {
      showToast("請手動複製網址");
    }
  };

  if (!mounted) return null;

  const shareBtns = [
    {
      key: "ig",
      label: "IG",
      onClick: shareInstagram,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      key: "fb",
      label: "FB",
      onClick: shareFacebook,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      key: "line",
      label: "LINE",
      onClick: shareLine,
      icon: (
        <span className="w-3.5 h-3.5 rounded-full bg-current/20 text-[8px] font-black flex items-center justify-center leading-none">
          L
        </span>
      ),
    },
  ];

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.92 }}
          style={{ zIndex: 1000000 }}
          className="fixed right-4 bottom-[13.5rem] md:right-6 md:bottom-24 flex flex-col items-end gap-2"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* hover 展開：三個白色分享鈕（向上堆疊） */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-end gap-2 overflow-hidden"
              >
                {shareBtns.map((btn, i) => (
                  <motion.button
                    key={btn.key}
                    type="button"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ delay: i * 0.04, duration: 0.18 }}
                    onClick={btn.onClick}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white border border-[#e8e8e8] text-[#555] text-[11px] font-bold shadow-md hover:border-[#0A6CD0] hover:text-[#0A6CD0] active:scale-95 transition-colors"
                  >
                    {btn.icon}
                    {btn.label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 主鈕：預設白／hover 藍底白字，並略加長 */}
          <motion.button
            type="button"
            onClick={goTop}
            aria-label="回到頂部／分享"
            title="回到頂部"
            animate={{
              width: hovered ? 112 : 48,
              backgroundColor: hovered ? "#0A6CD0" : "#ffffff",
              color: hovered ? "#ffffff" : "#666666",
              borderColor: hovered ? "#0A6CD0" : "#e5e5e5",
            }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="h-12 rounded-full border shadow-lg flex items-center justify-center gap-1 overflow-hidden"
          >
            {hovered ? (
              <>
                <Share2 size={15} strokeWidth={2.25} className="shrink-0" />
                <span className="text-[11px] font-bold tracking-wide whitespace-nowrap">
                  Top
                </span>
                <ChevronUp size={16} strokeWidth={2.5} className="shrink-0" />
              </>
            ) : (
              <span className="flex flex-col items-center leading-none">
                <span className="text-[10px] font-bold tracking-wide">Top</span>
                <ChevronUp size={18} strokeWidth={2.5} className="-mt-0.5" />
              </span>
            )}
          </motion.button>

          {toast && (
            <span className="absolute right-0 -top-8 whitespace-nowrap text-[11px] text-[#0A6CD0] bg-white border border-blue-100 rounded-md px-2 py-1 shadow-sm">
              {toast}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
