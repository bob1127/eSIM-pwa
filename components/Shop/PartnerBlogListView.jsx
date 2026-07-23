"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PartnerBlogSidebar from "@/components/Shop/PartnerBlogSidebar";
import {
  FacebookIconSvg,
  InstagramIconSvg,
  LineIconSvg,
} from "@/components/social/SocialBrandIcons";

const PAGE_SIZE = 6;

function ArticleCard({ post, domain }) {
  return (
    <article className="flex flex-col">
      <Link
        href={`/p/${domain}/blog/${post.slug}/`}
        className="relative block aspect-[4/3] bg-[#efeee9] overflow-hidden group"
      >
        {post.image ? (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="(max-width:768px) 100vw, 40vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm">
            No Image
          </div>
        )}
      </Link>
      <h2 className="mt-4 text-[16px] sm:text-[17px] font-bold text-slate-900 leading-snug">
        <Link
          href={`/p/${domain}/blog/${post.slug}/`}
          className="hover:text-[#0A6CD0] transition-colors"
        >
          {post.title}
        </Link>
      </h2>
      <p className="mt-2 text-[11px] text-slate-500 tracking-wide">
        <span>{post.date}</span>
        <span className="mx-1.5 text-slate-300">|</span>
        <span className="uppercase font-semibold tracking-[0.12em]">
          {post.categoryLabel}
        </span>
      </p>
    </article>
  );
}

/**
 * 夥伴 Blog 列表（編輯風格：主欄文章格 + 右側側欄）
 */
export default function PartnerBlogListView({
  store,
  posts = [],
  pickupProduct = null,
}) {
  const domain = store?.domain;
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q) ||
        p.categoryLabel?.toLowerCase().includes(q),
    );
  }, [posts, query]);

  const shown = filtered.slice(0, visible);
  const featured = !query ? filtered[0] || null : null;
  const listWithoutFeatured = featured
    ? shown.filter((p) => p.slug !== featured.slug)
    : shown;

  return (
    <div className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
          {/* 主欄 */}
          <div className="flex-1 min-w-0 w-full">
            {/* Hero featured */}
            {featured && !query ? (
              <Link
                href={`/p/${domain}/blog/${featured.slug}/`}
                className="relative block w-full aspect-[16/9] sm:aspect-[21/9] min-h-[220px] bg-slate-200 overflow-hidden mb-10 group"
              >
                {featured.image ? (
                  <Image
                    src={featured.image}
                    alt={featured.title}
                    fill
                    priority
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    sizes="(max-width:1024px) 100vw, 70vw"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                <div className="absolute left-0 right-0 bottom-0 p-6 sm:p-8 flex items-end justify-between gap-4">
                  <div className="max-w-xl">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/80 mb-2">
                      {featured.date} · {featured.categoryLabel}
                    </p>
                    <h1 className="text-white text-xl sm:text-2xl lg:text-3xl font-bold leading-snug">
                      {featured.title}
                    </h1>
                  </div>
                  <span className="hidden sm:inline text-[11px] font-bold tracking-[0.18em] uppercase text-white/90 whitespace-nowrap">
                    Read →
                  </span>
                </div>
              </Link>
            ) : (
              <header className="mb-8">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-slate-400 mb-2">
                  Article
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  旅遊文章
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {store?.store_name} 精選出國攻略與 eSIM 實用知識
                </p>
              </header>
            )}

            {listWithoutFeatured.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-200">
                <p className="text-slate-600 font-bold">目前沒有符合的文章</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10">
                {listWithoutFeatured.map((post) => (
                  <ArticleCard key={post.slug} post={post} domain={domain} />
                ))}
              </div>
            )}

            {visible < filtered.length ? (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="text-[12px] font-bold tracking-[0.22em] uppercase text-slate-800 border-b-2 border-slate-800 pb-1 hover:text-[#0A6CD0] hover:border-[#0A6CD0] transition-colors"
                >
                  Read More
                </button>
              </div>
            ) : null}

            {/* 底部雙欄 CTA */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 min-h-[180px]">
              <Link
                href={`/p/${domain}/`}
                className="relative overflow-hidden min-h-[180px] group"
              >
                <Image
                  src="/images/shop/shop-promo-01.png"
                  alt=""
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="50vw"
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
                  <span className="text-lg sm:text-xl font-black tracking-tight">
                    {store?.store_name || "JEKO"}
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase border-b border-white/80 pb-0.5">
                    About Us
                  </span>
                </div>
              </Link>
              <div className="bg-[#f3f1eb] min-h-[180px] flex flex-col items-center justify-center gap-4 px-6">
                <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-slate-600">
                  Follow Us
                </p>
                <div className="flex items-center gap-3">
                  {[
                    {
                      key: "ig",
                      href: store?.social_instagram,
                      icon: <InstagramIconSvg className="w-4 h-4" />,
                    },
                    {
                      key: "fb",
                      href: store?.social_facebook,
                      icon: <FacebookIconSvg className="w-4 h-4" />,
                    },
                    {
                      key: "line",
                      href: store?.social_line,
                      icon: <LineIconSvg className="w-4 h-4" />,
                    },
                  ]
                    .filter((i) => i.href)
                    .map((item) => (
                      <a
                        key={item.key}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-800 inline-flex items-center justify-center hover:bg-slate-900 hover:text-white transition-colors"
                      >
                        {item.icon}
                      </a>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <PartnerBlogSidebar
            store={store}
            posts={posts}
            pickupProduct={pickupProduct}
            active="article"
            onSearch={setQuery}
          />
        </div>
      </div>
    </div>
  );
}
