"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "../Layout";
import { initLiff, ensureLiffIdToken } from "@/lib/liffClient";
import { isValidIccid, normalizeIccid } from "@/lib/pushBind";
import { useAuth } from "@/hooks/useAuth";
import { useLineBind } from "@/hooks/useLineBind";
import { buildLoginUrl } from "@/lib/authRedirect";
import { fireRibbonBurst } from "@/lib/fireCelebrationConfetti";
import LineIccidScreen from "@/components/line/LineIccidScreen";
import { signOut } from "next-auth/react";
import { supabase } from "@/lib/supabaseClient";

function isLocalDevHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function maskIccid(iccid) {
  const s = String(iccid || "").replace(/\s+/g, "");
  if (s.length < 8) return s || null;
  return `…${s.slice(-6)}`;
}

function mapMemberEsims(list) {
  return (Array.isArray(list) ? list : []).map((e) => ({
    topupId: e.topupId || e.topup_id || null,
    productName: e.productName || e.product_name || "eSIM 方案",
    iccidMasked: e.iccidMasked || maskIccid(e.iccid),
    orderDate: e.orderDate || e.order_date || null,
  }));
}

/**
 * 「開啟流量提醒」頁
 * - 網頁版（預設）：localhost / 一般瀏覽器可改版面與功能，不必進 LIFF
 * - LIFF 版：在 LINE App 內開啟時自動啟用 LINE 身分與提醒 API
 *
 * 之後要替換 LIFF 專用 UI，改 LineIccidScreen 或加 pageMode==='liff' 分支即可。
 */
