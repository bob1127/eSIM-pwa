import {
  endOfDay,
  startOfDay,
  subMonths,
  isSameDay,
} from "date-fns";

/** 訂單 created_at 是否在日期區間內（含起迄日整天） */
export function orderWithinDateRange(createdAt, range) {
  if (!range?.from) return true;
  const ts = new Date(createdAt);
  if (Number.isNaN(ts.getTime())) return false;

  const from = startOfDay(range.from);
  const to = endOfDay(range.to || range.from);
  return ts >= from && ts <= to;
}

export const ORDER_DATE_PRESETS = [
  { id: "all", label: "全部日期" },
  { id: "1m", label: "近一個月", months: 1 },
  { id: "3m", label: "近三個月", months: 3 },
  { id: "6m", label: "近半年", months: 6 },
  { id: "12m", label: "近一年", months: 12 },
  { id: "custom", label: "自訂區間" },
];

/** @returns {import("react-day-picker").DateRange | undefined} */
export function presetToDateRange(presetId) {
  if (!presetId || presetId === "all" || presetId === "custom") return undefined;
  const preset = ORDER_DATE_PRESETS.find((p) => p.id === presetId);
  if (!preset?.months) return undefined;
  const to = endOfDay(new Date());
  const from = startOfDay(subMonths(new Date(), preset.months));
  return { from, to };
}

/** 依目前區間推斷預設選項 id */
export function detectOrderDatePreset(range) {
  if (!range?.from) return "all";
  if (!range.to) return "custom";

  for (const preset of ORDER_DATE_PRESETS) {
    if (!preset.months) continue;
    const expected = presetToDateRange(preset.id);
    if (
      expected?.from &&
      expected?.to &&
      isSameDay(range.from, expected.from) &&
      isSameDay(range.to, expected.to)
    ) {
      return preset.id;
    }
  }
  return "custom";
}
