"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { TERMS_COMMON, TERMS_BY_MODE, CONTENT_DISCLAIMER } from "@/lib/cooperationTermsContent";

const MODAL_CONTENT = {
  terms: {
    eyebrow: "合作須知",
    title: "相關合作條款",
    lead: "申請成為合作夥伴前，請先了解兩種模式的權利義務。完整條款以服務條款為準。",
    kind: "terms",
  },
  commission: {
    eyebrow: "收益說明",
    title: "專屬分潤機制",
    lead: "每筆符合條件的訂單皆可累積合作收益；比例與結算依模式與平台公告為準。",
    kind: "commission",
  },
  support: {
    eyebrow: "後勤支援",
    title: "專人協助",
    lead: "您專心推廣或經營賣場，客服、行銷與 SEO 由 Jeko 協助。",
    kind: "support",
  },
};

const COMMISSION_BY_MODE = {
  referral: {
    label: "專屬折扣碼連結",
    points: [
      {
        k: "對外參考",
        v: "九折後實付約 15%（常見約 13～16%，依方案略有差異）",
      },
      {
        k: "結算方式",
        v: "依核准設定以產品成本 × 分潤趴計算，且不超過該筆毛利",
      },
      { k: "旅客優惠", v: "專屬折扣碼（預設全單 10%，依核准）" },
      { k: "歸因方式", v: "專屬連結／折扣碼 + Cookie 約 30 天" },
      { k: "結算", v: "次月 15 對帳單；申請提領後 10 工作天匯款（最低 NT$3,000／滿 10 天；每月第 1 次免手續費，之後每次 NT$15）" },
    ],
  },
  store: {
    label: "專屬商店",
    points: [
      { k: "收益來源", v: "利潤自己決定：售價 − 平台底價 − 金流手續費" },
      { k: "底價", v: "由平台統一提供（透明可見，不可自行竄改）" },
      { k: "加價", v: "商店加價％或固定加價、單品售價皆可自訂" },
      { k: "選品", v: "目錄選品／自動建議，一鍵開通上架" },
      { k: "計入條件", v: "旅客於您的 /p/商店 完成結帳" },
      { k: "風格", v: "店名、Banner、色系、Logo 可自訂" },
      { k: "結算", v: "次月 15 對帳單；申請提領後 10 工作天匯款（最低 NT$3,000／滿 10 天；每月第 1 次免手續費，之後每次 NT$15）" },
    ],
  },
};

