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
import { formatMb, usagePercent, formatExpiryTaiwan } from "@/lib/esimUsageFormat";

ChartJS.register(ArcElement, Tooltip, CategoryScale, LinearScale, BarElement);

const BLUE = "#1E4AD1";
const BLUE_SOFT = "#4C8DFF";
const YELLOW = "#FADE2B";
const GREY_RING = "#CBD5E1";

/** 僅供設計預覽頁使用；正式用量 UI 不得當預設值 */
export const USAGE_DEMO = {
  remainingMb: 6840,
  totalMb: 10240,
  expiresAt: "2026-08-30T18:00:00+08:00",
  dailyUsedMb: [420, 680, 510, 890, 720, 640, 540],
};

/**
 * 剩餘用量圖表（甜甜圈＋可選近 7 日長條）
 * - 有總量：藍／黃比例圖
 * - 吃到飽／尚未使用（variant=muted）：灰階反白圖表，上方大數字顯示使用流量
 */
export default function UsageRingPreview({
  remainingMb = null,
  totalMb = null,
  usedMb = null,
  expiresAt = null,
  /** 由 resolveEsimExpiryDisplay().footer 傳入；優先於 expiresAt */
  expiryFooter = null,
  dailyUsedMb = null,
  /** "quota" | "muted" — muted＝吃到飽或尚無比例可畫 */
  variant = "quota",
}) {
  const muted = variant === "muted";
  const remaining = Math.max(0, Number(remainingMb) || 0);
  const total = Math.max(0, Number(totalMb) || 0);
  const usedFromQuota = total > 0 ? Math.max(0, total - remaining) : 0;
  const used =
    usedMb != null && Number.isFinite(Number(usedMb))
      ? Math.max(0, Number(usedMb))
      : usedFromQuota;
  const pct = usagePercent(remaining, total) ?? 0;
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const daily = Array.isArray(dailyUsedMb)
    ? dailyUsedMb.map((n) => Math.max(0, Number(n) || 0))
    : [];
  const showDaily = !muted && daily.length > 0 && daily.some((n) => n > 0);

  const donutData = muted
    ? {
        labels: ["使用流量", "—"],
        datasets: [
          {
            // 全灰環：視覺上「反白／未啟用比例圖」
            data: [1],
            backgroundColor: [GREY_RING],
            borderWidth: 0,
            hoverOffset: 0,
            borderRadius: 6,
            spacing: 0,
          },
        ],
      }
    : {
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
    labels: days.slice(0, daily.length) || days,
    datasets: [
      {
        data: daily,
        backgroundColor: daily.map((_, i) =>
          i === daily.length - 1 ? BLUE : BLUE_SOFT,
        ),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 14,
      },
    ],
  };

  return (
    <div className="mt-1 w-full">
      {/* 吃到飽：上方只留一組大數字，圖表中心不再重複 */}
      {muted ? (
        <>
          <p className="mb-2 text-center text-[11px] font-bold tracking-wide text-slate-400">
            使用流量
          </p>
          <p className="mb-3 text-center text-[32px] font-black leading-none tracking-tight text-[#1E4AD1]">
            {formatMb(used) || "0 MB"}
          </p>
        </>
      ) : null}

      <div
        className={[
          "relative mx-auto flex flex-col items-center rounded-2xl px-3 pb-3 pt-4",
          muted
            ? "bg-gradient-to-b from-slate-50 to-slate-100/80 shadow-none ring-1 ring-slate-200/80 opacity-90"
            : "bg-gradient-to-b from-white to-[#F0F5FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#1E4AD1]/10",
        ].join(" ")}
      >
        <div className={`relative h-[148px] w-[148px] ${muted ? "grayscale" : ""}`}>
          <Doughnut
            data={donutData}
            options={{
              cutout: "74%",
              rotation: -90,
              plugins: {
                legend: { display: false },
                tooltip: { enabled: !muted },
              },
              maintainAspectRatio: false,
            }}
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {muted ? (
              <>
                <p className="text-[11px] font-bold tracking-wide text-slate-400">
                  吃到飽
                </p>
                <p className="mt-1 text-[13px] font-black text-slate-500">
                  無固定額度
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold tracking-wide text-slate-400">
                  剩餘流量
                </p>
                <p className="mt-0.5 text-[22px] font-black leading-none tracking-tight text-slate-900">
                  {formatMb(remaining) || "—"}
                </p>
                <p className="mt-1 text-[12px] font-black text-[#1E4AD1]">
                  {total > 0 ? `${Math.round(pct)}%` : "—"}
                </p>
              </>
            )}
          </div>
        </div>

        <div
          className={[
            "mt-3 flex w-full items-center justify-center gap-4 text-[11px] font-bold",
            muted ? "text-slate-400" : "text-slate-600",
          ].join(" ")}
        >
          {muted ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full shadow-sm"
                style={{ background: GREY_RING }}
              />
              已用流量見上方數字
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full shadow-sm"
                  style={{ background: BLUE }}
                />
                剩餘 {formatMb(remaining) || "—"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full shadow-sm ring-1 ring-black/5"
                  style={{ background: YELLOW }}
                />
                已用 {formatMb(used) || "—"}
              </span>
            </>
          )}
        </div>

        <p className="mt-1.5 text-[11px] text-slate-400">
          {muted
            ? "吃到飽方案"
            : total > 0
              ? `總量 ${formatMb(total)}`
              : "總量 —"}
          {expiryFooter != null
            ? expiryFooter
            : expiresAt
              ? ` · 到期 ${formatExpiryTaiwan(expiresAt)}`
              : ""}
        </p>
      </div>

      {showDaily ? (
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
                plugins: {
                  legend: { display: false },
                  tooltip: { enabled: true },
                },
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
      ) : null}

      <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">
        用量更新通常需間隔 30–60 分鐘；手機顯示用量通常會略高於此數字
        {!showDaily && !muted ? " · 供應商未提供每日明細" : ""}
      </p>
    </div>
  );
}
