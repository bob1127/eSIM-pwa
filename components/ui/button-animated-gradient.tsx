"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonAnimatedGradientProps = {
  children: ReactNode;
  href?: string;
  /** 已包在外層 Link 內時設 true，避免 a > button 巢狀 */
  nested?: boolean;
  className?: string;
  surfaceClassName?: string;
  showArrow?: boolean;
};

function stripTrailingArrow(label: ReactNode): ReactNode {
  if (typeof label !== "string") return label;
  return label.replace(/\s*[→›»]\s*$/, "").trim();
}

const baseSurfaceClass =
  "relative inline-flex overflow-hidden rounded-full border px-6 py-2.5 text-xs font-semibold tracking-wider transition-all duration-300 sm:px-8 sm:py-3";

function surfaceClasses(nested: boolean, surfaceClassName?: string) {
  return cn(
    baseSurfaceClass,
    nested
      ? "border-white/80 bg-white/95 text-slate-900 hover:border-transparent hover:text-white"
      : "border-border text-foreground hover:border-transparent hover:text-white",
    surfaceClassName,
  );
}

function AnimatedInner({
  label,
  showArrow,
}: {
  label: ReactNode;
  showArrow: boolean;
}) {
  return (
    <>
      <motion.span
        className="absolute inset-0 z-0 rounded-full bg-gradient-to-r from-[#3B9EFF] via-[#2BB5E8] to-cyan-500"
        variants={{
          rest: { scaleX: 0 },
          hover: { scaleX: 1 },
        }}
        style={{ originX: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        <motion.span
          variants={{
            rest: { x: 4 },
            hover: { x: 0 },
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {label}
        </motion.span>
        {showArrow ? (
          <motion.span
            variants={{
              rest: { x: 0 },
              hover: { x: 8 },
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <ArrowRight className="size-4 shrink-0" />
          </motion.span>
        ) : null}
      </span>
    </>
  );
}

export default function ButtonAnimatedGradient({
  children,
  href,
  nested = false,
  className,
  surfaceClassName,
  showArrow = true,
}: ButtonAnimatedGradientProps) {
  const label = stripTrailingArrow(children);
  const surface = surfaceClasses(nested, surfaceClassName);

  const motionWrap = (node: ReactNode) => (
    <motion.div
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      className={cn("relative inline-flex overflow-hidden rounded-full", className)}
    >
      {node}
    </motion.div>
  );

  if (nested) {
    return motionWrap(
      <span className={surface}>
        <AnimatedInner label={label} showArrow={showArrow} />
      </span>,
    );
  }

  if (href) {
    const isHash = href.startsWith("#");
    const inner = (
      <span className={surface}>
        <AnimatedInner label={label} showArrow={showArrow} />
      </span>
    );

    if (isHash) {
      return motionWrap(
        <a href={href} className="inline-flex no-underline">
          {inner}
        </a>,
      );
    }

    return motionWrap(
      <Link href={href} className="inline-flex no-underline">
        {inner}
      </Link>,
    );
  }

  return motionWrap(
    <span className={surface}>
      <AnimatedInner label={label} showArrow={showArrow} />
    </span>,
  );
}
