"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";

function resolveLineOaId() {
  const raw = (process.env.NEXT_PUBLIC_LINE_OA_ID || "").trim();
  if (raw) return raw.startsWith("@") ? raw : `@${raw}`;
  const url = process.env.NEXT_PUBLIC_LINE_OA_URL || "";
  const m = String(url).match(/@[\w.-]+/);
  if (m) return m[0];
  return "@593gvyzn";
}

function buildLineOaMessageUrl(text) {
  const body = String(text || "").slice(0, 900);
  const id = encodeURIComponent(resolveLineOaId());
  return `https://line.me/R/oaMessage/${id}/?${encodeURIComponent(body)}`;
}

/**
 * 手機掃 QR 落地頁：讀取轉介提問 → 自動開啟 LINE 並預填。
 * （剪貼簿無法從電腦同步到手機，所以必須走這個中繼頁）
 */
export default function LineHandoffPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);

  const lineUrl = useMemo(
    () => (text ? buildLineOaMessageUrl(text) : ""),
    [text],
  );

  useEffect(() => {
    if (!router.isReady || !id) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/line/handoff?id=${encodeURIComponent(id)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.text) {
          setError(data?.error || "轉介已過期，請回網站重新點「轉專人客服」");
          setLoading(false);
          return;
        }
        setText(data.text);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("無法讀取提問，請回網站再試一次");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, id]);

  useEffect(() => {
    if (!lineUrl || opened) return undefined;
    const t = setTimeout(() => {
      setOpened(true);
      window.location.href = lineUrl;
    }, 600);
    return () => clearTimeout(t);
  }, [lineUrl, opened]);

  return (
    <>
      <Head>
        <title>轉專人客服｜Jeko eSIM</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </Head>
      <main className="min-h-[100dvh] bg-[#f3f6fb] px-4 py-10 flex items-start justify-center font-sans">
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 text-[#06C755]">
            <LineIconSvg className="w-6 h-6" />
            <h1 className="text-lg font-bold text-slate-800">轉專人客服</h1>
          </div>

          {loading && (
            <p className="mt-4 text-sm text-slate-500">正在帶入你的提問…</p>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 leading-relaxed">{error}</p>
          )}

          {!loading && !error && text && (
            <>
              <p className="mt-3 text-[13px] text-slate-600 leading-relaxed">
                即將開啟官方 LINE，並預填以下提問。若沒有自動開啟，請點下方按鈕。
              </p>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-[12px] text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
                {text}
              </pre>
              <a
                href={lineUrl}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] text-white font-semibold text-[15px] py-3.5 no-underline hover:bg-[#05b34c]"
              >
                <LineIconSvg className="w-5 h-5" />
                開啟 LINE 並帶入提問
              </a>
              <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
                開啟後請確認預填內容，再按送出。尚未加入好友請先加入官方帳號。
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