function ModeTabs({ mode, onChange }) {
  return (
    <div className="flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80">
      {[
        { id: "referral", label: "專屬折扣碼連結" },
        { id: "store", label: "專屬商店" },
      ].map((tab) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 rounded-lg py-2.5 text-[13px] font-bold tracking-wide transition-all ${
              active
                ? "bg-white text-[#0066D6] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2.5">
      {items.map((text) => (
        <li
          key={text}
          className="flex gap-2.5 text-[13px] leading-relaxed text-slate-600"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F2CC40]" />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function TermsBody({ mode, onModeChange }) {
  const detail = TERMS_BY_MODE[mode];
  return (
    <div className="space-y-5">
      <ModeTabs mode={mode} onChange={onModeChange} />

      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-[#F7FAFF] to-white p-4 md:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0066D6] mb-1">
          {detail.label}網址
        </p>
        <code className="text-[13px] md:text-sm font-semibold text-slate-800 break-all">
          {detail.urlHint}
        </code>
      </div>

      <div>
        <h4 className="text-[14px] font-bold text-slate-900 mb-3">
          {detail.label}特別約定
        </h4>
        <BulletList items={detail.items} />
      </div>

      <div className="pt-1 border-t border-slate-100">
        <h4 className="text-[14px] font-bold text-slate-900 mb-3 mt-4">
          共通約定
        </h4>
        <BulletList items={TERMS_COMMON} />
      </div>
      <div className="pt-1 border-t border-slate-100">
        <h4 className="text-[14px] font-bold text-slate-900 mb-3 mt-4">
          {CONTENT_DISCLAIMER.title}
        </h4>
        <BulletList items={CONTENT_DISCLAIMER.bullets} />
      </div>
    </div>
  );
}

function CommissionBody({ mode, onModeChange }) {
  const detail = COMMISSION_BY_MODE[mode];
  return (
    <div className="space-y-5">
      <ModeTabs mode={mode} onChange={onModeChange} />
      <div className="grid gap-3">
        {detail.points.map((row) => (
          <div
            key={row.k}
            className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3"
          >
            <span className="text-[12px] font-bold text-slate-500 shrink-0">
              {row.k}
            </span>
            <span className="text-[13px] font-semibold text-slate-800 text-right leading-snug">
              {row.v}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-slate-500 leading-relaxed">
        ※以上為現行說明範例，實際比例與結算以申請審核結果及平台公告為準。
      </p>
    </div>
  );
}

function SupportBody() {
  const items = [
    {
      title: "客服支援",
      desc: "旅客安裝與連線問題由 Jeko 客服協助，降低您的售後負擔。",
    },
    {
      title: "行銷素材",
      desc: "提供可用於社群與官網的推廣素材；請勿擅自改動品牌識別。",
    },
    {
      title: "SEO／曝光",
      desc: "商品頁與平台基礎 SEO 由我們維護，您專注帶來流量與轉換。",
    },
    {
      title: "開通協助",
      desc: "申請後客服協助確認模式、連結或商店開通，有疑問可隨時聯繫。",
    },
  ];
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
        >
          <h4 className="text-[14px] font-bold text-slate-900 mb-1">
            {item.title}
          </h4>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            {item.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * 合作頁資訊彈窗：條款／分潤／專人協助
 * @param {"terms"|"commission"|"support"|null} openId
 */
export default function CooperationInfoModal({
  openId,
  onClose,
  initialMode = "referral",
}) {
  const meta = openId ? MODAL_CONTENT[openId] : null;
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    if (openId) setMode(initialMode === "store" ? "store" : "referral");
  }, [openId, initialMode]);

  useEffect(() => {
    if (!openId) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openId, onClose]);

  return (
    <AnimatePresence>
      {meta && (
        <motion.div
          className="fixed inset-0 z-[89999] flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="關閉背景"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coop-info-title"
            className="relative z-10 flex w-full max-w-[560px] max-h-[92vh] sm:max-h-[85vh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 md:px-6 md:pt-6">
              <div className="min-w-0">
                <h3
                  id="coop-info-title"
                  className="text-[20px] md:text-[22px] font-bold text-slate-900 tracking-wide"
                >
                  {meta.title}
                </h3>
                <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">
                  {meta.lead}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                aria-label="關閉"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4 md:px-6 md:pb-5">
              {meta.kind === "terms" && (
                <TermsBody mode={mode} onModeChange={setMode} />
              )}
              {meta.kind === "commission" && (
                <CommissionBody mode={mode} onModeChange={setMode} />
              )}
              {meta.kind === "support" && <SupportBody />}
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4 md:px-6 flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
              {meta.kind === "terms" ? (
                <Link
                  href="/terms"
                  className="text-[12px] font-bold text-[#0066D6] hover:underline text-center sm:text-left"
                  onClick={onClose}
                >
                  查看完整服務條款 →
                </Link>
              ) : (
                <span className="text-[12px] text-slate-400 hidden sm:inline">
                  有疑問可先看條款再申請
                </span>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                >
                  關閉
                </button>
                <Link
                  href={`/register-distributor?mode=${mode === "store" ? "store" : "referral"}`}
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full bg-[#0066D6] hover:bg-[#0052ad] text-white font-bold text-[13px] tracking-wide px-6 py-2.5 shadow-md transition"
                >
                  立即申請
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { MODAL_CONTENT };
