import { cn } from "@/lib/utils";
import { QuarterRing, type QuarterRingSize } from "@/components/ui/QuarterRing";

type LoadingIndicatorProps = {
  label?: string;
  size?: QuarterRingSize;
  className?: string;
  labelClassName?: string;
  spinnerClassName?: string;
  layout?: "inline" | "center" | "stack";
};

function LoadingIndicator({
  label = "載入中…",
  size = "md",
  className,
  labelClassName,
  spinnerClassName,
  layout = "stack",
}: LoadingIndicatorProps) {
  if (layout === "inline") {
    return (
      <span
        className={cn("inline-flex items-center gap-2 text-black", className)}
        role="status"
        aria-live="polite"
      >
        <QuarterRing size={size} className={spinnerClassName} />
        {label ? (
          <span className={cn("text-sm text-black", labelClassName)}>{label}</span>
        ) : null}
      </span>
    );
  }

  if (layout === "center") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 text-black",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <QuarterRing size={size} className={spinnerClassName} />
        {label ? (
          <p className={cn("text-sm text-black", labelClassName)}>{label}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col items-start gap-2 text-black", className)}
      role="status"
      aria-live="polite"
    >
      <QuarterRing size={size} className={spinnerClassName} />
      {label ? (
        <p className={cn("text-sm text-black", labelClassName)}>{label}</p>
      ) : null}
    </div>
  );
}

export default LoadingIndicator;
