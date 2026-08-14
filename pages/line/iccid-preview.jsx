"use client";

import { useMemo, useState } from "react";
import Head from "next/head";
import LineIccidScreen from "@/components/line/LineIccidScreen";

const MOCK_USAGE = {
  1: {
    remainingMb: 430,
    totalMb: 3072,
    productName: "日本 5 天 3GB",
    expiresAt: "2026-08-20",
  },
  2: {
    remainingMb: 2100,
    totalMb: 5120,
    productName: "韓國 7 天 5GB",
    expiresAt: "2026-08-28",
  },
  3: {
    remainingMb: 800,
    totalMb: 10240,
    productName: "歐洲 15 天 10GB",
    expiresAt: "2026-09-05",
  },
};

const MOCK_ESIMS = [
  {
    topupId: "1",
    productName: "日本 5 天 3GB",
    iccidMasked: "…482193",
  },
  {
    topupId: "2",
    productName: "韓國 7 天 5GB",
    iccidMasked: "…901774",
  },
  {
    topupId: "3",
    productName: "歐洲 15 天 10GB",
    iccidMasked: "…226018",
  },
];

/**
 * 本機設計預覽：不必進 LINE、不必推正式站。
 * 改畫面請編輯 components/line/LineIccidScreen.jsx（真頁會一起變）。
 */
export default function LineIccidPreviewPage() {
  const [esimCount, setEsimCount] = useState("3");
  const [showBindOk, setShowBindOk] = useState(true);
  const [showAlert, setShowAlert] = useState(true);
  const [showUsage, setShowUsage] = useState(false);
  const [showLiffWarn, setShowLiffWarn] = useState(false);
  const [showOrderErr, setShowOrderErr] = useState(false);
  const [showIccidErr, setShowIccidErr] = useState(false);
  const [showBindErr, setShowBindErr] = useState(false);
  const [phoneFrame, setPhoneFrame] = useState(true);
  const [iccid, setIccid] = useState("");
  const [selectedTopupId, setSelectedTopupId] = useState("1");

  const memberEsims = useMemo(() => {
    const n = Number(esimCount);
    if (!n) return [];
    return MOCK_ESIMS.slice(0, n);
  }, [esimCount]);

  const screen = (
    <LineIccidScreen
      iccid={iccid}
      onIccidChange={setIccid}
      liffReady
      liffError={
        showLiffWarn ? "請從官方 LINE「開啟流量提醒」按鈕開啟此頁。" : ""
      }
      loading={false}
      bindLoading={false}
      error={showIccidErr ? "請輸入 18～22 碼數字的 ICCID" : ""}
      result={
        showUsage
          ? {
              alertEnabled: true,
              usageText:
                "方案：日本 5 天 3GB\n剩餘流量：0.42 GB\n到期：2026-08-20",
            }
          : null
      }
      orderAlert={
        showAlert
          ? { ok: true, productName: "日本 5 天 3GB" }
          : null
      }
      orderError={
        showOrderErr ? "請先在上方選擇要監控的 eSIM。" : ""
      }
      memberBindOk={showBindOk}
      lineBindMessage={
        showBindErr ? "LINE 身分驗證失敗，請從圖文選單重新進入。" : ""
      }
      lineBindStatus={showBindErr ? "error" : "idle"}
      authReady
      memberEsims={memberEsims}
      selectedTopupId={selectedTopupId}
      onSelectTopup={setSelectedTopupId}
      activeTopupId={showAlert ? "1" : ""}
      usageById={memberEsims.length ? MOCK_USAGE : {}}
      usageLoading={false}
      onRefreshUsage={() => {}}
      onMemberBindClick={() => {}}
      onOneClickOrder={() => {}}
      onSubmit={(e) => e.preventDefault()}
    />
  );

  return (
    <>
      <Head>
        <title>流量提醒頁｜設計預覽</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="min-h-[100dvh] bg-stone-200">
        <div className="sticky top-0 z-20 border-b border-stone-300 bg-white/95 px-4 py-3 backdrop-blur">
          <p className="text-[13px] font-black text-stone-900">
            流量提醒頁 · 設計預覽（不會真的綁定或推播）
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            http://localhost:3000/line/iccid-preview　改畫面請改
            LineIccidScreen.jsx
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-stone-700">
            <label className="flex items-center gap-1.5">
              卡數
              <select
                value={esimCount}
                onChange={(e) => setEsimCount(e.target.value)}
                className="rounded-md border border-stone-300 px-2 py-1"
              >
                <option value="0">0（訪客）</option>
                <option value="1">1 張</option>
                <option value="2">2 張</option>
                <option value="3">3 張</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showBindOk}
                onChange={(e) => setShowBindOk(e.target.checked)}
              />
              綁定成功
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showAlert}
                onChange={(e) => setShowAlert(e.target.checked)}
              />
              已開提醒
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showUsage}
                onChange={(e) => setShowUsage(e.target.checked)}
              />
              查詢結果
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showLiffWarn}
                onChange={(e) => setShowLiffWarn(e.target.checked)}
              />
              LINE 警告
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showOrderErr}
                onChange={(e) => setShowOrderErr(e.target.checked)}
              />
              選卡錯誤
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showIccidErr}
                onChange={(e) => setShowIccidErr(e.target.checked)}
              />
              ICCID 錯誤
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showBindErr}
                onChange={(e) => setShowBindErr(e.target.checked)}
              />
              綁定失敗
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={phoneFrame}
                onChange={(e) => setPhoneFrame(e.target.checked)}
              />
              手機框
            </label>
          </div>
        </div>

        <div className="flex justify-center px-4 py-8">
          {phoneFrame ? (
            <div className="w-[390px] overflow-hidden rounded-[2.25rem] border-[10px] border-stone-900 bg-black shadow-2xl">
              <div className="h-[100dvh] max-h-[844px] overflow-y-auto bg-[#FFCC00]">
                {screen}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#FFCC00] shadow-lg">
              {screen}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
