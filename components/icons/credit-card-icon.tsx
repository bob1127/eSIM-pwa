import { forwardRef, useImperativeHandle } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const CreditCardIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();
    const start = async () => {
      animate(
        ".card-body",
        { rotate: [0, -3, 3, 0], scale: [1, 1.02, 1] },
        { duration: 0.4, ease: "easeInOut" },
      );
    };
    const stop = () => {
      animate(".card-body", { rotate: 0, scale: 1 }, { duration: 0.2 });
    };
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
      >
        <motion.path
          className="card-body"
          style={{ transformOrigin: "50% 50%" }}
          d="M3 5m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z"
        />
        <motion.path d="M3 10h18" />
        <motion.path d="M7 15h.01" />
        <motion.path d="M11 15h2" />
      </motion.svg>
    );
  },
);
CreditCardIcon.displayName = "CreditCardIcon";
export default CreditCardIcon;
