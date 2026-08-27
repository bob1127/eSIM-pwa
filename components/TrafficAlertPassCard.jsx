"use client";

import dynamic from "next/dynamic";
import MaterialIcon from "@/components/MaterialIcon";
import { formatMb, usagePercent } from "@/lib/esimUsageFormat";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const PassUsageDonut = dynamic(() => import("./PassUsageDonut"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[120px] w-[120px] items-center justify-center">
      <LoadingIndicator layout="center" size="sm" label="" />
    </div>
  ),
});

function formatExpiry(expiresAt) {
  if (!expiresAt) return "—";
  try {
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) return String(expiresAt);
    return d.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  } catch {
    return String(expiresAt);
  }
}

function bindMethodLabel(bindMethod) {
  if (bindMethod === "member_auto" || bindMethod === "member_order") {
    return "會員訂單";
  }
  if (bindMethod === "guest_email") return "Email 綁定";
  if (bindMethod === "guest_iccid" || bindMethod === "member_iccid") {
    return "ICCID 綁定";
  }
  return "推播訂閱";
}

function usageStatus(remainingMb, totalMb, isBound) {
  if (!isBound) {
    return {
      leftMain: "未綁",
      leftSub: "尚無監控方案",
      rightMain: "綁定",
      rightSub: "點此選擇 eSIM",
      badge: null,
      pills: ["尚未綁定", "僅限 1 張", "點擊開始"],
    };
  }
  const pct = usagePercent(remainingMb, totalMb);
  if (pct == null) {
    return {
      leftMain: "查詢中",
      leftSub: "讀取剩餘流量",
      rightMain: "已開",
      rightSub: "偏低自動通知",
      badge: "監控中",
      pills: ["已綁定", "瀏覽器推播", "偏低提醒", "僅 1 張"],
    };
  }
  if (pct <= 20) {
    return {
      leftMain: formatMb(remainingMb) || "偏低",
      leftSub: "剩餘流量偏低",
      rightMain: `${Math.round(pct)}%`,
      rightSub: "將推播提醒您",
      badge: "流量偏低",
      pills: ["已綁定", "瀏覽器推播", "偏低提醒", "僅 1 張"],
    };
  }
  if (pct <= 40) {
    return {
      leftMain: formatMb(remainingMb) || "—",
      leftSub: "剩餘流量",
      rightMain: `${Math.round(pct)}%`,
      rightSub: "用量正常",
      badge: "監控中",
      pills: ["已綁定", "瀏覽器推播", "偏低提醒", "僅 1 張"],
    };
  }
  return {
    leftMain: formatMb(remainingMb) || "—",
    leftSub: "剩餘流量",
    rightMain: `${Math.round(pct)}%`,
    rightSub: "剩餘充足",
    badge: "監控中",
    pills: ["已綁定", "瀏覽器推播", "偏低提醒", "僅 1 張"],
  };
}

/**
 * 流量提醒第一層 — 通行證風格 + 用量圖表
 */
