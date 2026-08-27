"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import PushButton from "./PushButton";
import PushIccidBind from "./PushIccidBind";
import PushMemberEsimBind from "./PushMemberEsimBind";
import PushLineAlertSection from "./PushLineAlertSection";
import GuestPushBindForm from "./GuestPushBindForm";
import IosPwaPushGuide from "./IosPwaPushGuide";
import MaterialIcon from "./MaterialIcon";
import BindSuccessSheet from "@/components/line/BindSuccessSheet";
import TrafficAlertPassCard from "@/components/TrafficAlertPassCard";
import { detectPushSupport } from "../lib/pushSupport";
import { getPushEndpoint, ICCID_STORAGE_KEY } from "../lib/pushBind";
import {
  broadcastPushNotifyState,
} from "@/lib/pushNotifySync";
import { useAuth } from "../hooks/useAuth";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { QuarterRing } from "@/components/ui/QuarterRing";
import { buildLoginUrl } from "@/lib/authRedirect";

const REF_BLUE = "#3768C7";

/** 本機預覽用假訂單（與測試文案一致） */
export const TRAFFIC_DEMO_ESIMS = [
  {
    topupId: "Topup-DEMO-ACT-1782824369466",
    orderId: "order_DEMO_ACT",
    productName: "【測試-已開通】泰國 eSIM 8日",
    iccid: "8946200100000000001",
  },
  {
    topupId: "Topup-DEMO-UNACT-1782824369466",
    orderId: "order_DEMO_UNACT",
    productName: "【測試-未開通】韓國 eSIM 5日",
    iccid: "8946200100000000002",
  },
  {
    topupId: "Topup-DEMO-INACT-1782824026256",
    orderId: "order_DEMO_INACT",
    productName: "【測試】韓國 eSIM 5日 無限流量",
    iccid: "8946200100000000003",
  },
];

/** 假資料用量（對應上方 topupId，供通行證圖表） */
export const TRAFFIC_DEMO_USAGE = {
  "Topup-DEMO-ACT-1782824369466": {
    remainingMb: 1280,
    totalMb: 3072,
    expiresAt: "2026-09-01",
  },
  "Topup-DEMO-UNACT-1782824369466": {
    remainingMb: 420,
    totalMb: 1024,
    expiresAt: "2026-08-28",
  },
  "Topup-DEMO-INACT-1782824026256": {
    remainingMb: 180,
    totalMb: 5120,
    expiresAt: "2026-09-05",
  },
};

export const TRAFFIC_DEMO_SCENARIOS = [
  { key: "live", label: "真實狀態" },
  { key: "guest", label: "訪客・需登入" },
  { key: "loading", label: "載入中" },
  { key: "member_orders", label: "會員・有訂單未綁" },
  { key: "member_bind_fail", label: "會員・綁定失敗" },
  { key: "member_no_orders", label: "會員・無訂單" },
  { key: "member_iccid", label: "會員・手動 ICCID" },
  { key: "auto_binding", label: "自動綁定中" },
  { key: "bound", label: "已開啟提醒" },
  { key: "ios_guide", label: "iOS 需裝 PWA" },
];

