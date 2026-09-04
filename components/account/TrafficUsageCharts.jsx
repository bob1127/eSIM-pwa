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
import {
  formatMb,
  isEsimUsageExpired,
  resolveEsimExpiryForPlan,
} from "@/lib/esimUsageFormat";
import {
  canShowEsimUsageStats,
  isEsimNotInstalledForUsage,
} from "@/lib/esimInstallStatus";
import { formatEsimValidityLinesZh } from "@/lib/esimDisplayZh";

ChartJS.register(ArcElement, Tooltip, Legend);

const NAVY = "#1E4AD1";
const BLUE = "#0071EB";

function resultFor(esim, results) {
  if (!esim || !results) return null;
  const key = String(esim.topupId || esim.iccid || "");
  return results[key] ?? results[esim.topupId] ?? null;
}

function ValidityBlock({ esim, usage, tone = "info", showExpiry = true }) {
  const lines = formatEsimValidityLinesZh({
    validityPeriod: esim?.validityPeriod || usage?.validityPeriod,
    serviceDays: esim?.serviceDays || usage?.serviceDays,
  });
  const expiry = resolveEsimExpiryForPlan(usage, esim);
  if (!lines.length && !(showExpiry && expiry.line)) return null;

  const styles =
    tone === "muted"
      ? {
          wrap: "bg-white/60 ring-slate-200/60 opacity-90",
          title: "text-slate-500",
          line: "text-slate-500",
          expiry: "text-slate-400",
        }
      : tone === "warn"
        ? {
            wrap: "bg-amber-50/90 ring-amber-100",
            title: "text-amber-900",
            line: "text-amber-950/80",
            expiry: "text-zinc-900",
          }
        : {
            wrap: "bg-sky-50/80 ring-sky-100",
            title: "text-sky-900",
            line: "text-sky-950/80",
            expiry: "text-zinc-900",
          };

  return (
    <div className="space-y-2 text-left max-w-sm mx-auto w-full">
      {lines.length ? (
        <div className={`rounded-xl px-3 py-2.5 ring-1 space-y-1 ${styles.wrap}`}>
          <p className={`text-[10px] font-bold tracking-wide ${styles.title}`}>
            效期說明
          </p>
          {lines.map((line) => (
            <p key={line} className={`text-[11px] leading-relaxed ${styles.line}`}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
      {showExpiry && expiry.line ? (
        <p className={`text-[11px] font-semibold text-center ${styles.expiry}`}>
          {expiry.line}
        </p>
      ) : null}
    </div>
  );
}

export default function TrafficUsageCharts({ esims, results, selectedId, loading }) {
  const selected =
    esims.find((e) => String(e.topupId || e.iccid) === String(selectedId)) ||
    esims[0];
  const r = selected ? resultFor(selected, results) : null;
  const expired = isEsimUsageExpired(r);
  const notInstalled = Boolean(r && isEsimNotInstalledForUsage(r));
  const canShowUsage = canShowEsimUsageStats(r) && !expired;
  const queried = Boolean(r);

  const remaining =
    canShowUsage && r?.remainingMb != null ? Number(r.remainingMb) : null;
  const total =
    canShowUsage && r?.totalMb != null ? Number(r.totalMb) : null;
  const used =
    canShowUsage && remaining != null && total != null && total > 0
      ? Math.max(0, total - remaining)
      : canShowUsage && r?.usedMb != null
        ? Number(r.usedMb)
        : null;

  const hasDonut = remaining != null && total != null && total > 0;
  /** 吃到飽等：有已用、無總量／剩餘 → 仍算有查到資料 */
  const hasUsedOnly =
    canShowUsage &&
    !hasDonut &&
    used != null &&
    Number.isFinite(used) &&
    used >= 0;

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

  if (expired) {
    return (
      <div className="py-8 px-3 text-center space-y-3 opacity-80">
        <AccountIcon
          name="block"
          size={36}
          className="mx-auto text-slate-400"
        />
        <p className="text-sm font-black text-slate-600">使用期間已過期</p>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
          此 eSIM 已結束效期，不再顯示用量圖表。
        </p>
        <ValidityBlock esim={selected} usage={r} tone="muted" />
        {selected?.productName ? (
          <p className="text-[10px] text-slate-400 truncate">
            {selected.productName}
          </p>
        ) : null}
      </div>
    );
  }

  // 尚無圓環／已用數據：與主 tab 一樣顯示效期／安裝期限／到期
  if (!hasDonut && !hasUsedOnly) {
    const title = !queried
      ? "點「查詢流量」後顯示用量圖表"
      : notInstalled
        ? "尚未安裝或尚未使用"
        : r?.activatedAt || r?.createdAt
          ? "供應商已開通 · 暫無流量數值"
          : "已查詢 · 暫無流量數值";
    const hint = !queried
      ? "查詢後即可看到剩餘流量；未開通也會顯示購買後有效安裝期限。"
      : notInstalled
        ? "請先安裝 eSIM；產生用量後才會顯示流量圖表。"
        : "此方案尚未回傳已用／剩餘 MB（可能尚未產生流量或同步延遲）。下方時間為供應商紀錄，非手機安裝時間。";

    return (
      <div className="py-6 px-3 text-center space-y-3">
        <AccountIcon
          name={queried ? "sync" : "sim_card"}
          size={36}
          className="mx-auto text-[#1E4AD1]/50"
        />
        <p className="text-sm font-black text-slate-700">{title}</p>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
          {hint}
        </p>
        {(r?.iccid || selected?.iccid) && queried ? (
          <p className="text-[11px] font-mono text-slate-600 break-all">
            ICCID {r?.iccid || selected?.iccid}
          </p>
        ) : null}
        <ValidityBlock
          esim={selected}
          usage={r}
          tone={notInstalled || !queried ? "info" : "warn"}
        />
        {selected?.productName ? (
          <p className="text-[10px] text-slate-400 truncate">
            {selected.productName}
          </p>
        ) : null}
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
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                  ICCID
                </p>
                <p className="text-xs font-mono text-[#1E4AD1] break-all">
                  {r?.iccid || selected.iccid || "—"}
                </p>
                <ValidityBlock esim={selected} usage={r} tone="info" />
              </div>
            )}
          </>
        ) : (
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
            <div className="pt-2 border-t border-slate-100 text-left space-y-2 text-[11px] text-slate-600">
              {(r?.iccid || selected?.iccid) && (
                <p className="font-mono break-all">
                  訂單 ICCID {r?.iccid || selected?.iccid}
                </p>
              )}
              {r?.status && <p>狀態：{r.status}</p>}
              <ValidityBlock esim={selected} usage={r} tone="info" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
