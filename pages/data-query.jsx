"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Layout from "./Layout";
import MaterialIcon from "@/components/MaterialIcon";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { motion, AnimatePresence } from "framer-motion";
import PushNotificationSection from "@/components/PushNotificationSection";
import JekoPillButton from "@/components/ui/JekoPillButton";
import { DATA_PLANS, USAGE_ROWS } from "@/lib/dataUsageTable";
import { ICCID_STORAGE_KEY, normalizeIccid } from "@/lib/pushBind";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "query",
    kicker: "USAGE",
    label: "查詢 eSIM 用量",
    short: "查詢用量",
    icon: "analytics",
    headline: "隨時掌握 eSIM 剩餘流量",
    sub: "輸入 ICCID 即可查看方案狀態。數據更新可能有約 30 分鐘延遲。",
  },
  {
    id: "alert",
    kicker: "ALERT",
    label: "開啟流量提醒",
    short: "流量提醒",
    icon: "notifications_active",
    headline: "流量偏低時，自動提醒您",
    sub: "一鍵開啟推播或 LINE 提醒，不必反覆手動查詢。",
  },
  {
    id: "topup",
    kicker: "TOP UP",
    label: "流量即將用盡？",
    short: "流量充值",
    icon: "bolt",
    headline: "無需重買 eSIM，一鍵恢復上網",
    sub: "流量快用完時直接加購，出國行程不中斷。",
  },
  {
    id: "guide",
    kicker: "GUIDE",
    label: "使用教學",
    short: "使用教學",
    icon: "menu_book",
    headline: "四步驟搞懂用量與提醒",
    sub: "從查詢、通知到省流量技巧，一次看懂。",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "輸入 ICCID",
    desc: "在電子郵件或 eSIM 設定中找到 19～20 碼號碼，貼上即可查詢。",
    tab: "query",
  },
  {
    step: "02",
    title: "查看剩餘流量",
    desc: "顯示已用／剩餘流量與效期。數據更新可能有約 30 分鐘延遲。",
    tab: "query",
  },
  {
    step: "03",
    title: "開啟流量通知",
    desc: "一鍵開啟推播。剩餘流量偏低時，系統會自動提醒您。",
    tab: "alert",
  },
  {
    step: "04",
    title: "一鍵恢復流量",
    desc: "流量即將用盡時，無需重買 eSIM，直接充值即可恢復上網。",
    tab: "topup",
    comingSoon: true,
  },
];

