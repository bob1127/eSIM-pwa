"use client";

import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

/**
 * 舊 LIFF／圖文連結相容：一律導向 /data-query
 * （開啟流量提醒正式頁面）
 */
export default function LineIccidRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const q = new URLSearchParams();
    Object.entries(router.query).forEach(([key, val]) => {
      if (key === "path") return;
      if (Array.isArray(val)) val.forEach((v) => q.append(key, v));
      else if (val != null && val !== "") q.set(key, String(val));
    });

    if (!q.has("setup") && !q.has("line_bind") && !q.has("iccid")) {
      q.set("setup", "traffic");
    }

    const qs = q.toString();
    router.replace(qs ? `/data-query?${qs}` : "/data-query/");
  }, [router.isReady, router.query, router]);

  return (
    <>
      <Head>
        <title>開啟流量提醒｜Jeko eSIM</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f5f7fa] px-6">
        <LoadingIndicator
          layout="center"
          label="正在開啟流量查詢…"
          size="lg"
          labelClassName="text-[15px] font-bold text-slate-800"
        />
      </main>
    </>
  );
}
