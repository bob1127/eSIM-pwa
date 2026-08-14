"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

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
}) {
  const domain = store?.domain;
  const base = `/p/${domain}`;
  const blogList = listHref || `${base}/blog/`;
  const postHref = (slug) =>
    typeof articleHref === "function"
      ? articleHref(slug)
      : `${base}/blog/${slug}/`;
  const [q, setQ] = useState("");

  const nav = [
    { key: "home", label: "首頁", href: `${base}/` },
    { key: "about", label: "關於我們", href: `${base}/#about` },
    { key: "article", label: "旅遊文章", href: `${base}/blog/` },
    {
      key: "shop",
      label: "選購方案",
      href: `${base}/#plans`,
    },
  ];

  const recent = useMemo(() => posts.slice(0, 4), [posts]);
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
    <aside className="w-full lg:w-[300px] shrink-0 lg:sticky lg:top-24 lg:self-start">
      <div className="space-y-8">
        {/* 2x2 導覽 */}
        <nav className="border border-slate-200">
          <div className="grid grid-cols-2">
            {nav.map((item, idx) => (
              <Link
                key={item.key}
                href={item.href}
                className={`text-center text-[12px] font-bold tracking-wide py-4 hover:bg-slate-50 transition-colors ${
                  idx % 2 === 0 ? "border-r border-slate-200" : ""
                } ${idx < 2 ? "border-b border-slate-200" : ""} ${
                  active === item.key ? "bg-slate-50 text-slate-900" : "text-slate-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* 搜尋 */}
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 border border-slate-200 bg-[#faf9f6] px-3 py-2.5"
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

        {/* 分類篩選 */}
        {categories.length > 0 ? (
          <div className="border border-slate-200 bg-[#faf9f6] px-4 py-4">
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

        {/* 最新文章 */}
        {recent.length > 0 ? (
          <div>
            <p className="text-[12px] font-bold text-slate-500 mb-3">
              最新文章
            </p>
            <ul className="space-y-4">
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
                      <p className="text-[12px] font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-[#0A6CD0] transition-colors">
                        {post.title}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400 tracking-wide">
                        {post.date}{" "}
                        <span>{post.categoryLabel}</span>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
