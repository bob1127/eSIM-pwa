"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, RotateCcw } from "lucide-react";
import { parseHotSaleTelecoms } from "@/lib/productHotSale";

/**
 * 篩選維度：只保留商品規格裡真的有的欄位
 * （對齊 Medusa options：使用天數／數據量／電信商／線路／熱銷）
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
    key: "line",
    label: "線路類型",
    multi: true,
    options: [
      {
        label: "原生卡",
        value: "原生卡",
        match: (t) =>
          /原生卡|原生線路|本地\s*IP|本地IP|Native\s*IP|^native$/i.test(t),
      },
    ],
  },
  {
    key: "promo",
    label: "推薦",
    multi: true,
    options: [
      {
        label: "Hot Sale",
        value: "hotsale",
        match: (t) =>
          /^hotsale$/i.test(t) || /hot[\s_-]*sale|熱銷|熱門推薦/i.test(t),
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
        match: (t) =>
          /AU\s*\(?\s*KDDI\s*\)?/i.test(t) ||
          (/^au$/i.test(t) && !/10\s*Mbps/i.test(t)),
      },
      {
        label: "AU(KDDI) 高速數據",
        value: "AU(KDDI) 高速數據",
        match: (t) => /AU.*高速|高速數據/i.test(t),
      },
      {
        label: "AU(KDDI) 10Mbps",
        value: "AU(KDDI) 10Mbps",
        match: (t) => /AU.*KDDI/i.test(t) && /10\s*Mbps/i.test(t),
      },
      {
        label: "SoftBank",
        value: "SoftBank",
        match: (t) =>
          /SoftBank/i.test(t) &&
          !/KDDI/i.test(t) &&
          !/10\s*Mbps/i.test(t),
      },
      {
        label: "SoftBank / KDDI",
        value: "SoftBank / KDDI",
        match: (t) =>
          /SoftBank/i.test(t) &&
          /KDDI/i.test(t) &&
          !/Docomo|DOCOMO|三網/i.test(t) &&
          !/10\s*Mbps/i.test(t),
      },
      {
        label: "KDDI / SoftBank / Docomo +",
        value: "KDDI / SoftBank / Docomo +",
        match: (t) =>
          /KDDI/i.test(t) &&
          /SoftBank/i.test(t) &&
          /Docomo|DOCOMO/i.test(t),
      },
      {
        label: "SoftBank / KDDI 10Mbps",
        value: "SoftBank / KDDI 10Mbps",
        match: (t) => /SoftBank/i.test(t) && /10\s*Mbps/i.test(t),
      },
      {
        label: "IIJ Docomo",
        value: "IIJ Docomo",
        match: (t) => /IIJ/i.test(t) || (/Docomo|NTT/i.test(t) && !/SoftBank|KDDI/i.test(t)),
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

  // 從電信商規格補網路制式／原生線路（有才加入）
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
      const route = String(entry?.route_type || entry?.line || "");
      const ip = String(entry?.ip_type || "");
      if (/原生/i.test(route) || /本地/i.test(ip) || /Native/i.test(route + ip)) {
        tags.add("原生卡");
      }
    }
    for (const key of Object.keys(specs)) {
      if (key && key !== "default") tags.add(key);
    }
  }

  // 標題／metadata 語意補強
  if (/吃到飽|無限/i.test(title)) tags.add("吃到飽");
  if (/每日型|每日/i.test(title)) tags.add("每日型");
  if (/原生|本地\s*IP|本地IP/i.test(title)) tags.add("原生卡");
  if (
    product?.metadata?.is_native === true ||
    product?.metadata?.native === true ||
    /native/i.test(String(product?.metadata?.line_type || ""))
  ) {
    tags.add("原生卡");
  }

  const hotSale = parseHotSaleTelecoms(product?.metadata?.hot_sale_telecoms);
  if (hotSale.length > 0) tags.add("hotsale");
  if (
    product?.metadata?.hot_sale === true ||
    product?.metadata?.hotsale === true
  ) {
    tags.add("hotsale");
  }

  // 國家／地區分類（供 /product 外層篩選）
  for (const c of product?.categories || []) {
    const handle = String(c?.handle || c?.slug || "")
      .trim()
      .toLowerCase();
    if (handle && handle !== "uncategorized") {
      tags.add(`country:${handle}`);
    }
  }

  return Array.from(tags).filter(Boolean);
}

/** 從商品列表動態產生「國家分類」選項 */
function buildCountryGroup(products = []) {
  const map = new Map();

  for (const p of products) {
    const slug = String(p?.category_slug || "")
      .trim()
      .toLowerCase();
    const name = String(p?.category_name || "").trim();

    if (slug && slug !== "uncategorized") {
      const value = `country:${slug}`;
      const prev = map.get(value);
      if (!prev) {
        map.set(value, {
          label: name || slug,
          value,
          match: (t) => String(t) === value,
        });
      } else if (name && prev.label === slug) {
        prev.label = name;
      }
    }

    for (const t of p?.tags || []) {
      const m = /^country:(.+)$/i.exec(String(t));
      if (!m) continue;
      const handle = m[1].trim().toLowerCase();
      if (!handle || handle === "uncategorized") continue;
      const value = `country:${handle}`;
      if (!map.has(value)) {
        map.set(value, {
          label: name || handle,
          value,
          match: (tag) => String(tag) === value,
        });
      }
    }
  }

  const options = [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "zh-TW"),
  );

  if (options.length <= 1) return null;

  return {
    key: "country",
    label: "國家分類",
    multi: true,
    options,
  };
}

