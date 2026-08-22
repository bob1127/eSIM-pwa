"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HeartIcon } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

function formatCount(n) {
  return Number(n || 0).toLocaleString("zh-TW");
}

/**
 * UIAble Toggle Animated（愛心收藏／按讚）
 * @see https://uiable.com/components/toggle
 */
export default function BlogLikeAnimatedToggle({
  pressed = false,
  onPressedChange,
  count = 0,
  disabled = false,
  className,
  label = "收藏",
  showLabel = true,
  tone = "default",
}) {
  const isOverlay = tone === "overlay";

  return (
    <Toggle
      aria-label={pressed ? `取消${label}` : label}
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      variant="outline"
      className={cn(
        "group/like relative overflow-hidden transition-all duration-300 ease-out",
        isOverlay
          ? "h-11 flex-1 rounded-full border-white/25 bg-[#2563eb] text-white hover:bg-[#1d4ed8] aria-pressed:bg-[#1d4ed8] aria-pressed:text-white aria-pressed:border-rose-300/40"
          : "aria-pressed:bg-transparent aria-pressed:text-rose-600",
        !isOverlay && pressed && "border-rose-300/60",
        className,
      )}
    >
      <span className="relative inline-flex items-center justify-center">
        <AnimatePresence>
          {pressed && (
            <>
              {[...Array(5)].map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [1, 1, 0],
                    x: Math.cos((i * 72 * Math.PI) / 180) * 14,
                    y: Math.sin((i * 72 * Math.PI) / 180) * 14,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={cn(
                    "pointer-events-none absolute size-1 rounded-full",
                    isOverlay ? "bg-white" : "bg-rose-500",
                  )}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        <motion.span
          animate={
            pressed
              ? {
                  scale: [1, 1.45, 0.9, 1.25],
                  rotate: [0, -14, 14, -6, 0],
                }
              : { scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="inline-flex items-center justify-center"
        >
          <HeartIcon
            className={cn(
              "size-4 transition-colors duration-300 ease-out",
              pressed
                ? isOverlay
                  ? "fill-white text-white"
                  : "fill-rose-500 text-rose-500"
                : isOverlay
                  ? "text-white group-hover/like:scale-110"
                  : "text-slate-500 group-hover/like:scale-110",
            )}
          />
        </motion.span>
      </span>

      {showLabel ? (
        <span className="font-medium">{label}</span>
      ) : null}

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={pressed ? "liked" : "unliked"}
          initial={{ opacity: 0, y: pressed ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: pressed ? 8 : -8 }}
          transition={{ duration: 0.2 }}
          className="font-semibold tabular-nums"
        >
          {formatCount(count)}
        </motion.span>
      </AnimatePresence>
    </Toggle>
  );
}
