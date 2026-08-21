"use client";

import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

const TONES = {
  brand: {
    primaryBg: "bg-[#1E4AD1]",
    primaryShadow:
      "md:shadow-[0_4px_14px_rgba(30,74,209,0.35)] md:hover:shadow-[0_6px_20px_rgba(30,74,209,0.45)]",
    primaryHover: "md:hover:-translate-y-0.5",
    secondaryBorder: "border-[#1E4AD1]",
    secondaryText: "text-[#1E4AD1]",
    secondaryHover: "hover:bg-[#EFF6FC]",
    chevronOnPrimary: "text-[#FADE2B] border-[#FADE2B]",
    chevronOnSecondary: "text-[#1E4AD1] border-[#1E4AD1] bg-[#FADE2B]",
  },
  line: {
    primaryBg: "bg-[#00C300]",
    primaryShadow:
      "md:shadow-[0_4px_14px_rgba(0,195,0,0.35)] md:hover:shadow-[0_6px_20px_rgba(0,195,0,0.45)]",
    primaryHover: "md:hover:-translate-y-0.5",
    secondaryBorder: "border-[#00C300]",
    secondaryText: "text-[#00C300]",
    secondaryHover: "hover:bg-[#E8FFE8]",
    chevronOnPrimary: "text-[#FADE2B] border-[#FADE2B]",
    chevronOnSecondary: "text-[#00C300] border-[#00C300] bg-[#FADE2B]",
  },
} as const;

export type JekoPillVariant = "primary" | "secondary";
export type JekoPillTone = keyof typeof TONES;
export type JekoPillSize = "md" | "sm";

export type JekoPillButtonProps = {
  children: ReactNode;
  variant?: JekoPillVariant;
  tone?: JekoPillTone;
  size?: JekoPillSize;
  href?: string;
  external?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
  showChevron?: boolean;
  fullWidth?: boolean;
};

/**
 * Jeko 膠囊 CTA（合作頁款式）
 * - primary：藍底白字＋右側黃圈箭頭
 * - secondary：白底藍框＋右側黃底藍箭頭
 */
export default function JekoPillButton({
  children,
  variant = "primary",
  tone = "brand",
  size = "md",
  href,
  external = false,
  type = "button",
  onClick,
  disabled = false,
  className = "",
  showChevron = true,
  fullWidth = true,
  ...rest
}: JekoPillButtonProps) {
  const t = TONES[tone] || TONES.brand;
  const isPrimary = variant === "primary";

  const sizeCls =
    size === "sm"
      ? "py-2.5 text-[13px] md:text-[14px] pr-12 pl-5"
      : "py-3.5 md:py-4 text-[15px] md:text-[16px] pr-14 pl-6";

  const chevronSize = size === "sm" ? "right-3.5 w-4 h-4" : "right-5 w-5 h-5";
  const iconCls = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  const enabledPrimary = `${t.primaryBg} text-white ${t.primaryShadow} ${t.primaryHover}`;
  const enabledSecondary = `bg-white ${t.secondaryText} border-2 ${t.secondaryBorder} ${t.secondaryHover}`;
  const disabledCls = isPrimary
    ? "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed"
    : "bg-gray-50 text-gray-400 border-2 border-gray-200 cursor-not-allowed";

  const base = [
    "group relative inline-flex items-center justify-center",
    "rounded-full font-bold transition-all select-none",
    fullWidth !== false ? "w-full" : "w-auto",
    sizeCls,
    disabled ? disabledCls : isPrimary ? enabledPrimary : enabledSecondary,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const chevron = showChevron ? (
    <span
      className={[
        "absolute flex items-center justify-center rounded-full transition-transform",
        chevronSize,
        disabled
          ? "border-2 border-gray-300 text-gray-400 bg-transparent"
          : isPrimary
            ? `border-2 ${t.chevronOnPrimary} bg-transparent`
            : `border-2 ${t.chevronOnSecondary}`,
        disabled ? "" : "group-hover:translate-x-1",
      ].join(" ")}
      aria-hidden
    >
      <ChevronRightIcon className={iconCls} />
    </span>
  ) : null;

  if (href && !disabled) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={base}
          {...rest}
        >
          {children}
          {chevron}
        </a>
      );
    }
    return (
      <Link href={href} className={base} {...rest}>
        {children}
        {chevron}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={base}
      {...rest}
    >
      {children}
      {chevron}
    </button>
  );
}