function getFilterGroups(products = []) {
  const country = buildCountryGroup(products);
  return country ? [country, ...FILTER_GROUPS] : FILTER_GROUPS;
}

/** 卡片顯示用：去掉電信商選項尾端的 4G/5G */
function normalizeCardTelecomLabel(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  if (/^hotsale$/i.test(s)) return "";
  if (/^\d+\s*天$/.test(s)) return "";
  if (/^\d+(\.\d+)?\s*GB$/i.test(s)) return "";
  if (
    /^(吃到飽|無限流量|每日型|總量型|原生卡|支援熱點|熱點|5G|4G|Hot Sale)$/i.test(
      s,
    )
  ) {
    return "";
  }
  // 與商品頁電信按鈕一致：不顯示尾端 4G/5G
  s = s
    .replace(/\s*[45]G(?:\s*\/\s*[45]G)?\s*$/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return s;
}

/**
 * 商品卡顯示用標籤：只列出該商品內有的電信商名稱
 * （不再顯示 吃到飽／Hot Sale／5G／熱點 等規格標）
 */
export function buildDisplayTagsFromProduct(product, _filterTags = []) {
  const tags = [];
  const pushUnique = (raw) => {
    const label = normalizeCardTelecomLabel(raw);
    if (!label || tags.includes(label)) return;
    tags.push(label);
  };

  // 1) Medusa options「電信商」
  for (const o of product?.options || []) {
    if (!/電信/i.test(String(o?.title || ""))) continue;
    for (const v of o.values || []) {
      pushUnique(typeof v === "string" ? v : v?.value);
    }
  }

  // 2) 變體 option 值（options.values 有時未展開）
  if (tags.length === 0) {
    const optMap = {};
    for (const o of product?.options || []) {
      if (o?.id) optMap[o.id] = String(o.title || "");
    }
    for (const v of product?.variants || []) {
      for (const o of v?.options || []) {
        if (/電信/i.test(optMap[o.option_id] || "")) {
          pushUnique(o.value);
        }
      }
    }
  }

  // 3) metadata 依電信商分組的 key
  const metaObjs = [
    product?.metadata?.carrier_specs_by_carrier,
    product?.metadata?.carrier_profit_by_carrier,
    product?.metadata?.subtitle_by_carrier,
    product?.metadata?.key_features_by_carrier,
  ];
  for (const raw of metaObjs) {
    let obj = raw;
    if (typeof raw === "string") {
      try {
        obj = JSON.parse(raw);
      } catch {
        obj = null;
      }
    }
    if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        if (key && key !== "default") pushUnique(key);
      }
    }
  }

  // 4) hot_sale_telecoms（通常已在 options 內，補漏）
  for (const t of parseHotSaleTelecoms(product?.metadata?.hot_sale_telecoms)) {
    pushUnique(t);
  }

  return tags;
}

function productMatchesFilterOption(product, opt) {
  const tags = product?.tags || [];
  if (tags.some((t) => opt.match(String(t)))) return true;

  // 國家分類：相容只有 category_slug、尚未寫入 country: tag 的舊資料
  if (String(opt.value || "").startsWith("country:")) {
    const handle = String(opt.value).slice("country:".length);
    const slug = String(product?.category_slug || "").toLowerCase();
    if (slug && slug === handle) return true;
  }
  return false;
}

/** 供分類頁／商店頁使用：依 activeTags 過濾商品 */
export function filterProductsByTags(products, activeTags) {
  if (!activeTags || activeTags.length === 0) return products;
  const groups = getFilterGroups(products);
  return products.filter((p) =>
    activeTags.every((activeVal) => {
      for (const group of groups) {
        const opt = group.options.find((o) => o.value === activeVal);
        if (opt) return productMatchesFilterOption(p, opt);
      }
      return (p.tags || []).includes(activeVal);
    }),
  );
}

function buildCounts(products) {
  const counts = {};
  for (const group of getFilterGroups(products)) {
    for (const opt of group.options) {
      const key = `${group.key}:${opt.value}`;
      counts[key] = products.filter((p) =>
        productMatchesFilterOption(p, opt),
      ).length;
    }
  }
  return counts;
}

function resolveActiveTagLabel(tag, groups) {
  for (const group of groups) {
    const opt = group.options.find((o) => o.value === tag);
    if (opt) return opt.label;
  }
  if (String(tag).startsWith("country:")) {
    return String(tag).slice("country:".length);
  }
  return tag;
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
  const filterGroups = useMemo(() => getFilterGroups(products), [products]);
  const counts = useMemo(() => buildCounts(products), [products]);

  const visibleGroups = useMemo(
    () =>
      filterGroups.filter((group) =>
        group.options.some(
          (opt) => (counts[`${group.key}:${opt.value}`] ?? 0) > 0,
        ),
      ),
    [counts, filterGroups],
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
          {activeTags.map((tag) => {
            const label = resolveActiveTagLabel(tag, filterGroups);
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] bg-[#0A6CD0] text-white rounded-full px-2.5 py-0.5"
              >
                {label}
                <button
                  type="button"
                  onClick={() =>
                    setActiveTags?.(activeTags.filter((t) => t !== tag))
                  }
                  className="ml-0.5 hover:bg-white/20 rounded-full"
                  aria-label={`移除 ${label}`}
                >
                  ×
                </button>
              </span>
            );
          })}
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
