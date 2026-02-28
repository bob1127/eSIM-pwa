"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";

/**
 * ⚠️ 保留原本的過場／下拉動畫設定
 */
const transition = {
  type: "spring",
  mass: 0.5,
  damping: 12,
  stiffness: 120,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  href, // ✅ NEW
  children,
  dropdownSizeClass = "min-w-[560px] max-w-[720px]",
  offsetXClass = "-ml-10 md:-ml-[200px]",
}: {
  setActive: (item: string | null) => void;
  active: string | null;
  item: string;
  href?: string; // ✅ NEW
  children?: React.ReactNode;
  dropdownSizeClass?: string;
  offsetXClass?: string;
}) => {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      {/* ✅ 觸發文字：支援點擊導頁（若有 href） */}
      {href ? (
        <Link href={href} onClick={() => setActive(null)} className="block">
          <motion.p
            transition={{ duration: 0.2 }}
            className={[
              "cursor-pointer select-none",
              "text-[13px] md:text-[14px] font-medium",
              "text-black/90 hover:text-black",
              "px-3 py-2 rounded-full",
              "hover:bg-white/50",
              // ✅ 防止 link 預設底線/顏色
              "no-underline decoration-transparent",
            ].join(" ")}
          >
            {item}
          </motion.p>
        </Link>
      ) : (
        <motion.p
          transition={{ duration: 0.2 }}
          className={[
            "cursor-pointer select-none",
            "text-[13px] md:text-[14px] font-medium",
            "text-black/90 hover:text-black",
            "px-3 py-2 rounded-full",
            "hover:bg-white/50",
          ].join(" ")}
        >
          {item}
        </motion.p>
      )}

      {/* 下拉內容（保持原動畫 & layoutId） */}
      {active === item && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={transition}
          className={`absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 ${offsetXClass}`}
        >
          {/* ✅ hover bridge：補上 item 與面板之間的空隙（不影響外觀） */}
          <div className="absolute -top-6 left-0 right-0 h-6" />

          <motion.div
            layoutId="active"
            transition={transition}
            className={[
              "rounded-2xl overflow-hidden shadow-2xl",
              "border border-black/10",
              "bg-white/95 backdrop-blur-md dark:bg-neutral-900/90",
            ].join(" ")}
          >
            <div className={`${dropdownSizeClass} p-5 md:p-6`}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className={[
        "relative z-50",
        "flex items-center justify-center gap-0",
        "px-2 py-1",
      ].join(" ")}
    >
      {children}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  src,
}: {
  title: string;
  description: string;
  href: string;
  src: string;
}) => {
  return (
    <a
      href={href}
      className="flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg p-2 transition"
    >
      <img
        src={src}
        width={120}
        height={80}
        alt={title}
        className="rounded-md object-cover shadow-md"
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm md:text-base font-semibold text-black dark:text-white truncate">
          {title}
        </h4>
        <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
          {description}
        </p>
      </div>
    </a>
  );
};

export const HoveredLink = ({
  children,
  className = "",
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  return (
    <a
      {...rest}
      className={[
        "text-neutral-700 dark:text-neutral-200",
        "hover:text-black dark:hover:text-white transition",
        className,
      ].join(" ")}
    >
      {children}
    </a>
  );
};
