import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * 夥伴後台按鈕
 * — radius 8px、無陰影
 * — secondary：淺灰底 + 深灰邊框
 * — default：深灰填色白字（主要 CTA）
 */
export const partnerButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d2d2d]/20 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 touch-manipulation shadow-none",
  {
    variants: {
      variant: {
        default:
          "border border-[#2d2d2d] bg-[#2d2d2d] text-white hover:bg-[#1f1f1f] active:scale-[0.98]",
        secondary:
          "border border-[#5c5c5c] bg-[#f0f0f0] text-[#2d2d2d] hover:bg-[#e8e8e8]",
        outline:
          "border border-[#5c5c5c] bg-[#f0f0f0] text-[#2d2d2d] hover:bg-[#e8e8e8]",
        brand:
          "border border-[#1E4AD1] bg-[#1E4AD1] text-white hover:bg-[#1639a8] active:scale-[0.98]",
        ghost: "rounded-[8px] border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        destructive:
          "border border-red-600 bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
        link: "h-auto rounded-none border-0 p-0 text-[#2d2d2d] underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-[8px] px-3 text-xs",
        lg: "h-11 rounded-[8px] px-6",
        icon: "h-9 w-9 rounded-[8px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/** 固定 8px 圓角（避免被 Base UI 蓋掉） */
export const PARTNER_PILL_RADIUS_STYLE = { borderRadius: "8px" };

const PartnerButton = forwardRef(function PartnerButton(
  { className, variant, size, asChild = false, style, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const isLink = variant === "link";
  return (
    <Comp
      ref={ref}
      className={cn(partnerButtonVariants({ variant, size, className }))}
      style={isLink ? style : { ...PARTNER_PILL_RADIUS_STYLE, ...style }}
      {...props}
    />
  );
});

export default PartnerButton;
