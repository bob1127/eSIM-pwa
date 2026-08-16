"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AccountIcon from "@/components/account/AccountIcon";
import { scoreFields } from "@/lib/siteSearch";
import { extractEsimsFromOrders } from "@/lib/esimOrderExtract";

const NAV_KEYWORDS = {
  home: "首頁 賣場 回到",
  dashboard: "首頁 總覽 會員 概覽",
  orders: "訂單 購買 esim 已買 我的卡 出貨",
  traffic: "流量 用量 iccid 剩餘 查詢 數據 topup",
  follows: "追蹤 創作者 人氣 文章 follow",
  settings: "設定 帳號 密碼 個人 資料",
  support: "安裝 支援 教學 qrcode",
  admin_dashboard: "系統 總控 後台 管理",
  partner_dashboard: "店鋪 夥伴 賣場 分潤",
  partner_portal: "夥伴 後台 店鋪",
};

function lineItemNames(order) {
  const raw = order?.item_details ?? order?.items;
  let items = raw;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) return "";
  return items
    .filter((i) => i && !i._payment_demo)
    .map((i) => i.name || i.productName || i.title || "")
    .filter(Boolean)
    .join(" ");
}

function memberHits(query, navItems, orders) {
  const q = String(query || "").trim();
  if (!q) return [];

  const navHits = (navItems || [])
    .filter((item) => !item.external)
    .map((item) => {
      const keywords = NAV_KEYWORDS[item.id] || "";
      const score = scoreFields(
        { title: item.label, keywords, excerpt: item.id },
        q,
      );
      if (!score) return null;
      return {
        id: `nav-${item.id}`,
        tabId: item.href ? null : item.id,
        href: item.href || null,
        title: item.label,
        excerpt: "會員功能",
        sourceLabel: "功能",
        icon: item.icon || "search",
        score: score + 40,
      };
    })
    .filter(Boolean);

  const orderHits = (orders || [])
    .map((order) => {
      const id = String(order.id || "");
      const short = id.slice(0, 8).toUpperCase();
      const names = lineItemNames(order);
      const title = names || `訂單 #${short}`;
      const score = scoreFields(
        {
          title,
          keywords: `#${id} ${short} ${names} ${order.status || ""} 訂單`,
          excerpt: `訂單 ${short}`,
        },
        q,
      );
      if (!score) return null;
      return {
        id: `order-${id}`,
        tabId: "orders",
        title,
        excerpt: `訂單 #${short}`,
        sourceLabel: "訂單",
        icon: "qr_code_2",
        score,
      };
    })
    .filter(Boolean);

  const trafficHits = extractEsimsFromOrders(orders || [])
    .map((e) => {
      const title = e.productName || "eSIM 方案";
      const score = scoreFields(
        {
          title,
          keywords: `${e.topupId} ${e.iccid || ""} 流量 用量 topup`,
          excerpt: e.topupId,
        },
        q,
      );
      if (!score) return null;
      return {
        id: `esim-${e.topupId}`,
        tabId: "traffic",
        title,
        excerpt: e.topupId,
        sourceLabel: "流量",
        icon: "speed",
        score,
      };
    })
    .filter(Boolean);

  return [...navHits, ...orderHits, ...trafficHits]
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

export default function AccountMemberSearch({
  navItems = [],
  orders = [],
  onTabChange,
  className = "",
}) {
  const listId = `account-search-${useId()}`;
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(
    () => memberHits(query, navItems, orders),
    [query, navItems, orders],
  );

  const close = useCallback(() => {
    setOpen(false);
    setActive(0);
  }, []);

  useEffect(() => {
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);

  useEffect(() => {
    setActive(0);
  }, [results.length, query]);

  const pick = (item) => {
    if (!item) return;
    if (item.tabId && onTabChange) {
      onTabChange(item.tabId);
      setQuery("");
      close();
      return;
    }
    if (item.href) {
      setQuery("");
      close();
    }
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item?.href && !item.tabId) {
        window.location.href = item.href;
      } else {
        pick(item);
      }
    }
  };

  const showPanel = open && query.trim().length > 0;
  const empty = showPanel && results.length === 0;

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <AccountIcon
        name="search"
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-[1]"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query.trim() && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="搜尋訂單、流量、會員功能…"
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showPanel}
        className="w-full h-8 rounded-md bg-white/10 focus:bg-white text-white focus:text-[#1a1a1a] placeholder:text-gray-400 text-xs pl-8 pr-8 outline-none transition [&::-webkit-search-cancel-button]:appearance-none"
      />
      {query ? (
        <button
          type="button"
          aria-label="清除"
          onClick={() => {
            setQuery("");
            close();
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <AccountIcon name="close" size={14} />
        </button>
      ) : null}

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[70] max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {empty ? (
            <p className="px-3 py-3 text-xs text-slate-500">
              會員中心找不到「{query.trim()}」
            </p>
          ) : null}
          <ul className="py-1 divide-y divide-slate-50">
            {results.map((item, i) => {
              const inner = (
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <AccountIcon name={item.icon || "search"} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-1">
                      {item.title}
                    </p>
                    {item.excerpt ? (
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                        {item.excerpt}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                      {item.sourceLabel}
                    </p>
                  </div>
                </div>
              );
              const cls = `block w-full text-left px-3 py-2.5 ${
                i === active ? "bg-slate-50" : "hover:bg-slate-50"
              }`;
              if (item.tabId) {
                return (
                  <li key={item.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      className={cls}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(item)}
                    >
                      {inner}
                    </button>
                  </li>
                );
              }
              return (
                <li key={item.id} role="option" aria-selected={i === active}>
                  <Link
                    href={item.href || "/"}
                    className={cls}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(item)}
                  >
                    {inner}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
