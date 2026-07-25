"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SOCIAL_LINKS } from "@/lib/seo.config";

/**
 * 右下角：Go Top + hover 展開三個白色社群連結（連到官方 IG／FB／LINE）
 */
export default function SmartWizardFloat() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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

    const onChatVisibility = (e) => {
      setChatOpen(Boolean(e?.detail?.open));
    };
    window.addEventListener("jeko:ai-chat-visibility", onChatVisibility);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("jeko:ai-chat-visibility", onChatVisibility);
    };
  }, []);

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  if (!mounted) return null;

  const socialBtns = [
    {
      key: "ig",
      label: "IG",
      href: SOCIAL_LINKS.instagram || SOCIAL_LINKS.instagram2 || null,
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      key: "fb",
      label: "FB",
      href: SOCIAL_LINKS.facebook || null,
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      key: "line",
      label: "LINE",
      href: SOCIAL_LINKS.line || null,
      icon: (
        <span className="w-3.5 h-3.5 rounded-full bg-current/20 text-[8px] font-black flex items-center justify-center leading-none">
          L
        </span>
      ),
    },
  ].filter((btn) => Boolean(btn.href));

  return createPortal(
    <AnimatePresence>
      {visible && !chatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.92 }}
          style={{ zIndex: 9000 }}
          className="fixed right-4 bottom-[13.5rem] md:right-6 md:bottom-24 flex flex-col items-end gap-2"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <AnimatePresence>
            {hovered && socialBtns.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-end gap-2 overflow-hidden"
              >
                {socialBtns.map((btn, i) => (
                  <motion.a
                    key={btn.key}
                    href={btn.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ delay: i * 0.04, duration: 0.18 }}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white border border-[#e8e8e8] text-[#555] text-[11px] font-bold shadow-md hover:border-[#0A6CD0] hover:text-[#0A6CD0] active:scale-95 transition-colors"
                    aria-label={`前往 Jeko ${btn.label}`}
                  >
                    {btn.icon}
                    {btn.label}
                  </motion.a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={goTop}
            aria-label="回到頂部"
            title="回到頂部"
            animate={{
              width: hovered ? 96 : 48,
              backgroundColor: hovered ? "#0A6CD0" : "#ffffff",
              color: hovered ? "#ffffff" : "#666666",
              borderColor: hovered ? "#0A6CD0" : "#e5e5e5",
            }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="h-12 rounded-full border shadow-lg flex items-center justify-center gap-1 overflow-hidden"
          >
            {hovered ? (
              <>
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
