"use client";

/**
 * 原生 iOS 風格開關（單純 track + knob，文字由外層自行放）
 * - ON：#34C759（iOS green）
 * - OFF：#E9E9EB
 * - size sm：綁定列小開關
 * - size md／bar：標準開關（bar 僅語意別名，外觀同 md）
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

  const trackW = isSm ? 51 : 51;
  const trackH = isSm ? 31 : 31;
  const knob = isSm ? 27 : 27;
  const pad = 2;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={ariaLabel || (isOn ? "關閉流量提醒" : "開啟流量提醒")}
      disabled={locked}
      onClick={onClick}
      className={[
        "relative shrink-0 rounded-full select-none transition-colors duration-200 ease-out",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4AD1]/35 focus-visible:ring-offset-1",
        isOn ? "bg-[#34C759]" : "bg-[#E9E9EB]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: trackW,
        height: trackH,
        boxShadow: isOn
          ? "inset 0 0 0 0.5px rgba(0,0,0,0.04)"
          : "inset 0 0 0 0.5px rgba(0,0,0,0.06)",
      }}
    >
      <span
        className="absolute top-1/2 rounded-full bg-white transition-[left] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{
          width: knob,
          height: knob,
          marginTop: -(knob / 2),
          left: isOn ? trackW - pad - knob : pad,
          boxShadow:
            "0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04)",
        }}
        aria-hidden
      />
      {busy ? (
        <span className="sr-only">處理中</span>
      ) : null}
    </button>
  );
}
