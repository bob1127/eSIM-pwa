"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DATA = [
  {
    title: "全球旅遊網路",
    subtitle: "The Globals",
    bubble:
      "我們提供全球90%以上國家地區的網路服務、上網卡，讓一般遊客以及商務人員都能夠有一趟舒適且安心的旅程",
    bullets: ["超快物流", "即時客服", "攻略分享"],
  },
  {
    title: "彈性資費方案",
    subtitle: "Flexible Plans",
    bubble: "依行程天數與流量自由選擇，支援跨國/自動重置，費用透明無隱藏成本。",
    bullets: ["天數彈性", "跨國自由", "隨買即用"],
  },
  {
    title: "多語即時客服",
    subtitle: "Global Support",
    bubble: "24/7 線上支援，中文/英文/日文三語服務，旅途中問題立即處理。",
    bullets: ["24/7 線上", "三語支援", "遠端協助"],
  },
];

export default function AccordionFeatureCard() {
  const [open, setOpen] = useState(0); // 第一個預設展開

  return (
    <div className="relative w-full">
      {/* 左側綠色導角（參考圖） */}
      <div
        aria-hidden
        className="absolute -left-3 top-2 bottom-2 w-2 rounded-full bg-[#18C77C]/90"
      />

      {DATA.map((it, idx) => {
        const isOpen = open === idx;

        return (
          <div key={idx} className="mb-4">
            {/* 標題列（白底卡片） */}
            <button
              onClick={() => setOpen(isOpen ? -1 : idx)}
              className="w-full flex items-center justify-between  px-5 py-4  transition-colors"
            >
              <div className="min-w-0">
                <h4 className="text-2xl font-bold text-gray-900 truncate">
                  {it.title}
                </h4>
                <p className="text-[15px] font-semibold text-gray-500">
                  {it.subtitle}
                </p>
              </div>

              {/* 下拉箭頭 */}
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="ml-4 text-gray-600"
              >
                ▼
              </motion.span>
            </button>

            {/* 展開內容（灰色圓角氣泡 + 綠勾要點） */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: { type: "spring", stiffness: 140, damping: 16 },
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: { duration: 0.22 },
                  }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl bg-[#EEF1F2] p-5 md:p-6 mt-3 shadow-sm">
                    {/* 主文案（灰色氣泡） */}
                    <p className="text-[15px] md:text-base leading-relaxed font-semibold text-slate-900">
                      {it.bubble}
                    </p>

                    {/* 綠色小標（對應參考圖的綠字小標） */}
                    <h5 className="text-[#0FA968] font-bold tracking-wide mt-5 mb-2">
                      服務重點
                    </h5>

                    {/* 綠勾要點 */}
                    <ul className="space-y-2">
                      {it.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex">
                            <svg
                              viewBox="0 0 24 24"
                              className="h-5 w-5 text-[#18C77C]"
                            >
                              <path
                                className="fill-current"
                                d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-1.1 13.3-3.2-3.2 1.4-1.4 1.8 1.8 4.9-4.9 1.4 1.4-6.3 6.3z"
                              />
                            </svg>
                          </span>
                          <span className="text-slate-800 font-medium">
                            {b}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
