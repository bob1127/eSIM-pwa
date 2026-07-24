"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import PushButton from "./PushButton";
import PushIccidBind from "./PushIccidBind";
import PushMemberEsimBind from "./PushMemberEsimBind";
import PushLineAlertSection from "./PushLineAlertSection";
import GuestPushBindForm from "./GuestPushBindForm";
import IosPwaPushGuide from "./IosPwaPushGuide";
import MaterialIcon from "./MaterialIcon";
import { detectPushSupport } from "../lib/pushSupport";
import { getPushEndpoint, ICCID_STORAGE_KEY } from "../lib/pushBind";
import { useAuth } from "../hooks/useAuth";

const REF_BLUE = "#3768C7";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getBannerDescription({ isGuest, isLoggedIn, memberEsims, bindPhase }) {
  if (bindPhase === "bound") {
    return "流量提醒已啟用，剩餘流量偏低時將自動通知您。";
  }
  if (isGuest) {
    return "您尚未加入會員，請在下方輸入 ICCID，一鍵開啟推播並完成綁定。";
  }
  if (isLoggedIn && memberEsims.length > 0) {
    return "會員專屬：點「開啟流量提醒」→ 自動綁定最新 eSIM 訂單，無需手動輸入 ICCID。";
  }
  if (isLoggedIn) {
    return "已登入會員。若在本站購買過 eSIM 可一鍵綁定；若尚無訂單或非本站購買，開啟推播後再輸入 ICCID。";
  }
  return "開啟推播並綁定 eSIM，流量偏低時自動通知。";
}

/**
 * 推播：訂閱 → 依身分綁定 eSIM
 * - 會員：自動 / 選訂單（不需 ICCID）
 * - 訪客：Email 驗證 或 手動 ICCID
 */