function UsageTable() {
  return (
    <section id="usage-table" className="scroll-mt-28">
      <h3 className="text-lg font-black text-slate-900 mb-4">流量用量對照表</h3>

      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-4 font-bold border-b border-slate-200 bg-slate-50 w-[28%]">
                使用情境
              </th>
              {DATA_PLANS.map((plan) => (
                <th
                  key={plan.key}
                  className={cn(
                    "p-4 font-black border-b border-slate-200 text-center",
                    plan.highlight
                      ? "bg-[#1E4AD1] text-white"
                      : "bg-slate-50 text-slate-900",
                  )}
                >
                  <div>{plan.label}</div>
                  <div
                    className={cn(
                      "text-[11px] font-normal mt-0.5",
                      plan.highlight ? "text-white/80" : "text-slate-500",
                    )}
                  >
                    {plan.sub}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {USAGE_ROWS.map((row, idx) => (
              <tr
                key={row.activity}
                className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
              >
                <td className="p-4 border-b border-slate-100">
                  <div className="flex items-start gap-2">
                    <MaterialIcon
                      name={row.icon}
                      size={20}
                      className="shrink-0 mt-0.5 text-[#1E4AD1]"
                    />
                    <div>
                      <div className="font-bold">{row.activity}</div>
                      <div className="text-[11px] mt-0.5 text-slate-500">
                        {row.note}
                      </div>
                    </div>
                  </div>
                </td>
                {DATA_PLANS.map((plan) => {
                  const val = row.values[plan.key];
                  return (
                    <td
                      key={plan.key}
                      className={cn(
                        "p-4 border-b border-slate-100 text-center",
                        plan.highlight && "bg-blue-50/60",
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {val.ok ? (
                          <MaterialIcon
                            name="check_circle"
                            size={20}
                            filled
                            className="text-[#1E4AD1]"
                          />
                        ) : (
                          <MaterialIcon
                            name="cancel"
                            size={20}
                            className="text-slate-300"
                          />
                        )}
                        <span
                          className={cn(
                            "font-bold text-[13px]",
                            val.ok ? "text-slate-800" : "text-slate-400",
                          )}
                        >
                          {val.text}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {DATA_PLANS.map((plan) => (
          <div
            key={plan.key}
            className={cn(
              "rounded-2xl border overflow-hidden bg-white",
              plan.highlight ? "border-[#1E4AD1]" : "border-slate-200",
            )}
          >
            <div
              className={cn(
                "px-5 py-3 font-black flex items-center justify-between",
                plan.highlight
                  ? "bg-[#1E4AD1] text-white"
                  : "bg-slate-50 text-slate-900",
              )}
            >
              <span>{plan.label}</span>
              <span
                className={cn(
                  "text-xs font-normal",
                  plan.highlight ? "text-white/80" : "text-slate-500",
                )}
              >
                {plan.sub}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {USAGE_ROWS.map((row) => {
                const val = row.values[plan.key];
                return (
                  <div
                    key={row.activity}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MaterialIcon
                        name={row.icon}
                        size={18}
                        className="shrink-0 text-[#1E4AD1]"
                      />
                      <span className="text-[13px] font-medium truncate">
                        {row.activity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {val.ok ? (
                        <MaterialIcon
                          name="check_circle"
                          size={16}
                          filled
                          className="text-[#1E4AD1]"
                        />
                      ) : (
                        <MaterialIcon
                          name="cancel"
                          size={16}
                          className="text-slate-300"
                        />
                      )}
                      <span
                        className={cn(
                          "text-[13px] font-bold",
                          val.ok ? "text-slate-800" : "text-slate-400",
                        )}
                      >
                        {val.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: "offline_pin",
            title: "離線地圖",
            desc: "出發前用 Wi-Fi 下載離線地圖，導航幾乎不耗流量",
          },
          {
            icon: "play_disabled",
            title: "關閉自動播放",
            desc: "關閉 Reels／短影音自動播放，可省下大量流量",
          },
          {
            icon: "hd",
            title: "降低串流畫質",
            desc: "調至 480p，同等流量可看更久",
          },
        ].map((tip) => (
          <div
            key={tip.title}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <MaterialIcon
              name={tip.icon}
              size={24}
              className="mb-2 text-[#1E4AD1]"
            />
            <h4 className="font-bold text-sm mb-1">{tip.title}</h4>
            <p className="text-xs leading-relaxed text-slate-500">{tip.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] mt-6 leading-relaxed text-slate-400">
        * 以上為業界平均估算，實際用量受 App
        版本、畫質與背景更新影響，僅供旅遊規劃參考。
      </p>
    </section>
  );
}

export default function DataQueryPage() {
  const [activeTab, setActiveTab] = useState("query");
  const [iccid, setIccid] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [usageResult, setUsageResult] = useState(null);
  const [queryError, setQueryError] = useState("");

  const activeMeta = TABS.find((t) => t.id === activeTab) || TABS[0];

  useEffect(() => {
    const saved = localStorage.getItem(ICCID_STORAGE_KEY);
    if (saved) setIccid(saved);

    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const fromUrl = params.get("iccid");
    if (fromUrl) {
      const normalized = normalizeIccid(fromUrl);
      if (normalized) {
        setIccid(normalized);
        localStorage.setItem(ICCID_STORAGE_KEY, normalized);
        navigator.clipboard?.writeText(normalized).catch(() => {});
        setActiveTab("query");
      }
    }

    if (params.get("setup") === "traffic") {
      setActiveTab("alert");
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const value = normalizeIccid(iccid);
    if (!value) return alert("請輸入 ICCID");
    localStorage.setItem(ICCID_STORAGE_KEY, value);
    setQueryLoading(true);
    setQueryError("");
    setUsageResult(null);
    try {
      const res = await fetch("/api/esim/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iccid: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "查詢失敗");
      setUsageResult(data);
    } catch (err) {
      setQueryError(err.message || "查詢失敗");
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-36 lg:pb-32">
        <div className="max-w-[920px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8 sm:mb-10"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1E4AD1] mb-3">
              Jeko eSIM · Data Center
            </p>
            <h1 className="text-[clamp(1.75rem,5vw,2.75rem)] font-black tracking-tight leading-[1.08] text-slate-900">
              {activeMeta.headline}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-xl leading-relaxed">
              {activeMeta.sub}
            </p>
          </motion.div>

          {/* Panel */}
          <div className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.18)] overflow-hidden min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="p-5 sm:p-8 lg:p-10"
              >
                {activeTab === "query" && (
                  <div id="query-section" className="scroll-mt-28">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-black mb-1">
                          查詢 eSIM 用量
                        </h2>
                        <p className="text-sm text-slate-500 mb-6">
                          輸入 ICCID（19～20 碼）即可查看剩餘流量。
                        </p>

                        <form onSubmit={handleSearch} className="space-y-3">
                          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 focus-within:border-[#1E4AD1]/40 focus-within:ring-2 focus-within:ring-[#1E4AD1]/10 transition-all">
                            <MaterialIcon
                              name="description"
                              size={20}
                              className="shrink-0 mr-3 text-slate-400"
                            />
                            <input
                              type="text"
                              value={iccid}
                              onChange={(e) => setIccid(e.target.value)}
                              placeholder="輸入 ICCID（19～20 碼）"
                              className="flex-1 bg-transparent border-none outline-none text-sm font-medium min-w-0 text-slate-800 placeholder:text-slate-400"
                            />
                          </div>
                          <JekoPillButton type="submit" disabled={queryLoading}>
                            {queryLoading ? "查詢中…" : "立即查詢"}
                          </JekoPillButton>
                        </form>

                        <a
                          href={
                            process.env.NEXT_PUBLIC_LINE_OA_URL ||
                            "https://line.me/R/ti/p/@391huuts"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-slate-600 hover:text-[#1E4AD1]"
                        >
                          <LineIconSvg className="w-4 h-4" />
                          加入官方 LINE，傳「查詢用量」或直接貼 ICCID
                        </a>

                        {queryError && (
                          <p className="mt-4 text-sm flex items-center gap-1 font-medium text-rose-600">
                            <MaterialIcon name="error" size={16} />
                            {queryError}
                          </p>
                        )}

                        {usageResult && (
                          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-800">
                            <p className="font-bold mb-2 flex items-center gap-2 text-[#1E4AD1]">
                              <MaterialIcon name="analytics" size={18} />
                              查詢結果
                            </p>
                            {usageResult.productName && (
                              <p>方案：{usageResult.productName}</p>
                            )}
                            {usageResult.remainingMb != null ? (
                              <p className="font-bold mt-1">
                                剩餘流量：約 {usageResult.remainingMb} MB
                                {usageResult.totalMb != null &&
                                  ` / ${usageResult.totalMb} MB`}
                              </p>
                            ) : (
                              <p className="mt-1 text-slate-500">
                                {usageResult.note}
                              </p>
                            )}
                            {usageResult.expiresAt && (
                              <p className="text-xs mt-1 text-slate-500">
                                有效期限：{usageResult.expiresAt}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="lg:w-[42%] shrink-0">
                        <div className="rounded-2xl bg-slate-900 text-white p-5 sm:p-6 relative overflow-hidden">
                          <div
                            className="absolute inset-0 opacity-30 bg-cover bg-center"
                            style={{
                              backgroundImage: "url('/images/hero-img.jpg')",
                            }}
                            aria-hidden
                          />
                          <div
                            className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/75 to-[#1E4AD1]/40"
                            aria-hidden
                          />
                          <div className="relative z-10">
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-full mb-3">
                              Tip
                            </span>
                            <p className="text-sm leading-relaxed text-white/90">
                              ICCID 可在 eSIM 設定或訂單 Email
                              中找到。查詢結果僅供參考，建議同時查看手機內建用量。
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                          <h3 className="text-sm font-bold mb-2">查詢前請注意</h3>
                          <ul className="text-[13px] space-y-1.5 text-slate-500 leading-relaxed">
                            <li>時間顯示為台灣時間（UTC+8）</li>
                            <li>流量數據非即時，通常延遲 30 分鐘至數小時</li>
                            <li>建議同時參考手機內建行動數據用量</li>
                          </ul>
                          <Link
                            href="/support"
                            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#1E4AD1] hover:underline"
                          >
                            常見問題
                            <MaterialIcon name="arrow_forward" size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "alert" && (
                  <div id="push-notification-section" className="scroll-mt-28">
                    <h2 className="text-xl font-black mb-1">開啟流量提醒</h2>
                    <p className="text-sm text-slate-500 mb-6">
                      綁定 eSIM 後，剩餘流量偏低時將自動推播通知。
                    </p>
                    <PushNotificationSection
                      onIccidBound={(boundIccid) => setIccid(boundIccid)}
                      initialIccid={iccid}
                      variant="banner"
                    />
                  </div>
                )}

                {activeTab === "topup" && (
                  <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                    <div className="flex-1">
                      <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full mb-4">
                        即將上線
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black mb-2">
                        流量即將用盡？
                      </h2>
                      <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-md">
                        無需重新購買 eSIM，一鍵恢復原有流量，出國上網不中斷。
                      </p>
                      <JekoPillButton
                        type="button"
                        onClick={() => alert("此功能即將上線")}
                      >
                        前往充值方案
                      </JekoPillButton>
                    </div>
                    <div className="lg:w-[45%] aspect-[4/3] rounded-2xl overflow-hidden relative">
                      <div
                        className="absolute inset-0 bg-cover bg-[70%_20%]"
                        style={{
                          backgroundImage:
                            "url('/images/7bf7a01a-6740-4390-800c-566683623985.png')",
                        }}
                        aria-hidden
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"
                        aria-hidden
                      />
                    </div>
                  </div>
                )}

                {activeTab === "guide" && (
                  <div>
                    <h2 className="text-xl font-black mb-1">使用教學</h2>
                    <p className="text-sm text-slate-500 mb-6">
                      四步驟完成查詢、提醒與省流量規劃。
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                      {HOW_IT_WORKS.map((item) => (
                        <button
                          key={item.step}
                          type="button"
                          onClick={() =>
                            !item.comingSoon && setActiveTab(item.tab)
                          }
                          className={cn(
                            "rounded-2xl border p-5 text-left transition-all",
                            item.comingSoon
                              ? "border-slate-200 bg-slate-50/50 cursor-default"
                              : "border-slate-200 bg-white hover:border-[#1E4AD1]/30 hover:shadow-md cursor-pointer",
                          )}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black text-white bg-[#1E4AD1]">
                              {item.step}
                            </span>
                            {item.comingSoon && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                                即將上線
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold mb-2">
                            {item.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-slate-500">
                            {item.desc}
                          </p>
                          {!item.comingSoon && (
                            <span className="mt-3 inline-block text-sm font-bold text-[#1E4AD1]">
                              前往 →
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <UsageTable />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* SwiftPay 風格底部 Tab */}
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 px-3 sm:px-4">
          <div className="max-w-[920px] mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full border px-2 py-2.5 sm:py-3 text-center transition-all duration-200",
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/15 scale-[1.02]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] leading-none",
                        active ? "text-white/70" : "text-slate-400",
                      )}
                    >
                      {tab.kicker}
                    </span>
                    <span className="block text-[11px] sm:text-[13px] font-semibold leading-snug mt-1 px-0.5">
                      {tab.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
