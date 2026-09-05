"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
);

const BLUE = "#0071EB";
const GREEN = "#10b981";
const PALETTE = ["#0071EB", "#10b981", "#FADE2B", "#ef4444", "#5EEAD4", "#64748b"];

export function RevenueLineChart({ labels, revenueSeries, orderSeries, metric = "revenue" }) {
  const data =
    metric === "revenue"
      ? revenueSeries
      : orderSeries;

  return (
    <div className="h-56 sm:h-64">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: metric === "revenue" ? "營收 (NT$)" : "訂單數",
              data,
              borderColor: BLUE,
              backgroundColor: "rgba(37, 99, 235, 0.08)",
              fill: true,
              tension: 0.35,
              pointRadius: 2,
              pointHoverRadius: 5,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
            y: { beginAtZero: true, ticks: { font: { size: 10 } } },
          },
        }}
      />
    </div>
  );
}

export function StoreDonutChart({ storeShare, totalRevenue }) {
  const labels = storeShare.map((s) => s.name);
  const values = storeShare.map((s) => s.revenue);

  if (!values.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        尚無分店資料
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative w-40 h-40 shrink-0">
        <Doughnut
          data={{
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: PALETTE,
                borderWidth: 0,
              },
            ],
          }}
          options={{
            cutout: "65%",
            plugins: { legend: { display: false } },
            maintainAspectRatio: false,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] text-slate-400">總營收</p>
          <p className="text-xs font-bold text-[#1E4AD1]">
            {Math.round(totalRevenue).toLocaleString("zh-TW")}
          </p>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 text-xs w-full">
        {storeShare.slice(0, 6).map((s, i) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PALETTE[i] }} />
            <span className="text-slate-600 truncate flex-1">{s.name}</span>
            <span className="font-bold text-[#0071EB] tabular-nums">
              {totalRevenue > 0 ? `${Math.round((s.revenue / totalRevenue) * 100)}%` : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductBarChart({ productRank }) {
  if (!productRank?.length) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
        尚無商品銷售資料
      </div>
    );
  }

  const labels = productRank.map((p) =>
    p.name.length > 10 ? `${p.name.slice(0, 10)}…` : p.name,
  );

  return (
    <div className="h-48">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: "營收 NT$",
              data: productRank.map((p) => p.revenue),
              backgroundColor: GREEN,
              borderRadius: 4,
              maxBarThickness: 32,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { font: { size: 10 } } },
          },
        }}
      />
    </div>
  );
}

export function Sparkline({ data, color = BLUE }) {
  if (!data?.length) return null;
  return (
    <div className="h-8 w-20">
      <Line
        data={{
          labels: data.map((_, i) => i),
          datasets: [
            {
              data,
              borderColor: color,
              borderWidth: 1.5,
              pointRadius: 0,
              tension: 0.4,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            y: { display: false },
          },
        }}
      />
    </div>
  );
}
