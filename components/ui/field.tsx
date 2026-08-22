import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Field({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "text-xs font-bold uppercase tracking-wider text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export { Field, FieldLabel };
