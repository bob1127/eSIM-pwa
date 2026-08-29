"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { useAuth } from "@/hooks/useAuth";
import { formatMb, usagePercent } from "@/lib/esimUsageFormat";
import { detectDeviceLabel } from "@/lib/deviceDetect";
import { pickInstallUrlForOs } from "@/lib/esimInstallLinks";
import { inferEsimInstalled } from "@/lib/esimInstallStatus";
import { getPushEndpoint } from "@/lib/pushBind";
import { subscribeToPush } from "@/lib/pushSubscribe";
import { detectPushSupport, getBrowserContext } from "@/lib/pushSupport";
import {
  broadcastPushNotifyState,
  subscribePushNotifySync,
} from "@/lib/pushNotifySync";
import AppInstallGuideModal from "@/components/AppInstallGuideModal";
import { usePWAInstall } from "@/components/usePWAInstall";
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
    lpa: "LPA:1$demo.smdp$DEMOCODE1",
    iosInstallUrl:
      "https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA%3A1%24demo.smdp%24DEMOCODE1",
    androidInstallUrl:
      "https://esimsetup.android.com/esim_qrcode_provisioning?carddata=LPA%3A1%24demo.smdp%24DEMOCODE1",
  },
  {
    topupId: "Topup-DEMO-JP-5D",
    orderId: "order_DEMO_JP",
    productName: "【測試】日本 eSIM 5日 吃到飽",
    iccid: "8946200100000000002",
    lpa: "LPA:1$demo.smdp$DEMOCODE2",
    iosInstallUrl:
      "https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA%3A1%24demo.smdp%24DEMOCODE2",
    androidInstallUrl:
      "https://esimsetup.android.com/esim_qrcode_provisioning?carddata=LPA%3A1%24demo.smdp%24DEMOCODE2",
  },
  {
    topupId: "Topup-DEMO-KR-7D",
    orderId: "order_DEMO_KR",
    productName: "【測試】韓國 eSIM 7日 5GB",
    iccid: "8946200100000000003",
    lpa: "LPA:1$demo.smdp$DEMOCODE3",
    iosInstallUrl:
      "https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA%3A1%24demo.smdp%24DEMOCODE3",
    androidInstallUrl:
      "https://esimsetup.android.com/esim_qrcode_provisioning?carddata=LPA%3A1%24demo.smdp%24DEMOCODE3",
  },
];

export const QUERY_DEMO_USAGE = {
  "Topup-DEMO-TH-8D": {
    remainingMb: 1280,
    totalMb: 3072,
    usedMb: 1792,
    status: "In use",
    expiresAt: "2026-09-01",
    productName: "【測試】泰國 eSIM 8日 3GB",
    iccid: "8946200100000000001",
    note: "假資料預覽",
  },
  "Topup-DEMO-JP-5D": {
    remainingMb: 1024,
    totalMb: 1024,
    usedMb: 0,
    status: "Unused",
    expiresAt: "2026-08-28",
    productName: "【測試】日本 eSIM 5日 吃到飽",
    iccid: "8946200100000000002",
    note: "假資料預覽",
  },
  "Topup-DEMO-KR-7D": {
    remainingMb: 180,
    totalMb: 5120,
    usedMb: 4940,
    status: "Activated",
    expiresAt: "2026-09-05",
    productName: "【測試】韓國 eSIM 7日 5GB",
    iccid: "8946200100000000003",
    note: "假資料預覽 · 流量偏低",
  },
};

function shortName(name = "") {
  const s = String(name)
    .replace(/^【.*?】/, "")
    .trim();
  return s.length > 14 ? `${s.slice(0, 14)}…` : s || "eSIM";
}

function statusTone(result) {
  const pct = usagePercent(result?.remainingMb, result?.totalMb);
  if (pct == null) return null;
  if (pct <= 15) return { label: "流量偏低", tone: "amber" };
  if (pct <= 40) return { label: "用量正常", tone: "blue" };
  return { label: "剩餘充足", tone: "mint" };
}

