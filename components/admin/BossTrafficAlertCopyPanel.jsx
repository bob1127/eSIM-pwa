"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bossFetch } from "@/lib/bossAdminClient";
import { formatTrafficCheckedAt, ensureTrafficCheckedAtLine } from "@/lib/esimUsageFormat";
import { getPushEndpoint } from "@/lib/pushBind";
import { QuarterRing } from "@/components/ui/QuarterRing";

const KOREA_PROMO_SAMPLE_NAME =
  "韓國 eSIM 5日 · 每日1GB高速之後約10Mbps吃到飽";

function renderTpl(tpl, sample) {
  return String(tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) =>
    sample[k] == null ? "" : String(sample[k]),
  );
}

function withFupDisclaimer(body) {
  const t = String(body || "").trim();
  if (!t || t.includes("降速後速度依方案與現地網路而定")) return t;
  return `${t}${/[。！？.!?]$/.test(t) ? "" : "。"}降速後速度依方案與現地網路而定`;
}

function PreviewCard({ tone, label, title, body, line }) {
  const isLine = tone === "line";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p
        className={`text-[11px] font-black uppercase tracking-wider ${
          isLine ? "text-[#06C755]" : "text-[#1a56db]"
        }`}
      >
        {label}
      </p>
      {isLine ? (
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-[#F5F5F5] p-4 text-[13px] text-slate-800 leading-relaxed font-sans">
          {line}
        </pre>
      ) : (
        <div className="mt-3 rounded-xl bg-slate-900 text-white p-4">
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-[13px] text-white/80 leading-relaxed">
            {body}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Boss：編輯流量偏低提醒文案（Web Push 與 LINE 共用；固定流量／FUP 兩套）
 */
export default function BossTrafficAlertCopyPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("good");
  const [meta, setMeta] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [lineExtra, setLineExtra] = useState("");
  const [fupTitle, setFupTitle] = useState("");
  const [fupBody, setFupBody] = useState("");
  const [fupLineExtra, setFupLineExtra] = useState("");
  const [expiryTitle, setExpiryTitle] = useState("");
  const [expiryBody, setExpiryBody] = useState("");
  const [expiryLineExtra, setExpiryLineExtra] = useState("");
  const [linkPath, setLinkPath] = useState("/data-query/");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [webPushSubs, setWebPushSubs] = useState([]);
  const [webPushTestSubId, setWebPushTestSubId] = useState("");
  const [webPushTesting, setWebPushTesting] = useState(false);
  const [webPushVapidOk, setWebPushVapidOk] = useState(true);
  const [webPushLocalTail, setWebPushLocalTail] = useState("");
  const [webPushTestResult, setWebPushTestResult] = useState(null);
  const [generalSubs, setGeneralSubs] = useState([]);
  const [generalSubId, setGeneralSubId] = useState("");
  const [generalUnboundCount, setGeneralUnboundCount] = useState(0);
  const [generalVapidOk, setGeneralVapidOk] = useState(true);
  const [generalLocalTail, setGeneralLocalTail] = useState("");
  const [generalTesting, setGeneralTesting] = useState(false);
  const [generalTestResult, setGeneralTestResult] = useState(null);
  const [generalTitle, setGeneralTitle] = useState("Jeko eSIM 通知測試");
  const [generalBody, setGeneralBody] = useState(
    "這是一般推播測試（無需綁定 eSIM）。若你看得到這則，日常優惠／公告推播已通。",
  );
  const [generalUrl, setGeneralUrl] = useState("/");
  const [alertStats, setAlertStats] = useState(null);
  const [alertStatsLoading, setAlertStatsLoading] = useState(false);
  const verifyBoxRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/traffic-alert-copy");
      setMeta(data);
      setTitle(data.copy?.title || "");
      setBody(data.copy?.body || "");
      setLineExtra(data.copy?.lineExtra || "");
      setFupTitle(data.copy?.fupTitle || "");
      setFupBody(data.copy?.fupBody || "");
      setFupLineExtra(data.copy?.fupLineExtra || "");
      setExpiryTitle(data.copy?.expiryTitle || "");
      setExpiryBody(data.copy?.expiryBody || "");
      setExpiryLineExtra(data.copy?.expiryLineExtra || "");
      setLinkPath(data.copy?.linkPath || "/data-query/");
    } catch (err) {
      setToast(err.message || "載入失敗");
      setToastType("bad");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadWebPushSubs = useCallback(async () => {
    try {
      const data = await bossFetch("/api/admin/traffic-alert-web-push-test");
      setWebPushVapidOk(data.vapidConfigured !== false);
      const subs = data.subscriptions || [];
      setWebPushSubs(subs);

      let localTail = "";
      try {
        const localEp = await getPushEndpoint();
        if (localEp) localTail = localEp.slice(-12);
      } catch {
        /* ignore */
      }
      setWebPushLocalTail(localTail);

      setWebPushTestSubId((prev) => {
        if (localTail) {
          const localHit = subs.find((s) => s.endpointTail === localTail);
          if (localHit) return localHit.id;
        }
        if (prev && subs.some((s) => s.id === prev)) return prev;
        const monitored = subs.find((s) => s.monitorEnabled);
        return (
          monitored?.id ||
          data.defaultSubscriptionId ||
          subs[0]?.id ||
          ""
        );
      });
    } catch {
      setWebPushVapidOk(false);
    }
  }, []);

  const loadGeneralSubs = useCallback(async () => {
    try {
      const data = await bossFetch("/api/admin/general-push-test");
      setGeneralVapidOk(data.vapidConfigured !== false);
      const subs = data.subscriptions || [];
      setGeneralSubs(subs);
      setGeneralUnboundCount(data.unboundCount || 0);

      let localTail = "";
      try {
        const localEp = await getPushEndpoint();
        if (localEp) localTail = localEp.slice(-12);
      } catch {
        /* ignore */
      }
      setGeneralLocalTail(localTail);

      // 預設選「非本機」的未綁卡（通常是手機）；避免 Boss 在電腦測時只打到本機
      setGeneralSubId((prev) => {
        if (prev && subs.some((s) => s.id === prev)) return prev;
        const otherUnbound = subs.find(
          (s) => s.unbound && (!localTail || s.endpointTail !== localTail),
        );
        if (otherUnbound) return otherUnbound.id;
        const anyUnbound = subs.find((s) => s.unbound);
        if (anyUnbound) return anyUnbound.id;
        if (localTail) {
          const localHit = subs.find((s) => s.endpointTail === localTail);
          if (localHit) return localHit.id;
        }
        return subs[0]?.id || "";
      });
    } catch {
      setGeneralVapidOk(false);
      setGeneralSubs([]);
    }
  }, []);

  const loadAlertStats = useCallback(async () => {
    setAlertStatsLoading(true);
    try {
      const data = await bossFetch("/api/admin/traffic-alert-stats");
      setAlertStats(data);
    } catch {
      setAlertStats(null);
    } finally {
      setAlertStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWebPushSubs();
    loadGeneralSubs();
    loadAlertStats();
  }, [loadWebPushSubs, loadGeneralSubs, loadAlertStats]);

  const urlBase = "https://www.jeko-esim.com.tw";
  const path =
    (linkPath || "/").startsWith("/") ? linkPath || "/" : `/${linkPath}`;

  const checkedAtSample = formatTrafficCheckedAt(new Date().toISOString());

  const quotaSample = useMemo(
    () => ({
      productName: "【範例】韓國 eSIM 7日 5GB",
      remaining: "180 MB",
      total: "5.0 GB",
      totalPart: " / 5.0 GB",
      highSpeedQuota: "5.0 GB",
      throttleSpeed: "—",
      checkedAt: checkedAtSample,
      siteUrl: urlBase,
      url: `${urlBase}${path}`,
    }),
    [path, checkedAtSample],
  );

  const fupSample = useMemo(
    () => ({
      productName: KOREA_PROMO_SAMPLE_NAME,
      remaining: "180 MB",
      total: "1.0 GB",
      totalPart: " / 1.0 GB",
      highSpeedQuota: "1 GB",
      throttleSpeed: "10 Mbps",
      checkedAt: checkedAtSample,
      siteUrl: urlBase,
      url: `${urlBase}${path}`,
    }),
    [path, checkedAtSample],
  );

  const expirySample = useMemo(
    () => ({
      productName: "【範例】台灣 eSIM · 2天 · 5Mbps 吃到飽",
      used: "94 MB",
      expiresAt: "2026-08-27 23:59",
      hoursLeft: "13 小時",
      checkedAt: checkedAtSample,
      siteUrl: urlBase,
      url: `${urlBase}${path}`,
    }),
    [path, checkedAtSample],
  );

  const quotaPreview = useMemo(() => {
    const t = renderTpl(title, quotaSample);
    const b = renderTpl(body, quotaSample);
    const extra = ensureTrafficCheckedAtLine(
      renderTpl(lineExtra, quotaSample),
      quotaSample.checkedAt,
    );
    return {
      title: t,
      body: b,
      line: [t, "", b, "", `👉 ${quotaSample.url}`, extra || null]
        .filter((l) => l != null && l !== "")
        .join("\n"),
    };
  }, [title, body, lineExtra, quotaSample]);

  const fupPreview = useMemo(() => {
    const t = renderTpl(fupTitle, fupSample);
    const b = withFupDisclaimer(renderTpl(fupBody, fupSample));
    const extra = ensureTrafficCheckedAtLine(
      renderTpl(fupLineExtra, fupSample),
      fupSample.checkedAt,
    );
    return {
      title: t,
      body: b,
      line: [t, "", b, "", `👉 ${fupSample.url}`, extra || null]
        .filter((l) => l != null && l !== "")
        .join("\n"),
    };
  }, [fupTitle, fupBody, fupLineExtra, fupSample]);

  const expiryPreview = useMemo(() => {
    const t = renderTpl(expiryTitle, expirySample);
    const b = renderTpl(expiryBody, expirySample);
    const extra = ensureTrafficCheckedAtLine(
      renderTpl(expiryLineExtra, expirySample),
      expirySample.checkedAt,
    );
    return {
      title: t,
      body: b,
      line: [t, "", b, "", `👉 ${expirySample.url}`, extra || null]
        .filter((l) => l != null && l !== "")
        .join("\n"),
    };
  }, [expiryTitle, expiryBody, expiryLineExtra, expirySample]);

  const dirty = useMemo(() => {
    if (!meta?.copy) return false;
    const c = meta.copy;
    return (
      title !== c.title ||
      body !== c.body ||
      lineExtra !== (c.lineExtra || "") ||
      fupTitle !== (c.fupTitle || "") ||
      fupBody !== (c.fupBody || "") ||
      fupLineExtra !== (c.fupLineExtra || "") ||
      expiryTitle !== (c.expiryTitle || "") ||
      expiryBody !== (c.expiryBody || "") ||
      expiryLineExtra !== (c.expiryLineExtra || "") ||
      linkPath !== c.linkPath
    );
  }, [
    meta,
    title,
    body,
    lineExtra,
    fupTitle,
    fupBody,
    fupLineExtra,
    expiryTitle,
    expiryBody,
    expiryLineExtra,
    linkPath,
  ]);

  const save = async () => {
    setSaving(true);
    setToast("");
    try {
      await bossFetch("/api/admin/traffic-alert-copy", {
        method: "PUT",
        body: JSON.stringify({
          title,
          body,
          lineExtra,
          fupTitle,
          fupBody,
          fupLineExtra,
          expiryTitle,
          expiryBody,
          expiryLineExtra,
          linkPath,
        }),
      });
      await load();
      setToast("已儲存。系統會依方案類型自動選固定流量、FUP 或使用期限文案。");
      setToastType("good");
    } catch (err) {
      setToast(err.message || "儲存失敗");
      setToastType("bad");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!confirm("確定還原成系統預設文案？")) return;
    setSaving(true);
    setToast("");
    try {
      await bossFetch("/api/admin/traffic-alert-copy", {
        method: "PUT",
        body: JSON.stringify({ reset: true }),
      });
      await load();
      setToast("已還原預設文案");
      setToastType("good");
    } catch (err) {
      setToast(err.message || "還原失敗");
      setToastType("bad");
    } finally {
      setSaving(false);
    }
  };

  const showLocalTestNotification = async (webPush) => {
    let localShown = false;
    let localHint = "";
    try {
      if (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        Notification.permission === "granted" &&
        webPush
      ) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(webPush.title || "流量提醒測試", {
          body: webPush.body || "Web Push 測試",
          icon: "/images/Logo/icon-192.png",
          badge: "/images/Logo/icon-192.png",
          tag: "jeko-boss-traffic-test-local",
          renotify: true,
          requireInteraction: true,
          data: { url: webPush.url || "/data-query/" },
        });
        localShown = true;
      } else if (Notification.permission !== "granted") {
        localHint = "通知權限未允許";
      }
    } catch (localErr) {
      localHint = localErr?.message || "本機顯示失敗";
    }
    return { localShown, localHint };
  };

  const sendWebPushTest = async ({ sendAll = false } = {}) => {
    if (sendAll) {
      const ok = window.confirm(
        "確定對最近最多 40 筆 Web Push 訂閱發送流量提醒測試？\n（並行發送；失效訂閱會清除；單筆逾時約 8 秒，不會再整頁卡住）",
      );
      if (!ok) return;
    }

    setWebPushTesting(true);
    setToast("");
    setWebPushTestResult(null);

    const controller = new AbortController();
    const abortMs = sendAll ? 90_000 : 30_000;
    const abortTimer = setTimeout(() => controller.abort(), abortMs);

    try {
      const data = await bossFetch("/api/admin/traffic-alert-web-push-test", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          sendAll: sendAll || undefined,
          subscriptionId: sendAll
            ? undefined
            : webPushTestSubId.trim() || undefined,
          sku: "South Korea-Promo-unlimited-5-A0",
          remainingMb: 180,
          totalMb: 1024,
        }),
      });

      const { localShown, localHint } = await showLocalTestNotification(
        data.webPush,
      );

      if (data.sendAll) {
        const msg = `全部發送完成：成功 ${data.sent}/${data.total}，失敗 ${data.failed}${
          data.timedOut ? `，逾時 ${data.timedOut}` : ""
        }，已清除失效 ${data.removed}${
          localShown ? "；本機已彈出通知" : ""
        }`;
        setWebPushTestResult({
          ok: true,
          message: msg,
          localShown,
          localHint,
          title: data.webPush?.title,
          body: data.webPush?.body,
        });
        setToast(msg);
        setToastType("good");
        if (data.removed > 0) loadWebPushSubs();
        return;
      }

      const msg = localShown
        ? "伺服器已送出，並在本機彈出通知（Mac 請看右上角或通知中心）"
        : "伺服器已送出。Mac 若 Chrome 在前景可能不跳 banner，請看右上角通知中心";
      setWebPushTestResult({
        ok: true,
        message: msg,
        localShown,
        localHint,
        title: data.webPush?.title,
        body: data.webPush?.body,
      });
      setToast(`Web Push 測試已送出${data.label ? ` → ${data.label}` : ""}`);
      setToastType("good");
    } catch (err) {
      const aborted =
        err?.name === "AbortError" ||
        String(err?.message || "").toLowerCase().includes("abort");
      const message = aborted
        ? `請求逾時（${Math.round(abortMs / 1000)} 秒）。請重新整理後改選「本機」單筆發送，或再試全部發送。`
        : err.message || "Web Push 測試推播失敗";
      setWebPushTestResult({
        ok: false,
        message,
      });
      setToast(message);
      setToastType("bad");
      if (String(err.message || "").includes("已失效")) {
        loadWebPushSubs();
      }
    } finally {
      clearTimeout(abortTimer);
      setWebPushTesting(false);
    }
  };

  const sendGeneralPushTest = async ({
    sendAll = false,
    unboundOnly = false,
  } = {}) => {
    const selected = generalSubs.find((s) => s.id === generalSubId);
    const selectedIsLocal =
      !!generalLocalTail &&
      selected?.endpointTail === generalLocalTail;

    if (!sendAll) {
      if (selectedIsLocal) {
        const otherUnbound = generalSubs.filter(
          (s) => s.unbound && s.endpointTail !== generalLocalTail,
        );
        if (otherUnbound.length) {
          const pick = window.confirm(
            `目前選的是「本機電腦」，單筆測試只會打到這台，手機收不到。\n\n` +
              `偵測到另外 ${otherUnbound.length} 筆未綁卡訂閱（多半是手機）。\n` +
              `按「確定」改發「全部未綁卡」；按「取消」只發本機。`,
          );
          if (pick) {
            return sendGeneralPushTest({ sendAll: true, unboundOnly: true });
          }
        } else {
          window.alert(
            "目前選的是本機電腦訂閱。若要測手機，請用手機開啟本站通知後按「重新整理」，再點選非「本機」的訂閱，或按「全部未綁卡」。",
          );
        }
      }
    } else {
      const ok = window.confirm(
        unboundOnly
          ? "確定對「已開一般推播且未綁 eSIM」的訂閱發送測試？（最多 40 筆，含手機）"
          : "確定對所有已開啟一般推播的訂閱發送測試？（最多 40 筆）",
      );
      if (!ok) return;
    }

    setGeneralTesting(true);
    setToast("");
    setGeneralTestResult(null);

    const controller = new AbortController();
    const abortMs = sendAll ? 90_000 : 30_000;
    const abortTimer = setTimeout(() => controller.abort(), abortMs);

    try {
      const data = await bossFetch("/api/admin/general-push-test", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          sendAll: sendAll || undefined,
          unboundOnly: unboundOnly || undefined,
          subscriptionId: sendAll
            ? undefined
            : generalSubId.trim() || undefined,
          title: generalTitle.trim(),
          body: generalBody.trim(),
          url: generalUrl.trim() || "/",
        }),
      });

      // 只有打到「本機」訂閱時才在電腦再彈一次，避免誤以為手機已收到
      let localShown = false;
      let localHint = "";
      if (!sendAll && selectedIsLocal) {
        const local = await showLocalTestNotification({
          title: data.webPush?.title,
          body: data.webPush?.body,
          url: data.webPush?.url,
        });
        localShown = local.localShown;
        localHint = local.localHint;
      }

      if (data.sendAll) {
        const msg = `一般推播全部發送：成功 ${data.sent}/${data.total}，失敗 ${data.failed}${
          data.timedOut ? `，逾時 ${data.timedOut}` : ""
        }，清除失效 ${data.removed}`;
        setGeneralTestResult({
          ok: true,
          message: msg,
          title: data.webPush?.title,
          body: data.webPush?.body,
        });
        setToast(msg);
        setToastType("good");
        if (data.removed > 0) loadGeneralSubs();
        return;
      }

      const targetHint = selected?.deviceHint
        ? `（${selected.deviceHint}）`
        : "";
      const msg = selectedIsLocal
        ? localShown
          ? `已送至本機電腦${targetHint}。手機請選非本機訂閱或按「全部未綁卡」。`
          : `已送至本機電腦${targetHint}（請看通知中心）。手機請另選訂閱。`
        : `已送至選取裝置${targetHint} → ${data.label || "訂閱"}。請查看手機通知。`;
      setGeneralTestResult({
        ok: true,
        message: msg,
        localShown,
        localHint,
        title: data.webPush?.title,
        body: data.webPush?.body,
      });
      setToast(msg);
      setToastType("good");
    } catch (err) {
      const aborted =
        err?.name === "AbortError" ||
        String(err?.message || "").toLowerCase().includes("abort");
      const message = aborted
        ? `請求逾時（${Math.round(abortMs / 1000)} 秒）`
        : err.message || "一般推播測試失敗";
      setGeneralTestResult({ ok: false, message });
      setToast(message);
      setToastType("bad");
      if (String(err.message || "").includes("已失效")) {
        loadGeneralSubs();
      }
    } finally {
      clearTimeout(abortTimer);
      setGeneralTesting(false);
    }
  };

  const trafficSetupUrl = useMemo(() => {
    if (typeof window === "undefined") return "/data-query/?setup=traffic";
    return `${window.location.origin}/data-query/?setup=traffic`;
  }, []);

  const openTrafficSetup = () => {
    window.open(trafficSetupUrl, "_blank", "noopener,noreferrer");
  };

  const verifyKoreaPromo = async () => {
    setVerifying(true);
    setVerifyResult(null);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/traffic-alert-preview", {
        method: "POST",
        body: JSON.stringify({
          sku: "South Korea-Promo-unlimited-5-A0",
          // 故意傳 SKU：伺服器應轉成商品名再組文案
          productName: "South Korea-Promo-unlimited-5-A0",
          remainingMb: 180,
          totalMb: 1024,
        }),
      });
      setVerifyResult(data);
      const nameOk =
        data.enriched?.productName &&
        !/South\s*Korea-Promo/i.test(data.enriched.productName) &&
        /韓國/.test(data.enriched.productName);
      const disclaimerOk = String(
        data.webPush?.body || data.lineText || "",
      ).includes("降速後速度依方案與現地網路而定");
      if (data.koreaPromoExpectedOk && data.willSend && nameOk && disclaimerOk) {
        setToast(
          "驗證通過：商品名已轉中文，FUP 文案含 1GB／10Mbps，結尾有降速免責",
        );
        setToastType("good");
      } else {
        setToast(
          `驗證未完全通過：name=${data.enriched?.productName || "—"} kind=${data.planKind} quota=${data.highSpeedQuota} speed=${data.throttleSpeed} disclaimer=${disclaimerOk} willSend=${data.willSend}`,
        );
        setToastType("bad");
      }
      requestAnimationFrame(() => {
        verifyBoxRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    } catch (err) {
      setToast(err.message || "驗證失敗");
      setToastType("bad");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <QuarterRing size="md" className="text-[#1a56db]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              目前開啟流量提醒
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              LINE 以人數計；Web Push 以訂閱裝置計（同一人多裝置會重複）。手機
              PWA 以 Apple Push 辨識；FCM／Firefox 等歸「網頁／Android」。
            </p>
          </div>
          <button
            type="button"
            onClick={loadAlertStats}
            disabled={alertStatsLoading}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {alertStatsLoading ? "更新中…" : "重新整理"}
          </button>
        </div>

        {alertStatsLoading && !alertStats ? (
          <div className="mt-5 flex justify-center py-6">
            <QuarterRing size="sm" className="text-[#1a56db]" />
          </div>
        ) : alertStats ? (
          <>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#06C755]/25 bg-[#06C755]/5 px-3 py-3">
                <p className="text-[11px] font-bold text-[#06C755]">LINE</p>
                <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
                  {alertStats.line?.people ?? 0}
                </p>
                <p className="text-[10px] text-slate-500">人（已綁卡監控）</p>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-3">
                <p className="text-[11px] font-bold text-violet-700">
                  手機 PWA
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
                  {alertStats.webPush?.mobilePwa ?? 0}
                </p>
                <p className="text-[10px] text-slate-500">Apple 訂閱</p>
              </div>
              <div className="rounded-xl border border-[#1a56db]/20 bg-[#1a56db]/5 px-3 py-3">
                <p className="text-[11px] font-bold text-[#1a56db]">網頁</p>
                <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
                  {alertStats.webPush?.webBrowser ?? 0}
                </p>
                <p className="text-[10px] text-slate-500">
                  Chrome／Android 等
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-[11px] font-bold text-slate-600">合計約</p>
                <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
                  {alertStats.totalAlertPeopleApprox ?? 0}
                </p>
                <p className="text-[10px] text-slate-500">
                  LINE 人＋Web 訂閱
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>
                Web Push 已監測訂閱{" "}
                <strong className="text-slate-700">
                  {alertStats.webPush?.total ?? 0}
                </strong>
              </span>
              <span>
                一般推播開啟{" "}
                <strong className="text-slate-700">
                  {alertStats.generalPushEnabled ?? 0}
                </strong>
                （含未綁卡）
              </span>
              {(alertStats.webPush?.unboundMonitor || 0) > 0 ? (
                <span>
                  開監測但未綁卡{" "}
                  <strong className="text-amber-700">
                    {alertStats.webPush.unboundMonitor}
                  </strong>
                  （Cron 不會推）
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-rose-600">無法載入統計，請重新整理</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">流量提醒推播文案</h2>
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
          Web Push 與 LINE 共用。系統會依方案名稱判斷類型：
          <strong className="text-slate-700"> 固定流量</strong>用第一套；
          <strong className="text-slate-700">
            {" "}
            高速額度＋降速吃到飽
          </strong>
          用第二套。高速額度／降速速度會從方案名動態帶入（如 1GB、10Mbps）。
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(meta?.placeholders || []).map((p) => (
            <span
              key={p}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-600"
            >
              {p}
            </span>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-bold text-slate-700">
            點擊後開啟路徑（兩套共用）
          </span>
          <input
            value={linkPath}
            onChange={(e) => setLinkPath(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25"
            placeholder="/data-query/"
          />
        </label>
      </div>

      {/* 固定流量 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900">
          ① 固定流量方案（用完需加購）
        </h3>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">標題</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25"
            maxLength={80}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">內文</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25 resize-y"
            maxLength={500}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">LINE 補充</span>
          <textarea
            value={lineExtra}
            onChange={(e) => setLineExtra(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25 resize-y"
            maxLength={300}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewCard
            tone="push"
            label="Web Push 預覽 · 固定流量"
            title={quotaPreview.title}
            body={quotaPreview.body}
          />
          <PreviewCard
            tone="line"
            label="LINE 預覽 · 固定流量"
            line={quotaPreview.line}
          />
        </div>
      </div>

      {/* FUP */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900">
          ② 吃到飽／FUP（高速額度將用完 → 降速後仍可上網）
        </h3>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          例：高速 1GB 之後 10Mbps 吃到飽。用{" "}
          <code className="text-[11px] bg-white px-1 rounded">
            {"{{highSpeedQuota}}"}
          </code>
          、
          <code className="text-[11px] bg-white px-1 rounded">
            {"{{throttleSpeed}}"}
          </code>
          、
          <code className="text-[11px] bg-white px-1 rounded">
            {"{{remaining}}"}
          </code>{" "}
          動態帶入。
        </p>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">標題</span>
          <input
            value={fupTitle}
            onChange={(e) => setFupTitle(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25"
            maxLength={80}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">內文</span>
          <textarea
            value={fupBody}
            onChange={(e) => setFupBody(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25 resize-y"
            maxLength={500}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">LINE 補充</span>
          <textarea
            value={fupLineExtra}
            onChange={(e) => setFupLineExtra(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25 resize-y"
            maxLength={300}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewCard
            tone="push"
            label="Web Push 預覽 · 吃到飽 FUP"
            title={fupPreview.title}
            body={fupPreview.body}
          />
          <PreviewCard
            tone="line"
            label="LINE 預覽 · 吃到飽 FUP"
            line={fupPreview.line}
          />
        </div>
      </div>

      {/* 純吃到飽：使用期限 */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900">
          ③ 純吃到飽（無剩餘流量數值 → 提醒使用期限）
        </h3>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          例：台灣 5Mbps 吃到飽。用{" "}
          <code className="text-[11px] bg-white px-1 rounded">
            {"{{expiresAt}}"}
          </code>
          、
          <code className="text-[11px] bg-white px-1 rounded">
            {"{{hoursLeft}}"}
          </code>
          、
          <code className="text-[11px] bg-white px-1 rounded">
            {"{{used}}"}
          </code>{" "}
          動態帶入。預設效期剩餘{" "}
          <code className="text-[11px] bg-white px-1 rounded">24</code>{" "}
          小時內推播（環境變數 TRAFFIC_ALERT_EXPIRY_HOURS）。
        </p>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">標題</span>
          <input
            value={expiryTitle}
            onChange={(e) => setExpiryTitle(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25"
            maxLength={80}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">內文</span>
          <textarea
            value={expiryBody}
            onChange={(e) => setExpiryBody(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25 resize-y"
            maxLength={500}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">LINE 補充</span>
          <textarea
            value={expiryLineExtra}
            onChange={(e) => setExpiryLineExtra(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56db]/25 resize-y"
            maxLength={300}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewCard
            tone="push"
            label="Web Push 預覽 · 使用期限"
            title={expiryPreview.title}
            body={expiryPreview.body}
          />
          <PreviewCard
            tone="line"
            label="LINE 預覽 · 使用期限"
            line={expiryPreview.line}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={save}
          className="rounded-full bg-[#1a56db] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40 hover:bg-[#1648b8] transition"
        >
          {saving ? "儲存中…" : "儲存文案"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={resetDefaults}
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          還原預設
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={load}
          className="rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
        >
          重新載入
        </button>
        <button
          type="button"
          disabled={verifying}
          onClick={verifyKoreaPromo}
          className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-40"
        >
          {verifying ? "驗證中…" : "驗證韓國吃到飽會推對"}
        </button>
      </div>

      <div className="rounded-2xl border border-[#1a56db]/30 bg-[#1a56db]/5 p-4 space-y-3">
        <p className="text-sm font-black text-slate-900">
          Web Push 實機測試（PWA／瀏覽器）
        </p>
        <div className="rounded-xl bg-white/80 border border-[#1a56db]/15 px-3 py-3 text-xs text-slate-700 leading-relaxed space-y-1.5">
          <p className="font-bold text-slate-900">一鍵開啟（3 步，請在同一台裝置操作）</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>按下方「開啟流量提醒設定」→ 切到「流量提醒」分頁</li>
            <li>點 <strong>開啟流量提醒</strong> → 允許通知 → 登入並綁定一張 eSIM</li>
            <li>回此頁按「重新整理訂閱」→ 選有 <strong>本機</strong> 標籤的項目 → 發測試推播</li>
          </ol>
          <p className="text-[11px] text-slate-500 pt-1">
            列表裡很多「未監測／web.push.apple.com」是舊裝置或已關通知的失效紀錄，請勿選；要選目前這台瀏覽器剛開啟的那筆。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openTrafficSetup}
            className="rounded-full bg-[#1a56db] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1648b0]"
          >
            ① 開啟流量提醒設定
          </button>
          <button
            type="button"
            onClick={loadWebPushSubs}
            className="rounded-full border border-[#1a56db]/40 bg-white px-5 py-2.5 text-sm font-bold text-[#1a56db] hover:bg-[#1a56db]/5"
          >
            ② 重新整理訂閱
          </button>
        </div>
        {!webPushVapidOk ? (
          <p className="text-xs font-bold text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            VAPID 未設定，無法發送 Web Push
          </p>
        ) : null}
        {!webPushLocalTail ? (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            此瀏覽器尚未開啟推播。請先按「開啟流量提醒設定」完成訂閱。
          </p>
        ) : null}
        {webPushSubs.length ? (
          <div className="flex flex-wrap gap-2">
            {webPushSubs.map((s) => {
              const isLocal = webPushLocalTail && s.endpointTail === webPushLocalTail;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setWebPushTestSubId(s.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold border text-left max-w-full ${
                    webPushTestSubId === s.id
                      ? "bg-[#1a56db] text-white border-[#1a56db]"
                      : isLocal
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                        : "bg-white text-slate-700 border-slate-200 hover:border-[#1a56db]"
                  }`}
                  title={s.endpointShort}
                >
                  {isLocal ? "本機 · " : ""}
                  {s.label}
                  {s.monitorEnabled ? " · 已監測" : " · 僅訂閱"}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-amber-700">
            尚無 Web Push 訂閱紀錄。請先按「開啟流量提醒設定」。
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              webPushTesting || !webPushVapidOk || !webPushTestSubId.trim()
            }
            onClick={() => sendWebPushTest()}
            className="rounded-full bg-[#1a56db] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1648b0] disabled:opacity-40"
          >
            {webPushTesting ? "發送中…" : "③ 發送 Web Push 測試推播"}
          </button>
          <button
            type="button"
            disabled={webPushTesting || !webPushVapidOk}
            onClick={() => sendWebPushTest({ sendAll: true })}
            className="rounded-full border border-[#1a56db] bg-white px-5 py-2.5 text-sm font-bold text-[#1a56db] hover:bg-[#1a56db]/5 disabled:opacity-40"
          >
            {webPushTesting ? "發送中…" : "全部發送"}
          </button>
        </div>
        {webPushTestResult ? (
          <div
            className={`rounded-xl px-3 py-3 text-xs leading-relaxed ${
              webPushTestResult.ok
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <p className="font-bold">{webPushTestResult.message}</p>
            {webPushTestResult.title ? (
              <p className="mt-2 font-bold">{webPushTestResult.title}</p>
            ) : null}
            {webPushTestResult.body ? (
              <p className="mt-1 whitespace-pre-wrap opacity-90">
                {webPushTestResult.body}
              </p>
            ) : null}
            {webPushTestResult.ok ? (
              <p className="mt-2 text-[11px] opacity-80">
                Mac 提示：Chrome 視窗在前景時，通知可能只出現在
                <strong> 螢幕右上角 </strong>
                或「通知中心」；也可到 系統設定 → 通知 → Google Chrome → 允許並選
                「橫幅」。
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-violet-300/50 bg-violet-50/60 p-4 space-y-3">
        <p className="text-sm font-black text-slate-900">
          一般推播測試（未綁 eSIM 也可）
        </p>
        <div className="rounded-xl bg-white/80 border border-violet-200 px-3 py-3 text-xs text-slate-700 leading-relaxed space-y-1.5">
          <p className="font-bold text-slate-900">
            對象：已開啟推播／流量提醒設定，但<strong>沒有綁定 eSIM</strong>
            （走 <code className="text-[10px]">general_push_enabled</code>，與流量 Cron
            分開）
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>用<strong>手機</strong>開啟本站 → 允許通知（不必綁卡）</li>
            <li>回此頁「重新整理」→ 點選<strong>非「本機」</strong>的訂閱（會標 Apple／FCM）</li>
            <li>按「發送一般推播測試」；或直接按「全部未綁卡」一次打到手機＋其他未綁卡</li>
          </ol>
          <p className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5 mt-1">
            注意：在電腦開 Boss 時，「本機」＝這台電腦。單筆只打選中的那一筆；電腦彈出通知不代表手機有收到。
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            目前一般推播開啟且未綁卡：{generalUnboundCount} 筆
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">標題</span>
            <input
              value={generalTitle}
              onChange={(e) => setGeneralTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/40"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">內容</span>
            <textarea
              value={generalBody}
              onChange={(e) => setGeneralBody(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/40"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-700">點擊前往</span>
            <input
              value={generalUrl}
              onChange={(e) => setGeneralUrl(e.target.value)}
              placeholder="/"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-300/40"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadGeneralSubs}
            className="rounded-full border border-violet-400 bg-white px-5 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50"
          >
            重新整理一般訂閱
          </button>
        </div>

        {!generalVapidOk ? (
          <p className="text-xs font-bold text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            VAPID 未設定，無法發送
          </p>
        ) : null}
        {!generalLocalTail ? (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            此瀏覽器尚未訂閱推播。請先到首頁開啟通知（不必綁 eSIM）。
          </p>
        ) : null}

        {generalSubs.length ? (
          <div className="flex flex-wrap gap-2">
            {generalSubs.map((s) => {
              const isLocal =
                generalLocalTail && s.endpointTail === generalLocalTail;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setGeneralSubId(s.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold border text-left max-w-full ${
                    generalSubId === s.id
                      ? "bg-violet-600 text-white border-violet-600"
                      : isLocal
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                        : s.unbound
                          ? "bg-violet-50 text-violet-900 border-violet-200"
                          : "bg-white text-slate-700 border-slate-200 hover:border-violet-400"
                  }`}
                  title={s.endpointShort}
                >
                  {isLocal ? "本機電腦 · " : ""}
                  {s.unbound ? "未綁卡 · " : "已綁卡 · "}
                  {s.deviceHint ? `${s.deviceHint} · ` : ""}
                  {s.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-amber-700">
            尚無 general_push_enabled 訂閱。請先在前台開啟日常推播。
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              generalTesting || !generalVapidOk || !generalSubId.trim()
            }
            onClick={() => sendGeneralPushTest()}
            className="rounded-full border border-violet-500 bg-white px-5 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-40"
          >
            {generalTesting ? "發送中…" : "發送至選取裝置"}
          </button>
          <button
            type="button"
            disabled={generalTesting || !generalVapidOk}
            onClick={() =>
              sendGeneralPushTest({ sendAll: true, unboundOnly: true })
            }
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40"
          >
            {generalTesting ? "發送中…" : "全部未綁卡（含手機）"}
          </button>
          <button
            type="button"
            disabled={generalTesting || !generalVapidOk}
            onClick={() => sendGeneralPushTest({ sendAll: true })}
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {generalTesting ? "發送中…" : "全部一般推播"}
          </button>
        </div>

        {generalTestResult ? (
          <div
            className={`rounded-xl px-3 py-3 text-xs leading-relaxed ${
              generalTestResult.ok
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <p className="font-bold">{generalTestResult.message}</p>
            {generalTestResult.title ? (
              <p className="mt-2 font-bold">{generalTestResult.title}</p>
            ) : null}
            {generalTestResult.body ? (
              <p className="mt-1 whitespace-pre-wrap opacity-90">
                {generalTestResult.body}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div ref={verifyBoxRef} className="space-y-3">
        {toast ? (
          <p
            className={`text-sm font-bold ${
              toastType === "good" ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {toast}
          </p>
        ) : null}

        {verifyResult ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm space-y-2">
            <p className="font-black text-slate-900">伺服器驗證結果</p>
            <p>
              商品名{" "}
              <strong>{verifyResult.enriched?.productName || "—"}</strong>
            </p>
            <p>
              類型 <strong>{verifyResult.planKind}</strong> · 高速{" "}
              <strong>{verifyResult.highSpeedQuota || "—"}</strong> · 降速{" "}
              <strong>{verifyResult.throttleSpeed || "—"}</strong> · 會推播{" "}
              <strong>{verifyResult.willSend ? "是" : "否"}</strong>
            </p>
            {(verifyResult.upsellOffers || []).length ? (
              <div className="text-xs text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2 space-y-2">
                <p className="font-bold">加購按鈕（每日型／總量型／吃到飽）</p>
                {(verifyResult.upsellOffers || []).map((offer) => (
                  <div key={offer.id}>
                    <span className="font-semibold">
                      {offer.label}
                      {offer.sameTelecom ? " · 同電信" : " · 其他電信"}
                    </span>
                    <br />
                    <span className="text-slate-600">{offer.targetSku}</span>
                    <br />
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1a56db] underline underline-offset-2 break-all"
                    >
                      {offer.url}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-700">未解析到加購連結</p>
            )}
            <p className="text-xs text-slate-500">
              sku: {verifyResult.enriched?.sku || "—"}
            </p>
            <p className="text-xs text-slate-500">
              rule: {verifyResult.enriched?.ruleDesc || "—"}
            </p>
            <p className="text-xs text-slate-500">
              special: {verifyResult.enriched?.specialDesc || "—"}
            </p>
            <div className="rounded-xl bg-slate-900 text-white p-3 space-y-2">
              <p className="font-bold">{verifyResult.webPush?.title}</p>
              <p className="text-white/80">{verifyResult.webPush?.body}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {verifyResult.webPush?.url ? (
                  <a
                    href={verifyResult.webPush.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold hover:bg-white/25"
                  >
                    查詢用量
                  </a>
                ) : null}
                {(verifyResult.webPush?.upsellOffers || []).map((offer) => (
                  <a
                    key={offer.id}
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-[#3768C7] px-3 py-1 text-[11px] font-bold hover:bg-[#2d56a8]"
                  >
                    {offer.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-[#F5F5F5] p-3 text-[12px] text-slate-800 space-y-2">
              <p className="text-[11px] font-black text-[#06C755] uppercase">
                LINE 預覽（可點按鈕）
              </p>
              <p className="whitespace-pre-wrap font-sans">{verifyResult.lineText}</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#3768C7] text-white px-3 py-1 text-[11px] font-bold">
                  查詢用量
                </span>
                {(verifyResult.upsellOffers || []).map((offer) => (
                  <span
                    key={offer.id}
                    className="rounded-full border border-[#3768C7] text-[#3768C7] px-3 py-1 text-[11px] font-bold"
                  >
                    {offer.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