export default function TrafficAlertPassCard({
  productName,
  iccid,
  topupId,
  bindMethod,
  boundAt,
  isBound = false,
  remainingMb = null,
  totalMb = null,
  expiresAt = null,
  usageLoading = false,
  className = "",
  onOpenBind,
}) {
  const title = isBound
    ? productName ||
      (iccid ? `ICCID …${String(iccid).slice(-6)}` : null) ||
      "JEKO eSIM"
    : "尚未綁定監控方案";

  const dateLabel = (() => {
    try {
      const d = boundAt ? new Date(boundAt) : new Date();
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("zh-TW", {
        month: "numeric",
        day: "numeric",
      });
    } catch {
      return "";
    }
  })();

  const st = usageStatus(remainingMb, totalMb, isBound);
  const pct = usagePercent(remainingMb, totalMb);
  const usedMb =
    remainingMb != null && totalMb != null
      ? Math.max(0, Number(totalMb) - Number(remainingMb))
      : null;

  return (
    <div className={`w-full ${className}`}>
      <div className="overflow-hidden rounded-[28px] bg-[#1e4ad1] text-white shadow-[0_20px_50px_-24px_rgba(30,74,209,0.65)]">
        <button
          type="button"
          onClick={onOpenBind}
          className="w-full text-left px-5 pt-5 sm:px-6 transition hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] text-white/70">
                JEKO eSIM
              </p>
              <p className="mt-1 text-sm font-semibold tracking-wide text-white/95">
                流量提醒通行證
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold tracking-wider text-white/70">
                {isBound ? "綁定日期" : "狀態"}
              </p>
              <p className="mt-1 text-sm font-black tracking-wide">
                {isBound ? dateLabel || "已啟用" : "待綁定"}
              </p>
            </div>
          </div>

          <div className="mt-7 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[34px] sm:text-[40px] font-black leading-none tracking-tight truncate">
                {usageLoading && isBound ? "…" : st.leftMain}
              </p>
              <p className="mt-1.5 text-[12px] font-semibold text-white/70">
                {st.leftSub}
              </p>
            </div>
            <div className="mb-2 flex flex-col items-center gap-1 text-white/80 shrink-0">
              <span className="h-px w-8 bg-white/40" />
              <MaterialIcon name="notifications_active" size={18} />
              <span className="h-px w-8 bg-white/40" />
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[34px] sm:text-[40px] font-black leading-none tracking-tight">
                {usageLoading && isBound ? "…" : st.rightMain}
              </p>
              <p className="mt-1.5 text-[12px] font-semibold text-white/70">
                {st.rightSub}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start justify-between gap-3">
            <p className="text-[15px] sm:text-[16px] font-bold leading-snug line-clamp-2 min-w-0">
              {title}
            </p>
            {st.badge ? (
              <span className="shrink-0 rounded-md bg-[#D7FF32] px-2 py-1 text-[10px] font-black text-slate-900">
                {st.badge}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 pb-1">
            {st.pills.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/45 px-2.5 py-1 text-[10px] font-bold text-white/95"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* 用量圖表區 */}
        <div className="px-5 sm:px-6 pb-5">
          <div className="mt-4 rounded-2xl bg-white p-4 text-slate-900">
            {isBound ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="shrink-0">
                  {usageLoading ? (
                    <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-slate-50">
                      <LoadingIndicator
                        layout="center"
                        size="sm"
                        label="查詢中"
                      />
                    </div>
                  ) : pct != null ? (
                    <PassUsageDonut
                      remainingMb={Number(remainingMb)}
                      usedMb={Number(usedMb)}
                      totalMb={Number(totalMb)}
                    />
                  ) : (
                    <div className="flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full bg-slate-50 text-[#1e4ad1]">
                      <MaterialIcon name="pie_chart" size={36} />
                      <p className="mt-1 text-[10px] font-bold text-slate-500">
                        暫無用量
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full min-w-0 space-y-2 text-[13px]">
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#1e4ad1]">
                    目前用量
                  </p>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">剩餘</span>
                    <span className="font-bold text-slate-900">
                      {formatMb(remainingMb) || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">已使用</span>
                    <span className="font-bold text-slate-900">
                      {formatMb(usedMb) || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">總流量</span>
                    <span className="font-bold text-slate-900">
                      {formatMb(totalMb) || "—"}
                    </span>
                  </div>
                  {expiresAt ? (
                    <div className="flex justify-between gap-2 pt-1 border-t border-slate-100">
                      <span className="text-slate-500">有效期限</span>
                      <span className="font-bold text-slate-900">
                        {formatExpiry(expiresAt)}
                      </span>
                    </div>
                  ) : null}
                  {pct != null ? (
                    <div className="pt-1">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct <= 20 ? "bg-amber-500" : "bg-[#1e8fff]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        剩餘比例 {Math.round(pct)}%
                        {pct <= 20 ? " · 已達偏低提醒門檻" : ""}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EAF0FB] text-[#1e4ad1]">
                  <MaterialIcon name="add_circle" size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    還沒有監控中的 eSIM
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                    點上方區域進入選單，選擇一張方案綁定後，這裡會顯示剩餘流量圖表。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-2 border-t border-white/20 pt-3.5">
            <PassCell
              label="ICCID 末碼"
              value={
                isBound && iccid ? `…${String(iccid).slice(-8)}` : "尚未綁定"
              }
            />
            <PassCell
              label="綁定方式"
              value={isBound ? bindMethodLabel(bindMethod) : "—"}
            />
            <PassCell
              label="提醒狀態"
              value={isBound ? "已開啟" : "未開啟"}
            />
            <PassCell label="監控名額" value="僅限 1 張" />
          </div>

          <p className="mt-3 text-center text-[11px] text-white/70 font-semibold">
            {isBound
              ? "點擊上方可更換綁定方案"
              : "點擊上方選擇要監控的 eSIM"}
          </p>
        </div>
      </div>
    </div>
  );
}

function PassCell({ label, value, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[9px] font-bold tracking-wider text-white/55">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-bold tracking-wide">
        {value}
      </p>
    </div>
  );
}

/** 圖一下方小卡 */
export function TrafficAlertPassWidget({
  href,
  external = false,
  icon,
  title,
  subtitle,
  onClick,
}) {
  const className =
    "flex flex-col items-start gap-2 rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)] border border-slate-100 text-left transition hover:border-slate-200 min-h-[112px]";

  const body = (
    <>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[#1e4ad1]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2">
          {title}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-slate-400">
          {subtitle}
        </p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {body}
      </a>
    );
  }

  return (
    <a href={href || "#"} className={className}>
      {body}
    </a>
  );
}
