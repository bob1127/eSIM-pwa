"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { useAuth } from "@/hooks/useAuth";
import { formatMb, usagePercent } from "@/lib/esimUsageFormat";
import { cn } from "@/lib/utils";

const TrafficUsageCharts = dynamic(
  () => import("@/components/account/TrafficUsageCharts"),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 flex items-center justify-center rounded-[22px] bg-[#F4F6FA]">
        <LoadingIndicator layout="center" label="圖表載入中…" />
      </div>
    ),
  },
);

/** 本機預覽用假 eSIM + 流量（不打真實 API） */
export const QUERY_DEMO_ESIMS = [
  {
    topupId: "Topup-DEMO-TH-8D",
    orderId: "order_DEMO_TH",
    productName: "【測試】泰國 eSIM 8日 3GB",
    iccid: "8946200100000000001",
  },
  {
    topupId: "Topup-DEMO-JP-5D",
    orderId: "order_DEMO_JP",
    productName: "【測試】日本 eSIM 5日 吃到飽",
    iccid: "8946200100000000002",
  },
  {
    topupId: "Topup-DEMO-KR-7D",
    orderId: "order_DEMO_KR",
    productName: "【測試】韓國 eSIM 7日 5GB",
    iccid: "8946200100000000003",
  },
];

export const QUERY_DEMO_USAGE = {
  "Topup-DEMO-TH-8D": {
    remainingMb: 1280,
    totalMb: 3072,
    usedMb: 1792,
    expiresAt: "2026-09-01",
    productName: "【測試】泰國 eSIM 8日 3GB",
    iccid: "8946200100000000001",
    note: "假資料預覽",
  },
  "Topup-DEMO-JP-5D": {
    remainingMb: 420,
    totalMb: 1024,
    usedMb: 604,
    expiresAt: "2026-08-28",
    productName: "【測試】日本 eSIM 5日 吃到飽",
    iccid: "8946200100000000002",
    note: "假資料預覽",
  },
  "Topup-DEMO-KR-7D": {
    remainingMb: 180,
    totalMb: 5120,
    usedMb: 4940,
    expiresAt: "2026-09-05",
    productName: "【測試】韓國 eSIM 7日 5GB",
    iccid: "8946200100000000003",
    note: "假資料預覽 · 流量偏低",
  },
};

function shortName(name = "") {
  const s = String(name).replace(/^【.*?】/, "").trim();
  return s.length > 14 ? `${s.slice(0, 14)}…` : s || "eSIM";
}

function statusTone(result) {
  const pct = usagePercent(result?.remainingMb, result?.totalMb);
  if (pct == null) return { label: "點擊查詢", tone: "slate" };
  if (pct <= 15) return { label: "流量偏低", tone: "amber" };
  if (pct <= 40) return { label: "用量正常", tone: "blue" };
  return { label: "剩餘充足", tone: "mint" };
}

/**
 * 登入會員：可查詢 eSIM 列表 + 點擊查流量／圖表
 * demoMode：本機假資料，不需登入、不打 API
 * onOpenTrafficAlert(esim)：切到流量提醒並預選此方案
 */
