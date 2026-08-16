import { forwardRef, useImperativeHandle, useCallback, useRef } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const MapPinIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();
    const isAnimatingRef = useRef(false);

    const start = useCallback(async () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      while (isAnimatingRef.current) {
        await animate(".pin-dot", { opacity: [1, 0.4, 1] }, { duration: 0.6, ease: "easeInOut" });
        if (!isAnimatingRef.current) break;
      }
    }, [animate]);

    const stop = useCallback(() => {
      isAnimatingRef.current = false;
      animate(".pin-dot", { opacity: 1 }, { duration: 0.3 });
    }, [animate]);

    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

    return (
      <motion.svg
        ref={scope}
        onHoverStart={start}
        onHoverEnd={stop}
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
        style={{ overflow: "visible" }}
      >
        <motion.path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 20 9.2C20 16.5 12 21 12 21z" />
        <motion.circle className="pin-dot" cx="12" cy="9.2" r="2.6" />
      </motion.svg>
    );
  },
);

MapPinIcon.displayName = "MapPinIcon";
export default MapPinIcon;
