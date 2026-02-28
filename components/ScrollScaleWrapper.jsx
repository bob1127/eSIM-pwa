"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * ScrollScaleWrapper
 * -----------------------------------------
 * 讓內容在滾動進出畫面時，產生絲滑的 scale（放大/縮小）效果
 *
 * props:
 * - children: ReactNode — 要包起來的內容
 * - range: [number, number] — scale 範圍（預設 [0.96, 1.05]）
 * - blurRange: [string, string] — 模糊程度（預設 ["1px", "0px"]）
 * - offset: [string, string] — 滾動觸發區（預設 ["start 90%", "end 10%"]）
 */
export default function ScrollScaleWrapper({
  children,
  range = [0.96, 1.05],
  blurRange = ["1px", "0px"],
  offset = ["start 90%", "end 10%"],
  className = "",
}) {
  const ref = useRef(null);

  // 追蹤此區塊滾動進度
  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  });

  // 根據滾動進度線性變化 scale / blur
  const scale = useTransform(scrollYProgress, [0, 1], range);
  const blur = useTransform(scrollYProgress, [0, 1], blurRange);

  return (
    <motion.div
      ref={ref}
      style={{
        scale,
        filter: blur,
        willChange: "transform, filter",
        transition: "none",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
