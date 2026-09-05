"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  destinationCount,
  destinationLabel,
  filterDestinationTree,
  makeCustomDestination,
  sanitizeDestinationIds,
} from "@/lib/itineraryDestinations";

const chipOn = "bg-slate-900 text-white border-slate-900";
const chipOff =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-400";

export default function ItineraryDestinationPicker({
  value = [],
  onChange,
  inheritLabel = "",
  missingHint = "",
}) {
  const selected = sanitizeDestinationIds(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState("");
  const [customText, setCustomText] = useState("");
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const tree = useMemo(() => filterDestinationTree(query), [query]);
  const counts = destinationCount();

  const setSelected = (next) => onChange(sanitizeDestinationIds(next));

  const toggle = (id) => {
    if (selected.includes(id)) setSelected(selected.filter((x) => x !== id));
    else setSelected([...selected, id]);
  };

  const addCustom = () => {
    const id = makeCustomDestination(customText);
    if (!id) return;
    if (!selected.includes(id)) setSelected([...selected, id]);
    setCustomText("");
  };
  const summary = inherit
    ? inheritLabel
    : selected.length
      ? selected.map(destinationLabel).join("、")
      : "搜尋並選擇國家或城市";

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
    setQuery("");
    return undefined;
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {inheritLabel ? (
          <button
            type="button"
            onClick={() => setSelected([])}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              inherit ? chipOn : chipOff
            }`}
          >
            {inheritLabel}
          </button>
        ) : null}
        {selected.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${chipOn}`}
          >
            {destinationLabel(id)} ×
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2.5 text-left bg-white hover:border-slate-400"
      >
        <span
          className={`min-w-0 truncate text-[13px] ${
            selected.length || inherit ? "text-slate-800 font-semibold" : "text-slate-400"
          }`}
        >
          {summary}
        </span>
        <span className="text-[11px] text-slate-400 shrink-0">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 space-y-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenId("");
              }}
              placeholder="搜尋國家或城市，例如：東京、曼谷、巴黎"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-slate-400"
            />
            <div className="flex gap-1.5">
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value.slice(0, 40))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder="其他：自行輸入地區"
                className="min-w-0 flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={addCustom}
                disabled={!customText.trim()}
                className="shrink-0 px-3 rounded-lg bg-slate-900 text-white text-[12px] font-bold disabled:opacity-30"
              >
                新增
              </button>
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {tree.map((country) => {
              const expanded = openId === country.id || Boolean(query);
              const countryOn = selected.includes(country.id);
              return (
                <div
                  key={country.id}
                  className="border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => toggle(country.id)}
                      className={`m-1.5 text-[11px] font-bold px-2 py-1 rounded-full border shrink-0 ${
                        countryOn ? chipOn : chipOff
                      }`}
                    >
                      {countryOn ? "已選" : "選國家"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenId(expanded && !query ? "" : country.id)
                      }
                      className="flex-1 min-w-0 px-2 py-2 text-left text-[13px] font-bold text-slate-800"
                    >
                      {country.label}
                      <span className="ml-1.5 text-[11px] font-medium text-slate-400">
                        {(country.regions || []).length
                          ? `${country.regions.length} 個地區`
                          : "全國"}
                      </span>
                    </button>
                  </div>
                  {expanded ? (
                    <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                      {(country.regions || []).length === 0 ? (
                        <p className="text-[11px] text-slate-400">
                          點左側即可選此國家
                        </p>
                      ) : (
                        country.regions.map((r) => {
                          const on = selected.includes(r.id);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => toggle(r.id)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                on ? chipOn : chipOff
                              }`}
                            >
                              {r.label}
                            </button>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {tree.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-slate-400">
                沒有符合的地區
              </p>
            ) : null}
          </div>
          <p className="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-100">
            {counts.countries} 國 · {counts.places} 筆可選 · 輸入關鍵字即時篩選
          </p>
        </div>
      ) : null}

      {missingHint && selected.length === 0 && !inheritLabel ? (
        <p className="mt-2 text-[11px] font-bold text-rose-500">{missingHint}</p>
      ) : null}
    </div>
  );
}
