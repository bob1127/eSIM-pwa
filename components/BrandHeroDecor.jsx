"use client";

import { motion } from "framer-motion";

/**
 * 與 /cooperation hero 相同的漂浮幾何＋ eSIM 圖示背景。
 * 父層需 relative + overflow-hidden。
 */
export default function BrandHeroDecor() {
  return (
    <>
      {/* 左上角：黃色 C 型圓弧 */}
      <motion.div
        className="absolute top-[25%] left-[3%] md:left-[8%] w-[40px] md:w-[60px] h-[80px] md:h-[120px] border-t-[16px] md:border-t-[20px] border-l-[16px] md:border-l-[20px] border-b-[16px] md:border-b-[20px] border-[#FADE2B] rounded-l-full z-0"
        style={{ rotate: 15 }}
        animate={{ y: [-15, 15, -15], rotate: [15, 5, 15] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 左側：藍色實心小圓點 */}
      <motion.div
        className="absolute top-[60%] left-[12%] w-[20px] md:w-[30px] h-[20px] md:h-[30px] bg-[#0071EB] rounded-full z-0"
        animate={{ y: [10, -20, 10], x: [5, -5, 5] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 左下角：黃色 U 型圓弧 */}
      <motion.div
        className="absolute bottom-[20%] left-[18%] md:left-[25%] w-[70px] md:w-[100px] h-[35px] md:h-[50px] border-b-[16px] md:border-b-[20px] border-l-[16px] md:border-l-[20px] border-r-[16px] md:border-r-[20px] border-[#FADE2B] rounded-b-full z-0"
        style={{ rotate: 25 }}
        animate={{ y: [-10, 10, -10], rotate: [25, 35, 25] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 左下角：藍色四分之一圓弧 */}
      <motion.div
        className="absolute bottom-[35%] left-[6%] w-[40px] md:w-[60px] h-[40px] md:h-[60px] border-t-[16px] md:border-t-[20px] border-l-[16px] md:border-l-[20px] border-[#0071EB] rounded-tl-full z-0"
        animate={{ y: [10, -15, 10], rotate: [-10, 10, -10] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 右上角：黃色空心圓圈 */}
      <motion.div
        className="absolute top-[20%] right-[25%] md:right-[30%] w-[50px] md:w-[70px] h-[50px] md:h-[70px] border-[12px] md:border-[16px] border-[#FADE2B] rounded-full z-0 opacity-80"
        animate={{ y: [15, -15, 15], scale: [1, 1.05, 1] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 右上角：藍色長條 */}
      <motion.div
        className="absolute top-[15%] right-[10%] md:right-[15%] w-[50px] md:w-[70px] h-[16px] md:h-[22px] bg-[#1E4AD1] rounded-full z-0"
        style={{ rotate: -15 }}
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 右側：黃色小點 */}
      <motion.div
        className="absolute top-[45%] right-[8%] md:right-[12%] w-[12px] md:w-[16px] h-[12px] md:h-[16px] bg-[#FADE2B] rounded-full z-0"
        animate={{ y: [-20, 20, -20] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 右下角：藍色 ∩ 型圓弧 */}
      <motion.div
        className="absolute bottom-[25%] right-[15%] md:right-[22%] w-[80px] md:w-[120px] h-[40px] md:h-[60px] border-t-[18px] md:border-t-[24px] border-l-[18px] md:border-l-[24px] border-r-[18px] md:border-r-[24px] border-[#1E4AD1] rounded-t-full z-0"
        style={{ rotate: 10 }}
        animate={{ y: [-15, 15, -15], rotate: [10, -5, 10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.img
        src="/images/jeko-esim.png"
        alt=""
        aria-hidden
        className="absolute top-[45%] left-[-5%] md:left-[3%] w-[100px] h-auto z-10 pointer-events-none"
        animate={{ y: [-20, 20, -20], rotate: [-8, 2, -8] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src="/images/jeko-esim.png"
        alt=""
        aria-hidden
        className="absolute top-[5%] right-[-5%] md:right-[5%] z-10 w-[100px] h-auto pointer-events-none"
        animate={{ y: [15, -15, 15], x: [10, -10, 10], rotate: [12, -5, 12] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}
