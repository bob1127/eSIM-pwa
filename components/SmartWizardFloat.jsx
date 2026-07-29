"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SOCIAL_LINKS } from "@/lib/seo.config";
import {
  FacebookIconSvg,
  InstagramIconSvg,
  LineIconSvg,
} from "@/components/social/SocialBrandIcons";

/**
 * 右下角：社群膠囊（IG／FB／LINE 品牌色）+ Top
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
      icon: <InstagramIconSvg className="w-3.5 h-3.5" />,
      className:
        "text-white shadow-md hover:brightness-110 active:scale-95 border-0",
      style: {
        backgroundImage:
          "linear-gradient(45deg, #f9ce34 0%, #ee2a7b 45%, #6228d7 100%)",
      },
    },
    {
      key: "fb",
      label: "FB",
      href: SOCIAL_LINKS.facebook || null,
      icon: <FacebookIconSvg className="w-3.5 h-3.5" />,
      className:
        "bg-[#1877F2] text-white shadow-md hover:brightness-110 active:scale-95 border-0",
      style: undefined,
    },
    {
      key: "line",
      label: "LINE",
      href: SOCIAL_LINKS.line || null,
      icon: <LineIconSvg className="w-4 h-4" />,
      className:
        "bg-[#06C755] text-white shadow-md hover:brightness-110 active:scale-95 border-0",
      style: undefined,
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
                    className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[11px] font-bold transition ${btn.className}`}
                    style={btn.style}
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
              backgroundColor: hovered ? "#1E4AD1" : "#ffffff",
              color: hovered ? "#ffffff" : "#666666",
              borderColor: hovered ? "#1E4AD1" : "#e5e5e5",
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
