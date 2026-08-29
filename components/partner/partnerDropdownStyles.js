import { cn } from "@/lib/utils";
import {
  partnerButtonVariants,
  PARTNER_PILL_RADIUS_STYLE,
} from "@/components/partner/ui/PartnerButton";

/**
 * 下拉觸發鈕：8px 圓角、淺灰底、深灰邊、無陰影
 */
export function partnerDropdownTriggerClass({ primary = false, className } = {}) {
  return cn(
    partnerButtonVariants({
      variant: primary ? "default" : "secondary",
      size: "default",
    }),
    "shrink-0 gap-1.5 px-3.5 !rounded-[8px] !shadow-none",
    primary
      ? "data-popup-open:bg-[#1f1f1f]"
      : "data-popup-open:bg-[#e8e8e8]",
    className,
  );
}

export function partnerOutlineButtonClass({ className } = {}) {
  return partnerButtonVariants({
    variant: "secondary",
    size: "default",
    className: cn("!rounded-[8px] !shadow-none", className),
  });
}

export { PARTNER_PILL_RADIUS_STYLE };

export function accountDropdownTriggerClass({ className } = {}) {
  return cn(
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold transition-all shadow-none",
    "border border-[#5c5c5c] bg-[#f0f0f0] text-[#2d2d2d]",
    "hover:bg-[#e8e8e8]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d2d2d]/20",
    "disabled:pointer-events-none disabled:opacity-40",
    "data-popup-open:bg-[#e8e8e8]",
    className,
  );
}

export const ACCOUNT_DROPDOWN_TRIGGER_STYLE = {
  borderRadius: "8px",
};
