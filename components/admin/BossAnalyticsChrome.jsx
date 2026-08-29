"use client";

import MaterialIcon from "@/components/MaterialIcon";

/** 對齊夥伴分潤分析頁的視覺語彙 */
export const BOSS_AUI = {
  dark: "#2d2d2d",
  mid: "#5c5c5c",
  soft: "#8a8a8a",
  border: "#e5e5e5",
  light: "#f0f0f0",
  wash: "#f6f6f6",
  white: "#ffffff",
  radius: "1rem",
  radiusSm: "0.75rem",
};

export const BOSS_RANGE_OPTIONS = [
  { id: "7", label: "近 7 天", days: "7" },
  { id: "30", label: "近 30 天", days: "30" },
  { id: "90", label: "近 90 天", days: "90" },
  { id: "365", label: "近 1 年", days: "365" },
  { id: "9999", label: "全部", days: "9999" },
];

export function BossAnalyticsCard({ children, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: BOSS_AUI.white,
        border: `1px solid ${BOSS_AUI.border}`,
        borderRadius: BOSS_AUI.radius,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function BossStatPill({ icon, iconBg, label, value, sub }) {
  return (
    <BossAnalyticsCard className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-[150px]">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <MaterialIcon name={icon} size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p
          className="text-lg font-black tabular-nums leading-tight"
          style={{ color: BOSS_AUI.dark }}
        >
          {value}
        </p>
        <p
          className="text-[11px] font-semibold truncate"
          style={{ color: BOSS_AUI.soft }}
        >
          {label}
        </p>
        {sub ? (
          <p className="text-[10px] mt-0.5" style={{ color: BOSS_AUI.soft }}>
            {sub}
          </p>
        ) : null}
      </div>
    </BossAnalyticsCard>
  );
}

export function BossRangeChips({ value, onChange, options = BOSS_RANGE_OPTIONS }) {
  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-0.5 p-1"
      style={{
        backgroundColor: BOSS_AUI.white,
        border: `1px solid ${BOSS_AUI.border}`,
        borderRadius: BOSS_AUI.radius,
      }}
    >
      {options.map((r) => {
        const active = String(value) === String(r.days ?? r.id);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.days ?? r.id)}
            className="min-h-9 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold transition touch-manipulation whitespace-nowrap"
            style={{
              borderRadius: BOSS_AUI.radiusSm,
              backgroundColor: active ? BOSS_AUI.dark : "transparent",
              color: active ? BOSS_AUI.white : BOSS_AUI.mid,
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

export function BossChannelChips({ value, onChange }) {
  const items = [
    { id: "main", label: "主站" },
    { id: "partner", label: "夥伴商店／連結" },
  ];
  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-0.5 p-1"
      style={{
        backgroundColor: BOSS_AUI.white,
        border: `1px solid ${BOSS_AUI.border}`,
        borderRadius: BOSS_AUI.radius,
      }}
    >
      {items.map((r) => {
        const active = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className="min-h-9 px-3 py-1.5 text-[11px] sm:text-xs font-bold transition whitespace-nowrap"
            style={{
              borderRadius: BOSS_AUI.radiusSm,
              backgroundColor: active ? "#1E4AD1" : "transparent",
              color: active ? "#fff" : BOSS_AUI.mid,
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

export function BossStatusChips({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className="min-h-8 px-3 py-1.5 text-[11px] font-bold rounded-full border transition"
            style={{
              backgroundColor: active ? BOSS_AUI.dark : BOSS_AUI.white,
              color: active ? BOSS_AUI.white : BOSS_AUI.mid,
              borderColor: active ? BOSS_AUI.dark : BOSS_AUI.border,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function BossAnalyticsHeader({
  title,
  subtitle,
  rangeValue,
  onRangeChange,
  extra,
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h2
          className="text-xl font-black tracking-tight"
          style={{ color: BOSS_AUI.dark }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="text-xs sm:text-sm mt-1" style={{ color: BOSS_AUI.mid }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        {rangeValue != null && onRangeChange ? (
          <BossRangeChips value={rangeValue} onChange={onRangeChange} />
        ) : null}
      </div>
    </div>
  );
}
