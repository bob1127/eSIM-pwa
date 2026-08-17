"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Layout from "./Layout";
import MaterialIcon from "@/components/MaterialIcon";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import PushNotificationSection from "@/components/PushNotificationSection";
import { DATA_PLANS, USAGE_ROWS } from "@/lib/dataUsageTable";
import { ICCID_STORAGE_KEY, normalizeIccid } from "@/lib/pushBind";

/** TSUNORU 風格：主藍／粉 CTA／中性灰（少色） */
const C = {
  primary: "#3768C7",
  primaryDark: "#2B56A8",
  primarySoft: "#EAF0FB",
  cta: "#E9546B",
  accent: "#E8C547",
  page: "#F5F5F5",
  card: "#FFFFFF",
  text: "#333333",
  muted: "#777777",
  line: "#E8E8E8",
};

function PrimaryButton({
  children,
  type = "button",
  disabled,
  showArrow = true,
  className = "",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 text-white text-sm font-bold rounded-lg px-6 py-3 transition-colors disabled:opacity-60",
        className,
      )}
      style={{ backgroundColor: C.primary }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = C.primaryDark;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = C.primary;
      }}
      {...props}
    >
      {children}
      {showArrow && <MaterialIcon name="arrow_forward" size={18} />}
    </button>
  );
}

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "輸入 ICCID",
    desc: "在電子郵件或 eSIM 設定中找到 19～20 碼號碼，貼上即可查詢。",
    link: "#query-section",
    linkText: "立即查詢",
  },
  {
    step: "02",
    title: "查看剩餘流量",
    desc: "顯示已用／剩餘流量與效期。數據更新可能有約 30 分鐘延遲。",
    link: "#usage-table",
    linkText: "用量對照",
  },
  {
    step: "03",
    title: "開啟流量通知",
    desc: "一鍵開啟推播。剩餘流量偏低時，系統會自動提醒您。",
    link: "#push-notification-section",
    linkText: "開啟通知",
  },
  {
    step: "04",
    title: "一鍵恢復流量",
    desc: "流量即將用盡時，無需重買 eSIM，直接充值即可恢復上網。",
    linkText: "即將上線",
    comingSoon: true,
  },
];

