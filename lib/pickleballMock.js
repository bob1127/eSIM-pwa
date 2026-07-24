/**
 * 匹克球場預約 — 資料契約（對齊未來 Google Sheets 一列）
 *
 * court: "A" | "B"
 * date: "YYYY-MM-DD"
 * start / end: "HH:mm"（可半點，如 09:30–10:30）
 * name: 預約者
 * status: "booked" | "cancelled" | "blocked"
 * note: 備註
 *
 * 營業時間：09:00–22:00
 */

export const PICKLEBALL_VENUE = {
  name: "匹克領域",
  courts: ["A", "B"],
  timezone: "Asia/Taipei",
  /** 營業開始／結束（分鐘自 0 點起算） */
  openMinutes: 9 * 60, // 09:00
  closeMinutes: 22 * 60, // 22:00
  openLabel: "09:00",
  closeLabel: "22:00",
};

/** @typedef {{ court: "A"|"B", date: string, start: string, end: string, name: string, status: "booked"|"cancelled"|"blocked", note?: string }} PickleballBooking */

function pad(n) {
  return String(n).padStart(2, "0");
}

export function minutesToHm(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad(h)}:${pad(m)}`;
}

export function parseHmToMinutes(hm) {
  const [h, m] = String(hm || "0:0")
    .split(":")
    .map((x) => parseInt(x, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function todayDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateStr(y, mIndex, day) {
  return `${y}-${pad(mIndex + 1)}-${pad(day)}`;
}

const SAMPLE_NAMES = [
  "王小明",
  "陳美玲",
  "林志豪",
  "黃大偉",
  "張雅婷",
  "吳怡君",
  "社團包場",
  "夜間聯誼",
];

/**
 * 以「今天」為基準，往後 12 個月 mock（含半點時段）
 * 規則：六日幾乎已滿；平日多段已約，並穿插若干已滿日
 * @returns {PickleballBooking[]}
 */
export function getMockPickleballBookings(now = new Date()) {
  /** @type {PickleballBooking[]} */
  const rows = [];
  const y0 = now.getFullYear();
  const m0 = now.getMonth();
  const open = PICKLEBALL_VENUE.openMinutes;
  const close = PICKLEBALL_VENUE.closeMinutes;

  /** A＋B 全日 09–22 整點佔滿 → 日曆「已滿」 */
  const pushFullDay = (ds, seed, opts = {}) => {
    const blocked = !!opts.blocked;
    for (const court of ["A", "B"]) {
      for (let start = open; start < close; start += 60) {
        const name = blocked
          ? "社團包場"
          : SAMPLE_NAMES[
              (seed + start / 60 + court.charCodeAt(0)) % SAMPLE_NAMES.length
            ];
        rows.push({
          court,
          date: ds,
          start: minutesToHm(start),
          end: minutesToHm(start + 60),
          name,
          status: blocked ? "blocked" : "booked",
          note: blocked ? "全日關閉" : "全日已滿",
        });
      }
    }
  };

  /** 多段已預約，穿插少量空檔（未滿） */
  const pushBusyDay = (ds, court, seed, count, tight = false) => {
    let cursor = open + ((seed + court.charCodeAt(0) * 3) % 2) * 30;
    let added = 0;
    let guard = 0;
    while (added < count && cursor + 60 <= close && guard < 48) {
      guard += 1;
      const dur = (seed + added + court.charCodeAt(0)) % 3 === 0 ? 90 : 60;
      const endMin = Math.min(close, cursor + dur);
      if (endMin - cursor < 60) break;

      const name =
        SAMPLE_NAMES[(seed + added + court.charCodeAt(0)) % SAMPLE_NAMES.length];
      const blocked = name === "社團包場" && (seed + added) % 11 === 0;

      rows.push({
        court,
        date: ds,
        start: minutesToHm(cursor),
        end: minutesToHm(endMin),
        name,
        status: blocked ? "blocked" : "booked",
        note: blocked ? "維護／包場" : dur === 90 ? "90 分鐘" : "",
      });
      added += 1;

      if (tight) {
        // 幾乎連續，幾乎不留空
        cursor = endMin;
      } else {
        const gap = ((seed + added * 5) % 3) * 30;
        cursor = endMin + gap;
        if ((seed + added) % 7 === 0) cursor += 30;
      }
    }
  };

  for (let offset = 0; offset < 12; offset++) {
    const d0 = new Date(y0, m0 + offset, 1);
    const y = d0.getFullYear();
    const m = d0.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(y, m, day);
      const dow = dt.getDay();
      const ds = dateStr(y, m, day);
      const seed = y * 10000 + (m + 1) * 100 + day;
      const isWeekend = dow === 0 || dow === 6;
      const roll = ((seed * 9301 + 49297) % 233280) / 233280;

      // 六日：約 92% 已滿；其餘少數「極忙但仍有空檔」
      if (isWeekend) {
        if (roll < 0.92) {
          pushFullDay(ds, seed, { blocked: day % 17 === 0 });
        } else {
          pushBusyDay(ds, "A", seed, 10, true);
          pushBusyDay(ds, "B", seed + 9, 10, true);
        }
        continue;
      }

      // 平日：約 28% 已滿；約 55% 多段已約；其餘空檔較多
      if (roll < 0.28) {
        pushFullDay(ds, seed, { blocked: false });
        continue;
      }
      if (roll > 0.83) continue; // 約 17% 全日幾乎沒約

      const bothCourts = roll > 0.38;
      const courts = bothCourts ? ["A", "B"] : [roll > 0.55 ? "A" : "B"];
      for (const court of courts) {
        const base = 5;
        const extra = (seed + court.charCodeAt(0)) % 4; // 5～8 段
        pushBusyDay(ds, court, seed, base + extra, roll < 0.45);
      }
    }
  }

  // 今天固定示範：多段已預約（含整點／半點），保持可點開
  const today = todayDateStr(now);
  const todayDemos = [
    { court: "A", start: "09:00", end: "10:00", name: "陳美玲", note: "雙打" },
    { court: "A", start: "10:00", end: "11:00", name: "林志豪", note: "" },
    { court: "A", start: "11:30", end: "12:30", name: "王小明", note: "" },
    { court: "A", start: "13:30", end: "14:30", name: "黃大偉", note: "" },
    { court: "A", start: "15:00", end: "16:00", name: "張雅婷", note: "" },
    { court: "A", start: "16:00", end: "17:30", name: "吳怡君", note: "90 分鐘" },
    { court: "A", start: "19:00", end: "20:00", name: "夜間聯誼", note: "" },
    { court: "A", start: "20:30", end: "21:30", name: "王小明", note: "" },
    { court: "B", start: "09:00", end: "10:00", name: "黃大偉", note: "" },
    { court: "B", start: "09:30", end: "10:30", name: "林志豪", note: "" },
    { court: "B", start: "10:30", end: "11:30", name: "張雅婷", note: "" },
    { court: "B", start: "12:00", end: "13:00", name: "陳美玲", note: "" },
    { court: "B", start: "13:00", end: "14:00", name: "吳怡君", note: "" },
    { court: "B", start: "15:00", end: "16:00", name: "王小明", note: "" },
    { court: "B", start: "16:30", end: "17:30", name: "林志豪", note: "" },
    { court: "B", start: "18:00", end: "19:00", name: "黃大偉", note: "" },
    { court: "B", start: "19:30", end: "20:30", name: "夜間聯誼", note: "" },
    { court: "B", start: "21:00", end: "22:00", name: "社團包場", note: "", status: "blocked" },
  ];
  for (const b of todayDemos) {
    rows.push({
      court: b.court,
      date: today,
      start: b.start,
      end: b.end,
      name: b.name,
      status: b.status || "booked",
      note: b.note || "",
    });
  }

  return rows;
}

/**
 * @param {{ year?: number, month?: number }} opts month 為 1–12
 */
export async function fetchPickleballSchedule(opts = {}) {
  const now = new Date();
  const year = opts.year ?? now.getFullYear();
  const month = opts.month ?? now.getMonth() + 1;
  const prefix = `${year}-${pad(month)}`;
  const all = getMockPickleballBookings(now);
  const bookings = all.filter((b) => b.date.startsWith(prefix));

  return {
    venue: PICKLEBALL_VENUE,
    year,
    month,
    bookings,
    source: "mock",
    fetchedAt: new Date().toISOString(),
  };
}
