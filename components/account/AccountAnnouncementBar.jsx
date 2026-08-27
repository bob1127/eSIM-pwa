"use client";

import { useEffect, useState } from "react";

/** 會員中心頂部站內公告（之後可改接 API／Boss 後台） */
export const ACCOUNT_SITE_ANNOUNCEMENTS = [
  "帳戶中心已支援一鍵查詢流量與圖表分析",
  "退換貨可線上申請，詳見退換貨政策",
  "開啟流量監控提醒，剩餘偏低時自動通知您",
];

/**
 * 藍色橫條 + 往上輪播公告文字
 */
export default function AccountAnnouncementBar({
  items = ACCOUNT_SITE_ANNOUNCEMENTS,
  intervalMs = 4200,
  className = "",
}) {
  const list = (Array.isArray(items) ? items : [])
    .map((t) => String(t || "").trim())
    .filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return undefined;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, Math.max(2500, intervalMs));
    return () => clearInterval(t);
  }, [list.length, intervalMs]);

  if (!list.length) return null;

  const prev = (index - 1 + list.length) % list.length;

  /** 與賣場／夥伴店頂部促銷列同色（ShopNavbar `#2B6CB0`） */
  const barBlue = "#2B6CB0";

  return (
    <div
      className={`relative z-30 h-8 shrink-0 overflow-hidden text-white ${className}`}
      style={{ backgroundColor: barBlue }}
      role="status"
      aria-live="polite"
      aria-label="站內公告"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-10 z-[1]"
        style={{
          background: `linear-gradient(to right, ${barBlue}, transparent)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 z-[1]"
        style={{
          background: `linear-gradient(to left, ${barBlue}, transparent)`,
        }}
      />

      <div className="relative mx-auto flex h-full max-w-[1280px] items-center justify-center px-4 sm:px-6">
        <div className="relative h-full w-full max-w-3xl overflow-hidden">
          {list.map((text, i) => {
            let translate = "translate-y-full opacity-0";
            if (i === index) translate = "translate-y-0 opacity-100";
            else if (i === prev && list.length > 1) {
              translate = "-translate-y-full opacity-0";
            }
            return (
              <p
                key={`${i}-${text.slice(0, 12)}`}
                className={`absolute inset-0 flex items-center justify-center px-2 text-center text-[12px] sm:text-[13px] font-semibold leading-tight transition-all duration-500 ease-out ${translate}`}
              >
                {text}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
