"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import {
  getCompatibleDeviceCategories,
  getCompatibilityUpdateNotice,
  formatCompatibilityLastUpdated,
  isDeviceNoteLine,
  ESIM_COMPATIBLE_DEVICES_UPDATE_INTERVAL,
} from "@/lib/esimCompatibleDevices";

function Modal({ isOpen, onClose, title, maxWidth = "max-w-3xl", children }) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className={`fixed left-1/2 top-1/2 z-[10000] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 ${maxWidth}`}
          >
            <div className="max-h-[min(88vh,720px)] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="關閉"
                >
                  <MaterialIcon name="close" size={22} />
                </button>
              </div>
              <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * 商品頁／全站：eSIM 相容機型查詢
 */
export default function EsimCompatibilityModal({
  isOpen,
  onClose,
  title = "我的手機支援 eSIM 嗎？",
  regionHint = "",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const categories = useMemo(() => getCompatibleDeviceCategories(), []);

  const filteredDevices = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const q = searchTerm.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, searchTerm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-3xl">
      <div className="text-slate-700 space-y-5">
        <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-relaxed">
          <p className="font-bold text-slate-800 mb-1">
            使用 Jeko eSIM 前，請確認裝置支援 eSIM 且未鎖定電信商（Unlocked）。
            {regionHint ? ` ${regionHint}` : ""}
          </p>
          <p className="text-slate-600 text-[13px]">
            最準確方式：手機撥打 <span className="font-mono font-bold">*#06#</span>
            ，若畫面出現 <strong>EID</strong> 通常即支援 eSIM。
          </p>
        </div>

        <p className="text-[12px] text-slate-500 leading-relaxed rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
          {getCompatibilityUpdateNotice()}
          <span className="block mt-1 text-slate-400">
            維護週期：{ESIM_COMPATIBLE_DEVICES_UPDATE_INTERVAL} · 資料截至{" "}
            {formatCompatibilityLastUpdated()}
          </span>
        </p>

        <input
          type="search"
          className="block w-full px-3 py-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#1E4AD1]"
          placeholder="輸入設備型號 (例如：iPhone 16、S25)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="space-y-3">
          {filteredDevices.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">
              找不到「{searchTerm}」，請改關鍵字或查看下方分類。
            </p>
          ) : (
            filteredDevices.map((category) => (
              <div
                key={category.category}
                className="border border-gray-200 rounded-xl overflow-hidden p-4 bg-white"
              >
                <span className="font-bold text-slate-800 block mb-2">
                  {category.category}
                </span>
                <ul className="space-y-1 text-sm text-slate-600">
                  {category.items.map((item) => (
                    <li
                      key={item}
                      className={
                        isDeviceNoteLine(item)
                          ? "text-amber-700 text-[12px] list-none mt-2 pl-0"
                          : ""
                      }
                    >
                      {isDeviceNoteLine(item) ? item : `• ${item}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
