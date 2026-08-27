"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import AccountIcon from "@/components/account/AccountIcon";
import { extractEsimsFromOrders } from "@/lib/esimOrderExtract";
import { formatMb, usagePercent } from "@/lib/esimUsageFormat";
import {
  detectPushSupport,
  getIosAddToHomeHint,
  isStandalonePWA,
} from "@/lib/pushSupport";
import PushNotificationSection from "@/components/PushNotificationSection";
import PushLineAlertSection from "@/components/PushLineAlertSection";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import IosPwaPushGuide from "@/components/IosPwaPushGuide";
import { getPushEndpoint } from "@/lib/pushBind";
import {
  broadcastPushNotifyState,
  subscribePushNotifySync,
} from "@/lib/pushNotifySync";
import {
  AccountPageWrap,
  AccountBadge,
  MetricTile,
  NavyPanel,
  ShopifyDropdown,
} from "./AccountShell";
import { ACCOUNT_THEME, ACCOUNT_UI, SHOPIFY_BADGE } from "@/lib/accountUi";

const UI = {
  dark: ACCOUNT_THEME.dark,
  mid: ACCOUNT_THEME.mid,
  soft: ACCOUNT_THEME.soft,
  border: ACCOUNT_THEME.border,
  light: ACCOUNT_THEME.light,
  wash: ACCOUNT_THEME.wash,
  white: ACCOUNT_THEME.white,
  radius: ACCOUNT_UI.radius,
  radiusSm: ACCOUNT_UI.radiusSm,
};

