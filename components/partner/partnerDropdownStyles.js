import { cn } from "@/lib/utils";

/** 夥伴後台 shadcn 下拉觸發鈕（outline 白底描邊） */
export function partnerDropdownTriggerClass({ primary = false, className } = {}) {
  return cn(
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-semibold shadow-sm transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4AD1]/30 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-popup-open:bg-slate-50",
    primary
      ? "border-transparent bg-[#1E4AD1] text-white hover:bg-[#1639a8] data-popup-open:bg-[#1639a8]"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
    className,
  );
}

/** 會員頁下拉觸發鈕 — 對齊 SecondaryBtn（我的訂單／編輯資料） */
export function accountDropdownTriggerClass({ className } = {}) {
  return cn(
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-all",
    "border border-[#8a8a8a] bg-[#fafafa] text-[#303030]",
    "hover:bg-[#f0f0f0]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4AD1]/25",
    "disabled:pointer-events-none disabled:opacity-40",
    "data-popup-open:bg-[#f0f0f0]",
    className,
  );
}

/** 與 SecondaryBtn 相同圓角（inline，避免 Base UI 預設蓋掉） */
export const ACCOUNT_DROPDOWN_TRIGGER_STYLE = {
  borderRadius: "0.5rem",
};
