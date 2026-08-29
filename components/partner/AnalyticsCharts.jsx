import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { fmt } from "@/components/partner/DobermanWidgets";
import { SHOPIFY_UI } from "@/lib/shopifyUi";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip);

/** 比照圖二 Primary Clients：滿版甜甜圈 + 置中大數字（分潤占營收比） */
export function RevenueSplitDonut({
  profit = 0,
  cost = 0,
  other = 0,
  costLabel = "底價成本",
}) {
  const total = profit + cost + other;
  const rate = total > 0 ? Math.round((profit / (profit + cost || 1)) * 100) : 0;
  const data = {
    labels: ["分潤", costLabel, "其他"],
    datasets: [
      {
        data: [profit, cost, Math.max(other, 0)],
        backgroundColor: ["#2c6ecb", "#e3e5e7", "#f1c21b"],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28 shrink-0">
        {total > 0 ? (
          <Doughnut
            data={data}
            options={{
              cutout: "72%",
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` ${fmt(ctx.parsed)}` } },
              },
            }}
          />
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-lg font-black" style={{ color: SHOPIFY_UI.textPrimary }}>
            {rate}%
          </p>
          <p className="text-[9px] font-bold" style={{ color: SHOPIFY_UI.textTertiary }}>
            分潤率
          </p>
        </div>
      </div>
      <ul className="space-y-1.5 flex-1 min-w-0 text-xs">
        {[
          ["分潤", profit, "#2c6ecb"],
          [costLabel, cost, "#8c9196"],
        ].map(([label, val, color]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span style={{ color: SHOPIFY_UI.textSecondary }} className="flex-1">
              {label}
            </span>
            <span className="font-bold tabular-nums" style={{ color: SHOPIFY_UI.textPrimary }}>
              {fmt(val)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 比照圖二 Recently Added Machines：色塊圓形大數字計數器 */
export function CountCircle({ value = 0, color = "#008060" }) {
  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shrink-0"
      style={{ backgroundColor: color }}
    >
      {value}
    </div>
  );
}

/** 比照圖二 Machine Info Versions：直立長條圖（近 N 月分潤趨勢） */
export function MonthlyBarChart({ buckets = [] }) {
  const data = {
    labels: buckets.map((b) => b.label),
    datasets: [
      {
        data: buckets.map((b) => Math.round(b.profit)),
        backgroundColor: "#2c6ecb",
        borderRadius: 8,
        maxBarThickness: 28,
      },
    ],
  };
  const hasData = buckets.some((b) => b.profit > 0);
  if (!hasData) {
    return (
      <div
        className="h-full min-h-[120px] flex items-center justify-center text-xs"
        style={{ color: SHOPIFY_UI.textTertiary }}
      >
        此期間尚無分潤資料
      </div>
    );
  }
  return (
    <Bar
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.y)}` } },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.06)" },
            ticks: {
              font: { size: 10 },
              callback: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v),
            },
          },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      }}
    />
  );
}

/** 比照圖三 Active Projects 卡片內小型圓形進度環（商品分潤占比） */
export function MiniShareRing({ percent = 0, color = "#2c6ecb" }) {
  const data = {
    datasets: [
      {
        data: [percent, Math.max(100 - percent, 0)],
        backgroundColor: [color, SHOPIFY_UI.canvasBg],
        borderWidth: 0,
      },
    ],
  };
  return (
    <div className="relative w-14 h-14 shrink-0">
      <Doughnut
        data={data}
        options={{
          cutout: "70%",
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[11px] font-black" style={{ color: SHOPIFY_UI.textPrimary }}>
          {percent}%
        </span>
      </div>
    </div>
  );
}
