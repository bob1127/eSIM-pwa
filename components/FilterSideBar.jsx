"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, RotateCcw } from "lucide-react";

/**
 * 篩選維度：只保留商品規格裡真的有的欄位
 * （對齊 Medusa options：使用天數／數據量／電信商）
 */
const FILTER_GROUPS = [
  {
    key: "days",
    label: "使用天數",
    multi: true,
    options: [
      {
        label: "1-3 天",
        value: "1-3天",
        match: (t) => matchDayRange(t, 1, 3),
      },
      {
        label: "4-7 天",
        value: "4-7天",
        match: (t) => matchDayRange(t, 4, 7),
      },
      {
        label: "8-15 天",
        value: "8-15天",
        match: (t) => matchDayRange(t, 8, 15),
      },
      {
        label: "16-30 天",
        value: "16-30天",
        match: (t) => matchDayRange(t, 16, 30),
      },
      {
        label: "30 天以上",
        value: "30天以上",
        match: (t) => {
          const n = parseDayNumber(t);
          return n != null && n > 30;
        },
      },
    ],
  },
  {
    key: "data",
    label: "流量類型",
    multi: false,
    options: [
      {
        label: "吃到飽",
        value: "吃到飽",
        match: (t) => /吃到飽|無限流量|無限|unlimited/i.test(t),
      },
      {
        label: "每日型",
        value: "每日型",
        match: (t) => /每日|每天|daily/i.test(t),
      },
      {
        label: "總量型",
        value: "總量型",
        match: (t) => /總量|固定流量|^\d+(\.\d+)?\s*GB$/i.test(t),
      },
    ],
  },
  {
    key: "carrier",
    label: "電信商",
    multi: true,
    options: [
      {
        label: "AU (KDDI)",
        value: "AU(KDDI)",
        match: (t) => /AU\s*\(?\s*KDDI\s*\)?/i.test(t) || /^au$/i.test(t),
      },
      {
        label: "SoftBank / KDDI",
        value: "SoftBank / KDDI",
        match: (t) =>
          /SoftBank/i.test(t) && !/10\s*Mbps/i.test(t),
      },
      {
        label: "SoftBank / KDDI 10Mbps",
        value: "SoftBank / KDDI 10Mbps",
        match: (t) => /SoftBank/i.test(t) && /10\s*Mbps/i.test(t),
      },
      {
        label: "IIJ Docomo",
        value: "IIJ Docomo",
        match: (t) => /IIJ|Docomo|NTT/i.test(t),
      },
      {
        label: "其他／全球",
        value: "全球",
        match: (t) => /Global|全球|自動切換|其他/i.test(t),
      },
    ],
  },
];

function parseDayNumber(tag) {
  const m = String(tag || "").match(/(\d+)\s*天/);
  if (!m) return null;
  return Number(m[1]);
}

function matchDayRange(tag, min, max) {
  const n = parseDayNumber(tag);
  return n != null && n >= min && n <= max;
}

/**
 * 從 Medusa 商品（含 options / variants / metadata）抽出可篩選 tags。
 * 分類頁 getStaticProps 應呼叫此函式，避免只靠空的 product.tags。
 */
export function buildFilterTagsFromProduct(product) {
  const tags = new Set();
  const title = String(product?.title || product?.name || "");
  if (title) tags.add(title);

  for (const t of product?.tags || []) {
    const val = typeof t === "string" ? t : t?.value;
    if (val) tags.add(String(val));
  }

  const optMap = {};
  for (const o of product?.options || []) {
    if (o?.id) optMap[o.id] = String(o.title || "");
  }

  for (const v of product?.variants || []) {
    if (v?.title) tags.add(String(v.title));
    for (const o of v?.options || []) {
      const optTitle = optMap[o.option_id] || "";
      const val = String(o.value || "").trim();
      if (!val) continue;
      tags.add(val);
      if (/天數|Days/i.test(optTitle) || /^\d+天$/.test(val)) {
        tags.add(val.includes("天") ? val : `${val}天`);
      }
      if (/數據|流量|Data/i.test(optTitle)) {
        tags.add(val);
        if (/無限/i.test(val)) tags.add("吃到飽");
        if (/每日|每天/i.test(val)) tags.add("每日型");
        if (/總量|\d+\s*GB/i.test(val) && !/每日|每天/i.test(val)) {
          tags.add("總量型");
        }
      }
      if (/電信/i.test(optTitle)) tags.add(val);
    }
  }

  // 從電信商規格補網路制式（有才加入，不另外開篩選區塊除非有資料）
  const specsRaw = product?.metadata?.carrier_specs_by_carrier;
  let specs = specsRaw;
  if (typeof specsRaw === "string") {
    try {
      specs = JSON.parse(specsRaw);
    } catch {
      specs = null;
    }
  }
  if (specs && typeof specs === "object") {
    for (const entry of Object.values(specs)) {
      const network = String(entry?.network || "");
      if (/5G/i.test(network)) tags.add("5G");
      if (/4G|LTE/i.test(network)) tags.add("4G");
      const apps = String(entry?.apps || "");
      if (/熱點/i.test(apps)) tags.add("支援熱點");
      // 電信商 key 本身
    }
    for (const key of Object.keys(specs)) {
      if (key && key !== "default") tags.add(key);
    }
  }

  // 標題語意補強
  if (/吃到飽|無限/i.test(title)) tags.add("吃到飽");
  if (/每日型|每日/i.test(title)) tags.add("每日型");

  return Array.from(tags).filter(Boolean);
}

