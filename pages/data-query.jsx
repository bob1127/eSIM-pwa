"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Layout from "./Layout";
import MaterialIcon from "@/components/MaterialIcon";
import { motion, AnimatePresence } from "framer-motion";
import MemberEsimQuerySheet from "@/components/MemberEsimQuerySheet";
import { DATA_PLANS, USAGE_ROWS } from "@/lib/dataUsageTable";
import { ICCID_STORAGE_KEY, normalizeIccid } from "@/lib/pushBind";
import { buildLoginUrl } from "@/lib/authRedirect";
import { useAuth } from "@/hooks/useAuth";
import { useLineBind } from "@/hooks/useLineBind";
import {
  canShowEsimUsageStats,
  isEsimNotInstalledForUsage,
  ESIM_NOT_INSTALLED_USAGE_MESSAGE,
} from "@/lib/esimInstallStatus";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "query",
    label: "查詢用量",
    short: "查詢",
    icon: "analytics",
    headline: "查詢 eSIM 用量",
    sub: "輸入 ICCID，立刻掌握剩餘流量。",
  },
  {
    id: "guide",
    label: "使用教學",
    short: "教學",
    icon: "menu_book",
    headline: "四步驟搞懂用量與提醒",
    sub: "從查詢到開啟流量通知。",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "輸入 ICCID",
    desc: "在電子郵件或 eSIM 設定中找到 19～20 碼號碼，貼上即可查詢。",
    tab: "query",
    tint: "bg-[#EAF0FB]",
  },
  {
    step: "02",
    title: "安裝並啟用 eSIM",
    desc: "掃描 QR 安裝到手機並開啟行動數據／漫遊。未安裝前無法查詢流量。",
    tab: "query",
    tint: "bg-[#EEF1F6]",
  },
  {
    step: "03",
    title: "查看剩餘流量",
    desc: "安裝後約 30–60 分鐘可查到用量；手機顯示通常略高於網站數字。",
    tab: "query",
    tint: "bg-[#EEF1F6]",
  },
  {
    step: "04",
    title: "開啟流量通知",
    desc: "在查詢用量列表點「開啟提醒」，流量偏低時會自動推播通知。",
    tab: "query",
    tint: "bg-[#EAF0FB]",
  },
];

/** 對齊感謝頁 CheckoutTicketReceipt：奶油紙底 + 票券藍 + 行動深藍 */
const CARD =
  "rounded-[28px] border border-[#1e4ad1]/10 bg-white shadow-[0_12px_40px_-24px_rgba(30,74,209,0.28)]";

function StatusPill({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-[#EAF0FB] text-[#1e4ad1]",
    mint: "bg-[#EAF0FB] text-[#1e4ad1]",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-white/80 text-slate-600 border border-slate-200/80",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
        tones[tone] || tones.blue,
      )}
    >
      {children}
    </span>
  );
}

function SheetHandle({ light = false }) {
  return (
    <div className="flex justify-center pt-1 pb-4" aria-hidden>
      <span
        className={cn(
          "h-1 w-10 rounded-full",
          light ? "bg-white/45" : "bg-slate-300",
        )}
      />
    </div>
  );
}