export default function MemberEsimQuerySheet({
  className = "",
  demoMode = false,
  onOpenTrafficAlert,
}) {
  const { authReady, isLoggedIn, token } = useAuth();
  const [esims, setEsims] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [results, setResults] = useState({});
  const [queryingId, setQueryingId] = useState(null);
  const [queryError, setQueryError] = useState("");
  const autoQueriedRef = useRef(false);

  const authHeaders = useCallback(() => {
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const loadEsims = useCallback(async () => {
    if (demoMode) {
      setEsims(QUERY_DEMO_ESIMS);
      setSelectedId(QUERY_DEMO_ESIMS[0].topupId);
      setResults({});
      autoQueriedRef.current = false;
      setLoadingList(false);
      setListError("");
      return;
    }

    if (!isLoggedIn) {
      setEsims([]);
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    setListError("");
    try {
      const res = await fetch("/api/push/member-esims", {
        credentials: "include",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "無法載入 eSIM");
      const list = data.esims || [];
      setEsims(list);
      setSelectedId((prev) => {
        if (prev && list.some((e) => (e.topupId || e.iccid) === prev)) {
          return prev;
        }
        return list[0]?.topupId || list[0]?.iccid || null;
      });
    } catch (e) {
      setListError(e.message || "載入失敗");
      setEsims([]);
    } finally {
      setLoadingList(false);
    }
  }, [isLoggedIn, authHeaders, demoMode]);

  const queryUsage = useCallback(
    async (esim) => {
      const key = esim.topupId || esim.iccid;
      if (!key) {
        setQueryError("此方案缺少查詢編號");
        return;
      }
      setSelectedId(key);
      setQueryingId(key);
      setQueryError("");
      try {
        if (demoMode) {
          await new Promise((r) => setTimeout(r, 450));
          const fake =
            QUERY_DEMO_USAGE[key] ||
            QUERY_DEMO_USAGE[QUERY_DEMO_ESIMS[0].topupId];
          setResults((prev) => ({ ...prev, [key]: { ...fake } }));
          return;
        }

        const body = {};
        if (esim.topupId && !String(esim.topupId).startsWith("iccid:")) {
          body.topupId = esim.topupId;
        }
        if (esim.iccid) body.iccid = esim.iccid;
        if (!body.topupId && !body.iccid) {
          throw new Error("缺少 topup 或 ICCID，無法查詢");
        }
        const res = await fetch("/api/esim/usage", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.detail || "查詢失敗");
        setResults((prev) => ({ ...prev, [key]: data }));
      } catch (e) {
        setQueryError(e.message || "查詢失敗");
      } finally {
        setQueryingId(null);
      }
    },
    [authHeaders, demoMode],
  );

  useEffect(() => {
    if (demoMode) {
      loadEsims();
      return;
    }
    if (!authReady) return;
    if (!isLoggedIn) {
      autoQueriedRef.current = false;
      setEsims([]);
      setResults({});
      setSelectedId(null);
      setLoadingList(false);
      return;
    }
    loadEsims();
  }, [authReady, isLoggedIn, loadEsims, demoMode]);

  useEffect(() => {
    if (loadingList || !esims.length || !selectedId) return;
    if (autoQueriedRef.current) return;
    if (results[selectedId] || queryingId) return;
    const first = esims.find((e) => (e.topupId || e.iccid) === selectedId);
    if (!first) return;
    autoQueriedRef.current = true;
    queryUsage(first);
  }, [loadingList, esims, selectedId, results, queryingId, queryUsage]);

  const chartEsims = useMemo(
    () =>
      esims.map((e) => ({
        ...e,
        topupId: e.topupId || e.iccid,
      })),
    [esims],
  );

  const selected = esims.find((e) => (e.topupId || e.iccid) === selectedId);
  const selectedResult = selectedId ? results[selectedId] : null;
  const pct = usagePercent(
    selectedResult?.remainingMb,
    selectedResult?.totalMb,
  );

  if (!demoMode && !authReady) {
    return (
      <div
        className={cn(
          "rounded-[28px] border border-slate-200 bg-white p-8",
          className,
        )}
      >
        <LoadingIndicator layout="center" label="確認登入狀態…" />
      </div>
    );
  }

  if (!demoMode && !isLoggedIn) return null;

  return (
    <div
      className={cn(
        "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_48px_-28px_rgba(15,23,42,0.35)] overflow-hidden",
        className,
      )}
    >
      {demoMode ? (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 text-[11px] font-bold text-amber-900">
          假資料預覽中 · 點選方案會載入模擬流量圖表（不打真實 API）
        </div>
      ) : null}

      <div className="relative bg-[#EEF2F8] px-4 pt-4 pb-3 sm:px-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Usage map
          </p>
          <button
            type="button"
            onClick={loadEsims}
            className="text-[11px] font-bold text-[#1e4ad1] flex items-center gap-0.5"
          >
            <MaterialIcon name="refresh" size={14} />
            重新整理清單
          </button>
        </div>
        <div className="rounded-[22px] bg-white border border-slate-100 p-3 sm:p-4 min-h-[200px]">
          {loadingList ? (
            <div className="h-44 flex items-center justify-center">
              <LoadingIndicator layout="center" label="載入您的 eSIM…" />
            </div>
          ) : esims.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center px-4">
              <MaterialIcon
                name="sim_card"
                size={36}
                className="text-slate-300 mb-2"
              />
              <p className="text-sm font-bold text-slate-700">尚無可查詢 eSIM</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                本站訂單開通後會顯示於此。也可下方用 ICCID 手動查詢。
              </p>
            </div>
          ) : (
            <TrafficUsageCharts
              esims={chartEsims}
              results={results}
              selectedId={selectedId}
              loading={Boolean(queryingId) && !selectedResult}
            />
          )}
        </div>
      </div>

      <div className="px-4 sm:px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-[17px] font-black text-slate-900 tracking-tight">
            您的 eSIM
          </h3>
          {esims.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#1e4ad1]">
              <MaterialIcon name="sim_card" size={16} />
              {esims.length} 張
            </span>
          )}
        </div>

        {listError && (
          <p className="mb-3 text-xs font-semibold text-rose-600 flex items-center gap-1">
            <MaterialIcon name="error" size={14} />
            {listError}
          </p>
        )}

        {esims.length > 0 && (
          <>
            <p className="text-[12px] font-bold text-slate-500 mb-2 flex items-center gap-1">
              選擇方案
              <MaterialIcon name="info" size={14} className="text-slate-400" />
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4 -mx-1 px-1">
              {esims.map((esim, i) => {
                const id = esim.topupId || esim.iccid;
                const active = id === selectedId;
                return (
                  <button
                    key={id || i}
                    type="button"
                    onClick={() => queryUsage(esim)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold border transition",
                      active
                        ? "border-[#1e8fff] bg-[#EAF0FB] text-[#1e4ad1] shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    )}
                  >
                    {i === 0 && active ? "選取 · " : ""}
                    {shortName(esim.productName)}
                  </button>
                );
              })}
            </div>

            <div className="relative space-y-2.5">
              <div
                className="absolute left-[22px] top-6 bottom-6 w-0.5 bg-slate-200"
                aria-hidden
              />
              {esims.map((esim, i) => {
                const id = esim.topupId || esim.iccid;
                const active = id === selectedId;
                const r = results[id];
                const tone = statusTone(r);
                const remaining =
                  r?.remainingMb != null ? formatMb(r.remainingMb) : null;
                const isQuerying = queryingId === id;
                const dotColor = i === 0 ? "#1e8fff" : "#22c55e";

                return (
                  <div
                    key={id || i}
                    className={cn(
                      "relative w-full rounded-2xl border px-3.5 py-3.5 transition flex items-center gap-2.5 sm:gap-3",
                      active
                        ? "border-[#1e8fff] bg-[#F7FAFF] shadow-[0_8px_24px_-16px_rgba(30,74,209,0.45)]"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => queryUsage(esim)}
                      className="relative flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className="relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-4 ring-white"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-slate-900 truncate">
                          {esim.productName || "eSIM 方案"}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {isQuerying
                            ? "查詢流量中…"
                            : remaining
                              ? `剩餘 ${remaining}${r?.expiresAt ? ` · 效期 ${r.expiresAt}` : ""}`
                              : esim.iccid
                                ? `ICCID …${String(esim.iccid).slice(-6)} · 點擊查詢`
                                : "點擊查詢目前流量"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          tone.tone === "amber" &&
                            "bg-amber-100 text-amber-800",
                          tone.tone === "mint" &&
                            "bg-emerald-100 text-emerald-700",
                          tone.tone === "blue" &&
                            "bg-[#EAF0FB] text-[#1e4ad1]",
                          tone.tone === "slate" &&
                            "bg-slate-100 text-slate-500",
                        )}
                      >
                        {isQuerying ? "…" : tone.label}
                      </span>
                    </button>
                    {typeof onOpenTrafficAlert === "function" ? (
                      <button
                        type="button"
                        onClick={() => onOpenTrafficAlert(esim)}
                        className="shrink-0 inline-flex max-w-[4.5rem] sm:max-w-none flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 rounded-xl border border-[#1e4ad1]/25 bg-[#EAF0FB] px-2 py-1.5 text-[10px] font-bold leading-tight text-[#1e4ad1] hover:bg-[#dce6f8] transition"
                        title="開啟此方案的流量提醒"
                      >
                        <MaterialIcon
                          name="notifications_active"
                          size={14}
                          className="shrink-0"
                        />
                        <span className="text-center">開啟提醒</span>
                      </button>
                    ) : (
                      <MaterialIcon
                        name="chevron_right"
                        size={20}
                        className="text-slate-300 shrink-0"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {selected && selectedResult && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                  <MaterialIcon name="data_usage" size={14} />
                  {selectedResult.remainingMb != null
                    ? `剩餘 ${formatMb(selectedResult.remainingMb)}`
                    : "暫無流量數值"}
                </span>
                {pct != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                    <MaterialIcon name="pie_chart" size={14} />
                    剩餘 {pct}%
                  </span>
                )}
                {selectedResult.expiresAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                    <MaterialIcon name="event" size={14} />
                    {selectedResult.expiresAt}
                  </span>
                )}
              </div>
            )}

            {queryError && (
              <p className="mt-3 text-xs font-semibold text-rose-600 flex items-center gap-1">
                <MaterialIcon name="error" size={14} />
                {queryError}
              </p>
            )}

            <button
              type="button"
              disabled={!selected || Boolean(queryingId)}
              onClick={() => selected && queryUsage(selected)}
              className="mt-5 w-full rounded-2xl bg-[#1e8fff] hover:bg-[#1780e8] disabled:opacity-50 text-white font-black text-[15px] py-3.5 shadow-[0_10px_28px_-12px_rgba(30,143,255,0.7)] transition"
            >
              {queryingId
                ? "查詢中…"
                : selectedResult
                  ? "重新查詢流量"
                  : "查詢目前流量"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