export default function DataQueryPage() {
  const [iccid, setIccid] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [usageResult, setUsageResult] = useState(null);
  const [queryError, setQueryError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(ICCID_STORAGE_KEY);
    if (saved) setIccid(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("setup") !== "traffic") return;

    const timer = window.setTimeout(() => {
      document
        .getElementById("push-notification-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 450);

    return () => window.clearTimeout(timer);
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
      <div
        className="min-h-screen pb-20 font-sans"
        style={{ backgroundColor: C.page, color: C.text }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-[1100px] w-[92%] mx-auto"
        >
          {/* 主功能雙卡（相片 Hero，對齊原設計） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">
            {/* 查詢 */}
            <section
              id="query-section"
              className="relative rounded-2xl overflow-hidden scroll-mt-28 min-h-[420px] md:min-h-[460px] flex flex-col justify-end"
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: "url('/images/hero-img.jpg')",
                }}
                aria-hidden
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(12,18,32,0.45) 0%, rgba(12,18,32,0.72) 42%, rgba(8,12,22,0.92) 100%)",
                }}
                aria-hidden
              />
              <span
                className="absolute top-4 left-4 z-10 text-[11px] font-bold text-white px-2.5 py-1 rounded-sm tracking-wide"
                style={{ backgroundColor: C.cta }}
              >
                推薦
              </span>
              <p
                className="absolute top-10 right-5 z-[1] text-white/70 text-[15px] md:text-base rotate-[-8deg] select-none pointer-events-none"
                style={{
                  fontFamily: '"Segoe Print","Bradley Hand",cursive',
                  textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                }}
                aria-hidden
              >
                eSIM 用量查詢 ↓
              </p>

              <div className="relative z-10 px-5 sm:px-7 pb-6 pt-16 text-white">
                <h1 className="text-[26px] md:text-[30px] font-black tracking-tight mb-2">
                  查詢 eSIM 用量
                </h1>
                <p className="text-[13px] md:text-sm leading-relaxed text-white/85 mb-5 max-w-md">
                  輸入 ICCID 即可查看剩餘流量與方案狀態，數據更新可能有 30
                  分鐘延遲。
                </p>

                <form onSubmit={handleSearch} className="space-y-3">
                  <div className="flex items-center rounded-xl px-4 py-3.5 bg-white shadow-sm">
                    <MaterialIcon
                      name="description"
                      size={20}
                      className="shrink-0 mr-3"
                      style={{ color: "#9CA3AF" }}
                    />
                    <input
                      type="text"
                      value={iccid}
                      onChange={(e) => setIccid(e.target.value)}
                      placeholder="輸入 ICCID（19～20 碼）"
                      className="flex-1 bg-transparent border-none outline-none text-sm font-medium min-w-0 text-stone-800 placeholder:text-stone-400"
                    />
                  </div>
                  <PrimaryButton
                    type="submit"
                    disabled={queryLoading}
                    className="w-full rounded-xl py-3.5"
                  >
                    {queryLoading ? "查詢中…" : "立即查詢"}
                  </PrimaryButton>
                </form>

                <a
                  href={
                    process.env.NEXT_PUBLIC_LINE_OA_URL ||
                    "https://line.me/R/ti/p/@391huuts"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-white/90 hover:text-white"
                >
                  <LineIconSvg className="w-4 h-4" />
                  加入官方 LINE，傳「查詢用量」或直接貼上 ICCID 也可查詢
                </a>

                {queryError && (
                  <p className="mt-3 text-sm flex items-center gap-1 font-medium text-rose-200">
                    <MaterialIcon name="error" size={16} />
                    {queryError}
                  </p>
                )}

                {usageResult && (
                  <div className="mt-5 rounded-xl border border-white/20 bg-white/95 p-4 text-sm text-stone-800 backdrop-blur-sm">
                    <p
                      className="font-bold mb-2 flex items-center gap-2"
                      style={{ color: C.primary }}
                    >
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
                      <p className="mt-1 text-stone-500">{usageResult.note}</p>
                    )}
                    {usageResult.expiresAt && (
                      <p className="text-xs mt-1 text-stone-500">
                        有效期限：{usageResult.expiresAt}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* 充值 */}
            <section className="relative rounded-2xl overflow-hidden min-h-[380px] md:min-h-[460px] flex flex-col justify-end">
              <div
                className="absolute inset-0 bg-cover bg-no-repeat bg-[70%_20%]"
                style={{
                  backgroundImage:
                    "url('/images/7bf7a01a-6740-4390-800c-566683623985.png')",
                }}
                aria-hidden
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(12,24,48,0.18) 0%, rgba(12,24,48,0.38) 45%, rgba(8,16,36,0.88) 100%)",
                }}
                aria-hidden
              />
              <span className="absolute top-4 left-4 z-10 text-[11px] font-bold text-white px-2.5 py-1 rounded-sm tracking-wide bg-stone-700/85">
                即將上線
              </span>

              <div className="relative z-10 px-5 sm:px-7 pb-7 pt-16 text-white">
                <h2 className="text-[26px] md:text-[30px] font-black tracking-tight mb-2">
                  流量即將用盡？
                </h2>
                <p className="text-[13px] md:text-sm leading-relaxed text-white/85 mb-6 max-w-md">
                  無需重新購買 eSIM，一鍵恢復原有流量，出國上網不中斷。
                </p>
                <PrimaryButton
                  type="button"
                  onClick={() => alert("此功能即將上線")}
                  className="w-full rounded-xl py-3.5 opacity-95"
                >
                  前往充值方案
                </PrimaryButton>
              </div>
            </section>
          </div>

          {/* 流量通知 */}
          <div id="push-notification-section" className="scroll-mt-28 mb-10">
            <PushNotificationSection
              onIccidBound={(boundIccid) => setIccid(boundIccid)}
              initialIccid={iccid}
              variant="banner"
            />
          </div>

          {/* 注意事項 */}
          <div
            className="rounded-2xl border p-6 md:p-8 mb-12 flex flex-col md:flex-row items-start md:items-center gap-6"
            style={{ backgroundColor: C.card, borderColor: C.line }}
          >
            <div
              className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: C.primarySoft }}
            >
              <MaterialIcon
                name="info"
                size={28}
                style={{ color: C.primary }}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">查詢前請注意</h3>
              <ul
                className="text-[13px] md:text-sm space-y-1.5 leading-relaxed"
                style={{ color: C.muted }}
              >
                <li>時間顯示為台灣時間（UTC+8）</li>
                <li>流量數據非即時，通常延遲 30 分鐘至數小時</li>
                <li>建議同時參考手機內建行動數據用量</li>
              </ul>
            </div>
            <Link
              href="/support"
              className="shrink-0 inline-flex items-center gap-1 text-sm font-bold hover:underline"
              style={{ color: C.primary }}
            >
              常見問題
              <MaterialIcon name="arrow_forward" size={16} />
            </Link>
          </div>

          {/* 如何使用 */}
          <section className="mb-14">
            <h2 className="text-[22px] md:text-[26px] font-black mb-6">
              如何使用
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border p-5"
                  style={{ backgroundColor: C.card, borderColor: C.line }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black text-white"
                      style={{ backgroundColor: C.primary }}
                    >
                      {item.step}
                    </span>
                    {item.comingSoon && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: "#EEF0F3", color: C.muted }}
                      >
                        即將上線
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold mb-2">{item.title}</h3>
                  <p
                    className="text-sm leading-relaxed mb-4"
                    style={{ color: C.muted }}
                  >
                    {item.desc}
                  </p>
                  {item.comingSoon ? (
                    <button
                      type="button"
                      onClick={() => alert("此功能即將上線")}
                      className="text-sm font-bold"
                      style={{ color: C.muted }}
                    >
                      {item.linkText} →
                    </button>
                  ) : (
                    <a
                      href={item.link}
                      className="text-sm font-bold hover:underline"
                      style={{ color: C.primary }}
                    >
                      {item.linkText} →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 流量對照表 */}
          <section id="usage-table" className="scroll-mt-28">
            <h2 className="text-[22px] md:text-[26px] font-black mb-6">
              流量用量對照表
            </h2>

            <div
              className="hidden md:block overflow-x-auto rounded-2xl border"
              style={{ borderColor: C.line, backgroundColor: C.card }}
            >
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th
                      className="text-left p-4 font-bold border-b w-[28%]"
                      style={{
                        borderColor: C.line,
                        backgroundColor: C.page,
                        color: C.text,
                      }}
                    >
                      使用情境
                    </th>
                    {DATA_PLANS.map((plan) => (
                      <th
                        key={plan.key}
                        className="p-4 font-black border-b text-center"
                        style={{
                          borderColor: C.line,
                          backgroundColor: plan.highlight ? C.primary : C.page,
                          color: plan.highlight ? "#FFFFFF" : C.text,
                        }}
                      >
                        <div>{plan.label}</div>
                        <div
                          className="text-[11px] font-normal mt-0.5"
                          style={{
                            color: plan.highlight
                              ? "rgba(255,255,255,0.8)"
                              : C.muted,
                          }}
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
                      style={{
                        backgroundColor: idx % 2 === 0 ? C.card : C.page,
                      }}
                    >
                      <td
                        className="p-4 border-b"
                        style={{ borderColor: C.line }}
                      >
                        <div className="flex items-start gap-2">
                          <MaterialIcon
                            name={row.icon}
                            size={20}
                            className="shrink-0 mt-0.5"
                            style={{ color: C.primary }}
                          />
                          <div>
                            <div className="font-bold">{row.activity}</div>
                            <div
                              className="text-[11px] mt-0.5"
                              style={{ color: C.muted }}
                            >
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
                            className="p-4 border-b text-center"
                            style={{
                              borderColor: C.line,
                              backgroundColor: plan.highlight
                                ? C.primarySoft
                                : undefined,
                            }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              {val.ok ? (
                                <MaterialIcon
                                  name="check_circle"
                                  size={20}
                                  filled
                                  style={{ color: C.primary }}
                                />
                              ) : (
                                <MaterialIcon
                                  name="cancel"
                                  size={20}
                                  style={{ color: "#C5C5C5" }}
                                />
                              )}
                              <span
                                className="font-bold text-[13px]"
                                style={{
                                  color: val.ok ? C.text : C.muted,
                                }}
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
                  className="rounded-2xl border overflow-hidden"
                  style={{
                    borderColor: plan.highlight ? C.primary : C.line,
                    backgroundColor: C.card,
                  }}
                >
                  <div
                    className="px-5 py-3 font-black flex items-center justify-between"
                    style={{
                      backgroundColor: plan.highlight ? C.primary : C.page,
                      color: plan.highlight ? "#FFFFFF" : C.text,
                    }}
                  >
                    <span>{plan.label}</span>
                    <span
                      className="text-xs font-normal"
                      style={{
                        color: plan.highlight
                          ? "rgba(255,255,255,0.8)"
                          : C.muted,
                      }}
                    >
                      {plan.sub}
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: C.line }}>
                    {USAGE_ROWS.map((row) => {
                      const val = row.values[plan.key];
                      return (
                        <div
                          key={row.activity}
                          className="px-5 py-3 flex items-center justify-between gap-3"
                          style={{ borderColor: C.line }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MaterialIcon
                              name={row.icon}
                              size={18}
                              className="shrink-0"
                              style={{ color: C.primary }}
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
                                style={{ color: C.primary }}
                              />
                            ) : (
                              <MaterialIcon
                                name="cancel"
                                size={16}
                                style={{ color: "#D0D0D0" }}
                              />
                            )}
                            <span
                              className="text-[13px] font-bold"
                              style={{
                                color: val.ok ? C.text : C.muted,
                              }}
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

            {/* 小撇步 */}
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
                  className="rounded-2xl border p-5"
                  style={{ backgroundColor: C.card, borderColor: C.line }}
                >
                  <MaterialIcon
                    name={tip.icon}
                    size={24}
                    className="mb-2"
                    style={{ color: C.primary }}
                  />
                  <h4 className="font-bold text-sm mb-1">{tip.title}</h4>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: C.muted }}
                  >
                    {tip.desc}
                  </p>
                </div>
              ))}
            </div>

            <p
              className="text-[11px] mt-6 leading-relaxed"
              style={{ color: C.muted }}
            >
              * 以上為業界平均估算，實際用量受 App
              版本、畫質與背景更新影響，僅供旅遊規劃參考。
            </p>
          </section>
        </motion.div>
      </div>
    </Layout>
  );
}
