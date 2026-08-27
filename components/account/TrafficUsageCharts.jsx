"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import AccountIcon from "@/components/account/AccountIcon";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { formatMb } from "@/lib/esimUsageFormat";

ChartJS.register(ArcElement, Tooltip, Legend);

const NAVY = "#1E4AD1";
const BLUE = "#0071EB";

function resultFor(esim, results) {
  if (!esim || !results) return null;
  const key = String(esim.topupId || esim.iccid || "");
  return results[key] ?? results[esim.topupId] ?? null;
}

export default function TrafficUsageCharts({ esims, results, selectedId, loading }) {
  const selected =
    esims.find((e) => String(e.topupId || e.iccid) === String(selectedId)) ||
    esims[0];
  const r = selected ? resultFor(selected, results) : null;
  const queried = Boolean(r);

  const remaining = r?.remainingMb != null ? Number(r.remainingMb) : null;
  const total = r?.totalMb != null ? Number(r.totalMb) : null;
  const used =
    remaining != null && total != null && total > 0
      ? Math.max(0, total - remaining)
      : r?.usedMb != null
        ? Number(r.usedMb)
        : null;

  const hasDonut = remaining != null && total != null && total > 0;
  /** 吃到飽等：有已用、無總量／剩餘 → 仍算有查到資料 */
  const hasUsedOnly =
    !hasDonut && used != null && Number.isFinite(used) && used >= 0;

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
    <div className="space-y-4">
      <div>
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
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: BLUE }}
                  />
                  <span className="text-slate-600">
                    剩餘 {formatMb(remaining)}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-slate-300" />
                  <span className="text-slate-600">
                    已使用 {formatMb(used)}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: NAVY }}
                  />
                  <span className="text-slate-600">總量 {formatMb(total)}</span>
                </li>
              </ul>
            </div>
            {selected && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                  ICCID
                </p>
                <p className="text-xs font-mono text-[#1E4AD1] break-all">
                  {r?.iccid || selected.iccid || "—"}
                </p>
                {r?.expiresAt && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    到期日：{String(r.expiresAt).slice(0, 10)}
                  </p>
                )}
              </div>
            )}
          </>
        ) : hasUsedOnly ? (
          <div className="py-4 px-2 space-y-3">
            <div className="text-center space-y-1">
              <p className="text-[11px] font-bold text-slate-400 tracking-wide">
                吃到飽／無固定額度 · 使用流量
              </p>
              <p className="text-3xl font-black text-[#1E4AD1]">
                {formatMb(used)}
              </p>
              <p className="text-xs text-slate-500">
                供應商未提供總量／剩餘，故不以圓環比例顯示
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-left space-y-1 text-[11px] text-slate-600">
              {(r?.iccid || selected?.iccid) && (
                <p className="font-mono break-all">
                  訂單 ICCID {r?.iccid || selected?.iccid}
                </p>
              )}
              {r?.status && <p>狀態：{r.status}</p>}
              {(r?.activatedAt || r?.createdAt) && (
                <p>
                  啟用：
                  {String(r.activatedAt || r.createdAt).slice(0, 16)}
                </p>
              )}
              {r?.expiresAt && (
                <p>效期至：{String(r.expiresAt).slice(0, 10)}</p>
              )}
            </div>
          </div>
        ) : queried ? (
          <div className="text-center py-6 px-2 space-y-2">
            <AccountIcon
              name="sync"
              size={32}
              className="mx-auto text-[#1E4AD1]/60"
            />
            <p className="text-sm font-bold text-slate-700">
              {r?.activatedAt || r?.createdAt
                ? "供應商已開通 · 暫無流量數值"
                : "已查詢 · 暫無流量數值"}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              此方案尚未回傳已用／剩餘 MB（可能尚未產生流量或同步延遲）。下方時間為供應商紀錄，非手機安裝時間。
            </p>
            <div className="pt-2 text-left max-w-xs mx-auto space-y-1 text-[11px] text-slate-600">
              {(r?.iccid || selected?.iccid) && (
                <p className="font-mono break-all">
                  ICCID {r?.iccid || selected?.iccid}
                </p>
              )}
              {r?.status && <p>狀態：{r.status}</p>}
              {(r?.activatedAt || r?.createdAt) && (
                <p>
                  供應商開通：
                  {String(r.activatedAt || r.createdAt).slice(0, 16)}
                </p>
              )}
              {r?.expiresAt && (
                <p>效期至：{String(r.expiresAt).slice(0, 10)}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            <AccountIcon
              name="pie_chart"
              size={32}
              className="mx-auto mb-2 opacity-40"
            />
            點「查詢流量」後顯示用量圖表
          </div>
        )}
      </div>
    </div>
  );
}
