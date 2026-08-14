"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { initLiff } from "@/lib/liffClient";
import { isValidIccid, normalizeIccid } from "@/lib/pushBind";

/**
 * 圖文選單「開啟流量提醒」：一鍵綁定會員 + ICCID 查流量並開提醒
 */
export default function LineIccidPage() {
  const [iccid, setIccid] = useState("");
  const [idToken, setIdToken] = useState("");
  const [liffReady, setLiffReady] = useState(false);
  const [liffError, setLiffError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [orderAlert, setOrderAlert] = useState(null);

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
            body: JSON.stringify({ idToken: token }),
          });
          const data = await res.json();
          if (cancelled) return;
          if (data.ok) setOrderAlert(data);
        } catch {
          /* 沒有本站訂單時改走 ICCID／綁定會員 */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOneClickOrder = async () => {
    if (!idToken) return;
    setBindLoading(true);
    setError("");
    try {
      const res = await fetch("/api/line/enable-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "尚無本站訂單");
      }
      setOrderAlert(data);
    } catch (err) {
      setError(err.message || "一鍵開啟失敗");
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
      <main className="min-h-[100dvh] bg-[#F4F7FB] px-5 py-8">
        <div className="mx-auto w-full max-w-md">
          <p className="text-[13px] font-bold tracking-wide text-[#3768C7] mb-1">
            Jeko eSIM
          </p>
          <h1 className="text-[22px] font-black text-stone-900 leading-snug">
            開啟流量提醒
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
            可一鍵綁定官網會員，或輸入 ICCID 查流量並開啟 LINE
            偏低通知。不必先當會員也能用 ICCID。
          </p>

          {orderAlert?.ok ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-bold text-emerald-900 text-sm">
                已用本站訂單開啟提醒
              </p>
              {orderAlert.productName ? (
                <p className="mt-1 text-[12px] text-emerald-800">
                  監控：{orderAlert.productName}
                </p>
              ) : null}
            </div>
          ) : null}

          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
            <h2 className="text-[15px] font-black text-stone-900">
              一鍵綁定會員
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-stone-600">
              Google、Facebook 或 Email
              註冊的會員，點此連結這個 LINE，並用本站訂單開啟提醒。
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/account?line_bind=start"
                className="w-full rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-3 text-sm text-center"
              >
                一鍵綁定官網會員
              </Link>
              <button
                type="button"
                disabled={bindLoading || !idToken}
                onClick={handleOneClickOrder}
                className="w-full rounded-xl border border-[#3768C7]/30 text-[#3768C7] font-bold py-3 text-sm disabled:opacity-50"
              >
                {bindLoading ? "設定中…" : "已有本站訂單？一鍵開啟提醒"}
              </button>
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="mt-4 rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
          >
            <h2 className="text-[15px] font-black text-stone-900 mb-1">
              輸入 ICCID 查流量
            </h2>
            <p className="text-[12px] text-stone-600 mb-3 leading-relaxed">
              不是會員、或其他通路購買，填卡號即可查詢並開啟提醒。
            </p>
            <label
              htmlFor="line-iccid"
              className="block text-[13px] font-bold text-stone-800 mb-2"
            >
              ICCID（19～20 碼）
            </label>
            <input
              id="line-iccid"
              inputMode="numeric"
              autoComplete="off"
              value={iccid}
              onChange={(e) =>
                setIccid(e.target.value.replace(/[^\d]/g, "").slice(0, 22))
              }
              placeholder="請輸入 eSIM 卡號"
              className="w-full rounded-xl border border-stone-200 px-4 py-3.5 text-[16px] tracking-wide outline-none focus:border-[#3768C7] focus:ring-2 focus:ring-[#3768C7]/20"
            />
            {liffError ? (
              <p className="mt-2 text-[12px] text-amber-700">{liffError}</p>
            ) : null}
            {error ? (
              <p className="mt-2 text-[12px] text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !liffReady}
              className="mt-4 w-full rounded-xl bg-[#3768C7] hover:bg-[#2B56A8] disabled:opacity-60 text-white font-bold py-3.5 text-sm"
            >
              {loading ? "查詢中…" : "查詢並開啟 LINE 提醒"}
            </button>
          </form>

          {result ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-bold text-emerald-900 text-sm mb-2">
                {result.alertEnabled
                  ? "已查詢並開啟偏低提醒"
                  : "已完成查詢"}
              </p>
              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-stone-800 font-sans">
                {result.usageText}
              </pre>
              {result.alertEnabled ? (
                <p className="mt-3 text-[12px] text-emerald-800">
                  剩餘流量偏低時，會從官方 LINE 通知您（約每日檢查一次）。
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-6 text-[11px] leading-relaxed text-stone-400">
            ICCID 可在手機「設定 → 行動服務 → eSIM」或購買信件中找到。
          </p>
        </div>
      </main>
    </>
  );
}