function resolveTrafficDemo(scenario) {
  if (!scenario || scenario === "live") return null;
  const base = {
    authReady: true,
    isGuest: false,
    isLoggedIn: true,
    bindPhase: "unbound",
    memberEsims: [],
    isMember: true,
    showManualIccid: false,
    autoBinding: false,
    showMemberIccidFlow: false,
    boundInfo: null,
    mode: "button",
    statusChecking: false,
    bindError: "",
  };
  switch (scenario) {
    case "guest":
      return {
        ...base,
        isGuest: true,
        isLoggedIn: false,
        isMember: false,
        bindPhase: "needs_subscribe",
      };
    case "loading":
      return { ...base, authReady: false, statusChecking: true };
    case "member_orders":
      return { ...base, memberEsims: TRAFFIC_DEMO_ESIMS };
    case "member_bind_fail":
      return {
        ...base,
        memberEsims: TRAFFIC_DEMO_ESIMS,
        bindError: "① 綁定失敗",
      };
    case "member_no_orders":
      return { ...base, memberEsims: [], bindPhase: "unbound" };
    case "member_iccid":
      return {
        ...base,
        memberEsims: [],
        showMemberIccidFlow: true,
        showManualIccid: true,
      };
    case "auto_binding":
      return {
        ...base,
        memberEsims: TRAFFIC_DEMO_ESIMS,
        autoBinding: true,
        bindPhase: "unbound",
      };
    case "bound":
      return {
        ...base,
        bindPhase: "bound",
        boundInfo: {
          productName: TRAFFIC_DEMO_ESIMS[0].productName,
          topupId: TRAFFIC_DEMO_ESIMS[0].topupId,
          iccid: TRAFFIC_DEMO_ESIMS[0].iccid,
          bindMethod: "member_order",
          boundAt: new Date().toISOString(),
        },
      };
    case "ios_guide":
      return {
        ...base,
        mode: "guide",
        bindPhase: "needs_subscribe",
      };
    default:
      return null;
  }
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getBannerDescription({ isGuest, isLoggedIn, memberEsims, bindPhase }) {
  if (bindPhase === "bound") {
    return "流量提醒已啟用，剩餘流量偏低時將自動通知您。";
  }
  if (isGuest) {
    return "流量提醒僅限會員使用。請先登入，即可一鍵綁定本站 eSIM 並開啟推播。";
  }
  if (isLoggedIn && memberEsims.length > 0) {
    return "會員專屬：開啟推播後，點通行證進入選單綁定一張 eSIM（一次僅一張）。";
  }
  if (isLoggedIn) {
    return "已登入會員。開啟推播後可綁定本站訂單，或手動輸入 ICCID（一次僅監控一張）。";
  }
  return "請先登入會員，再開啟流量提醒。";
}

function GuestLoginGate({ embedded = false, className = "" }) {
  const router = useRouter();
  const loginHref = buildLoginUrl(
    router.asPath || "/data-query?setup=traffic",
  );

  return (
    <div
      className={
        embedded
          ? `bg-white px-5 sm:px-8 py-6 border-t border-stone-100 ${className}`
          : `rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 ${className}`
      }
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">
        會員限定
      </p>
      <h4 className="text-base font-black text-stone-900 mb-1">
        請先登入會員
      </h4>
      <p className="text-sm text-stone-500 leading-relaxed mb-4">
        訪客無法開啟流量提醒。登入後可一鍵綁定本站訂單並啟用推播通知。
      </p>
      <Link
        href={loginHref}
        className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-[#1d5cc5] hover:bg-[#174da8] text-white font-bold text-sm px-6 py-3 transition-colors"
      >
        登入會員
      </Link>
    </div>
  );
}

/**
 * 推播：訂閱 → 依身分綁定 eSIM
 * - 會員：自動 / 選訂單（不需 ICCID）
 * - 訪客：改為需登入（demoScenario 可預覽各狀態）
 */
export default function PushNotificationSection({
  className = "",
  onIccidBound,
  initialIccid = "",
  variant = "default",
  /** @type {string | null} live | guest | loading | … 見 TRAFFIC_DEMO_SCENARIOS */
  demoScenario = null,
  /** 從查詢用量帶入：預選並打開綁定層 { topupId, productName, iccid } */
  preferBindEsim = null,
  onPreferBindHandled = null,
  /** 從 ?setup=traffic／商品頁進來：訂閱後或已訂閱時打開選綁層 */
  preferOpenBindLayer = false,
  onPreferOpenBindHandled = null,
  /** 綁定彈窗等場景：不顯示 LINE 區塊（LINE 另在側欄） */
  hideLineAlert = false,
  /** 綁定彈窗：不顯示通行證大卡（綁定完成由外層關閉即可） */
  hidePassCard = false,
}) {
  const { token, isLoggedIn, isGuest, authReady } = useAuth();
  const [mode, setMode] = useState("button");
  const [bindPhase, setBindPhase] = useState("needs_subscribe");
  const [statusChecking, setStatusChecking] = useState(true);
  const [boundInfo, setBoundInfo] = useState(null);
  const [memberEsims, setMemberEsims] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [showManualIccid, setShowManualIccid] = useState(false);
  const [autoBinding, setAutoBinding] = useState(false);
  const [noOrderPrompt, setNoOrderPrompt] = useState(null);
  const [showMemberIccidFlow, setShowMemberIccidFlow] = useState(false);
  const [showBindSuccess, setShowBindSuccess] = useState(false);
  /** pass = 圖一第一層；bind = 圖二選綁；manual = ICCID */
  const [alertLayer, setAlertLayer] = useState("pass");
  const [unbinding, setUnbinding] = useState(false);
  /** demo 可互動覆寫（綁定／取消綁定不打真實 API） */
  const [demoOverride, setDemoOverride] = useState(null);
  const [passUsage, setPassUsage] = useState(null);
  const [passUsageLoading, setPassUsageLoading] = useState(false);
  /** 查詢頁「開啟提醒」帶入的方案 */
  const [focusBindEsim, setFocusBindEsim] = useState(null);

  const isDemo = Boolean(demoScenario && demoScenario !== "live");
  const demoView = resolveTrafficDemo(demoScenario);
  const demoBindError =
    demoScenario === "member_bind_fail"
      ? demoView?.bindError || "① 綁定失敗"
      : "";

  // 本機 demo：切換情境時重置互動覆寫；綁定失敗情境進第二層
  useEffect(() => {
    setDemoOverride(null);
    if (demoScenario === "bound") {
      setShowBindSuccess(true);
      setAlertLayer("pass");
    } else if (demoScenario === "member_bind_fail") {
      setAlertLayer("bind");
    } else if (
      demoScenario === "member_orders" ||
      demoScenario === "live" ||
      !demoScenario
    ) {
      // 若從查詢頁帶入預選方案，保留 bind 層
      setAlertLayer((cur) => (focusBindEsim ? "bind" : "pass"));
    }
  }, [demoScenario]);

  // 查詢頁「開啟提醒」：進流量提醒並打開綁定層、預選該方案
  useEffect(() => {
    if (!preferBindEsim?.topupId && !preferBindEsim?.iccid) return;
    setFocusBindEsim({
      topupId: preferBindEsim.topupId || null,
      productName: preferBindEsim.productName || null,
      iccid: preferBindEsim.iccid || null,
      orderId: preferBindEsim.orderId || null,
    });
    setShowManualIccid(false);
    setShowMemberIccidFlow(false);
    setAlertLayer("bind");
    onPreferBindHandled?.();
  }, [preferBindEsim, onPreferBindHandled]);

  // 商品頁／?setup=traffic：狀態就緒後打開選綁（有訂單時）
  useEffect(() => {
    if (!preferOpenBindLayer) return;
    const checking = isDemo ? false : statusChecking;
    if (checking) return;

    const phase = isDemo ? demoView?.bindPhase || "unbound" : bindPhase;
    const esims = isDemo ? demoView?.memberEsims || [] : memberEsims;

    // 尚未訂閱：保留 flag，等 handleSubscribed 開 bind
    if (phase === "needs_subscribe") return;

    if (
      (phase === "unbound" || phase === "bound") &&
      esims.length > 0
    ) {
      setAlertLayer("bind");
    }
    onPreferOpenBindHandled?.();
  }, [
    preferOpenBindLayer,
    statusChecking,
    bindPhase,
    memberEsims,
    isDemo,
    demoView?.bindPhase,
    demoView?.memberEsims,
    onPreferOpenBindHandled,
  ]);

  const applyBound = useCallback(
    (data, { celebrate = false } = {}) => {
      setBindPhase("bound");
      setBoundInfo(data);
      if (data.iccid) {
        localStorage.setItem(ICCID_STORAGE_KEY, data.iccid);
      }
      broadcastPushNotifyState({
        on: true,
        topupId: data.topupId || null,
        source: "push-notification-section",
      });
      onIccidBound?.(data.iccid || data.topupId || true);
      if (celebrate) setShowBindSuccess(true);
    },
    [onIccidBound],
  );

  const loadMemberEsims = useCallback(async () => {
    try {
      const res = await fetch("/api/push/member-esims", {
        credentials: "include",
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        setIsMember(true);
        setMemberEsims(data.esims || []);
        return data.esims || [];
      }
      setIsMember(false);
      setMemberEsims([]);
      return [];
    } catch {
      setIsMember(false);
      setMemberEsims([]);
      return [];
    }
  }, [token]);

  const checkBindStatus = useCallback(async () => {
    setStatusChecking(true);
    try {
      const endpoint = await getPushEndpoint();
      if (!endpoint) {
        setBindPhase("needs_subscribe");
        return;
      }

      if (isLoggedIn) {
        await loadMemberEsims();
      }

      const res = await fetch(
        `/api/push/bind-status?endpoint=${encodeURIComponent(endpoint)}`,
      );
      const data = await res.json();
      if (data.bound) {
        applyBound(data);
      } else if (data.subscribed) {
        setBindPhase("unbound");
      } else {
        setBindPhase("needs_subscribe");
      }
    } catch {
      setBindPhase("needs_subscribe");
    } finally {
      setStatusChecking(false);
    }
  }, [loadMemberEsims, applyBound, isLoggedIn]);

  const refresh = useCallback(async () => {
    const support = await detectPushSupport();
    setMode(support.reason === "ios-needs-pwa" ? "guide" : "button");
    await checkBindStatus();
  }, [checkBindStatus]);

  useEffect(() => {
    if (!authReady || isDemo) return;
    if (isLoggedIn) {
      loadMemberEsims();
    }
  }, [authReady, isLoggedIn, loadMemberEsims, isDemo]);

  useEffect(() => {
    if (!authReady || isDemo) return;
    refresh();
    window.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh, authReady, isLoggedIn, isDemo]);

  // 本機 demo：切換情境時重置互動覆寫；綁定失敗情境進第二層
  useEffect(() => {
    setDemoOverride(null);
    if (demoScenario === "bound") {
      setShowBindSuccess(true);
      setAlertLayer("pass");
    } else if (demoScenario === "member_bind_fail") {
      setAlertLayer("bind");
    } else if (
      demoScenario === "member_orders" ||
      demoScenario === "live" ||
      !demoScenario
    ) {
      setAlertLayer("pass");
    }
  }, [demoScenario]);

  const handleSubscribed = async () => {
    setBindPhase("unbound");
    const esims = await loadMemberEsims();
    setShowManualIccid(false);
    setShowMemberIccidFlow(false);
    // 與全站一致：訂閱後進入選綁層（有訂單時），不 silent auto-bind
    const openBind =
      Boolean(focusBindEsim) ||
      (Array.isArray(esims) && esims.length > 0);
    setAlertLayer(openBind || hidePassCard ? "bind" : "pass");
  };

  const handleBound = (data) => {
    if (isDemo) {
      setDemoOverride({
        bindPhase: "bound",
        boundInfo: {
          productName: data.productName,
          topupId: data.topupId,
          iccid: data.iccid,
          bindMethod: data.bindMethod || "member_order",
          boundAt: data.boundAt || new Date().toISOString(),
        },
      });
      setShowBindSuccess(true);
      setShowManualIccid(false);
      setShowMemberIccidFlow(false);
      setFocusBindEsim(null);
      setAlertLayer("pass");
      return;
    }
    applyBound(data, { celebrate: true });
    setShowManualIccid(false);
    setShowMemberIccidFlow(false);
    setFocusBindEsim(null);
    setAlertLayer("pass");
  };

  const handleUnbind = useCallback(async () => {
    setUnbinding(true);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 300));
        setDemoOverride({ bindPhase: "unbound", boundInfo: null });
        setAlertLayer("pass");
        return;
      }
      const endpoint = await getPushEndpoint();
      if (!endpoint) throw new Error("找不到推播訂閱");
      const res = await fetch("/api/push/unbind", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({ endpoint }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "取消綁定失敗");
      setBindPhase("unbound");
      setBoundInfo(null);
      setAlertLayer("pass");
      broadcastPushNotifyState({
        on: true,
        topupId: null,
        source: "push-notification-section",
      });
      try {
        localStorage.removeItem(ICCID_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    } catch (e) {
      alert(e.message || "取消綁定失敗");
    } finally {
      setUnbinding(false);
    }
  }, [token, isDemo]);

  const confirmMemberNoOrderSubscribe = useCallback(() => {
    return new Promise((resolve) => {
      setNoOrderPrompt({ resolve });
    });
  }, []);

  const handleBeforeSubscribe = useCallback(async () => {
    if (!isLoggedIn || isGuest) return true;
    const esims =
      memberEsims.length > 0 ? memberEsims : await loadMemberEsims();
    if (esims.length > 0) return true;

    const allowed = await confirmMemberNoOrderSubscribe();
    if (allowed) {
      setShowMemberIccidFlow(true);
      setShowManualIccid(true);
    }
    return false;
  }, [
    isLoggedIn,
    isGuest,
    memberEsims,
    loadMemberEsims,
    confirmMemberNoOrderSubscribe,
  ]);

  const closeNoOrderPrompt = (allowed) => {
    noOrderPrompt?.resolve(allowed);
    setNoOrderPrompt(null);
  };

  const boundLabel = () => {
    if (boundInfo?.productName) return boundInfo.productName;
    if (boundInfo?.topupId)
      return `Topup …${String(boundInfo.topupId).slice(-6)}`;
    if (boundInfo?.iccid) return `ICCID …${boundInfo.iccid.slice(-6)}`;
    return null;
  };

  // demoScenario 覆寫呈現（不打真實 API）；demoOverride 可互動綁定／解綁
  const vAuthReady = demoView ? demoView.authReady : authReady;
  const vIsGuest = demoView ? demoView.isGuest : isGuest;
  const vIsLoggedIn = demoView ? demoView.isLoggedIn : isLoggedIn;
  const vBindPhase =
    demoOverride?.bindPhase ??
    (demoView ? demoView.bindPhase : bindPhase);
  const vMemberEsims = demoView ? demoView.memberEsims : memberEsims;
  const vIsMember = demoView ? demoView.isMember : isMember;
  const vShowManualIccid = demoView ? demoView.showManualIccid : showManualIccid;
  const vAutoBinding = demoView ? demoView.autoBinding : autoBinding;
  const vShowMemberIccidFlow = demoView
    ? demoView.showMemberIccidFlow
    : showMemberIccidFlow;
  const vBoundInfo =
    demoOverride && "boundInfo" in demoOverride
      ? demoOverride.boundInfo
      : demoView
        ? demoView.boundInfo
        : boundInfo;
  const vMode = demoView ? demoView.mode : mode;
  const vStatusChecking = demoView ? demoView.statusChecking : statusChecking;

  /** 查詢頁帶入的方案：若不在列表中則插入，方便預選綁定 */
  const vMemberEsimsForBind = (() => {
    const list = [...(vMemberEsims || [])];
    if (
      focusBindEsim?.topupId &&
      !list.some((e) => e.topupId === focusBindEsim.topupId)
    ) {
      list.unshift({
        topupId: focusBindEsim.topupId,
        productName: focusBindEsim.productName || "選定方案",
        iccid: focusBindEsim.iccid || null,
        orderId: focusBindEsim.orderId || null,
      });
    }
    return list;
  })();

  // 通行證：已綁定時載入用量圖表資料
  useEffect(() => {
    if (vBindPhase !== "bound" || !vBoundInfo) {
      setPassUsage(null);
      setPassUsageLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setPassUsageLoading(true);
      try {
        if (isDemo) {
          await new Promise((r) => setTimeout(r, 350));
          const fake =
            TRAFFIC_DEMO_USAGE[vBoundInfo.topupId] ||
            TRAFFIC_DEMO_USAGE[TRAFFIC_DEMO_ESIMS[0].topupId];
          if (!cancelled) setPassUsage({ ...fake });
          return;
        }
        const body = {};
        if (
          vBoundInfo.topupId &&
          !String(vBoundInfo.topupId).startsWith("iccid:")
        ) {
          body.topupId = vBoundInfo.topupId;
        }
        if (vBoundInfo.iccid) body.iccid = vBoundInfo.iccid;
        if (!body.topupId && !body.iccid) {
          if (!cancelled) setPassUsage(null);
          return;
        }
        const res = await fetch("/api/esim/usage", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(token),
          },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (res.ok) setPassUsage(data);
          else setPassUsage(null);
        }
      } catch {
        if (!cancelled) setPassUsage(null);
      } finally {
        if (!cancelled) setPassUsageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    vBindPhase,
    vBoundInfo?.topupId,
    vBoundInfo?.iccid,
    isDemo,
    token,
  ]);

  const vBoundLabel = () => {
    if (vBoundInfo?.productName) return vBoundInfo.productName;
    if (vBoundInfo?.topupId)
      return `Topup …${String(vBoundInfo.topupId).slice(-6)}`;
    if (vBoundInfo?.iccid) return `ICCID …${vBoundInfo.iccid.slice(-6)}`;
    return null;
  };

  const isBanner = variant === "banner";

  const boundStatusChip = (
    <div
      className={
        isBanner
          ? "inline-flex items-center gap-2 rounded-full bg-white/20 border border-white/40 text-white text-sm font-bold px-5 py-2.5"
          : "inline-flex items-center gap-2 rounded-full bg-[#EAF0FB] border border-[#D6E2F7] text-[#2B56A8] text-sm font-bold px-5 py-2.5"
      }
    >
      <MaterialIcon
        name="notifications_active"
        size={20}
        filled
        className={isBanner ? "text-white" : undefined}
      />
      <span>已開啟流量提醒</span>
    </div>
  );

  const isBoundPhase = vBindPhase === "bound";
  const showPassLayer =
    !hidePassCard &&
    !vIsGuest &&
    (vBindPhase === "bound" || vBindPhase === "unbound") &&
    !vAutoBinding &&
    alertLayer === "pass";
  const showBindLayer =
    !vIsGuest &&
    (vBindPhase === "bound" || vBindPhase === "unbound") &&
    !vAutoBinding &&
    (alertLayer === "bind" || (hidePassCard && alertLayer === "pass" && vBindPhase === "unbound")) &&
    vIsMember &&
    vMemberEsimsForBind.length > 0 &&
    !vShowManualIccid;
  const showManualLayer =
    !vIsGuest &&
    vBindPhase === "unbound" &&
    !vAutoBinding &&
    (alertLayer === "manual" ||
      (vShowManualIccid && alertLayer !== "bind") ||
      (vMemberEsimsForBind.length === 0 && alertLayer === "bind"));

  const boundPassCard = (
    <TrafficAlertPassCard
      isBound={isBoundPhase}
      productName={vBoundInfo?.productName}
      iccid={vBoundInfo?.iccid}
      topupId={vBoundInfo?.topupId}
      bindMethod={vBoundInfo?.bindMethod}
      boundAt={vBoundInfo?.boundAt}
      remainingMb={passUsage?.remainingMb ?? null}
      totalMb={passUsage?.totalMb ?? null}
      expiresAt={passUsage?.expiresAt ?? null}
      usageLoading={passUsageLoading}
      onOpenBind={() => {
        if (vMemberEsims.length > 0) {
          setShowManualIccid(false);
          setAlertLayer("bind");
        } else {
          setShowManualIccid(true);
          setAlertLayer("manual");
        }
      }}
    />
  );

  const bindSuccessModal = hidePassCard ? null : (
    <BindSuccessSheet
      open={showBindSuccess}
      title="綁定成功"
      message={
        vBoundLabel()
          ? `已開啟「${vBoundLabel()}」的流量提醒。一次僅監控一張；剩餘偏低時會自動通知您。`
          : "流量提醒已開啟。剩餘流量偏低時，系統會自動通知您。"
      }
      doneLabel="完成"
      onClose={() => setShowBindSuccess(false)}
      onDone={() => setShowBindSuccess(false)}
    />
  );

  const bindPanel = showBindLayer ? (
    <PushMemberEsimBind
      esims={vMemberEsimsForBind}
      boundTopupId={vBoundInfo?.topupId || null}
      initialSelectedTopupId={focusBindEsim?.topupId || null}
      onBound={handleBound}
      onUnbind={isBoundPhase ? handleUnbind : undefined}
      unbinding={unbinding}
      onBack={() => setAlertLayer("pass")}
      onManualIccid={() => {
        setShowManualIccid(true);
        setAlertLayer("manual");
      }}
      initialError={demoBindError}
      demoMode={isDemo}
      demoForceFail={demoScenario === "member_bind_fail"}
    />
  ) : null;

  const manualBindPanel = showManualLayer ? (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setShowManualIccid(false);
          setAlertLayer(vMemberEsims.length > 0 ? "bind" : "pass");
        }}
        className="inline-flex items-center gap-1 text-sm font-bold text-stone-700"
      >
        <MaterialIcon name="arrow_back" size={18} />
        回到上一層
      </button>
      <PushIccidBind
        initialIccid={initialIccid}
        onBound={handleBound}
        isMember={vIsMember}
        isGuest={false}
        hasMemberOrders={vMemberEsims.length > 0}
        onBackToOrders={
          vMemberEsims.length > 0
            ? () => {
                setShowManualIccid(false);
                setAlertLayer("bind");
              }
            : undefined
        }
      />
    </div>
  ) : null;

  const guestPanel =
    vIsGuest &&
    vAuthReady &&
    vBindPhase !== "bound" &&
    !vAutoBinding &&
    vMode !== "guide" ? (
      <GuestLoginGate embedded={isBanner} />
    ) : null;

  const memberIccidPanel =
    vShowMemberIccidFlow &&
    vIsLoggedIn &&
    !vIsGuest &&
    vBindPhase !== "bound" &&
    !vAutoBinding &&
    vMemberEsims.length === 0 &&
    vMode !== "guide" ? (
      <GuestPushBindForm
        initialIccid={initialIccid}
        onBound={handleBound}
        embedded={isBanner}
        variant="member"
      />
    ) : null;

  const memberPushButton = (
    <PushButton
      className={isBanner ? "" : "self-start"}
      theme={isBanner ? "banner" : "default"}
      showDebugPanel={false}
      requireLogin={false}
      onBeforeSubscribe={handleBeforeSubscribe}
      onSubscribed={handleSubscribed}
    />
  );

  const showBannerLoading = !vIsGuest && !vAuthReady;

  const showMemberBindHint =
    vIsLoggedIn &&
    !vIsGuest &&
    vBindPhase === "unbound" &&
    !vAutoBinding &&
    vMemberEsims.length === 0;

  const ctaBlock = showBannerLoading ? (
    <LoadingIndicator
      layout="inline"
      label="載入中…"
      size="sm"
      className={`px-6 py-3 rounded-full text-sm font-bold ${
        isBanner ? "bg-white/25" : "bg-stone-200"
      }`}
    />
  ) : vMode === "guide" ? (
    <IosPwaPushGuide className={isBanner ? "max-w-sm" : className} />
  ) : vBindPhase === "bound" ? (
    boundStatusChip
  ) : vIsGuest || vShowMemberIccidFlow ? null : (
    memberPushButton
  );

  const noOrderModal = noOrderPrompt ? (
    <div
      className="fixed inset-0 z-[11050] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-no-order-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-16">
        <div className="flex items-start gap-3 mb-4">
          <div>
            <h4
              id="member-no-order-title"
              className="font-bold text-stone-900 text-base"
            >
              尚未在本站購買 eSIM 方案
            </h4>
            <p className="text-sm text-stone-600 mt-2 leading-relaxed">
              系統找不到您在本站的 eSIM 訂單，無法自動綁定。您仍可
              <strong className="text-stone-800">
                {" "}
                開啟推播並手動輸入 ICCID{" "}
              </strong>
              來監控 eSIM 流量（例如在其他通路購買的方案）。
            </p>
          </div>
        </div>
        <ul className="text-xs text-stone-500 space-y-1.5 mb-5 pl-1">
          <li className="flex gap-2">
            <MaterialIcon
              name="check_circle"
              size={14}
              className="text-[#1d5cc5] shrink-0 mt-0.5"
            />
            在本站購買後：下次可一鍵綁定，無需 ICCID
          </li>
          <li className="flex gap-2">
            <MaterialIcon
              name="sim_card"
              size={14}
              className="text-[#1d5cc5] shrink-0 mt-0.5"
            />
            現在要開啟：請準備好 eSIM 的 ICCID（19～20 碼）
          </li>
        </ul>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => closeNoOrderPrompt(true)}
            className="flex-1 bg-[#1d5cc5] hover:bg-[#174da8] text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            確定，前往輸入 ICCID
          </button>
          <button
            type="button"
            onClick={() => closeNoOrderPrompt(false)}
            className="flex-1 border border-stone-200 text-stone-600 font-bold py-3 rounded-xl text-sm hover:bg-stone-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (isBanner) {
    const guestIntegrated =
      vAuthReady && vIsGuest && vBindPhase !== "bound" && vMode !== "guide";
    const memberIccidIntegrated =
      vAuthReady &&
      vShowMemberIccidFlow &&
      vIsLoggedIn &&
      !vIsGuest &&
      vBindPhase !== "bound" &&
      vMode !== "guide";
    const formIntegrated = guestIntegrated || memberIccidIntegrated;
    const bannerHydrating = !vAuthReady;

    return (
      <>
        <div
          className={`w-full ${formIntegrated || bannerHydrating ? "" : "space-y-4"} ${className}`}
        >
          {preferOpenBindLayer &&
          vBindPhase === "needs_subscribe" &&
          vAuthReady &&
          !bannerHydrating ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-bold">一鍵開啟流量提醒</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                請點右側藍白按鈕「<strong>開啟流量提醒</strong>」→
                瀏覽器跳出時選「允許」→ 登入會員並選一張 eSIM 綁定。完成後應會收到「Jeko
                eSIM 已就緒」測試通知。
              </p>
            </div>
          ) : null}
          <div className="rounded-3xl overflow-hidden shadow-sm">
            <div className="flex flex-col md:flex-row min-h-[160px]">
              <div className="relative w-full md:w-[32%] min-h-[140px] md:min-h-[250px] shrink-0">
                <Image
                  src="/images/431f03ba-c1c7-4f425f9-a7f7d4a3b19d.png"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 32vw"
                />
              </div>
              <div
                className={`relative flex-1 flex flex-col sm:flex-row sm:items-center gap-5 p-6 md:p-8 md:pr-10 ${
                  formIntegrated || bannerHydrating ? "md:pb-6" : ""
                }`}
                style={{ backgroundColor: REF_BLUE }}
              >
                <span
                  className="absolute bottom-4 left-5 w-2 h-2 rounded-full bg-[#174da8] pointer-events-none"
                  aria-hidden
                />
                <div className="flex-1 min-w-0 text-white">
                  <h3 className="text-2xl md:text-[28px] font-bold leading-snug">
                    流量快用完時通知我
                  </h3>
                  <p className="text-sm md:text-[15px] text-white/85 mt-2 leading-relaxed max-w-lg">
                    {bannerHydrating
                      ? "載入中…"
                      : getBannerDescription({
                          isGuest: vIsGuest,
                          isLoggedIn: vIsLoggedIn,
                          memberEsims: vMemberEsims,
                          bindPhase: vBindPhase,
                        })}
                  </p>
                  {vBindPhase === "bound" && vBoundLabel() && (
                    <p className="text-xs text-white/70 mt-2">
                      監控中：{vBoundLabel()}
                    </p>
                  )}
                </div>
                {!formIntegrated && !bannerHydrating && (
                  <div className="shrink-0 sm:self-center flex items-center gap-3">
                    {ctaBlock}
                    {vBindPhase !== "bound" &&
                      vMode !== "guide" &&
                      vAuthReady &&
                      !vStatusChecking && (
                        <MaterialIcon
                          name="arrow_forward"
                          size={28}
                          className="text-white/90 hidden sm:block"
                        />
                      )}
                  </div>
                )}
              </div>
            </div>

            {bannerHydrating && (
              <div className="bg-white px-5 sm:px-8 py-8 animate-pulse">
                <div className="h-4 bg-stone-100 rounded w-48 mb-4" />
                <div className="h-12 bg-stone-100 rounded-xl mb-3" />
                <div className="h-12 bg-stone-100 rounded-full" />
              </div>
            )}

            {guestIntegrated && guestPanel}
            {memberIccidIntegrated && memberIccidPanel}

            {(showPassLayer || showBindLayer || showManualLayer) && (
              <div className="bg-[#f4f5f7] px-4 sm:px-6 py-5 border-t border-stone-100 space-y-4">
                {showPassLayer ? boundPassCard : null}
                {bindPanel}
                {manualBindPanel}
              </div>
            )}
          </div>

          {vAutoBinding && (
            <p className="text-xs text-stone-500 flex items-center gap-2 px-1 mt-4">
              <QuarterRing size="sm" />
              正在從您的訂單自動綁定 eSIM…
            </p>
          )}

          {!formIntegrated &&
            showMemberBindHint &&
            vBindPhase === "needs_subscribe" && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-stone-500 px-1 leading-relaxed">
                  先點「開啟流量提醒」允許通知；完成後會出現通行證，點進去即可選擇一張
                  eSIM 綁定（一次僅一張）。
                </p>
                {!hideLineAlert ? (
                  <PushLineAlertSection boundTopupId={vBoundInfo?.topupId} />
                ) : null}
              </div>
            )}
        </div>
        {noOrderModal}
        {bindSuccessModal}
      </>
    );
  }

  if (!vAuthReady) {
    return (
      <>
        <LoadingIndicator
          layout="inline"
          label="載入中…"
          size="sm"
          className={`px-6 py-3 rounded-full bg-stone-200 text-sm font-bold ${className}`}
        />
        {noOrderModal}
        {bindSuccessModal}
      </>
    );
  }

  if (vMode === "guide") {
    return (
      <>
        <IosPwaPushGuide className={className} />
        {noOrderModal}
        {bindSuccessModal}
      </>
    );
  }

  return (
    <>
      <div className={`flex flex-col gap-4 w-full ${className}`}>
        {vIsGuest ? (
          guestPanel
        ) : (
          <>
            {vBindPhase === "needs_subscribe" ? memberPushButton : null}
            {vShowMemberIccidFlow && vBindPhase === "needs_subscribe"
              ? memberIccidPanel
              : null}
            {showPassLayer ? boundPassCard : null}
            {bindPanel}
            {manualBindPanel}
            {vAutoBinding && (
              <p className="text-xs text-stone-500 flex items-center gap-2">
                <QuarterRing size="sm" />
                正在從您的訂單自動綁定 eSIM…
              </p>
            )}
            {vBindPhase === "needs_subscribe" && !hideLineAlert && (
              <PushLineAlertSection boundTopupId={vBoundInfo?.topupId} />
            )}
          </>
        )}
      </div>
      {noOrderModal}
      {bindSuccessModal}
    </>
  );
}