function UsageTable() {
  return (
    <section id="usage-table" className="scroll-mt-28 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          流量用量對照表
        </h3>
        <StatusPill tone="slate">參考估算</StatusPill>
      </div>

      <div className="hidden md:block overflow-x-auto rounded-[24px] border border-slate-200/80 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-4 font-bold border-b border-slate-100 bg-[#F7F8FA] w-[28%]">
                使用情境
              </th>
              {DATA_PLANS.map((plan) => (
                <th
                  key={plan.key}
                  className={cn(
                    "p-4 font-black border-b border-slate-100 text-center",
                    plan.highlight
                      ? "bg-[#1e4ad1] text-white"
                      : "bg-[#F7F8FA] text-slate-900",
                  )}
                >
                  <div>{plan.label}</div>
                  <div
                    className={cn(
                      "text-[11px] font-normal mt-0.5",
                      plan.highlight ? "text-white/70" : "text-slate-500",
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
                className={idx % 2 === 0 ? "bg-white" : "bg-[#F7F8FA]/70"}
              >
                <td className="p-4 border-b border-slate-100">
                  <div className="flex items-start gap-2">
                    <MaterialIcon
                      name={row.icon}
                      size={20}
                      className="shrink-0 mt-0.5 text-[#1e4ad1]"
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
                        plan.highlight && "bg-[#eff6ff]",
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {val.ok ? (
                          <MaterialIcon
                            name="check_circle"
                            size={20}
                            filled
                            className="text-[#1e4ad1]"
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
              CARD,
              "overflow-hidden bg-white",
              plan.highlight && "ring-1 ring-[#1e4ad1]/20",
            )}
          >
            <div
              className={cn(
                "px-5 py-3.5 font-black flex items-center justify-between",
                plan.highlight
                  ? "bg-[#1e4ad1] text-white"
                  : "bg-[#F7F8FA] text-slate-900",
              )}
            >
              <span>{plan.label}</span>
              <span
                className={cn(
                  "text-xs font-normal",
                  plan.highlight ? "text-white/70" : "text-slate-500",
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
                        className="shrink-0 text-slate-600"
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
                          className="text-[#1e4ad1]"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <div key={tip.title} className={cn(CARD, "bg-white p-5")}>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF0FB]">
              <MaterialIcon
                name={tip.icon}
                size={20}
                className="text-slate-800"
              />
            </div>
            <h4 className="font-bold text-sm mb-1">{tip.title}</h4>
            <p className="text-xs leading-relaxed text-slate-500">{tip.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-400">
        * 以上為業界平均估算，實際用量受 App
        版本、畫質與背景更新影響，僅供旅遊規劃參考。
      </p>
    </section>
  );
}

function UsageResultSheet({ usageResult }) {
  if (!usageResult) return null;

  if (isEsimNotInstalledForUsage(usageResult)) {
    return (
      <div className={cn(CARD, "mt-5 bg-amber-50 border-amber-200 overflow-hidden")}>
        <SheetHandle />
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <MaterialIcon name="sim_card_alert" size={22} />
            </div>
            <div>
              <h3 className="text-[17px] font-black text-amber-950">
                尚未安裝 eSIM
              </h3>
              <p className="text-[13px] text-amber-900/90 mt-2 leading-relaxed">
                {ESIM_NOT_INSTALLED_USAGE_MESSAGE}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canShowEsimUsageStats(usageResult)) {
    return (
      <div className={cn(CARD, "mt-5 bg-white overflow-hidden")}>
        <SheetHandle />
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            {usageResult.note ||
              "暫無法確認用量，請確認 eSIM 已安裝並稍後再試。"}
          </p>
        </div>
      </div>
    );
  }

  const remaining = usageResult.remainingMb;
  const total = usageResult.totalMb;
  const hasMb = remaining != null;
  const pct =
    hasMb && total != null && total > 0
      ? Math.max(0, Math.min(100, Math.round((remaining / total) * 100)))
      : null;

  return (
    <div className={cn(CARD, "mt-5 bg-white overflow-hidden")}>
      <SheetHandle />
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="text-[17px] font-black text-slate-900 truncate">
              {usageResult.productName || "eSIM 用量"}
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">即時查詢結果</p>
          </div>
          <StatusPill
            tone={hasMb && pct != null && pct <= 20 ? "amber" : "mint"}
          >
            {hasMb && pct != null && pct <= 20 ? "偏低" : "已更新"}
          </StatusPill>
        </div>

        {hasMb ? (
          <p className="text-[34px] sm:text-[40px] font-black tracking-tight text-slate-900 leading-none mt-3">
            {remaining}
            <span className="ml-1.5 text-base font-bold text-slate-400">
              MB
            </span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            {usageResult.note || "暫無流量數值"}
          </p>
        )}

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-[13px]">
          {total != null && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">總流量</span>
              <span className="font-bold text-slate-900">{total} MB</span>
            </div>
          )}
          {pct != null && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">剩餘比例</span>
              <span className="font-bold text-slate-900">{pct}%</span>
            </div>
          )}
          {usageResult.expiresAt && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">有效期限</span>
              <span className="font-bold text-slate-900">
                {usageResult.expiresAt}
              </span>
            </div>
          )}
        </div>

        {pct != null && (
          <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct <= 20 ? "bg-amber-500" : "bg-[#1e8fff]",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DataQueryPage() {
  const { authReady, isLoggedIn } = useAuth();
  const { status: lineBindStatus, message: lineBindMessage } = useLineBind();
  const [activeTab, setActiveTab] = useState("query");
  const [iccid, setIccid] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [usageResult, setUsageResult] = useState(null);
  const [queryError, setQueryError] = useState("");

  const loginHref = useMemo(() => buildLoginUrl("/data-query/"), []);

  const activeMeta = TABS.find((t) => t.id === activeTab) || TABS[0];
  // Node 與瀏覽器的 zh-TW 日期格式（星期前是否加空格）不一致，
  // SSR 直接輸出會造成 hydration mismatch，改為掛載後才產生。
  const [todayLabel, setTodayLabel] = useState("");
  useEffect(() => {
    try {
      setTodayLabel(
        new Intl.DateTimeFormat("zh-TW", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date()),
      );
    } catch {
      /* 不支援 Intl 時不顯示日期 */
    }
  }, []);

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
      }
    }

    // 舊連結 ?setup=traffic → 留在查詢用量，直接操作「開啟提醒」
    if (params.get("setup") === "traffic" || params.get("bind") === "ok") {
      setActiveTab("query");
      window.setTimeout(() => {
        document
          .getElementById("query-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
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
      if (isEsimNotInstalledForUsage(data)) {
        setUsageResult(data);
        setQueryError(ESIM_NOT_INSTALLED_USAGE_MESSAGE);
        return;
      }
      setUsageResult(data);
    } catch (err) {
      setQueryError(err.message || "查詢失敗");
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <Layout>
      <div className="data-query-page text-slate-900 pb-8 md:pb-12">
        <div className="max-w-[920px] mx-auto px-4 sm:px-6 pt-7 sm:pt-10">
          {/* Header — job-board / sheet language */}
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[clamp(2rem,6vw,2.75rem)] font-black tracking-tight leading-none text-slate-900">
                  你好
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <span className="h-2 w-2 rounded-full bg-[#1e8fff]" />
                    流量提醒
                  </span>
                  {todayLabel ? (
                    <span className="text-[12px] text-slate-400">
                      更新於 {todayLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Segment tabs */}
            <div className="mt-6 flex items-center gap-5 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "shrink-0 pb-2 text-[15px] font-bold transition-colors border-b-2",
                      active
                        ? "text-[#1e4ad1] border-[#1e4ad1]"
                        : "text-slate-400 border-transparent hover:text-slate-600",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </motion.header>

          {lineBindMessage ? (
            <div
              className={cn(
                "mb-4 rounded-2xl border px-4 py-3 text-[13px] font-semibold leading-relaxed",
                lineBindStatus === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-[#1e4ad1]/15 bg-[#EAF0FB] text-[#1e4ad1]",
              )}
              role="status"
            >
              {lineBindMessage}
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              {activeTab === "query" && (
                <div id="query-section" className="scroll-mt-28 space-y-4">
                  {authReady && isLoggedIn ? (
                    <MemberEsimQuerySheet />
                  ) : null}

                  {!isLoggedIn ? (
                    <div
                      className={cn(CARD, "bg-[#1e8fff] p-5 sm:p-7 text-white")}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#1e4ad1]">
                          ICCID
                        </span>
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#1e4ad1]">
                          即時查詢
                        </span>
                        <span className="ml-auto text-[12px] font-medium text-white/80">
                          約 30 分延遲
                        </span>
                      </div>

                      <div className="flex items-start gap-3 mb-5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                          <MaterialIcon name="sim_card" size={22} />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-xl font-black text-white tracking-tight">
                            {activeMeta.headline}
                          </h2>
                          <p className="text-sm text-white/85 mt-0.5">
                            {activeMeta.sub}
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSearch} className="space-y-3">
                        <div className="flex items-center rounded-2xl border border-white/30 bg-white px-4 py-3.5 shadow-sm focus-within:ring-2 focus-within:ring-white/40">
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
                            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold min-w-0 text-slate-800 placeholder:text-slate-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <Link
                            href={loginHref}
                            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-[#1e4ad1] border border-white shadow-sm"
                          >
                            登入會員
                          </Link>
                          <button
                            type="submit"
                            disabled={queryLoading}
                            className="inline-flex items-center justify-center rounded-2xl bg-[#1e4ad1] px-4 py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                          >
                            {queryLoading ? "查詢中…" : "立即查詢"}
                          </button>
                        </div>
                        <p className="text-center text-[12px] text-white/80 leading-snug">
                          登入後留在本頁，一鍵查看您的 eSIM 流量
                        </p>
                      </form>

                      {queryError && (
                        <p className="mt-4 text-sm flex items-center gap-1.5 font-semibold text-white bg-rose-600/90 rounded-xl px-3 py-2">
                          <MaterialIcon name="error" size={16} />
                          {queryError}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {!isLoggedIn ? (
                    <UsageResultSheet usageResult={usageResult} />
                  ) : null}

                  <div className={cn(CARD, "bg-white p-5 sm:p-6")}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black text-slate-900">
                        查詢前請注意
                      </h3>
                      <StatusPill tone="slate">UTC+8</StatusPill>
                    </div>
                    <ul className="text-[13px] space-y-2 text-slate-500 leading-relaxed">
                      <li className="flex gap-2">
                        <MaterialIcon
                          name="schedule"
                          size={16}
                          className="shrink-0 mt-0.5 text-slate-400"
                        />
                        時間顯示為台灣時間；用量更新通常需間隔 30–60 分鐘；手機顯示用量通常會略高於此數字
                      </li>
                      <li className="flex gap-2">
                        <MaterialIcon
                          name="phone_iphone"
                          size={16}
                          className="shrink-0 mt-0.5 text-slate-400"
                        />
                        建議同時參考手機內建行動數據用量
                      </li>
                    </ul>
                    <Link
                      href="/support"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-slate-900"
                    >
                      常見問題
                      <MaterialIcon name="arrow_forward" size={16} />
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === "guide" && (
                <div className="space-y-4">
                  <div className={cn(CARD, "bg-white p-5 sm:p-6")}>
                    <SheetHandle />
                    <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                      {activeMeta.headline}
                    </h2>
                    <p className="text-sm text-slate-500 mb-5">
                      {activeMeta.sub}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {HOW_IT_WORKS.map((item) => (
                        <button
                          key={item.step}
                          type="button"
                          onClick={() =>
                            !item.comingSoon && setActiveTab(item.tab)
                          }
                          className={cn(
                            "rounded-[24px] p-5 text-left transition-transform active:scale-[0.99]",
                            item.tint,
                            item.comingSoon
                              ? "cursor-default opacity-80"
                              : "cursor-pointer hover:brightness-[0.98]",
                          )}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black bg-[#1e4ad1] text-white">
                              {item.step}
                            </span>
                            {item.comingSoon && (
                              <StatusPill tone="amber">即將上線</StatusPill>
                            )}
                          </div>
                          <h3 className="text-base font-black mb-1.5 text-slate-900">
                            {item.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-slate-600">
                            {item.desc}
                          </p>
                          {!item.comingSoon && (
                            <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                              前往
                              <MaterialIcon name="arrow_forward" size={16} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={cn(CARD, "bg-white p-5 sm:p-6")}>
                    <UsageTable />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <style jsx global>{`
        .data-query-page {
          background-color: #f4f1ea;
          background-image: repeating-linear-gradient(
            transparent,
            transparent 1px,
            rgb(54 65 83 / 0.12) 0 3px
          );
        }
      `}</style>
    </Layout>
  );
}
