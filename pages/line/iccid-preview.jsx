"use client";

import { useMemo, useState } from "react";
import Head from "next/head";
import Layout from "../Layout";
import LineIccidScreen from "@/components/line/LineIccidScreen";
import { isValidIccid, normalizeIccid } from "@/lib/pushBind";

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
 * 設計預覽：假資料，但綁定流程狀態機與正式頁一致
 * 訪客 → 登入 → 綁定 LINE →（選 eSIM）→ 開啟提醒
 * 訪客也可走 ICCID 查詢（不需綁定）
 */
export default function LineIccidPreviewPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [esimCount, setEsimCount] = useState("0");
  const [memberBindOk, setMemberBindOk] = useState(false);
  const [lineBindStatus, setLineBindStatus] = useState("idle"); // idle|loading|success|error
  const [lineBindMessage, setLineBindMessage] = useState("");
  const [orderAlert, setOrderAlert] = useState(null);
  const [orderError, setOrderError] = useState("");
  const [bindLoading, setBindLoading] = useState(false);
  const [iccid, setIccid] = useState("");
  const [iccidError, setIccidError] = useState("");
  const [iccidLoading, setIccidLoading] = useState(false);
  const [iccidResult, setIccidResult] = useState(null);
  const [selectedTopupId, setSelectedTopupId] = useState("");
  const [activeTopupId, setActiveTopupId] = useState("");
  const [phoneFrame, setPhoneFrame] = useState(false);
  const [forceBindFail, setForceBindFail] = useState(false);

  const memberEsims = useMemo(() => {
    if (!isLoggedIn) return [];
    const n = Number(esimCount);
    if (!n) return [];
    return MOCK_ESIMS.slice(0, n);
  }, [esimCount, isLoggedIn]);

  const usageById = useMemo(() => {
    if (!memberEsims.length) return {};
    const out = {};
    for (const e of memberEsims) {
      const u = MOCK_USAGE[e.topupId];
      if (u) out[e.topupId] = u;
    }
    return out;
  }, [memberEsims]);

  const resetMemberFlow = () => {
    setMemberBindOk(false);
    setLineBindStatus("idle");
    setLineBindMessage("");
    setOrderAlert(null);
    setOrderError("");
    setBindLoading(false);
    setSelectedTopupId("");
    setActiveTopupId("");
  };

  const login = () => {
    setIsLoggedIn(true);
    setEsimCount((c) => {
      const next = c === "0" ? "3" : c;
      const list = MOCK_ESIMS.slice(0, Number(next));
      if (list.length === 1) setSelectedTopupId(String(list[0].topupId));
      else if (list.length > 1) setSelectedTopupId("1");
      return next;
    });
    setModeHintAfterLogin();
  };

  const [modeHint, setModeHint] = useState(
    "流程：訪客 ICCID｜或 登入 → 綁定 → 選一張 eSIM → 開啟提醒（一次一張）",
  );

  function setModeHintAfterLogin() {
    setModeHint("已登入。下一步：點「綁定」（只連會員，不會一次開全部通知）。");
  }

  const logout = () => {
    setIsLoggedIn(false);
    setEsimCount("0");
    resetMemberFlow();
    setIccid("");
    setIccidError("");
    setIccidResult(null);
    setModeHint("已登出。訪客可改用 ICCID 查詢，或重新登入。");
  };

  /** 對齊正式頁：未登入→去登入；已登入→跑綁定 */
  const handleMemberBindClick = () => {
    setOrderError("");
    if (!isLoggedIn) {
      login();
      return;
    }
    if (memberBindOk) return;
    if (forceBindFail) {
      setLineBindStatus("error");
      setLineBindMessage("LINE 身分驗證失敗，請從圖文選單重新進入。");
      setMemberBindOk(false);
      return;
    }
    setLineBindStatus("loading");
    setLineBindMessage("");
    window.setTimeout(() => {
      setLineBindStatus("success");
      setLineBindMessage(
        "已連結會員。請選一張 eSIM，再開啟流量提醒（一次只監控一張）。",
      );
      setMemberBindOk(true);
      setModeHint("綁定成功。選一張 eSIM → 點「開啟流量通知」。");
      if (memberEsims.length === 1) {
        setSelectedTopupId(String(memberEsims[0].topupId));
      }
    }, 700);
  };

  /** 對齊正式頁：須登入 + 已綁定 +（多卡須選） */
  const handleOneClickOrder = () => {
    setOrderError("");
    setBindLoading(true);
    window.setTimeout(() => {
      try {
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
        const selected =
          memberEsims.find(
            (e) => String(e.topupId) === String(selectedTopupId),
          ) || memberEsims[0];
        setOrderAlert({
          ok: true,
          productName: selected?.productName || "已選 eSIM",
          webPreview: true,
        });
        setActiveTopupId(String(selected?.topupId || ""));
        setModeHint(
          `已為此張開啟提醒（模擬）：${selected?.productName || "eSIM"}。改選其他卡再開啟，即可切換監控。`,
        );
      } finally {
        setBindLoading(false);
      }
    }, 450);
  };

  const handleIccidSubmit = (e) => {
    e.preventDefault();
    setIccidError("");
    setIccidResult(null);
    const normalized = normalizeIccid(iccid);
    if (!isValidIccid(normalized)) {
      setIccidError("請輸入 18～22 碼數字的 ICCID");
      return;
    }
    setIccidLoading(true);
    window.setTimeout(() => {
      setIccidLoading(false);
      setIccidResult({
        alertEnabled: true,
        usageText: `方案：ICCID 查詢（模擬）\n卡號：…${normalized.slice(-6)}\n剩餘流量：1.2 GB\n到期：2026-09-01`,
        usage: {
          remainingMb: 1200,
          totalMb: 3072,
          productName: "ICCID 查詢方案",
          expiresAt: "2026-09-01",
        },
      });
      setOrderAlert({
        ok: true,
        productName: "ICCID 查詢方案",
      });
      setModeHint("ICCID 路徑：訪客也可查詢並開提醒（模擬），不必先綁會員。");
    }, 500);
  };

  const screen = (
    <LineIccidScreen
      pageMode="web"
      modeHint={modeHint}
      iccid={iccid}
      onIccidChange={(v) => {
        setIccid(v);
        setIccidError("");
      }}
      liffReady
      liffError=""
      loading={iccidLoading}
      bindLoading={bindLoading}
      error={iccidError}
      result={iccidResult}
      orderAlert={orderAlert}
      orderError={orderError}
      memberBindOk={isLoggedIn && memberBindOk}
      lineBindMessage={lineBindMessage}
      lineBindStatus={lineBindStatus}
      authReady
      isLoggedIn={isLoggedIn}
      memberName={isLoggedIn ? "Bob" : ""}
      memberEsims={memberEsims}
      selectedTopupId={selectedTopupId}
      onSelectTopup={(id) => {
        setSelectedTopupId(id);
        setOrderError("");
      }}
      activeTopupId={activeTopupId}
      usageById={{
        ...usageById,
        ...(iccidResult?.usage ? { iccid: iccidResult.usage } : {}),
      }}
      usageLoading={false}
      onRefreshUsage={() => {}}
      onMemberBindClick={handleMemberBindClick}
      onOneClickOrder={handleOneClickOrder}
      onSubmit={handleIccidSubmit}
      onLoginClick={login}
      onLogoutClick={logout}
    />
  );

  return (
    <>
      <Head>
        <title>流量提醒頁｜設計預覽</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <Layout>
        <div className="min-h-[100dvh] bg-[#F5F7FA]">
          <div className="sticky top-0 z-[900] border-b border-stone-300 bg-white/95 px-4 py-3 backdrop-blur">
            <p className="text-[13px] font-black text-stone-900">
              流量提醒 · 流程預覽（假資料，邏輯同正式站）
            </p>
            <p className="mt-0.5 text-[11px] text-stone-500">
              請用畫面內按鈕：登入 → 綁定 → 選一張 → 開提醒（一次一張）；或訪客走
              ICCID。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-stone-700">
              <span className="rounded-md bg-stone-100 px-2 py-1 font-bold">
                {isLoggedIn ? "已登入" : "訪客"}
                {memberBindOk ? " · 已綁定" : ""}
                {orderAlert?.ok ? " · 已開提醒" : ""}
              </span>
              <label className="flex items-center gap-1.5">
                模擬訂單數
                <select
                  value={esimCount}
                  disabled={!isLoggedIn}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEsimCount(v);
                    const list = MOCK_ESIMS.slice(0, Number(v));
                    setSelectedTopupId(
                      list.length === 1
                        ? String(list[0].topupId)
                        : list.length
                          ? String(list[0].topupId)
                          : "",
                    );
                    setOrderAlert(null);
                    setActiveTopupId("");
                  }}
                  className="rounded-md border border-stone-300 px-2 py-1 disabled:opacity-40"
                >
                  <option value="0">0 張</option>
                  <option value="1">1 張</option>
                  <option value="2">2 張</option>
                  <option value="3">3 張</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={forceBindFail}
                  onChange={(e) => setForceBindFail(e.target.checked)}
                />
                模擬綁定失敗
              </label>
              <button
                type="button"
                className="rounded-md border border-stone-300 px-2 py-1"
                onClick={logout}
              >
                重設為訪客
              </button>
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

          {phoneFrame ? (
            <div className="flex justify-center px-4 py-8">
              <div className="w-[390px] overflow-hidden rounded-[2.25rem] border-[10px] border-stone-900 bg-black shadow-2xl">
                <div className="max-h-[844px] overflow-y-auto">{screen}</div>
              </div>
            </div>
          ) : (
            <div className="py-6 sm:py-10">
              <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[28px] shadow-xl">
                {screen}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
