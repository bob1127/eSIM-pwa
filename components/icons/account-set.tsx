import { forwardRef, useImperativeHandle, useCallback, type ReactNode } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

function wrap(
  displayName: string,
  startFn: (animate: ReturnType<typeof useAnimate>[1]) => unknown,
  stopFn: (animate: ReturnType<typeof useAnimate>[1]) => unknown,
  children: (color: string) => ReactNode,
) {
  const Icon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
    (
      { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
      ref,
    ) => {
      const [scope, animate] = useAnimate();
      const start = useCallback(async () => startFn(animate), [animate]);
      const stop = useCallback(() => stopFn(animate), [animate]);
      useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));
      return (
        <motion.svg
          ref={scope}
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`cursor-pointer ${className}`}
          onHoverStart={start}
          onHoverEnd={stop}
        >
          {children(color)}
        </motion.svg>
      );
    },
  );
  Icon.displayName = displayName;
  return Icon;
}

export const GearIcon = wrap(
  "GearIcon",
  (animate) => animate(".gear", { rotate: 90 }, { duration: 0.35, ease: "easeOut" }),
  (animate) => animate(".gear", { rotate: 0 }, { duration: 0.2 }),
  () => (
    <motion.g className="gear" style={{ transformOrigin: "12px 12px" }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </motion.g>
  ),
);

export const QrcodeIcon = wrap(
  "QrcodeIcon",
  (animate) => animate(".qr", { opacity: [1, 0.45, 1] }, { duration: 0.45 }),
  (animate) => animate(".qr", { opacity: 1 }, { duration: 0.15 }),
  () => (
    <motion.g className="qr">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h.01" />
    </motion.g>
  ),
);

export const CartIcon = wrap(
  "CartIcon",
  (animate) => animate(".cart", { x: [0, 2, 0] }, { duration: 0.35 }),
  (animate) => animate(".cart", { x: 0 }, { duration: 0.15 }),
  () => (
    <motion.g className="cart">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57L23 6H6" />
    </motion.g>
  ),
);

export const LogoutIcon = wrap(
  "LogoutIcon",
  (animate) => animate(".out", { x: [0, 3, 0] }, { duration: 0.35 }),
  (animate) => animate(".out", { x: 0 }, { duration: 0.15 }),
  () => (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <motion.g className="out">
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </motion.g>
    </>
  ),
);

export const DownloadIcon = wrap(
  "DownloadIcon",
  (animate) => animate(".dl", { y: [0, 3, 0] }, { duration: 0.35 }),
  (animate) => animate(".dl", { y: 0 }, { duration: 0.15 }),
  () => (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <motion.g className="dl">
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </motion.g>
    </>
  ),
);

export const CheckedIcon = wrap(
  "CheckedIcon",
  (animate) => animate(".ck", { pathLength: [0, 1] }, { duration: 0.35, ease: "easeOut" }),
  (animate) => animate(".ck", { pathLength: 1 }, { duration: 0.15 }),
  () => (
    <>
      <circle cx="12" cy="12" r="10" />
      <motion.path className="ck" d="M8 12.5l2.5 2.5L16 9" />
    </>
  ),
);

export const SearchIcon = wrap(
  "SearchIcon",
  (animate) => animate(".mag", { scale: [1, 1.12, 1] }, { duration: 0.35 }),
  (animate) => animate(".mag", { scale: 1 }, { duration: 0.15 }),
  () => (
    <motion.g className="mag" style={{ transformOrigin: "11px 11px" }}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </motion.g>
  ),
);

export const MailIcon = wrap(
  "MailIcon",
  (animate) => animate(".flap", { y: [0, -1.5, 0] }, { duration: 0.35 }),
  (animate) => animate(".flap", { y: 0 }, { duration: 0.15 }),
  () => (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <motion.path className="flap" d="M3 7l9 6 9-6" />
    </>
  ),
);

export const MenuIcon = wrap(
  "MenuIcon",
  (animate) => {
    animate(".l1", { x: [0, 2, 0] }, { duration: 0.3 });
    animate(".l2", { x: [0, -2, 0] }, { duration: 0.3, delay: 0.05 });
    animate(".l3", { x: [0, 2, 0] }, { duration: 0.3, delay: 0.1 });
  },
  (animate) => animate(".l1, .l2, .l3", { x: 0 }, { duration: 0.15 }),
  () => (
    <>
      <motion.line className="l1" x1="4" y1="7" x2="20" y2="7" />
      <motion.line className="l2" x1="4" y1="12" x2="20" y2="12" />
      <motion.line className="l3" x1="4" y1="17" x2="20" y2="17" />
    </>
  ),
);

export const GaugeIcon = wrap(
  "GaugeIcon",
  (animate) => animate(".needle", { rotate: [0, 35, 0] }, { duration: 0.45, ease: "easeInOut" }),
  (animate) => animate(".needle", { rotate: 0 }, { duration: 0.2 }),
  () => (
    <>
      <path d="M5 19a9 9 0 1 1 14 0" />
      <motion.line className="needle" x1="12" y1="19" x2="16" y2="12" style={{ transformOrigin: "12px 19px" }} />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" />
    </>
  ),
);

export const ExternalLinkIcon = wrap(
  "ExternalLinkIcon",
  (animate) => animate(".ext", { x: [0, 2, 0], y: [0, -2, 0] }, { duration: 0.35 }),
  (animate) => animate(".ext", { x: 0, y: 0 }, { duration: 0.15 }),
  () => (
    <>
      <path d="M15 3h6v6" />
      <motion.path className="ext" d="M10 14L21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
);

export const RefreshIcon = wrap(
  "RefreshIcon",
  (animate) => animate(".spin", { rotate: 180 }, { duration: 0.4, ease: "easeOut" }),
  (animate) => animate(".spin", { rotate: 0 }, { duration: 0.2 }),
  () => (
    <motion.g className="spin" style={{ transformOrigin: "12px 12px" }}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </motion.g>
  ),
);

export const PenIcon = wrap(
  "PenIcon",
  (animate) => animate(".pen", { rotate: [0, -12, 0] }, { duration: 0.35 }),
  (animate) => animate(".pen", { rotate: 0 }, { duration: 0.15 }),
  () => (
    <motion.g className="pen" style={{ transformOrigin: "12px 12px" }}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </motion.g>
  ),
);
