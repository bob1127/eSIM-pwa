// components/SmartWizardFloat.jsx
import React, { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react"; // 記得 npm install lucide-react
import { motion, AnimatePresence } from "framer-motion";

const SmartWizardFloat = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="fixed right-6 bottom-32 z-40 flex flex-col items-end gap-2 pointer-events-none">
      {/* 提示氣泡 (Tooltip) */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="bg-white text-gray-800 px-4 py-2 rounded-xl shadow-xl border border-blue-100 mb-2 mr-2 pointer-events-auto relative"
          >
            <div className="text-sm font-bold text-blue-600">
              還不知道要選擇何種方案嗎？
            </div>
            <div className="text-xs text-gray-500">點擊開啟 AI 智慧推薦</div>

            {/* 小三角形指向按鈕 */}
            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-b border-r border-blue-100 transform rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 懸浮按鈕 (FAB) */}
      <Link href="/wizard" className="pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-blue-500/50 transition-shadow relative"
        >
          {/* 閃爍動畫效果 */}
          <span className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping"></span>

          <Sparkles size={24} fill="currentColor" />
        </motion.button>
      </Link>
    </div>
  );
};

export default SmartWizardFloat;
