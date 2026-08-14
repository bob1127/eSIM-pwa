"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { displaySourceLabel } from "@/lib/siteSearch";

/**
 * Navbar 即時搜尋
 * - scope=site：全站（主站）
 * - scope=partner：僅該夥伴賣場
 * - variant=overlay：滿版藍色搜尋層（無陰影）
 *
 * @param {{
 *   variant?: "icon" | "inline" | "overlay",
 *   scope?: "site" | "partner",
 *   domain?: string,
 *   className?: string,
 *   panelClassName?: string,
 *   placeholder?: string,
 *   onNavigate?: () => void,
 * }} props
 */
export default function NavbarSiteSearch({
  variant = "icon",
  scope = "site",
  domain = "",
  className,
  panelClassName,
  placeholder,
  onNavigate,
} = {}) {
  const isPartner = scope === "partner" && !!domain;
  const isOverlay = variant === "overlay";
  const hint = isPartner
    ? "只搜尋本店方案、文章與頁面"
    : "可搜尋產品、文章、條款與站內頁面";
  const ph =
    placeholder ||
    (isPartner ? "搜尋本店方案、文章…" : "搜尋商品、文章、條款…");
  const reactId = useId();
  const listId = `site-search-${reactId}`;
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setError("");
    setLoading(false);
  }, []);

  const runSearch = useCallback(async (q) => {
    const trimmed = String(q || "").trim();
    if (trimmed.length < 1) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");

    try {
      const url = isPartner
        ? `/api/partner/site-search?domain=${encodeURIComponent(domain)}&q=${encodeURIComponent(trimmed)}`
        : `/api/site-search?q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, { signal: ctrl.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "搜尋失敗");
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setResults([]);
      setError(err.message || "搜尋失敗");
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  }, [isPartner, domain]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e) => {
      if (isOverlay) return;
      if (!rootRef.current?.contains(e.target)) {
        if (variant === "icon") close();
        else setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    if (!isOverlay) document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, close, variant, isOverlay]);

  useEffect(() => {
    if (!open || !isOverlay) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isOverlay]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const onChange = (value) => {
    setQuery(value);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 220);
  };

  const handleNavigate = () => {
    onNavigate?.();
    close();
  };

  const showPanel = open && (query.trim().length > 0 || loading);

  // type="search" 在部分瀏覽器（Chrome／Safari）會自帶原生 × 清除鈕，
  // 與下面自訂的 XMarkIcon 按鈕疊在一起變成「兩個關閉鈕」，
  // 故用 type="text" + 明確關掉 webkit 原生清除鈕樣式。
  const inputClassName =
    "w-full border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-[13px] outline-none ring-0 focus:outline-none focus:ring-0 focus:border-slate-200 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none";

  const SourceMark = ({ source, label }) => (
    <span className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-black leading-none">
      {label || displaySourceLabel(source)}
      <ArrowRightIcon className="w-2.5 h-2.5 stroke-[2.5]" aria-hidden />
    </span>
  );

  const ResultList = ({ dense = false }) => (
    <ul className="divide-y divide-slate-100">
      {results.map((item) => (
        <li key={item.id} role="option">
          <Link
            href={item.href}
            onClick={handleNavigate}
            className={cn(
              "flex items-start gap-3 hover:bg-slate-50 transition-colors",
              dense ? "px-3 py-2.5" : "px-4 py-2.5",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-1">
                {item.title}
              </p>
              {item.excerpt ? (
                <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                  {item.excerpt}
                </p>
              ) : null}
              <SourceMark source={item.source} label={item.sourceLabel} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  const panel = showPanel ? (
    <div
      id={listId}
      role="listbox"
      className={cn(
        "absolute left-0 right-0 top-[calc(100%+6px)] z-[60] max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl",
        panelClassName,
      )}
    >
      {loading && results.length === 0 && (
        <p className="px-4 py-3 text-xs text-slate-500">搜尋中…</p>
      )}
      {error && (
        <p className="px-4 py-3 text-xs font-bold text-red-600">{error}</p>
      )}
      {!loading && !error && query.trim() && results.length === 0 && (
        <p className="px-4 py-3 text-xs text-slate-500">
          找不到「{query.trim()}」相關結果
        </p>
      )}
      <div className="py-1">
        <ResultList />
      </div>
    </div>
  ) : null;

  if (variant === "inline" || variant === "bar") {
    const isBar = variant === "bar";
    return (
      <div ref={rootRef} className={cn("relative w-full", className)}>
        <div className={cn("flex items-center gap-2", isBar && "w-full")}>
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlassIcon
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                isBar ? "text-[#1E4AD1]" : "text-slate-400",
              )}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder={ph}
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={showPanel}
              className={
                isBar
                  ? "w-full h-9 rounded-full bg-[#EAF1FB] border-0 pl-9 pr-8 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none ring-0 focus:outline-none focus:ring-1 focus:ring-[#1E4AD1]/35 [&::-webkit-search-cancel-button]:appearance-none"
                  : cn(inputClassName, "pr-3")
              }
            />
            {isBar && query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                aria-label="清除"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            ) : null}
          </div>
          {!isBar ? (
            <button
              type="button"
              onClick={close}
              className="text-[13px] text-slate-500 hover:text-slate-800 shrink-0"
            >
              取消
            </button>
          ) : null}
        </div>
        {showPanel ? (
          <div
            id={listId}
            role="listbox"
            className={cn(
              "absolute left-0 right-0 top-[calc(100%+6px)] z-[60] max-h-[min(70vh,420px)] overflow-y-auto rounded-lg border border-slate-200 bg-white",
              isBar ? "" : "rounded-xl shadow-xl",
              panelClassName,
            )}
          >
            {loading && results.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-500">搜尋中…</p>
            )}
            {error && (
              <p className="px-4 py-3 text-xs font-bold text-red-600">{error}</p>
            )}
            {!loading && !error && query.trim() && results.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-500">
                找不到「{query.trim()}」相關結果
              </p>
            )}
            <div className="py-1">
              <ResultList />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative flex items-center", className)}>
      {isPartner && open ? (
        <div className="relative w-[min(70vw,260px)] mr-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E4AD1]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder={ph}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showPanel}
            className="w-full h-9 rounded-full bg-[#EAF1FB] border-0 pl-9 pr-8 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-[#1E4AD1]/35 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="清除"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          ) : null}
          {showPanel ? (
            <div
              id={listId}
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-[70] max-h-[min(60vh,360px)] overflow-y-auto rounded-lg border border-slate-200 bg-white"
            >
              {loading && results.length === 0 && (
                <p className="px-3 py-2.5 text-xs text-slate-500">搜尋中…</p>
              )}
              {error && (
                <p className="px-3 py-2.5 text-xs font-bold text-red-600">{error}</p>
              )}
              {!loading && !error && query.trim() && results.length === 0 && (
                <p className="px-3 py-2.5 text-xs text-slate-500">
                  找不到「{query.trim()}」相關結果
                </p>
              )}
              <ResultList dense />
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (open) close();
        }}
        className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-50 transition-colors"
        aria-label={isPartner ? "搜尋本店" : "全站搜尋"}
        aria-expanded={open}
      >
        <MagnifyingGlassIcon className="w-6 h-6 text-slate-600" />
      </button>

      {!isPartner && open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-[min(92vw,360px)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onChange(e.target.value)}
                placeholder={ph}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded={showPanel}
                className={inputClassName}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  aria-label="清除"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 px-0.5">{hint}</p>
          {panel ? (
            <div className="relative mt-1">
              <div className="relative left-0 right-0 top-0 max-h-[min(60vh,360px)] overflow-y-auto rounded-lg border border-slate-100">
                {loading && results.length === 0 && (
                  <p className="px-3 py-2.5 text-xs text-slate-500">搜尋中…</p>
                )}
                {error && (
                  <p className="px-3 py-2.5 text-xs font-bold text-red-600">
                    {error}
                  </p>
                )}
                {!loading && !error && query.trim() && results.length === 0 && (
                  <p className="px-3 py-2.5 text-xs text-slate-500">
                    找不到「{query.trim()}」相關結果
                  </p>
                )}
                <ResultList dense />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
