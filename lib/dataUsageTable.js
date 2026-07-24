/** 流量用量對照表（保守估算，預留緩衝避免低估實際消耗） */

/** 用量估算安全係數：實際消耗常高於理論值 */
export const USAGE_BUFFER = 1.45;
/** 顯示時再向下取整，避免數字過於樂觀 */
export const DISPLAY_FACTOR = 0.85;

export const DATA_PLANS = [
  { key: "1gb", label: "1 GB", sub: "輕量旅遊", highlight: false },
  { key: "3gb", label: "3 GB", sub: "一般旅遊", highlight: false },
  { key: "5gb", label: "5 GB", sub: "熱門方案", highlight: true },
  { key: "10gb", label: "10 GB", sub: "深度旅遊", highlight: false },
];

const PLAN_GB = Object.fromEntries(
  DATA_PLANS.map((p) => [p.key, parseFloat(p.label)]),
);

function estimateRawHours(gbKey, mbPerHour) {
  const gb = PLAN_GB[gbKey];
  return (gb * 1024) / (mbPerHour * USAGE_BUFFER);
}

function formatUsageHours(hours) {
  const h = Math.floor(hours * DISPLAY_FACTOR);
  if (h < 1) return "不足 1 小時";
  return `約 ${h} 小時`;
}

function buildUsageValues(mbPerHour, minOkHoursByPlan) {
  return Object.fromEntries(
    DATA_PLANS.map((plan) => {
      const raw = estimateRawHours(plan.key, mbPerHour);
      return [
        plan.key,
        {
          text: formatUsageHours(raw),
          ok: raw >= (minOkHoursByPlan[plan.key] ?? 4),
        },
      ];
    }),
  );
}

function usageNote(mbPerHour) {
  const buffered = Math.round(mbPerHour * USAGE_BUFFER);
  return `約 ${buffered} MB／小時（含緩衝）`;
}

const USAGE_ACTIVITIES = [
  {
    activity: "Facebook / Instagram 瀏覽",
    icon: "smartphone",
    mbPerHour: 120,
    minOkHoursByPlan: { "1gb": 6, "3gb": 16, "5gb": 28, "10gb": 56 },
  },
  {
    activity: "Line / WhatsApp 文字訊息",
    icon: "chat",
    mbPerHour: 20,
    minOkHoursByPlan: { "1gb": 24, "3gb": 72, "5gb": 120, "10gb": 240 },
  },
  {
    activity: "手機線上遊戲",
    icon: "sports_esports",
    mbPerHour: 100,
    minOkHoursByPlan: { "1gb": 5, "3gb": 16, "5gb": 28, "10gb": 56 },
  },
  {
    activity: "Google Maps 導航",
    icon: "map",
    mbPerHour: 80,
    minOkHoursByPlan: { "1gb": 6, "3gb": 20, "5gb": 32, "10gb": 64 },
  },
  {
    activity: "一般網頁瀏覽",
    icon: "language",
    mbPerHour: 100,
    minOkHoursByPlan: { "1gb": 5, "3gb": 16, "5gb": 28, "10gb": 56 },
  },
  {
    activity: "Spotify / 音樂串流",
    icon: "music_note",
    mbPerHour: 40,
    minOkHoursByPlan: { "1gb": 12, "3gb": 36, "5gb": 60, "10gb": 120 },
  },
  {
    activity: "YouTube 標準畫質",
    icon: "play_circle",
    mbPerHour: 500,
    minOkHoursByPlan: { "1gb": 3, "3gb": 8, "5gb": 12, "10gb": 24 },
  },
  {
    activity: "WhatsApp / FaceTime 視訊",
    icon: "videocam",
    mbPerHour: 300,
    minOkHoursByPlan: { "1gb": 2, "3gb": 6, "5gb": 10, "10gb": 20 },
  },
  {
    activity: "TikTok / Reels 短影音",
    icon: "movie",
    mbPerHour: 700,
    minOkHoursByPlan: { "1gb": 2, "3gb": 5, "5gb": 8, "10gb": 16 },
  },
  {
    activity: "Netflix HD 串流",
    icon: "live_tv",
    mbPerHour: 3000,
    minOkHoursByPlan: { "1gb": 1, "3gb": 2, "5gb": 3, "10gb": 5 },
  },
];

export const USAGE_ROWS = USAGE_ACTIVITIES.map((row) => ({
  activity: row.activity,
  icon: row.icon,
  note: usageNote(row.mbPerHour),
  values: buildUsageValues(row.mbPerHour, row.minOkHoursByPlan),
}));