export default function PushNotificationSection({
  className = "",
  onIccidBound,
  initialIccid = "",
  variant = "default",
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

  const applyBound = useCallback(
    (data) => {
      setBindPhase("bound");
      setBoundInfo(data);
      if (data.iccid) {
        localStorage.setItem(ICCID_STORAGE_KEY, data.iccid);
        onIccidBound?.(data.iccid);
      }
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

  const tryAutoBindMember = useCallback(async () => {
    const endpoint = await getPushEndpoint();
    if (!endpoint) return false;

    setAutoBinding(true);
    try {
      const res = await fetch("/api/push/auto-bind-member", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ endpoint }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        applyBound(data);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setAutoBinding(false);
    }
  }, [token, applyBound]);

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
    if (!authReady) return;
    if (isLoggedIn) {
      loadMemberEsims();
    }
  }, [authReady, isLoggedIn, loadMemberEsims]);

  useEffect(() => {
    if (!authReady) return;
    refresh();
    window.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh, authReady, isLoggedIn]);

  const handleSubscribed = async () => {
    setBindPhase("unbound");
    const esims = await loadMemberEsims();
    if (esims.length > 0) {
      const ok = await tryAutoBindMember();
      if (!ok) {
        setShowManualIccid(false);
      }
    } else {
      setShowManualIccid(true);
    }
  };

  const handleBound = (data) => {
    applyBound(data);
    setShowManualIccid(false);
    setShowMemberIccidFlow(false);
  };

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

  const isBanner = variant === "banner";

  const boundStatus = (
    <div
      className={
        isBanner
          ? "inline-flex items-center gap-2 rounded-full bg-white/20 border border-white/40 text-white text-sm font-bold px-5 py-2.5"
          : undefined
      }
    >
      <MaterialIcon
        name="notifications_active"
        size={20}
        filled
        className="text-white"
      />
      <span>已開啟流量提醒</span>
    </div>
  );

  const bindPanel =
    !isGuest && bindPhase === "unbound" && !autoBinding ? (
      isMember && memberEsims.length > 0 && !showManualIccid ? (
        <PushMemberEsimBind
          esims={memberEsims}
          onBound={handleBound}
          onManualIccid={() => setShowManualIccid(true)}
        />
      ) : (
        <PushIccidBind
          initialIccid={initialIccid}
          onBound={handleBound}
          isMember={isMember}
          isGuest={false}
          hasMemberOrders={memberEsims.length > 0}
          onBackToOrders={
            memberEsims.length > 0 ? () => setShowManualIccid(false) : undefined
          }
        />
      )
    ) : null;

  const guestPanel =
    isGuest &&
    authReady &&
    bindPhase !== "bound" &&
    !autoBinding &&
    mode !== "guide" ? (
      <GuestPushBindForm
        initialIccid={initialIccid}
        onBound={handleBound}
        embedded={isBanner}
        variant="guest"
      />
    ) : null;

  const memberIccidPanel =
    showMemberIccidFlow &&
    isLoggedIn &&
    !isGuest &&
    bindPhase !== "bound" &&
    !autoBinding &&
    memberEsims.length === 0 &&
    mode !== "guide" ? (
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

  const showBannerLoading = !isGuest && !authReady;

  const showMemberBindHint =
    isLoggedIn &&
    !isGuest &&
    bindPhase === "unbound" &&
    !autoBinding &&
    memberEsims.length === 0;

  const ctaBlock = showBannerLoading ? (
    <div
      className={`px-6 py-3 rounded-full text-sm font-bold animate-pulse ${
        isBanner ? "bg-white/25 text-white/80" : "bg-stone-200 text-stone-500"
      }`}
    >
      載入中…
    </div>
  ) : mode === "guide" ? (
    <IosPwaPushGuide className={isBanner ? "max-w-sm" : className} />
  ) : bindPhase === "bound" ? (
    boundStatus
  ) : isGuest || showMemberIccidFlow ? null : (
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
      authReady && isGuest && bindPhase !== "bound" && mode !== "guide";
    const memberIccidIntegrated =
      authReady &&
      showMemberIccidFlow &&
      isLoggedIn &&
      !isGuest &&
      bindPhase !== "bound" &&
      mode !== "guide";
    const formIntegrated = guestIntegrated || memberIccidIntegrated;
    const bannerHydrating = !authReady;

    return (
      <>
        <div
          className={`w-full ${formIntegrated || bannerHydrating ? "" : "space-y-4"} ${className}`}
        >
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
                          isGuest,
                          isLoggedIn,
                          memberEsims,
                          bindPhase,
                        })}
                  </p>
                  {bindPhase === "bound" && boundLabel() && (
                    <p className="text-xs text-white/70 mt-2">
                      監控中：{boundLabel()}
                    </p>
                  )}
                </div>
                {!formIntegrated && !bannerHydrating && (
                  <div className="shrink-0 sm:self-center flex items-center gap-3">
                    {ctaBlock}
                    {bindPhase !== "bound" &&
                      mode !== "guide" &&
                      authReady &&
                      !statusChecking && (
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

            {bindPhase === "bound" && (
              <div
                className="border-t px-6 py-4 flex items-center gap-2 text-sm font-bold"
                style={{
                  backgroundColor: "#EAF0FB",
                  borderColor: "#D6E2F7",
                  color: "#2B56A8",
                }}
              >
                <MaterialIcon name="notifications_active" size={20} filled />
                流量提醒已啟用
                {boundLabel() && (
                  <span className="text-xs font-normal ml-1 opacity-80">
                    · 監控中：{boundLabel()}
                  </span>
                )}
              </div>
            )}

            {bindPhase === "bound" && (
              <div className="bg-white px-5 sm:px-8 py-5 border-t border-stone-100">
                <PushLineAlertSection boundTopupId={boundInfo?.topupId} />
              </div>
            )}
          </div>

          {autoBinding && (
            <p className="text-xs text-stone-500 flex items-center gap-2 px-1 mt-4">
              <MaterialIcon name="sync" size={16} className="animate-spin" />
              正在從您的訂單自動綁定 eSIM…
            </p>
          )}

          {!formIntegrated && (bindPanel || showMemberBindHint) && (
            <div className="mt-4 space-y-4">
              {bindPanel}
              {showMemberBindHint && !bindPanel && (
                <p className="text-xs text-stone-500 px-1 leading-relaxed">
                  先點「開啟流量提醒」允許通知；若系統找不到本站訂單，完成後可在下方輸入
                  ICCID 綁定。
                </p>
              )}
              <PushLineAlertSection boundTopupId={boundInfo?.topupId} />
            </div>
          )}
        </div>
        {noOrderModal}
      </>
    );
  }

  if (!authReady) {
    return (
      <>
        <div
          className={`px-6 py-3 rounded-full bg-stone-200 text-stone-500 text-sm font-bold animate-pulse ${className}`}
        >
          載入中…
        </div>
        {noOrderModal}
      </>
    );
  }

  if (mode === "guide") {
    return (
      <>
        <IosPwaPushGuide className={className} />
        {noOrderModal}
      </>
    );
  }

  return (
    <>
      <div className={`flex flex-col gap-4 w-full ${className}`}>
        {bindPhase === "bound" ? (
          <div
            className="rounded-xl border px-5 py-4"
            style={{
              backgroundColor: "#EAF0FB",
              borderColor: "#D6E2F7",
            }}
          >
            <div
              className="flex items-center gap-2 text-sm font-bold"
              style={{ color: "#2B56A8" }}
            >
              <MaterialIcon name="notifications_active" size={20} filled />
              流量提醒已啟用
            </div>
            {boundLabel() && (
              <p className="text-xs mt-1.5" style={{ color: "#3768C7" }}>
                監控中：{boundLabel()}
                {boundInfo?.bindMethod === "member_auto" && "（會員自動綁定）"}
                {boundInfo?.bindMethod === "guest_email" && "（Email 驗證）"}
                {boundInfo?.bindMethod === "guest_iccid" && "（ICCID）"}
              </p>
            )}
          </div>
        ) : isGuest ? (
          guestPanel
        ) : showMemberIccidFlow ? (
          memberIccidPanel
        ) : (
          <>
            {memberPushButton}

            {autoBinding && (
              <p className="text-xs text-stone-500 flex items-center gap-2">
                <MaterialIcon name="sync" size={16} className="animate-spin" />
                正在從您的訂單自動綁定 eSIM…
              </p>
            )}

            {bindPanel}
            {(bindPhase === "bound" || bindPhase === "unbound") && (
              <PushLineAlertSection boundTopupId={boundInfo?.topupId} />
            )}
          </>
        )}
      </div>
      {noOrderModal}
    </>
  );
}
