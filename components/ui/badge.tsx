import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** UIAble / shadcn Badge */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_[data-icon=inline-start]]:-ms-0.5 [&_[data-icon=inline-start]]:me-1 [&_[data-icon=inline-end]]:-me-0.5 [&_[data-icon=inline-end]]:ms-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#2d2d2d] text-white [a&]:hover:bg-[#1f1f1f]",
        secondary:
          "border-transparent bg-slate-100 text-slate-700 [a&]:hover:bg-slate-200",
        outline:
          "border-slate-200 bg-white text-slate-700 [a&]:hover:bg-slate-50",
        destructive:
          "border-transparent bg-red-600 text-white [a&]:hover:bg-red-700",
        success:
          "border-transparent bg-emerald-600 text-white [a&]:hover:bg-emerald-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
