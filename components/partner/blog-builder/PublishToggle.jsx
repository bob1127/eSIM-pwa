/**
 * iOS 式綠白開關：控制文章是否出現在前台。
 */
export default function PublishToggle({
  on = false,
  disabled = false,
  onChange,
  tone = "light",
  title,
}) {
  const offTrack = tone === "dark" ? "bg-white/25" : "bg-slate-300";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={title || (on ? "前台已發布" : "前台未發布")}
      title={title || (on ? "前台顯示中，點擊改為草稿" : "未發布，點擊發到前台")}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={`relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full p-[2px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        on ? "bg-[#34C759]" : offTrack
      }`}
    >
      <span
        className={`block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          on ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
