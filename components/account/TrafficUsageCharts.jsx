"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import AccountIcon from "@/components/account/AccountIcon";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { formatMb } from "@/lib/esimUsageFormat";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const NAVY = "#1E4AD1";
const BLUE = "#0071EB";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";

export default function TrafficUsageCharts({ esims, results, selectedId, loading }) {
  const selected = esims.find((e) => e.topupId === selectedId) || esims[0];
  const r = selected ? results[selected.topupId] : null;

  const remaining = r?.remainingMb != null ? Number(r.remainingMb) : null;
  const total = r?.totalMb != null ? Number(r.totalMb) : null;
  const used =
    remaining != null && total != null && total > 0 ? Math.max(0, total - remaining) : null;

  const hasDonut = remaining != null && total != null && total > 0;

  const donutData = hasDonut
    ? {
        labels: ["剩餘", "已使用"],
        datasets: [
          {
            data: [remaining, used],
            backgroundColor: [BLUE, "#cbd5e1"],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      }
    : null;

  const barLabels = esims
    .filter((e) => results[e.topupId]?.remainingMb != null)
    .map((e) => (e.productName.length > 8 ? `${e.productName.slice(0, 8)}…` : e.productName));

  const barValues = esims
    .filter((e) => results[e.topupId]?.remainingMb != null)
    .map((e) => Number(results[e.topupId].remainingMb));

  const barData =
    barLabels.length > 0
      ? {
          labels: barLabels,
          datasets: [
            {
              label: "剩餘 MB",
              data: barValues,
              backgroundColor: BLUE,
              borderRadius: 4,
              maxBarThickness: 36,
            },
          ],
        }
      : null;

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <LoadingIndicator
          layout="center"
          label="查詢中…"
          labelClassName="text-slate-400 text-sm"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-black text-[#1E4AD1] flex items-center gap-1.5">
            <AccountIcon name="donut_large" size={18} />
            用量比例
          </h4>
          {selected && (
            <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
              {selected.productName}
            </span>
          )}
        </div>
        {hasDonut ? (
          <>
            <div className="flex items-center gap-4">
              <div className="relative w-36 h-36 shrink-0 mx-auto sm:mx-0">
                <Doughnut
                  data={donutData}
                  options={{
                    cutout: "68%",
                    plugins: { legend: { display: false } },
                    maintainAspectRatio: false,
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[10px] text-slate-400 font-bold">剩餘</p>
                  <p className="text-sm font-black text-[#1E4AD1]">
                    {formatMb(remaining)}
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-xs flex-1">
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BLUE }} />
                  <span className="text-slate-600">剩餘 {formatMb(remaining)}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-slate-300" />
                  <span className="text-slate-600">已使用 {formatMb(used)}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: NAVY }} />
                  <span className="text-slate-600">總量 {formatMb(total)}</span>
                </li>
              </ul>
            </div>
            {/* ICCID 顯示 */}
            {selected && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">ICCID</p>
                <p className="text-xs font-mono text-[#1E4AD1] break-all">
                  {r?.iccid || selected.iccid || "—"}
                </p>
                {r?.expiresAt && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    到期日：{new Date(r.expiresAt).toLocaleDateString("zh-TW")}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            <AccountIcon name="pie_chart" size={32} className="mx-auto mb-2 opacity-40" />
            點選左側方案，自動查詢並顯示圖表
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 p-4">
        <h4 className="text-sm font-black text-[#1E4AD1] flex items-center gap-1.5 mb-3">
          <AccountIcon name="bar_chart" size={18} />
          各方案剩餘比較
        </h4>
        {barData ? (
          <div className="h-40">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { beginAtZero: true, ticks: { font: { size: 10 } } },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">
            查詢多筆 eSIM 後可在此比較
          </p>
        )}
      </div>
    </div>
  );
}
