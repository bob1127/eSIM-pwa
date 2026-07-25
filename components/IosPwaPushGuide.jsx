"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpOnSquareIcon,
  EllipsisHorizontalIcon,
  PlusCircleIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";
import {
  getBrowserContext,
  getIosAddToHomeHint,
  isStandalonePWA,
} from "../lib/pushSupport";
import PushButton from "./PushButton";

function getIosGuideSteps({ isChromeIOS, isSafari }) {
  if (isChromeIOS) {
    return [
      {
        n: 1,
        title: "加入主畫面",
        desc: "Chrome 右下「⋯」→「分享」→「檢視較多」→「加入主畫面」→ 右上「加入」",
      },
      {
        n: 2,
        title: "從主畫面開啟",
        desc: "關閉 Chrome，點主畫面的 Jeko 圖示（沒有網址列＝成功）",
      },
      {
        n: 3,
        title: "開啟推播",
        desc: "登入會員 → 點「開啟流量提醒通知」→ 允許通知",
      },
    ];
  }

  if (isSafari) {
    return [
      {
        n: 1,
        title: "加入主畫面",
        desc: "Safari 下方點「分享」⎙ →「加入主畫面」→ 右上角「加入」",
      },
      {
        n: 2,
        title: "從主畫面開啟",
        desc: "關閉 Safari，點主畫面的 Jeko 圖示（沒有網址列＝成功）",
      },
      {
        n: 3,
        title: "開啟推播",
        desc: "登入會員 → 點「開啟流量提醒通知」→ 允許通知",
      },
    ];
  }

  return [
    {
      n: 1,
      title: "加入主畫面",
      desc: `${getIosAddToHomeHint()} → 右上角「加入」`,
    },
    {
      n: 2,
      title: "從主畫面開啟",
      desc: "關閉瀏覽器，點主畫面的 Jeko 圖示（沒有網址列＝成功）",
    },
    {
      n: 3,
      title: "開啟推播",
      desc: "登入會員 → 點「開啟流量提醒通知」→ 允許通知",
    },
  ];
}

export default function IosPwaPushGuide({ className = "" }) {
  const [isIOS, setIsIOS] = useState(false);
  const [isChromeIOS, setIsChromeIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [installed, setInstalled] = useState(false);

  const checkInstalled = () => {
    setInstalled(isStandalonePWA());
  };

  useEffect(() => {
    const ctx = getBrowserContext();
    setIsIOS(ctx.isIOS);
    setIsChromeIOS(!!ctx.isChromeIOS);
    setIsSafari(!!ctx.isSafari);
    checkInstalled();
    const onVis = () => checkInstalled();
    window.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      window.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  const steps = useMemo(
    () => getIosGuideSteps({ isChromeIOS, isSafari }),
    [isChromeIOS, isSafari],
  );

  if (!isIOS) return null;

  if (installed) {
    return (
      <div className={className}>
        <div className="mb-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-center">
          <p className="text-sm font-bold text-green-800">
            ✅ App 已安裝，可以開啟推播了
          </p>
        </div>
        <PushButton showDebugPanel={false} />
      </div>
    );
  }

  const browserLabel = isChromeIOS
    ? "Chrome"
    : isSafari
      ? "Safari"
      : "瀏覽器";

  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-2xl border border-[#0A6CD0]/25 bg-white overflow-hidden shadow-sm">
        <div className="bg-[#0A6CD0] px-4 py-3 text-white text-center">
          <p className="text-lg font-black">2 步驟安裝 · 即可收推播</p>
          <p className="text-xs opacity-90 mt-0.5">
            iPhone · {browserLabel}：需先加入主畫面（約 30 秒）
          </p>
        </div>

        <div className="p-4 space-y-3">
          {steps.slice(0, 2).map((step) => (
            <div
              key={step.n}
              className="flex gap-3 rounded-xl bg-[#F0F7FF] border border-[#0A6CD0]/15 p-3"
            >
              <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#0A6CD0] text-white text-sm font-black">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-bold text-stone-900">{step.title}</p>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-dashed border-[#0A6CD0]/40 bg-stone-50 p-3">
            <p className="text-[11px] font-bold text-[#0A6CD0] text-center mb-2">
              {isChromeIOS ? "先點右下「⋯」，再選分享 ↓" : "分享按鈕在這裡 ↓"}
            </p>
            <div className="mx-auto max-w-[200px] rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
              <div className="h-5 rounded bg-stone-100 mb-2" />
              <div className="flex justify-center py-2 border-t border-stone-100 gap-6">
                {isChromeIOS ? (
                  <>
                    <div className="flex flex-col items-center">
                      <div className="h-9 w-9 rounded-lg bg-stone-800 flex items-center justify-center ring-2 ring-[#FF8C00]">
                        <EllipsisHorizontalIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-[9px] font-bold text-[#FF8C00] mt-1">
                        ⋯
                      </span>
                    </div>
                    <div className="flex flex-col items-center opacity-70">
                      <div className="h-9 w-9 rounded-lg bg-[#0A6CD0] flex items-center justify-center">
                        <ArrowUpOnSquareIcon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-[9px] font-bold text-stone-500 mt-1">
                        分享
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="h-9 w-9 rounded-lg bg-[#0A6CD0] flex items-center justify-center ring-2 ring-[#FF8C00]">
                      <ArrowUpOnSquareIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[9px] font-bold text-[#FF8C00] mt-1">
                      分享
                    </span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-stone-500 text-center mt-2 flex items-center justify-center gap-1">
              <PlusCircleIcon className="h-3.5 w-3.5 text-[#0A6CD0]" />
              選單裡找「加入主畫面」
            </p>
          </div>

          <div className="flex gap-3 rounded-xl bg-stone-50 border border-stone-100 p-3 opacity-80">
            <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-stone-300 text-white text-sm font-black">
              3
            </span>
            <div className="flex items-center gap-2">
              <BellAlertIcon className="h-5 w-5 text-[#0A6CD0] shrink-0" />
              <p className="text-xs text-stone-600 leading-relaxed">
                安裝完成後，從主畫面開啟本站 → 登入 → 開啟推播
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2">
          <button
            type="button"
            onClick={checkInstalled}
            className="w-full py-3 rounded-xl bg-[#0A6CD0] hover:bg-[#0851A8] text-white text-sm font-bold shadow-md active:scale-[0.98] transition-all"
          >
            我已從主畫面開啟，繼續開推播 →
          </button>
          <p className="text-[10px] text-stone-400 text-center">
            完成步驟 1–2 後，從主畫面 Jeko 圖示進入，再按上方按鈕
          </p>
        </div>
      </div>
    </div>
  );
}
