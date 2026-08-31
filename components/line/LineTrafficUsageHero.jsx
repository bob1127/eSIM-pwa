"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { motion } from "framer-motion";
import { formatMb, usagePercent, resolveEsimExpiryDisplay } from "@/lib/esimUsageFormat";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

ChartJS.register(ArcElement, Tooltip, CategoryScale, LinearScale, BarElement);

const BLUE = "#276EF1";
const YELLOW = "#F5C518";

const HERO_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 26,
  mass: 0.82,
};

/** 上方「地圖位」用量圖表（叫車介面 hero） */
export default function LineTrafficUsageHero({
  productName,
  usage,
  loading,
  onRefresh,
  sheetCollapsed = false,
}) {
  const remaining = usage?.remainingMb != null ? Number(usage.remainingMb) : null;
  const total = usage?.totalMb != null ? Number(usage.totalMb) : null;
  const used =
    remaining != null && total != null && total > 0
      ? Math.max(0, total - remaining)
      : null;
  const hasDonut = remaining != null && total != null && total > 0;
  const pct = usagePercent(remaining, total);

  return (
    <motion.div
      className="relative flex h-full min-h-[260px] flex-col items-center justify-center px-5"
      animate={{
        paddingTop: sheetCollapsed ? 72 : 56,
        paddingBottom: sheetCollapsed ? 56 : 40,
        y: sheetCollapsed ? 18 : -4,
      }}
      transition={HERO_SPRING}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #fff 0 1px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 0 1px, transparent 1px)",
          backgroundSize: "28px 28px, 36px 36px",
        }}
      />

      {loading && !hasDonut ? (
        <LoadingIndicator
          layout="center"
          label="查詢用量中…"
          labelClassName="text-[13px] text-[#3A5A8C]"
        />
      ) : hasDonut ? (
        <motion.div
          className="relative z-[1] flex flex-col items-center"
          layout
          transition={HERO_SPRING}
        >
          <div className="relative h-44 w-44">
            <Doughnut
              data={{
                labels: ["剩餘", "已使用"],
                datasets: [
                  {
                    data: [remaining, used],
                    backgroundColor: [BLUE, YELLOW],
                    borderWidth: 0,
                    hoverOffset: 0,
                  },
                ],
              }}
              options={{
                cutout: "72%",
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                maintainAspectRatio: false,
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[11px] font-semibold text-[#3A5A8C]">剩餘流量</p>
              <p className="text-[22px] font-black tracking-tight text-[#0B1F40]">
                {formatMb(remaining)}
              </p>
              {pct != null ? (
                <p className="text-[12px] font-bold text-[#276EF1]">
                  {Math.round(pct)}%
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-[14px] font-black text-[#0B1F40]">
              {productName || "使用用量"}
            </p>
            <p className="mt-0.5 text-[12px] text-[#3A5A8C]">
              已用 {formatMb(used)} · 總量 {formatMb(total)}
              {usage?.expiresAt
                ? ` · ${resolveEsimExpiryDisplay(usage).shortLine || `到期 ${String(usage.expiresAt).slice(0, 16)}`}`
                : ""}
            </p>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="mt-2 text-[12px] font-bold text-[#276EF1] underline-offset-2 hover:underline disabled:opacity-50"
              >
                {loading ? "更新中…" : "更新用量"}
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex gap-4 text-[11px] font-semibold text-[#0B1F40]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#276EF1]" />
              剩餘
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#F5C518]" />
              已使用
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="relative z-[1] max-w-[260px] text-center">
          <p className="text-[18px] font-black text-[#0B1F40]">使用用量</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#3A5A8C]">
            登入會員選 eSIM，或輸入 ICCID 後，這裡會顯示剩餘流量圖表。
          </p>
        </div>
      )}
    </motion.div>
  );
}
