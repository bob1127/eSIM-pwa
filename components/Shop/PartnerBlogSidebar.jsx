"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { partnerPagePaths } from "@/lib/partnerStorePages";

function CategoryRow({ label, count, selected, onSelect, href }) {
  const cls = `w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left text-[12px] transition-colors ${
    selected
      ? "bg-white text-slate-900 font-bold shadow-[inset_2px_0_0_#0A6CD0]"
      : "text-slate-600 font-medium hover:bg-white/80"
  }`;
  const inner = (
    <>
      <span className="truncate">{label}</span>
      <span className={`tabular-nums text-[10px] ${selected ? "text-[#0A6CD0]" : "text-slate-400"}`}>
        {count}
      </span>
    </>
  );
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href || "#"} className={cls}>
      {inner}
    </Link>
  );
}

function pagerPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/**
 * 夥伴 Blog 右側欄（CHA 編輯風格）
 */
export default function PartnerBlogSidebar({
  store,
  posts = [],
  active = "article",
  onSearch,
  articleHref,
  selectedCategory = "",
  onSelectCategory,
  listHref,
  extra = null,
  showSearch = true,
  showCategories = true,
  fillHeight = false,
}) {
  const domain = store?.domain;
  const paths = partnerPagePaths(domain);
  const blogList = listHref || paths.blog;
  const postHref = (slug) =>
    typeof articleHref === "function"
      ? articleHref(slug)
      : `${paths.blog}${slug}/`;

  const nav = [
    { key: "home", label: "首頁", href: paths.home },
    { key: "about", label: "關於我們", href: paths.about },
    { key: "article", label: "旅遊文章", href: paths.blog },
    { key: "shop", label: "選購方案", href: paths.plans },
    { key: "terms", label: "服務條款", href: paths.terms },
    { key: "contact", label: "聯絡我們", href: paths.contact },
  ];

  const [q, setQ] = useState("");
  const [recentPage, setRecentPage] = useState(1);
  const RECENT_PER_PAGE = 4;

  const recentAll = useMemo(() => {
    const seen = new Set();
    return posts.filter((p) => {
      if (!p?.slug || seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    });
  }, [posts]);
  const recentPages = Math.max(1, Math.ceil(recentAll.length / RECENT_PER_PAGE));
  const safeRecentPage = Math.min(recentPage, recentPages);
  const recent = recentAll.slice(
    (safeRecentPage - 1) * RECENT_PER_PAGE,
    safeRecentPage * RECENT_PER_PAGE,
  );

  useEffect(() => {
    setRecentPage(1);
  }, [recentAll.length]);
  const categories = useMemo(() => {
    const map = new Map();
    posts.forEach((p) => {
      const label = String(p.categoryLabel || "").trim();
      if (!label) return;
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hant"));
  }, [posts]);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(q.trim());
  };

  const filterInteractive = typeof onSelectCategory === "function";

  return (
    <aside className={`w-full ${fillHeight ? "h-full min-h-0 flex flex-col" : ""}`}>
      <div
        className={
          fillHeight
            ? "flex flex-col h-full min-h-0 gap-5"
            : "space-y-8"
        }
      >
        {/* 2x2 導覽 */}
        <nav className={`border border-slate-200 relative z-10 ${fillHeight ? "shrink-0" : ""}`}>
          <div className="grid grid-cols-2">
            {nav.map((item, idx) => (
              <Link
                key={item.key}
                href={item.href}
                className={`block text-center text-[12px] font-bold tracking-wide py-4 hover:bg-slate-50 transition-colors ${
                  idx % 2 === 0 ? "border-r border-slate-200" : ""
                } ${idx < nav.length - 2 ? "border-b border-slate-200" : ""} ${
                  active === item.key ? "bg-slate-50 text-slate-900" : "text-slate-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {showSearch ? (
        <form
          onSubmit={handleSearch}
          className={`flex items-center gap-2 border border-slate-200 bg-white px-3 py-2.5 ${
            fillHeight ? "shrink-0" : ""
          }`}
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋文章…"
            className="w-full text-[12px] text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
          />
        </form>
        ) : null}

        {extra ? (
          <div
            className={
              fillHeight
                ? "shrink-0 min-h-0 max-h-[min(50%,420px)] overflow-y-auto"
                : ""
            }
          >
            {extra}
          </div>
        ) : null}

        {showCategories && categories.length > 0 ? (
          <div className={`border border-slate-200 bg-white px-4 py-4 ${fillHeight ? "shrink-0 max-h-[28%] overflow-y-auto" : ""}`}>
            <p className="text-[12px] font-bold text-slate-500 mb-3">
              文章分類
            </p>
            <ul className="space-y-0.5">
              <li>
                <CategoryRow
                  label="全部"
                  count={posts.length}
                  selected={!selectedCategory}
                  onSelect={filterInteractive ? () => onSelectCategory("") : undefined}
                  href={blogList}
                />
              </li>
              {categories.map((cat) => (
                <li key={cat.label}>
                  <CategoryRow
                    label={cat.label}
                    count={cat.count}
                    selected={selectedCategory === cat.label}
                    onSelect={
                      filterInteractive ? () => onSelectCategory(cat.label) : undefined
                    }
                    href={`${blogList}?cat=${encodeURIComponent(cat.label)}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {recentAll.length > 0 ? (
          <div
            className={
              fillHeight ? "flex-1 min-h-0 flex flex-col" : ""
            }
          >
            <p className="text-[12px] font-bold text-slate-500 mb-3 shrink-0">
              最新文章
            </p>
            <ul className={fillHeight ? "flex-1 min-h-0 overflow-y-auto space-y-4" : "space-y-4"}>
              {recent.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={postHref(post.slug)}
                    className="flex gap-3 group"
                  >
                    <div className="relative w-16 h-14 shrink-0 bg-slate-100 overflow-hidden">
                      {post.image ? (
                        <Image
                          src={post.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-[#0A6CD0] transition-colors">
                        {post.title}
                      </p>
                      <p className="mt-1 text-[15px] text-slate-400 tracking-wide">
                        {post.date}{" "}
                        <span>{post.categoryLabel}</span>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {recentPages > 1 ? (
              <nav
                className="shrink-0 pt-3 mt-1 pb-1 flex items-center justify-center gap-1"
                aria-label="最新文章分頁"
              >
                <button
                  type="button"
                  disabled={safeRecentPage <= 1}
                  onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                  className="h-7 min-w-7 text-[13px] font-bold text-[#0A6CD0] disabled:opacity-30"
                >
                  ‹
                </button>
                {pagerPages(safeRecentPage, recentPages).map((n, i) =>
                  n === "…" ? (
                    <span
                      key={`e-${i}`}
                      className="h-7 min-w-5 text-[12px] text-slate-400 text-center"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRecentPage(n)}
                      className={`h-7 min-w-7 px-1.5 text-[12px] font-bold ${
                        n === safeRecentPage
                          ? "bg-[#0A6CD0] text-white"
                          : "text-[#555] hover:bg-[#F0F1F3]"
                      }`}
                    >
                      {n}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={safeRecentPage >= recentPages}
                  onClick={() => setRecentPage((p) => Math.min(recentPages, p + 1))}
                  className="h-7 min-w-7 text-[13px] font-bold text-[#0A6CD0] disabled:opacity-30"
                >
                  ›
                </button>
              </nav>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
