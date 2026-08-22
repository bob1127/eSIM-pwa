import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#1E4AD1]/10 text-[#1E4AD1]",
        secondary: "border-slate-200 bg-slate-100 text-slate-600",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        warning: "border-amber-200 bg-amber-50 text-amber-900",
        destructive: "border-red-200 bg-red-50 text-red-800",
        outline: "border-slate-300 bg-white text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export default function PartnerBadge({ className, variant, children, dot }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {dot ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80"
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
