"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { initLiff, ensureLiffIdToken } from "@/lib/liffClient";
import { isValidIccid, normalizeIccid } from "@/lib/pushBind";
import { useAuth } from "@/hooks/useAuth";
import { useLineBind } from "@/hooks/useLineBind";
import { buildLoginUrl } from "@/lib/authRedirect";
import { fireRibbonBurst } from "@/lib/fireCelebrationConfetti";
import LineIccidScreen from "@/components/line/LineIccidScreen";

/**
 * 圖文選單「開啟流量提醒」：一鍵綁定會員 + ICCID 查流量並開提醒
 */
export default function LineIccidPage() {
  const router = useRouter();
  const { isLoggedIn, authReady } = useAuth();
  const [iccid, setIccid] = useState("");
  const [idToken, setIdToken] = useState("");
  const [liffReady, setLiffReady] = useState(false);
  const [liffError, setLiffError] = useState("");
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
      fireRibbonBurst();
    },
  });

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.bind === "ok" || router.query.line_bind === "ok") {
      setMemberBindOk(true);
      fireRibbonBurst();
    }
  }, [router.isReady, router.query.bind, router.query.line_bind]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const init = await initLiff();
      if (cancelled) return;

      if (!init.ok || !init.liff) {
        setLiffError("請從官方 LINE「開啟流量提醒」按鈕開啟此頁。");
        setLiffReady(true);
        return;
      }

      const { liff } = init;
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }

      const token = liff.getIDToken?.() || "";
      setIdToken(token);
      if (!token) {
        setLiffError("無法取得 LINE 身分，請關閉後再從官方帳號按鈕開啟。");
      }
      setLiffReady(true);

      if (token) {
        try {
          const res = await fetch("/api/line/enable-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: token, listOnly: true }),
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
    if (!memberBindOk || !idToken) return;
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
  }, [memberBindOk, idToken]);

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

  const handleOneClickOrder = async () => {
    setBindLoading(true);
    setOrderError("");
    try {
      const ready = await ensureLiffIdToken();
      if (ready.pending) return;
      const token = ready.ok ? ready.token : idToken;
      if (!token) {
        setOrderError("請關閉後再從圖文選單「開啟流量提醒」進入");
        return;
      }
      setIdToken(token);
      const res = await fetch("/api/line/enable-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: token,
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
    if (!idToken) {
      setError("請從官方 LINE 的「開啟流量提醒」按鈕開啟此頁。");
      return;
    }

    setLoading(true);
    try {
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

  return (
    <>
      <Head>
        <title>開啟流量提醒｜Jeko eSIM</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <LineIccidScreen
        iccid={iccid}
        onIccidChange={setIccid}
        liffReady={liffReady}
        liffError={liffError}
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
      />
    </>
  );
}