function isDesktopOs(os) {
  return os !== "ios" && os !== "android";
}

/** 桌機掃描用 QR 圖：優先訂單圖檔，否則用 LPA／安裝連結產生 */
function buildEsimQrImageUrl(esim) {
  const existing = String(esim?.qrcodeUrl || "").trim();
  if (
    existing &&
    (existing.startsWith("http") ||
      existing.startsWith("data:") ||
      existing.startsWith("/"))
  ) {
    return existing;
  }
  let payload = String(esim?.lpa || "").trim();
  if (!payload) {
    const fromUrl = String(
      esim?.iosInstallUrl || esim?.androidInstallUrl || "",
    );
    const m = fromUrl.match(/carddata=([^&]+)/i);
    if (m?.[1]) {
      try {
        payload = decodeURIComponent(m[1]);
      } catch {
        payload = m[1];
      }
    }
  }
  if (!payload) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&ecc=M&margin=12&data=${encodeURIComponent(payload)}`;
}

function openEsimInstall(esim, deviceOs) {
  if (isDesktopOs(deviceOs)) {
    return { ok: false, reason: "show_qr" };
  }
  const url = pickInstallUrlForOs(deviceOs, esim);
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true };
  }
  if (
    esim?.iosInstallUrl ||
    esim?.androidInstallUrl ||
    esim?.lpa ||
    esim?.qrcodeUrl
  ) {
    return { ok: false, reason: "show_qr" };
  }
  return { ok: false, reason: "missing" };
}

function EsimInstallQrModal({ esim, onClose, onConfirmCheck }) {
  if (!esim) return null;
  const qrSrc = buildEsimQrImageUrl(esim);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="esim-install-qr-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3
            id="esim-install-qr-title"
            className="text-sm font-black text-slate-900"
          >
            安裝 eSIM
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="關閉"
          >
            <MaterialIcon name="close" size={18} />
          </button>
        </div>
        <div className="px-5 py-5 text-center space-y-3">
          <p className="text-sm font-bold text-slate-900">請用裝置掃描安裝</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            用手機相機或「設定 → 行動數據／SIM」掃描下方 QR Code。安裝完成後點「我已安裝，重新查詢」確認狀態。
          </p>
          {qrSrc ? (
            <img
              src={qrSrc}
              alt="eSIM 安裝 QR Code"
              className="mx-auto w-56 h-56 object-contain rounded-2xl border border-slate-200 bg-white select-none"
              draggable={false}
            />
          ) : (
            <p className="py-10 text-sm text-slate-400">
              尚無可顯示的 QR Code，請至會員訂單查看或聯絡客服。
            </p>
          )}
          {esim.productName ? (
            <p className="text-xs font-semibold text-slate-700 line-clamp-2">
              {esim.productName}
            </p>
          ) : null}
          {esim.iccid ? (
            <p className="text-[10px] font-mono text-slate-400 break-all">
              ICCID {esim.iccid}
            </p>
          ) : null}
        </div>
        <div className="px-5 pb-5 space-y-2">
          <button
            type="button"
            onClick={() => onConfirmCheck?.(esim)}
            className="w-full rounded-2xl bg-[#1e4ad1] text-white text-sm font-bold py-3 hover:bg-[#1740b8] transition"
          >
            我已安裝，重新查詢
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold py-2.5 hover:bg-slate-50 transition"
          >
            稍後再說
          </button>
        </div>
      </div>
    </div>
  );
}

function EsimNotInstalledModal({ esim, onClose, onInstall }) {
  if (!esim) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="esim-not-installed-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3
            id="esim-not-installed-title"
            className="text-sm font-black text-slate-900"
          >
            尚未安裝 eSIM
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="關閉"
          >
            <MaterialIcon name="close" size={18} />
          </button>
        </div>
        <div className="px-5 py-5 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <MaterialIcon name="sim_card_alert" size={28} />
          </div>
          <p className="text-sm font-bold text-slate-900">
            此 eSIM 目前尚未安裝或尚未啟用
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            查詢結果顯示方案尚未開通。請先安裝到手機後再開啟行動數據／漫遊；安裝完成約
            用量更新通常需間隔 30–60 分鐘後再查詢；手機顯示用量通常會略高於此數字。
          </p>
          {esim.productName ? (
            <p className="text-xs font-semibold text-slate-700 line-clamp-2">
              {esim.productName}
            </p>
          ) : null}
        </div>
        <div className="px-5 pb-5 space-y-2">
          <button
            type="button"
            onClick={() => onInstall?.(esim)}
            className="w-full rounded-2xl bg-[#1e4ad1] text-white text-sm font-bold py-3 hover:bg-[#1740b8] transition"
          >
            前往安裝 eSIM
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold py-2.5 hover:bg-slate-50 transition"
          >
            稍後再說
          </button>
        </div>
      </div>
    </div>
  );
}

/** 白圓 icon + 下方標籤；成功＝藍底白 icon */
function CircleAction({
  icon,
  label,
  onClick,
  disabled = false,
  title,
  staticOnly = false,
  active = false,
  loading = false,
}) {
  const circleClass = cn(
    "flex h-10 w-10 items-center justify-center rounded-full transition",
    active
      ? "bg-[#1e8fff] shadow-[0_4px_12px_-4px_rgba(30,143,255,0.7)]"
      : "bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.04]",
  );
  const iconClass = cn(
    "leading-none",
    active ? "!text-white" : "text-slate-900",
    loading && "animate-spin",
  );

  const body = (
    <>
      <span className={circleClass}>
        <MaterialIcon
          name={loading ? "progress_activity" : icon}
          size={20}
          filled={active}
          className={iconClass}
          style={active ? { color: "#fff" } : undefined}
        />
      </span>
      <span
        className={cn(
          "mt-1 max-w-[4.2rem] text-center text-[10px] font-bold leading-tight",
          active ? "text-[#1e8fff]" : "text-slate-800",
        )}
      >
        {label}
      </span>
    </>
  );

  if (staticOnly) {
    return (
      <div
        className="shrink-0 inline-flex flex-col items-center justify-start px-0.5"
        title={title || label}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title || label}
      className="shrink-0 inline-flex flex-col items-center justify-start px-0.5 disabled:opacity-50 transition active:scale-[0.97]"
    >
      {body}
    </button>
  );
}

/**
 * 登入會員：可查詢 eSIM 列表 + 點擊查流量／安裝／開啟提醒
 * demoMode：本機假資料，不需登入、不打 API
 */
export default function MemberEsimQuerySheet({
  className = "",
  demoMode = false,
}) {
  const { authReady, isLoggedIn, token } = useAuth();
  const { isStandalone, isInstallable, deviceType } = usePWAInstall();
  const [esims, setEsims] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [results, setResults] = useState({});
  const [queryingId, setQueryingId] = useState(null);
  const [queryError, setQueryError] = useState("");
  const [deviceOs, setDeviceOs] = useState("other");
  const [boundTopupId, setBoundTopupId] = useState(null);
  const [alertBusyId, setAlertBusyId] = useState(null);
  const [installQrEsim, setInstallQrEsim] = useState(null);
  const [notInstalledEsim, setNotInstalledEsim] = useState(null);
  /** 使用者主動點「查詢流量」的方案；自動查詢不標藍 */
  const [manualQueryIds, setManualQueryIds] = useState(() => new Set());
  const [showAppInstallGuide, setShowAppInstallGuide] = useState(false);
  const [iosNeedsPwa, setIosNeedsPwa] = useState(false);
  const autoQueriedRef = useRef(false);

  const refreshIosPwaGate = useCallback(() => {
    const ctx = getBrowserContext();
    // iPhone／iPad 未以主畫面 App 開啟 → 先引導安裝 PWA，再顯示開啟提醒
    setIosNeedsPwa(Boolean(ctx.isIOS && !ctx.isStandalone && !isStandalone));
  }, [isStandalone]);

  useEffect(() => {
    setDeviceOs(detectDeviceLabel().os);
    refreshIosPwaGate();
  }, [refreshIosPwaGate]);

  useEffect(() => {
    refreshIosPwaGate();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshIosPwaGate();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", refreshIosPwaGate);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", refreshIosPwaGate);
    };
  }, [refreshIosPwaGate]);

  const authHeaders = useCallback(() => {
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const refreshBoundAlert = useCallback(async () => {
    if (demoMode) return;
    try {
      const endpoint = await getPushEndpoint();
      if (!endpoint) {
        setBoundTopupId(null);
        return;
      }
      const res = await fetch(
        `/api/push/bind-status?endpoint=${encodeURIComponent(endpoint)}`,
        { credentials: "include", headers: authHeaders() },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBoundTopupId(null);
        return;
      }
      const topup =
        data.bound && data.topupId != null ? String(data.topupId) : null;
      setBoundTopupId(topup);
    } catch {
      setBoundTopupId(null);
    }
  }, [demoMode, authHeaders]);

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
      await refreshBoundAlert();
    } catch (e) {
      setListError(e.message || "載入失敗");
      setEsims([]);
    } finally {
      setLoadingList(false);
    }
  }, [isLoggedIn, authHeaders, demoMode, refreshBoundAlert]);

  const queryUsage = useCallback(
    async (esim, opts = {}) => {
      const { skipNotInstalledPopup = false } = opts;
      const key = esim.topupId || esim.iccid;
      if (!key) {
        setQueryError("此方案缺少查詢編號");
        return;
      }
      const resultKey = String(key);
      setSelectedId(resultKey);
      setQueryingId(resultKey);
      setQueryError("");
      try {
        if (demoMode) {
          await new Promise((r) => setTimeout(r, 450));
          const fake =
            QUERY_DEMO_USAGE[key] ||
            QUERY_DEMO_USAGE[QUERY_DEMO_ESIMS[0].topupId];
          setResults((prev) => ({ ...prev, [resultKey]: { ...fake } }));
          if (!skipNotInstalledPopup && inferEsimInstalled(fake) === false) {
            setNotInstalledEsim(esim);
          }
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
        setResults((prev) => ({ ...prev, [resultKey]: data }));
        if (data.productName) {
          setEsims((prev) =>
            prev.map((row) => {
              const rowKey = String(row.topupId || row.iccid || "");
              if (rowKey !== resultKey) return row;
              const nextName = String(data.productName || "").trim();
              if (!nextName || nextName === row.productName) return row;
              // 僅在查詢結果更具體（含天數／Mbps／每日）時覆寫列表名稱
              if (
                /日|每日|Mbps|GB|MB|吃到飽|無限/.test(nextName) ||
                nextName.length >= String(row.productName || "").length
              ) {
                return { ...row, productName: nextName };
              }
              return row;
            }),
          );
        }
        if (!skipNotInstalledPopup && inferEsimInstalled(data) === false) {
          setNotInstalledEsim(esim);
        }
      } catch (e) {
        setQueryError(e.message || "查詢失敗");
      } finally {
        setQueryingId(null);
      }
    },
    [authHeaders, demoMode],
  );

  const enableTrafficAlert = useCallback(
    async (esim) => {
      const key = esim.topupId || esim.iccid;
      if (!key || alertBusyId) return;

      if (demoMode) {
        setAlertBusyId(key);
        await new Promise((r) => setTimeout(r, 600));
        setBoundTopupId(String(key));
        setAlertBusyId(null);
        return;
      }

      if (!isLoggedIn) {
        alert("請先登入會員後再開啟流量提醒。");
        return;
      }

      setAlertBusyId(key);
      setQueryError("");
      try {
        const ctx = getBrowserContext();
        if (ctx.isIOS && !ctx.isStandalone) {
          setShowAppInstallGuide(true);
          return;
        }

        const support = await detectPushSupport();
        if (!support.supported) {
          throw new Error(
            support.hint ||
              "此裝置暫不支援通知，請改用 Chrome，或將本站加入主畫面。",
          );
        }

        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "denied"
        ) {
          throw new Error("通知已被封鎖。請到瀏覽器設定允許通知後再試。");
        }

        await subscribeToPush({ token });
        const endpoint = await getPushEndpoint();
        if (!endpoint) {
          throw new Error("無法取得推播訂閱，請允許通知後再試。");
        }

        const headers = {
          "Content-Type": "application/json",
          ...authHeaders(),
        };
        const body = { endpoint };
        if (esim.topupId && !String(esim.topupId).startsWith("iccid:")) {
          body.topupId = esim.topupId;
          body.bindMethod = "member_order";
          if (esim.iccid) body.iccid = esim.iccid;
        } else if (esim.iccid) {
          body.iccid = esim.iccid;
        } else {
          throw new Error("此方案缺少 topup 或 ICCID，無法開啟提醒");
        }

        const res = await fetch("/api/push/bind-esim", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data.detail
              ? `${data.error || "開啟提醒失敗"}：${data.detail}`
              : data.error || data.hint || "開啟提醒失敗",
          );
        }
        setBoundTopupId(String(data.topupId || key));
        broadcastPushNotifyState({
          on: true,
          topupId: String(data.topupId || key),
          source: "member-esim-query",
        });
      } catch (e) {
        setQueryError(e.message || "開啟提醒失敗");
      } finally {
        setAlertBusyId(null);
      }
    },
    [alertBusyId, demoMode, isLoggedIn, token, authHeaders],
  );

  const handleQueryClick = useCallback(
    (esim) => {
      const key = esim?.topupId || esim?.iccid;
      if (key) {
        setManualQueryIds((prev) => new Set(prev).add(String(key)));
      }
      queryUsage(esim);
    },
    [queryUsage],
  );

  const handleInstallClick = useCallback(
    (esim) => {
      const result = openEsimInstall(esim, deviceOs);
      if (result.reason === "show_qr") {
        setQueryError("");
        setInstallQrEsim(esim);
        return;
      }
      if (result.reason === "missing") {
        setQueryError(
          "此方案尚無可安裝的 QR／連結，請至會員中心訂單查看或聯絡客服。",
        );
        return;
      }
      // 手機一鍵安裝：僅開啟系統安裝頁，不標成已安裝；改查用量確認狀態
      if (result.ok) {
        setQueryError("");
        queryUsage(esim);
      }
    },
    [deviceOs, queryUsage],
  );

  const closeInstallQrModal = useCallback(() => {
    setInstallQrEsim(null);
  }, []);

  const confirmInstallAndRecheck = useCallback(
    (esim) => {
      setInstallQrEsim(null);
      // 主動確認安裝後的查詢：略過「未安裝」彈窗，避免連續彈兩次
      if (esim) queryUsage(esim, { skipNotInstalledPopup: true });
    },
    [queryUsage],
  );

  const openInstallFromNotInstalledTip = useCallback(
    (esim) => {
      setNotInstalledEsim(null);
      if (!esim) return;
      const result = openEsimInstall(esim, deviceOs);
      if (result.reason === "show_qr" || result.ok === false) {
        if (result.reason === "missing") {
          setQueryError(
            "此方案尚無可安裝的 QR／連結，請至會員中心訂單查看或聯絡客服。",
          );
          return;
        }
        setInstallQrEsim(esim);
        return;
      }
      if (result.ok) {
        queryUsage(esim, { skipNotInstalledPopup: true });
      }
    },
    [deviceOs, queryUsage],
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
      setBoundTopupId(null);
      setLoadingList(false);
      return;
    }
    loadEsims();
  }, [authReady, isLoggedIn, loadEsims, demoMode]);

  // 與主 tab（我的 eSIM）流量綁定雙向同步
  useEffect(() => {
    if (demoMode) return undefined;
    return subscribePushNotifySync((detail) => {
      if (detail?.source === "member-esim-query") return;
      if (Object.prototype.hasOwnProperty.call(detail || {}, "topupId")) {
        setBoundTopupId(detail.topupId);
        return;
      }
      if (detail?.on === false) {
        setBoundTopupId(null);
        return;
      }
      refreshBoundAlert();
    });
  }, [demoMode, refreshBoundAlert]);

  useEffect(() => {
    if (demoMode || !isLoggedIn) return undefined;
    const onVis = () => {
      if (document.visibilityState === "visible") refreshBoundAlert();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [demoMode, isLoggedIn, refreshBoundAlert]);

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
  const installOsLabel =
    deviceOs === "ios" ? "iOS" : deviceOs === "android" ? "Android" : null;

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
              <p className="text-sm font-bold text-slate-700">
                尚無可查詢 eSIM
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                本站訂單開通後會顯示於此。
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
                const idStr = String(id || "");
                const active = idStr === String(selectedId || "");
                const r = results[idStr] ?? results[id];
                const tone = statusTone(r);
                const remaining =
                  r?.remainingMb != null ? formatMb(r.remainingMb) : null;
                const isQuerying = String(queryingId || "") === idStr;
                const queriedOk = Boolean(r);
                const queryActive =
                  manualQueryIds.has(idStr) && queriedOk && !isQuerying;
                const installed = inferEsimInstalled(r);
                // 僅在有實際用量／使用中證據時標「已開通」；勿用 active_time（未掃 QR 也可能有）
                const installSuccess = installed === true;
                const alertOn =
                  boundTopupId != null &&
                  (String(boundTopupId) === idStr ||
                    String(boundTopupId) === String(esim.topupId || ""));
                const alertLoading = alertBusyId === id;
                const dotColor = i === 0 ? "#1e8fff" : "#22c55e";

                return (
                  <div
                    key={id || i}
                    className={cn(
                      "relative w-full rounded-2xl border px-3.5 py-3 transition flex items-center gap-2 sm:gap-3",
                      active
                        ? "border-[#1e8fff] bg-[#F7FAFF] shadow-[0_8px_24px_-16px_rgba(30,74,209,0.45)]"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(id)}
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
                              ? `剩餘 ${remaining}${r?.expiresAt ? ` · 效期 ${String(r.expiresAt).slice(0, 10)}` : ""}`
                              : queriedOk &&
                                  r?.usedMb != null &&
                                  Number(r.usedMb) > 0
                                ? `已用 ${formatMb(r.usedMb)}${r?.expiresAt ? ` · 效期至 ${String(r.expiresAt).slice(0, 10)}` : ""}`
                                : queriedOk && installSuccess
                                  ? `使用中${r?.expiresAt ? ` · 效期至 ${String(r.expiresAt).slice(0, 10)}` : ""}`
                                  : queriedOk && r?.status
                                    ? `狀態 ${r.status}${esim.iccid ? ` · 訂單 …${String(esim.iccid).slice(-6)}` : ""}`
                                    : esim.iccid
                                      ? `訂單 ICCID …${String(esim.iccid).slice(-6)} · 點右側查流量`
                                      : "選擇後點右側查詢流量"}
                        </p>
                        {esim.iccid ? (
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                            訂單 ICCID …{String(esim.iccid).slice(-6)}
                            {installSuccess
                              ? " · 已偵測到用量"
                              : " · 本機「關於本機」可能顯示不同設備 ICCID（正常）"}
                          </p>
                        ) : null}
                        {tone ? (
                          <span
                            className={cn(
                              "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                              tone.tone === "amber" &&
                                "bg-amber-100 text-amber-800",
                              tone.tone === "mint" &&
                                "bg-emerald-100 text-emerald-700",
                              tone.tone === "blue" &&
                                "bg-[#EAF0FB] text-[#1e4ad1]",
                            )}
                          >
                            {tone.label}
                          </span>
                        ) : null}
                      </div>
                    </button>

                    <div className="shrink-0 flex items-start gap-1.5 sm:gap-2">
                      <CircleAction
                        icon="add"
                        label="查詢流量"
                        loading={isQuerying && manualQueryIds.has(idStr)}
                        active={queryActive}
                        disabled={isQuerying}
                        onClick={() => handleQueryClick(esim)}
                      />

                      <CircleAction
                        icon={installSuccess ? "check" : "sim_card_download"}
                        label={installSuccess ? "使用中" : "安裝 eSIM"}
                        active={installSuccess}
                        title={
                          installSuccess
                            ? "供應商已偵測到用量，方案使用中"
                            : isDesktopOs(deviceOs)
                              ? "顯示安裝 QR Code"
                              : installOsLabel
                                ? `一鍵安裝（${installOsLabel}）`
                                : "一鍵安裝 eSIM"
                        }
                        onClick={() => handleInstallClick(esim)}
                      />

                      {iosNeedsPwa ? (
                        <CircleAction
                          icon="install_mobile"
                          label="安裝 App"
                          title="先加入主畫面，再開啟流量提醒"
                          onClick={() => setShowAppInstallGuide(true)}
                        />
                      ) : (
                        <CircleAction
                          icon={alertOn ? "notifications" : "notifications_active"}
                          label={alertOn ? "已開提醒" : "開啟提醒"}
                          loading={alertLoading}
                          active={alertOn && !alertLoading}
                          disabled={Boolean(alertBusyId)}
                          onClick={() => enableTrafficAlert(esim)}
                        />
                      )}
                    </div>
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
                    : selectedResult.usedMb != null &&
                        Number(selectedResult.usedMb) > 0
                      ? `已用 ${formatMb(selectedResult.usedMb)}`
                      : "暫無用量（未使用或供應商尚未同步）"}
                </span>
                {pct != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                    <MaterialIcon name="pie_chart" size={14} />
                    剩餘 {pct}%
                  </span>
                )}
                {selectedResult.status && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                    <MaterialIcon name="info" size={14} />
                    {selectedResult.status}
                  </span>
                )}
                {selectedResult.activatedAt &&
                  selectedResult.source === "device_detail" && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600"
                      title="供應商系統時間，不代表本機已掃 QR 安裝"
                    >
                      <MaterialIcon name="schedule" size={14} />
                      系統紀錄{" "}
                      {String(selectedResult.activatedAt).slice(0, 16)}
                    </span>
                  )}
                {(selectedResult.provisionedAt || selectedResult.createdAt) &&
                  !(
                    selectedResult.activatedAt &&
                    selectedResult.source === "device_detail"
                  ) && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700"
                      title="供應商開通／出貨時間，通常接近購買時間"
                    >
                      <MaterialIcon name="schedule" size={14} />
                      出貨{" "}
                      {String(
                        selectedResult.provisionedAt ||
                          selectedResult.createdAt,
                      ).slice(0, 16)}
                    </span>
                  )}
                {selectedResult.expiresAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                    <MaterialIcon name="event" size={14} />
                    {String(selectedResult.expiresAt).slice(0, 10)}
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
          </>
        )}
      </div>

      <EsimNotInstalledModal
        esim={notInstalledEsim}
        onClose={() => setNotInstalledEsim(null)}
        onInstall={openInstallFromNotInstalledTip}
      />

      <EsimInstallQrModal
        esim={installQrEsim}
        onClose={closeInstallQrModal}
        onConfirmCheck={confirmInstallAndRecheck}
      />

      <AppInstallGuideModal
        open={showAppInstallGuide}
        onClose={() => {
          setShowAppInstallGuide(false);
          refreshIosPwaGate();
        }}
        showOneClickInstall={isInstallable}
        platform={
          deviceType === "ios" || deviceType === "mac" ? deviceType : null
        }
      />
    </div>
  );
}