/** 商品卡顯示用短標籤（不要把所有天數都攤出來） */
export function buildDisplayTagsFromProduct(product, filterTags = []) {
  const tags = [];
  const title = String(product?.title || product?.name || "");
  const pool = (filterTags.length ? filterTags : []).map(String);

  const pushUnique = (label) => {
    if (!label || tags.includes(label)) return;
    tags.push(label);
  };

  if (/吃到飽|無限/i.test(title) || pool.some((t) => /吃到飽|無限流量/i.test(t))) {
    pushUnique("吃到飽");
  }
  if (/每日型|每日/i.test(title) || pool.some((t) => /每日/i.test(t))) {
    pushUnique("每日型");
  }
  if (/總量/i.test(title) || pool.some((t) => /總量型|總量\d/i.test(t))) {
    pushUnique("總量型");
  }

  for (const t of pool) {
    if (/AU\s*\(?\s*KDDI\s*\)?/i.test(t)) pushUnique("AU(KDDI)");
    else if (/SoftBank/i.test(t)) pushUnique("SoftBank");
    else if (/IIJ|Docomo/i.test(t)) pushUnique("IIJ Docomo");
    else if (/LG\s*U\+/i.test(t)) pushUnique("LG U+");
    else if (/SKT|SK電信/i.test(t)) pushUnique("SK電信");
    else if (/Global|全球/i.test(t)) pushUnique("全球");
  }

  if (pool.some((t) => /5G/i.test(t))) pushUnique("5G");
  if (pool.some((t) => /支援熱點|熱點/i.test(t))) pushUnique("熱點");

  return tags.slice(0, 4);
}

/** 供分類頁使用：依 activeTags 過濾商品 */
export function filterProductsByTags(products, activeTags) {
  if (!activeTags || activeTags.length === 0) return products;
  return products.filter((p) =>
    activeTags.every((activeVal) => {
      for (const group of FILTER_GROUPS) {
        const opt = group.options.find((o) => o.value === activeVal);
        if (opt) return (p.tags || []).some((t) => opt.match(String(t)));
      }
      return (p.tags || []).includes(activeVal);
    }),
  );
}

function buildCounts(products) {
  const counts = {};
  for (const group of FILTER_GROUPS) {
    for (const opt of group.options) {
      const key = `${group.key}:${opt.value}`;
      counts[key] = products.filter((p) =>
        (p.tags || []).some((tag) => opt.match(String(tag))),
      ).length;
    }
  }
  return counts;
}

function AccordionSection({ group, selected, onToggle, counts, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const visibleOptions = group.options.filter(
    (opt) => (counts[`${group.key}:${opt.value}`] ?? 0) > 0,
  );

  if (visibleOptions.length === 0) return null;

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
              {visibleOptions.map((opt) => {
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
                    <span
                      className={`text-[10px] rounded-full px-1 leading-none ${
                        active
                          ? "bg-white/25 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {cnt}
                    </span>
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
 * eSIM 專屬篩選側欄（僅顯示目前商品真的有的規格）
 */
export default function FilterSideBar({
  products = [],
  activeTags = [],
  setActiveTags,
}) {
  const counts = useMemo(() => buildCounts(products), [products]);

  const visibleGroups = useMemo(
    () =>
      FILTER_GROUPS.filter((group) =>
        group.options.some(
          (opt) => (counts[`${group.key}:${opt.value}`] ?? 0) > 0,
        ),
      ),
    [counts],
  );

  const handleToggle = (group, value) => {
    let next;
    if (group.multi) {
      next = activeTags.includes(value)
        ? activeTags.filter((t) => t !== value)
        : [...activeTags, value];
    } else {
      const groupValues = group.options.map((o) => o.value);
      const without = activeTags.filter((t) => !groupValues.includes(t));
      next = activeTags.includes(value) ? without : [...without, value];
    }
    setActiveTags?.(next);
  };

  const hasAny = activeTags.length > 0;

  if (visibleGroups.length === 0) {
    return (
      <aside className="w-full rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm">
        <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50">
          <p className="text-[13px] font-black text-slate-800 tracking-wide">
            篩選方案
          </p>
        </div>
        <p className="px-4 py-5 text-[12px] text-slate-400 leading-relaxed">
          此分類商品規格一致，暫無額外篩選條件。
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-full rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50">
        <p className="text-[13px] font-black text-slate-800 tracking-wide">
          篩選方案
        </p>
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
                onClick={() =>
                  setActiveTags?.(activeTags.filter((t) => t !== tag))
                }
                className="ml-0.5 hover:bg-white/20 rounded-full"
                aria-label={`移除 ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {visibleGroups.map((group, i) => (
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
