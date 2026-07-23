"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  FacebookIconSvg,
  InstagramIconSvg,
  LineIconSvg,
} from "@/components/social/SocialBrandIcons";
import { Search } from "lucide-react";

function MonoSocial({ store }) {
  const items = [
    {
      key: "instagram",
      label: "Instagram",
      href: store?.social_instagram?.trim(),
      icon: <InstagramIconSvg className="w-4 h-4" />,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: store?.social_facebook?.trim(),
      icon: <FacebookIconSvg className="w-4 h-4" />,
    },
    {
      key: "line",
      label: "LINE",
      href: store?.social_line?.trim(),
      icon: <LineIconSvg className="w-4 h-4" />,
    },
  ].filter((i) => i.href);

  if (!items.length) {
    return (
      <p className="text-[11px] text-slate-400 leading-relaxed">
        請於夥伴後台「商店設定」填寫 IG／FB／LINE
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          className="w-9 h-9 rounded-full border border-slate-300 bg-white text-slate-800 inline-flex items-center justify-center hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
        >
          {item.icon}
        </a>
      ))}
    </div>
  );
}

/**
 * 夥伴 Blog 右側欄（CHA 編輯風格）
 */
export default function PartnerBlogSidebar({
  store,
  posts = [],
  pickupProduct = null,
  active = "article",
  onSearch,
}) {
  const domain = store?.domain;
  const base = `/p/${domain}`;
  const [q, setQ] = useState("");

  const nav = [
    { key: "home", label: "HOME", href: `${base}/` },
    { key: "about", label: "ABOUT", href: `${base}/#about` },
    { key: "article", label: "ARTICLE", href: `${base}/blog/` },
    {
      key: "shop",
      label: "SHOP",
      href: `${base}/#plans`,
    },
  ];

  const recent = useMemo(() => posts.slice(0, 4), [posts]);

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
                className={`text-center text-[11px] font-bold tracking-[0.18em] uppercase py-4 hover:bg-slate-50 transition-colors ${
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

        {/* FOLLOW US */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-slate-500 mb-3">
            Follow Us
          </p>
          <MonoSocial store={store} />
        </div>

        {/* 精選商品 */}
        {pickupProduct ? (
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-slate-500 mb-3">
              Pick Up Items
            </p>
            <Link
              href={`${base}/${pickupProduct.id}/`}
              className="group block"
            >
              <div className="relative aspect-[4/5] bg-[#efeee9] overflow-hidden">
                {pickupProduct.image ? (
                  <Image
                    src={pickupProduct.image}
                    alt={pickupProduct.name}
                    fill
                    className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    sizes="260px"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25">
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white border-b border-white pb-0.5">
                    Read More
                  </span>
                </span>
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
          </div>
        ) : null}

        {/* 最新文章 */}
        {recent.length > 0 ? (
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-slate-500 mb-3">
              Latest
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
                        <span className="uppercase">{post.categoryLabel}</span>
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
