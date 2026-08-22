import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
} as const;

export type QuarterRingSize = keyof typeof SIZE_CLASS;

type QuarterRingProps = ComponentProps<"span"> & {
  size?: QuarterRingSize;
  duration?: string;
};

function QuarterRing({
  className,
  size = "md",
  duration = "1s",
  style,
  ...props
}: QuarterRingProps) {
  return (
    <>
      <style jsx global>{`
        @keyframes loading-ui-quarter-ring-rotation {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <span
        role="status"
        className={cn(
          "inline-block shrink-0 rounded-full border-t-[3px] border-r-[3px] border-t-current border-r-transparent text-black",
          SIZE_CLASS[size],
          className,
        )}
        style={
          {
            animation: `loading-ui-quarter-ring-rotation ${duration} linear infinite`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <span className="sr-only">Loading</span>
      </span>
    </>
  );
}

export { QuarterRing, SIZE_CLASS };
