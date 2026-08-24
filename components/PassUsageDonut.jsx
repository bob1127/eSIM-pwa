"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
} from "chart.js";
import { formatMb } from "@/lib/esimUsageFormat";

ChartJS.register(ArcElement, Tooltip);

const BLUE = "#0071EB";

export default function PassUsageDonut({ remainingMb, usedMb, totalMb }) {
  const data = {
    labels: ["剩餘", "已使用"],
    datasets: [
      {
        data: [remainingMb, Math.max(0, usedMb)],
        backgroundColor: [BLUE, "#cbd5e1"],
        borderWidth: 0,
        hoverOffset: 2,
      },
    ],
  };

  return (
    <div className="relative h-[120px] w-[120px]">
      <Doughnut
        data={data}
        options={{
          cutout: "68%",
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          maintainAspectRatio: false,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-[10px] text-slate-400 font-bold">剩餘</p>
        <p className="text-sm font-black text-[#1E4AD1]">
          {formatMb(remainingMb)}
        </p>
        {totalMb != null ? (
          <p className="text-[9px] text-slate-400 mt-0.5">
            / {formatMb(totalMb)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
