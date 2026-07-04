"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import MaterialIcon from "@/components/MaterialIcon";
import { extractEsimsFromOrders } from "@/lib/esimOrderExtract";
import { formatMb, usagePercent } from "@/lib/esimUsageFormat";
import { detectPushSupport, isStandalonePWA } from "@/lib/pushSupport";
import PushNotificationSection from "@/components/PushNotificationSection";
import IosPwaPushGuide from "@/components/IosPwaPushGuide";
import { QuickActionCard, NavyPanel, AccountPageWrap } from "./AccountShell";

const TrafficUsageCharts = dynamic(() => import("./TrafficUsageCharts"), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
      圖表載入中…
    </div>
  ),
});

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function statusBadge(r) {
  if (!r) return { label: "未查詢", cls: "bg-slate-100 text-slate-500" };
  const pct = usagePercent(r.remainingMb, r.totalMb);
  if (pct != null && pct <= 15) return { label: "流量偏低", cls: "bg-red-100 text-red-700" };
  if (pct != null && pct <= 40) return { label: "用量正常", cls: "bg-amber-100 text-amber-800" };
  return { label: "剩餘充足", cls: "bg-emerald-100 text-emerald-800" };
}

export default function AccountTrafficView({ orders, ordersLoading }) {
  const esims = useMemo(() => extractEsimsFromOrders(orders || []), [orders]);
  const [results, setResults] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [manualIccid, setManualIccid] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [pushSupport, setPushSupport] = useState(null);
  const [standalone, setStandalone] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const pushRef = useRef(null);

  useEffect(() => {
    setStandalone(isStandalonePWA());
    detectPushSupport().then(setPushSupport);
  }, []);

  useEffect(() => {
    if (esims.length && !selectedId) setSelectedId(esims[0].topupId);
  }, [esims, selectedId]);

  // Auto-query the first eSIM when member loads the page
  const autoQueried = useRef(false);
  useEffect(() => {
    if (esims.length > 0 && !autoQueried.current && !results[esims[0].topupId]) {
      autoQueried.current = true;
      handleOneClick(esims[0]);
    }
  }, [esims]);

  const queryUsage = useCallback(async ({ topupId, iccid, key }) => {
    setError("");
    setLoadingId(key);
    if (topupId) setSelectedId(topupId);
    try {
      const res = await fetch("/api/esim/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(topupId ? { topupId } : {}),
          ...(iccid ? { iccid } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "查詢失敗");
      setResults((prev) => ({ ...prev, [key]: data }));
    } catch (e) {
      setError(e.message || "查詢失敗");
    } finally {
      setLoadingId(null);
    }
  }, []);

  const handleOneClick = (esim) => {
    queryUsage({
      topupId: esim.topupId,
      iccid: esim.iccid,
      key: esim.topupId,
    });
  };

  const handleQueryAll = async () => {
    for (const esim of esims) {
      await queryUsage({
        topupId: esim.topupId,
        iccid: esim.iccid,
        key: esim.topupId,
      });
    }
  };

  const handleManual = (e) => {
    e.preventDefault();
    const v = manualIccid.replace(/\s/g, "");
    if (!v) return;
    queryUsage({ iccid: v, key: `iccid-${v}` });
  };

  const showPwaHint = pushSupport?.needsPWA && !standalone;
  const chartLoading = !!loadingId;

  return (
    <AccountPageWrap className="space-y-5">
      {/* jinjer 四格快捷卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickActionCard
          icon="bolt"
          title="一鍵查最新"
          desc="查詢最近一筆 eSIM 剩餘流量"
          onClick={() => esims[0] && handleOneClick(esims[0])}
        />
        <QuickActionCard
          icon="sync"
          title="全部更新"
          desc="依序查詢所有已購 eSIM"
          onClick={handleQueryAll}
        />
        <QuickActionCard
          icon="notifications_active"
          title="推播提醒"
          desc="流量偏低時推播通知"
          onClick={() => {
            setShowPush(true);
            pushRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        />
        <QuickActionCard
          icon="help_outline"
          title="用量指南"
          desc="eSIM 開通與查詢說明"
          href="/data-query"
        />
      </div>

      {showPwaHint && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 flex gap-3 items-start">
          <MaterialIcon name="install_mobile" size={22} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">iPhone 請先安裝 PWA</p>
            <p className="text-xs text-amber-800 mt-1">
              {pushSupport?.hint ||
                "Safari → 分享 → 加入主畫面，從主畫面開啟本站後才能使用推播。"}
            </p>
            <div className="mt-2">
              <IosPwaPushGuide />
            </div>
          </div>
        </div>
      )}

      {/* 主區：左列表 + 右圖表 — 帳號一覧 + jinjer 側欄 */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] gap-5 xl:gap-6">
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm">
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-[#2b579a] text-base">eSIM 流量一覽</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                共 {ordersLoading ? "…" : esims.length} 筆可監控 · 資料約 30 分鐘延遲
              </p>
            </div>
            <button
              type="button"
              disabled={!!loadingId || !esims.length}
              onClick={() => esims[0] && handleOneClick(esims[0])}
              className="text-xs font-bold text-white bg-[#2563eb] px-4 py-2 rounded hover:bg-[#174da8] disabled:opacity-50 flex items-center gap-1 shrink-0"
            >
              <MaterialIcon name="speed" size={16} />
              查最新一筆
            </button>
          </div>

          {ordersLoading ? (
            <p className="text-sm text-slate-400 py-12 text-center">載入訂單中…</p>
          ) : esims.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm px-4">
              <MaterialIcon name="sim_card" size={40} className="text-slate-200 mx-auto mb-3" />
              <p>尚無可查詢的 eSIM</p>
              <p className="text-xs mt-2 text-slate-400">需已完成付款且含 topup 單號</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {esims.map((esim) => {
                const r = results[esim.topupId];
                const badge = statusBadge(r);
                const pct = r ? usagePercent(r.remainingMb, r.totalMb) : null;
                const isSelected = selectedId === esim.topupId;

                return (
                  <div
                    key={esim.topupId}
                    onClick={() => handleOneClick(esim)}
                    role="button"
                    tabIndex={0}
                    className={`px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 transition cursor-pointer ${
                      isSelected ? "bg-blue-50/40 border-l-4 border-l-[#2563eb]" : "hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">方案</p>
                        <p className="font-black text-[#2b579a] truncate">{esim.productName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">訂單</p>
                        <p className="font-mono text-xs text-slate-600">#{esim.orderId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Topup ID</p>
                        <p className="font-mono text-[10px] text-slate-500 truncate">{esim.topupId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">剩餘流量</p>
                        {r ? (
                          <p className="font-bold text-[#2b579a] tabular-nums">
                            {formatMb(r.remainingMb)}
                            <span className="text-slate-400 font-normal text-xs">
                              {" "}
                              / {formatMb(r.totalMb)}
                            </span>
                          </p>
                        ) : (
                          <p className="text-slate-400 text-xs">尚未查詢</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {pct != null && (
                        <div className="w-20 h-1.5 bg-slate-100 rounded overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-[#2563eb] rounded"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={loadingId === esim.topupId}
                        onClick={() => handleOneClick(esim)}
                        className="text-xs font-bold text-[#2563eb] border border-[#2563eb] px-3 py-1.5 rounded hover:bg-blue-50 disabled:opacity-50"
                      >
                        {loadingId === esim.topupId ? "查詢中…" : "查詢流量"}
                      </button>
                    </div>

                    {r && (
                      <p className="text-[10px] text-slate-400 lg:w-full lg:col-span-full -mt-2 lg:mt-0">
                        更新 {formatDate(r.updatedAt || r.queriedAt || new Date())}
                        {r.expiresAt && ` · 到期 ${formatDateShort(r.expiresAt)}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="px-5 py-3 bg-red-50 border-t border-red-100 text-sm text-red-600 flex items-center gap-1">
              <MaterialIcon name="error" size={16} />
              {error}
            </div>
          )}
        </div>

        {/* 右側圖表 — jinjer 側欄風 */}
        <aside className="space-y-4">
          <TrafficUsageCharts
            esims={esims}
            results={results}
            selectedId={selectedId}
            loading={chartLoading}
          />

          <div className="bg-white border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-[#2b579a]">手動 ICCID</h4>
              <MaterialIcon name="dialpad" size={18} className="text-slate-400" />
            </div>
            <form onSubmit={handleManual} className="space-y-2">
              <input
                type="text"
                value={manualIccid}
                onChange={(e) => setManualIccid(e.target.value)}
                placeholder="19～20 碼 ICCID"
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
              <button
                type="submit"
                disabled={!!loadingId}
                className="w-full py-2 bg-[#2b579a] text-white text-xs font-bold rounded disabled:opacity-50"
              >
                查詢
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              非本站購買的 eSIM 可能無法取得完整用量
            </p>
          </div>
        </aside>
      </div>

      {/* 推播區 — 可展開 */}
      <div ref={pushRef}>
        <NavyPanel
          title="流量偏低推播提醒"
          icon="notifications_active"
          action={
            <button
              type="button"
              onClick={() => setShowPush((v) => !v)}
              className="text-xs font-bold text-[#2563eb]"
            >
              {showPush ? "收合" : "展開設定"}
            </button>
          }
        >
          {showPush && (
            <>
              <p className="text-sm text-slate-600 mb-4">
                開啟後系統會在剩餘流量偏低時推播通知（瀏覽器 + 可選 LINE）。
                {showPwaHint
                  ? " iPhone 請先將本站加入主畫面，再開啟推播。"
                  : " 會員可自動綁定最新 eSIM 訂單；LINE 登入者可額外開啟官方 LINE 推播。"}
              </p>
              <PushNotificationSection />
            </>
          )}
          {!showPush && (
            <p className="text-sm text-slate-500">點「展開設定」以開啟推播提醒</p>
          )}
        </NavyPanel>
      </div>
    </AccountPageWrap>
  );
}
