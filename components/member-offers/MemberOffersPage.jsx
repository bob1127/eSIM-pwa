"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import {
  MEMBER_OFFERS_UI as UI,
  MEMBER_OFFER_NAV,
  NEW_MEMBER_PLAN,
  REFER_FRIEND_PLAN,
  LINE_FIRST_STRATEGY,
  MORE_OFFERS_PLAN,
  LINE_OA_URL,
} from "@/lib/memberOffersUi";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

function StatusPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#0A6CD0]/25 bg-[#0A6CD0]/8 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[#0A6CD0]">
      {children}
    </span>
  );
}

export default function MemberOffersPage() {
  return (
    <div
      className="min-h-screen font-sans pt-28 mt-10 md:pt-32 pb-20"
      style={{
        background:
          "radial-gradient(1200px 480px at 10% -10%, #d9e8fb 0%, transparent 55%), radial-gradient(900px 420px at 90% 0%, #e8f3ff 0%, transparent 50%), linear-gradient(180deg, #f5f8fc 0%, #eef2f7 100%)",
      }}
    >
      <div className={`${UI.contentMax} mx-auto px-4 sm:px-6`}>
        {/* breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-8">
          <Link
            href="/"
            className="hover:text-[#0A6CD0] flex items-center gap-1"
          >
            <MaterialIcon name="home" size={14} />
            首頁
          </Link>
          <MaterialIcon name="chevron_right" size={14} />
          <span className="font-bold" style={{ color: UI.brand }}>
            會員優惠
          </span>
        </nav>

        {/* Hero — brand first, one composition */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-[28px] mb-12 md:mb-16"
          style={{
            background: `linear-gradient(135deg, ${UI.brandDeep} 0%, ${UI.brand} 48%, #1a7adf 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 40%), radial-gradient(circle at 80% 10%, rgba(255,212,58,.25), transparent 35%)",
            }}
          />
          <div className="relative px-6 py-12 sm:px-10 sm:py-14 md:px-14 md:py-16 max-w-3xl">
            <p className="text-white/80 text-xs font-bold tracking-[0.22em] uppercase mb-4">
              Jeko.eSIM Member Offers
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15]">
              會員優惠
            </h1>
            <p className="mt-4 text-white/85 text-sm sm:text-base leading-relaxed max-w-xl">
              出國前先成為會員，把折扣、再購與好友推薦一次規劃好。此頁為優惠藍圖，正式規則與折扣碼將陸續上線。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0A6CD0] hover:bg-white/95 transition"
              >
                登入／註冊領優惠
                <MaterialIcon name="arrow_forward" size={16} />
              </Link>
              <a
                href={LINE_OA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/15 transition"
              >
                <MaterialIcon name="chat" size={16} />
                加入官方 LINE
              </a>
            </div>
          </div>
        </motion.header>

        {/* sticky section nav */}
        <div className="sticky top-24 z-20 mb-10 -mx-1 px-1">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {MEMBER_OFFER_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="shrink-0 rounded-full border border-slate-200 bg-white/90 backdrop-blur px-4 py-2 text-xs font-bold text-slate-600 hover:border-[#0A6CD0] hover:text-[#0A6CD0] transition"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* 01 新會員 */}
        <motion.section id="new-member" {...fadeUp} className="mb-16 scroll-mt-36">
          <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#0A6CD0] mb-2">
                {NEW_MEMBER_PLAN.eyebrow}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0f2744]">
                {NEW_MEMBER_PLAN.title}
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-2xl leading-relaxed">
                {NEW_MEMBER_PLAN.summary}
              </p>
            </div>
            <StatusPill>規劃中 · 優先上線</StatusPill>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            {NEW_MEMBER_PLAN.steps.map((s) => (
              <li key={s.step} className="relative pt-1">
                <div className="text-4xl font-black text-[#0A6CD0]/15 leading-none mb-3">
                  {s.step}
                </div>
                <h3 className="text-base font-bold text-[#0f2744] mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>

          <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur px-5 py-5 sm:px-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              建議規則（草案）
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {NEW_MEMBER_PLAN.draftRules.map((rule) => (
                <li
                  key={rule}
                  className="flex gap-2 text-sm text-slate-600 leading-snug"
                >
                  <MaterialIcon
                    name="check_circle"
                    size={18}
                    className="text-[#0A6CD0] shrink-0 mt-0.5"
                  />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* 02 介紹好朋友 */}
        <motion.section
          id="refer-friend"
          {...fadeUp}
          className="mb-16 scroll-mt-36"
        >
          <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#0A6CD0] mb-2">
                {REFER_FRIEND_PLAN.eyebrow}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0f2744]">
                {REFER_FRIEND_PLAN.title}
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-2xl leading-relaxed">
                {REFER_FRIEND_PLAN.summary}
              </p>
            </div>
            <StatusPill>規劃中</StatusPill>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 sm:p-6">
              <h3 className="text-sm font-black text-[#0f2744] mb-4 flex items-center gap-2">
                <MaterialIcon name="person" size={20} className="text-[#0A6CD0]" />
                介紹人（現有會員）
              </h3>
              <ul className="space-y-3">
                {REFER_FRIEND_PLAN.forInviter.map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-[#0A6CD0] font-bold shrink-0">→</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 sm:p-6">
              <h3 className="text-sm font-black text-[#0f2744] mb-4 flex items-center gap-2">
                <MaterialIcon
                  name="person_add"
                  size={20}
                  className="text-[#0A6CD0]"
                />
                被介紹人（新朋友）
              </h3>
              <ul className="space-y-3">
                {REFER_FRIEND_PLAN.forInvitee.map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-[#0A6CD0] font-bold shrink-0">→</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        {/* 03 LINE strategy */}
        <motion.section id="line-first" {...fadeUp} className="mb-16 scroll-mt-36">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#06C755] mb-2">
              LINE First
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f2744]">
              {LINE_FIRST_STRATEGY.title}
            </h2>
          </div>

          <div className="rounded-[24px] border border-[#06C755]/20 bg-gradient-to-br from-[#06C755]/08 via-white to-white p-5 sm:p-8 mb-8">
            <ul className="space-y-3 mb-8">
              {LINE_FIRST_STRATEGY.why.map((w) => (
                <li key={w} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                  <MaterialIcon
                    name="lightbulb"
                    size={18}
                    className="text-[#06C755] shrink-0 mt-0.5"
                  />
                  {w}
                </li>
              ))}
            </ul>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              建議流程（會員連結 × 官方 LINE）
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {LINE_FIRST_STRATEGY.flow.map((f, i) => (
                <div key={f.title} className="relative">
                  <div className="text-[11px] font-bold text-[#06C755] mb-1">
                    STEP {i + 1}
                  </div>
                  <h3 className="text-sm font-black text-[#0f2744] mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-8 text-sm font-medium text-[#0f2744] border-t border-slate-100 pt-5 leading-relaxed">
              <span className="text-[#06C755] font-bold">建議：</span>
              {LINE_FIRST_STRATEGY.tip}
            </p>

            <div className="mt-6">
              <a
                href={LINE_OA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#06C755] px-5 py-2.5 text-sm font-bold text-white hover:brightness-105 transition"
              >
                立即加入官方 LINE
                <MaterialIcon name="open_in_new" size={16} />
              </a>
            </div>
          </div>
        </motion.section>

        {/* 04 more offers */}
        <motion.section id="more-offers" {...fadeUp} className="mb-14 scroll-mt-36">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#0A6CD0] mb-2">
              eSIM Playbook
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f2744]">
              更多適合 eSIM 產業的優惠規劃
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl leading-relaxed">
              圍繞「出國前決策 → 旅途中續用 → 回國再出發」三段旅程設計，比單純打折更能提高終身價值。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
            {MORE_OFFERS_PLAN.map((offer, index) => (
              <motion.article
                key={offer.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.4 }}
                className="border-t border-slate-200 pt-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0A6CD0]/10 flex items-center justify-center shrink-0">
                    <MaterialIcon
                      name={offer.icon}
                      size={22}
                      className="text-[#0A6CD0]"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="text-base font-black text-[#0f2744]">
                        {offer.title}
                      </h3>
                      <StatusPill>{offer.status}</StatusPill>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {offer.desc}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* closing CTA */}
        <motion.section
          {...fadeUp}
          className="rounded-[24px] px-6 py-10 sm:px-10 text-center"
          style={{
            background: `linear-gradient(180deg, #ffffff 0%, ${UI.soft} 100%)`,
            border: "1px solid rgba(10,108,208,0.12)",
          }}
        >
          <h2 className="text-xl sm:text-2xl font-black text-[#0f2744]">
            想先鎖定優惠？從會員與 LINE 開始
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            正式折扣碼與推薦系統上線後，會優先透過會員中心與官方 LINE
            通知。現在註冊、加好友，是最穩的第一步。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A6CD0] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#084a9e] transition"
            >
              前往會員中心
              <MaterialIcon name="arrow_forward" size={16} />
            </Link>
            <Link
              href="/product"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-[#0A6CD0] hover:text-[#0A6CD0] transition"
            >
              逛精選 eSIM
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
