import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import MaterialIcon from "@/components/MaterialIcon";

ChartJS.register(ArcElement, Tooltip, Legend);

const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i);

/**
 * 偏保守（略高）的每小時流量估算，避免客人到當地用量不符預期。
 * 單位：GB / 小時
 */
const USAGE_CATEGORIES = [
  {
    id: "social",
    label: "社群媒體",
    apps: "Instagram, Facebook, Threads, LinkedIn",
    gbPerHour: 0.6,
    color: "#8b5cf6",
    defaultHours: 2,
  },
  {
    id: "video",
    label: "影片串流",
    apps: "YouTube, Netflix, TikTok, Disney+",
    gbPerHour: 2.0,
    color: "#ec4899",
    defaultHours: 1,
  },
  {
    id: "voip",
    label: "視訊通話",
    apps: "WhatsApp, LINE, FaceTime, Zoom",
    gbPerHour: 0.9,
    color: "#06b6d4",
    defaultHours: 0,
  },
  {
    id: "web",
    label: "網頁瀏覽",
    apps: "Chrome, Safari, 購物、新聞",
    gbPerHour: 0.28,
    color: "#f43f5e",
    defaultHours: 1,
  },
  {
    id: "maps",
    label: "地圖導航",
    apps: "Google Maps, Apple Maps, Waze",
    gbPerHour: 0.22,
    color: "#10b981",
    defaultHours: 1,
  },
  {
    id: "music",
    label: "音樂串流",
    apps: "Spotify, Apple Music, KKBOX",
    gbPerHour: 0.18,
    color: "#f59e0b",
    defaultHours: 0,
  },
  {
    id: "work",
    label: "工作與郵件",
    apps: "Gmail, Outlook, Slack, Teams",
    gbPerHour: 0.12,
    color: "#64748b",
    defaultHours: 1,
  },
];

function formatGb(n) {
  if (!Number.isFinite(n) || n <= 0) return "0.00";
  if (n < 0.01) return "<0.01";
  return n.toFixed(2);
}

function suggestPlanGb(totalGb) {
  if (!totalGb || totalGb <= 0) return 1;
  return Math.max(1, Math.ceil(totalGb * 1.15));
}

/**
 * 解析方案流量屬性
 * - 吃到飽
 * - 每日型（每日500MB / 每日1GB）→ 以「每日 GB」計，總量 = 每日 × 天數
 * - 總量型（3GB / 10GB）→ 行程總量
 */
