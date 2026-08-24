"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { formatMb, usagePercent } from "@/lib/esimUsageFormat";

ChartJS.register(ArcElement, Tooltip, CategoryScale, LinearScale, BarElement);

const BLUE = "#1E4AD1";
const BLUE_SOFT = "#4C8DFF";
const YELLOW = "#FADE2B";

/** 設計預覽用假資料（之後有真實用量可改傳入 props） */
export const USAGE_DEMO = {
  remainingMb: 6840,
  totalMb: 10240,
  expiresAt: "2026-08-30T18:00:00+08:00",
  dailyUsedMb: [420, 680, 510, 890, 720, 640, 540],
};

/**
 * 剩餘用量圖表（甜甜圈＋近 7 日長條）
 */
export default function UsageRingPreview({
  remainingMb = USAGE_DEMO.remainingMb,
  totalMb = USAGE_DEMO.totalMb,
  expiresAt = USAGE_DEMO.expiresAt,
  dailyUsedMb = USAGE_DEMO.dailyUsedMb,
}) {
  const remaining = Math.max(0, Number(remainingMb) || 0);
  const total = Math.max(0, Number(totalMb) || 0);
  const used = total > 0 ? Math.max(0, total - remaining) : 0;
  const pct = usagePercent(remaining, total) ?? 0;
  const days = ["一", "二", "三", "四", "五", "六", "日"];

  const donutData = {
    labels: ["剩餘", "已使用"],
    datasets: [
      {
        data: total > 0 ? [remaining, used] : [1, 0],
        backgroundColor: [BLUE, YELLOW],
        borderWidth: 0,
        hoverOffset: 0,
        borderRadius: 6,
        spacing: 2,
      },
    ],
  };

  const barData = {
    labels: days,
    datasets: [
      {
        data: dailyUsedMb,
        backgroundColor: dailyUsedMb.map((_, i) =>
          i === dailyUsedMb.length - 1 ? BLUE : BLUE_SOFT,
        ),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 14,
      },
    ],
  };

  return (
    <div className="mt-1 w-full">
      <div className="relative mx-auto flex flex-col items-center rounded-2xl bg-gradient-to-b from-white to-[#F0F5FF] px-3 pb-3 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#1E4AD1]/10">
        <div className="relative h-[148px] w-[148px]">
          <Doughnut
            data={donutData}
            options={{
              cutout: "74%",
              rotation: -90,
              plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
              },
              maintainAspectRatio: false,
            }}
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[10px] font-bold tracking-wide text-slate-400">
              剩餘流量
            </p>
            <p className="mt-0.5 text-[22px] font-black leading-none tracking-tight text-slate-900">
              {formatMb(remaining) || "—"}
            </p>
            <p className="mt-1 text-[12px] font-black text-[#1E4AD1]">
              {Math.round(pct)}%
            </p>
          </div>
        </div>

        <div className="mt-3 flex w-full items-center justify-center gap-4 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span
              className="h-2.5 w-2.5 rounded-full shadow-sm"
              style={{ background: BLUE }}
            />
            剩餘 {formatMb(remaining)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span
              className="h-2.5 w-2.5 rounded-full shadow-sm ring-1 ring-black/5"
              style={{ background: YELLOW }}
            />
            已用 {formatMb(used)}
          </span>
        </div>

        <p className="mt-1.5 text-[11px] text-slate-400">
          總量 {formatMb(total)}
          {expiresAt
            ? ` · 到期 ${new Date(expiresAt).toLocaleDateString("zh-TW", {
                month: "2-digit",
                day: "2-digit",
              })}`
            : ""}
        </p>
      </div>

      <div className="mt-3 rounded-2xl bg-white/80 px-3 pt-3 pb-2 ring-1 ring-slate-200/80">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-700">近 7 日用量</p>
          <p className="text-[10px] font-semibold text-slate-400">MB / 日</p>
        </div>
        <div className="h-[88px]">
          <Bar
            data={barData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { enabled: true } },
              scales: {
                x: {
                  grid: { display: false },
                  border: { display: false },
                  ticks: {
                    color: "#94a3b8",
                    font: { size: 10, weight: "700" },
                  },
                },
                y: {
                  display: false,
                  grid: { display: false },
                  border: { display: false },
                },
              },
            }}
          />
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">
        數據依供應商更新，可能有 30 分鐘以上延遲
      </p>
    </div>
  );
}
