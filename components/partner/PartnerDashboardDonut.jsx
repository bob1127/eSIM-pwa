import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import MaterialIcon from "@/components/MaterialIcon";
import { fmt } from "@/components/partner/DobermanWidgets";

ChartJS.register(ArcElement, Tooltip, Legend);

const PALETTE = ["#1E4AD1", "#4ade80", "#fbbf24", "#f87171", "#a78bfa", "#94a3b8"];

export default function PartnerDashboardDonut({ share = [], totalProfit = 0, loading }) {
  if (loading) {
    return (
      <div className="h-36 flex items-center justify-center text-slate-400 text-xs">
        載入中...
      </div>
    );
  }

  const donutData = {
    labels: share.map(([n]) => n),
    datasets: [{
      data: share.map(([, v]) => v),
      backgroundColor: PALETTE,
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32 shrink-0">
        {share.length > 0 ? (
          <>
            <Doughnut
              data={donutData}
              options={{
                cutout: "66%",
                plugins: { legend: { display: false } },
                maintainAspectRatio: false,
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[9px] text-slate-400 font-bold">合計</p>
              <p className="text-xs font-black text-slate-700">{fmt(totalProfit)}</p>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex flex-col items-center justify-center gap-1">
              <MaterialIcon name="pie_chart" size={28} className="text-slate-300" />
              <p className="text-[10px] text-slate-400">無資料</p>
            </div>
          </div>
        )}
      </div>

      <ul className="space-y-1.5 flex-1 min-w-0">
        {share.length > 0
          ? share.map(([name, val], i) => (
            <li key={name} className="flex items-center gap-1.5 text-xs min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="text-slate-500 truncate flex-1">{name}</span>
              <span className="font-bold text-[#1E4AD1] tabular-nums shrink-0">
                {totalProfit > 0 ? `${Math.round((val / totalProfit) * 100)}%` : "0%"}
              </span>
            </li>
          ))
          : (
            <li className="text-xs text-slate-400">尚無分潤資料</li>
          )}
      </ul>
    </div>
  );
}
