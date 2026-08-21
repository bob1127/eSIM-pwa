/**
 * 人工客服時段（與會員中心「客服摘要」一致）：台灣時間每日 09:00–23:00
 */

function getTaipeiMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

/** 是否在人工客服營業時間（Asia/Taipei，09:00 含～23:00 不含） */
export function isSupportBusinessHours(date = new Date()) {
  const mins = getTaipeiMinutes(date);
  return mins >= 9 * 60 && mins < 23 * 60;
}

export const SUPPORT_HOURS_LABEL = "每日 09:00–23:00（台灣時間）";
