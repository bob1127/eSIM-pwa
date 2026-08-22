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
import LoadingIndicator from "@/components/ui/LoadingIndicator";

ChartJS.register(ArcElement, Tooltip, CategoryScale, LinearScale, BarElement);

const BLUE = "#2D55B8";
const YELLOW = "#F5D142";

export default function LineTrafficUsageCard({
  productName,
  usage,
  usageById,
  esims,
  viewId,
  onViewChange,
  loading,
  onRefresh,
}) {
  const list = Array.isArray(esims) ? esims : [];
  const remaining = usage?.remainingMb != null ? Number(usage.remainingMb) : null;
  const total = usage?.totalMb != null ? Number(usage.totalMb) : null;
  const used =
    remaining != null && total != null && total > 0
      ? Math.max(0, total - remaining)
      : null;
  const hasDonut = remaining != null && total != null && total > 0;
  const pct = usagePercent(remaining, total);

  const pickUsage = (id) => usageById?.[id] || usageById?.[String(id)];
  const barItems = list.filter(
    (e) => pickUsage(e.topupId)?.remainingMb != null,
  );
  const viewIndex = Math.max(
    0,
    list.findIndex((e) => String(e.topupId) === String(viewId)),
  );
  const canSwitch = list.length > 1;

  const go = (dir) => {
    if (!list.length) return;
    const next = (viewIndex + dir + list.length) % list.length;
    onViewChange?.(String(list[next].topupId));
  };

  const barData =
    barItems.length > 1
      ? {
          labels: barItems.map((e) =>
            e.productName.length > 8
              ? `${e.productName.slice(0, 8)}…`
              : e.productName,
          ),
          datasets: [
            {
              label: "剩餘 MB",
              data: barItems.map((e) =>
                Number(pickUsage(e.topupId).remainingMb),
              ),
              backgroundColor: barItems.map((e) =>
                String(e.topupId) === String(viewId) ? BLUE : "#9BB3E8",
              ),
              borderRadius: 6,
              maxBarThickness: 28,
            },
          ],
        }
      : null;

  return (
    <section className="mb-3 rounded-[16px] bg-white p-4 shadow-[0_4px_16px_rgba(26,40,80,0.06)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-black text-[#1A1A1A]">剩餘流量</h2>
          <p className="mt-0.5 text-[11px] text-[#888888]">
            {productName || "會員方案"} · 每張都可查，通知只綁一張
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            {loading ? (
              <LoadingIndicator
                layout="inline"
                size="xs"
                label="查詢中"
                className="justify-center"
                labelClassName="text-[11px] font-black text-white"
                spinnerClassName="text-white"
              />
            ) : (
              "更新"
            )}
          </button>
        ) : null}
      </div>

      {canSwitch ? (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E6EAF2] text-[#2D55B8]"
            aria-label="上一張"
          >
            ‹
          </button>
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
            {list.map((esim) => {
              const id = String(esim.topupId || "");
              const on = String(viewId) === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onViewChange?.(id)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black"
                  style={
                    on
                      ? { backgroundColor: BLUE, color: "#fff" }
                      : { backgroundColor: "#EEF3FF", color: BLUE }
                  }
                >
                  {esim.productName.length > 10
                    ? `${esim.productName.slice(0, 10)}…`
                    : esim.productName}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E6EAF2] text-[#2D55B8]"
            aria-label="下一張"
          >
            ›
          </button>
        </div>
      ) : null}

      {loading && !hasDonut ? (
        <LoadingIndicator
          layout="center"
          label="查詢用量中…"
          className="py-8"
          labelClassName="text-[13px] text-[#888888]"
        />
      ) : hasDonut ? (
        <>
          <div className="flex items-center gap-4">
            <div className="relative mx-auto h-32 w-32 shrink-0">
              <Doughnut
                data={{
                  labels: ["剩餘", "已使用"],
                  datasets: [
                    {
                      data: [remaining, used],
                      backgroundColor: [BLUE, "#E6EAF2"],
                      borderWidth: 0,
                      hoverOffset: 2,
                    },
                  ],
                }}
                options={{
                  cutout: "70%",
                  plugins: { legend: { display: false } },
                  maintainAspectRatio: false,
                }}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold text-[#888888]">剩餘</p>
                <p className="text-[13px] font-black" style={{ color: BLUE }}>
                  {formatMb(remaining)}
                </p>
                {pct != null ? (
                  <p className="text-[10px] font-bold text-[#888888]">
                    {Math.round(pct)}%
                  </p>
                ) : null}
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2 text-[12px] text-[#555555]">
              <li className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: BLUE }}
                />
                剩餘 {formatMb(remaining)}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#E6EAF2]" />
                已使用 {formatMb(used)}
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: YELLOW }}
                />
                總量 {formatMb(total)}
              </li>
              {usage?.expiresAt ? (
                <li className="text-[11px] text-[#888888]">
                  到期 {String(usage.expiresAt).slice(0, 10)}
                </li>
              ) : null}
            </ul>
          </div>
          {barData ? (
            <div className="mt-4 h-36 border-t border-[#EEF1F6] pt-3">
              <p className="mb-2 text-[12px] font-black text-[#1A1A1A]">
                各方案剩餘比較
              </p>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  onClick: (_, elements) => {
                    const i = elements?.[0]?.index;
                    if (i == null || !barItems[i]) return;
                    onViewChange?.(String(barItems[i].topupId));
                  },
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 10 } },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: { font: { size: 10 } },
                    },
                  },
                }}
              />
            </div>
          ) : null}
        </>
      ) : (
        <p className="py-6 text-center text-[13px] text-[#888888]">
          尚無法顯示用量。請確認方案已開通，或稍後再更新。
        </p>
      )}
    </section>
  );
}
