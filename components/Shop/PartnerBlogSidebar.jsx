"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import PartnerSocialIcons from "@/components/Shop/PartnerSocialIcons";

/**
 * 夥伴 Blog 右側欄（CHA 編輯風格）
 */
export default function PartnerBlogSidebar({
  store,
  posts = [],
  pickupProduct = null,
  active = "article",
  onSearch,
  isOwner = false,
  onEditFeatured,
}) {
  const domain = store?.domain;
  const base = `/p/${domain}`;
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
  const hasSocial = Boolean(
    store?.social_instagram?.trim() ||
      store?.social_facebook?.trim() ||
      store?.social_line?.trim(),
  );

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(q.trim());
  };

  return (
    <aside className="w-full lg:w-[260px] shrink-0">
      <div className="lg:sticky lg:top-28 space-y-8">
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
          className="flex items-center gap-2 border border-slate-300 px-3 py-2.5"
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

        {/* 追蹤我們 — 品牌色社群圖示 */}
        <div className="border border-slate-200 bg-[#faf9f6] px-4 py-4">
          <p className="text-[12px] font-bold text-slate-500 mb-3">追蹤我們</p>
          <PartnerSocialIcons
            store={store}
            size="md"
            showLabels={hasSocial}
            emptyHint
          />
        </div>

        {/* 精選商品 */}
        {pickupProduct || isOwner ? (
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-[12px] font-bold text-slate-500">精選商品</p>
              {isOwner ? (
                <button
                  type="button"
                  onClick={onEditFeatured}
                  className="text-[10px] font-bold text-[#0A6CD0] hover:underline"
                >
                  編輯
                </button>
              ) : null}
            </div>
            {pickupProduct ? (
              <Link
                href={`${base}/${pickupProduct.id}/`}
                className="block"
              >
                <div className="relative aspect-[4/5] bg-[#efeee9] overflow-hidden">
                  {pickupProduct.image ? (
                    <Image
                      src={pickupProduct.image}
                      alt={pickupProduct.name}
                      fill
                      className="object-contain p-4"
                      sizes="260px"
                    />
                  ) : null}
                </div>
                <p className="mt-3 text-[13px] font-bold text-[#0A6CD0] leading-snug">
                  {pickupProduct.name}
                </p>
                {pickupProduct.displayPrice > 0 ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    NT${Number(pickupProduct.displayPrice).toLocaleString()} 起
                  </p>
                ) : null}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onEditFeatured}
                className="w-full border border-dashed border-slate-300 px-3 py-8 text-[11px] text-slate-500 hover:border-[#0A6CD0] hover:text-[#0A6CD0]"
              >
                選擇側欄精選商品
              </button>
            )}
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
                    href={`${base}/blog/${post.slug}/`}
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
