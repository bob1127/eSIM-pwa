"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, RotateCcw } from "lucide-react";

/** eSIM 篩選維度定義 */
const FILTER_GROUPS = [
  {
    key: "days",
    label: "使用天數",
    multi: true,
    options: [
      { label: "1-3 天", value: "1-3天", match: (t) => /^[1-3]天$|1-3天/.test(t) },
      { label: "4-7 天", value: "4-7天", match: (t) => /^[4-7]天$|4-7天/.test(t) },
      { label: "8-15 天", value: "8-15天", match: (t) => /^([89]|1[0-5])天$|8-15天/.test(t) },
      { label: "16-30 天", value: "16-30天", match: (t) => /^(1[6-9]|2\d|30)天$|16-30天/.test(t) },
      { label: "30 天以上", value: "30天以上", match: (t) => /^([3-9]\d|[1-9]\d{2,})天$|30天以上/.test(t) },
    ],
  },
  {
    key: "data",
    label: "流量類型",
    multi: false,
    options: [
      { label: "吃到飽（無限流量）", value: "吃到飽", match: (t) => /吃到飽|無限|unlimited/i.test(t) },
      { label: "固定流量", value: "固定流量", match: (t) => /固定流量|GB|gb/.test(t) },
    ],
  },
  {
    key: "speed",
    label: "網路速度",
    multi: true,
    options: [
      { label: "5G", value: "5G", match: (t) => /5G/i.test(t) },
      { label: "4G / LTE", value: "4G", match: (t) => /4G|LTE/i.test(t) },
    ],
  },
  {
    key: "hotspot",
    label: "熱點分享",
    multi: false,
    options: [
      { label: "支援熱點", value: "支援熱點", match: (t) => /熱點|hotspot|tethering/i.test(t) },
    ],
  },
  {
    key: "activation",
    label: "啟用方式",
    multi: false,
    options: [
      { label: "QR Code 掃描", value: "QR Code", match: (t) => /QR|qr code/i.test(t) },
      { label: "App 下載", value: "App下載", match: (t) => /app|應用程式/i.test(t) },
      { label: "實體設定", value: "實體設定", match: (t) => /實體|manual/i.test(t) },
    ],
  },
  {
    key: "device",
    label: "裝置支援",
    multi: true,
    options: [
      { label: "iPhone / iOS", value: "iPhone", match: (t) => /iphone|ios/i.test(t) },
      { label: "Android", value: "Android", match: (t) => /android/i.test(t) },
    ],
  },
  {
    key: "usage",
    label: "使用情境",
    multi: true,
    options: [
      { label: "旅遊短期", value: "旅遊", match: (t) => /旅遊|觀光|短期/.test(t) },
      { label: "商務出差", value: "商務", match: (t) => /商務|出差/.test(t) },
      { label: "長期居留", value: "長期", match: (t) => /長期|居留|留學/.test(t) },
    ],
  },
];

/** 供分類頁使用：依 activeTags 過濾商品（每個 activeTag 對應一個 opt.match 函式） */
export function filterProductsByTags(products, activeTags) {
  if (!activeTags || activeTags.length === 0) return products;
  return products.filter((p) =>
    activeTags.every((activeVal) => {
      for (const group of FILTER_GROUPS) {
        const opt = group.options.find((o) => o.value === activeVal);
        if (opt) return (p.tags || []).some((t) => opt.match(t));
      }
      return (p.tags || []).includes(activeVal);
    }),
  );
}

/** 依產品 tags 計算各 option 的商品數（有資料才顯示 badge） */
function buildCounts(products) {
  const counts = {};
  for (const group of FILTER_GROUPS) {
    for (const opt of group.options) {
      const key = `${group.key}:${opt.value}`;
      counts[key] = products.filter((p) =>
        (p.tags || []).some((tag) => opt.match(tag))
      ).length;
    }
  }
  return counts;
}

function AccordionSection({ group, selected, onToggle, counts, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 px-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-[13px] font-bold text-slate-800">
          {group.label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {group.options.map((opt) => {
                const countKey = `${group.key}:${opt.value}`;
                const cnt = counts[countKey] ?? 0;
                const active = selected.includes(opt.value);

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onToggle(group, opt.value)}
                    className={`inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border font-medium transition-all ${
                      active
                        ? "bg-[#0A6CD0] text-white border-[#0A6CD0] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#0A6CD0] hover:text-[#0A6CD0]"
                    }`}
                  >
                    {opt.label}
                    {cnt > 0 && (
                      <span
                        className={`text-[10px] rounded-full px-1 leading-none ${
                          active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * eSIM 專屬篩選側欄
 * Props：
 *   products     - 原始商品陣列（含 tags: string[]）
 *   activeTags   - 目前勾選的 tag value 陣列
 *   setActiveTags - 更新回 parent
 */
export default function FilterSideBar({ products = [], activeTags = [], setActiveTags }) {
  const counts = useMemo(() => buildCounts(products), [products]);

  const handleToggle = (group, value) => {
    let next;
    if (group.multi) {
      next = activeTags.includes(value)
        ? activeTags.filter((t) => t !== value)
        : [...activeTags, value];
    } else {
      // 單選 group — 同 group 其他 option 先清掉，若已選則取消
      const groupValues = group.options.map((o) => o.value);
      const without = activeTags.filter((t) => !groupValues.includes(t));
      next = activeTags.includes(value) ? without : [...without, value];
    }
    setActiveTags?.(next);
  };

  const hasAny = activeTags.length > 0;

  return (
    <aside className="w-full rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50">
        <p className="text-[13px] font-black text-slate-800 tracking-wide">篩選方案</p>
        {hasAny && (
          <button
            type="button"
            onClick={() => setActiveTags?.([])}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            清除
          </button>
        )}
      </div>

      {/* 已選標籤預覽 */}
      {hasAny && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-blue-50/60">
          {activeTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[11px] bg-[#0A6CD0] text-white rounded-full px-2.5 py-0.5"
            >
              {tag}
              <button
                type="button"
                onClick={() => setActiveTags?.(activeTags.filter((t) => t !== tag))}
                className="ml-0.5 hover:bg-white/20 rounded-full"
                aria-label={`移除 ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 各篩選群組 */}
      {FILTER_GROUPS.map((group, i) => (
        <AccordionSection
          key={group.key}
          group={group}
          selected={activeTags}
          onToggle={handleToggle}
          counts={counts}
          defaultOpen={i < 3}
        />
      ))}
    </aside>
  );
}
