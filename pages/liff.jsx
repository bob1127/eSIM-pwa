import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  getLiffId,
  initLiff,
  sanitizeLiffPath,
} from "../lib/liffClient";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

/**
 * LINE LIFF 入口
 *
 * LINE Developers → LIFF → Endpoint URL 請填：
 *   https://www.jeko-esim.com.tw/liff
 *
 * 官方帳號選單／圖文請放：
 *   https://liff.line.me/{LIFF_ID}
 *   或帶路徑：https://liff.line.me/{LIFF_ID}?path=%2Faccount
 * 圖文選單「開啟流量提醒」請用連結（導向 data-query）：
 *   https://liff.line.me/{LIFF_ID}?path=%2Fdata-query%3Fsetup%3Dtraffic
 *   若尚未設 LIFF：http://localhost:3000/data-query（本機）或 https://www.jeko-esim.com.tw/data-query
 */
export default function LiffEntryPage() {
  const router = useRouter();
  const [status, setStatus] = useState("載入中…");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    (async () => {
      const target = sanitizeLiffPath(
        typeof router.query.path === "string" ? router.query.path : "/",
      );

      const liffId = getLiffId();
      if (!liffId) {
        setStatus("尚未設定 LIFF");
        setDetail(
          "請在 Vercel／.env 設定 NEXT_PUBLIC_LIFF_ID，並在 LINE Developers 建立 LIFF App。",
        );
        // 沒設 ID 時仍導回官網，避免選單完全空白
        window.setTimeout(() => {
          if (!cancelled) router.replace(target);
        }, 1200);
        return;
      }

      setStatus("正在開啟 Jeko eSIM…");
      const result = await initLiff();
      if (cancelled) return;

      if (!result.ok) {
        setStatus("LIFF 初始化失敗");
        setDetail(result.error || "請稍後再試，或改用瀏覽器開啟官網。");
        window.setTimeout(() => {
          if (!cancelled) router.replace(target);
        }, 1500);
        return;
      }

      router.replace(target);
    })();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.path, router]);

  return (
    <>
      <Head>
        <title>開啟 Jeko eSIM｜LINE</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f5f7fa] px-6 text-center">
        <LoadingIndicator
          layout="center"
          label={status}
          size="xl"
          className="mb-5"
          labelClassName="text-[17px] font-bold text-slate-800"
        />
        {detail ? (
          <p className="mt-2 text-[13px] text-slate-500 max-w-sm leading-relaxed">
            {detail}
          </p>
        ) : null}
        <a
          href="/"
          className="mt-8 text-[13px] font-semibold text-[#067A38] underline-offset-2 hover:underline"
        >
          直接進入官網
        </a>
      </main>
    </>
  );
}
