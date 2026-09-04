"use client";

import HeartIcon from "@/components/icons/heart-icon";

const TONES = {
  // 白底／淺底：未追蹤灰線框，已追蹤玫紅實心
  default: {
    idle: "border-[#ddd] text-slate-500 hover:border-rose-300 hover:text-rose-500",
    active: "border-rose-300 bg-rose-50 text-rose-600",
    idleColor: "#64748b",
    activeColor: "#e11d48",
  },
  // 深色底／封面照上：一律白色，已追蹤為實心
  overlay: {
    idle: "border-white/40 bg-black/35 text-white hover:bg-black/50",
    active: "border-white/70 bg-black/45 text-white",
    idleColor: "#ffffff",
    activeColor: "#ffffff",
  },
};

function formatCount(n) {
  return Number(n || 0).toLocaleString("zh-TW");
}

/**
 * 追蹤創作者的愛心按鈕。
 *
 * 狀態一律由 `useCreatorFollow` 提供：
 * - `ready` 為 false（登入狀態或追蹤狀態尚未確定）時停用，避免誤按
 * - `busy` 為 true（請求進行中）時停用，避免連點重複送出
 */
export default function CreatorFollowHeart({
  following = false,
  busy = false,
  ready = true,
  onToggle,
  creatorName = "",
  size = 18,
  tone = "default",
  showCount = false,
  count = 0,
  className = "",
}) {
  const palette = TONES[tone] || TONES.default;
  const disabled = busy || !ready;
  const name = String(creatorName || "").trim();
  const label = following
    ? `取消追蹤${name ? `「${name}」` : "創作者"}`
    : `追蹤${name ? `「${name}」` : "創作者"}`;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={following}
      aria-busy={busy}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-full border transition-colors ${
        showCount ? "h-8 px-2.5" : "h-8 w-8"
      } ${following ? palette.active : palette.idle} ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
    >
      <HeartIcon
        size={size}
        color={following ? palette.activeColor : palette.idleColor}
        fill={following ? palette.activeColor : "none"}
        strokeWidth={1.9}
        className="pointer-events-none"
      />
      {showCount ? (
        <span className="text-[12px] font-semibold tabular-nums">
          {formatCount(count)}
        </span>
      ) : null}
    </button>
  );
}