export function parseDataCapacity(amount) {
  const s = String(amount || "").trim();
  if (!s) return null;
  if (/吃到飽|無限|unlimited/i.test(s)) {
    return {
      kind: "unlimited",
      dailyGb: Number.POSITIVE_INFINITY,
      totalGbFactor: Number.POSITIVE_INFINITY,
      label: s,
    };
  }

  const isDaily = /每日|每天|per\s*day|\/\s*day|day\s*pass/i.test(s);
  const num = parseFloat(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return null;

  let gb = num;
  const hasMb = /MB|ｍｂ|兆/i.test(s);
  const hasGb = /GB|ｇｂ|吉/i.test(s);
  if (hasMb && !hasGb) {
    gb = num / 1024;
  } else if (/TB|ｔｂ/i.test(s)) {
    gb = num * 1024;
  } else if (!hasGb && !hasMb && isDaily && num >= 100) {
    // 常見寫法「每日500」多半是 MB
    gb = num / 1024;
  }

  if (isDaily) {
    return {
      kind: "daily",
      dailyGb: gb,
      totalGbFactor: gb, // 乘天數後才是總量
      label: s,
    };
  }

  return {
    kind: "total",
    dailyGb: null,
    totalGbFactor: gb,
    label: s,
  };
}

/** 方案用量遞增排序鍵（MB→GB、每日型、總量型；吃到飽最後） */
export function dataAmountSortKey(amount) {
  const cap = parseDataCapacity(amount);
  if (!cap) return Number.MAX_SAFE_INTEGER - 1;
  if (cap.kind === "unlimited") return Number.MAX_SAFE_INTEGER;
  if (cap.kind === "daily") return cap.dailyGb;
  return cap.totalGbFactor;
}

export function compareDataAmountsAsc(a, b) {
  const diff = dataAmountSortKey(a) - dataAmountSortKey(b);
  if (diff !== 0) return diff;
  return String(a).localeCompare(String(b), "zh-Hant");
}

function formatTelecomShort(telecom) {
  const s = String(telecom || "").trim();
  if (!s) return "";
  if (/GPT|TikTok/i.test(s)) return "中國聯通 GPT+TikTok";
  if (/聯通|CUCC/i.test(s)) return "中國聯通";
  if (/移動|CMCC/i.test(s)) return "中國移動";
  return s.length > 16 ? `${s.slice(0, 15)}…` : s;
}

/**
 * 從目前商品（及同分類相關商品）變體中挑出真正夠用的方案
 * - 總量型：總流量 ≥ 建議總量
 * - 每日型：每日流量 ≥ 建議每日用量（不可拿「每日500MB」去對「總量 103GB」）
 * - 吃到飽：高用量優先
 */
export function recommendProductVariants(
  variations = [],
  {
    tripDays,
    suggestedGb,
    dailyNeedGb,
    preferredTelecom,
    preferCurrentProduct = true,
  } = {},
  limit = 3,
) {
  const daysNeed = Math.max(1, Number(tripDays) || 1);
  const gbNeed = Math.max(1, Number(suggestedGb) || 1);
  const dailyNeed =
    Number(dailyNeedGb) > 0
      ? Number(dailyNeedGb)
      : Math.max(0.1, gbNeed / daysNeed);
  const heavyUsage = dailyNeed >= 2 || gbNeed >= 15;

  const candidates = (variations || [])
    .map((v) => {
      const days = parseInt(String(v.attributes?.days ?? ""), 10);
      const dataLabel = v.attributes?.data_amount || "";
      const cap = parseDataCapacity(dataLabel);
      const telecom = v.attributes?.telecom || "";
      if (!days || !cap) return null;

      const totalGb =
        cap.kind === "unlimited"
          ? Number.POSITIVE_INFINITY
          : cap.kind === "daily"
            ? cap.dailyGb * days
            : cap.totalGbFactor;

      return {
        variant: v,
        days,
        kind: cap.kind,
        dailyGb: cap.dailyGb,
        totalGb,
        gb: totalGb, // 顯示／舊欄位相容：以「有效總量」為準
        dataLabel,
        telecom,
        price: Number(v.price) || 0,
        title: v.title || `${telecom} · ${days}天 · ${dataLabel}`,
        productSlug: v.productSlug || "",
        productName: v.productName || "",
        productLabel: v.productLabel || "",
        productKind: v.productKind || "other",
        isCurrentProduct: Boolean(v.isCurrentProduct),
        categoryHandle: v.categoryHandle || "",
      };
    })
    .filter(Boolean);

  const meetsNeed = (item, { requireDay = true } = {}) => {
    if (requireDay && item.days < daysNeed) return false;
    if (item.kind === "unlimited") return true;
    if (item.kind === "daily") {
      // 每日型必須每天都夠用，不能只比總量
      return item.dailyGb + 1e-9 >= dailyNeed;
    }
    return item.totalGb + 1e-9 >= gbNeed;
  };

  const scoreOne = (item, { requireDay = true } = {}) => {
    if (!meetsNeed(item, { requireDay })) return null;

    const dayExtra = Math.max(0, item.days - daysNeed);
    let score = dayExtra * 8;

    if (item.kind === "unlimited") {
      score += heavyUsage ? -50 : 40;
    } else if (item.kind === "daily") {
      const dailyExtra = item.dailyGb - dailyNeed;
      score += dailyExtra * 20;
      // 每日型在高用量場景通常不如吃到飽／大總量
      if (heavyUsage) score += 80;
    } else {
      const totalExtra = item.totalGb - gbNeed;
      score += totalExtra * 1.2;
      if (heavyUsage && item.totalGb < gbNeed * 1.5) score += 30;
    }

    if (preferredTelecom && item.telecom === preferredTelecom) score -= 40;
    if (preferCurrentProduct && item.isCurrentProduct) score -= 15;
    score += item.price * 0.0015;
    return score;
  };

  let ranked = candidates
    .map((item) => ({ ...item, score: scoreOne(item) }))
    .filter((item) => item.score != null)
    .sort((a, b) => a.score - b.score);

  // 天數略不足但流量夠：放寬天數（例如行程 5 天、方案只有 3 天就不該進這裡；
  // 僅允許方案天數 ≥ 行程 70% 且至少差 1 天內的情況較少，這裡改為允許較長天數不足 2 天內）
  if (!ranked.length) {
    ranked = candidates
      .map((item) => {
        if (item.days < daysNeed && item.days < daysNeed - 1) return { ...item, score: null };
        return { ...item, score: scoreOne(item, { requireDay: false }) };
      })
      .filter((item) => item.score != null)
      .sort((a, b) => a.score - b.score);
  }

  // 仍沒有「夠用」方案：只從吃到飽／最大流量中挑，絕不把明顯不夠的每日 500MB 塞進來
  if (!ranked.length) {
    ranked = candidates
      .map((item) => {
        const dayPenalty =
          item.days >= daysNeed
            ? (item.days - daysNeed) * 5
            : (daysNeed - item.days) * 40;
        let gap;
        if (item.kind === "unlimited") {
          gap = heavyUsage ? -100 : 20;
        } else if (item.kind === "daily") {
          // 每日不足量（GB）懲罰極重
          gap = Math.max(0, dailyNeed - item.dailyGb) * 200 + 100;
        } else {
          gap = Math.max(0, gbNeed - item.totalGb) * 8 + 50;
        }
        let score = dayPenalty + gap + item.price * 0.001;
        if (preferCurrentProduct && item.isCurrentProduct) score -= 10;
        return { ...item, score, undersized: true };
      })
      .sort((a, b) => a.score - b.score)
      // 後備也只取相對最接近的 1～2 個吃到飽／大流量，避免一堆不夠用的每日型
      .filter((item, idx, arr) => {
        if (item.kind === "unlimited") return true;
        if (item.kind === "total" && item.totalGb >= gbNeed * 0.5) return true;
        if (item.kind === "daily" && item.dailyGb >= dailyNeed * 0.5) return true;
        // 若前面已有合格候選概念，每日嚴重不足的不要
        const best = arr[0];
        if (best?.kind === "unlimited") return item.kind === "unlimited";
        return idx < 2;
      });
  }

  const picked = [];
  const seenKeys = new Set();
  const productCounts = new Map();

  for (const item of ranked) {
    if (picked.length >= limit) break;

    // 已有夠用方案時，不要再塞明顯不夠的每日型
    if (
      item.undersized &&
      picked.some((p) => !p.undersized) &&
      ((item.kind === "daily" && item.dailyGb < dailyNeed) ||
        (item.kind === "total" && item.totalGb < gbNeed * 0.6))
    ) {
      continue;
    }

    const key = `${item.productSlug}|${item.telecom}|${item.days}|${item.dataLabel}`;
    if (seenKeys.has(key)) continue;

    // 同商品最多佔 2 席，其餘優先給其他夠用商品
    const slug = item.productSlug || "_";
    const count = productCounts.get(slug) || 0;
    if (
      count >= 2 &&
      ranked.some(
        (r) =>
          r.productSlug &&
          r.productSlug !== slug &&
          !seenKeys.has(
            `${r.productSlug}|${r.telecom}|${r.days}|${r.dataLabel}`,
          ) &&
          meetsNeed(r),
      )
    ) {
      continue;
    }

    seenKeys.add(key);
    productCounts.set(slug, count + 1);
    picked.push(item);
  }

  if (picked.length < limit) {
    for (const item of ranked) {
      if (picked.length >= limit) break;
      if (
        item.undersized &&
        item.kind === "daily" &&
        item.dailyGb < dailyNeed * 0.8
      ) {
        continue;
      }
      const key = `${item.productSlug}|${item.telecom}|${item.days}|${item.dataLabel}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      picked.push(item);
    }
  }

  // 預估建議維持「最適合優先」（分數排序），不改用量遞增
  return picked.map((item, idx) => ({
    ...item,
    isBestMatch: idx === 0,
  }));
}

function MiniSimIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/雙品sim.png"
      alt=""
      width={44}
      height={56}
      className="w-11 h-14 object-contain shrink-0"
      aria-hidden
    />
  );
}

export function getEstimatorDestinationLabel(product, categoryHandle) {
  const name = String(product?.name || "");
  const cat = String(categoryHandle || "").toLowerCase();
  if (/中國|china/i.test(name) || cat === "china") return "中國大陸";
  if (/日本|japan/i.test(name) || cat === "japan" || cat === "jp")
    return "日本";
  if (/韓國|korea/i.test(name) || cat === "korea" || cat === "kr")
    return "韓國";
  if (/香港|hong.?kong/i.test(name) || cat === "hong-kong" || cat === "hk")
    return "香港";
  if (/泰國|thailand/i.test(name) || cat === "thailand" || cat === "th")
    return "泰國";
  const stripped = name
    .replace(/\s*eSIM.*$/i, "")
    .replace(/總量型|總計型|吃到飽|無限.*$/u, "")
    .trim();
  return stripped || "旅途";
}

export default function DataEstimatorModal({
  isOpen,
  onClose,
  destination = "中國大陸",
  variations = [],
  /** 同分類跨商品方案（含本商品）；有值時優先用於推薦 */
  comparablePlans = [],
  preferredTelecom = "",
  productName = "",
  onSelectVariant,
}) {
  const [days, setDays] = useState(1);
  const [hoursById, setHoursById] = useState(() =>
    Object.fromEntries(USAGE_CATEGORIES.map((c) => [c.id, c.defaultHours])),
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const planPool = useMemo(() => {
    if (comparablePlans?.length) return comparablePlans;
    return (variations || []).map((v) => ({
      ...v,
      isCurrentProduct: true,
      productLabel: "",
      productName: productName || "",
    }));
  }, [comparablePlans, variations, productName]);

  const hasCrossProduct = useMemo(() => {
    const slugs = new Set(planPool.map((p) => p.productSlug).filter(Boolean));
    return slugs.size > 1;
  }, [planPool]);

  const rows = useMemo(() => {
    return USAGE_CATEGORIES.map((cat) => {
      const hours = Number(hoursById[cat.id]) || 0;
      const dailyGb = hours * cat.gbPerHour;
      return { ...cat, hours, dailyGb };
    });
  }, [hoursById]);

  const dailyTotalGb = useMemo(
    () => rows.reduce((sum, r) => sum + r.dailyGb, 0),
    [rows],
  );
  const screenHours = useMemo(
    () => rows.reduce((sum, r) => sum + r.hours, 0),
    [rows],
  );
  const tripDays = Math.max(1, Math.min(365, Number(days) || 1));
  const tripTotalGb = dailyTotalGb * tripDays;
  const suggestedGb = suggestPlanGb(tripTotalGb);
  const suggestedDailyGb = Math.max(
    dailyTotalGb * 1.15,
    dailyTotalGb > 0 ? dailyTotalGb : 0.1,
  );

  const recommendations = useMemo(
    () =>
      recommendProductVariants(
        planPool,
        {
          tripDays,
          suggestedGb,
          dailyNeedGb: suggestedDailyGb,
          preferredTelecom,
        },
        4,
      ),
    [planPool, tripDays, suggestedGb, suggestedDailyGb, preferredTelecom],
  );

  const activeRows = rows.filter((r) => r.dailyGb > 0);

  const chartData = useMemo(() => {
    if (!activeRows.length) {
      return {
        labels: ["尚無用量"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#e2e8f0"],
            borderWidth: 0,
          },
        ],
      };
    }
    return {
      labels: activeRows.map((r) => r.label),
      datasets: [
        {
          data: activeRows.map((r) => r.dailyGb),
          backgroundColor: activeRows.map((r) => r.color),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };
  }, [activeRows]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed;
              return ` ${ctx.label}: ${formatGb(v)} GB`;
            },
          },
        },
      },
    }),
    [],
  );

  const handlePick = (item) => {
    onSelectVariant?.({
      telecom: item.telecom,
      days: item.days,
      data_amount: item.dataLabel,
      variant: item.variant,
      productSlug: item.productSlug,
      productName: item.productName,
      productLabel: item.productLabel,
      productKind: item.productKind,
      isCurrentProduct: item.isCurrentProduct,
      categoryHandle: item.categoryHandle,
    });
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/80 z-[9999999] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="fixed inset-0 z-[9999999999] flex items-center justify-center p-3 sm:p-4 pointer-events-none"
          >
            <div className="bg-white w-full max-w-5xl max-h-[92vh] overflow-hidden border-gray-200 border pointer-events-auto flex flex-col">
              <div className="flex justify-between items-start gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
                    計算您在 {destination} 需要多少數據量
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    用量以偏保守方式估算
                    {hasCrossProduct
                      ? "，並比較同地區相關 eSIM（含總量型／吃到飽）後推薦。"
                      : "，並依本商品方案直接推薦合適變體。"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0"
                  aria-label="關閉"
                >
                  <MaterialIcon name="close" size={22} />
                </button>
              </div>

              <div className="overflow-y-auto p-5 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-bold text-slate-800 mb-2">
                        您的行程總共幾天?
                      </p>
                      <div className="inline-flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={days}
                          onChange={(e) => setDays(e.target.value)}
                          className="w-20 h-11 px-3 rounded-xl border border-gray-200 bg-white text-center text-base font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#00befa]/30 focus:border-[#00befa]"
                        />
                        <span className="text-sm font-medium text-slate-600">
                          天
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-800 mb-3">
                        您每天的 App 使用習慣如何?
                      </p>
                      <div className="space-y-3">
                        {rows.map((row) => (
                          <div
                            key={row.id}
                            className="flex items-start sm:items-center gap-3 rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">
                                {row.label}
                              </p>
                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                {row.apps}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <div className="relative">
                                <select
                                  value={row.hours}
                                  onChange={(e) =>
                                    setHoursById((prev) => ({
                                      ...prev,
                                      [row.id]: Number(e.target.value),
                                    }))
                                  }
                                  aria-label={`${row.label}每日使用時數`}
                                  className="h-10 w-[7.25rem] appearance-none cursor-pointer rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-semibold text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-[#00befa] focus:ring-2 focus:ring-[#00befa]/20"
                                >
                                  {HOUR_OPTIONS.map((h) => (
                                    <option key={h} value={h}>
                                      {h} 小時
                                    </option>
                                  ))}
                                </select>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                                  <MaterialIcon name="expand_more" size={18} />
                                </span>
                              </div>
                              <span className="text-xs font-medium text-slate-400 w-14 text-right tabular-nums">
                                {formatGb(row.dailyGb)} GB
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-bold text-slate-800 mb-4 text-center">
                        您的每日預估數據用量
                      </p>
                      <div className="relative mx-auto w-[220px] h-[220px] sm:w-[240px] sm:h-[240px]">
                        <Doughnut data={chartData} options={chartOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-[11px] text-slate-400 font-medium">
                            每日
                          </p>
                          <p className="text-xl font-bold text-slate-900 tabular-nums">
                            {formatGb(dailyTotalGb)} GB
                          </p>
                        </div>
                      </div>
                      {activeRows.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                          {activeRows.map((r) => (
                            <div
                              key={r.id}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-600"
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: r.color }}
                              />
                              {r.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl bg-[#e8f7fc] border border-[#c5ebf7] p-5 space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">行程時長</span>
                        <span className="font-semibold text-slate-900">
                          {tripDays} 天
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">每日螢幕使用時間</span>
                        <span className="font-semibold text-slate-900">
                          {screenHours.toFixed(1)} 小時
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">每日平均</span>
                        <span className="font-semibold text-slate-900">
                          {formatGb(dailyTotalGb)} GB
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">預估總流量</span>
                        <span className="font-semibold text-slate-900">
                          {formatGb(tripTotalGb)} GB
                        </span>
                      </div>
                      <div className="pt-3 mt-1 border-t border-[#b7e4f3]">
                        <div className="flex justify-between items-end gap-3">
                          <span className="text-sm font-bold text-slate-700">
                            建議流量門檻
                          </span>
                          <span className="text-2xl font-bold text-[#00a8e0] tabular-nums leading-none">
                            ≥ {suggestedGb} GB
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-800 mb-3">
                        建議方案
                        {hasCrossProduct ? (
                          <span className="font-normal text-slate-500 ml-1">
                            · {destination} 相關 eSIM
                          </span>
                        ) : productName ? (
                          <span className="font-normal text-slate-500 ml-1">
                            · {productName}
                          </span>
                        ) : null}
                      </p>
                      {recommendations.length === 0 ? (
                        <p className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-5 text-center">
                          目前沒有完全符合的變體，請手動調整天數或流量後再試。
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {recommendations.map((item) => (
                            <button
                              key={
                                item.variant?.id ||
                                `${item.productSlug}-${item.telecom}-${item.days}-${item.dataLabel}`
                              }
                              type="button"
                              onClick={() => handlePick(item)}
                              className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm hover:border-[#2d62cc] hover:shadow-md transition-all group"
                            >
                              <MiniSimIcon />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {item.isBestMatch ? (
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#2d62cc] bg-white border border-[#2d62cc]/30 px-1.5 py-0.5 rounded">
                                      最推薦
                                    </span>
                                  ) : null}
                                  {item.productLabel ? (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white ${
                                        item.isCurrentProduct
                                          ? "text-emerald-700 border-emerald-200"
                                          : "text-slate-600 border-slate-200"
                                      }`}
                                    >
                                      {item.isCurrentProduct
                                        ? `本商品 · ${item.productLabel}`
                                        : item.productLabel}
                                    </span>
                                  ) : null}
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {item.days}天 ·{" "}
                                    {item.gb === Number.POSITIVE_INFINITY
                                      ? "吃到飽"
                                      : item.dataLabel}
                                  </p>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                  {formatTelecomShort(item.telecom)}
                                  {!item.isCurrentProduct && item.productName
                                    ? ` · ${item.productName}`
                                    : ""}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-base font-bold text-slate-900 tabular-nums">
                                  NT${item.price.toLocaleString()}
                                </p>
                                <p className="text-[11px] text-[#2d62cc] font-semibold group-hover:underline">
                                  {item.isCurrentProduct
                                    ? "選此方案 →"
                                    : "另開選購 →"}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