export default function LineIccidPage() {
  const router = useRouter();
  const { isLoggedIn, authReady, token, user, session } = useAuth();

  const memberName = useMemo(() => {
    const fromUser =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.display_name ||
      user?.email?.split("@")[0];
    const fromSession =
      session?.user?.name || session?.user?.email?.split("@")[0];
    return String(fromUser || fromSession || "").trim();
  }, [user, session]);
  const [pageMode, setPageMode] = useState("web"); // web | liff
  const [iccid, setIccid] = useState("");
  const [idToken, setIdToken] = useState("");
  const [ready, setReady] = useState(false);
  const [modeHint, setModeHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [orderAlert, setOrderAlert] = useState(null);
  const [orderError, setOrderError] = useState("");
  const [memberBindOk, setMemberBindOk] = useState(false);
  const [memberEsims, setMemberEsims] = useState([]);
  const [selectedTopupId, setSelectedTopupId] = useState("");
  const [activeTopupId, setActiveTopupId] = useState("");
  const [usageById, setUsageById] = useState({});
  const [usageLoading, setUsageLoading] = useState(false);
  const usageFetched = useRef(new Set());

  const {
    status: lineBindStatus,
    message: lineBindMessage,
    bind: runMemberBind,
  } = useLineBind({
    onSuccess: () => {
      setMemberBindOk(true);
    },
  });

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.bind === "ok" || router.query.line_bind === "ok") {
      setMemberBindOk(true);
    }
  }, [router.isReady, router.query.bind, router.query.line_bind]);

  useEffect(() => {
    if (!authReady || isLoggedIn) return;
    setMemberBindOk(false);
    setMemberEsims([]);
    setSelectedTopupId("");
    setActiveTopupId("");
    setUsageById({});
  }, [authReady, isLoggedIn]);

  const loadWebMemberEsims = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/push/member-esims", {
        credentials: "include",
        headers,
      });
      const data = await res.json();
      if (!res.ok) return;
      const list = mapMemberEsims(data.esims);
      setMemberEsims(list);
      if (list.length === 1) {
        setSelectedTopupId(String(list[0].topupId || ""));
      }
    } catch {
      /* ignore */
    }
  }, [isLoggedIn, token]);

  // 偵測環境：優先網頁版；僅在 LINE 內且 LIFF 成功時切 liff
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 本機一律網頁版，方便改版面
      if (isLocalDevHost()) {
        if (cancelled) return;
        setPageMode("web");
        setModeHint("網頁開發版（localhost）— 改完版面再接到 LIFF");
        setReady(true);
        return;
      }

      const init = await initLiff();
      if (cancelled) return;

      const inClient = !!(init.ok && init.liff?.isInClient?.());
      if (!inClient) {
        setPageMode("web");
        setModeHint("網頁版 — 可先調整功能與版面；LINE 提醒請從官方帳號開啟");
        setReady(true);
        return;
      }

      setPageMode("liff");
      const { liff } = init;
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }

      const tokenLiff = liff.getIDToken?.() || "";
      setIdToken(tokenLiff);
      if (!tokenLiff) {
        setModeHint("無法取得 LINE 身分，請關閉後再從官方帳號按鈕開啟。");
      }
      setReady(true);

      if (tokenLiff) {
        try {
          const res = await fetch("/api/line/enable-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: tokenLiff, listOnly: true }),
          });
          const data = await res.json();
          if (cancelled) return;
          if (data.ok) {
            const list = Array.isArray(data.esims) ? data.esims : [];
            setMemberEsims(list);
            setActiveTopupId(data.activeTopupId || "");
            const pick =
              data.activeTopupId ||
              (list.length === 1 ? list[0].topupId : "");
            setSelectedTopupId(pick ? String(pick) : "");
          }
        } catch {
          /* 沒有本站訂單時改走 ICCID／綁定會員 */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pageMode !== "web" || !authReady) return;
    loadWebMemberEsims();
  }, [pageMode, authReady, loadWebMemberEsims, memberBindOk]);

  useEffect(() => {
    if (pageMode !== "liff" || !memberBindOk || !idToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/line/enable-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, listOnly: true }),
        });
        const data = await res.json();
        if (cancelled || !data.ok) return;
        const list = Array.isArray(data.esims) ? data.esims : [];
        setMemberEsims(list);
        setActiveTopupId(data.activeTopupId || "");
        const pick =
          data.activeTopupId || (list.length === 1 ? list[0].topupId : "");
        setSelectedTopupId(pick ? String(pick) : "");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageMode, memberBindOk, idToken]);

  const fetchUsage = useCallback(async (esim, { force = false } = {}) => {
    const key = String(esim?.topupId || "");
    if (!key) return;
    if (!force && usageFetched.current.has(key)) return;
    usageFetched.current.add(key);
    setUsageLoading(true);
    try {
      const res = await fetch("/api/esim/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topupId: key }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsageById((prev) => ({ ...prev, [key]: data }));
      } else {
        usageFetched.current.delete(key);
      }
    } catch {
      usageFetched.current.delete(key);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!memberEsims.length) return;
    memberEsims.slice(0, 8).forEach((esim, i) => {
      window.setTimeout(() => fetchUsage(esim), 350 * i);
    });
  }, [memberEsims, fetchUsage]);

  const handleRefreshUsage = (topupId) => {
    const key = String(topupId || selectedTopupId || "");
    const selected = memberEsims.find((e) => String(e.topupId) === key);
    if (!selected) return;
    usageFetched.current.delete(key);
    fetchUsage(selected, { force: true });
  };

  const handleMemberBindClick = () => {
    if (!authReady) return;
    if (!isLoggedIn) {
      router.push(buildLoginUrl("/line/iccid?line_bind=start"));
      return;
    }
    runMemberBind();
  };

  const handleLoginClick = () => {
    router.push(buildLoginUrl("/line/iccid/"));
  };

  const handleLogoutClick = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    try {
      await signOut({ redirect: false });
    } catch {
      /* ignore */
    }
    setMemberBindOk(false);
    setMemberEsims([]);
    setOrderAlert(null);
    setSelectedTopupId("");
    setActiveTopupId("");
    setUsageById({});
    router.replace("/line/iccid/");
  };

  const handleOneClickOrder = async () => {
    setBindLoading(true);
    setOrderError("");
    try {
      if (pageMode === "web") {
        // 網頁版：流程與 LIFF 相同驗證；正式推播仍建議從 LIFF／查詢用量
        if (!isLoggedIn) {
          setOrderError("請先登入官網會員，或改用下方 ICCID 查詢。");
          return;
        }
        if (!memberBindOk) {
          setOrderError("請先完成綁定（連結 LINE 與官網會員）。");
          return;
        }
        if (memberEsims.length === 0) {
          setOrderError("尚無本站訂單，請改用下方 ICCID 查詢。");
          return;
        }
        if (memberEsims.length > 1 && !selectedTopupId) {
          setOrderError("請先選擇要監控的 eSIM（一次一張）。");
          return;
        }
        const selected = memberEsims.find(
          (e) => String(e.topupId) === String(selectedTopupId),
        ) || memberEsims[0];
        setOrderAlert({
          ok: true,
          productName: selected?.productName || "已選 eSIM",
          webPreview: true,
        });
        setActiveTopupId(String(selected?.topupId || selectedTopupId || ""));
        fireRibbonBurst();
        setModeHint(
          `已為此張開啟提醒：${selected?.productName || "eSIM"}。同時只監控一張；改選其他卡再開啟即可切換。`,
        );
        return;
      }

      const readyLiff = await ensureLiffIdToken();
      if (readyLiff.pending) return;
      const tokenLiff = readyLiff.ok ? readyLiff.token : idToken;
      if (!tokenLiff) {
        setOrderError("請關閉後再從圖文選單「開啟流量提醒」進入");
        return;
      }
      setIdToken(tokenLiff);
      const res = await fetch("/api/line/enable-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: tokenLiff,
          topupId: selectedTopupId || undefined,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.esims)) {
        setMemberEsims(data.esims);
      }
      if (!data.ok) {
        throw new Error(
          data.code === "no_order"
            ? "這個 LINE 尚無對應的本站訂單。請先「一鍵綁定官網會員」，或在下方輸入 ICCID。"
            : data.code === "need_select"
              ? "請先在上方選擇要監控的 eSIM。"
              : data.error || "開啟提醒失敗",
        );
      }
      setOrderAlert(data);
      setActiveTopupId(data.topupId || selectedTopupId);
      fireRibbonBurst();
    } catch (err) {
      setOrderError(err.message || "一鍵開啟失敗");
    } finally {
      setBindLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const normalized = normalizeIccid(iccid);
    if (!isValidIccid(normalized)) {
      setError("請輸入 18～22 碼數字的 ICCID");
      return;
    }

    setLoading(true);
    try {
      if (pageMode === "web") {
        // 網頁版：只查用量（不必 LIFF）；提醒綁定留到 LIFF／推播
        const res = await fetch("/api/esim/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ iccid: normalized }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.detail || "查詢失敗");

        const usageText = [
          data.productName ? `方案：${data.productName}` : null,
          data.remainingMb != null
            ? `剩餘：約 ${data.remainingMb} MB${data.totalMb != null ? ` / ${data.totalMb} MB` : ""}`
            : data.note || "已查詢",
          data.expiresAt ? `有效期限：${data.expiresAt}` : null,
          "",
          "（網頁版）用量已查詢。完整 LINE 偏低提醒請從官方帳號開啟本頁。",
        ]
          .filter(Boolean)
          .join("\n");

        setResult({
          ok: true,
          alertEnabled: false,
          usage: data,
          usageText,
        });
        if (data) {
          const key = String(data.topupId || "iccid");
          setUsageById((prev) => ({ ...prev, [key]: data }));
        }
        return;
      }

      if (!idToken) {
        setError("請從官方 LINE 的「開啟流量提醒」按鈕開啟此頁。");
        return;
      }

      const res = await fetch("/api/line/iccid-bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iccid: normalized, idToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "查詢失敗");
      }
      setResult(data);
      if (data.usage) {
        const key = String(data.usage.topupId || selectedTopupId || "iccid");
        setUsageById((prev) => ({ ...prev, [key]: data.usage }));
      }
      if (data.alertEnabled) fireRibbonBurst();
    } catch (err) {
      setError(err.message || "查詢失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const screen = (
    <LineIccidScreen
      pageMode={pageMode}
      modeHint={modeHint}
      iccid={iccid}
      onIccidChange={setIccid}
      liffReady={ready}
      liffError=""
      loading={loading}
      bindLoading={bindLoading}
      error={error}
      result={result}
      orderAlert={orderAlert}
      orderError={orderError}
      memberBindOk={memberBindOk}
      lineBindMessage={lineBindMessage}
      lineBindStatus={lineBindStatus}
      authReady={authReady}
      isLoggedIn={isLoggedIn}
      memberName={memberName}
      memberEsims={memberEsims}
      selectedTopupId={selectedTopupId}
      onSelectTopup={setSelectedTopupId}
      activeTopupId={activeTopupId}
      usageById={usageById}
      usageLoading={usageLoading}
      onRefreshUsage={handleRefreshUsage}
      onMemberBindClick={handleMemberBindClick}
      onOneClickOrder={handleOneClickOrder}
      onSubmit={handleSubmit}
      onLoginClick={handleLoginClick}
      onLogoutClick={handleLogoutClick}
    />
  );

  return (
    <>
      <Head>
        <title>
          {pageMode === "web"
            ? "開啟流量提醒（網頁版）｜Jeko eSIM"
            : "開啟流量提醒｜Jeko eSIM"}
        </title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      {pageMode === "web" ? (
        <Layout>
          <div className="min-h-screen bg-[#F5F7FA] py-6 sm:py-10">
            <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[28px] shadow-xl sm:px-0">
              {screen}
            </div>
            <p className="mx-auto mt-4 max-w-[480px] px-4 text-center text-[12px] text-slate-500">
              目前為<strong>網頁開發版</strong>
              。版面與流程確認後，再切回 LIFF 專用（LINE 內開啟）。
            </p>
          </div>
        </Layout>
      ) : (
        screen
      )}
    </>
  );
}
