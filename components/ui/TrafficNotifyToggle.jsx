"use client";

/**
 * 流量通知開關（立體黃鈕）
 * - ON：與購買鈕同色 #1E4AD1
 * - size bar：與 JekoPillButton sm 同列等高（底欄半寬）
 * - size sm：eSIM 綁定小開關
 */
export default function TrafficNotifyToggle({
  on = false,
  busy = false,
  disabled = false,
  onClick,
  className = "",
  size = "md",
  "aria-label": ariaLabel,
}) {
  const isOn = Boolean(on);
  const locked = Boolean(disabled || busy);
  const isSm = size === "sm";
  const isBar = size === "bar";
  const hasWidth = /\bw-/.test(className);

  const knobSize = isSm ? 26 : isBar ? 34 : 34;
  const trackPad = isSm ? 3 : 4;

  const label = busy
    ? "…"
    : isOn
      ? isSm
        ? "已開"
        : "已開啟流量提醒"
      : isSm
        ? "提醒"
        : isBar
          ? "開啟流量提醒"
          : "開啟提醒";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={ariaLabel || (isOn ? "關閉流量提醒" : "開啟流量提醒")}
      disabled={locked}
      onClick={onClick}
      className={[
        "relative shrink-0 rounded-full select-none overflow-hidden",
        isSm ? "h-8" : isBar ? "h-full min-h-[42px]" : "h-11",
        hasWidth ? "" : isSm ? "w-[88px]" : isBar ? "w-full" : "w-[120px]",
        "transition-[background,box-shadow,transform] duration-300 ease-out",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "active:scale-[0.98]",
        isOn
          ? [
              "bg-[#1E4AD1]",
              "shadow-[0_4px_12px_rgba(30,74,209,0.4),inset_0_2px_3px_rgba(255,255,255,0.28),inset_0_-3px_6px_rgba(10,35,110,0.45)]",
            ].join(" ")
          : [
              "bg-gradient-to-b from-[#C5CBD6] to-[#8E97A8]",
              "shadow-[0_3px_8px_rgba(40,50,70,0.22),inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-3px_5px_rgba(40,50,70,0.35)]",
            ].join(" "),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* 軌道凹槽光澤 */}
      <span
        className="pointer-events-none absolute inset-[3px] rounded-full opacity-40"
        style={{
          background: isOn
            ? "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 45%, rgba(255,255,255,0.12) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 50%, rgba(255,255,255,0.15) 100%)",
        }}
        aria-hidden
      />

      <span
        className={[
          "pointer-events-none absolute inset-y-0 z-[1] flex items-center font-bold text-white leading-none whitespace-nowrap",
          isSm
            ? "px-2 text-[10px] tracking-wide"
            : isBar
              ? "px-3 text-[11px] tracking-normal"
              : "px-3.5 text-[12px] tracking-wide",
          isOn ? "left-0 justify-start" : "right-0 justify-end",
        ].join(" ")}
        style={{
          textShadow: isOn
            ? "0 1px 0 rgba(8,30,100,0.55), 0 2px 4px rgba(8,30,100,0.25)"
            : "0 1px 0 rgba(40,50,70,0.45)",
          maxWidth: `calc(100% - ${knobSize + trackPad * 2 + 4}px)`,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        aria-hidden
      >
        {label}
      </span>

      {/* 立體黃圓鈕 */}
      <span
        className="absolute z-[2] rounded-full transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          top: "50%",
          width: knobSize,
          height: knobSize,
          marginTop: -(knobSize / 2),
          left: isOn
            ? `calc(100% - ${trackPad}px - ${knobSize}px)`
            : `${trackPad}px`,
          background:
            "radial-gradient(circle at 32% 28%, #FFF6A8 0%, #FFE95A 28%, #FADE2B 58%, #E8C410 100%)",
          boxShadow: [
            "0 4px 10px rgba(20,40,90,0.35)",
            "0 1px 2px rgba(20,40,90,0.2)",
            "inset 0 2px 3px rgba(255,255,255,0.95)",
            "inset 0 -3px 5px rgba(170,130,0,0.45)",
            "inset 0 0 0 1px rgba(232,200,32,0.65)",
          ].join(", "),
        }}
        aria-hidden
      >
        {/* 高光點 */}
        <span
          className="absolute rounded-full bg-white/70"
          style={{
            width: Math.max(6, knobSize * 0.28),
            height: Math.max(4, knobSize * 0.18),
            top: "18%",
            left: "22%",
            filter: "blur(0.5px)",
          }}
        />
      </span>
    </button>
  );
}