const TrafficUsageCharts = dynamic(() => import("./TrafficUsageCharts"), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center">
      <LoadingIndicator layout="center" label="圖表載入中…" />
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

function orderShortId(id) {
  return String(id || "").slice(0, 8).toUpperCase();
}

/** 吃到飽／不限流量：無固定額度，狀態固定顯示「剩餘充足」 */
function isUnlimitedEsim(esim, r) {
  const name = String(esim?.productName || r?.productName || "");
  if (/吃到飽|unlimited|不限流量|不限速吃到飽|無限流量/i.test(name)) {
    return true;
  }
  // 已查到已用、但無剩餘／總量 → 視為無額度方案
  if (
    r &&
    r.usedMb != null &&
    r.remainingMb == null &&
    r.totalMb == null
  ) {
    return true;
  }
  return false;
}

function statusMeta(r, esim) {
  if (isUnlimitedEsim(esim, r)) {
    return { label: "剩餘充足", tone: "success" };
  }
  if (!r) return { label: "未查詢", tone: "neutral" };
  const pct = usagePercent(r.remainingMb, r.totalMb);
  if (pct == null) {
    // 有回傳但沒用量數字：多半缺 topup、或僅 ICCID、或供應商尚未給流量資料
    if (r.source === "iccid_only") {
      return { label: "缺 topup 無法直查", tone: "warning" };
    }
    return { label: "尚無用量資料", tone: "neutral" };
  }
  if (pct <= 15) return { label: "流量偏低", tone: "critical" };
  if (pct <= 40) return { label: "用量正常", tone: "warning" };
  return { label: "剩餘充足", tone: "success" };
}

function SecondaryBtn({ children, onClick, href, disabled, className = "", type = "button" }) {
  const style = {
    backgroundColor: "#fafafa",
    color: "#303030",
    border: "1px solid #8a8a8a",
    borderRadius: "0.5rem",
  };
  const cls = `inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[13px] font-semibold transition disabled:opacity-40 ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      style={style}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, onClick, disabled, className = "", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 h-8 px-3.5 text-[13px] font-semibold text-white transition disabled:opacity-40 ${className}`}
      style={{
        backgroundColor: UI.dark,
        borderRadius: "0.5rem",
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: UI.white,
        border: `1px solid ${UI.border}`,
        borderRadius: UI.radius,
        ...style,
      }}
    >
      {children}
    </div>
  );
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
  const [iosHintOpen, setIosHintOpen] = useState(true);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [preferOpenBind, setPreferOpenBind] = useState(false);
  const [monitorBound, setMonitorBound] = useState(false);
  const [boundTopupId, setBoundTopupId] = useState(null);
  const [monitorChecking, setMonitorChecking] = useState(true);

  useEffect(() => {
    setStandalone(isStandalonePWA());
    detectPushSupport().then(setPushSupport);
  }, []);

  const refreshMonitorStatus = useCallback(async () => {
    setMonitorChecking(true);
    try {
      const endpoint = await getPushEndpoint();
      if (!endpoint) {
        setMonitorBound(false);
        setBoundTopupId(null);
        broadcastPushNotifyState({
          on: false,
          topupId: null,
          source: "account-traffic",
        });
        return;
      }
      const res = await fetch(
        `/api/push/bind-status?endpoint=${encodeURIComponent(endpoint)}`,
      );
      const data = await res.json();
      const bound = Boolean(data.bound);
      const topup = data.topupId || null;
      setMonitorBound(bound);
      setBoundTopupId(topup);
      broadcastPushNotifyState({
        on: true,
        topupId: bound ? topup : null,
        source: "account-traffic",
      });
    } catch {
      setMonitorBound(false);
      setBoundTopupId(null);
    } finally {
      setMonitorChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshMonitorStatus();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshMonitorStatus();
    };
    window.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", refreshMonitorStatus);
    return () => {
      window.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", refreshMonitorStatus);
    };
  }, [refreshMonitorStatus]);

  // 與底部「我的 eSIM」主選單流量開關雙向同步
  useEffect(() => {
    return subscribePushNotifySync((detail) => {
      if (detail?.source === "account-traffic") return;
      if (Object.prototype.hasOwnProperty.call(detail || {}, "on")) {
        if (!detail.on) {
          setMonitorBound(false);
          setBoundTopupId(null);
          return;
        }
      }
      if (Object.prototype.hasOwnProperty.call(detail || {}, "topupId")) {
        const topup = detail.topupId;
        setBoundTopupId(topup);
        setMonitorBound(Boolean(topup));
        return;
      }
      if (detail?.on === true) {
        refreshMonitorStatus();
      }
    });
  }, [refreshMonitorStatus]);

  const selectedEsim = useMemo(
    () =>
      esims.find((e) => String(e.topupId) === String(selectedId)) ||
      esims[0] ||
      null,
    [esims, selectedId],
  );

  const openMonitorBind = () => {
    if (monitorBound) return;
    setPreferOpenBind(true);
    setBindModalOpen(true);
  };

  // 綁定完成後關閉彈窗，不再顯示通行證大卡
  useEffect(() => {
    if (!bindModalOpen || !monitorBound) return;
    setBindModalOpen(false);
    setPreferOpenBind(false);
  }, [bindModalOpen, monitorBound]);

  useEffect(() => {
    if (esims.length && !selectedId) setSelectedId(esims[0].topupId);
  }, [esims, selectedId]);

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

  const handleOneClick = useCallback(
    (esim) => {
      // 缺真實 topup 時不要把 `iccid:…` 假 key 當 topupId 送供應商
      const realTopupId = esim.missingTopupId ? null : esim.topupId;
      if (!realTopupId && !esim.iccid) {
        setError("此 eSIM 缺少 topup 單號與 ICCID，無法查詢流量");
        return;
      }
      queryUsage({
        topupId: realTopupId,
        iccid: esim.iccid,
        key: esim.topupId,
      });
    },
    [queryUsage],
  );

  const autoQueried = useRef(false);
  useEffect(() => {
    if (autoQueried.current || esims.length === 0) return;
    // 優先自動查「有真實 topup」的第一筆，避免假 topupId 觸發供應商錯誤
    const firstQueryable =
      esims.find((e) => !e.missingTopupId && e.topupId) ||
      esims.find((e) => e.iccid);
    if (!firstQueryable || results[firstQueryable.topupId]) return;
    autoQueried.current = true;
    handleOneClick(firstQueryable);
  }, [esims, results, handleOneClick]);

  const handleQueryAll = async () => {
    for (const esim of esims) {
      const realTopupId = esim.missingTopupId ? null : esim.topupId;
      if (!realTopupId && !esim.iccid) continue;
      await queryUsage({
        topupId: realTopupId,
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

  const queriedCount = esims.filter((e) => results[e.topupId]).length;
  const lowCount = esims.filter((e) => {
    const r = results[e.topupId];
    if (!r) return false;
    const pct = usagePercent(r.remainingMb, r.totalMb);
    return pct != null && pct <= 15;
  }).length;

  const moreMenu = [
    {
      id: "latest",
      label: "查最新一筆",
      icon: "bolt",
      disabled: !esims.length || !!loadingId,
      onClick: () => esims[0] && handleOneClick(esims[0]),
    },
    {
      id: "all",
      label: "全部更新",
      icon: "sync",
      disabled: !esims.length || !!loadingId,
      onClick: handleQueryAll,
    },
    { divider: true },
    {
      id: "push",
      label: "推播提醒設定",
      icon: "notifications_active",
      onClick: () => {
        setShowPush(true);
        setTimeout(() => {
          pushRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
      },
    },
    {
      id: "guide",
      label: "用量指南",
      icon: "help_outline",
      onClick: () => {
        window.location.href = "/data-query";
      },
    },
  ];

  const inputStyle = {
    border: `1px solid ${UI.border}`,
    borderRadius: UI.radiusSm,
    color: UI.dark,
    backgroundColor: UI.white,
  };

  return (
    <AccountPageWrap>
      {/* 標題列 */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="text-xl sm:text-2xl font-black tracking-tight"
              style={{ color: UI.dark }}
            >
              查詢流量
            </h1>
            <AccountBadge tone="info">約 30 分鐘延遲</AccountBadge>
            {lowCount > 0 ? (
              <AccountBadge tone="critical">{lowCount} 筆偏低</AccountBadge>
            ) : null}
          </div>
          <p className="text-xs sm:text-sm mt-1.5" style={{ color: UI.mid }}>
            監控已購 eSIM 剩餘流量；可開啟偏低推播提醒
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <SecondaryBtn
            disabled={!!loadingId || !esims.length}
            onClick={handleQueryAll}
          >
            <AccountIcon name="sync" size={16} />
            全部更新
          </SecondaryBtn>
          <PrimaryBtn
            disabled={!!loadingId || !esims.length}
            onClick={() => esims[0] && handleOneClick(esims[0])}
          >
            <AccountIcon name="bolt" size={16} />
            查最新一筆
          </PrimaryBtn>
          <ShopifyDropdown variant="account" label="更多操作" items={moreMenu} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <MetricTile
          icon="sim_card"
          label="可監控 eSIM"
          value={ordersLoading ? "…" : esims.length}
          variant="green"
        />
        <MetricTile
          icon="speed"
          label="已查詢"
          value={queriedCount}
          sub={esims.length ? `共 ${esims.length} 筆` : undefined}
          variant="sky"
        />
        <MetricTile
          icon="warning"
          label="流量偏低"
          value={lowCount}
          variant="yellow"
        />
        <MetricTile
          icon="notifications_active"
          label="推播"
          value={showPwaHint ? "需 PWA" : "可設定"}
          variant="navy"
        />
      </div>

      {showPwaHint && iosHintOpen ? (
        <Card
          className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4"
          style={{
            backgroundColor: "#fffbeb",
            borderColor: SHOPIFY_BADGE.warning.bg,
          }}
        >
          <div className="flex gap-3 min-w-0">
            <div
              className="w-9 h-9 flex items-center justify-center shrink-0"
              style={{
                backgroundColor: SHOPIFY_BADGE.warning.dot,
                borderRadius: UI.radiusSm,
              }}
            >
              <AccountIcon
                name="install_mobile"
                size={18}
                className="text-white"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-bold"
                style={{ color: SHOPIFY_BADGE.warning.text }}
              >
                iPhone 請先安裝 PWA
              </p>
              <p
                className="text-xs mt-1 leading-relaxed"
                style={{ color: "#78350f" }}
              >
                {pushSupport?.hint ||
                  `${getIosAddToHomeHint()}，從主畫面開啟本站後才能使用推播。`}
              </p>
              <div className="mt-2">
                <IosPwaPushGuide />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIosHintOpen(false)}
            className="text-[13px] font-semibold shrink-0 h-8 px-3"
            style={{ color: UI.mid, borderRadius: UI.radiusSm }}
          >
            關閉
          </button>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-4 xl:gap-5">
        {/* 左：eSIM 列表 */}
        <Card className="overflow-hidden min-w-0">
          <div
            className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ borderBottom: `1px solid ${UI.border}` }}
          >
            <div>
              <h2 className="text-sm font-black" style={{ color: UI.dark }}>
                eSIM 流量一覽
              </h2>
              <p className="text-xs mt-0.5" style={{ color: UI.soft }}>
                共 {ordersLoading ? "…" : esims.length} 筆可監控 · 點列即可查詢
              </p>
            </div>
            <PrimaryBtn
              disabled={!!loadingId || !esims.length}
              onClick={() => esims[0] && handleOneClick(esims[0])}
            >
              <AccountIcon name="speed" size={16} />
              查最新一筆
            </PrimaryBtn>
          </div>

          {ordersLoading ? (
            <LoadingIndicator layout="center" label="載入訂單中…" className="py-12" />
          ) : esims.length === 0 ? (
            <div
              className="text-center py-12 text-sm px-4"
              style={{ color: UI.soft }}
            >
              <AccountIcon
                name="sim_card"
                size={40}
                className="mx-auto mb-3 opacity-30"
              />
              <p>尚無可查詢的 eSIM</p>
              <p className="text-xs mt-2">需已完成付款，且訂單含 QR／ICCID</p>
              <SecondaryBtn href="/" className="mt-4">
                前往選購
              </SecondaryBtn>
            </div>
          ) : (
            <ul>
              {esims.map((esim) => {
                const r = results[esim.topupId];
                const badge = statusMeta(r, esim);
                const pct = r ? usagePercent(r.remainingMb, r.totalMb) : null;
                const isSelected = selectedId === esim.topupId;
                const isLoading = loadingId === esim.topupId;

                return (
                  <li
                    key={esim.topupId}
                    style={{
                      borderTop: `1px solid ${UI.border}`,
                      backgroundColor: isSelected ? UI.light : undefined,
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOneClick(esim)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOneClick(esim);
                        }
                      }}
                      className="px-4 sm:px-5 py-4 cursor-pointer transition hover:bg-[#fafafa]"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                          <div className="min-w-0">
                            <p
                              className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                              style={{ color: UI.soft }}
                            >
                              方案
                            </p>
                            <p
                              className="font-bold truncate"
                              style={{ color: UI.dark }}
                              title={esim.productName}
                            >
                              {esim.productName}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                              style={{ color: UI.soft }}
                            >
                              訂單
                            </p>
                            <p
                              className="font-mono text-xs"
                              style={{ color: UI.mid }}
                            >
                              #{orderShortId(esim.orderId)}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                              style={{ color: UI.soft }}
                            >
                              {esim.missingTopupId ? "ICCID" : "Topup ID"}
                            </p>
                            <p
                              className="font-mono text-[10px] truncate"
                              style={{ color: UI.soft }}
                              title={
                                esim.missingTopupId
                                  ? esim.iccid || esim.topupId
                                  : esim.topupId
                              }
                            >
                              {esim.missingTopupId
                                ? esim.iccid || "—"
                                : esim.topupId}
                            </p>
                            {esim.missingTopupId ? (
                              <p
                                className="text-[10px] mt-0.5"
                                style={{ color: "#b98900" }}
                              >
                                缺 topup 單號，用量可能無法直查
                              </p>
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                              style={{ color: UI.soft }}
                            >
                              剩餘流量
                            </p>
                            {r ? (
                              <p
                                className="font-bold tabular-nums"
                                style={{ color: UI.dark }}
                              >
                                {formatMb(r.remainingMb)}
                                <span
                                  className="font-normal text-xs"
                                  style={{ color: UI.soft }}
                                >
                                  {" "}
                                  / {formatMb(r.totalMb)}
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs" style={{ color: UI.soft }}>
                                尚未查詢
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                          <AccountBadge tone={badge.tone}>
                            {badge.label}
                          </AccountBadge>
                          {pct != null ? (
                            <div
                              className="w-20 h-1.5 overflow-hidden hidden sm:block"
                              style={{
                                backgroundColor: UI.light,
                                borderRadius: "999px",
                              }}
                              title={`剩餘 ${pct}%`}
                            >
                              <div
                                className="h-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor:
                                    pct <= 15
                                      ? SHOPIFY_BADGE.critical.dot
                                      : pct <= 40
                                        ? SHOPIFY_BADGE.warning.dot
                                        : SHOPIFY_BADGE.success.dot,
                                  borderRadius: "999px",
                                }}
                              />
                            </div>
                          ) : null}
                          <SecondaryBtn
                            disabled={isLoading}
                            onClick={(e) => {
                              e?.stopPropagation?.();
                              handleOneClick(esim);
                            }}
                          >
                            {isLoading ? "查詢中…" : "查詢流量"}
                          </SecondaryBtn>
                        </div>
                      </div>

                      {r ? (
                        <p
                          className="text-[10px] mt-2"
                          style={{ color: UI.soft }}
                        >
                          更新 {formatDate(r.updatedAt || r.queriedAt || new Date())}
                          {r.expiresAt
                            ? ` · 到期 ${formatDateShort(r.expiresAt)}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {error ? (
            <div
              className="px-4 sm:px-5 py-3 text-sm flex items-center gap-1.5"
              style={{
                backgroundColor: "#fef2f2",
                borderTop: `1px solid ${SHOPIFY_BADGE.critical.bg}`,
                color: SHOPIFY_BADGE.critical.dot,
              }}
            >
              <AccountIcon name="error" size={16} />
              {error}
            </div>
          ) : null}
        </Card>

        {/* 右欄 */}
        <aside className="space-y-4 min-w-0">
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <AccountIcon
                name="donut_large"
                size={18}
                style={{ color: UI.mid }}
              />
              <h3 className="text-sm font-black" style={{ color: UI.dark }}>
                用量圖表
              </h3>
            </div>
            <TrafficUsageCharts
              esims={esims}
              results={results}
              selectedId={selectedId}
              loading={chartLoading}
            />

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <p className="text-sm font-bold text-slate-900">流量監控提醒</p>
              <button
                type="button"
                disabled={monitorChecking || monitorBound}
                onClick={openMonitorBind}
                className={`w-full rounded-lg text-sm font-bold py-3 px-4 transition ${
                  monitorBound
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-[#1E4AD1] hover:bg-[#1639a8] text-white disabled:opacity-60"
                }`}
              >
                {monitorChecking
                  ? "確認中…"
                  : monitorBound
                    ? "已開啟流量監控提醒"
                    : "開啟流量監控提醒"}
              </button>
              <PushLineAlertSection
                boundTopupId={boundTopupId || selectedEsim?.topupId}
              />
            </div>
          </Card>

          <NavyPanel title="手動 ICCID" icon="dialpad">
            <form onSubmit={handleManual} className="space-y-2">
              <input
                type="text"
                value={manualIccid}
                onChange={(e) => setManualIccid(e.target.value)}
                placeholder="19～20 碼 ICCID"
                className="w-full h-9 px-3 text-sm outline-none"
                style={inputStyle}
              />
              <PrimaryBtn
                type="submit"
                disabled={!!loadingId}
                className="w-full"
              >
                查詢
              </PrimaryBtn>
            </form>
            <p
              className="text-[10px] mt-2 leading-relaxed"
              style={{ color: UI.soft }}
            >
              非本站購買的 eSIM 可能無法取得完整用量
            </p>
          </NavyPanel>

          <NavyPanel title="快捷操作" icon="bolt">
            <div className="space-y-2">
              <SecondaryBtn
                className="w-full"
                disabled={!!loadingId || !esims.length}
                onClick={() => esims[0] && handleOneClick(esims[0])}
              >
                <AccountIcon name="bolt" size={16} />
                一鍵查最新
              </SecondaryBtn>
              <SecondaryBtn
                className="w-full"
                disabled={!!loadingId || !esims.length}
                onClick={handleQueryAll}
              >
                <AccountIcon name="sync" size={16} />
                全部更新
              </SecondaryBtn>
              <SecondaryBtn
                className="w-full"
                disabled={monitorChecking || monitorBound}
                onClick={openMonitorBind}
              >
                <AccountIcon name="notifications_active" size={16} />
                {monitorBound ? "已開提醒" : "推播提醒"}
              </SecondaryBtn>
              <SecondaryBtn href="/data-query" className="w-full">
                <AccountIcon name="help_outline" size={16} />
                用量指南
              </SecondaryBtn>
            </div>
          </NavyPanel>
        </aside>
      </div>

      {bindModalOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="traffic-bind-modal-title"
          onClick={() => {
            setBindModalOpen(false);
            setPreferOpenBind(false);
            refreshMonitorStatus();
          }}
        >
          <div
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[22px] sm:rounded-[22px] bg-white shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-white">
              <h3
                id="traffic-bind-modal-title"
                className="text-sm font-black text-slate-900"
              >
                {monitorBound ? "流量監控提醒" : "請綁定 eSIM 開啟監控"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setBindModalOpen(false);
                  setPreferOpenBind(false);
                  refreshMonitorStatus();
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="關閉"
              >
                <AccountIcon name="close" size={18} />
              </button>
            </div>
            <div className="p-4">
              {!monitorBound ? (
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  一次只能監控一張 eSIM。請先開啟推播並選擇要綁定的方案，剩餘流量偏低時會自動通知您。
                </p>
              ) : null}
              <PushNotificationSection
                hideLineAlert
                hidePassCard
                preferBindEsim={
                  preferOpenBind && selectedEsim
                    ? {
                        topupId: selectedEsim.topupId,
                        productName: selectedEsim.productName,
                        iccid: selectedEsim.iccid,
                        orderId: selectedEsim.orderId,
                      }
                    : null
                }
                preferOpenBindLayer={preferOpenBind}
                onPreferBindHandled={() => {}}
                onPreferOpenBindHandled={() => setPreferOpenBind(false)}
                onIccidBound={() => {
                  refreshMonitorStatus();
                  setBindModalOpen(false);
                  setPreferOpenBind(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </AccountPageWrap>
  );
}
