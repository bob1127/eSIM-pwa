"use client";

import Link from "next/link";
import Image from "next/image";
import { CONTACT_UI, CONTACT_TABS, CONTACT_INFO } from "@/lib/contactUi";
import MaterialIcon from "@/components/MaterialIcon";

export default function ContactPageShell({ activeTab, onTabChange, children }) {
  return (
    <div
      className="min-h-screen font-sans pt-28 mt-12 md:pt-32 pb-16"
      style={{ backgroundColor: CONTACT_UI.bg }}
    >
      <div className={`${CONTACT_UI.contentMax} mx-auto px-4 sm:px-6`}>
        {/* 麵包屑 */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <Link
            href="/"
            className="hover:text-[#2563eb] flex items-center gap-1"
          >
            <MaterialIcon name="home" size={14} />
            首頁
          </Link>
          <MaterialIcon name="chevron_right" size={14} />
          <span className="text-[#2b579a] font-bold">聯絡我們</span>
        </nav>

        {/* 標題區 */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-[#1e3a5f] tracking-tight">
            聯絡我們
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xl">
            eSIM
            購買諮詢、合作夥伴申請、退換款事宜，請選擇下方分類填寫表單，我們將於
            1～3 個工作天內回覆。
          </p>
        </div>

        {/* Email / 電話快捷卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <a
            href={`mailto:${CONTACT_INFO.email}`}
            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-[#2563eb] hover:shadow-sm transition"
          >
            <div className="w-11 h-11 rounded-xl bg-[#2b579a]/10 flex items-center justify-center shrink-0">
              <MaterialIcon name="mail" size={22} className="text-[#2b579a]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Email
              </p>
              <p className="text-sm sm:text-base font-black text-[#1e3a5f] truncate">
                {CONTACT_INFO.email}
              </p>
            </div>
          </a>
          <a
            href={CONTACT_INFO.phoneTel}
            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-[#2563eb] hover:shadow-sm transition"
          >
            <div className="w-11 h-11 rounded-xl bg-[#2b579a]/10 flex items-center justify-center shrink-0">
              <MaterialIcon name="call" size={22} className="text-[#2b579a]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                電話
              </p>
              <p className="text-sm sm:text-base font-black text-[#1e3a5f]">
                {CONTACT_INFO.phoneDisplay}
              </p>
            </div>
          </a>
        </div>

        {/* 分頁 stepper */}
        <div className="flex flex-col sm:flex-row border-b-2 border-slate-200 mb-0 overflow-x-auto">
          {CONTACT_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 min-w-[140px] text-left sm:text-center px-4 py-4 border-b-2 -mb-[2px] transition ${
                  active
                    ? "border-[#2b579a] text-[#2b579a]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <span className="text-[10px] font-bold tracking-wider block mb-0.5 opacity-70">
                  {tab.step}
                </span>
                <span
                  className={`text-sm ${active ? "font-black" : "font-medium"}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 表單容器 — 淺灰底 */}
        <div
          className="border border-slate-200 border-t-0 rounded-b-sm shadow-sm overflow-hidden"
          style={{ backgroundColor: CONTACT_UI.formBg }}
        >
          <div className="px-4 sm:px-6 py-5 border-b border-slate-200 bg-white/60">
            <p className="text-sm text-slate-600 leading-relaxed">
              {activeTab === "general" &&
                "商品諮詢、訂單問題或一般客服需求，請填寫以下表單。帶有「必須」標記的欄位為必填。"}
              {activeTab === "partner" &&
                "想成為 Jeko eSIM 合作夥伴？可先填寫洽詢表單，或直接前往完整申請流程建立專屬賣場。"}
              {activeTab === "refund" &&
                "退換款、售後爭議請填寫訂單資訊。已登入會員可至會員中心快速申請；未登入亦可透過此表單聯繫客服。"}
            </p>
          </div>
          {children}
        </div>

        {/* 其他聯絡方式 */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: "mail",
              label: "Email",
              val: CONTACT_INFO.email,
              href: `mailto:${CONTACT_INFO.email}`,
            },
            {
              icon: "call",
              label: "電話",
              val: CONTACT_INFO.phoneDisplay,
              href: CONTACT_INFO.phoneTel,
            },
            {
              icon: "chat",
              label: "LINE 官方",
              val: "線上即時諮詢",
              href: "https://lin.ee/y6tdx5q",
            },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={
                item.href.startsWith("http") ? "noopener noreferrer" : undefined
              }
              className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-sm hover:border-[#2563eb] hover:shadow-sm transition"
            >
              <div className="w-10 h-10 rounded-sm bg-[#2b579a]/10 flex items-center justify-center shrink-0">
                <MaterialIcon
                  name={item.icon}
                  size={20}
                  className="text-[#2b579a]"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-[#1e3a5f] truncate">
                  {item.val}
                </p>
              </div>
            </a>
          ))}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-[#2563eb]"
          >
            <Image
              src="/images/Logo/logo-no-bg.png"
              alt=""
              width={20}
              height={20}
              className="opacity-60"
            />
            返回 Jeko.eSIM 首頁
          </Link>
        </p>
      </div>
    </div>
  );
}
